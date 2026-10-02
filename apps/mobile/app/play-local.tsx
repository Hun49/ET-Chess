import { TIME_CONTROL_PRESETS, type TimeControlOption } from '@et-chess/config';
import { useRouter } from 'expo-router';
import { ArrowLeft, Play, Swords } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

export default function PlayLocalScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [player1Name, setPlayer1Name] = useState('Player 1 (White)');
  const [player2Name, setPlayer2Name] = useState('Player 2 (Black)');
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption | null>(null);

  const handleStartGame = () => {
    router.push({
      pathname: '/game',
      params: {
        mode: 'local',
        minutes: selectedTimeControl ? selectedTimeControl.minutes.toString() : '0',
        increment: selectedTimeControl ? selectedTimeControl.increment.toString() : '0',
        opponent: player2Name,
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

          <Text style={styles.headerTitle}>Pass & Play</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.badgeContainer}>
              <Swords size={14} color={theme.text.secondary} />
              <Text style={styles.badgeText}>Over The Board</Text>
            </View>
            <Text style={styles.title}>Local Match</Text>
            <Text style={styles.subtitle}>
              Pass and play head-to-head on the same device with full rule validation.
            </Text>
          </View>

          {/* Player Names Input */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Player Names</Text>

            <View style={styles.inputCard}>
              <View style={styles.inputRow}>
                <View style={[styles.avatarDot, styles.whiteDot]} />
                <TextInput
                  style={styles.textInput}
                  value={player1Name}
                  onChangeText={setPlayer1Name}
                  placeholder="Player 1 (White)"
                  placeholderTextColor={theme.text.muted}
                  testID="player1-name-input"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.inputRow}>
                <View style={[styles.avatarDot, styles.blackDot]} />
                <TextInput
                  style={styles.textInput}
                  value={player2Name}
                  onChangeText={setPlayer2Name}
                  placeholder="Player 2 (Black)"
                  placeholderTextColor={theme.text.muted}
                  testID="player2-name-input"
                />
              </View>
            </View>
          </View>

          {/* Clock Options */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Timer Option</Text>
            <View style={styles.clockGrid}>
              <TouchableOpacity
                style={[styles.clockBtn, selectedTimeControl === null && styles.clockBtnSelected]}
                onPress={() => setSelectedTimeControl(null)}
                testID="local-clock-none"
              >
                <Text
                  style={[
                    styles.clockBtnText,
                    selectedTimeControl === null && styles.clockBtnTextSelected,
                  ]}
                >
                  Untimed
                </Text>
              </TouchableOpacity>

              {TIME_CONTROL_PRESETS.slice(2, 5).map((tc) => {
                const isSelected = selectedTimeControl?.id === tc.id;
                return (
                  <TouchableOpacity
                    key={tc.id}
                    style={[styles.clockBtn, isSelected && styles.clockBtnSelected]}
                    onPress={() => setSelectedTimeControl(tc)}
                    testID={`local-clock-${tc.id}`}
                  >
                    <Text style={[styles.clockBtnText, isSelected && styles.clockBtnTextSelected]}>
                      {tc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Start Local Match Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleStartGame}
            accessibilityRole="button"
            accessibilityLabel="Start local game"
            testID="start-local-match-btn"
          >
            <Play size={18} color="#ffffff" fill="#ffffff" />
            <Text style={styles.primaryBtnText}>Start Match</Text>
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
      color: theme.text.secondary,
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
    inputCard: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    avatarDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1.5,
    },
    whiteDot: {
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
    },
    blackDot: {
      backgroundColor: '#1a1a1a',
      borderColor: '#4b5563',
    },
    textInput: {
      flex: 1,
      fontSize: typography.bodyRegular.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      paddingVertical: 4,
    },
    divider: {
      height: 1,
      backgroundColor: theme.surface.border,
    },
    clockGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    clockBtn: {
      flex: 1,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clockBtnSelected: {
      borderColor: theme.brand.green.DEFAULT,
      borderWidth: 2,
    },
    clockBtnText: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'monospace',
      color: theme.text.muted,
    },
    clockBtnTextSelected: {
      color: theme.brand.green.DEFAULT,
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
