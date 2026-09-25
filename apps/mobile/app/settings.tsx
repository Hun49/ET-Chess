import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Cpu, Info, Volume2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DIFFICULTY_OPTIONS } from '../src/navigation';
import { useGameStore } from '../src/store/gameStore';
import { borderRadius, spacing, themeColors, typography } from '../src/theme';

export default function SettingsScreen() {
  const router = useRouter();

  // Settings state wired to store
  const selectedDifficulty = useGameStore((state) => state.botDifficulty);
  const setBotDifficulty = useGameStore((state) => state.setBotDifficulty);

  const [moveSounds, setMoveSounds] = useState<boolean>(true);
  const [captureSounds, setCaptureSounds] = useState<boolean>(true);
  const [haptics, setHaptics] = useState<boolean>(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <ArrowLeft size={20} color={themeColors.text.primary} />
          </Pressable>
          <Text style={styles.navTitle}>Settings</Text>
          <View style={styles.navPlaceholder} />
        </View>

        {/* Section 1: Stockfish Difficulty */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Cpu size={18} color={themeColors.board.light} />
            <Text style={styles.sectionTitle}>Stockfish Engine Difficulty</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Configure the UCI search depth and skill level for offline bot play.
          </Text>

          <View style={styles.optionsList}>
            {DIFFICULTY_OPTIONS.map((tier) => {
              const isSelected = selectedDifficulty === tier.id;
              return (
                <Pressable
                  key={tier.id}
                  style={({ pressed }) => [
                    styles.tierCard,
                    isSelected && styles.tierCardSelected,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setBotDifficulty(tier.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${tier.title}: ${tier.subtitle}`}
                >
                  <View style={styles.tierInfo}>
                    <View style={styles.tierTitleRow}>
                      <Text style={[styles.tierTitle, isSelected && styles.tierTitleTextSelected]}>
                        {tier.title}
                      </Text>
                      <View style={[styles.tierBadge, isSelected && styles.tierBadgeSelected]}>
                        <Text
                          style={[styles.tierBadgeText, isSelected && styles.tierBadgeTextSelected]}
                        >
                          {tier.subtitle}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tierDescription}>{tier.description}</Text>
                  </View>

                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <Check size={14} color={themeColors.surface.base} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 2: Audio & Feedback */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Volume2 size={18} color={themeColors.board.light} />
            <Text style={styles.sectionTitle}>Audio & Haptics</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Feedback cues on piece movements, captures, and check alerts.
          </Text>

          <View style={styles.togglesCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextGroup}>
                <Text style={styles.toggleLabel}>Move Sounds</Text>
                <Text style={styles.toggleSublabel}>Audio click on piece placement</Text>
              </View>
              <Switch
                value={moveSounds}
                onValueChange={setMoveSounds}
                trackColor={{ false: themeColors.surface.accent, true: themeColors.board.dark }}
                thumbColor={moveSounds ? themeColors.board.light : themeColors.text.muted}
              />
            </View>

            <View style={styles.toggleDivider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextGroup}>
                <Text style={styles.toggleLabel}>Capture Sounds</Text>
                <Text style={styles.toggleSublabel}>Distinct sound effect on piece capture</Text>
              </View>
              <Switch
                value={captureSounds}
                onValueChange={setCaptureSounds}
                trackColor={{ false: themeColors.surface.accent, true: themeColors.board.dark }}
                thumbColor={captureSounds ? themeColors.board.light : themeColors.text.muted}
              />
            </View>

            <View style={styles.toggleDivider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextGroup}>
                <Text style={styles.toggleLabel}>Haptic Feedback</Text>
                <Text style={styles.toggleSublabel}>Gentle vibration on move confirmation</Text>
              </View>
              <Switch
                value={haptics}
                onValueChange={setHaptics}
                trackColor={{ false: themeColors.surface.accent, true: themeColors.board.dark }}
                thumbColor={haptics ? themeColors.board.light : themeColors.text.muted}
              />
            </View>
          </View>
        </View>

        {/* Section 3: App Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={18} color={themeColors.board.light} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <View style={styles.aboutCard}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Chess Engine</Text>
              <Text style={styles.aboutValue}>Stockfish UCI Engine</Text>
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Validation Core</Text>
              <Text style={styles.aboutValue}>chess.js Rules</Text>
            </View>
          </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
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
  },
  navTitle: {
    fontSize: typography.titleMedium.fontSize,
    fontWeight: typography.titleMedium.fontWeight,
    color: themeColors.text.primary,
  },
  navPlaceholder: {
    width: 40,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.titleSmall.fontSize,
    fontWeight: typography.titleSmall.fontWeight,
    color: themeColors.text.primary,
  },
  sectionSubtitle: {
    fontSize: typography.bodySmall.fontSize,
    color: themeColors.text.muted,
    marginBottom: spacing.md,
  },
  optionsList: {
    gap: spacing.sm,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  tierCardSelected: {
    borderColor: themeColors.board.light,
    backgroundColor: themeColors.surface.accent,
  },
  tierInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tierTitle: {
    fontSize: typography.titleSmall.fontSize,
    fontWeight: typography.titleSmall.fontWeight,
    color: themeColors.text.primary,
  },
  tierTitleTextSelected: {
    color: themeColors.board.light,
  },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: themeColors.surface.accent,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
  },
  tierBadgeSelected: {
    backgroundColor: 'rgba(240, 217, 181, 0.2)',
    borderColor: themeColors.board.light,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.text.muted,
  },
  tierBadgeTextSelected: {
    color: themeColors.board.light,
  },
  tierDescription: {
    fontSize: typography.bodySmall.fontSize,
    color: themeColors.text.secondary,
    lineHeight: typography.bodySmall.lineHeight,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: themeColors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: themeColors.board.light,
    backgroundColor: themeColors.board.light,
  },
  togglesCard: {
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  toggleTextGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: typography.bodyRegular.fontSize,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  toggleSublabel: {
    fontSize: typography.bodySmall.fontSize,
    color: themeColors.text.muted,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: themeColors.surface.border,
    marginVertical: spacing.sm,
  },
  aboutCard: {
    backgroundColor: themeColors.surface.card,
    borderColor: themeColors.surface.border,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  aboutLabel: {
    fontSize: typography.bodyRegular.fontSize,
    color: themeColors.text.muted,
  },
  aboutValue: {
    fontSize: typography.bodyRegular.fontSize,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
});
