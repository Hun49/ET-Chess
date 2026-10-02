import { TIME_CONTROL_PRESETS, type TimeControlOption } from '@et-chess/config';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock, Globe, Swords, X } from 'lucide-react-native';
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
import { type MockOpponent, simulateMatchmaking } from '../src/mocks/gameSessionMocks';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

type QueueState = 'idle' | 'searching' | 'matched';

export default function PlayOnlineScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(
    TIME_CONTROL_PRESETS[2] ??
      TIME_CONTROL_PRESETS[0] ?? { label: '3 min', minutes: 3, increment: 0, category: 'blitz' },
  );
  const [queueState, setQueueState] = useState<QueueState>('idle');
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [matchedOpponent, setMatchedOpponent] = useState<MockOpponent | null>(null);

  const startMatchmaking = async () => {
    setQueueState('searching');
    setSearchSeconds(0);

    const timer = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);

    try {
      const opp = await simulateMatchmaking({ targetRating: 1500, delayMs: 1400 });
      clearInterval(timer);
      setMatchedOpponent(opp);
      setQueueState('matched');

      setTimeout(() => {
        router.push({
          pathname: '/game',
          params: {
            mode: 'online',
            minutes: selectedTimeControl.minutes.toString(),
            increment: selectedTimeControl.increment.toString(),
            opponent: opp.displayName,
            rating: opp.rating.toString(),
          },
        });
      }, 900);
    } catch {
      clearInterval(timer);
      setQueueState('idle');
    }
  };

  const cancelMatchmaking = () => {
    setQueueState('idle');
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

          <Text style={styles.headerTitle}>Play Online</Text>
          <View style={{ width: 38 }} />
        </View>

        {queueState === 'idle' ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Mode Banner */}
            <View style={styles.heroSection}>
              <View style={styles.badgeContainer}>
                <Globe size={14} color={theme.brand.green.DEFAULT} />
                <Text style={styles.badgeText}>Live Multiplayer</Text>
              </View>
              <Text style={styles.title}>Ranked Matchmaking</Text>
              <Text style={styles.subtitle}>
                Choose your pace and face players around your skill level.
              </Text>
            </View>

            {/* Time Control Cards */}
            <View style={styles.tcSection}>
              <Text style={styles.sectionHeading}>Time Controls</Text>
              <View style={styles.tcGrid}>
                {TIME_CONTROL_PRESETS.map((tc) => {
                  const isSelected = selectedTimeControl.id === tc.id;
                  return (
                    <TouchableOpacity
                      key={tc.id}
                      style={[styles.tcCard, isSelected && styles.tcCardSelected]}
                      onPress={() => setSelectedTimeControl(tc)}
                      accessibilityRole="button"
                      accessibilityLabel={`Time control ${tc.label}`}
                      testID={`time-control-${tc.id}`}
                    >
                      <View style={styles.tcCardTop}>
                        <Text style={[styles.tcLabel, isSelected && styles.tcLabelSelected]}>
                          {tc.label}
                        </Text>
                        <Text style={styles.tcCategory}>{tc.category}</Text>
                      </View>
                      <Text style={styles.tcDescription}>{tc.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Play Button */}
            <TouchableOpacity
              style={styles.findMatchBtn}
              onPress={startMatchmaking}
              accessibilityRole="button"
              accessibilityLabel="Find opponent"
              testID="find-match-btn"
            >
              <Swords size={20} color="#ffffff" />
              <Text style={styles.findMatchBtnText}>Play ({selectedTimeControl.label})</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : queueState === 'searching' ? (
          <View style={styles.queueContainer} testID="matchmaking-searching">
            <View style={styles.queueCircle}>
              <ActivityIndicator size="large" color={theme.brand.green.DEFAULT} />
            </View>
            <Text style={styles.queueTitle}>Searching for Opponent...</Text>
            <Text style={styles.queueSubtitle}>
              Matching by rating ({selectedTimeControl.label} · Blitz)
            </Text>

            <View style={styles.elapsedBox}>
              <Clock size={16} color={theme.text.muted} />
              <Text style={styles.elapsedText}>
                Elapsed: 0:{searchSeconds < 10 ? `0${searchSeconds}` : searchSeconds}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={cancelMatchmaking}
              testID="cancel-matchmaking-btn"
            >
              <X size={18} color={theme.text.primary} />
              <Text style={styles.cancelBtnText}>Cancel Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.queueContainer} testID="match-found">
            <View style={[styles.queueCircle, styles.matchedCircle]}>
              <CheckCircle2 size={40} color={theme.brand.green.DEFAULT} />
            </View>
            <Text style={styles.queueTitle}>Opponent Found!</Text>
            <Text style={styles.queueSubtitle}>Loading chessboard...</Text>

            {matchedOpponent && (
              <View style={styles.opponentCard}>
                <Text style={styles.opponentName}>{matchedOpponent.displayName}</Text>
                <Text style={styles.opponentRating}>Rating {matchedOpponent.rating}</Text>
              </View>
            )}
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
      color: theme.brand.green.DEFAULT,
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
      maxWidth: 280,
    },
    tcSection: {
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
    tcGrid: {
      gap: spacing.sm,
    },
    tcCard: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    tcCardSelected: {
      borderColor: theme.brand.green.DEFAULT,
      borderWidth: 2,
    },
    tcCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    tcLabel: {
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'monospace',
      color: theme.text.primary,
    },
    tcLabelSelected: {
      color: theme.brand.green.DEFAULT,
    },
    tcCategory: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
    },
    tcDescription: {
      fontSize: 12,
      color: theme.text.secondary,
    },
    findMatchBtn: {
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
    findMatchBtnText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '800',
    },
    queueContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    queueCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: theme.brand.green.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    matchedCircle: {
      backgroundColor: 'rgba(7, 137, 48, 0.15)',
    },
    queueTitle: {
      fontSize: typography.titleMedium.fontSize,
      fontWeight: '800',
      color: theme.text.primary,
      marginBottom: 4,
    },
    queueSubtitle: {
      fontSize: typography.bodyRegular.fontSize,
      color: theme.text.muted,
      marginBottom: spacing.lg,
    },
    elapsedBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface.accent,
      marginBottom: spacing.xl,
    },
    elapsedText: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: theme.text.primary,
    },
    cancelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text.primary,
    },
    opponentCard: {
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      alignItems: 'center',
      marginTop: spacing.md,
      width: '100%',
      maxWidth: 240,
    },
    opponentName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text.primary,
    },
    opponentRating: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: theme.text.muted,
      marginTop: 2,
    },
  });
