import { getSanHistory, isGameOver } from '@et-chess/chess-core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bot,
  CircleDot,
  Flag,
  Handshake,
  RotateCcw,
  Settings as SettingsIcon,
  Swords,
  Trophy,
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
import { parseMobileGameParams } from '../src/navigation';
import { useGameStore } from '../src/store/gameStore';
import { borderRadius, spacing, themeColors, typography } from '../src/theme';

export default function GameScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ mode?: string }>();
  const { mode } = parseMobileGameParams(rawParams);

  // Store state and actions
  const game = useGameStore((state) => state.game);
  const gameMode = useGameStore((state) => state.gameMode);
  const botDifficulty = useGameStore((state) => state.botDifficulty);
  const isBotThinking = useGameStore((state) => state.isBotThinking);
  const resignedColor = useGameStore((state) => state.resignedColor);
  const resetGame = useGameStore((state) => state.resetGame);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const agreeDraw = useGameStore((state) => state.agreeDraw);
  const resign = useGameStore((state) => state.resign);
  const requestBotMove = useGameStore((state) => state.requestBotMove);

  // UI state
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [modalDismissed, setModalDismissed] = useState<boolean>(false);

  // Sync mode from navigation params if provided
  useEffect(() => {
    if (mode && mode !== gameMode) {
      setGameMode(mode);
    }
  }, [mode, gameMode, setGameMode]);

  // Reset modal dismissed state when game status changes to ongoing
  useEffect(() => {
    if (game.status === 'ongoing' && !resignedColor) {
      setModalDismissed(false);
    }
  }, [game.status, resignedColor]);

  // Auto trigger bot move when it's black's turn in bot mode
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
  }, [gameMode, game, resignedColor, isBotThinking, requestBotMove]);

  const sanMoves = useMemo(() => getSanHistory(game), [game]);

  const isGameOverState = isGameOver(game) || game.status === 'draw' || Boolean(resignedColor);

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

  const handleToggleOrientation = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const handleResetGame = () => {
    resetGame();
    setModalDismissed(false);
  };

  const handleAgreeDraw = () => {
    agreeDraw();
  };

  const handleResign = () => {
    resign();
  };

  const isBotMode = gameMode === 'bot';

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top bar with back, mode badge, and settings */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="back-button"
          >
            <ArrowLeft size={20} color={themeColors.text.primary} />
          </Pressable>

          <View style={styles.modeBadge} testID="mode-badge">
            {isBotMode ? (
              <>
                <Bot size={14} color={themeColors.board.light} />
                <Text style={styles.modeBadgeText}>vs Stockfish ({botDifficulty})</Text>
              </>
            ) : (
              <>
                <Swords size={14} color={themeColors.board.light} />
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
            <SettingsIcon size={20} color={themeColors.text.primary} />
          </Pressable>
        </View>

        {/* Top Player Card (Black / Stockfish) */}
        <View
          style={[styles.statusCard, game.turn === 'black' && styles.statusCardActive]}
          testID="top-player-card"
        >
          <View style={styles.playerRow}>
            <View style={styles.playerInfo}>
              <View style={[styles.avatarCircle, styles.blackAvatar]} />
              <View>
                <Text style={styles.playerName}>
                  {isBotMode ? 'Stockfish Engine' : 'Player 2 (Black)'}
                </Text>
                <Text style={styles.playerStatus}>
                  {isBotThinking
                    ? 'Thinking...'
                    : game.turn === 'black'
                      ? 'Black to move'
                      : 'Waiting for turn'}
                </Text>
              </View>
            </View>
            <View style={styles.statusIndicator}>
              {isBotThinking ? (
                <View style={styles.thinkingIndicator}>
                  <Text style={styles.thinkingText}>Thinking...</Text>
                  <ActivityIndicator
                    size="small"
                    color={themeColors.status.warning}
                    testID="bot-thinking-spinner"
                  />
                </View>
              ) : (
                <CircleDot
                  size={12}
                  color={game.turn === 'black' ? themeColors.status.active : themeColors.text.muted}
                />
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

        {/* Bottom Player Card (White / Player 1) */}
        <View
          style={[styles.statusCard, game.turn === 'white' && styles.statusCardActive]}
          testID="bottom-player-card"
        >
          <View style={styles.playerRow}>
            <View style={styles.playerInfo}>
              <View style={[styles.avatarCircle, styles.whiteAvatar]} />
              <View>
                <Text style={styles.playerName}>
                  {isBotMode ? 'You (White)' : 'Player 1 (White)'}
                </Text>
                <Text style={styles.playerStatus}>
                  {game.turn === 'white' ? 'White to move' : 'Waiting for opponent'}
                </Text>
              </View>
            </View>
            <View style={styles.statusIndicator}>
              <CircleDot
                size={12}
                color={game.turn === 'white' ? themeColors.status.active : themeColors.text.muted}
              />
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
            <RotateCcw size={16} color={themeColors.text.primary} />
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
            <RotateCcw size={16} color={themeColors.text.primary} />
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
            <Handshake size={16} color={themeColors.text.primary} />
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
            <Flag size={16} color={themeColors.status.danger} />
            <Text style={styles.resignButtonText}>Resign</Text>
          </Pressable>
        </View>

        {/* Game Over Modal Banner */}
        {isGameOverState && !modalDismissed && gameOverDetails && (
          <Modal transparent animationType="fade" visible testID="game-over-modal">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent} testID="game-over-banner">
                <View style={styles.modalIconCircle}>
                  <Trophy size={32} color={themeColors.board.light} />
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
                    <RotateCcw size={16} color={themeColors.surface.base} />
                    <Text style={styles.primaryModalButtonText}>Play Again</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.secondaryModalButton]}
                    onPress={() => setModalDismissed(true)}
                    testID="modal-review-button"
                  >
                    <Text style={styles.secondaryModalButtonText}>Review Board</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.surface.base,
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
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
    backgroundColor: themeColors.surface.accent,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: themeColors.board.light,
  },
  statusCard: {
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusCardActive: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: '#1b241c',
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
    borderColor: themeColors.board.light,
  },
  blackAvatar: {
    backgroundColor: '#262626',
    borderColor: themeColors.board.dark,
  },
  playerName: {
    fontSize: typography.titleSmall.fontSize,
    fontWeight: typography.titleSmall.fontWeight,
    color: themeColors.text.primary,
  },
  playerStatus: {
    fontSize: 11,
    color: themeColors.text.muted,
  },
  statusIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  thinkingText: {
    fontSize: 11,
    color: themeColors.status.warning,
    fontWeight: '600',
  },
  historyContainer: {
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
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
    color: themeColors.text.muted,
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
    color: themeColors.text.muted,
  },
  historyMoveWhite: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  historyMoveBlack: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.board.light,
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
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
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
    color: themeColors.text.primary,
  },
  resignButton: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  resignButtonText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: themeColors.status.danger,
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
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
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
    borderColor: themeColors.board.light,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.titleMedium.fontSize,
    fontWeight: typography.titleMedium.fontWeight,
    color: themeColors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: typography.bodyRegular.fontSize,
    color: themeColors.text.secondary,
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
    backgroundColor: themeColors.board.light,
  },
  primaryModalButtonText: {
    fontSize: typography.bodyRegular.fontSize,
    fontWeight: '700',
    color: themeColors.surface.base,
  },
  secondaryModalButton: {
    backgroundColor: 'transparent',
    borderColor: themeColors.surface.border,
    borderWidth: 1,
  },
  secondaryModalButtonText: {
    fontSize: typography.bodyRegular.fontSize,
    fontWeight: '600',
    color: themeColors.text.secondary,
  },
});
