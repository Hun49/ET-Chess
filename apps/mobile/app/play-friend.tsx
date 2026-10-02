import { TIME_CONTROL_PRESETS, type TimeControlOption } from '@et-chess/config';
import { useRouter } from 'expo-router';
import { ArrowLeft, Share2, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

export default function PlayFriendScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(
    TIME_CONTROL_PRESETS[6] ??
      TIME_CONTROL_PRESETS[0] ?? { label: '10 min', minutes: 10, increment: 0, category: 'rapid' },
  );
  const [preferredColor, setPreferredColor] = useState<'white' | 'black' | 'random'>('random');
  const [isWaiting, setIsWaiting] = useState(false);
  const [roomCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  const handleStartMatch = () => {
    router.push({
      pathname: '/game',
      params: {
        mode: 'friend',
        minutes: selectedTimeControl.minutes.toString(),
        increment: selectedTimeControl.increment.toString(),
        opponent: 'Friend (Challenger)',
        rating: '1480',
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

          <Text style={styles.headerTitle}>Play a Friend</Text>
          <View style={{ width: 38 }} />
        </View>

        {!isWaiting ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroSection}>
              <View style={styles.badgeContainer}>
                <Users size={14} color={theme.brand.yellow.dark} />
                <Text style={styles.badgeText}>Direct Challenge</Text>
              </View>
              <Text style={styles.title}>Challenge a Friend</Text>
              <Text style={styles.subtitle}>
                Create an instant match and share your invite link.
              </Text>
            </View>

            {/* Time Control Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Time Control</Text>
              <View style={styles.grid2}>
                {TIME_CONTROL_PRESETS.slice(0, 6).map((tc) => {
                  const isSelected = selectedTimeControl.id === tc.id;
                  return (
                    <TouchableOpacity
                      key={tc.id}
                      style={[styles.smallCard, isSelected && styles.smallCardSelected]}
                      onPress={() => setSelectedTimeControl(tc)}
                      accessibilityRole="button"
                      accessibilityLabel={`Time control ${tc.label}`}
                      testID={`friend-tc-${tc.id}`}
                    >
                      <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                        {tc.label}
                      </Text>
                      <Text style={styles.cardCategory}>{tc.category}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Color Choice */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Your Color</Text>
              <View style={styles.grid3}>
                {(['white', 'random', 'black'] as const).map((c) => {
                  const isSelected = preferredColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorCard, isSelected && styles.colorCardSelected]}
                      onPress={() => setPreferredColor(c)}
                      accessibilityRole="button"
                      accessibilityLabel={`Color ${c}`}
                      testID={`color-choice-${c}`}
                    >
                      <View
                        style={[
                          styles.colorCircle,
                          c === 'white'
                            ? styles.whiteCircle
                            : c === 'black'
                              ? styles.blackCircle
                              : styles.randomCircle,
                        ]}
                      />
                      <Text style={[styles.colorText, isSelected && styles.colorTextSelected]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setIsWaiting(true)}
              accessibilityRole="button"
              accessibilityLabel="Generate invite link"
              testID="create-friend-challenge-btn"
            >
              <Share2 size={18} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Generate Invite Code</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.waitingContainer} testID="waiting-friend-card">
            <View style={styles.waitingCircle}>
              <ActivityIndicator size="large" color={theme.brand.green.DEFAULT} />
            </View>

            <Text style={styles.waitingTitle}>Waiting for Friend...</Text>
            <Text style={styles.waitingSubtitle}>Share this invite code to start playing:</Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeText} testID="room-code">
                {roomCode}
              </Text>
            </View>

            <View style={styles.waitingActions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleStartMatch}
                accessibilityRole="button"
                accessibilityLabel="Friend joined, start match"
                testID="simulate-friend-join-btn"
              >
                <Users size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Friend Joined (Start)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsWaiting(false)}>
                <Text style={styles.cancelBtnText}>Back to Setup</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
      color: theme.brand.yellow.dark,
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
    grid2: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    smallCard: {
      width: '48%',
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: 'center',
    },
    smallCardSelected: {
      borderColor: theme.brand.green.DEFAULT,
      borderWidth: 2,
    },
    cardLabel: {
      fontSize: 15,
      fontWeight: '800',
      fontFamily: 'monospace',
      color: theme.text.primary,
    },
    cardLabelSelected: {
      color: theme.brand.green.DEFAULT,
    },
    cardCategory: {
      fontSize: 10,
      color: theme.text.muted,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    grid3: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    colorCard: {
      flex: 1,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: 'center',
      gap: 6,
    },
    colorCardSelected: {
      borderColor: theme.brand.green.DEFAULT,
      borderWidth: 2,
    },
    colorCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
    },
    whiteCircle: {
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
    },
    blackCircle: {
      backgroundColor: '#1a1a1a',
      borderColor: '#4b5563',
    },
    randomCircle: {
      backgroundColor: theme.board.light,
      borderColor: theme.board.dark,
    },
    colorText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text.secondary,
      textTransform: 'capitalize',
    },
    colorTextSelected: {
      color: theme.text.primary,
      fontWeight: '700',
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
      fontSize: 15,
      fontWeight: '700',
    },
    waitingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    waitingCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: theme.brand.green.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    waitingTitle: {
      fontSize: typography.titleMedium.fontSize,
      fontWeight: '800',
      color: theme.text.primary,
      marginBottom: 4,
    },
    waitingSubtitle: {
      fontSize: typography.bodyRegular.fontSize,
      color: theme.text.muted,
      marginBottom: spacing.md,
    },
    codeBox: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.surface.accent,
      borderWidth: 1,
      borderColor: theme.surface.border,
      marginBottom: spacing.xl,
    },
    codeText: {
      fontSize: 26,
      fontFamily: 'monospace',
      fontWeight: '900',
      letterSpacing: 4,
      color: theme.brand.green.DEFAULT,
    },
    waitingActions: {
      width: '100%',
      maxWidth: 280,
      gap: spacing.sm,
    },
    cancelBtn: {
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text.primary,
    },
  });
