import { applyMove, calculateElo, createGame, getPgn, isGameOver } from '@et-chess/chess-core';
import {
  type ServerMessage,
  safeParseClientMessage,
  serializeMessage,
} from '@et-chess/realtime-protocol';
import type { GameState, PlayerColor } from '@et-chess/types';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import type { Bindings } from '../types';

export interface PlayerAttachment {
  userId: string;
  displayName: string;
  color: PlayerColor;
}

export interface GameRoomData {
  gameId: string;
  roomId?: string | null;
  whiteUserId: string;
  whiteDisplayName: string;
  blackUserId: string;
  blackDisplayName: string;
  gameState: GameState;
  status: 'waiting' | 'in-progress' | 'finished';
  drawOfferedBy?: PlayerColor | null;
  disconnectedPlayer?: {
    userId: string;
    color: PlayerColor;
    disconnectedAt: number;
  } | null;
  startedAt: number;
}

export class GameRoomDO {
  private ctx: DurableObjectState;
  private env: Bindings;
  private data: GameRoomData | null = null;
  private initialized = false;

  constructor(ctx: DurableObjectState, env: Bindings) {
    this.ctx = ctx;
    this.env = env;
  }

  private async ensureLoaded(): Promise<GameRoomData> {
    if (this.data && this.initialized) {
      return this.data;
    }
    const stored = await this.ctx.storage.get<GameRoomData>('room_data');
    if (stored) {
      this.data = stored;
      this.initialized = true;
      return stored;
    }
    // Default uninitialized fallback
    this.data = {
      gameId: 'uninitialized',
      whiteUserId: '',
      whiteDisplayName: 'White Player',
      blackUserId: '',
      blackDisplayName: 'Black Player',
      gameState: createGame(),
      status: 'waiting',
      startedAt: Date.now(),
    };
    this.initialized = true;
    return this.data;
  }

