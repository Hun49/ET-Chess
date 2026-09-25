import { describe, expect, it } from 'vitest';
import type { EngineBridge } from './bridge';
import { createBot, DIFFICULTY_PRESETS } from './index';
import { parseBestMove, UCI } from './uci';

class MockEngineBridge implements EngineBridge {
  public sentCommands: string[] = [];
  public listeners: Set<(msg: string) => void> = new Set();
  public terminated = false;

  postMessage(command: string): void {
    this.sentCommands.push(command);
  }

  onMessage(listener: (message: string) => void): void {
    this.listeners.add(listener);
  }

  removeMessageListener(listener: (message: string) => void): void {
    this.listeners.delete(listener);
  }

  terminate(): void {
    this.terminated = true;
    this.listeners.clear();
  }

  // Helper for simulating engine responses
  emit(message: string): void {
    for (const listener of Array.from(this.listeners)) {
      listener(message);
    }
  }
}

describe('packages/bot-engine/uci', () => {
  it('builds UCI commands accurately', () => {
    expect(UCI.init()).toBe('uci');
    expect(UCI.isReady()).toBe('isready');
    expect(UCI.setOption('Skill Level', 5)).toBe('setoption name Skill Level value 5');
    expect(UCI.position('startpos')).toBe('position fen startpos');
    expect(UCI.go({ depth: 8 })).toBe('go depth 8');
    expect(UCI.go({ movetime: 1500 })).toBe('go movetime 1500');
    expect(UCI.stop()).toBe('stop');
    expect(UCI.quit()).toBe('quit');
  });

  it('parses bestmove outputs correctly, including promotion moves', () => {
    expect(parseBestMove('info depth 10 score cp 50')).toBeNull();
    expect(parseBestMove('bestmove (none)')).toBeNull();

    // Standard pawn push
    const move1 = parseBestMove('bestmove e2e4');
    expect(move1).toEqual({ from: 'e2', to: 'e4' });

    // With ponder token
    const move2 = parseBestMove('bestmove g1f3 ponder d7d5');
    expect(move2).toEqual({ from: 'g1', to: 'f3' });

    // Promotion to queen
    const promoQ = parseBestMove('bestmove e7e8q');
    expect(promoQ).toEqual({ from: 'e7', to: 'e8', promotion: 'q' });

    // Promotion to knight
    const promoN = parseBestMove('bestmove a2a1n');
    expect(promoN).toEqual({ from: 'a2', to: 'a1', promotion: 'n' });
  });
});

describe('packages/bot-engine/createBot', () => {
  it('initializes UCI protocol upon creation and sets correct Skill Level and search limits for beginner', async () => {
    const bridge = new MockEngineBridge();
    const bot = createBot('beginner', bridge);

    // Initial command must be uci
    expect(bridge.sentCommands).toContain('uci');

    // Simulate engine acknowledging uci
    bridge.emit('uciok');

    expect(bridge.sentCommands).toContain(
      `setoption name Skill Level value ${DIFFICULTY_PRESETS.beginner.skillLevel}`,
    );
    expect(bridge.sentCommands).toContain('isready');

    // Simulate readyok
    bridge.emit('readyok');

    // Request a move
    const movePromise = bot.getBestMove(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    );

    expect(bridge.sentCommands).toContain(
      'position fen rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    );
    expect(bridge.sentCommands).toContain('go depth 5');

    // Engine responds with bestmove
    bridge.emit('bestmove e7e5');

    const result = await movePromise;
    expect(result).toEqual({ from: 'e7', to: 'e5' });
  });

  it('applies correct movetime search limit for advanced and full-strength tiers', async () => {
    const bridgeAdvanced = new MockEngineBridge();
    const botAdvanced = createBot('advanced', bridgeAdvanced);
    bridgeAdvanced.emit('uciok');
    bridgeAdvanced.emit('readyok');

    const movePromiseAdv = botAdvanced.getBestMove('fen-pos');
    expect(bridgeAdvanced.sentCommands).toContain('go movetime 1000');
    bridgeAdvanced.emit('bestmove e2e4');
    await movePromiseAdv;

    const bridgeFull = new MockEngineBridge();
    const botFull = createBot('full-strength', bridgeFull);
    bridgeFull.emit('uciok');
    bridgeFull.emit('readyok');

    const movePromiseFull = botFull.getBestMove('fen-pos-2');
    expect(bridgeFull.sentCommands).toContain('go movetime 3000');
    bridgeFull.emit('bestmove c7c5');
    await movePromiseFull;
  });

  it('handles in-flight stop() and dispose() without throwing', async () => {
    const bridge = new MockEngineBridge();
    const bot = createBot('intermediate', bridge);
    bridge.emit('uciok');
    bridge.emit('readyok');

    const movePromise = bot.getBestMove('startpos');

    bot.stop();
    expect(bridge.sentCommands).toContain('stop');
    await expect(movePromise).rejects.toThrow('Bot search stopped.');

    bot.dispose();
    expect(bridge.sentCommands).toContain('quit');
    expect(bridge.terminated).toBe(true);
  });
});
