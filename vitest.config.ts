import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/pages/super-admin/user-management/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tarojs/components': path.resolve(__dirname, './src/test/mocks/taro-components.tsx'),
      '@tarojs/taro': path.resolve(__dirname, './src/test/mocks/taro.ts'),
      'miaoda-auth-taro': path.resolve(__dirname, './src/test/mocks/miaoda-auth-taro.ts')
    }
  }
})
