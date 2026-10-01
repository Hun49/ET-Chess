import type { Bindings } from '../types';

export type QueueStatus = 'QUEUED' | 'RESERVED' | 'PROVISIONING' | 'MATCHED';

export interface PersistentQueueEntry {
  queueEntryId: string;
  userId: string;
  displayName: string;
  rating: number;
  queuedAt: number; // timestamp in ms
  status: QueueStatus;
  reservationId?: string | null;
}

export interface QueuedPlayer extends PersistentQueueEntry {
  /** @deprecated use queuedAt, preserved for backwards compatibility */
  joinedAt: number;
  webSocket?: WebSocket;
}

export interface PlayerAttachment {
  queueEntryId: string;
  userId: string;
  displayName: string;
  rating: number;
}

export interface MatchFoundNotification {
  type: 'match-found';
  gameId: string;
  yourColor: 'white' | 'black';
  opponent: {
    id: string;
    displayName: string;
    rating: number;
  };
}

export class MatchmakerDO {
  private ctx: DurableObjectState;
  private env: Bindings;
  private queue: QueuedPlayer[] = [];
  private initialized = false;

  constructor(ctx: DurableObjectState, env: Bindings) {
    this.ctx = ctx;
    this.env = env;
  }

  public async ensureLoaded(): Promise<QueuedPlayer[]> {
    if (this.initialized) {
      return this.queue;
    }
    if (this.ctx?.storage?.get) {
      try {
        const stored = await this.ctx.storage.get<PersistentQueueEntry[]>('matchmaking_queue');
        if (stored && Array.isArray(stored)) {
          this.queue = stored.map((e) => ({
            ...e,
            joinedAt: e.queuedAt,
          }));
        }
      } catch (err) {
        console.warn('Could not load matchmaking queue from DO storage:', err);
      }
    }
    this.initialized = true;
    return this.queue;
  }

  public async saveQueue(): Promise<void> {
    if (this.ctx?.storage?.put) {
      try {
        const persistable: PersistentQueueEntry[] = this.queue.map((p) => ({
          queueEntryId: p.queueEntryId,
          userId: p.userId,
          displayName: p.displayName,
          rating: p.rating,
          queuedAt: p.queuedAt || p.joinedAt,
          status: p.status,
          reservationId: p.reservationId ?? null,
        }));
        await this.ctx.storage.put('matchmaking_queue', persistable);
      } catch (err) {
        console.warn('Could not save matchmaking queue to DO storage:', err);
      }
    }
  }

  // Expose current available queue (default status: QUEUED). Pass true to include all in-flight states.
  public getQueue(includeAll = false): QueuedPlayer[] {
    if (includeAll) {
      return this.queue;
    }
    return this.queue.filter((p) => p.status === 'QUEUED');
  }

  public getAllQueueEntries(): QueuedPlayer[] {
    return this.queue;
  }

  public setQueue(queue: Partial<QueuedPlayer>[]): void {
    this.queue = queue.map((p) => ({
      queueEntryId: p.queueEntryId || crypto.randomUUID(),
      userId: p.userId || 'anonymous',
      displayName: p.displayName || 'Player',
      rating: p.rating ?? 1200,
      queuedAt: p.queuedAt || p.joinedAt || Date.now(),
      joinedAt: p.joinedAt || p.queuedAt || Date.now(),
      status: p.status || 'QUEUED',
      reservationId: p.reservationId ?? null,
      webSocket: p.webSocket,
    }));
    this.initialized = true;
    // Asynchronously persist
    this.saveQueue().catch(() => {});
  }

  // Calculate rating window: base 200 + 50 for every 15s elapsed
  public getRatingWindow(joinedAt: number, now = Date.now()): number {
    const elapsedSeconds = Math.max(0, (now - joinedAt) / 1000);
    const intervals = Math.floor(elapsedSeconds / 15);
    return 200 + intervals * 50;
  }

