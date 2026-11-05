/// <reference types="vitest/config" />
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // The URL path the app is served from. GitHub Pages serves it from /<repo>/, so the deploy
  // workflow sets BASE_PATH; locally (dev, build and preview) it's served from /.
  base: process.env.BASE_PATH ?? '/',
  // Ships the licenses of the bundled dependencies with the build; the footer links to it. A .txt
  // file, because browsers show it as text instead of downloading it.
  build: { license: { fileName: 'licenses.txt' } },
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
    // Node's own localStorage needs a file and warns when the app's store looks for it. The tests
    // use in-memory storages, so it's turned off.
    execArgv: ['--no-experimental-webstorage'],
  },
});
