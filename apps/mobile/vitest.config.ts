import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, './src/test-mocks/react-native.ts'),
    },
  },
});
