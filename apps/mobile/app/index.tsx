import { useRouter } from 'expo-router';
import {
  Bot,
  ChevronRight,
  Cpu,
  Globe,
  History,
  Settings,
  Sparkles,
  Swords,
  User,
  Users,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Actions: History, Account & Settings */}
        <View style={styles.topActionsRow}>
          <Pressable
            onPress={() => router.push('/history')}
            style={({ pressed }) => [
              styles.topActionButton,
              pressed && styles.topActionButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Match History"
            testID="top-history-btn"
          >
            <History size={15} color={theme.text.primary} />
            <Text style={styles.topActionText}>History</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.topActionButton,
              pressed && styles.topActionButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            testID="top-profile-btn"
          >
            <User size={15} color={theme.text.primary} />
            <Text style={styles.topActionText}>Profile</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.topActionButton,
              pressed && styles.topActionButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            testID="top-settings-btn"
          >
            <Settings size={15} color={theme.text.primary} />
            <Text style={styles.topActionText}>Settings</Text>
          </Pressable>
        </View>

        {/* Brand Hero */}
        <View style={styles.heroSection}>
          <View style={styles.badgeContainer}>
            <Sparkles size={14} color={theme.brand.green.DEFAULT} />
            <Text style={styles.badgeText}>The Ethiopian Chess Platform</Text>
          </View>
          <Text style={styles.title}>ET Chess</Text>
          <Text style={styles.subtitle}>
            Play ranked games online, invite friends, or train against the Stockfish engine.
          </Text>
        </View>

        {/* 4 Direct Mode Selection Cards */}
        <View style={styles.cardContainer}>
          {/* Card 1: Play Online */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/play-online')}
            accessibilityRole="button"
            accessibilityLabel="Play Online"
            testID="home-card-online"
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, styles.onlineIconWrapper]}>
                <Globe size={24} color={theme.brand.green.DEFAULT} />
              </View>
              <View style={styles.tagBadge}>
                <Text style={[styles.tagText, { color: theme.brand.green.DEFAULT }]}>
                  Live Ranked
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Play Online</Text>
              <Text style={styles.cardDescription}>
                Instant matchmaking with rating expansion. Play Bullet, Blitz, and Rapid chess
                against rated opponents.
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={[styles.footerActionText, { color: theme.brand.green.DEFAULT }]}>
                Find Match
              </Text>
              <ChevronRight size={18} color={theme.brand.green.DEFAULT} />
            </View>
          </TouchableOpacity>

          {/* Card 2: Play a Friend */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/play-friend')}
            accessibilityRole="button"
            accessibilityLabel="Play a Friend"
            testID="home-card-friend"
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, styles.friendIconWrapper]}>
                <Users size={24} color={theme.brand.yellow.dark} />
              </View>
              <View style={styles.tagBadge}>
                <Text style={[styles.tagText, { color: theme.brand.yellow.dark }]}>
                  Invite Code
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Play a Friend</Text>
              <Text style={styles.cardDescription}>
                Share a challenge code or link and play head-to-head with friends with custom
                clocks.
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={[styles.footerActionText, { color: theme.brand.yellow.dark }]}>
                Create Challenge
              </Text>
              <ChevronRight size={18} color={theme.brand.yellow.dark} />
            </View>
          </TouchableOpacity>

          {/* Card 3: Play vs Bot */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/play-computer')}
            accessibilityRole="button"
            accessibilityLabel="Play vs Computer"
            testID="home-card-computer"
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, styles.botIconWrapper]}>
                <Bot size={24} color={theme.board.light} />
              </View>
              <View style={styles.tagBadge}>
                <Cpu size={12} color={theme.board.light} />
                <Text style={styles.tagText}>Stockfish WASM</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Play Computer</Text>
              <Text style={styles.cardDescription}>
                Battle Stockfish with zero latency. Configurable skill levels from casual beginner
                to master tier.
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerActionText}>Start Engine Match</Text>
              <ChevronRight size={18} color={theme.board.light} />
            </View>
          </TouchableOpacity>

          {/* Card 4: Pass & Play */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/play-local')}
            accessibilityRole="button"
            accessibilityLabel="Pass and Play"
            testID="home-card-local"
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, styles.localIconWrapper]}>
                <Swords size={24} color={theme.text.primary} />
              </View>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>1 Device</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Pass and Play</Text>
              <Text style={styles.cardDescription}>
                Play head-to-head on this screen. Full legal move validation, auto-flipping, and
                optional timers.
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerActionText}>Start Local Match</Text>
              <ChevronRight size={18} color={theme.board.light} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ET Chess 2.0 • Addis Ababa</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxxl,
    },
    topActionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.xs + 2,
      paddingVertical: spacing.xs,
      marginBottom: spacing.md,
    },
    topActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: theme.surface.accent,
      borderWidth: 1,
      borderColor: theme.surface.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: borderRadius.md,
    },
    topActionButtonPressed: {
      opacity: 0.8,
    },
    topActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text.primary,
    },
    heroSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      marginBottom: spacing.sm,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.brand.green.DEFAULT,
    },
    title: {
      fontSize: typography.titleLarge.fontSize,
      fontWeight: '900',
      color: theme.text.primary,
      letterSpacing: -0.5,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.bodyRegular.fontSize,
      color: theme.text.secondary,
      lineHeight: typography.bodyRegular.lineHeight,
      textAlign: 'center',
      maxWidth: 320,
      marginTop: 4,
    },
    cardContainer: {
      gap: spacing.md,
    },
    card: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    iconWrapper: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    onlineIconWrapper: {
      backgroundColor: 'rgba(7, 137, 48, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(7, 137, 48, 0.3)',
    },
    friendIconWrapper: {
      backgroundColor: 'rgba(252, 221, 9, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(252, 221, 9, 0.3)',
    },
    botIconWrapper: {
      backgroundColor: 'rgba(181, 136, 99, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(181, 136, 99, 0.4)',
    },
    localIconWrapper: {
      backgroundColor: theme.surface.accent,
      borderWidth: 1,
      borderColor: theme.surface.border,
    },
    tagBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      backgroundColor: theme.surface.accent,
      borderWidth: 1,
      borderColor: theme.surface.border,
    },
    tagText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.text.secondary,
      textTransform: 'uppercase',
    },
    cardBody: {
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: typography.titleMedium.fontSize,
      fontWeight: '800',
      color: theme.text.primary,
      marginBottom: 2,
    },
    cardDescription: {
      fontSize: typography.bodyRegular.fontSize,
      color: theme.text.secondary,
      lineHeight: typography.bodyRegular.lineHeight,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.sm + 2,
      borderTopWidth: 1,
      borderTopColor: theme.surface.border,
    },
    footerActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text.primary,
    },
    footer: {
      marginTop: spacing.xxl,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 11,
      color: theme.text.muted,
    },
  });
