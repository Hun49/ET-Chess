import { describe, expect, it } from 'vitest';
import {
  type ClientDrawOfferMessage,
  type ClientDrawResponseMessage,
  ClientMessage,
  type ClientMoveMessage,
  type ClientResignMessage,
  GameStateSchema,
  MoveSchema,
  parseClientMessage,
  parseServerMessage,
  type ServerDrawOfferedMessage,
  type ServerErrorMessage,
  type ServerGameOverMessage,
  ServerMessage,
  type ServerOpponentDisconnectedMessage,
  type ServerOpponentReconnectedMessage,
  type ServerStateSyncMessage,
  safeParseClientMessage,
  safeParseServerMessage,
  serializeMessage,
} from './index';

describe('Realtime Protocol Schema Contracts (packages/realtime-protocol)', () => {
  describe('MoveSchema & GameStateSchema validation', () => {
    it('validates legal algebraic squares and optional promotions', () => {
      const validMove = { from: 'e2', to: 'e4' };
      expect(MoveSchema.parse(validMove)).toEqual(validMove);

      const promotionMove = { from: 'e7', to: 'e8', promotion: 'q' as const };
      expect(MoveSchema.parse(promotionMove)).toEqual(promotionMove);
    });

    it('rejects invalid board coordinates', () => {
      expect(() => MoveSchema.parse({ from: 'e9', to: 'e4' })).toThrow();
      expect(() => MoveSchema.parse({ from: 'z1', to: 'a1' })).toThrow();
      expect(() => MoveSchema.parse({ from: '4e', to: 'e4' })).toThrow();
      expect(() => MoveSchema.parse({ from: '', to: 'e4' })).toThrow();
    });

    it('validates canonical GameState structures', () => {
      const validState = {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'white' as const,
        status: 'ongoing' as const,
        moveHistory: [],
      };
      expect(GameStateSchema.parse(validState)).toEqual(validState);
    });

    it('rejects malformed GameState structures', () => {
      expect(() =>
        GameStateSchema.parse({
          fen: '',
          turn: 'purple',
          status: 'ongoing',
          moveHistory: [],
        }),
      ).toThrow();
    });
  });

  describe('ClientMessage variant parsing and round-trips', () => {
    it('round-trips ClientMoveMessage through discriminated union', () => {
      const msg: ClientMoveMessage = {
        type: 'move',
        move: { from: 'e2', to: 'e4' },
      };
      const serialized = serializeMessage(msg);
      const parsed = parseClientMessage(serialized);
      expect(parsed).toEqual(msg);
      expect(ClientMessage.parse(msg)).toEqual(msg);
    });

    it('round-trips ClientResignMessage', () => {
      const msg: ClientResignMessage = { type: 'resign' };
      const parsed = parseClientMessage(serializeMessage(msg));
      expect(parsed).toEqual(msg);
    });

    it('round-trips ClientDrawOfferMessage and ClientDrawResponseMessage', () => {
      const offer: ClientDrawOfferMessage = { type: 'draw-offer' };
      expect(parseClientMessage(serializeMessage(offer))).toEqual(offer);

      const accept: ClientDrawResponseMessage = { type: 'draw-response', accept: true };
      expect(parseClientMessage(serializeMessage(accept))).toEqual(accept);

      const decline: ClientDrawResponseMessage = { type: 'draw-response', accept: false };
      expect(parseClientMessage(serializeMessage(decline))).toEqual(decline);
    });

    it('rejects unsupported or tampered client message types', () => {
      const invalidType = { type: 'cheat', code: 'stockfish_depth_30' };
      const res = safeParseClientMessage(invalidType);
      expect(res.success).toBe(false);
    });

    it('safeParseClientMessage handles malformed JSON strings without throwing', () => {
      const res = safeParseClientMessage('{ broken json ...');
      expect(res.success).toBe(false);
    });
  });

  describe('ServerMessage variant parsing and round-trips', () => {
    it('round-trips ServerStateSyncMessage with player context', () => {
      const msg: ServerStateSyncMessage = {
        type: 'state-sync',
        gameState: {
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          turn: 'black',
          status: 'ongoing',
          moveHistory: [{ from: 'e2', to: 'e4' }],
        },
        whitePlayer: { id: 'p1', displayName: 'Alice', rating: 1350 },
        blackPlayer: { id: 'p2', displayName: 'Bob', rating: 1400 },
        yourColor: 'white',
      };
      const serialized = serializeMessage(msg);
      const parsed = parseServerMessage(serialized);
      expect(parsed).toEqual(msg);
      expect(ServerMessage.parse(msg)).toEqual(msg);
    });

    it('round-trips ServerOpponentDisconnectedMessage and ServerOpponentReconnectedMessage', () => {
      const disconnectMsg: ServerOpponentDisconnectedMessage = {
        type: 'opponent-disconnected',
        gracePeriodMs: 60000,
      };
      expect(parseServerMessage(serializeMessage(disconnectMsg))).toEqual(disconnectMsg);

      const reconnectMsg: ServerOpponentReconnectedMessage = {
        type: 'opponent-reconnected',
      };
      expect(parseServerMessage(serializeMessage(reconnectMsg))).toEqual(reconnectMsg);
    });

    it('round-trips ServerGameOverMessage for all result options', () => {
      const whiteWin: ServerGameOverMessage = {
        type: 'game-over',
        result: 'white',
        reason: 'checkmate',
      };
      expect(parseServerMessage(serializeMessage(whiteWin))).toEqual(whiteWin);

      const draw: ServerGameOverMessage = {
        type: 'game-over',
        result: 'draw',
        reason: 'threefold-repetition',
      };
      expect(parseServerMessage(serializeMessage(draw))).toEqual(draw);
    });

    it('round-trips ServerDrawOfferedMessage and ServerErrorMessage', () => {
      const drawOffer: ServerDrawOfferedMessage = { type: 'draw-offered' };
      expect(parseServerMessage(serializeMessage(drawOffer))).toEqual(drawOffer);

      const err: ServerErrorMessage = { type: 'error', message: 'Illegal move: e2 -> e5' };
      expect(parseServerMessage(serializeMessage(err))).toEqual(err);
    });

    it('safeParseServerMessage catches malformed input gracefully', () => {
      expect(safeParseServerMessage(null).success).toBe(false);
      expect(safeParseServerMessage('{ not valid json').success).toBe(false);
      expect(safeParseServerMessage({ type: 'unknown-server-type' }).success).toBe(false);
    });
  });
});
