import type { BotDifficulty } from '@et-chess/types';
import { useRouter } from 'expo-router';
import { ArrowLeft, Cpu, Swords } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DIFFICULTY_OPTIONS } from '../src/navigation';
import { useGameStore } from '../src/store/gameStore';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

export default function PlayComputerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('intermediate');
  const setBotDifficulty = useGameStore((s) => s.setBotDifficulty);

  const handleStartGame = () => {
    setBotDifficulty(selectedDifficulty);
    router.push({
      pathname: '/game',
      params: {
        mode: 'bot',
      },
    });
  };

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

          <Text style={styles.headerTitle}>Play Computer</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.badgeContainer}>
              <Cpu size={14} color={theme.board.light} />
              <Text style={styles.badgeText}>Stockfish 16 Engine</Text>
            </View>
            <Text style={styles.title}>Engine Match</Text>
            <Text style={styles.subtitle}>
              Challenge our embedded Stockfish engine running locally on your device with zero lag.
            </Text>
          </View>

          {/* Difficulty Tiers */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Select Skill Level</Text>
            <View style={styles.tierList}>
              {DIFFICULTY_OPTIONS.map((tier) => {
                const isSelected = selectedDifficulty === tier.id;
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[styles.tierCard, isSelected && styles.tierCardSelected]}
                    onPress={() => setSelectedDifficulty(tier.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Difficulty ${tier.title}`}
                    testID={`bot-tier-${tier.id}`}
                  >
                    <View style={styles.tierTop}>
                      <View style={styles.tierTitleBlock}>
                        <Text style={[styles.tierTitle, isSelected && styles.tierTitleSelected]}>
                          {tier.title}
                        </Text>
                        <Text style={styles.tierSubtitle}>{tier.subtitle}</Text>
                      </View>
                      <View
                        style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}
                      />
                    </View>
                    <Text style={styles.tierDescription}>{tier.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Start Engine Match Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleStartGame}
            accessibilityRole="button"
            accessibilityLabel="Start engine match"
            testID="start-bot-match-btn"
          >
            <Swords size={20} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Start Engine Match</Text>
          </TouchableOpacity>
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
    heroSection: {
      alignItems: 'center',
      marginVertical: spacing.md,
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
      color: theme.board.light,
    },
    title: {
      fontSize: typography.titleLarge.fontSize,
      fontWeight: '800',
      color: theme.text.primary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.bodyRegular.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginTop: 4,
      maxWidth: 300,
    },
    section: {
      marginTop: spacing.lg,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    tierList: {
      gap: spacing.sm,
    },
    tierCard: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    tierCardSelected: {
      borderColor: theme.board.light,
      borderWidth: 2,
    },
    tierTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    tierTitleBlock: {
      gap: 2,
    },
    tierTitle: {
      fontSize: typography.titleSmall.fontSize,
      fontWeight: '700',
      color: theme.text.primary,
    },
    tierTitleSelected: {
      color: theme.board.light,
    },
    tierSubtitle: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: theme.text.muted,
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: theme.surface.border,
    },
    radioCircleSelected: {
      borderColor: theme.board.light,
      backgroundColor: theme.board.light,
    },
    tierDescription: {
      fontSize: typography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 4,
    },
    primaryBtn: {
      backgroundColor: theme.brand.green.DEFAULT,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
      shadowColor: theme.brand.green.DEFAULT,
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    primaryBtnText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '800',
    },
  });
