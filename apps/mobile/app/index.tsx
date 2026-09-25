import { useRouter } from 'expo-router';
import { Bot, ChevronRight, Cpu, Settings, Sparkles, Swords, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, spacing, themeColors, typography } from '../src/theme';

export default function HomeScreen() {
  const router = useRouter();

  const handlePlayBot = () => {
    router.push({ pathname: '/game', params: { mode: 'bot' } });
  };

  const handlePassAndPlay = () => {
    router.push({ pathname: '/game', params: { mode: 'local' } });
  };

  const handleOpenSettings = () => {
    router.push('/settings');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header / Brand Hero */}
        <View style={styles.heroSection}>
          <View style={styles.badgeContainer}>
            <Sparkles size={14} color={themeColors.board.light} />
            <Text style={styles.badgeText}>Minimalist Chess Experience</Text>
          </View>
          <Text style={styles.title}>ET Chess</Text>
          <Text style={styles.subtitle}>
            Master every position. Challenge local Stockfish offline or play head-to-head on this
            device.
          </Text>
        </View>

        {/* Game Mode Selection Cards */}
        <View style={styles.cardContainer}>
          {/* Card 1: Play vs Bot */}
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={handlePlayBot}
            accessibilityRole="button"
            accessibilityLabel="Play vs Bot"
          >
            <View style={styles.cardHeader}>
              <View style={styles.botIconWrapper}>
                <Bot size={26} color={themeColors.board.light} />
              </View>
              <View style={styles.tagBadge}>
                <Cpu size={12} color={themeColors.board.light} />
                <Text style={styles.tagText}>Stockfish Engine</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Play vs Bot</Text>
                <View style={styles.levelTag}>
                  <Text style={styles.levelTagText}>Depth 10</Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>
                Battle Stockfish with zero latency. Configurable skill levels from casual beginner
                to master tier.
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerActionText}>Start Engine Match</Text>
              <ChevronRight size={18} color={themeColors.board.light} />
            </View>
          </Pressable>

          {/* Card 2: Pass and Play */}
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={handlePassAndPlay}
            accessibilityRole="button"
            accessibilityLabel="Pass and Play"
          >
            <View style={styles.cardHeader}>
              <View style={styles.usersIconWrapper}>
                <Users size={26} color={themeColors.text.primary} />
              </View>
              <View style={styles.localTagBadge}>
                <Swords size={12} color={themeColors.text.secondary} />
                <Text style={styles.localTagText}>Over-the-Board</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Pass and Play</Text>
                <View style={styles.levelTag}>
                  <Text style={styles.levelTagText}>2 Players</Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>
                Play head-to-head with a companion on the same screen. Full legal move validation
                and auto-flipping.
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerActionText}>Start Local Match</Text>
              <ChevronRight size={18} color={themeColors.board.light} />
            </View>
          </Pressable>

          {/* Card 3: Settings */}
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={handleOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Game Settings"
          >
            <View style={styles.cardHeader}>
              <View style={styles.settingsIconWrapper}>
                <Settings size={24} color={themeColors.text.muted} />
              </View>
              <View style={styles.settingsTagBadge}>
                <Text style={styles.settingsTagText}>Engine & Audio</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Settings</Text>
              <Text style={styles.cardDescription}>
                Select bot difficulty tier, adjust sound cues, and customize board appearance.
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerActionText}>Configure Preferences</Text>
              <ChevronRight size={18} color={themeColors.text.secondary} />
            </View>
          </Pressable>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ET Chess 1.0.0 • Offline First Architecture</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.surface.base,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: typography.badge.fontSize,
    fontWeight: typography.badge.fontWeight,
    color: themeColors.board.light,
  },
  title: {
    fontSize: typography.titleLarge.fontSize,
    fontWeight: typography.titleLarge.fontWeight,
    color: themeColors.text.primary,
    letterSpacing: typography.titleLarge.letterSpacing,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.bodyRegular.fontSize,
    color: themeColors.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight,
    textAlign: 'center',
    maxWidth: 320,
  },
  cardContainer: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  cardPressed: {
    borderColor: themeColors.board.dark,
    backgroundColor: themeColors.surface.accent,
    opacity: 0.95,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  botIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(181, 136, 99, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(181, 136, 99, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  usersIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: themeColors.surface.accent,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: themeColors.surface.accent,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(181, 136, 99, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(181, 136, 99, 0.35)',
  },
  tagText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: themeColors.board.light,
  },
  localTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: themeColors.surface.accent,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
  },
  localTagText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: themeColors.text.secondary,
  },
  settingsTagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: themeColors.surface.accent,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
  },
  settingsTagText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '500',
    color: themeColors.text.muted,
  },
  cardBody: {
    marginBottom: spacing.lg,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.titleMedium.fontSize,
    fontWeight: typography.titleMedium.fontWeight,
    color: themeColors.text.primary,
  },
  levelTag: {
    backgroundColor: themeColors.surface.accent,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  levelTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.text.secondary,
  },
  cardDescription: {
    fontSize: typography.bodyRegular.fontSize,
    color: themeColors.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.surface.border,
  },
  footerActionText: {
    fontSize: typography.bodyRegular.fontSize,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.bodySmall.fontSize,
    color: themeColors.text.muted,
  },
});
