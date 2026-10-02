import type { GameResult } from '@et-chess/config';
import { Eye, RotateCcw, Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../../theme';

export interface GameResultModalProps {
  visible: boolean;
  result: GameResult;
  playerColor?: 'white' | 'black';
  onRematch: () => void;
  onReview: () => void;
  onClose?: () => void;
}

export function GameResultModal({
  visible,
  result,
  playerColor = 'white',
  onRematch,
  onReview,
  onClose,
}: GameResultModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!visible) return null;

  const isDraw = result.outcome === 'draw';
  const isWinner = result.outcome === playerColor;

  const headerTitle = isDraw ? 'Game Drawn' : isWinner ? 'Victory!' : 'Defeat';

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
      testID="game-result-modal"
    >
      <View style={styles.overlay}>
        <View style={styles.card} testID="game-result-content">
          <View
            style={[
              styles.iconCircle,
              isDraw
                ? styles.drawIconCircle
                : isWinner
                  ? styles.winIconCircle
                  : styles.lossIconCircle,
            ]}
          >
            <Trophy
              size={32}
              color={
                isDraw
                  ? theme.status.warning
                  : isWinner
                    ? theme.brand.green.DEFAULT
                    : theme.status.danger
              }
            />
          </View>

          <Text style={styles.title} testID="result-title">
            {headerTitle}
          </Text>
          <Text style={styles.description} testID="result-description">
            {result.reason}
          </Text>

          {result.ratingChange !== undefined ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>
                Rating: {result.ratingChange > 0 ? `+${result.ratingChange}` : result.ratingChange}
              </Text>
            </View>
          ) : (
            <View style={styles.unratedBadge}>
              <Text style={styles.unratedText}>Casual Match</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.primaryBtn]}
              onPress={onRematch}
              testID="result-rematch-btn"
            >
              <RotateCcw size={16} color={theme.surface.base} />
              <Text style={styles.primaryBtnText}>Play Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.secondaryBtn]}
              onPress={onReview}
              testID="result-review-btn"
            >
              <Eye size={16} color={theme.text.primary} />
              <Text style={styles.secondaryBtnText}>Review Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1.5,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      alignItems: 'center',
    },
    iconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    winIconCircle: {
      backgroundColor: 'rgba(7, 137, 48, 0.15)',
      borderColor: theme.brand.green.DEFAULT,
    },
    drawIconCircle: {
      backgroundColor: 'rgba(252, 221, 9, 0.15)',
      borderColor: theme.status.warning,
    },
    lossIconCircle: {
      backgroundColor: 'rgba(218, 18, 26, 0.15)',
      borderColor: theme.status.danger,
    },
    title: {
      fontSize: typography.titleMedium.fontSize,
      fontWeight: typography.titleMedium.fontWeight,
      color: theme.text.primary,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    description: {
      fontSize: typography.bodyRegular.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    ratingBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      backgroundColor: theme.surface.accent,
      borderWidth: 1,
      borderColor: theme.surface.border,
      marginBottom: spacing.lg,
    },
    ratingText: {
      fontSize: 12,
      fontFamily: 'monospace',
      fontWeight: '700',
      color: theme.brand.green.DEFAULT,
    },
    unratedBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      backgroundColor: theme.surface.accent,
      marginBottom: spacing.lg,
    },
    unratedText: {
      fontSize: 11,
      color: theme.text.muted,
    },
    actions: {
      width: '100%',
      gap: spacing.sm,
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
    },
    primaryBtn: {
      backgroundColor: theme.brand.green.DEFAULT,
    },
    primaryBtnText: {
      fontSize: typography.bodyRegular.fontSize,
      fontWeight: '700',
      color: '#ffffff',
    },
    secondaryBtn: {
      backgroundColor: 'transparent',
      borderColor: theme.surface.border,
      borderWidth: 1,
    },
    secondaryBtnText: {
      fontSize: typography.bodyRegular.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
  });

export default GameResultModal;
