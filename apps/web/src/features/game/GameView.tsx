import { getSanHistory, isGameOver } from '@et-chess/chess-core';
import type { BotDifficulty, PlayerColor } from '@et-chess/types';
import {
  ArrowUpDown,
  Bot,
  CircleDot,
  Crown,
  Flag,
  Handshake,
  Loader2,
  RotateCcw,
  ScrollText,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ChessboardView } from '../board/ChessboardView';
import { useStockfishWorker } from '../bot/useStockfishWorker';
import { playMoveSound } from './soundEffects';

export interface GameViewProps {
  initialMode?: 'bot' | 'local';
}

export interface DifficultyPreset {
  id: BotDifficulty;
  label: string;
  badge: string;
  spec: string;
  description: string;
}

export const DIFFICULTY_PRESETS_UI: DifficultyPreset[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    badge: 'Skill 2',
    spec: 'Depth 5',
    description: 'Casual play with tactical oversights, perfect for beginners.',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    badge: 'Skill 10',
    spec: 'Depth 10',
    description: 'Club-level play with solid tactics and multi-move calculation.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    badge: 'Skill 15',
    spec: '1000ms',
    description: 'Strong competitive play with 1-second search per position.',
  },
  {
    id: 'full-strength',
    label: 'Full Strength',
    badge: 'Skill 20',
    spec: '3000ms',
    description: 'Maximum WASM engine calculation with 3-second evaluation.',
  },
];

export const DEFAULT_DIFFICULTY_PRESET: DifficultyPreset =
  DIFFICULTY_PRESETS_UI[1] as DifficultyPreset;

interface PlayerCardProps {
  color: PlayerColor;
  isTurn: boolean;
  isGameOver: boolean;
  gameMode: 'bot' | 'local';
  isBotThinking?: boolean;
  botDifficulty?: BotDifficulty;
}

