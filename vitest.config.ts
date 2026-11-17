import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts, whose root is the web app: the tests live in server/.
export default defineConfig({ test: { include: ['server/**/*.test.ts'] } });