  // Core FIFO matching algorithm with explicit reservation lifecycle
  public matchPlayers(now = Date.now()): Array<{
    player1: QueuedPlayer;
    player2: QueuedPlayer;
    gameId: string;
    reservationId: string;
    player1Color: 'white' | 'black';
    player2Color: 'white' | 'black';
  }> {
    const matches: Array<{
      player1: QueuedPlayer;
      player2: QueuedPlayer;
      gameId: string;
      reservationId: string;
      player1Color: 'white' | 'black';
      player2Color: 'white' | 'black';
    }> = [];

    const reservedIndices = new Set<number>();

    for (let i = 0; i < this.queue.length; i++) {
      if (reservedIndices.has(i)) continue;
      const p1 = this.queue[i]!;
      if (p1.status !== 'QUEUED') continue;
      const window1 = this.getRatingWindow(p1.queuedAt || p1.joinedAt, now);

      for (let j = i + 1; j < this.queue.length; j++) {
        if (reservedIndices.has(j)) continue;
        const p2 = this.queue[j]!;
        if (p2.status !== 'QUEUED') continue;

        // Do not pair a user against themselves
        if (p1.userId === p2.userId) continue;

        const window2 = this.getRatingWindow(p2.queuedAt || p2.joinedAt, now);
        const ratingDiff = Math.abs(p1.rating - p2.rating);

        // Compatible if rating difference is within the expanded window
        if (ratingDiff <= Math.max(window1, window2)) {
          reservedIndices.add(i);
          reservedIndices.add(j);

          const gameId = crypto.randomUUID();
          const reservationId = crypto.randomUUID();
          const randomBytes = new Uint8Array(1);
          crypto.getRandomValues(randomBytes);
          const p1IsWhite = ((randomBytes[0] ?? 0) & 1) === 0;

          // Transition lifecycle to RESERVED
          p1.status = 'RESERVED';
          p1.reservationId = reservationId;
          p2.status = 'RESERVED';
          p2.reservationId = reservationId;

          matches.push({
            player1: p1,
            player2: p2,
            gameId,
            reservationId,
            player1Color: p1IsWhite ? 'white' : 'black',
            player2Color: p1IsWhite ? 'black' : 'white',
          });
          break;
        }
      }
    }

    if (matches.length > 0) {
      this.saveQueue().catch(() => {});
    }

    return matches;
  }

