import type { BotDifficulty, Move } from '@et-chess/types';
import type { EngineBridge } from './bridge';
import { parseBestMove, UCI } from './uci';

export type { EngineBridge } from './bridge';
export { NativeWorkerBridge } from './native-worker';
export { parseBestMove, UCI } from './uci';
export { WebWorkerBridge } from './web-worker';

export interface DifficultySettings {
  skillLevel: number;
  depth?: number;
  movetime?: number;
}

export const DIFFICULTY_PRESETS: Record<BotDifficulty, DifficultySettings> = {
  beginner: { skillLevel: 2, depth: 5 },
  intermediate: { skillLevel: 10, depth: 10 },
  advanced: { skillLevel: 15, movetime: 1000 },
  'full-strength': { skillLevel: 20, movetime: 3000 },
};

export interface BotHandle {
  getBestMove(fen: string): Promise<Move>;
  stop(): void;
  dispose(): void;
}

/**
 * Creates a controllable Bot instance adhering to UCI text protocol.
 * An optional EngineBridge can be passed for test mocking or custom runtime injection.
 */
export function createBot(difficulty: BotDifficulty, bridge?: EngineBridge): BotHandle {
  if (!bridge) {
    throw new Error('An EngineBridge must be provided to createBot in this runtime environment.');
  }

  const settings = DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS.beginner;
  let isReady = false;
  let currentResolve: ((move: Move) => void) | null = null;
  let currentReject: ((err: Error) => void) | null = null;

  const handleMessage = (line: string) => {
    const trimmed = line.trim();

    if (trimmed === 'uciok') {
      bridge.postMessage(UCI.setOption('Skill Level', settings.skillLevel));
      bridge.postMessage(UCI.isReady());
      return;
    }

    if (trimmed === 'readyok') {
      isReady = true;
      return;
    }

    if (trimmed.startsWith('bestmove')) {
      const move = parseBestMove(trimmed);
      if (currentResolve) {
        if (move) {
          currentResolve(move);
        } else if (currentReject) {
          currentReject(new Error(`Failed to parse bestmove from: "${trimmed}"`));
        }
        currentResolve = null;
        currentReject = null;
      }
    }
  };

  bridge.onMessage(handleMessage);

  // Send initial UCI handshake
  bridge.postMessage(UCI.init());

  return {
    async getBestMove(fen: string): Promise<Move> {
      return new Promise<Move>((resolve, reject) => {
        currentResolve = resolve;
        currentReject = reject;

        const executeSearch = () => {
          bridge.postMessage(UCI.position(fen));
          bridge.postMessage(
            UCI.go({
              depth: settings.depth,
              movetime: settings.movetime,
            }),
          );
        };

        if (isReady) {
          executeSearch();
        } else {
          // If not ready yet, wait for readyok
          const readyListener = (msg: string) => {
            if (msg.trim() === 'readyok') {
              bridge.removeMessageListener(readyListener);
              executeSearch();
            }
          };
          bridge.onMessage(readyListener);
        }
      });
    },

    stop(): void {
      bridge.postMessage(UCI.stop());
      if (currentReject) {
        currentReject(new Error('Bot search stopped.'));
        currentResolve = null;
        currentReject = null;
      }
    },

    dispose(): void {
      this.stop();
      bridge.postMessage(UCI.quit());
      bridge.removeMessageListener(handleMessage);
      bridge.terminate();
    },
  };
}
