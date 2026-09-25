import React from 'react';
import { vi } from 'vitest';

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

vi.mock('lucide-react-native', () => {
  const MockIcon = () => React.createElement('svg', null);
  return {
    Bot: MockIcon,
    ChevronRight: MockIcon,
    Cpu: MockIcon,
    Settings: MockIcon,
    Sparkles: MockIcon,
    Swords: MockIcon,
    Users: MockIcon,
    ArrowLeft: MockIcon,
    CircleDot: MockIcon,
    Flag: MockIcon,
    RotateCcw: MockIcon,
    Check: MockIcon,
    Info: MockIcon,
    Volume2: MockIcon,
  };
});

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('expo-router', () => {
  interface StackComponent extends React.FC<{ children?: React.ReactNode }> {
    Screen: React.FC<{ name: string; options?: Record<string, unknown> }>;
  }
  const Stack: StackComponent = Object.assign(
    ({ children }: { children?: React.ReactNode }) => children,
    {
      Screen: () => null,
    },
  );
  return {
    Stack,
    useRouter: () => ({
      push: mockPush,
      back: mockBack,
    }),
    useLocalSearchParams: () => ({}),
  };
});
