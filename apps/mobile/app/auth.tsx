import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Mail, User } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn, signUp } from '../src/lib/auth-client';
import { borderRadius, spacing, type Theme, typography, useTheme } from '../src/theme';

export default function AuthScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split('@')[0] || 'Player',
        });
        if (res.error) {
          setError(res.error.message || 'Failed to create account');
        } else {
          router.replace('/');
        }
      } else {
        const res = await signIn.email({
          email: email.trim(),
          password,
        });
        if (res.error) {
          setError(res.error.message || 'Invalid email or password');
        } else {
          router.replace('/');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color={theme.text.primary} />
            </Pressable>
            <Text style={styles.topBarTitle}>ET Chess Account</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Hero Branding */}
          <View style={styles.headerSection}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>ET</Text>
            </View>
            <Text style={styles.title}>{mode === 'signin' ? 'Welcome Back' : 'Join ET Chess'}</Text>
            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? 'Sign in to access rated matchmaking, friend rooms, and tournaments.'
                : 'Create an account to climb the leaderboards and play online.'}
            </Text>
          </View>

          {/* Mode Switcher */}
          <View style={styles.tabContainer}>
            <Pressable
              onPress={() => {
                setMode('signin');
                setError(null);
              }}
              style={[styles.tabButton, mode === 'signin' && styles.tabButtonActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'signin' }}
            >
              <Text style={[styles.tabButtonText, mode === 'signin' && styles.tabButtonTextActive]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode('signup');
                setError(null);
              }}
              style={[styles.tabButton, mode === 'signup' && styles.tabButtonActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'signup' }}
            >
              <Text style={[styles.tabButtonText, mode === 'signup' && styles.tabButtonTextActive]}>
                Create Account
              </Text>
            </Pressable>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formSection}>
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color={theme.text.muted} style={styles.inputIcon} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Grandmaster"
                    placeholderTextColor={theme.text.muted}
                    style={styles.textInput}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={theme.text.muted} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="player@et-chess.com"
                  placeholderTextColor={theme.text.muted}
                  style={styles.textInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={theme.text.muted} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.text.muted}
                  style={styles.textInput}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                loading && styles.submitButtonDisabled,
              ]}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={theme.text.primary} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    keyboardContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonPressed: {
      opacity: 0.8,
    },
    topBarTitle: {
      fontSize: typography.bodyRegular.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    placeholder: {
      width: 36,
    },
    headerSection: {
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
    },
    logoBadge: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.board.dark,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    logoText: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text.primary,
    },
    title: {
      fontSize: typography.titleLarge.fontSize,
      fontWeight: typography.titleLarge.fontWeight,
      color: theme.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.bodySmall.fontSize,
      color: theme.text.muted,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      lineHeight: typography.bodySmall.lineHeight,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.surface.accent,
      borderRadius: borderRadius.md,
      padding: spacing.xs,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.surface.border,
    },
    tabButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: borderRadius.sm,
    },
    tabButtonActive: {
      backgroundColor: theme.surface.card,
    },
    tabButtonText: {
      fontSize: typography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.muted,
    },
    tabButtonTextActive: {
      color: theme.text.primary,
    },
    errorBanner: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 1,
      borderColor: theme.status.danger,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    errorText: {
      color: '#fca5a5',
      fontSize: typography.bodySmall.fontSize,
    },
    formSection: {
      gap: spacing.lg,
    },
    inputGroup: {
      gap: spacing.xs,
    },
    inputLabel: {
      fontSize: typography.bodySmall.fontSize,
      fontWeight: '500',
      color: theme.text.secondary,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.card,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.surface.border,
      paddingHorizontal: spacing.md,
    },
    inputIcon: {
      marginRight: spacing.sm,
    },
    textInput: {
      flex: 1,
      height: 48,
      color: theme.text.primary,
      fontSize: typography.bodyRegular.fontSize,
    },
    submitButton: {
      backgroundColor: theme.board.dark,
      height: 48,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    submitButtonPressed: {
      opacity: 0.85,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: theme.text.primary,
      fontSize: typography.bodyRegular.fontSize,
      fontWeight: '600',
    },
  });
