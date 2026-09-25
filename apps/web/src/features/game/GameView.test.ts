import { createGame } from '@et-chess/chess-core';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { findKingSquare, isPawnMoveToBackRank, isSquareOccupied } from '../board/ChessboardView';
import { GameView } from './GameView';

describe('GameView and Chessboard integration', () => {
  beforeEach(() => {
    useGameStore.setState({
      game: createGame(),
      botDifficulty: 'intermediate',
      isBotThinking: false,
      gameMode: 'local',
    });
  });

  describe('GameView rendering in local pass-and-play mode', () => {
    it('renders initial state with players, move history, and action controls', () => {
      const html = renderToString(React.createElement(GameView, { initialMode: 'local' }));

      // Player cards
      expect(html).toContain('Player 1 (White)');
      expect(html).toContain('Player 2 (Black)');
      expect(html).toContain('Active');
      expect(html).toContain('Waiting');

      // Match controls
      expect(html).toContain('New Game');
      expect(html).toContain('Flip Board');
      expect(html).toContain('Resign');

      // Move history table empty state
      expect(html).toContain('No moves played yet');
      expect(html).toContain('0 moves');

      // Chessboard container
      expect(html).toContain('data-testid="chessboard-container"');
    });

    it('renders bot mode labels when gameMode is bot', () => {
      useGameStore.setState({ gameMode: 'bot' });
      const html = renderToString(React.createElement(GameView, { initialMode: 'bot' }));

      expect(html).toContain('Player (White)');
      expect(html).toContain('Stockfish (Black)');
      expect(html).toContain('vs Stockfish Bot');
    });
  });

  describe('move dispatch and status updates', () => {
    it('reflects turn change and move history upon move dispatch', () => {
      const store = useGameStore.getState();
      const move1Success = store.makeMove({ from: 'e2', to: 'e4' });
      expect(move1Success).toBe(true);

      const htmlAfterMove1 = renderToString(React.createElement(GameView));
      // Move 1 should appear in move history
      expect(htmlAfterMove1).toContain('e4');
      expect(htmlAfterMove1).toContain('1 move');
      expect(htmlAfterMove1).toContain('Black to move');

      // Second move (Black plays e5)
      const move2Success = useGameStore.getState().makeMove({ from: 'e7', to: 'e5' });
      expect(move2Success).toBe(true);

      const htmlAfterMove2 = renderToString(React.createElement(GameView));
      expect(htmlAfterMove2).toContain('e4');
      expect(htmlAfterMove2).toContain('e5');
      expect(htmlAfterMove2).toContain('2 moves');
      expect(htmlAfterMove2).toContain('White to move');
    });

    it('displays game over banner and play again button on checkmate', async () => {
      const store = useGameStore.getState();
      // Scholar's Mate sequence
      // 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
      store.makeMove({ from: 'e2', to: 'e4' });
      store.makeMove({ from: 'e7', to: 'e5' });
      store.makeMove({ from: 'f1', to: 'c4' });
      store.makeMove({ from: 'b8', to: 'c6' });
      store.makeMove({ from: 'd1', to: 'h5' });
      store.makeMove({ from: 'g8', to: 'f6' });
      const mateMove = store.makeMove({ from: 'h5', to: 'f7' });
      expect(mateMove).toBe(true);

      const updated = useGameStore.getState();
      expect(updated.game.status).toBe('checkmate');

      const html = renderToString(React.createElement(GameView));
      expect(html).toContain('Checkmate! White wins');
      expect(html).toContain('data-testid="game-over-dialog"');
      expect(html).toContain('Play Again');
      expect(html).toContain('Game Over');
    });

    it('displays game over banner on stalemate', () => {
      // Stalemate position: White king and queen trapping lone Black king with no legal moves
      useGameStore.setState({
        game: {
          fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
          turn: 'black',
          status: 'stalemate',
          moveHistory: [],
        },
      });

      const html = renderToString(React.createElement(GameView));
      expect(html).toContain('Draw by Stalemate');
      expect(html).toContain('Play Again');
    });

    it('indicates check state when king is threatened', () => {
      // Position where Black king on e8 is checked by Queen on e7
      useGameStore.setState({
        game: {
          fen: 'rnbqkbnr/pppp1Qpp/8/4p3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3',
          turn: 'black',
          status: 'check',
          moveHistory: [],
        },
      });

      const html = renderToString(React.createElement(GameView));
      expect(html).toContain('Check!');
    });

    it('resets game state and history when new game / reset is invoked', () => {
      const store = useGameStore.getState();
      store.makeMove({ from: 'e2', to: 'e4' });
      expect(useGameStore.getState().game.moveHistory).toHaveLength(1);

      useGameStore.getState().resetGame();
      const resetState = useGameStore.getState();
      expect(resetState.game.moveHistory).toHaveLength(0);
      expect(resetState.game.turn).toBe('white');

      const html = renderToString(React.createElement(GameView));
      expect(html).toContain('No moves played yet');
      expect(html).toContain('0 moves');
      expect(html).toContain('White to move');
    });
  });

  describe('ChessboardView helper functions', () => {
    it('isSquareOccupied identifies populated vs empty squares', () => {
      const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      expect(isSquareOccupied(startFen, 'e2')).toBe(true);
      expect(isSquareOccupied(startFen, 'e4')).toBe(false);
      expect(isSquareOccupied(startFen, 'a8')).toBe(true);
      expect(isSquareOccupied(startFen, 'd5')).toBe(false);
    });

    it('isPawnMoveToBackRank detects pawn promotion scenarios', () => {
      const promotionFen = '8/4P3/8/8/8/8/4p3/k6K w - - 0 1';
      // White pawn promoting to rank 8
      expect(isPawnMoveToBackRank(promotionFen, 'e7', 'e8')).toBe(true);
      // Non-pawn move to rank 8
      const rookFen = '8/4R3/8/8/8/8/8/k6K w - - 0 1';
      expect(isPawnMoveToBackRank(rookFen, 'e7', 'e8')).toBe(false);
      // Pawn move not reaching back rank
      const normalFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      expect(isPawnMoveToBackRank(normalFen, 'e2', 'e4')).toBe(false);
      // Black pawn promoting to rank 1
      expect(isPawnMoveToBackRank(promotionFen, 'e2', 'e1')).toBe(true);
    });

    it('findKingSquare locates white and black kings', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      expect(findKingSquare(fen, 'white')).toBe('e1');
      expect(findKingSquare(fen, 'black')).toBe('e8');
    });
  });
});