  public async dispatchMatches(matches: ReturnType<typeof this.matchPlayers>): Promise<void> {
    for (const match of matches) {
      const { player1, player2, gameId, player1Color, player2Color } = match;

      // Transition to PROVISIONING
      player1.status = 'PROVISIONING';
      player2.status = 'PROVISIONING';
      await this.saveQueue();

      let provisionSuccess = true;

      // 1. Provision GameRoomDO if binding is present
      if (this.env?.GAME_ROOM) {
        try {
          const doId = this.env.GAME_ROOM.idFromName(gameId);
          const stub = this.env.GAME_ROOM.get(doId);

          const whitePlayer = player1Color === 'white' ? player1 : player2;
          const blackPlayer = player1Color === 'white' ? player2 : player1;

          const initRes = await stub.fetch(
            new Request('https://do/init', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gameId,
                whiteUserId: whitePlayer.userId,
                whiteDisplayName: whitePlayer.displayName,
                whiteRating: whitePlayer.rating,
                blackUserId: blackPlayer.userId,
                blackDisplayName: blackPlayer.displayName,
                blackRating: blackPlayer.rating,
              }),
            }),
          );

          if (!initRes.ok) {
            provisionSuccess = false;
            console.error(`GameRoomDO init returned status ${initRes.status}`);
          }
        } catch (err) {
          provisionSuccess = false;
          console.error('Failed to init GameRoomDO from matchmaker:', err);
        }
      }

      // If provisioning failed, rollback players to QUEUED so they are not dropped from queue!
      if (!provisionSuccess) {
        player1.status = 'QUEUED';
        player1.reservationId = null;
        player2.status = 'QUEUED';
        player2.reservationId = null;
        await this.saveQueue();
        continue;
      }

      // Provisioning succeeded: transition to MATCHED
      player1.status = 'MATCHED';
      player2.status = 'MATCHED';

      // 2. Notify Player 1
      const p1Sockets = this.ctx.getWebSockets
        ? this.ctx.getWebSockets(player1.userId)
        : player1.webSocket
          ? [player1.webSocket]
          : [];
      const p1Ws = p1Sockets[0] || player1.webSocket;
      if (p1Ws) {
        try {
          p1Ws.send(
            JSON.stringify({
              type: 'match-found',
              gameId,
              yourColor: player1Color,
              opponent: {
                id: player2.userId,
                displayName: player2.displayName,
                rating: player2.rating,
              },
            }),
          );
          p1Ws.close(1000, 'Match found');
        } catch {
          // Socket closed
        }
      }

      // 3. Notify Player 2
      const p2Sockets = this.ctx.getWebSockets
        ? this.ctx.getWebSockets(player2.userId)
        : player2.webSocket
          ? [player2.webSocket]
          : [];
      const p2Ws = p2Sockets[0] || player2.webSocket;
      if (p2Ws) {
        try {
          p2Ws.send(
            JSON.stringify({
              type: 'match-found',
              gameId,
              yourColor: player2Color,
              opponent: {
                id: player1.userId,
                displayName: player1.displayName,
                rating: player1.rating,
              },
            }),
          );
          p2Ws.close(1000, 'Match found');
        } catch {
          // Socket closed
        }
      }

      // Remove matched players from queue now that provisioning and notifications are done
      this.queue = this.queue.filter(
        (p) => p.userId !== player1.userId && p.userId !== player2.userId,
      );
      await this.saveQueue();
    }
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureLoaded();
    const url = new URL(request.url);

    // Prioritize WebSocket queue handshake
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const userId = url.searchParams.get('userId');
      const displayName = url.searchParams.get('displayName') || 'Player';
      const rating = parseInt(url.searchParams.get('rating') || '1200', 10);

      if (!userId) {
        return new Response('Missing userId', { status: 400 });
      }

      const queueEntryId = crypto.randomUUID();

      // Remove existing queued session for this user to avoid ghost entries
      this.queue = this.queue.filter((p) => p.userId !== userId);

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      const attachment: PlayerAttachment = {
        queueEntryId,
        userId,
        displayName,
        rating,
      };
      server.serializeAttachment(attachment);

      this.ctx.acceptWebSocket(server, [userId, queueEntryId]);

      const queuedPlayer: QueuedPlayer = {
        queueEntryId,
        userId,
        displayName,
        rating,
        queuedAt: Date.now(),
        joinedAt: Date.now(),
        status: 'QUEUED',
        reservationId: null,
        webSocket: server,
      };

      this.queue.push(queuedPlayer);
      await this.saveQueue();

      // Confirm queued status to client
      try {
        server.send(
          JSON.stringify({
            type: 'queued',
            rating,
            initialWindow: 200,
          }),
        );
      } catch {
        // Ignored
      }

      // Check if match can be formed immediately
      const matches = this.matchPlayers();
      if (matches.length > 0) {
        await this.dispatchMatches(matches);
      } else if (this.queue.filter((p) => p.status === 'QUEUED').length >= 2) {
        // Schedule alarm to recheck expanding rating windows in 2s
        if (this.ctx?.storage?.setAlarm) {
          await this.ctx.storage.setAlarm(Date.now() + 2000);
        }
      }

      return new Response(null, {
        status: 101,
        webSocket: client,
      } as ResponseInit);
    }

    // Queue inspection endpoint (HTTP)
    if (request.method === 'GET' && url.pathname.endsWith('/queue')) {
      const now = Date.now();
      const queuedCount = this.queue.filter((p) => p.status === 'QUEUED').length;
      return new Response(
        JSON.stringify({
          count: queuedCount,
          total: this.queue.length,
          players: this.queue.map((p) => ({
            queueEntryId: p.queueEntryId,
            userId: p.userId,
            displayName: p.displayName,
            rating: p.rating,
            status: p.status,
            reservationId: p.reservationId,
            window: this.getRatingWindow(p.queuedAt || p.joinedAt, now),
            waitSeconds: Math.round((now - (p.queuedAt || p.joinedAt)) / 1000),
          })),
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // HTTP leave endpoint
    if (request.method === 'POST' && url.pathname.endsWith('/leave')) {
      const { userId } = (await request.json().catch(() => ({}))) as {
        userId?: string;
      };
      if (userId) {
        this.queue = this.queue.filter((p) => p.userId !== userId);
        await this.saveQueue();
      }
      return new Response(JSON.stringify({ ok: true, count: this.queue.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.ensureLoaded();
    const att = ws.deserializeAttachment() as (PlayerAttachment & { userId?: string }) | null;
    if (att?.userId) {
      // Immediately remove player from matchmaking queue on socket drop if still waiting or queued
      this.queue = this.queue.filter((p) => p.userId !== att.userId);
      await this.saveQueue();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    await this.ensureLoaded();
    const now = Date.now();
    const matches = this.matchPlayers(now);
    if (matches.length > 0) {
      await this.dispatchMatches(matches);
    }

    // If there are still at least 2 players searching, keep alarm ticking every 2s
    if (this.queue.filter((p) => p.status === 'QUEUED').length >= 2) {
      if (this.ctx?.storage?.setAlarm) {
        await this.ctx.storage.setAlarm(Date.now() + 2000);
      }
    }
  }
}
