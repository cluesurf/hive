import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    remix({
      appDirectory: '.',
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      // Map @/ to @cluesurf/hive/ for library internal imports
      '@/': path.resolve(__dirname, '../../code') + '/',
      // Library package imports
      '@cluesurf/hive/': path.resolve(__dirname, '../../code') + '/',
      '@cluesurf/hive': path.resolve(__dirname, '../../code'),
    },
  },
})
