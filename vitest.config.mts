import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // Use node environment for pure function tests (avoids jsdom ESM issues)
    environment: 'node',
    globals: true,
    include: ['lib/__tests__/**/*.test.ts', 'lib/games/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
