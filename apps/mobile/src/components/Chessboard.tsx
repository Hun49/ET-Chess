import { getLegalMoves, isGameOver } from '@et-chess/chess-core';
import type { GameState, Move, PlayerColor } from '@et-chess/types';
import { useEffect, useMemo, useState } from 'react';
import {
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useGameStore } from '../store/gameStore';

export interface ChessboardProps {
  game?: GameState;
  orientation?: 'white' | 'black';
  disabled?: boolean;
  onMove?: (move: Move) => void;
  style?: StyleProp<ViewStyle>;
}

export const PIECE_GLYPHS: Record<string, string> = {
  P: '♙',
  N: '♘',
  B: '♗',
  R: '♖',
  Q: '♕',
  K: '♔',
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
};

export const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

/**
 * Checks if a square is occupied by any piece according to FEN.
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
 * Returns piece data at a given square from FEN.
 */
export function getPieceAt(
  fen: string,
  square: string,
): { type: string; color: 'w' | 'b'; glyph: string; name: string } | null {
  if (square.length < 2) return null;
  const boardFen = fen.split(' ')[0];
  if (!boardFen) return null;

  const rows = boardFen.split('/');
  const colIndex = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rowChar = square[1];
  if (!rowChar) return null;

  const rowIndex = 8 - parseInt(rowChar, 10);
  if (rowIndex < 0 || rowIndex >= 8 || colIndex < 0 || colIndex >= 8) {
    return null;
  }

  const row = rows[rowIndex];
  if (!row) return null;

  let currCol = 0;
  for (const ch of row) {
    if (ch >= '1' && ch <= '8') {
      currCol += parseInt(ch, 10);
    } else {
      if (currCol === colIndex) {
        const isUpper = ch === ch.toUpperCase();
        const color: 'w' | 'b' = isUpper ? 'w' : 'b';
        const type = ch.toLowerCase();
        const glyph = PIECE_GLYPHS[ch] ?? '';
        const name = PIECE_NAMES[type] ?? type;
        return { type, color, glyph, name };
      }
      currCol++;
    }
  }
  return null;
}

/**
 * Checks if a pawn move constitutes promotion to the back rank.
 */
export function isPawnMoveToBackRank(fen: string, from: string, to: string): boolean {
  if (from.length < 2 || to.length < 2) return false;
  const toRank = to[1];
  if (toRank !== '8' && toRank !== '1') {
    return false;
  }
  const piece = getPieceAt(fen, from);
  return piece?.type === 'p';
}

