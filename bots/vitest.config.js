import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/tests/setup.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 3
      }
    }
  }
});