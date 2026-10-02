import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { type Theme, useTheme } from '../src/theme';

export default function RootLayout() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: styles.header,
            headerTintColor: theme.text.primary,
            headerTitleStyle: styles.headerTitle,
            contentStyle: styles.content,
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="play-online"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="play-friend"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="play-computer"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="play-local"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="game"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="history"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="review"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: 'Settings',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="auth"
            options={{
              title: 'Account',
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    header: {
      backgroundColor: theme.surface.base,
    },
    headerTitle: {
      fontWeight: '700',
      color: theme.text.primary,
    },
    content: {
      backgroundColor: theme.surface.base,
    },
  });
