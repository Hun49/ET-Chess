import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createGame,
  getGameStatus,
  getLegalMoves,
  getSanHistory,
  isGameOver,
} from './index';

describe('packages/chess-core', () => {
  it('starts a new game with correct starting FEN, white turn, and ongoing status', () => {
    const game = createGame();
    expect(game.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(game.turn).toBe('white');
    expect(game.status).toBe('ongoing');
    expect(game.moveHistory).toEqual([]);
    expect(isGameOver(game)).toBe(false);
  });

  it('applies a legal opening move (e2 -> e4), updates FEN, flips turn, and updates moveHistory', () => {
    const game = createGame();
    const updated = applyMove(game, { from: 'e2', to: 'e4' });

    expect(updated.turn).toBe('black');
    expect(updated.fen).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq');
    expect(updated.status).toBe('ongoing');
    expect(updated.moveHistory).toEqual([{ from: 'e2', to: 'e4' }]);

    // Immutability check: original game state must not be modified
    expect(game.turn).toBe('white');
    expect(game.moveHistory).toEqual([]);
  });

  it('throws on an illegal move and preserves state', () => {
    const game = createGame();

    // Trying to move white pawn from e2 to e5 (illegal move)
    expect(() => applyMove(game, { from: 'e2', to: 'e5' })).toThrow();

    // Trying to move bishop through pawn
    expect(() => applyMove(game, { from: 'f1', to: 'c4' })).toThrow();

    // State remains unaffected
    expect(game.turn).toBe('white');
    expect(game.moveHistory).toEqual([]);
  });

  it('correctly detects check and Scholar’s mate checkmate sequence', () => {
    let game = createGame();

    // 1. e4 e5
    game = applyMove(game, { from: 'e2', to: 'e4' });
    game = applyMove(game, { from: 'e7', to: 'e5' });

    // 2. Qh5 Nc6
    game = applyMove(game, { from: 'd1', to: 'h5' });
    game = applyMove(game, { from: 'b8', to: 'c6' });

    // 3. Bc4 Nf6
    game = applyMove(game, { from: 'f1', to: 'c4' });
    game = applyMove(game, { from: 'g8', to: 'f6' });

    expect(game.status).toBe('ongoing');

    // 4. Qxf7#
    game = applyMove(game, { from: 'h5', to: 'f7' });

    expect(game.status).toBe('checkmate');
    expect(isGameOver(game)).toBe(true);
    expect(getGameStatus(game)).toBe('checkmate');
  });

  it('correctly resolves a known stalemate position', () => {
    // Black King on a8, White Queen on b6, White King on h1. Black to move.
    const stalemateState = {
      fen: 'k7/8/1Q6/8/8/8/8/7K b - - 0 1',
      turn: 'black' as const,
      status: 'ongoing' as const,
      moveHistory: [],
    };

    expect(getGameStatus(stalemateState)).toBe('stalemate');
    expect(isGameOver(stalemateState)).toBe(true);
    expect(getLegalMoves(stalemateState, 'a8')).toEqual([]);
  });

  it('correctly resolves known draw positions (insufficient material and threefold repetition)', () => {
    // Insufficient material: King vs King
    const bareKingsState = {
      fen: '8/8/8/8/8/8/4k3/4K3 w - - 0 1',
      turn: 'white' as const,
      status: 'ongoing' as const,
      moveHistory: [],
    };

    expect(getGameStatus(bareKingsState)).toBe('draw');
    expect(isGameOver(bareKingsState)).toBe(true);

    // Threefold repetition
    let game = createGame();
    // Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8
    game = applyMove(game, { from: 'g1', to: 'f3' });
    game = applyMove(game, { from: 'g8', to: 'f6' });
    game = applyMove(game, { from: 'f3', to: 'g1' });
    game = applyMove(game, { from: 'f6', to: 'g8' });

    game = applyMove(game, { from: 'g1', to: 'f3' });
    game = applyMove(game, { from: 'g8', to: 'f6' });
    game = applyMove(game, { from: 'f3', to: 'g1' });
    game = applyMove(game, { from: 'f6', to: 'g8' });

    expect(getGameStatus(game)).toBe('draw');
    expect(isGameOver(game)).toBe(true);
  });

  it('restricts legal moves for pinned pieces that would expose the king', () => {
    // White King on e1, White Pawn on f2, Black King on a8, Black Bishop on h4 (pinning the f2 pawn)
    const pinnedState = {
      fen: 'k7/8/8/8/7b/8/5P2/4K3 w - - 0 1',
      turn: 'white' as const,
      status: 'ongoing' as const,
      moveHistory: [],
    };

    // The pawn cannot move because any move exposes the King to the bishop
    expect(getLegalMoves(pinnedState, 'f2')).toEqual([]);

    // The King can legally step out of the pin
    const kingMoves = getLegalMoves(pinnedState, 'e1');
    expect(kingMoves.length).toBeGreaterThan(0);
    expect(kingMoves).not.toContain('f2'); // cannot step onto own pawn
  });

  it('handles castling and en passant correctly', () => {
    // 1. Castling test
    // Position where White can castle kingside:
    // f1 bishop and g1 knight are cleared, castling is legal
    const castlingFen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const canCastleState = {
      fen: castlingFen,
      turn: 'white' as const,
      status: 'ongoing' as const,
      moveHistory: [],
    };

    const kingMoves = getLegalMoves(canCastleState, 'e1');
    expect(kingMoves).toContain('g1'); // Kingside castle

    const castledGame = applyMove(canCastleState, { from: 'e1', to: 'g1' });
    expect(castledGame.fen).toContain('RNBQ1RK1');

    // 2. En Passant test
    let epGame = createGame();
    // 1. e4 a6
    epGame = applyMove(epGame, { from: 'e2', to: 'e4' });
    epGame = applyMove(epGame, { from: 'a7', to: 'a6' });
    // 2. e5 d5
    epGame = applyMove(epGame, { from: 'e4', to: 'e5' });
    epGame = applyMove(epGame, { from: 'd7', to: 'd5' });

    // e5 pawn should have legal en-passant capture on d6
    const e5Moves = getLegalMoves(epGame, 'e5');
    expect(e5Moves).toContain('d6');

    // Perform en passant
    const afterEp = applyMove(epGame, { from: 'e5', to: 'd6' });
    expect(afterEp.turn).toBe('black');
    // Captured d5 pawn is removed from the board
    const chess = new Chess(afterEp.fen);
    expect(chess.get('d5')).toBeUndefined();
  });

  it('correctly generates SAN history for played moves', () => {
    let game = createGame();
    game = applyMove(game, { from: 'e2', to: 'e4' });
    game = applyMove(game, { from: 'e7', to: 'e5' });
    game = applyMove(game, { from: 'g1', to: 'f3' });
    game = applyMove(game, { from: 'b8', to: 'c6' });

    expect(getSanHistory(game)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });
});
