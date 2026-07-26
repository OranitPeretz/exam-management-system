import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    include: [
      'tests/**/*.test.ts',
    ],

    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    testTimeout: 10_000,
    hookTimeout: 10_000,

    coverage: {
      provider: 'v8',

      reporter: [
        'text',
        'html',
      ],

      include: [
        'src/**/*.ts',
      ],

      exclude: [
        'src/generated/**',
        'src/server.ts',
        'src/types/**',
      ],
    },
  },
});