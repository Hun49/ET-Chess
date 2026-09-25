import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { themeColors } from '../src/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: styles.header,
            headerTintColor: themeColors.text.primary,
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
            name="game"
            options={{
              title: 'ET Chess',
              headerBackTitle: 'Home',
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: 'Settings',
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: themeColors.surface.base,
  },
  header: {
    backgroundColor: themeColors.surface.base,
  },
  headerTitle: {
    fontWeight: '700',
    color: themeColors.text.primary,
  },
  content: {
    backgroundColor: themeColors.surface.base,
  },
});
