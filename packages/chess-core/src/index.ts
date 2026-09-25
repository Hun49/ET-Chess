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

/**
 * Returns SAN (Standard Algebraic Notation) strings for all moves played in the game.
 */
export function getSanHistory(state: GameState): string[] {
  const chess = new Chess();
  const sanMoves: string[] = [];
  for (const m of state.moveHistory) {
    try {
      const result = chess.move({
        from: m.from,
        to: m.to,
        promotion: m.promotion,
      });
      if (result) {
        sanMoves.push(result.san);
      } else {
        sanMoves.push(`${m.from}-${m.to}`);
      }
    } catch {
      sanMoves.push(`${m.from}-${m.to}`);
    }
  }
  return sanMoves;
}

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const CENTER_SQUARES = new Set(['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5']);

function toPromotion(piece?: string): 'q' | 'r' | 'b' | 'n' | undefined {
  if (piece === 'q' || piece === 'r' || piece === 'b' || piece === 'n') {
    return piece;
  }
  return undefined;
}

/**
 * Returns all legal moves available in the current game state or FEN.
 */
export function getAllLegalMoves(stateOrFen: GameState | string): Move[] {
  const chess =
    typeof stateOrFen === 'string' ? new Chess(stateOrFen) : getChessInstance(stateOrFen);
  try {
    const verboseMoves = chess.moves({ verbose: true });
    return verboseMoves.map((m) => ({
      from: m.from,
      to: m.to,
      promotion: toPromotion(m.promotion),
    }));
  } catch {
    return [];
  }
}

/**
 * Tactical heuristic / minimax move evaluator for bot simulator fallback.
 * Guarantees 100% legal moves, prioritizes mate-in-1, material gain, checks,
 * center control, and avoids blundering into immediate checkmate.
 */
export function findBestMove(stateOrFen: GameState | string): Move | null {
  const chess =
    typeof stateOrFen === 'string' ? new Chess(stateOrFen) : getChessInstance(stateOrFen);

  if (chess.isGameOver()) {
    return null;
  }

  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) {
    return null;
  }

  const firstMove = legalMoves[0];
  if (!firstMove) {
    return null;
  }

  if (legalMoves.length === 1) {
    return {
      from: firstMove.from,
      to: firstMove.to,
      promotion: toPromotion(firstMove.promotion),
    };
  }

  let bestScore = -Infinity;
  let bestMove: Move = {
    from: firstMove.from,
    to: firstMove.to,
    promotion: toPromotion(firstMove.promotion),
  };

  for (const move of legalMoves) {
    let score = 0;

    const result = chess.move(move);
    if (!result) continue;

    // 1. Immediate checkmate
    if (chess.isCheckmate()) {
      chess.undo();
      return {
        from: move.from,
        to: move.to,
        promotion: toPromotion(move.promotion),
      };
    }

    // 2. Draw penalty
    if (chess.isDraw()) {
      score -= 100;
    }

    // 3. Captures
    if (move.captured) {
      const capturedVal = PIECE_VALUES[move.captured] ?? 100;
      const pieceVal = PIECE_VALUES[move.piece] ?? 100;
      score += capturedVal * 10 - pieceVal;
    }

    // 4. Promotion bonus
    if (move.promotion) {
      score += (PIECE_VALUES[move.promotion] ?? 900) * 8;
    }

    // 5. Check bonus
    if (chess.inCheck()) {
      score += 150;
    }

    // 6. Central control
    if (CENTER_SQUARES.has(move.to)) {
      score += 30;
    }

    // 7. Lookahead 1-ply for opponent threats
    const opponentMoves = chess.moves({ verbose: true });
    let maxOpponentThreat = 0;
    for (const oppMove of opponentMoves) {
      if (oppMove.to === move.to) {
        const pieceVal = PIECE_VALUES[move.piece] ?? 100;
        maxOpponentThreat = Math.max(maxOpponentThreat, pieceVal * 8);
      }
      chess.move(oppMove);
      if (chess.isCheckmate()) {
        maxOpponentThreat = 100000;
      }
      chess.undo();
    }
    score -= maxOpponentThreat;

    chess.undo();

    if (score > bestScore) {
      bestScore = score;
      bestMove = {
        from: move.from,
        to: move.to,
        promotion: toPromotion(move.promotion),
      };
    }
  }

  return bestMove;
}
