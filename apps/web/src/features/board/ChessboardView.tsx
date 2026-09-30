import { getLegalMoves, isGameOver } from '@et-chess/chess-core';
import type { GameState, PlayerColor } from '@et-chess/types';
import { useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../../store/gameStore';

export interface ChessboardViewProps {
  orientation?: 'white' | 'black';
  boardOrientation?: 'white' | 'black';
  gameState?: GameState;
  onMove?: (move: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }) => boolean;
  disabled?: boolean;
}

/**
 * Checks if a square on the chessboard is occupied by any piece according to FEN.
 */
export function isSquareOccupied(fen: string, square: string): boolean {
  if (square.length < 2) return false;
  const boardFen = fen.split(' ')[0];
  if (!boardFen) return false;

  const rows = boardFen.split('/');
  const colIndex = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rowChar = square[1];
  if (!rowChar) return false;

  const rowIndex = 8 - parseInt(rowChar, 10);
  if (rowIndex < 0 || rowIndex >= 8 || colIndex < 0 || colIndex >= 8) {
    return false;
  }

  const row = rows[rowIndex];
  if (!row) return false;

  let currCol = 0;
  for (const ch of row) {
    if (ch >= '1' && ch <= '8') {
      currCol += parseInt(ch, 10);
    } else {
      if (currCol === colIndex) {
        return true;
      }
      currCol++;
    }
  }
  return false;
}

/**
 * Checks if a move by a pawn reaches the back rank (promotion).
 */
export function isPawnMoveToBackRank(fen: string, from: string, to: string): boolean {
  if (from.length < 2 || to.length < 2) return false;
  const toRank = to[1];
  if (toRank !== '8' && toRank !== '1') {
    return false;
  }

  const boardFen = fen.split(' ')[0];
  if (!boardFen) return false;

  const rows = boardFen.split('/');
  const colIndex = from.charCodeAt(0) - 'a'.charCodeAt(0);
  const fromRank = from[1];
  if (!fromRank) return false;

  const rowIndex = 8 - parseInt(fromRank, 10);
  if (rowIndex < 0 || rowIndex >= 8 || colIndex < 0 || colIndex >= 8) {
    return false;
  }

  const row = rows[rowIndex];
  if (!row) return false;

  let currCol = 0;
  let pieceChar = '';
  for (const ch of row) {
    if (ch >= '1' && ch <= '8') {
      currCol += parseInt(ch, 10);
    } else {
      if (currCol === colIndex) {
        pieceChar = ch;
        break;
      }
      currCol++;
    }
  }

  return pieceChar.toLowerCase() === 'p';
}

/**
 * Locates the current square of the specified king in the position FEN.
 */
export function findKingSquare(fen: string, color: PlayerColor): string | null {
  const targetChar = color === 'white' ? 'K' : 'k';
  const boardFen = fen.split(' ')[0];
  if (!boardFen) return null;

  const rows = boardFen.split('/');

  for (let r = 0; r < 8; r++) {
    const row = rows[r];
    if (!row) continue;

    let c = 0;
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        c += parseInt(ch, 10);
      } else {
        if (ch === targetChar) {
          const colLetter = String.fromCharCode('a'.charCodeAt(0) + c);
          const rank = (8 - r).toString();
          return `${colLetter}${rank}`;
        }
        c++;
      }
    }
  }
  return null;
}

export function ChessboardView({
  orientation = 'white',
  boardOrientation,
  gameState: controlledGame,
  onMove: controlledOnMove,
  disabled = false,
}: ChessboardViewProps) {
  const storeGame = useGameStore((state) => state.game);
  const storeMakeMove = useGameStore((state) => state.makeMove);

  const game = controlledGame ?? storeGame;
  const makeMove = controlledOnMove ?? storeMakeMove;

  const effectiveOrientation = boardOrientation ?? orientation;

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  const handleSquareClick = (square: string) => {
    if (disabled || isGameOver(game)) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // If destination square clicked from selected piece, execute move
    if (selectedSquare && legalMoves.includes(square)) {
      const isPromotion = isPawnMoveToBackRank(game.fen, selectedSquare, square);
      const success = makeMove({
        from: selectedSquare,
        to: square,
        promotion: isPromotion ? 'q' : undefined,
      });

      if (success) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }

    // Toggle off if clicking the currently selected square
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Otherwise, check if square contains player's piece with legal moves
    const candidateMoves = getLegalMoves(game, square);
    if (candidateMoves.length > 0) {
      setSelectedSquare(square);
      setLegalMoves(candidateMoves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const handlePieceDrop = (sourceSquare: string, targetSquare: string | null): boolean => {
    if (disabled || !targetSquare) return false;
    if (isGameOver(game)) return false;

    const isPromotion = isPawnMoveToBackRank(game.fen, sourceSquare, targetSquare);
    const success = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: isPromotion ? 'q' : undefined,
    });

    if (success) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return true;
    }
    return false;
  };

  const customSquareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(234, 179, 8, 0.45)',
      };
    }

    // Highlight legal destination squares
    for (const square of legalMoves) {
      const occupied = isSquareOccupied(game.fen, square);
      if (occupied) {
        styles[square] = {
          background: 'radial-gradient(circle, transparent 55%, rgba(34, 197, 94, 0.65) 58%)',
          cursor: 'pointer',
        };
      } else {
        styles[square] = {
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.65) 24%, transparent 25%)',
          cursor: 'pointer',
        };
      }
    }

    // Highlight king in check or checkmate
    if (game.status === 'check' || game.status === 'checkmate') {
      const kingSquare = findKingSquare(game.fen, game.turn);
      if (kingSquare) {
        styles[kingSquare] = {
          ...styles[kingSquare],
          background:
            'radial-gradient(circle, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.3) 65%, transparent 75%)',
        };
      }
    }

    return styles;
  }, [selectedSquare, legalMoves, game.fen, game.status, game.turn]);

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none"
      data-testid="chessboard-container"
    >
      <Chessboard
        options={{
          position: game.fen,
          boardOrientation: effectiveOrientation,
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!targetSquare) return false;
            return handlePieceDrop(sourceSquare, targetSquare);
          },
          onSquareClick: ({ square }) => {
            handleSquareClick(square);
          },
          squareStyles: customSquareStyles,
          darkSquareStyle: { backgroundColor: '#b58863' },
          lightSquareStyle: { backgroundColor: '#f0d9b5' },
          animationDurationInMs: 200,
        }}
      />
    </div>
  );
}

export default ChessboardView;
