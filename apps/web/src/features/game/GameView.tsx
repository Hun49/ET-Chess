import { getSanHistory, isGameOver } from '@et-chess/chess-core';
import type { PlayerColor } from '@et-chess/types';
import {
  ArrowUpDown,
  Bot,
  CircleDot,
  Crown,
  Flag,
  RotateCcw,
  ScrollText,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ChessboardView } from '../board/ChessboardView';

export interface GameViewProps {
  initialMode?: 'bot' | 'local';
}

interface PlayerCardProps {
  color: PlayerColor;
  isTurn: boolean;
  isGameOver: boolean;
  gameMode: 'bot' | 'local';
}

function PlayerCard({ color, isTurn, isGameOver, gameMode }: PlayerCardProps) {
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

  return (
    <div
      data-testid={`player-card-${color}`}
      className={`w-full max-w-[560px] rounded-xl px-4 py-3 flex items-center justify-between shadow-sm transition-all border ${
        active
          ? 'bg-surface-card border-emerald-500/50 shadow-emerald-950/20'
          : 'bg-surface-card border-surface-border'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border ${
            isWhite
              ? 'bg-board-light text-surface-base border-board-light/40 shadow-sm'
              : 'bg-surface-base text-gray-200 border-surface-border'
          }`}
        >
          {isBot ? (
            <Bot className="w-5 h-5 text-board-light" />
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
          </div>
          <p className="text-xs text-gray-400">
            {active ? 'Thinking / Turn to move' : 'Waiting for turn'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
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
      </div>
    </div>
  );
}

export function GameView({ initialMode }: GameViewProps) {
  const game = useGameStore((state) => state.game);
  const storeGameMode = useGameStore((state) => state.gameMode);
  const gameMode = initialMode ?? storeGameMode;
  const setGameMode = useGameStore((state) => state.setGameMode);
  const resetGame = useGameStore((state) => state.resetGame);
  const requestBotMove = useGameStore((state) => state.requestBotMove);
  const isBotThinking = useGameStore((state) => state.isBotThinking);

  const [orientation, setOrientation] = useState<PlayerColor>('white');
  const [resignedColor, setResignedColor] = useState<PlayerColor | null>(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const moveListEndRef = useRef<HTMLDivElement>(null);

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
      !resignedColor &&
      !isBotThinking
    ) {
      void requestBotMove();
    }
  }, [gameMode, game.turn, game.fen, resignedColor, isBotThinking, game, requestBotMove]);

  const sanMoves = useMemo(() => getSanHistory(game), [game]);

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

  const gameOver = isGameOver(game) || resignedColor !== null;

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
    outcomeDescription = 'Game ended in a draw.';
  }

  const handleNewGame = () => {
    resetGame();
    setResignedColor(null);
    setShowResignConfirm(false);
  };

  const handleFlipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const handleResignClick = () => {
    if (gameOver) return;
    setShowResignConfirm(true);
  };

  const confirmResign = () => {
    setResignedColor(game.turn);
    setShowResignConfirm(false);
  };

  const cancelResign = () => {
    setShowResignConfirm(false);
  };

  // Orientation-dependent player ordering
  const topColor: PlayerColor = orientation === 'white' ? 'black' : 'white';
  const bottomColor: PlayerColor = orientation === 'white' ? 'white' : 'black';

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
                Are you sure you want to resign? The victory will be awarded to your opponent.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={confirmResign}
                  className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Yes, Resign
                </button>
                <button
                  type="button"
                  onClick={cancelResign}
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
        />
      </div>

      {/* Right Column: Game Info, Move History, Controls */}
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

          <button
            type="button"
            data-testid="new-game-btn"
            onClick={handleNewGame}
            className="w-full py-2.5 px-3 rounded-lg bg-surface-accent hover:bg-surface-border active:scale-[0.99] text-white text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border border-surface-border cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-gray-300" />
            <span>New Game</span>
          </button>

          <button
            type="button"
            data-testid="flip-board-btn"
            onClick={handleFlipBoard}
            className="w-full py-2.5 px-3 rounded-lg bg-surface-accent hover:bg-surface-border active:scale-[0.99] text-white text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border border-surface-border cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4 text-gray-300" />
            <span>Flip Board</span>
          </button>

          <button
            type="button"
            data-testid="resign-btn"
            disabled={gameOver}
            onClick={handleResignClick}
            className={`w-full py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border cursor-pointer ${
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
  );
}

export default GameView;
