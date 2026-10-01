import { applyMove, calculateElo, createGame, getPgn, isGameOver } from '@et-chess/chess-core';
import {
  type ServerMessage,
  safeParseClientMessage,
  serializeMessage,
} from '@et-chess/realtime-protocol';
import type { GameLifecycleState, GameState, PlayerColor } from '@et-chess/types';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import { verifyGameTicket } from '../lib/game-tickets';
import type { Bindings } from '../types';

export interface PlayerAttachment {
  userId: string;
  displayName: string;
  color: PlayerColor;
}

export interface GameRoomData {
  gameId: string;
  roomId?: string | null;
  tournamentId?: string | null;
  matchId?: string | null;
  whiteUserId: string;
  whiteDisplayName: string;
  blackUserId: string;
  blackDisplayName: string;
  gameState: GameState;
  status: 'waiting' | 'in-progress' | 'finished';
  lifecycleState?: GameLifecycleState;
  result?: 'white' | 'black' | 'draw' | null;
  terminationReason?: string | null;
  drawOfferedBy?: PlayerColor | null;
  disconnectedPlayer?: {
    userId: string;
    color: PlayerColor;
    disconnectedAt: number;
    graceDeadline: number;
  } | null;
  startedAt: number;
  timeControlMinutes: number;
  timeControlIncrement: number;
  timeControlIncrementMs: number;
  whiteRemainingMs: number;
  blackRemainingMs: number;
  turnStartedAt: number | null;
  activeClockColor: PlayerColor | null;
}

export class GameRoomDO {
  private ctx: DurableObjectState;
  private env: Bindings;
  private data: GameRoomData | null = null;
  private initialized = false;
  private settled = false;

  constructor(ctx: DurableObjectState, env: Bindings) {
    this.ctx = ctx;
    this.env = env;
  }

