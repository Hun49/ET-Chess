import type { ConnectionStatus } from '@et-chess/config';
import type { PlayerColor } from '@et-chess/types';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../../theme';
import { ClockDisplay } from './ClockDisplay';

export interface PlayerCardProps {
  color: PlayerColor;
  displayName: string;
  rating?: number;
  botLevelSpec?: string;
  isTurn: boolean;
  isGameOver?: boolean;
  isBot?: boolean;
  isBotThinking?: boolean;
  connection?: ConnectionStatus;
  timeMs: number;
}

export function PlayerCard({
  color,
  displayName,
  rating,
  botLevelSpec,
  isTurn,
  isGameOver = false,
  isBot = false,
  isBotThinking = false,
  connection,
  timeMs,
}: PlayerCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isWhite = color === 'white';
  const active = isTurn && !isGameOver;

  return (
    <View
      testID={`player-card-${color}`}
      style={[styles.card, active && styles.cardActive]}
      accessibilityRole="summary"
      accessibilityLabel={`${displayName}, ${isTurn ? 'Turn to move' : 'Waiting'}`}
    >
      <View style={styles.leftRow}>
        {/* Avatar Circle */}
        <View style={[styles.avatarCircle, isWhite ? styles.whiteAvatar : styles.blackAvatar]}>
          <Text style={[styles.avatarInitial, isWhite ? styles.whiteInitial : styles.blackInitial]}>
            {displayName[0] ?? (isWhite ? 'W' : 'B')}
          </Text>
        </View>

        {/* Player Name and Subtitle */}
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {displayName}
            </Text>
            {rating !== undefined ? (
              <Text style={styles.ratingText}>({rating})</Text>
            ) : botLevelSpec ? (
              <Text style={styles.specBadge}>{botLevelSpec}</Text>
            ) : null}
          </View>

          <View style={styles.statusRow}>
            {isBot && isBotThinking ? (
              <View style={styles.thinkingContainer}>
                <Text style={styles.thinkingText}>Thinking...</Text>
                <ActivityIndicator size="small" color={theme.status.warning} />
              </View>
            ) : (
              <View style={styles.turnIndicator}>
                <View
                  style={[styles.turnDot, active ? styles.turnDotActive : styles.turnDotInactive]}
                />
                <Text style={[styles.turnText, active && styles.turnTextActive]}>
                  {active ? 'To move' : 'Waiting'}
                </Text>
              </View>
            )}

            {connection && connection !== 'offline' && (
              <Text style={styles.connectionText}>• {connection}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Clock */}
      <ClockDisplay timeMs={timeMs} isActive={active} color={color} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    cardActive: {
      borderColor: theme.brand.green.DEFAULT,
      backgroundColor: theme.surface.card,
    },
    leftRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
      marginRight: spacing.sm,
    },
    avatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    whiteAvatar: {
      backgroundColor: theme.board.light,
      borderColor: theme.board.light,
    },
    blackAvatar: {
      backgroundColor: theme.board.dark,
      borderColor: theme.board.dark,
    },
    avatarInitial: {
      fontSize: 13,
      fontWeight: '800',
    },
    whiteInitial: {
      color: '#1a1a1a',
    },
    blackInitial: {
      color: '#ffffff',
    },
    nameBlock: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    nameText: {
      fontSize: typography.titleSmall.fontSize,
      fontWeight: '700',
      color: theme.text.primary,
    },
    ratingText: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: theme.text.muted,
    },
    specBadge: {
      fontSize: 9,
      fontFamily: 'monospace',
      color: theme.text.muted,
      backgroundColor: theme.surface.accent,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    turnIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    turnDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    turnDotActive: {
      backgroundColor: theme.brand.green.DEFAULT,
    },
    turnDotInactive: {
      backgroundColor: theme.surface.border,
    },
    turnText: {
      fontSize: 11,
      color: theme.text.muted,
    },
    turnTextActive: {
      color: theme.brand.green.DEFAULT,
      fontWeight: '600',
    },
    thinkingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    thinkingText: {
      fontSize: 11,
      color: theme.status.warning,
      fontWeight: '600',
    },
    connectionText: {
      fontSize: 10,
      color: theme.text.muted,
    },
  });

export default PlayerCard;
