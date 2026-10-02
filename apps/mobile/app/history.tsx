import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, Trash2, Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileHistoryStore } from '../src/store/historyStore';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const games = useMobileHistoryStore((s) => s.games);
  const clearHistory = useMobileHistoryStore((s) => s.clearHistory);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
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

          <Text style={styles.headerTitle}>Match History</Text>

          {games.length > 0 ? (
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
              onPress={clearHistory}
              accessibilityRole="button"
              accessibilityLabel="Clear history"
              testID="clear-history-btn"
            >
              <Trash2 size={18} color={theme.status.danger} />
            </Pressable>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {games.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Trophy size={36} color={theme.text.muted} />
              </View>
              <Text style={styles.emptyTitle}>No Games Played Yet</Text>
              <Text style={styles.emptySubtitle}>
                Completed matches will appear here for move review and replay.
              </Text>
              <TouchableOpacity
                style={styles.playNowBtn}
                onPress={() => router.push('/play-online')}
              >
                <Text style={styles.playNowBtnText}>Play a Match</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.gameList}>
              {games.map((g) => {
                const isDraw = g.result.outcome === 'draw';
                const isWin = g.result.outcome === g.playerColor;

                return (
                  <View key={g.id} style={styles.gameCard} testID={`history-game-${g.id}`}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View
                          style={[
                            styles.scoreBadge,
                            isDraw ? styles.drawBadge : isWin ? styles.winBadge : styles.lossBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.scoreText,
                              isDraw
                                ? styles.drawScoreText
                                : isWin
                                  ? styles.winScoreText
                                  : styles.lossScoreText,
                            ]}
                          >
                            {isDraw ? '½-½' : isWin ? '1-0' : '0-1'}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.opponentName}>vs {g.opponent}</Text>
                          <Text style={styles.gameDetails}>
                            {g.timeControl} • {g.mode.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.reviewBtn}
                        onPress={() =>
                          router.push({
                            pathname: '/review',
                            params: { id: g.id },
                          })
                        }
                        testID={`review-game-btn-${g.id}`}
                      >
                        <Eye size={14} color={theme.brand.green.DEFAULT} />
                        <Text style={styles.reviewBtnText}>Review</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.reasonText}>{g.result.reason}</Text>
                      <Text style={styles.moveCountText}>
                        {g.moveCount} moves • {new Date(g.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
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
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
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
    headerTitle: {
      fontSize: typography.titleSmall.fontSize,
      fontWeight: '700',
      color: theme.text.primary,
    },
    scrollContent: {
      paddingBottom: spacing.xxl,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.surface.card,
      borderWidth: 1,
      borderColor: theme.surface.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: typography.titleMedium.fontSize,
      fontWeight: '700',
      color: theme.text.primary,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: typography.bodyRegular.fontSize,
      color: theme.text.muted,
      textAlign: 'center',
      maxWidth: 260,
      marginBottom: spacing.xl,
    },
    playNowBtn: {
      backgroundColor: theme.brand.green.DEFAULT,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
    },
    playNowBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    gameList: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    gameCard: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    scoreBadge: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    winBadge: {
      backgroundColor: 'rgba(7, 137, 48, 0.15)',
      borderColor: theme.brand.green.DEFAULT,
    },
    drawBadge: {
      backgroundColor: 'rgba(252, 221, 9, 0.15)',
      borderColor: theme.status.warning,
    },
    lossBadge: {
      backgroundColor: 'rgba(218, 18, 26, 0.15)',
      borderColor: theme.status.danger,
    },
    scoreText: {
      fontSize: 12,
      fontWeight: '800',
      fontFamily: 'monospace',
    },
    winScoreText: {
      color: theme.brand.green.DEFAULT,
    },
    drawScoreText: {
      color: theme.status.warning,
    },
    lossScoreText: {
      color: theme.status.danger,
    },
    opponentName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text.primary,
    },
    gameDetails: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: theme.text.muted,
      marginTop: 2,
    },
    reviewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface.accent,
      borderWidth: 1,
      borderColor: theme.surface.border,
    },
    reviewBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.brand.green.DEFAULT,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: theme.surface.border,
    },
    reasonText: {
      fontSize: 11,
      color: theme.text.secondary,
    },
    moveCountText: {
      fontSize: 10,
      fontFamily: 'monospace',
      color: theme.text.muted,
    },
  });
