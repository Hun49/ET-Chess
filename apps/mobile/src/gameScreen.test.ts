import { createGame } from '@et-chess/chess-core';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import GameScreen from '../app/game';
import SettingsScreen from '../app/settings';
import { useGameStore } from './store/gameStore';

describe('GameScreen and SettingsScreen Integration', () => {
  beforeEach(() => {
    useGameStore.setState({
      game: createGame(),
      botDifficulty: 'intermediate',
      isBotThinking: false,
      gameMode: 'bot',
      resignedColor: null,
    });
  });

  describe('GameScreen initial layout', () => {
    it('renders top player card for bot mode with Stockfish', () => {
      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('data-testid="top-player-card"');
      expect(html).toContain('Stockfish Engine');
      expect(html).toContain('vs Stockfish');
      expect(html).toContain('intermediate');
    });

    it('renders local pass and play cards when gameMode is local', () => {
      useGameStore.setState({ gameMode: 'local' });
      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('Player 2 (Black)');
      expect(html).toContain('Player 1 (White)');
      expect(html).toContain('Pass and Play');
    });

    it('renders bottom player card for white player', () => {
      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('data-testid="bottom-player-card"');
      expect(html).toContain('You (White)');
      expect(html).toContain('White to move');
    });

    it('renders empty move history strip initially', () => {
      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('data-testid="move-history-strip"');
      expect(html).toContain('No moves played yet');
    });

    it('renders all game control action buttons', () => {
      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('data-testid="new-game-button"');
      expect(html).toContain('data-testid="flip-board-button"');
      expect(html).toContain('data-testid="draw-button"');
      expect(html).toContain('data-testid="resign-button"');
    });

    it('renders interactive chessboard inside game screen', () => {
      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('data-testid="chessboard-container"');
      expect(html).toContain('data-testid="chessboard"');
      expect(html).toContain('data-testid="square-e2"');
    });
  });

  describe('GameScreen dynamic state', () => {
    it('renders SAN move history when moves are played', () => {
      useGameStore.getState().makeMove({ from: 'e2', to: 'e4' });
      useGameStore.getState().makeMove({ from: 'e7', to: 'e5' });

      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('e4');
      expect(html).toContain('e5');
      expect(html).toContain('1');
    });

    it('displays bot thinking indicator when isBotThinking is true', () => {
      useGameStore.setState({ isBotThinking: true });

      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('Thinking...');
    });

    it('renders game over modal banner when game is resigned', () => {
      useGameStore.getState().resign('white');

      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('data-testid="game-over-modal"');
      expect(html).toContain('data-testid="game-over-banner"');
      expect(html).toContain('Black Wins!');
      expect(html).toContain('White resigned the match.');
    });

    it('renders game over modal banner on draw agreement', () => {
      useGameStore.getState().agreeDraw();

      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('data-testid="game-over-modal"');
      expect(html).toContain('Draw');
    });

    it('renders game over modal banner on checkmate', () => {
      // Fool's mate: 1. f3 e5 2. g4 Qh4#
      useGameStore.getState().makeMove({ from: 'f2', to: 'f3' });
      useGameStore.getState().makeMove({ from: 'e7', to: 'e5' });
      useGameStore.getState().makeMove({ from: 'g2', to: 'g4' });
      useGameStore.getState().makeMove({ from: 'd8', to: 'h4' });

      const html = renderToString(React.createElement(GameScreen));

      expect(html).toContain('data-testid="game-over-modal"');
      expect(html).toContain('Checkmate!');
      expect(html).toContain('Black wins by checkmate.');
    });
  });

  describe('SettingsScreen wiring with useGameStore', () => {
    it('reflects initial difficulty from store', () => {
      useGameStore.setState({ botDifficulty: 'intermediate' });
      const html = renderToString(React.createElement(SettingsScreen));

      expect(html).toContain('Intermediate');
    });

    it('updates difficulty in useGameStore', () => {
      useGameStore.getState().setBotDifficulty('advanced');
      expect(useGameStore.getState().botDifficulty).toBe('advanced');

      useGameStore.getState().setBotDifficulty('full-strength');
      expect(useGameStore.getState().botDifficulty).toBe('full-strength');
    });
  });
});
