import React from 'react';
import { vi } from 'vitest';

const storageMap = new Map<string, string>();
export const mockAsyncStorage = {
  getItem: vi.fn(async (key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => {
    storageMap.set(key, value);
  }),
  removeItem: vi.fn(async (key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(async () => {
    storageMap.clear();
  }),
  getAllKeys: vi.fn(async () => Array.from(storageMap.keys())),
};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));

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

const secureStoreMap = new Map<string, string>();
export const mockSecureStore = {
  getItemAsync: vi.fn(async (key: string) => secureStoreMap.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    secureStoreMap.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    secureStoreMap.delete(key);
  }),
};

vi.mock('expo-secure-store', () => ({
  default: mockSecureStore,
  ...mockSecureStore,
}));

vi.mock('@better-auth/expo/client', () => ({
  expoClient: vi.fn(() => ({
    id: 'expo',
    getActions: () => ({
      getCookie: vi.fn(async () => ''),
    }),
  })),
}));

vi.mock('lucide-react-native', () => {
  const MockIcon = (props: Record<string, unknown>) => React.createElement('svg', props);
  return {
    ActivityIndicator: MockIcon,
    ArrowLeft: MockIcon,
    ArrowUpDown: MockIcon,
    Bot: MockIcon,
    Check: MockIcon,
    ChevronRight: MockIcon,
    CircleDot: MockIcon,
    Cpu: MockIcon,
    Eye: MockIcon,
    Flag: MockIcon,
    Handshake: MockIcon,
    Info: MockIcon,
    Lock: MockIcon,
    Mail: MockIcon,
    RefreshCw: MockIcon,
    RotateCcw: MockIcon,
    Settings: MockIcon,
    Sparkles: MockIcon,
    Swords: MockIcon,
    Trophy: MockIcon,
    User: MockIcon,
    Users: MockIcon,
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
