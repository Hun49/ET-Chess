import type { Move } from '@et-chess/types';

/**
 * Builders for UCI protocol commands.
 */
export const UCI = {
  init: (): string => 'uci',
  isReady: (): string => 'isready',
  setOption: (name: string, value: string | number): string =>
    `setoption name ${name} value ${value}`,
  position: (fen: string): string => `position fen ${fen}`,
  go: (options: { depth?: number; movetime?: number }): string => {
    if (options.depth !== undefined) {
      return `go depth ${options.depth}`;
    }
    if (options.movetime !== undefined) {
      return `go movetime ${options.movetime}`;
    }
    return 'go depth 10';
  },
  stop: (): string => 'stop',
  quit: (): string => 'quit',
};

function isPromotionPiece(char: string | undefined): char is 'q' | 'r' | 'b' | 'n' {
  return char === 'q' || char === 'r' || char === 'b' || char === 'n';
}

/**
 * Parses a Stockfish UCI output line looking for `bestmove <move>`.
 * Returns a `Move` object or null if the line is not a bestmove response or indicates no moves.
 */
export function parseBestMove(outputLine: string): Move | null {
  const trimmed = outputLine.trim();
  if (!trimmed.startsWith('bestmove')) {
    return null;
  }

  const parts = trimmed.split(/\s+/);
  const uciMove = parts[1];

  if (!uciMove || uciMove === '(none)') {
    return null;
  }

  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotionChar = uciMove.length > 4 ? uciMove[4] : undefined;
  const promotion = isPromotionPiece(promotionChar) ? promotionChar : undefined;

  return {
    from,
    to,
    ...(promotion ? { promotion } : {}),
  };
}