  private async ensureLoaded(): Promise<GameRoomData> {
    if (this.data && this.initialized) {
      return this.data;
    }
    const stored = await this.ctx.storage.get<GameRoomData>('room_data');
    this.settled = (await this.ctx.storage.get<boolean>('settled')) ?? false;
    if (stored) {
      const tcMins = stored.timeControlMinutes ?? 10;
      const tcInc = stored.timeControlIncrement ?? 0;
      const tcIncMs = stored.timeControlIncrementMs ?? tcInc * 1000;
      const defaultDurationMs = tcMins * 60 * 1000;

      this.data = {
        ...stored,
        timeControlMinutes: tcMins,
        timeControlIncrement: tcInc,
        timeControlIncrementMs: tcIncMs,
        whiteRemainingMs: stored.whiteRemainingMs ?? defaultDurationMs,
        blackRemainingMs: stored.blackRemainingMs ?? defaultDurationMs,
        turnStartedAt: stored.turnStartedAt ?? null,
        activeClockColor: stored.activeClockColor ?? null,
        lifecycleState:
          stored.lifecycleState ??
          (stored.status === 'finished'
            ? 'COMPLETED'
            : stored.status === 'waiting'
              ? 'WAITING'
              : 'ACTIVE'),
        result: stored.result ?? null,
        terminationReason: stored.terminationReason ?? null,
      };
      this.initialized = true;
      return this.data;
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
      lifecycleState: 'WAITING',
      result: null,
      terminationReason: null,
      startedAt: Date.now(),
      timeControlMinutes: 10,
      timeControlIncrement: 0,
      timeControlIncrementMs: 0,
      whiteRemainingMs: 600000,
      blackRemainingMs: 600000,
      turnStartedAt: null,
      activeClockColor: null,
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
      const body = (await request.json()) as Partial<GameRoomData> & {
        whiteTimeRemainingMs?: number;
        blackTimeRemainingMs?: number;
      };
      const current = await this.ensureLoaded();

      const timeControlMinutes = body.timeControlMinutes ?? current.timeControlMinutes ?? 10;
      const timeControlIncrement = body.timeControlIncrement ?? current.timeControlIncrement ?? 0;
      const timeControlIncrementMs = body.timeControlIncrementMs ?? timeControlIncrement * 1000;
      const defaultDurationMs = timeControlMinutes * 60 * 1000;

      const whiteRemainingMs =
        body.whiteRemainingMs ??
        body.whiteTimeRemainingMs ??
        current.whiteRemainingMs ??
        defaultDurationMs;
      const blackRemainingMs =
        body.blackRemainingMs ??
        body.blackTimeRemainingMs ??
        current.blackRemainingMs ??
        defaultDurationMs;

      this.data = {
        ...current,
        ...body,
        gameId: body.gameId || current.gameId,
        roomId: body.roomId !== undefined ? body.roomId : current.roomId,
        tournamentId: body.tournamentId !== undefined ? body.tournamentId : current.tournamentId,
        matchId: body.matchId !== undefined ? body.matchId : current.matchId,
        whiteUserId: body.whiteUserId || current.whiteUserId,
        whiteDisplayName: body.whiteDisplayName || current.whiteDisplayName || 'White Player',
        blackUserId: body.blackUserId || current.blackUserId,
        blackDisplayName: body.blackDisplayName || current.blackDisplayName || 'Black Player',
        gameState: body.gameState || current.gameState || createGame(),
        status: (body.status as any) || 'in-progress',
        lifecycleState:
          body.lifecycleState ||
          ((body.status as any) === 'finished'
            ? 'COMPLETED'
            : (body.status as any) === 'waiting'
              ? 'WAITING'
              : 'ACTIVE'),
        result: body.result !== undefined ? body.result : current.result,
        terminationReason:
          body.terminationReason !== undefined ? body.terminationReason : current.terminationReason,
        startedAt: current.startedAt || Date.now(),
        timeControlMinutes,
        timeControlIncrement,
        timeControlIncrementMs,
        whiteRemainingMs,
        blackRemainingMs,
        turnStartedAt:
          body.turnStartedAt !== undefined ? body.turnStartedAt : current.turnStartedAt,
        activeClockColor:
          body.activeClockColor !== undefined ? body.activeClockColor : current.activeClockColor,
      };
      await this.saveData();
      await this.scheduleNextAlarm(this.data);

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

    // Game abort endpoint (WAITING -> ABORTED, ACTIVE -> ABORTED)
    if (request.method === 'POST' && url.pathname.endsWith('/abort')) {
      const data = await this.ensureLoaded();
      if (
        data.status === 'finished' ||
        data.lifecycleState === 'COMPLETED' ||
        data.lifecycleState === 'ABORTED'
      ) {
        return new Response(JSON.stringify({ ok: false, error: 'Game already concluded' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      data.status = 'finished';
      data.lifecycleState = 'ABORTED';
      data.result = 'draw';
      data.terminationReason = 'Game aborted';
      data.activeClockColor = null;
      data.turnStartedAt = null;

      await this.saveData();
      await this.scheduleNextAlarm(data);

      this.broadcastStateSync(data);
      this.broadcast({
        type: 'game-over',
        result: 'draw',
        reason: 'Game aborted',
      });

      return new Response(JSON.stringify({ ok: true, data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // WebSocket upgrade handshake
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const data = await this.ensureLoaded();

      const ticketParam = url.searchParams.get('ticket');
      let userId: string | null = null;
      let displayName = 'Player';

      if (ticketParam) {
        const secret =
          this.env?.BETTER_AUTH_SECRET || 'dev-secret-key-must-be-at-least-32-characters-long';
        const verified = await verifyGameTicket(ticketParam, secret);
        if (!verified) {
          return new Response('Unauthorized: Invalid or expired ticket', { status: 401 });
        }
        if (verified.gameId !== data.gameId) {
          return new Response('Forbidden: Ticket is for a different game', { status: 403 });
        }

        // Single-use check:
        const usedTickets = (await this.ctx.storage.get<string[]>('used_tickets')) || [];
        if (usedTickets.includes(verified.ticketId)) {
          return new Response('Unauthorized: Ticket already used', { status: 401 });
        }
        usedTickets.push(verified.ticketId);
        await this.ctx.storage.put('used_tickets', usedTickets.slice(-100));

        userId = verified.userId;
        displayName = verified.displayName;
      } else {
        // Fallback for unit tests only when NODE_ENV === 'test'
        const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
        if (isTestEnv && url.searchParams.get('userId')) {
          userId = url.searchParams.get('userId');
          displayName = url.searchParams.get('displayName') || 'Player';
        } else {
          return new Response('Unauthorized: Missing or invalid game ticket', { status: 401 });
        }
      }

      if (!userId) {
        return new Response('Unauthorized: Missing userId', { status: 401 });
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
        data.disconnectedPlayer = null;
        await this.saveData();
        await this.scheduleNextAlarm(data);

        this.broadcast({
          type: 'opponent-reconnected',
        });
      }

      // Send initial state sync specifically to this connected client
      const lifecycle: GameLifecycleState =
        data.lifecycleState ??
        (data.status === 'finished'
          ? 'COMPLETED'
          : data.status === 'waiting'
            ? 'WAITING'
            : 'ACTIVE');

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
        whiteRemainingMs: this.getLiveRemainingMs(data, 'white'),
        blackRemainingMs: this.getLiveRemainingMs(data, 'black'),
        activeClockColor: data.activeClockColor,
        lifecycleState: lifecycle,
        result: data.result ?? null,
        terminationReason: data.terminationReason ?? null,
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Expected WebSocket upgrade or valid endpoint', { status: 426 });
  }

  public getLiveRemainingMs(data: GameRoomData, color: PlayerColor): number {
    const base = color === 'white' ? data.whiteRemainingMs : data.blackRemainingMs;
    if (data.status === 'in-progress' && data.activeClockColor === color && data.turnStartedAt) {
      const elapsed = Math.max(0, Date.now() - data.turnStartedAt);
      return Math.max(0, base - elapsed);
    }
    return Math.max(0, base);
  }

  private async scheduleNextAlarm(data: GameRoomData): Promise<void> {
    if (data.status === 'finished') {
      if (this.ctx?.storage?.deleteAlarm) {
        await this.ctx.storage.deleteAlarm();
      }
      return;
    }

    const deadlines: number[] = [];

    // 1. Disconnect grace deadline
    if (data.disconnectedPlayer?.graceDeadline) {
      deadlines.push(data.disconnectedPlayer.graceDeadline);
    }

    // 2. Active player's clock deadline
    if (data.status === 'in-progress' && data.activeClockColor && data.turnStartedAt) {
      const activeRemaining =
        data.activeClockColor === 'white' ? data.whiteRemainingMs : data.blackRemainingMs;
      deadlines.push(data.turnStartedAt + activeRemaining);
    }

    if (deadlines.length === 0) {
      if (this.ctx?.storage?.deleteAlarm) {
        await this.ctx.storage.deleteAlarm();
      }
      return;
    }

    const earliest = Math.min(...deadlines);
    if (this.ctx?.storage?.setAlarm) {
      await this.ctx.storage.setAlarm(earliest);
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const msgLength = typeof message === 'string' ? message.length : message.byteLength;
    if (msgLength > 16384) {
      this.send(ws, { type: 'error', message: 'Payload too large (max 16KB)' });
      return;
    }

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

    const isTerminal =
      data.status === 'finished' ||
      data.lifecycleState === 'COMPLETED' ||
      data.lifecycleState === 'ABORTED';

    switch (clientMsg.type) {
      case 'move': {
        if (isTerminal) {
          this.send(ws, { type: 'error', message: 'Game has already concluded' });
          return;
        }

        // Server-authoritative turn check: sender's assigned color must match game's active turn
        if (data.gameState.turn !== attachment.color) {
          this.send(ws, { type: 'error', message: 'It is not your turn' });
          return;
        }

        const now = Date.now();

        // Check if player has timed out before executing the move
        if (data.turnStartedAt && data.activeClockColor === attachment.color) {
          const elapsed = now - data.turnStartedAt;
          const currentRemaining =
            attachment.color === 'white' ? data.whiteRemainingMs : data.blackRemainingMs;

          if (elapsed >= currentRemaining) {
            // Player timed out!
            if (attachment.color === 'white') {
              data.whiteRemainingMs = 0;
            } else {
              data.blackRemainingMs = 0;
            }
            data.status = 'finished';
            data.lifecycleState = 'COMPLETED';
            const winner: PlayerColor = attachment.color === 'white' ? 'black' : 'white';
            const reason = `${attachment.displayName} timed out`;
            data.result = winner;
            data.terminationReason = reason;
            data.activeClockColor = null;
            data.turnStartedAt = null;

            await this.saveData();
            await this.scheduleNextAlarm(data);

            this.broadcastStateSync(data);
            this.broadcast({
              type: 'game-over',
              result: winner,
              reason,
            });

            await this.persistGameResult(winner);
            return;
          }
        }

        try {
          // Validate and apply move via packages/chess-core
          const nextState = applyMove(data.gameState, clientMsg.move);
          data.gameState = nextState;
          data.drawOfferedBy = null; // Any move invalidates outstanding draw offers

          // Calculate and deduct clock elapsed time, and apply increment ONCE
          if (data.turnStartedAt && data.activeClockColor === attachment.color) {
            const elapsed = Math.max(0, now - data.turnStartedAt);
            const currentRemaining =
              attachment.color === 'white' ? data.whiteRemainingMs : data.blackRemainingMs;
            const remainingAfterElapsed = Math.max(0, currentRemaining - elapsed);
            const updatedRemaining = remainingAfterElapsed + data.timeControlIncrementMs;

            if (attachment.color === 'white') {
              data.whiteRemainingMs = updatedRemaining;
            } else {
              data.blackRemainingMs = updatedRemaining;
            }
          } else if (
            !data.turnStartedAt &&
            attachment.color === 'white' &&
            data.timeControlIncrementMs > 0
          ) {
            data.whiteRemainingMs += data.timeControlIncrementMs;
          }

          const terminal = isGameOver(nextState);

          if (terminal) {
            data.status = 'finished';
            data.lifecycleState = 'COMPLETED';
            data.activeClockColor = null;
            data.turnStartedAt = null;

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

            data.result = result;
            data.terminationReason = reason;

            await this.saveData();
            await this.scheduleNextAlarm(data);

            // Broadcast state sync then game-over
            this.broadcastStateSync(data);
            this.broadcast({
              type: 'game-over',
              result,
              reason,
            });

            await this.persistGameResult(result);
          } else {
            // Flip turn clock
            const nextTurnColor: PlayerColor = attachment.color === 'white' ? 'black' : 'white';
            data.activeClockColor = nextTurnColor;
            data.turnStartedAt = now;

            await this.saveData();
            await this.scheduleNextAlarm(data);

            this.broadcastStateSync(data);
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Illegal move attempt';
          this.send(ws, { type: 'error', message: errMsg });
        }
        break;
      }

      case 'resign': {
        if (isTerminal) return;

        data.status = 'finished';
        data.lifecycleState = 'COMPLETED';
        data.activeClockColor = null;
        data.turnStartedAt = null;
        const winner: PlayerColor = attachment.color === 'white' ? 'black' : 'white';
        const reason = `${attachment.displayName} resigned`;
        data.result = winner;
        data.terminationReason = reason;

        await this.saveData();
        await this.scheduleNextAlarm(data);

        this.broadcastStateSync(data);
        this.broadcast({
          type: 'game-over',
          result: winner,
          reason,
        });

        await this.persistGameResult(winner);
        break;
      }

      case 'draw-offer': {
        if (isTerminal) return;
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
        if (isTerminal) return;

        if (clientMsg.accept && data.drawOfferedBy && data.drawOfferedBy !== attachment.color) {
          data.status = 'finished';
          data.lifecycleState = 'COMPLETED';
          data.result = 'draw';
          data.terminationReason = 'Draw agreed by mutual consent';
          data.activeClockColor = null;
          data.turnStartedAt = null;
          await this.saveData();
          await this.scheduleNextAlarm(data);

          this.broadcastStateSync(data);
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
    const isTerminal =
      data.status === 'finished' ||
      data.lifecycleState === 'COMPLETED' ||
      data.lifecycleState === 'ABORTED';
    if (!attachment || isTerminal) {
      return;
    }

    // Multi-connection check: does this player have any OTHER active sockets?
    if (this.ctx?.getWebSockets) {
      const playerSockets = this.ctx.getWebSockets(attachment.color);
      const remainingActive = playerSockets.filter((s) => s !== ws && (s as any).readyState === 1);
      if (remainingActive.length > 0) {
        // Player is still connected on another socket
        return;
      }
    }

    // Ongoing game socket closed unexpectedly with no remaining active sockets: start 60s grace period
    const gracePeriodMs = 60000;
    const now = Date.now();
    data.disconnectedPlayer = {
      userId: attachment.userId,
      color: attachment.color,
      disconnectedAt: now,
      graceDeadline: now + gracePeriodMs,
    };
    await this.saveData();
    await this.scheduleNextAlarm(data);

    // Inform the remaining connected player
    this.broadcast({
      type: 'opponent-disconnected',
      gracePeriodMs,
    });
  }

  async alarm(): Promise<void> {
    const data = await this.ensureLoaded();
    const isTerminal =
      data.status === 'finished' ||
      data.lifecycleState === 'COMPLETED' ||
      data.lifecycleState === 'ABORTED';
    if (isTerminal) return;

    const now = Date.now();

    // 1. Check disconnect grace period
    const graceExpired =
      data.disconnectedPlayer &&
      (now >= data.disconnectedPlayer.graceDeadline || !data.turnStartedAt);

    if (graceExpired && data.disconnectedPlayer) {
      data.status = 'finished';
      data.lifecycleState = 'COMPLETED';
      const winner: PlayerColor = data.disconnectedPlayer.color === 'white' ? 'black' : 'white';
      const reason = 'Opponent disconnected and forfeited match';
      data.result = winner;
      data.terminationReason = reason;
      data.activeClockColor = null;
      data.turnStartedAt = null;

      await this.saveData();
      await this.scheduleNextAlarm(data);

      this.broadcastStateSync(data);
      this.broadcast({
        type: 'game-over',
        result: winner,
        reason,
      });

      await this.persistGameResult(winner);
      return;
    }

    // 2. Check active player clock timeout
    if (data.status === 'in-progress' && data.activeClockColor && data.turnStartedAt) {
      const activeRemaining =
        data.activeClockColor === 'white' ? data.whiteRemainingMs : data.blackRemainingMs;
      const elapsed = now - data.turnStartedAt;

      // Re-evaluate: did the active player actually exhaust their time?
      if (elapsed >= activeRemaining) {
        if (data.activeClockColor === 'white') {
          data.whiteRemainingMs = 0;
        } else {
          data.blackRemainingMs = 0;
        }
        data.status = 'finished';
        data.lifecycleState = 'COMPLETED';
        const winner: PlayerColor = data.activeClockColor === 'white' ? 'black' : 'white';
        const timedOutName =
          data.activeClockColor === 'white' ? data.whiteDisplayName : data.blackDisplayName;
        const reason = `${timedOutName} timed out`;
        data.result = winner;
        data.terminationReason = reason;
        data.activeClockColor = null;
        data.turnStartedAt = null;

        await this.saveData();
        await this.scheduleNextAlarm(data);

        this.broadcastStateSync(data);
        this.broadcast({
          type: 'game-over',
          result: winner,
          reason,
        });

        await this.persistGameResult(winner);
        return;
      }
    }

    // If neither expired, re-evaluate and reschedule
    await this.scheduleNextAlarm(data);
  }

  private broadcastStateSync(data: GameRoomData) {
    const sockets = this.ctx.getWebSockets();
    const whiteRemainingMs = this.getLiveRemainingMs(data, 'white');
    const blackRemainingMs = this.getLiveRemainingMs(data, 'black');
    const lifecycle: GameLifecycleState =
      data.lifecycleState ??
      (data.status === 'finished' ? 'COMPLETED' : data.status === 'waiting' ? 'WAITING' : 'ACTIVE');

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
        whiteRemainingMs,
        blackRemainingMs,
        activeClockColor: data.activeClockColor,
        lifecycleState: lifecycle,
        result: data.result ?? null,
        terminationReason: data.terminationReason ?? null,
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
    if (!this.data) return;
    if (this.settled) return;

    // Check DO storage idempotency
    const alreadySettled = await this.ctx.storage.get<boolean>('settled');
    if (alreadySettled) {
      this.settled = true;
      return;
    }

    this.settled = true;
    await this.ctx.storage.put('settled', true);

    // If this match belongs to a tournament, authoritatively notify TournamentDO
    if (this.data.tournamentId && this.env?.TOURNAMENT) {
      try {
        const tourneyDoId = this.env.TOURNAMENT.idFromName(this.data.tournamentId);
        const tourneyStub = this.env.TOURNAMENT.get(tourneyDoId);
        const winnerUserId =
          result === 'white'
            ? this.data.whiteUserId
            : result === 'black'
              ? this.data.blackUserId
              : null;

        await tourneyStub.fetch(
          new Request('http://tournament/match-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: this.data.matchId,
              gameId: this.data.gameId,
              winnerUserId,
              result,
            }),
          }),
        );
      } catch (err) {
        console.error('Failed to notify TournamentDO of match result:', err);
      }
    }

    if (!this.env.DB) return;

    try {
      const db = drizzle(this.env.DB, { schema });

      // Check D1 settlement table idempotency
      const existingSettlement = await db
        .select()
        .from(schema.gameSettlements)
        .where(eq(schema.gameSettlements.gameId, this.data.gameId))
        .limit(1);

      if (existingSettlement.length > 0) {
        this.settled = true;
        await this.ctx.storage.put('settled', true);
        return;
      }

      // Fetch profiles to calculate Elo delta
      const [whiteProfile] = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, this.data.whiteUserId))
        .limit(1);

      const [blackProfile] = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, this.data.blackUserId))
        .limit(1);

      let ratingDeltaWhite: number | null = null;
      let ratingDeltaBlack: number | null = null;

      const batchStatements: any[] = [];

      if (whiteProfile && blackProfile) {
        const elo = calculateElo(whiteProfile.rating, blackProfile.rating, result);
        ratingDeltaWhite = elo.deltaWhite;
        ratingDeltaBlack = elo.deltaBlack;

        batchStatements.push(
          db
            .update(schema.profiles)
            .set({
              rating: elo.newRatingWhite,
              gamesPlayed: whiteProfile.gamesPlayed + 1,
            })
            .where(eq(schema.profiles.userId, this.data.whiteUserId)),
        );

        batchStatements.push(
          db
            .update(schema.profiles)
            .set({
              rating: elo.newRatingBlack,
              gamesPlayed: blackProfile.gamesPlayed + 1,
            })
            .where(eq(schema.profiles.userId, this.data.blackUserId)),
        );
      }

      const pgn = getPgn(this.data.gameState);
      const endedAt = new Date();

      batchStatements.push(
        db
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
            endedAt,
          })
          .onConflictDoUpdate({
            target: schema.games.id,
            set: {
              finalFen: this.data.gameState.fen,
              pgn,
              result,
              ratingDeltaWhite,
              ratingDeltaBlack,
              endedAt,
            },
          }),
      );

      // Record unique settlement
      batchStatements.push(
        db.insert(schema.gameSettlements).values({
          id: `settle_${this.data.gameId}`,
          gameId: this.data.gameId,
          whiteUserId: this.data.whiteUserId,
          blackUserId: this.data.blackUserId,
          result,
          ratingDeltaWhite: ratingDeltaWhite ?? 0,
          ratingDeltaBlack: ratingDeltaBlack ?? 0,
          settledAt: endedAt,
        }),
      );

      // Execute atomically in a single D1 batch transaction!
      if (batchStatements.length > 0) {
        if (typeof (db as any).batch === 'function') {
          await db.batch(batchStatements as any);
        } else {
          for (const stmt of batchStatements) {
            await stmt;
          }
        }
      }

      // Mark settled in DO storage
      this.settled = true;
      await this.ctx.storage.put('settled', true);
    } catch (err) {
      console.error('Failed persisting game result to D1:', err);
    }
  }
}
