import { formatClockTime } from '@et-chess/config';
import { Timer } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../../theme';

export interface ClockDisplayProps {
  timeMs: number;
  isActive: boolean;
  color?: 'white' | 'black';
}

export function ClockDisplay({ timeMs, isActive, color = 'white' }: ClockDisplayProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isLowTime = timeMs <= 20000 && timeMs > 0;
  const isVeryLow = timeMs <= 10000 && timeMs > 0;
  const isZero = timeMs <= 0;

  const timerColor = isActive
    ? isVeryLow
      ? theme.status.danger
      : isLowTime
        ? theme.status.warning
        : theme.brand.green.DEFAULT
    : theme.text.muted;

  return (
    <View
      testID={`clock-display-${color}`}
      style={[
        styles.container,
        isActive && styles.activeContainer,
        isLowTime && isActive && styles.lowTimeContainer,
        isZero && styles.zeroContainer,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Clock ${formatClockTime(timeMs)}`}
    >
      <Timer size={13} color={timerColor} />
      <Text
        testID={`clock-time-${color}`}
        style={[
          styles.timeText,
          isActive && styles.activeTimeText,
          isLowTime && isActive && styles.lowTimeText,
          isZero && styles.zeroTimeText,
        ]}
      >
        {formatClockTime(timeMs)}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface.accent,
      borderWidth: 1,
      borderColor: theme.surface.border,
    },
    activeContainer: {
      borderColor: theme.brand.green.DEFAULT,
      backgroundColor: theme.surface.card,
    },
    lowTimeContainer: {
      borderColor: theme.status.warning,
      backgroundColor: 'rgba(234, 179, 8, 0.1)',
    },
    zeroContainer: {
      borderColor: theme.status.danger,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    timeText: {
      fontFamily: 'monospace',
      fontSize: typography.bodyRegular.fontSize,
      fontWeight: '700',
      color: theme.text.muted,
    },
    activeTimeText: {
      color: theme.text.primary,
    },
    lowTimeText: {
      color: theme.status.warning,
    },
    zeroTimeText: {
      color: theme.status.danger,
    },
  });

export default ClockDisplay;
