import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bot,
  CircleDot,
  Flag,
  RotateCcw,
  Settings as SettingsIcon,
  Swords,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseMobileGameParams } from '../src/navigation';
import { borderRadius, spacing, themeColors, typography } from '../src/theme';

export default function GameScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ mode?: string }>();
  const { mode } = parseMobileGameParams(rawParams);

  // Initial game state UI scaffolding awaiting chess-core / react-native-chessboard in Subtask 5.2
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [status, setStatus] = useState<string>('ongoing');

  const handleResetGame = () => {
    setTurn('white');
    setStatus('ongoing');
  };

  const isBotMode = mode === 'bot';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top bar with back and settings */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={themeColors.text.primary} />
          </Pressable>

          <View style={styles.modeBadge}>
            {isBotMode ? (
              <>
                <Bot size={14} color={themeColors.board.light} />
                <Text style={styles.modeBadgeText}>Play vs Stockfish</Text>
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
          >
            <SettingsIcon size={20} color={themeColors.text.primary} />
          </Pressable>
        </View>

        {/* Player / Bot Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.opponentRow}>
            <View style={styles.playerInfo}>
              <View style={[styles.avatarCircle, styles.blackAvatar]} />
              <View>
                <Text style={styles.playerName}>
                  {isBotMode ? 'Stockfish Bot (Depth 10)' : 'Player 2 (Black)'}
                </Text>
                <Text style={styles.playerStatus}>
                  {turn === 'black' ? 'Thinking...' : 'Waiting for turn'}
                </Text>
              </View>
            </View>
            <View style={styles.statusIndicator}>
              <CircleDot
                size={12}
                color={turn === 'black' ? themeColors.status.active : themeColors.text.muted}
              />
            </View>
          </View>
        </View>

        {/* Board Container */}
        <View style={styles.boardWrapper}>
          <View style={styles.boardFrame}>
            <View style={styles.boardPlaceholder}>
              <Text style={styles.placeholderTitle}>ET Chess Board</Text>
              <Text style={styles.placeholderSubtitle}>
                {isBotMode ? 'Offline UCI Engine Ready' : 'Two-Player Local Game'}
              </Text>
              <View style={styles.turnBanner}>
                <Text style={styles.turnText}>
                  Turn: {turn === 'white' ? 'White to move' : 'Black to move'} ({status})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Local Player Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.opponentRow}>
            <View style={styles.playerInfo}>
              <View style={[styles.avatarCircle, styles.whiteAvatar]} />
              <View>
                <Text style={styles.playerName}>
                  {isBotMode ? 'You (White)' : 'Player 1 (White)'}
                </Text>
                <Text style={styles.playerStatus}>
                  {turn === 'white' ? 'Your move' : 'Waiting for opponent'}
                </Text>
              </View>
            </View>
            <View style={styles.statusIndicator}>
              <CircleDot
                size={12}
                color={turn === 'white' ? themeColors.status.active : themeColors.text.muted}
              />
            </View>
          </View>
        </View>

        {/* Bottom Game Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed]}
            onPress={handleResetGame}
            accessibilityRole="button"
            accessibilityLabel="Restart game"
          >
            <RotateCcw size={16} color={themeColors.text.primary} />
            <Text style={styles.controlButtonText}>New Game</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.controlButton,
              styles.resignButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setStatus('resigned')}
            accessibilityRole="button"
            accessibilityLabel="Resign match"
          >
            <Flag size={16} color={themeColors.status.danger} />
            <Text style={styles.resignButtonText}>Resign</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
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
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  whiteAvatar: {
    backgroundColor: '#ffffff',
    borderColor: themeColors.board.light,
  },
  blackAvatar: {
    backgroundColor: '#333333',
    borderColor: themeColors.board.dark,
  },
  playerName: {
    fontSize: typography.titleSmall.fontSize,
    fontWeight: typography.titleSmall.fontWeight,
    color: themeColors.text.primary,
  },
  playerStatus: {
    fontSize: typography.bodySmall.fontSize,
    color: themeColors.text.muted,
  },
  statusIndicator: {
    padding: spacing.xs,
  },
  boardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardFrame: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 380,
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  boardPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface.accent,
    padding: spacing.lg,
  },
  placeholderTitle: {
    fontSize: typography.titleMedium.fontSize,
    fontWeight: typography.titleMedium.fontWeight,
    color: themeColors.board.light,
    marginBottom: spacing.xs,
  },
  placeholderSubtitle: {
    fontSize: typography.bodyRegular.fontSize,
    color: themeColors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  turnBanner: {
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  turnText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  controlButtonText: {
    fontSize: typography.bodyRegular.fontSize,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  resignButton: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  resignButtonText: {
    fontSize: typography.bodyRegular.fontSize,
    fontWeight: '600',
    color: themeColors.status.danger,
  },
});
