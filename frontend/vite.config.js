import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    coverage: {
      provider: 'v8',
      // every source file is measured, also one no test imports, so a
      // threshold can't pass silently (review M29)
      include: ['src/**/*.{js,vue}'],
      // T115, T117 (08_…:39-43, GOALS.md M29): CI fails below the targets
      thresholds: {
        'src/stores/authStore.js': { lines: 90, statements: 90, functions: 90, branches: 90 },
        'src/stores/entities/taskStore.js': { lines: 90, statements: 90, functions: 90, branches: 90 },
        'src/api/httpClient.js': { lines: 90, statements: 90, functions: 90, branches: 90 },
        'src/router/guards.js': { lines: 75, statements: 75, functions: 75, branches: 75 },
      },
    }
  }
})