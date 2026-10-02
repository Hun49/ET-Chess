import { formatClockTime } from '@et-chess/config';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ClockDisplay } from './ClockDisplay';
import { GameActionBar } from './GameActionBar';
import { GameResultModal } from './GameResultModal';
import { GameSessionView } from './GameSessionView';
import { MoveHistoryList } from './MoveHistoryList';
import { PlayerCard } from './PlayerCard';

describe('Shared Web In-Game Session Components', () => {
  describe('ClockDisplay', () => {
    it('formats time correctly', () => {
      expect(formatClockTime(600000)).toBe('10:00');
      expect(formatClockTime(182000)).toBe('3:02');
      expect(formatClockTime(9500)).toBe('0:09.5');
      expect(formatClockTime(0)).toBe('0:00');
    });

    it('renders active and inactive clock state', () => {
      const activeHtml = renderToString(
        React.createElement(ClockDisplay, {
          timeMs: 300000,
          isActive: true,
          color: 'white',
        }),
      );
      expect(activeHtml).toContain('clock-display-white');
      expect(activeHtml).toContain('5:00');

      const lowTimeHtml = renderToString(
        React.createElement(ClockDisplay, {
          timeMs: 8000,
          isActive: true,
          color: 'black',
        }),
      );
      expect(lowTimeHtml).toContain('0:08.0');
      expect(lowTimeHtml).toContain('clock-display-black');
    });
  });

  describe('PlayerCard', () => {
    it('renders opponent info and clock', () => {
      const html = renderToString(
        React.createElement(PlayerCard, {
          color: 'black',
          displayName: 'Abebe Bikila',
          rating: 1540,
          title: 'CM',
          isTurn: true,
          timeMs: 240000,
        }),
      );
      expect(html).toContain('Abebe Bikila');
      expect(html).toContain('1540');
      expect(html).toContain('CM');
      expect(html).toContain('4:00');
    });
  });

  describe('MoveHistoryList', () => {
    it('renders move pairs in algebraic notation', () => {
      const html = renderToString(
        React.createElement(MoveHistoryList, {
          sanMoves: ['e4', 'e5', 'Nf3', 'Nc6'],
        }),
      );
      expect(html).toContain('1.');
      expect(html).toContain('e4');
      expect(html).toContain('e5');
      expect(html).toContain('Nf3');
      expect(html).toContain('Nc6');
    });
  });

  describe('GameActionBar', () => {
    it('renders game controls', () => {
      const html = renderToString(
        React.createElement(GameActionBar, {
          allowedActions: { resign: true, drawOffer: true, takeback: true, timeGift: false },
          isGameOver: false,
          soundEnabled: true,
          onFlipBoard: () => {},
          onToggleSound: () => {},
          onResign: () => {},
          onDrawOffer: () => {},
          onTakeback: () => {},
        }),
      );
      expect(html).toContain('Flip Board');
      expect(html).toContain('Resign');
      expect(html).toContain('Draw');
      expect(html).toContain('Takeback');
    });
  });

  describe('GameResultModal', () => {
    it('renders win, loss, and draw with reasons', () => {
      const winHtml = renderToString(
        React.createElement(GameResultModal, {
          isOpen: true,
          result: {
            outcome: 'white',
            reason: 'Checkmate (White won)',
            ratingChange: 16,
          },
          playerColor: 'white',
          onRematch: () => {},
          onReview: () => {},
        }),
      );
      expect(winHtml).toContain('Victory!');
      expect(winHtml).toContain('Checkmate (White won)');
      expect(winHtml).toContain('+16');

      const drawHtml = renderToString(
        React.createElement(GameResultModal, {
          isOpen: true,
          result: {
            outcome: 'draw',
            reason: 'Draw by Stalemate',
          },
          playerColor: 'white',
          onRematch: () => {},
          onReview: () => {},
        }),
      );
      expect(drawHtml).toContain('Game Drawn');
      expect(drawHtml).toContain('Draw by Stalemate');
    });
  });

  describe('GameSessionView Integration', () => {
    it('renders full in-game screen', () => {
      const html = renderToString(
        React.createElement(GameSessionView, {
          mode: 'online',
          minutes: 5,
          opponentName: 'Desta Wolde',
          opponentRating: 1485,
        }),
      );
      expect(html).toContain('game-session-view');
      expect(html).toContain('Desta Wolde');
      expect(html).toContain('Move History');
    });
  });
});
