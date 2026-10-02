import { useRouter } from 'expo-router';
import { ArrowLeft, Flame, Shield, User, Zap } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileHistoryStore } from '../src/store/historyStore';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const stats = useMobileHistoryStore((s) => s.getStats)();

  const ratings = [
    { name: 'Bullet', rating: 1520, icon: Flame, color: theme.brand.yellow.dark },
    { name: 'Blitz', rating: 1540, icon: Zap, color: theme.brand.green.DEFAULT },
    { name: 'Rapid', rating: 1610, icon: Shield, color: theme.board.light },
  ];

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

          <Text style={styles.headerTitle}>Player Profile</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Card */}
          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <User size={36} color={theme.brand.green.DEFAULT} />
            </View>

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>Guest Player</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>
              <Text style={styles.userSub}>Member since 2026 • Addis Ababa</Text>
            </View>
          </View>

          {/* Ratings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Ratings</Text>
            <View style={styles.ratingRow}>
              {ratings.map((r) => {
                const Icon = r.icon;
                return (
                  <View
                    key={r.name}
                    style={styles.ratingCard}
                    testID={`profile-rating-${r.name.toLowerCase()}`}
                  >
                    <Icon size={20} color={r.color} />
                    <Text style={styles.ratingValue}>{r.rating}</Text>
                    <Text style={styles.ratingLabel}>{r.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Lifetime Performance Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Lifetime Record</Text>
            <View style={styles.statsCard}>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Matches</Text>
                  <Text style={styles.statValue}>{stats.total}</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Wins</Text>
                  <Text style={[styles.statValue, { color: theme.brand.green.DEFAULT }]}>
                    {stats.wins}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Losses</Text>
                  <Text style={[styles.statValue, { color: theme.status.danger }]}>
                    {stats.losses}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Win Rate</Text>
                  <Text style={[styles.statValue, { color: theme.brand.green.DEFAULT }]}>
                    {stats.winRate}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
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
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      marginTop: spacing.sm,
    },
    avatarCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(7, 137, 48, 0.15)',
      borderWidth: 1.5,
      borderColor: theme.brand.green.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameBlock: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    userName: {
      fontSize: typography.titleMedium.fontSize,
      fontWeight: '800',
      color: theme.text.primary,
    },
    statusBadge: {
      backgroundColor: 'rgba(7, 137, 48, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: borderRadius.round,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.brand.green.DEFAULT,
      textTransform: 'uppercase',
    },
    userSub: {
      fontSize: 11,
      color: theme.text.muted,
      marginTop: 2,
    },
    section: {
      marginTop: spacing.xl,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    ratingRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    ratingCard: {
      flex: 1,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      gap: 4,
    },
    ratingValue: {
      fontSize: 18,
      fontWeight: '800',
      fontFamily: 'monospace',
      color: theme.text.primary,
    },
    ratingLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.text.muted,
      textTransform: 'uppercase',
    },
    statsCard: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statItem: {
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 11,
      color: theme.text.muted,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'monospace',
      color: theme.text.primary,
    },
  });
