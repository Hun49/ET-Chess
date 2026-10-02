import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../../theme';

export interface MoveHistoryStripProps {
  sanMoves: string[];
}

export function MoveHistoryStrip({ sanMoves }: MoveHistoryStripProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
    <View style={styles.container} testID="move-history-strip">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {movePairs.length === 0 ? (
          <Text style={styles.emptyText}>No moves played yet</Text>
        ) : (
          movePairs.map((pair) => (
            <View key={pair.number} style={styles.pairItem}>
              <Text style={styles.moveNumber}>{pair.number}.</Text>
              <Text style={styles.moveWhite}>{pair.white}</Text>
              {pair.black ? <Text style={styles.moveBlack}>{pair.black}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      height: 34,
      justifyContent: 'center',
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyText: {
      fontSize: typography.bodySmall.fontSize,
      color: theme.text.muted,
      fontStyle: 'italic',
    },
    pairItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    moveNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text.muted,
    },
    moveWhite: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text.primary,
    },
    moveBlack: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.board.light,
    },
  });

export default MoveHistoryStrip;
