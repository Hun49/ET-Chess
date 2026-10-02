import type { AllowedActions } from '@et-chess/config';
import { ArrowUpDown, Flag, Handshake, Undo2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../../theme';

export interface GameActionBarProps {
  allowedActions: AllowedActions;
  isGameOver: boolean;
  onFlipBoard: () => void;
  onResign: () => void;
  onDrawOffer: () => void;
  onTakeback?: () => void;
}

export function GameActionBar({
  allowedActions,
  isGameOver,
  onFlipBoard,
  onResign,
  onDrawOffer,
  onTakeback,
}: GameActionBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleResignPress = () => {
    if (isGameOver) return;
    Alert.alert(
      'Resign Match?',
      'Are you sure you want to resign? Victory will be conceded to your opponent.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resign', style: 'destructive', onPress: onResign },
      ],
    );
  };

  const handleDrawPress = () => {
    if (isGameOver) return;
    Alert.alert('Offer Draw?', 'Conclude this match with a mutual draw agreement?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Offer Draw', onPress: onDrawOffer },
    ]);
  };

  return (
    <View style={styles.container} testID="game-action-bar">
      {/* Flip Board */}
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={onFlipBoard}
        accessibilityRole="button"
        accessibilityLabel="Flip chessboard orientation"
        testID="flip-board-button"
      >
        <ArrowUpDown size={15} color={theme.text.primary} />
        <Text style={styles.btnText}>Flip</Text>
      </Pressable>

      {/* Takeback */}
      {allowedActions.takeback && onTakeback && (
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            isGameOver && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          onPress={onTakeback}
          disabled={isGameOver}
          accessibilityRole="button"
          accessibilityLabel="Takeback move"
          testID="takeback-button"
        >
          <Undo2 size={15} color={theme.text.primary} />
          <Text style={styles.btnText}>Takeback</Text>
        </Pressable>
      )}

      {/* Draw */}
      {allowedActions.drawOffer && (
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            isGameOver && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          onPress={handleDrawPress}
          disabled={isGameOver}
          accessibilityRole="button"
          accessibilityLabel="Offer draw"
          testID="draw-button"
        >
          <Handshake size={15} color={theme.status.warning} />
          <Text style={styles.btnText}>Draw</Text>
        </Pressable>
      )}

      {/* Resign */}
      {allowedActions.resign && (
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.resignBtn,
            isGameOver && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          onPress={handleResignPress}
          disabled={isGameOver}
          accessibilityRole="button"
          accessibilityLabel="Resign match"
          testID="resign-button"
        >
          <Flag size={15} color={theme.status.danger} />
          <Text style={styles.resignText}>Resign</Text>
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'space-between',
    },
    btn: {
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
    btnPressed: {
      opacity: 0.7,
      backgroundColor: theme.surface.accent,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    btnText: {
      fontSize: typography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    resignBtn: {
      borderColor: 'rgba(239, 68, 68, 0.4)',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    resignText: {
      fontSize: typography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.status.danger,
    },
  });

export default GameActionBar;