/**
 * Locates the square of the specified player's king in FEN.
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

export function Chessboard({
  game: propGame,
  orientation = 'white',
  disabled = false,
  onMove,
  style,
}: ChessboardProps) {
  const storeGame = useGameStore((state) => state.game);
  const game = propGame ?? storeGame;
  const gameMode = useGameStore((state) => state.gameMode);
  const isBotThinking = useGameStore((state) => state.isBotThinking);
  const resignedColor = useGameStore((state) => state.resignedColor);
  const makeMove = useGameStore((state) => state.makeMove);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  const { width } = useWindowDimensions();

  // Responsive board calculation
  const boardWidth = useMemo(() => {
    const horizontalMargin = 32;
    const maxBoardWidth = 400;
    const availableWidth = width > 0 ? width - horizontalMargin : 360;
    return Math.min(availableWidth, maxBoardWidth);
  }, [width]);

  const squareSize = useMemo(() => Math.floor(boardWidth / 8), [boardWidth]);
  const actualBoardSize = squareSize * 8;

  // Clear selection on turn/status/fen changes
  useEffect(() => {
    if (game) {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [game]);

  const ranks = useMemo(
    () => (orientation === 'black' ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1]),
    [orientation],
  );

  const files = useMemo(
    () =>
      orientation === 'black'
        ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
        : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    [orientation],
  );

  // In check king square
  const inCheckKingSquare = useMemo(() => {
    if (game.status === 'check' || game.status === 'checkmate') {
      return findKingSquare(game.fen, game.turn);
    }
    return null;
  }, [game.fen, game.status, game.turn]);

  const handleSquarePress = (square: string) => {
    if (disabled || isGameOver(game) || game.status === 'draw' || resignedColor !== null) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (gameMode === 'bot' && (game.turn === 'black' || isBotThinking)) {
      return;
    }

    // 1. Deselect if tapping the selected square
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // 2. Make move if tapping legal destination
    if (selectedSquare && legalMoves.includes(square)) {
      const isPromotion = isPawnMoveToBackRank(game.fen, selectedSquare, square);
      const movePayload: Move = {
        from: selectedSquare,
        to: square,
        promotion: isPromotion ? 'q' : undefined,
      };
      const success = makeMove(movePayload);
      setSelectedSquare(null);
      setLegalMoves([]);
      if (success && onMove) {
        onMove(movePayload);
      }
      return;
    }

    // 3. Select own piece if candidate moves exist
    const piece = getPieceAt(game.fen, square);
    const isOwnPiece =
      piece &&
      ((game.turn === 'white' && piece.color === 'w') ||
        (game.turn === 'black' && piece.color === 'b'));

    if (isOwnPiece) {
      const moves = getLegalMoves(game, square);
      if (moves.length > 0) {
        setSelectedSquare(square);
        setLegalMoves(moves);
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  return (
    <View
      style={[styles.container, style]}
      testID="chessboard-container"
      accessibilityLabel="Interactive Chessboard"
    >
      <View
        style={[
          styles.board,
          {
            width: actualBoardSize,
            height: actualBoardSize,
          },
        ]}
        testID="chessboard"
      >
        {ranks.map((rank, rankIdx) => (
          <View key={`rank-${rank}`} style={styles.boardRow}>
            {files.map((file, fileIdx) => {
              const square = `${file}${rank}`;
              const colIdx = file.charCodeAt(0) - 'a'.charCodeAt(0);
              const rowIdx = rank - 1;
              const isLight = (colIdx + rowIdx) % 2 === 1;

              const isSelected = selectedSquare === square;
              const isLegalDest = legalMoves.includes(square);
              const isKingInCheck = inCheckKingSquare === square;
              const piece = getPieceAt(game.fen, square);
              const occupied = Boolean(piece);

              const squareBgColor = isSelected
                ? '#eab308' // Yellow selected highlight
                : isKingInCheck
                  ? 'rgba(239, 68, 68, 0.8)' // Red check highlight
                  : isLight
                    ? '#f0d9b5' // Wood light
                    : '#b58863'; // Wood dark

              const isEdgeFile = fileIdx === 0;
              const isEdgeRank = rankIdx === 7;

              return (
                <TouchableOpacity
                  key={square}
                  activeOpacity={0.8}
                  style={[
                    styles.square,
                    {
                      width: squareSize,
                      height: squareSize,
                      backgroundColor: squareBgColor,
                    },
                  ]}
                  onPress={() => handleSquarePress(square)}
                  testID={`square-${square}`}
                  accessibilityRole="button"
                  accessibilityLabel={
                    piece
                      ? `${piece.color === 'w' ? 'White' : 'Black'} ${piece.name} on ${square}`
                      : `Empty square ${square}`
                  }
                >
                  {/* Rank coordinate */}
                  {isEdgeFile && (
                    <Text
                      style={[styles.coordRankText, { color: isLight ? '#b58863' : '#f0d9b5' }]}
                      testID={`coord-rank-${rank}`}
                    >
                      {rank}
                    </Text>
                  )}

                  {/* File coordinate */}
                  {isEdgeRank && (
                    <Text
                      style={[styles.coordFileText, { color: isLight ? '#b58863' : '#f0d9b5' }]}
                      testID={`coord-file-${file}`}
                    >
                      {file}
                    </Text>
                  )}

                  {/* Destination Dot */}
                  {isLegalDest && !occupied && (
                    <View
                      style={[
                        styles.destinationDot,
                        {
                          width: squareSize * 0.28,
                          height: squareSize * 0.28,
                          borderRadius: (squareSize * 0.28) / 2,
                        },
                      ]}
                      testID={`dest-dot-${square}`}
                    />
                  )}

                  {/* Capture Ring */}
                  {isLegalDest && occupied && (
                    <View
                      style={[
                        styles.captureRing,
                        {
                          width: squareSize * 0.8,
                          height: squareSize * 0.8,
                          borderRadius: (squareSize * 0.8) / 2,
                        },
                      ]}
                      testID={`capture-ring-${square}`}
                    />
                  )}

                  {/* Chess Piece Glyphs */}
                  {piece && (
                    <Text
                      style={[
                        styles.pieceGlyph,
                        { fontSize: Math.floor(squareSize * 0.72) },
                        piece.color === 'w' ? styles.whitePieceText : styles.blackPieceText,
                      ]}
                      testID={`piece-${square}`}
                    >
                      {piece.glyph}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#121212',
  },
  boardRow: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coordRankText: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.8,
  },
  coordFileText: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.8,
  },
  destinationDot: {
    position: 'absolute',
    backgroundColor: 'rgba(34, 197, 94, 0.75)',
    zIndex: 2,
  },
  captureRing: {
    position: 'absolute',
    borderWidth: 3.5,
    borderColor: 'rgba(34, 197, 94, 0.8)',
    zIndex: 2,
  },
  pieceGlyph: {
    zIndex: 3,
    textAlign: 'center',
    includeFontPadding: false,
  },
  whitePieceText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
    fontWeight: '800',
  },
  blackPieceText: {
    color: '#1a1a1a',
    textShadowColor: 'rgba(255, 255, 255, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    fontWeight: '800',
  },
});

export default Chessboard;
