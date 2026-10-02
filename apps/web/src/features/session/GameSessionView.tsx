import { applyMove, createGame, getSanHistory, isGameOver } from '@et-chess/chess-core';
import {
  createDefaultGameSession,
  type GameResult,
  type GameSession,
  type GameSessionMode,
} from '@et-chess/config';
import type { BotDifficulty, PlayerColor } from '@et-chess/types';
import { useEffect, useMemo, useState } from 'react';
import { calculateRatingDelta } from '../../mocks/gameSessionMocks';
import { useGameStore } from '../../store/gameStore';
import { useHistoryStore } from '../../store/historyStore';
import { ChessboardView, isSquareOccupied } from '../board/ChessboardView';
import { useStockfishWorker } from '../bot/useStockfishWorker';
import { playMoveSound } from '../game/soundEffects';
import { GameActionBar } from './GameActionBar';
import { GameResultModal } from './GameResultModal';
import { GameReviewModal } from './GameReviewModal';
import { MoveHistoryList } from './MoveHistoryList';
import { PlayerCard } from './PlayerCard';

export interface GameSessionViewProps {
  initialSession?: GameSession;
  mode?: GameSessionMode;
  botDifficulty?: BotDifficulty;
  minutes?: number;
  increment?: number;
  opponentName?: string;
  opponentRating?: number;
  onExit?: () => void;
}