  private async saveData(): Promise<void> {
    if (this.data) {
      await this.ctx.storage.put('room_data', this.data);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Endpoint to initialize or provision game parameters before players connect
    if (request.method === 'POST' && url.pathname.endsWith('/init')) {
      const body = (await request.json()) as Partial<GameRoomData>;
      const current = await this.ensureLoaded();

      this.data = {
        ...current,
        ...body,
        gameId: body.gameId || current.gameId,
        whiteUserId: body.whiteUserId || current.whiteUserId,
        whiteDisplayName: body.whiteDisplayName || current.whiteDisplayName || 'White Player',
        blackUserId: body.blackUserId || current.blackUserId,
        blackDisplayName: body.blackDisplayName || current.blackDisplayName || 'Black Player',
        gameState: body.gameState || current.gameState || createGame(),
        status: (body.status as any) || 'in-progress',
        startedAt: current.startedAt || Date.now(),
      };
      await this.saveData();
      return new Response(JSON.stringify({ ok: true, data: this.data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Direct inspect endpoint
    if (request.method === 'GET' && url.pathname.endsWith('/state')) {
      const data = await this.ensureLoaded();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // WebSocket upgrade handshake
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const data = await this.ensureLoaded();

      const userId = url.searchParams.get('userId');
      const displayName = url.searchParams.get('displayName') || 'Player';

      if (!userId) {
        return new Response('Missing userId query parameter', { status: 400 });
      }

      // Security Check: Only White or Black player is authorized to connect to this live game DO
      const isWhite = userId === data.whiteUserId;
      const isBlack = userId === data.blackUserId;

      if (!isWhite && !isBlack) {
        return new Response('Unauthorized: You are not assigned to this match', { status: 403 });
      }

      const playerColor: PlayerColor = isWhite ? 'white' : 'black';

      // Pair of WebSockets: client and server
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      // Attach player metadata to the hibernatable WebSocket session
      const attachment: PlayerAttachment = {
        userId,
        displayName,
        color: playerColor,
      };
      server.serializeAttachment(attachment);

      // Accept socket with tags for easy lookup and hibernation
      this.ctx.acceptWebSocket(server, [userId, playerColor]);

      // Handle Reconnection: If this player was disconnected during grace period, cancel alarm & notify
      if (data.disconnectedPlayer?.userId === userId) {
        await this.ctx.storage.deleteAlarm();
        data.disconnectedPlayer = null;
        await this.saveData();

        this.broadcast({
          type: 'opponent-reconnected',
        });
      }

      // Send initial state sync specifically to this connected client
      this.send(server, {
        type: 'state-sync',
        gameState: data.gameState,
        whitePlayer: {
          id: data.whiteUserId,
          displayName: data.whiteDisplayName,
        },
        blackPlayer: {
          id: data.blackUserId,
          displayName: data.blackDisplayName,
        },
        yourColor: playerColor,
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Expected WebSocket upgrade or valid endpoint', { status: 426 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const data = await this.ensureLoaded();
    const attachment = ws.deserializeAttachment() as PlayerAttachment | null;
    if (!attachment) {
      this.send(ws, { type: 'error', message: 'Unauthenticated socket attachment' });
      return;
    }

    const parseResult = safeParseClientMessage(message);
    if (!parseResult.success) {
      this.send(ws, { type: 'error', message: 'Invalid or malformed client message' });
      return;
    }

    const clientMsg = parseResult.data;

    switch (clientMsg.type) {
      case 'move': {
        if (data.status === 'finished') {
          this.send(ws, { type: 'error', message: 'Game has already concluded' });
          return;
        }

        // Server-authoritative turn check: sender's assigned color must match game's active turn
        if (data.gameState.turn !== attachment.color) {
          this.send(ws, { type: 'error', message: 'It is not your turn' });
          return;
        }

        try {
          // Validate and apply move via packages/chess-core
          const nextState = applyMove(data.gameState, clientMsg.move);
          data.gameState = nextState;
          data.drawOfferedBy = null; // Any move invalidates outstanding draw offers

          const terminal = isGameOver(nextState);

          if (terminal) {
            data.status = 'finished';
            let result: 'white' | 'black' | 'draw' = 'draw';
            let reason = 'Game over';

            if (nextState.status === 'checkmate') {
              result = attachment.color;
              reason = `Checkmate by ${attachment.displayName}`;
            } else if (nextState.status === 'stalemate') {
              result = 'draw';
              reason = 'Stalemate';
            } else if (nextState.status === 'draw') {
              result = 'draw';
              reason = 'Draw by rule';
            }

            await this.saveData();

            // Broadcast state sync then game-over
            this.broadcastStateSync(data);
            this.broadcast({
              type: 'game-over',
              result,
              reason,
            });

            await this.persistGameResult(result);
          } else {
            await this.saveData();
            this.broadcastStateSync(data);
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Illegal move attempt';
          this.send(ws, { type: 'error', message: errMsg });
        }
        break;
      }

      case 'resign': {
        if (data.status === 'finished') return;

        data.status = 'finished';
        const winner: PlayerColor = attachment.color === 'white' ? 'black' : 'white';
        const reason = `${attachment.displayName} resigned`;

        await this.saveData();

        this.broadcast({
          type: 'game-over',
          result: winner,
          reason,
        });

        await this.persistGameResult(winner);
        break;
      }

      case 'draw-offer': {
        if (data.status === 'finished') return;
        data.drawOfferedBy = attachment.color;
        await this.saveData();

        // Relay draw offer to opponent socket
        const opponentSockets = this.ctx.getWebSockets(
          attachment.color === 'white' ? 'black' : 'white',
        );
        for (const oppWs of opponentSockets) {
          this.send(oppWs, { type: 'draw-offered' });
        }
        break;
      }

      case 'draw-response': {
        if (data.status === 'finished') return;

        if (clientMsg.accept && data.drawOfferedBy && data.drawOfferedBy !== attachment.color) {
          data.status = 'finished';
          await this.saveData();

          this.broadcast({
            type: 'game-over',
            result: 'draw',
            reason: 'Draw agreed by mutual consent',
          });

          await this.persistGameResult('draw');
        } else {
          // Declined
          data.drawOfferedBy = null;
          await this.saveData();
        }
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const data = await this.ensureLoaded();
    const attachment = ws.deserializeAttachment() as PlayerAttachment | null;
    if (!attachment || data.status === 'finished') {
      return;
    }

    // Ongoing game socket closed unexpectedly: start 60s grace period alarm
    const gracePeriodMs = 60000;
    data.disconnectedPlayer = {
      userId: attachment.userId,
      color: attachment.color,
      disconnectedAt: Date.now(),
    };
    await this.saveData();

    // Schedule DO Alarm for 60s
    await this.ctx.storage.setAlarm(Date.now() + gracePeriodMs);

    // Inform the remaining connected player
    this.broadcast({
      type: 'opponent-disconnected',
      gracePeriodMs,
    });
  }

  async alarm(): Promise<void> {
    const data = await this.ensureLoaded();

    // If grace period elapsed and player is still disconnected: award forfeit win
    if (data.status !== 'finished' && data.disconnectedPlayer) {
      data.status = 'finished';
      const winner: PlayerColor = data.disconnectedPlayer.color === 'white' ? 'black' : 'white';
      const reason = 'Opponent disconnected and forfeited match';

      await this.saveData();

      this.broadcast({
        type: 'game-over',
        result: winner,
        reason,
      });

      await this.persistGameResult(winner);
    }
  }

  private broadcastStateSync(data: GameRoomData) {
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      const att = ws.deserializeAttachment() as PlayerAttachment | null;
      this.send(ws, {
        type: 'state-sync',
        gameState: data.gameState,
        whitePlayer: {
          id: data.whiteUserId,
          displayName: data.whiteDisplayName,
        },
        blackPlayer: {
          id: data.blackUserId,
          displayName: data.blackDisplayName,
        },
        yourColor: att?.color,
      });
    }
  }

  private broadcast(msg: ServerMessage) {
    const sockets = this.ctx.getWebSockets();
    const payload = serializeMessage(msg);
    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch {
        // Closed/failing socket ignored
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(serializeMessage(msg));
    } catch {
      // Ignored
    }
  }

  private async persistGameResult(result: 'white' | 'black' | 'draw'): Promise<void> {
    if (!this.env.DB || !this.data) return;
    try {
      const db = drizzle(this.env.DB, { schema });
      const pgn = getPgn(this.data.gameState);

      let ratingDeltaWhite: number | null = null;
      let ratingDeltaBlack: number | null = null;

      try {
        const [whiteProfile] = await db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, this.data.whiteUserId));

        const [blackProfile] = await db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, this.data.blackUserId));

        if (whiteProfile && blackProfile) {
          const elo = calculateElo(whiteProfile.rating, blackProfile.rating, result);
          ratingDeltaWhite = elo.deltaWhite;
          ratingDeltaBlack = elo.deltaBlack;

          await db
            .update(schema.profiles)
            .set({
              rating: elo.newRatingWhite,
              gamesPlayed: whiteProfile.gamesPlayed + 1,
            })
            .where(eq(schema.profiles.userId, this.data.whiteUserId));

          await db
            .update(schema.profiles)
            .set({
              rating: elo.newRatingBlack,
              gamesPlayed: blackProfile.gamesPlayed + 1,
            })
            .where(eq(schema.profiles.userId, this.data.blackUserId));
        }
      } catch (profileErr) {
        console.warn('Could not update player profiles or Elo ratings:', profileErr);
      }

      await db
        .insert(schema.games)
        .values({
          id: this.data.gameId,
          roomId: this.data.roomId ?? null,
          whiteUserId: this.data.whiteUserId,
          blackUserId: this.data.blackUserId,
          finalFen: this.data.gameState.fen,
          pgn,
          result,
          ratingDeltaWhite,
          ratingDeltaBlack,
          startedAt: new Date(this.data.startedAt),
          endedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.games.id,
          set: {
            finalFen: this.data.gameState.fen,
            pgn,
            result,
            ratingDeltaWhite,
            ratingDeltaBlack,
            endedAt: new Date(),
          },
        });
    } catch (err) {
      console.error('Failed persisting game result to D1:', err);
    }
  }
}
