import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Cpu, Info, Palette, Volume2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DIFFICULTY_OPTIONS } from '../src/navigation';
import { useGameStore } from '../src/store/gameStore';
import {
  borderRadius,
  spacing,
  type Theme,
  typography,
  useTheme,
  useThemeStore,
} from '../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const styles = useMemo(() => createStyles(theme), [theme]);

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
            <ArrowLeft size={20} color={theme.text.primary} />
          </Pressable>
          <Text style={styles.navTitle}>Settings</Text>
          <View style={styles.navPlaceholder} />
        </View>

        {/* Section 1: Stockfish Difficulty */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Cpu size={18} color={theme.board.light} />
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
                    {isSelected && <Check size={14} color={theme.surface.base} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section: Appearance & Theme */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={18} color={theme.board.light} />
            <Text style={styles.sectionTitle}>Appearance & Theme</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Choose between dark mode, clean light mode, or match device system settings.
          </Text>

          <View style={styles.optionsList}>
            {[
              {
                id: 'system' as const,
                title: 'System Default',
                subtitle: 'Follow device appearance setting',
              },
              {
                id: 'dark' as const,
                title: 'Dark Charcoal',
                subtitle: 'Refined deep charcoal background',
              },
              {
                id: 'light' as const,
                title: 'Light Minimal',
                subtitle: 'Crisp white with elevated cards',
              },
            ].map((option) => {
              const isSelected = themeMode === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.tierCard,
                    isSelected && styles.tierCardSelected,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setThemeMode(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${option.title}: ${option.subtitle}`}
                >
                  <View style={styles.tierInfo}>
                    <View style={styles.tierTitleRow}>
                      <Text style={[styles.tierTitle, isSelected && styles.tierTitleTextSelected]}>
                        {option.title}
                      </Text>
                    </View>
                    <Text style={styles.tierDescription}>{option.subtitle}</Text>
                  </View>

                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <Check size={14} color={theme.surface.base} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 2: Audio & Feedback */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Volume2 size={18} color={theme.board.light} />
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
                trackColor={{ false: theme.surface.accent, true: theme.board.dark }}
                thumbColor={moveSounds ? theme.board.light : theme.text.muted}
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
                trackColor={{ false: theme.surface.accent, true: theme.board.dark }}
                thumbColor={captureSounds ? theme.board.light : theme.text.muted}
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
                trackColor={{ false: theme.surface.accent, true: theme.board.dark }}
                thumbColor={haptics ? theme.board.light : theme.text.muted}
              />
            </View>
          </View>
        </View>

        {/* Section 3: App Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={18} color={theme.board.light} />
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
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
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
      color: theme.text.primary,
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
      color: theme.text.primary,
    },
    sectionSubtitle: {
      fontSize: typography.bodySmall.fontSize,
      color: theme.text.muted,
      marginBottom: spacing.md,
    },
    optionsList: {
      gap: spacing.sm,
    },
    tierCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    tierCardSelected: {
      borderColor: theme.board.light,
      backgroundColor: theme.surface.accent,
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
      color: theme.text.primary,
    },
    tierTitleTextSelected: {
      color: theme.board.light,
    },
    tierBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: theme.surface.accent,
      borderColor: theme.surface.border,
      borderWidth: 1,
    },
    tierBadgeSelected: {
      backgroundColor: 'rgba(240, 217, 181, 0.2)',
      borderColor: theme.board.light,
    },
    tierBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.text.muted,
    },
    tierBadgeTextSelected: {
      color: theme.board.light,
    },
    tierDescription: {
      fontSize: typography.bodySmall.fontSize,
      color: theme.text.secondary,
      lineHeight: typography.bodySmall.lineHeight,
    },
    radioCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.surface.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleSelected: {
      borderColor: theme.board.light,
      backgroundColor: theme.board.light,
    },
    togglesCard: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
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
      color: theme.text.primary,
    },
    toggleSublabel: {
      fontSize: typography.bodySmall.fontSize,
      color: theme.text.muted,
    },
    toggleDivider: {
      height: 1,
      backgroundColor: theme.surface.border,
      marginVertical: spacing.sm,
    },
    aboutCard: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
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
      color: theme.text.muted,
    },
    aboutValue: {
      fontSize: typography.bodyRegular.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
  });
