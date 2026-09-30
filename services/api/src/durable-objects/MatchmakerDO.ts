import type { Bindings } from '../types';

export interface QueuedPlayer {
  userId: string;
  displayName: string;
  rating: number;
  joinedAt: number; // timestamp in ms
  webSocket?: WebSocket;
}

export interface PlayerAttachment {
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

  constructor(ctx: DurableObjectState, env: Bindings) {
    this.ctx = ctx;
    this.env = env;
  }

  // Expose current queue for testing / inspection
  public getQueue(): QueuedPlayer[] {
    return this.queue;
  }

  public setQueue(queue: QueuedPlayer[]): void {
    this.queue = queue;
  }

  // Calculate rating window: base 200 + 50 for every 15s elapsed
  public getRatingWindow(joinedAt: number, now = Date.now()): number {
    const elapsedSeconds = Math.max(0, (now - joinedAt) / 1000);
    const intervals = Math.floor(elapsedSeconds / 15);
    return 200 + intervals * 50;
  }

  // Core FIFO matching algorithm
  public matchPlayers(now = Date.now()): Array<{
    player1: QueuedPlayer;
    player2: QueuedPlayer;
    gameId: string;
    player1Color: 'white' | 'black';
    player2Color: 'white' | 'black';
  }> {
    const matches: Array<{
      player1: QueuedPlayer;
      player2: QueuedPlayer;
      gameId: string;
      player1Color: 'white' | 'black';
      player2Color: 'white' | 'black';
    }> = [];

    const matchedIndices = new Set<number>();

    for (let i = 0; i < this.queue.length; i++) {
      if (matchedIndices.has(i)) continue;
      const p1 = this.queue[i]!;
      const window1 = this.getRatingWindow(p1.joinedAt, now);

      for (let j = i + 1; j < this.queue.length; j++) {
        if (matchedIndices.has(j)) continue;
        const p2 = this.queue[j]!;

        // Do not pair a user against themselves
        if (p1.userId === p2.userId) continue;

        const window2 = this.getRatingWindow(p2.joinedAt, now);
        const ratingDiff = Math.abs(p1.rating - p2.rating);

        // Compatible if rating difference is within the expanded window
        if (ratingDiff <= Math.max(window1, window2)) {
          matchedIndices.add(i);
          matchedIndices.add(j);

          const gameId = crypto.randomUUID();
          const p1IsWhite = Math.random() < 0.5;

          matches.push({
            player1: p1,
            player2: p2,
            gameId,
            player1Color: p1IsWhite ? 'white' : 'black',
            player2Color: p1IsWhite ? 'black' : 'white',
          });
          break;
        }
      }
    }

    // Remove matched players from queue
    this.queue = this.queue.filter((_, idx) => !matchedIndices.has(idx));

    return matches;
  }

  private async dispatchMatches(matches: ReturnType<typeof this.matchPlayers>): Promise<void> {
    for (const match of matches) {
      const { player1, player2, gameId, player1Color, player2Color } = match;

      // 1. Provision GameRoomDO if binding is present
      if (this.env.GAME_ROOM) {
        try {
          const doId = this.env.GAME_ROOM.idFromName(gameId);
          const stub = this.env.GAME_ROOM.get(doId);

          const whitePlayer = player1Color === 'white' ? player1 : player2;
          const blackPlayer = player1Color === 'white' ? player2 : player1;

          await stub.fetch(
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
        } catch (err) {
          console.error('Failed to init GameRoomDO from matchmaker:', err);
        }
      }

      // 2. Notify Player 1
      if (player1.webSocket) {
        try {
          player1.webSocket.send(
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
          player1.webSocket.close(1000, 'Match found');
        } catch {
          // Socket closed
        }
      }

      // 3. Notify Player 2
      if (player2.webSocket) {
        try {
          player2.webSocket.send(
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
          player2.webSocket.close(1000, 'Match found');
        } catch {
          // Socket closed
        }
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
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

      // Remove existing queued session for this user to avoid ghost entries
      this.queue = this.queue.filter((p) => p.userId !== userId);

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      const attachment: PlayerAttachment = {
        userId,
        displayName,
        rating,
      };
      server.serializeAttachment(attachment);

      this.ctx.acceptWebSocket(server, [userId]);

      const queuedPlayer: QueuedPlayer = {
        userId,
        displayName,
        rating,
        joinedAt: Date.now(),
        webSocket: server,
      };

      this.queue.push(queuedPlayer);

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
      } else if (this.queue.length >= 2) {
        // Schedule alarm to recheck expanding rating windows in 2s
        await this.ctx.storage.setAlarm(Date.now() + 2000);
      }

      return new Response(null, {
        status: 101,
        webSocket: client,
      } as ResponseInit);
    }

    // Queue inspection endpoint (HTTP)
    if (request.method === 'GET' && url.pathname.endsWith('/queue')) {
      const now = Date.now();
      return new Response(
        JSON.stringify({
          count: this.queue.length,
          players: this.queue.map((p) => ({
            userId: p.userId,
            displayName: p.displayName,
            rating: p.rating,
            window: this.getRatingWindow(p.joinedAt, now),
            waitSeconds: Math.round((now - p.joinedAt) / 1000),
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
      }
      return new Response(JSON.stringify({ ok: true, count: this.queue.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as PlayerAttachment | null;
    if (att?.userId) {
      // Immediately remove player from matchmaking queue on socket drop
      this.queue = this.queue.filter((p) => p.userId !== att.userId);
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const matches = this.matchPlayers(now);
    if (matches.length > 0) {
      await this.dispatchMatches(matches);
    }

    // If there are still at least 2 players searching, keep alarm ticking every 2s
    if (this.queue.length >= 2) {
      await this.ctx.storage.setAlarm(Date.now() + 2000);
    }
  }
}
