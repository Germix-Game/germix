import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/app/play/**/*.test.tsx', 'jsdom'],
      ['src/components/game/**/*.test.tsx', 'jsdom'],
    ],
    setupFiles: ['./src/test/setup.ts'],
  },
})