function PlayerCard({
  color,
  isTurn,
  isGameOver,
  gameMode,
  isBotThinking = false,
  botDifficulty = 'intermediate',
}: PlayerCardProps) {
  const isWhite = color === 'white';
  const isBot = gameMode === 'bot' && !isWhite;

  const displayName = isWhite
    ? gameMode === 'bot'
      ? 'Player (White)'
      : 'Player 1 (White)'
    : isBot
      ? 'Stockfish (Black)'
      : 'Player 2 (Black)';

  const active = isTurn && !isGameOver;
  const currentPreset =
    DIFFICULTY_PRESETS_UI.find((d) => d.id === botDifficulty) ?? DEFAULT_DIFFICULTY_PRESET;

  return (
    <div
      data-testid={`player-card-${color}`}
      className={`w-full max-w-[560px] rounded-xl px-4 py-3 flex items-center justify-between shadow-sm transition-all border ${
        active
          ? isBot && isBotThinking
            ? 'bg-surface-card border-emerald-500 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
            : 'bg-surface-card border-emerald-500/50 shadow-emerald-950/20'
          : 'bg-surface-card border-surface-border'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border transition-all ${
            isBot && isBotThinking
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/70 animate-pulse shadow-md'
              : isWhite
                ? 'bg-board-light text-surface-base border-board-light/40 shadow-sm'
                : 'bg-surface-base text-gray-200 border-surface-border'
          }`}
        >
          {isBot ? (
            isBotThinking ? (
              <Bot className="w-5 h-5 text-emerald-400 animate-pulse" />
            ) : (
              <Bot className="w-5 h-5 text-board-light" />
            )
          ) : isWhite ? (
            <Crown className="w-5 h-5 text-surface-base" />
          ) : (
            <Users className="w-5 h-5 text-gray-300" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{displayName}</span>
            {isBot && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-board-dark/20 text-board-light border border-board-dark/30">
                WASM
              </span>
            )}
            {isBot && (
              <span className="text-[10px] text-gray-400 font-mono">{currentPreset.spec}</span>
            )}
          </div>
          {isBot && isBotThinking ? (
            <p
              data-testid="bot-thinking-text"
              className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-pulse"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{`Thinking (${currentPreset.spec})...`}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400">{active ? 'Turn to move' : 'Waiting for turn'}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {isBot && isBotThinking ? (
          <span
            data-testid="bot-thinking-indicator"
            className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/50 animate-pulse shadow-sm"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Thinking</span>
          </span>
        ) : (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${
              active
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                : 'bg-surface-accent text-gray-400 border-surface-border'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
              }`}
            />
            <span>{active ? 'Active' : 'Waiting'}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function GameView({ initialMode }: GameViewProps) {
  // Automatically initialize Stockfish Web Worker bridge in browser
  useStockfishWorker();

  const game = useGameStore((state) => state.game);
  const storeGameMode = useGameStore((state) => state.gameMode);
  const gameMode = initialMode ?? storeGameMode;
  const setGameMode = useGameStore((state) => state.setGameMode);
  const resetGame = useGameStore((state) => state.resetGame);
  const requestBotMove = useGameStore((state) => state.requestBotMove);
  const isBotThinking = useGameStore((state) => state.isBotThinking);
  const botDifficulty = useGameStore((state) => state.botDifficulty);
  const setBotDifficulty = useGameStore((state) => state.setBotDifficulty);
  const agreeDraw = useGameStore((state) => state.agreeDraw);

  const [orientation, setOrientation] = useState<PlayerColor>('white');
  const [resignedColor, setResignedColor] = useState<PlayerColor | null>(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showDrawConfirm, setShowDrawConfirm] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const moveListEndRef = useRef<HTMLDivElement>(null);
  const prevMoveCountRef = useRef(0);

  // Sync mode from props if provided
  useEffect(() => {
    if (initialMode && initialMode !== gameMode) {
      setGameMode(initialMode);
    }
  }, [initialMode, gameMode, setGameMode]);

  // Trigger bot move in bot mode when black's turn
  useEffect(() => {
    if (
      gameMode === 'bot' &&
      game.turn === 'black' &&
      !isGameOver(game) &&
      game.status !== 'draw' &&
      !resignedColor &&
      !isBotThinking
    ) {
      void requestBotMove();
    }
  }, [
    gameMode,
    game.turn,
    game.fen,
    game.status,
    resignedColor,
    isBotThinking,
    game,
    requestBotMove,
  ]);

  const sanMoves = useMemo(() => getSanHistory(game), [game]);

  // Audio effect upon moves
  useEffect(() => {
    if (sanMoves.length > prevMoveCountRef.current) {
      if (soundEnabled && prevMoveCountRef.current > 0) {
        const lastMove = sanMoves[sanMoves.length - 1] ?? '';
        const isCapture =
          lastMove.includes('x') || lastMove.includes('+') || lastMove.includes('#');
        playMoveSound(isCapture);
      }
    }
    prevMoveCountRef.current = sanMoves.length;
  }, [sanMoves, soundEnabled]);

  const movePairs = useMemo(() => {
    const pairs: { moveNumber: number; white: string; black?: string }[] = [];
    for (let i = 0; i < sanMoves.length; i += 2) {
      const white = sanMoves[i] ?? '';
      const black = sanMoves[i + 1];
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white,
        black,
      });
    }
    return pairs;
  }, [sanMoves]);

  // Auto-scroll move history
  useEffect(() => {
    if (movePairs.length > 0) {
      moveListEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [movePairs]);

  const gameOver = isGameOver(game) || game.status === 'draw' || resignedColor !== null;

  let outcomeTitle = '';
  let outcomeDescription = '';

  if (resignedColor) {
    const winner = resignedColor === 'white' ? 'Black' : 'White';
    outcomeTitle = `${winner} wins by resignation`;
    outcomeDescription = `${resignedColor === 'white' ? 'White' : 'Black'} resigned the game.`;
  } else if (game.status === 'checkmate') {
    const winner = game.turn === 'white' ? 'Black' : 'White';
    outcomeTitle = `Checkmate! ${winner} wins`;
    outcomeDescription = `${winner} delivered checkmate.`;
  } else if (game.status === 'stalemate') {
    outcomeTitle = 'Draw by Stalemate';
    outcomeDescription = 'King has no legal moves and is not in check.';
  } else if (game.status === 'draw') {
    outcomeTitle = 'Draw';
    outcomeDescription = 'Game ended in a mutual draw.';
  }

  const handleNewGame = () => {
    resetGame();
    setResignedColor(null);
    setShowResignConfirm(false);
    setShowDrawConfirm(false);
  };

  const handleFlipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const handleResignClick = () => {
    if (gameOver) return;
    setShowResignConfirm(true);
  };

  const confirmResign = () => {
    const resigningColor = gameMode === 'bot' ? 'white' : game.turn;
    setResignedColor(resigningColor);
    setShowResignConfirm(false);
  };

  const cancelResign = () => {
    setShowResignConfirm(false);
  };

  const handleDrawClick = () => {
    if (gameOver) return;
    setShowDrawConfirm(true);
  };

  const confirmDraw = () => {
    agreeDraw();
    setShowDrawConfirm(false);
  };

  const cancelDraw = () => {
    setShowDrawConfirm(false);
  };

  // Orientation-dependent player ordering
  const topColor: PlayerColor = orientation === 'white' ? 'black' : 'white';
  const bottomColor: PlayerColor = orientation === 'white' ? 'white' : 'black';

  const selectedPreset =
    DIFFICULTY_PRESETS_UI.find((d) => d.id === botDifficulty) ?? DEFAULT_DIFFICULTY_PRESET;

  return (
    <div
      data-testid="game-view"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full"
    >
      {/* Left Column: Board Area & Player Cards */}
      <div className="lg:col-span-8 flex flex-col items-center justify-center gap-3 w-full">
        {/* Top Player Card */}
        <PlayerCard
          color={topColor}
          isTurn={game.turn === topColor}
          isGameOver={gameOver}
          gameMode={gameMode}
          isBotThinking={topColor === 'black' && isBotThinking}
          botDifficulty={botDifficulty}
        />

        {/* Board Mount Container */}
        <div className="w-full max-w-[560px] aspect-square rounded-2xl border-2 border-surface-border bg-surface-card shadow-2xl relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
          <ChessboardView orientation={orientation} />

          {/* Game Over Dialog Overlay */}
          {gameOver && (
            <div
              data-testid="game-over-dialog"
              className="absolute inset-0 bg-surface-base/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{outcomeTitle}</h2>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xs mb-5">{outcomeDescription}</p>
              <button
                type="button"
                data-testid="play-again-btn"
                onClick={handleNewGame}
                className="py-2.5 px-6 rounded-xl bg-board-dark hover:bg-board-dark/80 text-white font-semibold text-sm transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </div>
          )}

          {/* Resignation Confirmation Overlay */}
          {showResignConfirm && !gameOver && (
            <div
              data-testid="resign-dialog"
              className="absolute inset-0 bg-surface-base/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-40"
            >
              <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400 mb-3">
                <Flag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Resign Match?</h3>
              <p className="text-xs text-gray-300 max-w-xs mb-4">
                {gameMode === 'bot'
                  ? 'Concede victory to Stockfish. Are you sure you want to resign?'
                  : `Are you sure ${game.turn === 'white' ? 'White' : 'Black'} wants to resign? Victory will be awarded to your opponent.`}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="confirm-resign-btn"
                  onClick={confirmResign}
                  className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Yes, Resign
                </button>
                <button
                  type="button"
                  data-testid="cancel-resign-btn"
                  onClick={cancelResign}
                  className="py-2 px-4 rounded-lg bg-surface-accent hover:bg-surface-border text-gray-300 text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Draw Confirmation Overlay */}
          {showDrawConfirm && !gameOver && (
            <div
              data-testid="draw-dialog"
              className="absolute inset-0 bg-surface-base/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-40"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400 mb-3">
                <Handshake className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                {gameMode === 'bot' ? 'Offer Draw to Stockfish?' : 'Mutual Draw Agreement'}
              </h3>
              <p className="text-xs text-gray-300 max-w-xs mb-4">
                {gameMode === 'bot'
                  ? 'Conclude this match with Stockfish peacefully as a draw.'
                  : 'Does your opponent agree to end the match with a mutual draw?'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="confirm-draw-btn"
                  onClick={confirmDraw}
                  className="py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Accept Draw
                </button>
                <button
                  type="button"
                  data-testid="cancel-draw-btn"
                  onClick={cancelDraw}
                  className="py-2 px-4 rounded-lg bg-surface-accent hover:bg-surface-border text-gray-300 text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Player Card */}
        <PlayerCard
          color={bottomColor}
          isTurn={game.turn === bottomColor}
          isGameOver={gameOver}
          gameMode={gameMode}
          isBotThinking={bottomColor === 'black' && isBotThinking}
          botDifficulty={botDifficulty}
        />
      </div>

      {/* Right Column: Game Info, Difficulty Selector, Move History, Controls */}
      <div className="lg:col-span-4 flex flex-col gap-4 w-full">
        {/* Status Card */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  gameOver
                    ? 'bg-red-400'
                    : game.status === 'check'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                Match Status
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="sound-toggle-btn"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-surface-accent transition"
                title={soundEnabled ? 'Mute move sounds' : 'Enable move sounds'}
                aria-label={soundEnabled ? 'Mute move sounds' : 'Enable move sounds'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-gray-500" />
                )}
              </button>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  gameOver
                    ? 'bg-red-950/40 text-red-300 border-red-800/40'
                    : game.status === 'check'
                      ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                      : 'bg-surface-accent text-gray-200 border-surface-border'
                }`}
              >
                {gameOver ? 'Game Over' : game.status === 'check' ? 'Check!' : 'Ongoing'}
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Current Turn</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                <CircleDot
                  className={`w-3.5 h-3.5 ${
                    game.turn === 'white' ? 'text-amber-200' : 'text-gray-400'
                  }`}
                />
                {gameOver ? 'Completed' : game.turn === 'white' ? 'White to move' : 'Black to move'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Game Mode</span>
              <span className="text-gray-300 font-medium">
                {gameMode === 'local' ? 'Pass & Play (2 Player)' : 'vs Stockfish Bot'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Orientation</span>
              <span className="text-gray-300 capitalize">{orientation} view</span>
            </div>
          </div>
        </div>

        {/* Bot Difficulty Selector Card (Visible in Bot Mode) */}
        {gameMode === 'bot' && (
          <div
            data-testid="difficulty-selector"
            className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-board-light" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">
                  Bot Difficulty
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-medium">
                {selectedPreset.spec}
              </span>
            </div>

            {/* Clean Tabs / Pill Selector */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-surface-base rounded-lg border border-surface-border">
              {DIFFICULTY_PRESETS_UI.map((preset) => {
                const isSelected = botDifficulty === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`difficulty-option-${preset.id}`}
                    onClick={() => setBotDifficulty(preset.id)}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-board-dark text-white shadow-sm border border-board-light/40 font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-surface-accent'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className="text-[10px] opacity-75">{preset.spec}</span>
                  </button>
                );
              })}
            </div>

            {/* Description of active level */}
            <p className="text-[11px] text-gray-400 mt-2 px-1">{selectedPreset.description}</p>
          </div>
        )}

        {/* Move History Table */}
        <div
          data-testid="move-history"
          className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col h-72 shadow-sm"
        >
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-board-light" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                Move History
              </span>
            </div>
            <span className="text-xs font-mono text-gray-400">
              {`${sanMoves.length} ${sanMoves.length === 1 ? 'move' : 'moves'}`}
            </span>
          </div>

          <div className="mt-3 flex-1 flex flex-col rounded-lg border border-surface-border bg-surface-base overflow-hidden">
            <div className="grid grid-cols-3 bg-surface-accent px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-surface-border">
              <span className="w-12">#</span>
              <span>White</span>
              <span>Black</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-surface-border/40">
              {movePairs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs text-gray-400">No moves played yet.</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Moves will appear here in chronological notation.
                  </p>
                </div>
              ) : (
                movePairs.map((pair) => (
                  <div
                    key={`move-pair-${pair.moveNumber}`}
                    className="grid grid-cols-3 px-3 py-1.5 text-xs font-mono hover:bg-surface-accent/40 transition-colors"
                  >
                    <span className="text-gray-400 w-12">{pair.moveNumber}.</span>
                    <span className="text-white font-medium">{pair.white}</span>
                    <span className="text-gray-300">{pair.black ?? '—'}</span>
                  </div>
                ))
              )}
              <div ref={moveListEndRef} />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-2.5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Action Controls
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="new-game-btn"
              onClick={handleNewGame}
              className="py-2.5 px-3 rounded-lg bg-surface-accent hover:bg-surface-border active:scale-[0.99] text-white text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border border-surface-border cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-gray-300" />
              <span>New Game</span>
            </button>

            <button
              type="button"
              data-testid="flip-board-btn"
              onClick={handleFlipBoard}
              className="py-2.5 px-3 rounded-lg bg-surface-accent hover:bg-surface-border active:scale-[0.99] text-white text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border border-surface-border cursor-pointer"
            >
              <ArrowUpDown className="w-4 h-4 text-gray-300" />
              <span>Flip Board</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="draw-btn"
              disabled={gameOver}
              onClick={handleDrawClick}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border cursor-pointer ${
                gameOver
                  ? 'opacity-40 cursor-not-allowed bg-surface-accent border-surface-border text-gray-500'
                  : 'bg-amber-950/20 hover:bg-amber-950/50 active:scale-[0.99] text-amber-300 hover:text-amber-200 border-amber-900/40'
              }`}
            >
              <Handshake className="w-4 h-4 text-amber-400" />
              <span>Offer Draw</span>
            </button>

            <button
              type="button"
              data-testid="resign-btn"
              disabled={gameOver}
              onClick={handleResignClick}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border cursor-pointer ${
                gameOver
                  ? 'opacity-40 cursor-not-allowed bg-surface-accent border-surface-border text-gray-500'
                  : 'bg-red-950/20 hover:bg-red-950/50 active:scale-[0.99] text-red-300 hover:text-red-200 border-red-900/40'
              }`}
            >
              <Flag className="w-4 h-4 text-red-400" />
              <span>Resign</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameView;