export function GameSessionView({
  initialSession,
  mode = 'online',
  botDifficulty = 'intermediate',
  minutes = 10,
  increment = 0,
  opponentName,
  opponentRating,
  onExit,
}: GameSessionViewProps) {
  // Stockfish worker hook if computer mode
  useStockfishWorker();

  const addGameToHistory = useHistoryStore((s) => s.addGame);

  const [session, setSession] = useState<GameSession>(() => {
    if (initialSession) return initialSession;
    return createDefaultGameSession({
      mode,
      minutes,
      increment,
      opponent:
        mode === 'online'
          ? { displayName: opponentName ?? 'Abebe Bikila', rating: opponentRating ?? 1540 }
          : mode === 'friend'
            ? { displayName: opponentName ?? 'Friend (Challenger)', rating: opponentRating ?? 1450 }
            : mode === 'computer'
              ? { displayName: 'Stockfish 16', rating: 1500 }
              : { displayName: 'Player 2 (Black)' },
    });
  });

  const [orientation, setOrientation] = useState<PlayerColor>('white');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);

  const requestBotMove = useGameStore((s) => s.requestBotMove);
  const setStoreBotDifficulty = useGameStore((s) => s.setBotDifficulty);

  // Sync bot difficulty with store
  useEffect(() => {
    if (session.mode === 'computer') {
      setStoreBotDifficulty(botDifficulty);
    }
  }, [session.mode, botDifficulty, setStoreBotDifficulty]);

  const game = session.game;
  const isOver = isGameOver(game) || game.status === 'draw' || session.result !== null;

  // Active clock tick
  useEffect(() => {
    if (isOver || session.clock.activeColor === null) return;
    if (session.timeControl.minutes <= 0) return;

    const interval = setInterval(() => {
      setSession((prev) => {
        if (prev.result || !prev.clock.activeColor) return prev;
        const color: PlayerColor = prev.clock.activeColor;
        const currentMs = prev.clock[color];
        const nextMs = Math.max(0, currentMs - 100);

        if (nextMs <= 0) {
          // Clock ran out -> Timeout loss
          const winner: PlayerColor = color === 'white' ? 'black' : 'white';
          const winnerName = winner === 'white' ? 'White' : (prev.opponent?.displayName ?? 'Black');
          const timeoutResult: GameResult = {
            outcome: winner,
            reason: `${winnerName} won on time`,
            ratingChange:
              prev.mode === 'online'
                ? calculateRatingDelta(1500, prev.opponent?.rating ?? 1500, winner, 'white')
                : undefined,
          };
          return {
            ...prev,
            clock: { ...prev.clock, [color]: 0, activeColor: null },
            result: timeoutResult,
          };
        }

        return {
          ...prev,
          clock: { ...prev.clock, [color]: nextMs },
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOver, session.clock.activeColor, session.timeControl.minutes]);

  // When result is reached, open modal & record to history
  useEffect(() => {
    if (session.result && !showResultModal) {
      setShowResultModal(true);
      const sanMoves = getSanHistory(session.game);
      addGameToHistory({
        mode: session.mode,
        timeControl: session.timeControl.name,
        opponent:
          session.opponent?.displayName ?? (session.mode === 'local' ? 'Player 2' : 'Opponent'),
        opponentRating: session.opponent?.rating,
        playerColor: orientation,
        result: session.result,
        moveCount: session.game.moveHistory.length,
        sanMoves,
        moveHistory: session.game.moveHistory,
      });
    }
  }, [
    session.result,
    session.game,
    session.mode,
    session.timeControl.name,
    session.opponent,
    orientation,
    addGameToHistory,
    showResultModal,
  ]);

  // Handle incoming move
  const handleMove = (movePayload: {
    from: string;
    to: string;
    promotion?: 'q' | 'r' | 'b' | 'n';
  }): boolean => {
    if (isOver) return false;

    try {
      const nextGame = applyMove(game, movePayload);
      const isCapture = isSquareOccupied(game.fen, movePayload.to);

      if (soundEnabled) {
        playMoveSound(isCapture);
      }

      const nextTurn = nextGame.turn;
      const prevTurn: PlayerColor = game.turn;

      // Increment clock for player who just moved
      const incMs = session.timeControl.increment * 1000;
      const newClock = {
        ...session.clock,
        [prevTurn]: session.clock[prevTurn] + incMs,
        activeColor: nextTurn,
      };

      // Check for checkmate / stalemate
      let nextResult: GameResult | null = null;
      if (nextGame.status === 'checkmate') {
        const winner: PlayerColor = nextTurn === 'white' ? 'black' : 'white';
        nextResult = {
          outcome: winner,
          reason: `Checkmate (${winner === 'white' ? 'White' : 'Black'} won)`,
          ratingChange:
            session.mode === 'online'
              ? calculateRatingDelta(1500, session.opponent?.rating ?? 1500, winner, 'white')
              : undefined,
        };
      } else if (nextGame.status === 'stalemate') {
        nextResult = {
          outcome: 'draw',
          reason: 'Draw by Stalemate',
          ratingChange: session.mode === 'online' ? 0 : undefined,
        };
      }

      setSession((prev) => ({
        ...prev,
        game: nextGame,
        clock: newClock,
        result: nextResult ?? prev.result,
      }));

      // If mode is computer and it is now bot's turn
      if (session.mode === 'computer' && nextTurn === 'black' && !nextResult) {
        setIsBotThinking(true);
        setTimeout(async () => {
          try {
            await requestBotMove();
            // sync store game to session
            const storeGame = useGameStore.getState().game;
            if (storeGame.turn === 'white') {
              setSession((s) => ({
                ...s,
                game: storeGame,
                clock: {
                  ...s.clock,
                  black: s.clock.black + incMs,
                  activeColor: 'white',
                },
              }));
              if (soundEnabled) {
                playMoveSound(false);
              }
            }
          } catch {
            // bot move completed or errored
          } finally {
            setIsBotThinking(false);
          }
        }, 300);
      }

      return true;
    } catch {
      return false;
    }
  };

  const handleResign = () => {
    if (isOver) return;
    const opponentWins: PlayerColor = orientation === 'white' ? 'black' : 'white';
    const resignResult: GameResult = {
      outcome: opponentWins,
      reason: `${orientation === 'white' ? 'White' : 'Black'} resigned`,
      ratingChange:
        session.mode === 'online'
          ? calculateRatingDelta(1500, session.opponent?.rating ?? 1500, opponentWins, orientation)
          : undefined,
    };
    setSession((prev) => ({
      ...prev,
      result: resignResult,
      clock: { ...prev.clock, activeColor: null },
    }));
  };

  const handleDrawOffer = () => {
    if (isOver) return;
    const drawResult: GameResult = {
      outcome: 'draw',
      reason: 'Draw agreed by mutual consent',
      ratingChange: session.mode === 'online' ? 0 : undefined,
    };
    setSession((prev) => ({
      ...prev,
      result: drawResult,
      clock: { ...prev.clock, activeColor: null },
    }));
  };

  const handleTakeback = () => {
    if (game.moveHistory.length === 0 || isOver) return;
    // Roll back last move (or 2 moves in computer mode)
    const movesToRollback = session.mode === 'computer' ? 2 : 1;
    let newGame = createGame();
    const remainingMoves = game.moveHistory.slice(
      0,
      Math.max(0, game.moveHistory.length - movesToRollback),
    );
    for (const m of remainingMoves) {
      newGame = applyMove(newGame, m);
    }
    setSession((prev) => ({
      ...prev,
      game: newGame,
      clock: { ...prev.clock, activeColor: newGame.turn },
    }));
  };

  const handleRematch = () => {
    setShowResultModal(false);
    setShowReviewModal(false);
    setSession(
      createDefaultGameSession({
        mode: session.mode,
        minutes: session.timeControl.minutes,
        increment: session.timeControl.increment,
        opponent: session.opponent,
      }),
    );
  };

  const handleReview = () => {
    setShowResultModal(false);
    setShowReviewModal(true);
  };

  const sanMoves = useMemo(() => getSanHistory(game), [game]);

  const topColor: PlayerColor = orientation === 'white' ? 'black' : 'white';
  const bottomColor: PlayerColor = orientation === 'white' ? 'white' : 'black';

  const opponentInfo = session.opponent ?? {
    displayName: session.mode === 'local' ? 'Player 2' : 'Opponent',
  };

  return (
    <div
      data-testid="game-session-view"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-7xl mx-auto"
    >
      {/* Left Column: Board Area & Player Cards */}
      <div className="lg:col-span-8 flex flex-col items-center justify-center gap-3 w-full">
        {/* Top Player Card (Opponent) */}
        <PlayerCard
          color={topColor}
          displayName={opponentInfo.displayName}
          rating={opponentInfo.rating}
          isTurn={game.turn === topColor}
          isGameOver={isOver}
          isBot={session.mode === 'computer' && topColor === 'black'}
          botLevelSpec={session.mode === 'computer' ? `Bot ${botDifficulty}` : undefined}
          isBotThinking={isBotThinking}
          connection={session.connection}
          timeMs={session.clock[topColor]}
        />

        {/* Board Mount */}
        <div className="w-full max-w-[560px] aspect-square rounded-2xl border-2 border-surface-border bg-surface-card shadow-2xl relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
          <ChessboardView
            gameState={game}
            orientation={orientation}
            onMove={handleMove}
            disabled={isOver || (session.mode === 'computer' && game.turn === 'black')}
          />
        </div>

        {/* Bottom Player Card (User / Player 1) */}
        <PlayerCard
          color={bottomColor}
          displayName={session.mode === 'local' ? 'Player 1' : 'You (White)'}
          rating={1500}
          isTurn={game.turn === bottomColor}
          isGameOver={isOver}
          timeMs={session.clock[bottomColor]}
        />
      </div>

      {/* Right Column: Move History & Action Bar */}
      <div className="lg:col-span-4 flex flex-col gap-4 w-full">
        {/* Move History List */}
        <MoveHistoryList sanMoves={sanMoves} />

        {/* Game Action Bar */}
        <GameActionBar
          allowedActions={session.allowedActions}
          isGameOver={isOver}
          soundEnabled={soundEnabled}
          onFlipBoard={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
          onToggleSound={() => setSoundEnabled((s) => !s)}
          onResign={handleResign}
          onDrawOffer={handleDrawOffer}
          onTakeback={handleTakeback}
        />
      </div>

      {/* Result Modal */}
      {session.result && (
        <GameResultModal
          isOpen={showResultModal}
          result={session.result}
          playerColor={orientation}
          onRematch={handleRematch}
          onReview={handleReview}
          onClose={() => setShowResultModal(false)}
        />
      )}

      {/* Review Modal */}
      <GameReviewModal
        isOpen={showReviewModal}
        sanMoves={sanMoves}
        moveHistory={game.moveHistory}
        onClose={() => setShowReviewModal(false)}
      />
    </div>
  );
}

export default GameSessionView;
