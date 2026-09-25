import type { GameState, GameStatus, Move, PlayerColor } from '@et-chess/types';
import { Chess, type Square } from 'chess.js';

function getStatusFromChessInstance(chess: Chess): GameStatus {
  if (chess.isCheckmate()) {
    return 'checkmate';
  }
  if (chess.isStalemate()) {
    return 'stalemate';
  }
  if (chess.isDraw()) {
    return 'draw';
  }
  if (chess.inCheck()) {
    return 'check';
  }
  return 'ongoing';
}

function getTurnFromChessInstance(chess: Chess): PlayerColor {
  return chess.turn() === 'w' ? 'white' : 'black';
}

function getChessInstance(state: GameState): Chess {
  if (state.moveHistory && state.moveHistory.length > 0) {
    try {
      const chess = new Chess();
      for (const m of state.moveHistory) {
        chess.move({
          from: m.from,
          to: m.to,
          promotion: m.promotion,
        });
      }
      if (chess.fen() === state.fen) {
        return chess;
      }
    } catch {
      // Fall back to FEN loading for custom/arbitrary positions
    }
  }
  return new Chess(state.fen);
}

/**
 * Creates a brand new chess game in starting position.
 */
export function createGame(): GameState {
  const chess = new Chess();
  return {
    fen: chess.fen(),
    turn: getTurnFromChessInstance(chess),
    status: getStatusFromChessInstance(chess),
    moveHistory: [],
  };
}

/**
 * Applies a move to the given GameState and returns a new GameState.
 * Throws an Error if the move is illegal.
 */
export function applyMove(state: GameState, move: Move): GameState {
  const chess = getChessInstance(state);

  const result = chess.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  });

  if (!result) {
    throw new Error(`Illegal move: ${move.from} -> ${move.to}`);
  }

  const nextTurn = getTurnFromChessInstance(chess);
  const status = getStatusFromChessInstance(chess);

  return {
    fen: chess.fen(),
    turn: nextTurn,
    status,
    moveHistory: [...state.moveHistory, { ...move }],
  };
}

/**
 * Returns legal destination squares for a piece at the specified square.
 */
export function getLegalMoves(state: GameState, square: string): string[] {
  const chess = getChessInstance(state);
  try {
    const legalMoves = chess.moves({
      square: square as Square,
      verbose: true,
    });
    return legalMoves.map((m) => m.to);
  } catch {
    return [];
  }
}

/**
 * Evaluates the current game status from state.
 */
export function getGameStatus(state: GameState): GameStatus {
  const chess = getChessInstance(state);
  return getStatusFromChessInstance(chess);
}

/**
 * Checks whether the game has reached a terminal state (checkmate, stalemate, draw).
 */
export function isGameOver(state: GameState): boolean {
  const chess = getChessInstance(state);
  return chess.isGameOver();
}
