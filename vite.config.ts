/// <reference types="vitest/config" />
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    // The React Compiler memoizes components and hooks, so the code has no hand-written
    // useMemo/useCallback/memo. 'all_errors' fails the build instead of silently skipping a
    // component the compiler can't optimize.
    babel({ presets: [reactCompilerPreset({ panicThreshold: 'all_errors' })] }),
    tailwindcss(),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
