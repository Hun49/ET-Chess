import { getSanHistory, isGameOver } from '@et-chess/chess-core';
import { formatClockTime } from '@et-chess/config';
import type { PlayerColor } from '@et-chess/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowUpDown,
  Bot,
  CircleDot,
  Eye,
  Flag,
  Globe,
  Handshake,
  RotateCcw,
  Settings as SettingsIcon,
  Swords,
  Timer,
  Trophy,
  Users,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chessboard from '../src/components/Chessboard';
import { initNativeBotBridge } from '../src/features/bot/nativeBotBridge';
import { parseMobileGameParams } from '../src/navigation';
import { useGameStore } from '../src/store/gameStore';
import { useMobileHistoryStore } from '../src/store/historyStore';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

export default function GameScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const rawParams = useLocalSearchParams();
  const hasModeParam = typeof rawParams?.mode === 'string' && rawParams.mode.length > 0;
  const { mode, minutes = 10, increment = 0, opponent, rating } = parseMobileGameParams(rawParams);

  // Store state and actions
  const game = useGameStore((state) => state.game);
  const storeGameMode = useGameStore((state) => state.gameMode);
  const botDifficulty = useGameStore((state) => state.botDifficulty);
  const isBotThinking = useGameStore((state) => state.isBotThinking);
  const resignedColor = useGameStore((state) => state.resignedColor);
  const resetGame = useGameStore((state) => state.resetGame);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const agreeDraw = useGameStore((state) => state.agreeDraw);
  const resign = useGameStore((state) => state.resign);
  const requestBotMove = useGameStore((state) => state.requestBotMove);

  const addGameToHistory = useMobileHistoryStore((state) => state.addGame);

  // Resolve active game mode
  const effectiveMode = hasModeParam ? mode : storeGameMode === 'bot' ? 'bot' : 'local';
  const isBotMode = effectiveMode === 'bot' || effectiveMode === 'computer';
  const isLocalMode = effectiveMode === 'local';
  const isOnlineMode = effectiveMode === 'online';
  const isFriendMode = effectiveMode === 'friend';

  // UI state
  const [orientation, setOrientation] = useState<PlayerColor>('white');
  const [modalDismissed, setModalDismissed] = useState<boolean>(false);

  // Clocks state (in ms)
  const [clocks, setClocks] = useState<{ white: number; black: number }>({
    white: minutes > 0 ? minutes * 60 * 1000 : 600000,
    black: minutes > 0 ? minutes * 60 * 1000 : 600000,
  });

  // Mount native Stockfish engine bridge on screen mount
  useEffect(() => {
    const cleanup = initNativeBotBridge();
    return () => {
      cleanup();
    };
  }, []);

  // Sync mode from navigation params if provided
  useEffect(() => {
    if (hasModeParam) {
      const targetStoreMode = mode === 'local' ? 'local' : 'bot';
      if (targetStoreMode !== storeGameMode) {
        setGameMode(targetStoreMode);
      }
    }
  }, [hasModeParam, mode, storeGameMode, setGameMode]);

  // Reset modal dismissed state when game status changes to ongoing
  useEffect(() => {
    if (game.status === 'ongoing' && !resignedColor) {
      setModalDismissed(false);
    }
  }, [game.status, resignedColor]);

  // Clock ticking when match is ongoing
  const isGameOverState = isGameOver(game) || game.status === 'draw' || Boolean(resignedColor);

  useEffect(() => {
    if (isGameOverState || minutes <= 0) return;

    const interval = setInterval(() => {
      setClocks((prev) => {
        const turn = game.turn;
        const current = prev[turn];
        const next = Math.max(0, current - 100);
        return {
          ...prev,
          [turn]: next,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isGameOverState, game.turn, minutes]);

  // Auto trigger bot move when it's black's turn in bot mode
  useEffect(() => {
    if (
      isBotMode &&
      game.turn === 'black' &&
      !isGameOver(game) &&
      game.status !== 'draw' &&
      !resignedColor &&
      !isBotThinking
    ) {
      void requestBotMove();
    }
  }, [isBotMode, game, resignedColor, isBotThinking, requestBotMove]);

  const sanMoves = useMemo(() => getSanHistory(game), [game]);

  // Compute game over messaging
  const gameOverDetails = useMemo(() => {
    if (!isGameOverState) return null;

    if (resignedColor) {
      const winner = resignedColor === 'white' ? 'Black' : 'White';
      return {
        title: `${winner} Wins!`,
        description: `${resignedColor === 'white' ? 'White' : 'Black'} resigned the match.`,
      };
    }

    if (game.status === 'checkmate') {
      const winner = game.turn === 'white' ? 'Black' : 'White';
      return {
        title: 'Checkmate!',
        description: `${winner} wins by checkmate.`,
      };
    }

    if (game.status === 'stalemate') {
      return {
        title: 'Stalemate',
        description: 'Game is drawn by stalemate.',
      };
    }

    if (game.status === 'draw') {
      return {
        title: 'Draw',
        description: 'Game concluded in a draw.',
      };
    }

    return {
      title: 'Game Over',
      description: 'The game has ended.',
    };
  }, [isGameOverState, resignedColor, game.status, game.turn]);

  // Record to history on game over
  useEffect(() => {
    if (isGameOverState && gameOverDetails) {
      const winner =
        resignedColor === 'white'
          ? 'black'
          : resignedColor === 'black'
            ? 'white'
            : game.status === 'checkmate'
              ? game.turn === 'white'
                ? 'black'
                : 'white'
              : 'draw';

      addGameToHistory({
        mode: isOnlineMode ? 'online' : isFriendMode ? 'friend' : isBotMode ? 'computer' : 'local',
        timeControl: `${minutes} min`,
        opponent: opponent ?? (isBotMode ? 'Stockfish Engine' : 'Player 2 (Black)'),
        opponentRating: rating,
        playerColor: orientation,
        result: {
          outcome: winner,
          reason: gameOverDetails.description,
          ratingChange: isOnlineMode
            ? winner === orientation
              ? 16
              : winner === 'draw'
                ? 0
                : -16
            : undefined,
        },
        moveCount: game.moveHistory.length,
        sanMoves,
        moveHistory: game.moveHistory,
      });
    }
  }, [
    isGameOverState,
    resignedColor,
    rating,
    sanMoves,
    orientation,
    opponent,
    minutes,
    isOnlineMode,
    isFriendMode,
    gameOverDetails,
    game.turn,
    game.moveHistory,
    isBotMode,
    game.status,
    addGameToHistory,
  ]);

  const handleToggleOrientation = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const handleResetGame = () => {
    resetGame();
    setClocks({
      white: minutes > 0 ? minutes * 60 * 1000 : 600000,
      black: minutes > 0 ? minutes * 60 * 1000 : 600000,
    });
    setModalDismissed(false);
  };

  const handleAgreeDraw = () => {
    agreeDraw();
  };

  const handleResign = () => {
    resign();
  };

  // Group SAN history into numbered pairs
  const movePairs = useMemo(() => {
    const pairs: Array<{ number: number; white: string; black?: string }> = [];
    for (let i = 0; i < sanMoves.length; i += 2) {
      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: sanMoves[i] ?? '',
        black: sanMoves[i + 1],
      });
    }
    return pairs;
  }, [sanMoves]);

  const topColor: PlayerColor = orientation === 'white' ? 'black' : 'white';
  const bottomColor: PlayerColor = orientation === 'white' ? 'white' : 'black';

  const opponentDisplayName =
    opponent ??
    (isBotMode
      ? 'Stockfish Engine'
      : isLocalMode
        ? 'Player 2 (Black)'
        : isFriendMode
          ? 'Friend (Challenger)'
          : 'Online Opponent');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="back-button"
          >
            <ArrowLeft size={20} color={theme.text.primary} />
          </Pressable>

          <View style={styles.modeBadge} testID="mode-badge">
            {isBotMode ? (
              <>
                <Bot size={14} color={theme.board.light} />
                <Text style={styles.modeBadgeText}>vs Stockfish ({botDifficulty})</Text>
              </>
            ) : isOnlineMode ? (
              <>
                <Globe size={14} color={theme.brand.green.DEFAULT} />
                <Text style={[styles.modeBadgeText, { color: theme.brand.green.DEFAULT }]}>
                  Online Ranked
                </Text>
              </>
            ) : isFriendMode ? (
              <>
                <Users size={14} color={theme.brand.yellow.dark} />
                <Text style={[styles.modeBadgeText, { color: theme.brand.yellow.dark }]}>
                  Friend Challenge
                </Text>
              </>
            ) : (
              <>
                <Swords size={14} color={theme.board.light} />
                <Text style={styles.modeBadgeText}>Pass and Play</Text>
              </>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            testID="settings-button"
          >
            <SettingsIcon size={20} color={theme.text.primary} />
          </Pressable>
        </View>

        {/* Top Player Card (Opponent) */}
        <View
          style={[styles.statusCard, game.turn === topColor && styles.statusCardActive]}
          testID="top-player-card"
        >
          <View style={styles.playerRow}>
            <View style={styles.playerInfo}>
              <View
                style={[
                  styles.avatarCircle,
                  topColor === 'white' ? styles.whiteAvatar : styles.blackAvatar,
                ]}
              />
              <View>
                <Text style={styles.playerName}>{opponentDisplayName}</Text>
                <Text style={styles.playerStatus}>
                  {topColor === 'black' && isBotThinking
                    ? 'Thinking...'
                    : game.turn === topColor
                      ? `${topColor === 'white' ? 'White' : 'Black'} to move`
                      : 'Waiting for turn'}
                </Text>
              </View>
            </View>

            <View style={styles.rightStats}>
              {topColor === 'black' && isBotThinking ? (
                <View style={styles.thinkingIndicator}>
                  <Text style={styles.thinkingText}>Thinking...</Text>
                  <ActivityIndicator
                    size="small"
                    color={theme.status.warning}
                    testID="bot-thinking-spinner"
                  />
                </View>
              ) : (
                <CircleDot
                  size={12}
                  color={game.turn === topColor ? theme.brand.green.DEFAULT : theme.text.muted}
                />
              )}

              {minutes > 0 && (
                <View
                  style={[
                    styles.clockBadge,
                    game.turn === topColor && styles.clockBadgeActive,
                    clocks[topColor] <= 20000 && styles.clockBadgeLow,
                  ]}
                  testID={`clock-display-${topColor}`}
                >
                  <Timer
                    size={12}
                    color={game.turn === topColor ? theme.brand.green.DEFAULT : theme.text.muted}
                  />
                  <Text
                    style={[styles.clockText, game.turn === topColor && styles.clockTextActive]}
                  >
                    {formatClockTime(clocks[topColor])}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Move History Strip */}
        <View style={styles.historyContainer} testID="move-history-strip">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyScrollContent}
          >
            {movePairs.length === 0 ? (
              <Text style={styles.historyEmptyText}>No moves played yet</Text>
            ) : (
              movePairs.map((pair) => (
                <View key={pair.number} style={styles.historyPair}>
                  <Text style={styles.historyNumber}>{pair.number}.</Text>
                  <Text style={styles.historyMoveWhite}>{pair.white}</Text>
                  {pair.black && <Text style={styles.historyMoveBlack}>{pair.black}</Text>}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Responsive Chessboard Container */}
        <View style={styles.boardWrapper}>
          <Chessboard
            orientation={orientation}
            disabled={isGameOverState || (isBotMode && (game.turn === 'black' || isBotThinking))}
          />
        </View>

        {/* Bottom Player Card (You / White) */}
        <View
          style={[styles.statusCard, game.turn === bottomColor && styles.statusCardActive]}
          testID="bottom-player-card"
        >
          <View style={styles.playerRow}>
            <View style={styles.playerInfo}>
              <View
                style={[
                  styles.avatarCircle,
                  bottomColor === 'white' ? styles.whiteAvatar : styles.blackAvatar,
                ]}
              />
              <View>
                <Text style={styles.playerName}>
                  {isLocalMode ? 'Player 1 (White)' : 'You (White)'}
                </Text>
                <Text style={styles.playerStatus}>
                  {game.turn === bottomColor ? 'White to move' : 'Waiting for opponent'}
                </Text>
              </View>
            </View>

            <View style={styles.rightStats}>
              <CircleDot
                size={12}
                color={game.turn === bottomColor ? theme.brand.green.DEFAULT : theme.text.muted}
              />

              {minutes > 0 && (
                <View
                  style={[
                    styles.clockBadge,
                    game.turn === bottomColor && styles.clockBadgeActive,
                    clocks[bottomColor] <= 20000 && styles.clockBadgeLow,
                  ]}
                  testID={`clock-display-${bottomColor}`}
                >
                  <Timer
                    size={12}
                    color={game.turn === bottomColor ? theme.brand.green.DEFAULT : theme.text.muted}
                  />
                  <Text
                    style={[styles.clockText, game.turn === bottomColor && styles.clockTextActive]}
                  >
                    {formatClockTime(clocks[bottomColor])}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Game Controls Toolbar */}
        <View style={styles.controlsRow}>
          {/* New Game */}
          <Pressable
            style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed]}
            onPress={handleResetGame}
            accessibilityRole="button"
            accessibilityLabel="Restart game"
            testID="new-game-button"
          >
            <RotateCcw size={16} color={theme.text.primary} />
            <Text style={styles.controlButtonText}>New</Text>
          </Pressable>

          {/* Flip Board */}
          <Pressable
            style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed]}
            onPress={handleToggleOrientation}
            accessibilityRole="button"
            accessibilityLabel="Flip chessboard orientation"
            testID="flip-board-button"
          >
            <ArrowUpDown size={16} color={theme.text.primary} />
            <Text style={styles.controlButtonText}>Flip</Text>
          </Pressable>

          {/* Draw Offer */}
          <Pressable
            style={({ pressed }) => [
              styles.controlButton,
              isGameOverState && styles.controlButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleAgreeDraw}
            disabled={isGameOverState}
            accessibilityRole="button"
            accessibilityLabel="Offer draw"
            testID="draw-button"
          >
            <Handshake size={16} color={theme.status.warning} />
            <Text style={styles.controlButtonText}>Draw</Text>
          </Pressable>

          {/* Resign */}
          <Pressable
            style={({ pressed }) => [
              styles.controlButton,
              styles.resignButton,
              isGameOverState && styles.controlButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleResign}
            disabled={isGameOverState}
            accessibilityRole="button"
            accessibilityLabel="Resign match"
            testID="resign-button"
          >
            <Flag size={16} color={theme.status.danger} />
            <Text style={styles.resignButtonText}>Resign</Text>
          </Pressable>
        </View>

        {/* Game Over Modal Banner */}
        {isGameOverState && !modalDismissed && gameOverDetails && (
          <Modal transparent animationType="fade" visible testID="game-over-modal">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent} testID="game-over-banner">
                <View style={styles.modalIconCircle}>
                  <Trophy size={32} color={theme.board.light} />
                </View>

                <Text style={styles.modalTitle} testID="game-over-title">
                  {gameOverDetails.title}
                </Text>
                <Text style={styles.modalDescription} testID="game-over-description">
                  {gameOverDetails.description}
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.primaryModalButton]}
                    onPress={handleResetGame}
                    testID="modal-new-game-button"
                  >
                    <RotateCcw size={16} color="#ffffff" />
                    <Text style={styles.primaryModalButtonText}>Play Again</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.secondaryModalButton]}
                    onPress={() => router.push('/history')}
                    testID="modal-review-button"
                  >
                    <Eye size={16} color={theme.text.primary} />
                    <Text style={styles.secondaryModalButtonText}>Review Match</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    container: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      justifyContent: 'space-between',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPressed: {
      opacity: 0.7,
      backgroundColor: theme.surface.accent,
    },
    modeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
    },
    modeBadgeText: {
      fontSize: typography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.board.light,
    },
    statusCard: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    statusCardActive: {
      borderColor: theme.brand.green.DEFAULT,
      borderWidth: 1.5,
    },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    playerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatarCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
    },
    whiteAvatar: {
      backgroundColor: '#ffffff',
      borderColor: theme.board.light,
    },
    blackAvatar: {
      backgroundColor: '#262626',
      borderColor: theme.board.dark,
    },
    playerName: {
      fontSize: typography.titleSmall.fontSize,
      fontWeight: typography.titleSmall.fontWeight,
      color: theme.text.primary,
    },
    playerStatus: {
      fontSize: 11,
      color: theme.text.muted,
    },
    rightStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    clockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: theme.surface.accent,
      borderWidth: 1,
      borderColor: theme.surface.border,
    },
    clockBadgeActive: {
      borderColor: theme.brand.green.DEFAULT,
    },
    clockBadgeLow: {
      borderColor: theme.status.warning,
      backgroundColor: 'rgba(234, 179, 8, 0.1)',
    },
    clockText: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'monospace',
      color: theme.text.muted,
    },
    clockTextActive: {
      color: theme.text.primary,
    },
    thinkingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    thinkingText: {
      fontSize: 11,
      color: theme.status.warning,
      fontWeight: '600',
    },
    historyContainer: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      height: 34,
      justifyContent: 'center',
    },
    historyScrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    historyEmptyText: {
      fontSize: typography.bodySmall.fontSize,
      color: theme.text.muted,
      fontStyle: 'italic',
    },
    historyPair: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    historyNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text.muted,
    },
    historyMoveWhite: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text.primary,
    },
    historyMoveBlack: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.board.light,
    },
    boardWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'space-between',
    },
    controlButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.sm,
    },
    controlButtonDisabled: {
      opacity: 0.4,
    },
    controlButtonText: {
      fontSize: typography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    resignButton: {
      borderColor: 'rgba(239, 68, 68, 0.4)',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    resignButtonText: {
      fontSize: typography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.status.danger,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    modalContent: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1.5,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      alignItems: 'center',
    },
    modalIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(240, 217, 181, 0.15)',
      borderColor: theme.board.light,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontSize: typography.titleMedium.fontSize,
      fontWeight: typography.titleMedium.fontWeight,
      color: theme.text.primary,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    modalDescription: {
      fontSize: typography.bodyRegular.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    modalActions: {
      width: '100%',
      gap: spacing.sm,
    },
    modalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
    },
    primaryModalButton: {
      backgroundColor: theme.brand.green.DEFAULT,
    },
    primaryModalButtonText: {
      fontSize: typography.bodyRegular.fontSize,
      fontWeight: '700',
      color: '#ffffff',
    },
    secondaryModalButton: {
      backgroundColor: 'transparent',
      borderColor: theme.surface.border,
      borderWidth: 1,
    },
    secondaryModalButtonText: {
      fontSize: typography.bodyRegular.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
  });
