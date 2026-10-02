import { applyMove, createGame, getSanHistory, isGameOver } from '@et-chess/chess-core';
import {
  createDefaultGameSession,
  type GameResult,
  type GameSession,
  type GameSessionMode,
} from '@et-chess/config';
import type { BotDifficulty, PlayerColor } from '@et-chess/types';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { initNativeBotBridge } from '../../features/bot/nativeBotBridge';
import { calculateRatingDelta } from '../../mocks/gameSessionMocks';
import { useGameStore } from '../../store/gameStore';
import { useMobileHistoryStore } from '../../store/historyStore';
import { spacing, type Theme, useTheme } from '../../theme';
import Chessboard from '../Chessboard';
import { GameActionBar } from './GameActionBar';
import { GameResultModal } from './GameResultModal';
import { MoveHistoryStrip } from './MoveHistoryStrip';
import { PlayerCard } from './PlayerCard';

export interface MobileGameSessionViewProps {
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
}: MobileGameSessionViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const addGameToHistory = useMobileHistoryStore((s) => s.addGame);

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
  const [showResultModal, setShowResultModal] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);

  const requestBotMove = useGameStore((s) => s.requestBotMove);
  const setStoreBotDifficulty = useGameStore((s) => s.setBotDifficulty);

  // Mount native Stockfish bridge if computer mode
  useEffect(() => {
    if (session.mode === 'computer') {
      const cleanup = initNativeBotBridge();
      setStoreBotDifficulty(botDifficulty);
      return () => {
        cleanup();
      };
    }
  }, [session.mode, botDifficulty, setStoreBotDifficulty]);

  const game = session.game;
  const isOver = isGameOver(game) || game.status === 'draw' || session.result !== null;

  // Active clock countdown
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

  // When result is reached, record to history
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
      const nextTurn = nextGame.turn;
      const prevTurn: PlayerColor = game.turn;

      const incMs = session.timeControl.increment * 1000;
      const newClock = {
        ...session.clock,
        [prevTurn]: session.clock[prevTurn] + incMs,
        activeColor: nextTurn,
      };

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

      // If computer mode and now black turn
      if (session.mode === 'computer' && nextTurn === 'black' && !nextResult) {
        setIsBotThinking(true);
        setTimeout(async () => {
          try {
            await requestBotMove();
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
            }
          } catch {
            // bot move resolved
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
    router.push('/history');
  };

  const sanMoves = useMemo(() => getSanHistory(game), [game]);

  const topColor: PlayerColor = orientation === 'white' ? 'black' : 'white';
  const bottomColor: PlayerColor = orientation === 'white' ? 'white' : 'black';

  const opponentInfo = session.opponent ?? {
    displayName: session.mode === 'local' ? 'Player 2' : 'Opponent',
  };

  return (
    <View style={styles.container} testID="game-session-view">
      {/* Top Player Card (Opponent) */}
      <PlayerCard
        color={topColor}
        displayName={opponentInfo.displayName}
        rating={opponentInfo.rating}
        botLevelSpec={session.mode === 'computer' ? `Bot ${botDifficulty}` : undefined}
        isTurn={game.turn === topColor}
        isGameOver={isOver}
        isBot={session.mode === 'computer' && topColor === 'black'}
        isBotThinking={isBotThinking}
        connection={session.connection}
        timeMs={session.clock[topColor]}
      />

      {/* Move History Strip */}
      <MoveHistoryStrip sanMoves={sanMoves} />

      {/* Chessboard */}
      <View style={styles.boardWrapper}>
        <Chessboard
          game={game}
          orientation={orientation}
          onMove={handleMove}
          disabled={isOver || (session.mode === 'computer' && game.turn === 'black')}
        />
      </View>

      {/* Bottom Player Card (User / Player 1) */}
      <PlayerCard
        color={bottomColor}
        displayName={session.mode === 'local' ? 'Player 1' : 'You (White)'}
        rating={1500}
        isTurn={game.turn === bottomColor}
        isGameOver={isOver}
        timeMs={session.clock[bottomColor]}
      />

      {/* Action Controls */}
      <GameActionBar
        allowedActions={session.allowedActions}
        isGameOver={isOver}
        onFlipBoard={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
        onResign={handleResign}
        onDrawOffer={handleDrawOffer}
        onTakeback={handleTakeback}
      />

      {/* Result Modal */}
      {session.result && (
        <GameResultModal
          visible={showResultModal}
          result={session.result}
          playerColor={orientation}
          onRematch={handleRematch}
          onReview={handleReview}
          onClose={() => {
            setShowResultModal(false);
            onExit?.();
          }}
        />
      )}
    </View>
  );
}

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    boardWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default GameSessionView;
