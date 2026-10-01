import type { GameState } from '@et-chess/types';
import { z } from 'zod';

// ==========================================
// Chess Core Primitive Schemas
// ==========================================

export const MoveSchema = z.object({
  from: z.string().regex(/^[a-h][1-8]$/, 'Invalid square algebraic coordinate'),
  to: z.string().regex(/^[a-h][1-8]$/, 'Invalid square algebraic coordinate'),
  promotion: z.enum(['q', 'r', 'b', 'n']).optional(),
});

export const PlayerColorSchema = z.enum(['white', 'black']);

export const GameStatusSchema = z.enum(['ongoing', 'check', 'checkmate', 'stalemate', 'draw']);

export const GameStateSchema = z.object({
  fen: z.string().min(1),
  turn: PlayerColorSchema,
  status: GameStatusSchema,
  moveHistory: z.array(MoveSchema),
});

export const PlayerInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  rating: z.number().optional(),
});

// ==========================================
// Client → Server Messages
// ==========================================

export const ClientMoveMessage = z.object({
  type: z.literal('move'),
  move: MoveSchema,
});

export const ClientResignMessage = z.object({
  type: z.literal('resign'),
});

export const ClientDrawOfferMessage = z.object({
  type: z.literal('draw-offer'),
});

export const ClientDrawResponseMessage = z.object({
  type: z.literal('draw-response'),
  accept: z.boolean(),
});

export const ClientMessage = z.discriminatedUnion('type', [
  ClientMoveMessage,
  ClientResignMessage,
  ClientDrawOfferMessage,
  ClientDrawResponseMessage,
]);

// ==========================================
// Server → Client Messages
// ==========================================

export const GameLifecycleSchema = z.enum(['WAITING', 'ACTIVE', 'COMPLETED', 'ABORTED']);

export const ServerStateSyncMessage = z.object({
  type: z.literal('state-sync'),
  gameState: GameStateSchema,
  whitePlayer: PlayerInfoSchema.optional(),
  blackPlayer: PlayerInfoSchema.optional(),
  yourColor: PlayerColorSchema.optional(),
  whiteRemainingMs: z.number().int().nonnegative().optional(),
  blackRemainingMs: z.number().int().nonnegative().optional(),
  activeClockColor: PlayerColorSchema.nullable().optional(),
  lifecycleState: GameLifecycleSchema.optional(),
  result: z.enum(['white', 'black', 'draw']).nullable().optional(),
  terminationReason: z.string().nullable().optional(),
});

export const ServerOpponentDisconnectedMessage = z.object({
  type: z.literal('opponent-disconnected'),
  gracePeriodMs: z.number().int().nonnegative(),
});

export const ServerOpponentReconnectedMessage = z.object({
  type: z.literal('opponent-reconnected'),
});

export const ServerGameOverMessage = z.object({
  type: z.literal('game-over'),
  result: z.enum(['white', 'black', 'draw']),
  reason: z.string(),
});

export const ServerDrawOfferedMessage = z.object({
  type: z.literal('draw-offered'),
});

export const ServerErrorMessage = z.object({
  type: z.literal('error'),
  message: z.string(),
});

export const ServerMessage = z.discriminatedUnion('type', [
  ServerStateSyncMessage,
  ServerOpponentDisconnectedMessage,
  ServerOpponentReconnectedMessage,
  ServerGameOverMessage,
  ServerDrawOfferedMessage,
  ServerErrorMessage,
]);

// ==========================================
// Inferred TypeScript Types
// ==========================================

export type ClientMoveMessage = z.infer<typeof ClientMoveMessage>;
export type ClientResignMessage = z.infer<typeof ClientResignMessage>;
export type ClientDrawOfferMessage = z.infer<typeof ClientDrawOfferMessage>;
export type ClientDrawResponseMessage = z.infer<typeof ClientDrawResponseMessage>;
export type ClientMessage = z.infer<typeof ClientMessage>;

export type ServerStateSyncMessage = z.infer<typeof ServerStateSyncMessage>;
export type ServerOpponentDisconnectedMessage = z.infer<typeof ServerOpponentDisconnectedMessage>;
export type ServerOpponentReconnectedMessage = z.infer<typeof ServerOpponentReconnectedMessage>;
export type ServerGameOverMessage = z.infer<typeof ServerGameOverMessage>;
export type ServerDrawOfferedMessage = z.infer<typeof ServerDrawOfferedMessage>;
export type ServerErrorMessage = z.infer<typeof ServerErrorMessage>;
export type ServerMessage = z.infer<typeof ServerMessage>;

export type DrawOfferedMessage = ServerDrawOfferedMessage;
export type ErrorMessage = ServerErrorMessage;
export type GameOverMessage = ServerGameOverMessage;
export type OpponentDisconnectedMessage = ServerOpponentDisconnectedMessage;
export type OpponentReconnectedMessage = ServerOpponentReconnectedMessage;
export type StateSyncMessage = ServerStateSyncMessage;

// ==========================================
// Safe Helper Functions
// ==========================================

export function parseClientMessage(raw: unknown): ClientMessage {
  if (typeof raw === 'string') {
    return ClientMessage.parse(JSON.parse(raw));
  }
  return ClientMessage.parse(raw);
}

export function safeParseClientMessage(raw: unknown) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return ClientMessage.safeParse(data);
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err : new Error('Malformed JSON payload'),
    };
  }
}

export function parseServerMessage(raw: unknown): ServerMessage {
  if (typeof raw === 'string') {
    return ServerMessage.parse(JSON.parse(raw));
  }
  return ServerMessage.parse(raw);
}

export function safeParseServerMessage(raw: unknown) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return ServerMessage.safeParse(data);
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err : new Error('Malformed JSON payload'),
    };
  }
}

export const createClientMessage = {
  move: (move: {
    from: string;
    to: string;
    promotion?: 'q' | 'r' | 'b' | 'n';
  }): ClientMoveMessage => ({
    type: 'move',
    move,
  }),
  resign: (): ClientResignMessage => ({
    type: 'resign',
  }),
  drawOffer: (): ClientDrawOfferMessage => ({
    type: 'draw-offer',
  }),
  drawResponse: (accept: boolean): ClientDrawResponseMessage => ({
    type: 'draw-response',
    accept,
  }),
};

export const createServerMessage = {
  stateSync: (
    gameState: GameState,
    extra?: Partial<Omit<ServerStateSyncMessage, 'type' | 'gameState'>>,
  ): ServerStateSyncMessage => ({
    type: 'state-sync',
    gameState,
    ...extra,
  }),
  opponentDisconnected: (gracePeriodMs: number): ServerOpponentDisconnectedMessage => ({
    type: 'opponent-disconnected',
    gracePeriodMs,
  }),
  opponentReconnected: (): ServerOpponentReconnectedMessage => ({
    type: 'opponent-reconnected',
  }),
  gameOver: (result: 'white' | 'black' | 'draw', reason: string): ServerGameOverMessage => ({
    type: 'game-over',
    result,
    reason,
  }),
  drawOffered: (): ServerDrawOfferedMessage => ({
    type: 'draw-offered',
  }),
  error: (message: string): ServerErrorMessage => ({
    type: 'error',
    message,
  }),
};

export function serializeMessage(msg: ClientMessage | ServerMessage): string {
  return JSON.stringify(msg);
}

export { GameSocketClient, type GameSocketClientOptions } from './client';
