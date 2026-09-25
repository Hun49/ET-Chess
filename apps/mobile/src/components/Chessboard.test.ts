import { createGame } from '@et-chess/chess-core';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store/gameStore';
import {
  Chessboard,
  findKingSquare,
  getPieceAt,
  isPawnMoveToBackRank,
  isSquareOccupied,
} from './Chessboard';

describe('Chessboard Component and Board Utilities', () => {
  beforeEach(() => {
    useGameStore.setState({
      game: createGame(),
      botDifficulty: 'intermediate',
      isBotThinking: false,
      gameMode: 'local',
      resignedColor: null,
    });
  });

  describe('isSquareOccupied', () => {
    it('accurately identifies occupied starting squares', () => {
      const fen = useGameStore.getState().game.fen;
      // Starting pieces
      expect(isSquareOccupied(fen, 'e1')).toBe(true);
      expect(isSquareOccupied(fen, 'e8')).toBe(true);
      expect(isSquareOccupied(fen, 'a2')).toBe(true);
      expect(isSquareOccupied(fen, 'h7')).toBe(true);

      // Empty squares in starting position
      expect(isSquareOccupied(fen, 'e4')).toBe(false);
      expect(isSquareOccupied(fen, 'd5')).toBe(false);
      expect(isSquareOccupied(fen, 'c3')).toBe(false);
    });

    it('returns false for invalid square notations', () => {
      const fen = useGameStore.getState().game.fen;
      expect(isSquareOccupied(fen, '')).toBe(false);
      expect(isSquareOccupied(fen, 'x9')).toBe(false);
      expect(isSquareOccupied(fen, 'a9')).toBe(false);
    });
  });

  describe('getPieceAt', () => {
    it('returns piece information for starting position squares', () => {
      const fen = useGameStore.getState().game.fen;

      const whiteKing = getPieceAt(fen, 'e1');
      expect(whiteKing).toEqual({
        type: 'k',
        color: 'w',
        glyph: '♔',
        name: 'king',
      });

      const blackQueen = getPieceAt(fen, 'd8');
      expect(blackQueen).toEqual({
        type: 'q',
        color: 'b',
        glyph: '♛',
        name: 'queen',
      });

      const whitePawn = getPieceAt(fen, 'e2');
      expect(whitePawn).toEqual({
        type: 'p',
        color: 'w',
        glyph: '♙',
        name: 'pawn',
      });

      const empty = getPieceAt(fen, 'e4');
      expect(empty).toBeNull();
    });
  });

  describe('isPawnMoveToBackRank', () => {
    it('identifies pawn promotion moves to 8th rank for white and 1st rank for black', () => {
      // White pawn at e7 moving to e8
      const whitePromoFen = '4k3/4P3/8/8/8/8/8/4K3 w - - 0 1';
      expect(isPawnMoveToBackRank(whitePromoFen, 'e7', 'e8')).toBe(true);
      expect(isPawnMoveToBackRank(whitePromoFen, 'e7', 'e6')).toBe(false);

      // Black pawn at d2 moving to d1
      const blackPromoFen = '4k3/8/8/8/8/8/3p4/4K3 b - - 0 1';
      expect(isPawnMoveToBackRank(blackPromoFen, 'd2', 'd1')).toBe(true);

      // White Rook moving to back rank is not pawn promotion
      const rookFen = '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1';
      expect(isPawnMoveToBackRank(rookFen, 'e2', 'e8')).toBe(false);
    });
  });

  describe('findKingSquare', () => {
    it('finds king positions for both colors', () => {
      const fen = useGameStore.getState().game.fen;
      expect(findKingSquare(fen, 'white')).toBe('e1');
      expect(findKingSquare(fen, 'black')).toBe('e8');
    });

    it('finds kings in dynamic positions', () => {
      const customFen = '8/8/4k3/8/8/2K5/8/8 w - - 0 1';
      expect(findKingSquare(customFen, 'white')).toBe('c3');
      expect(findKingSquare(customFen, 'black')).toBe('e6');
    });
  });

  describe('Chessboard rendering', () => {
    it('renders responsive board container and all 64 squares', () => {
      const html = renderToString(React.createElement(Chessboard));

      expect(html).toContain('data-testid="chessboard-container"');
      expect(html).toContain('data-testid="chessboard"');

      // Check all 64 squares are rendered
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

      for (const f of files) {
        for (const r of ranks) {
          expect(html).toContain(`data-testid="square-${f}${r}"`);
        }
      }
    });

    it('renders classic piece glyphs in initial position', () => {
      const html = renderToString(React.createElement(Chessboard));

      expect(html).toContain('data-testid="piece-e1"'); // White King ♔
      expect(html).toContain('♔');
      expect(html).toContain('data-testid="piece-e8"'); // Black King ♚
      expect(html).toContain('♚');
      expect(html).toContain('data-testid="piece-d1"'); // White Queen ♕
      expect(html).toContain('♕');
      expect(html).toContain('data-testid="piece-d8"'); // Black Queen ♛
      expect(html).toContain('♛');
    });

    it('renders board coordinate labels on border edges', () => {
      const html = renderToString(React.createElement(Chessboard, { orientation: 'white' }));

      // White perspective: file labels on rank 1 (a..h)
      for (const f of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
        expect(html).toContain(`data-testid="coord-file-${f}"`);
      }

      // Rank labels on file a (1..8)
      for (const r of ['1', '2', '3', '4', '5', '6', '7', '8']) {
        expect(html).toContain(`data-testid="coord-rank-${r}"`);
      }
    });

    it('supports flipped orientation (black at bottom)', () => {
      const html = renderToString(React.createElement(Chessboard, { orientation: 'black' }));

      expect(html).toContain('data-testid="chessboard"');
      // When orientation is black, rank 1 is top, rank 8 is bottom
      expect(html).toContain('data-testid="coord-file-h"');
      expect(html).toContain('data-testid="coord-rank-8"');
    });

    it('highlights king square in red when in check', () => {
      // Position where white king is in check from black queen
      // e.g. white king at e1, black queen at e8, empty file
      const checkGame = {
        fen: '4q3/8/8/8/8/8/8/4K3 w - - 0 1',
        turn: 'white' as const,
        status: 'check' as const,
        moveHistory: [],
      };

      const html = renderToString(React.createElement(Chessboard, { game: checkGame }));
      expect(html).toContain('data-testid="square-e1"');
      expect(html).toMatch(/rgba\(239,\s*68,\s*68,\s*0\.8\)/);
    });
  });
});
