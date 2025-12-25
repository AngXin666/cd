/**
 * Vitest 测试配置文件
 * 用于 fleet-manager 前端项目的单元测试和属性测试
 * @module vitest.config
 */
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // 启用全局测试 API
    globals: true,
    // 使用 node 环境（工具函数不需要 DOM）
    environment: 'node',
    // 测试文件匹配模式
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      '__tests__/**/*.{test,spec}.{js,ts}'
    ],
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
