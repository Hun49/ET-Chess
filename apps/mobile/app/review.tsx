import { applyMove, createGame } from '@et-chess/chess-core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Cpu,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chessboard from '../src/components/Chessboard';
import { useMobileHistoryStore } from '../src/store/historyStore';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

export default function ReviewScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id?: string }>();

  const games = useMobileHistoryStore((s) => s.games);
  const gameRecord = games.find((g) => g.id === id) ?? games[0];

  const moveHistory = gameRecord?.moveHistory ?? [];
  const sanMoves = gameRecord?.sanMoves ?? [];

  const [currentStep, setCurrentStep] = useState(moveHistory.length);

  // Compute positions
  const positions = useMemo(() => {
    let runningGame = createGame();
    const list: { fen: string; san?: string }[] = [{ fen: runningGame.fen }];

    for (let i = 0; i < moveHistory.length; i++) {
      const move = moveHistory[i];
      if (!move) break;
      try {
        runningGame = applyMove(runningGame, move);
        list.push({ fen: runningGame.fen, san: sanMoves[i] });
      } catch {
        break;
      }
    }
    return list;
  }, [moveHistory, sanMoves]);

  const currentPosition = positions[currentStep] ?? positions[0] ?? initialGame;
  const lastMoveSan = currentStep > 0 ? sanMoves[currentStep - 1] : undefined;

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

          <Text style={styles.headerTitle}>Game Review</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Board View */}
        <View style={styles.boardWrapper}>
          <Chessboard
            game={{
              fen: currentPosition.fen,
              turn: currentStep % 2 === 0 ? 'white' : 'black',
              status: 'ongoing',
              moveHistory: [],
            }}
            disabled={true}
          />
        </View>

        {/* Controls and Eval Section */}
        <View style={styles.bottomSection}>
          {/* Eval placeholder */}
          <View style={styles.evalCard}>
            <View style={styles.evalTop}>
              <View style={styles.evalTitleRow}>
                <Cpu size={14} color={theme.brand.green.DEFAULT} />
                <Text style={styles.evalTitle}>Engine Evaluation</Text>
              </View>
              <Text style={styles.comingSoonBadge}>Coming Soon</Text>
            </View>
            <View style={styles.evalBar}>
              <View style={styles.evalWhite} />
              <View style={styles.evalBlack} />
            </View>
          </View>

          {/* Position Info */}
          <View style={styles.infoCard}>
            <Text style={styles.stepText}>
              Move: {currentStep} / {positions.length - 1}
            </Text>
            {lastMoveSan && (
              <View style={styles.sanBadge}>
                <Text style={styles.sanText}>{lastMoveSan}</Text>
              </View>
            )}
          </View>

          {/* Stepping Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.stepBtn}
              disabled={currentStep === 0}
              onPress={() => setCurrentStep(0)}
              testID="review-start-btn"
            >
              <ChevronsLeft size={20} color={theme.text.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stepBtn}
              disabled={currentStep === 0}
              onPress={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              testID="review-prev-btn"
            >
              <ChevronLeft size={20} color={theme.text.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stepBtn}
              disabled={currentStep >= positions.length - 1}
              onPress={() => setCurrentStep((prev) => Math.min(positions.length - 1, prev + 1))}
              testID="review-next-btn"
            >
              <ChevronRight size={20} color={theme.text.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stepBtn}
              disabled={currentStep >= positions.length - 1}
              onPress={() => setCurrentStep(positions.length - 1)}
              testID="review-end-btn"
            >
              <ChevronsRight size={20} color={theme.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
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
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      justifyContent: 'space-between',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
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
    boardWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: spacing.xs,
    },
    bottomSection: {
      gap: spacing.sm,
    },
    evalCard: {
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      gap: 6,
    },
    evalTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    evalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    evalTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
    },
    comingSoonBadge: {
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.brand.yellow.dark,
      backgroundColor: 'rgba(252, 221, 9, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    evalBar: {
      height: 6,
      borderRadius: 3,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    evalWhite: {
      flex: 1,
      backgroundColor: theme.board.light,
    },
    evalBlack: {
      flex: 1,
      backgroundColor: theme.board.dark,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    stepText: {
      fontSize: 12,
      fontFamily: 'monospace',
      fontWeight: '700',
      color: theme.text.primary,
    },
    sanBadge: {
      backgroundColor: 'rgba(7, 137, 48, 0.15)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    sanText: {
      fontSize: 12,
      fontFamily: 'monospace',
      fontWeight: '800',
      color: theme.brand.green.DEFAULT,
    },
    toolbar: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    stepBtn: {
      flex: 1,
      backgroundColor: theme.surface.card,
      borderColor: theme.surface.border,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
