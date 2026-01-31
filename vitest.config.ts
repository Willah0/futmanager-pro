/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Allow generic globals like expect, describe, it
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
