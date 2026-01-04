/**
 * Vite 配置文件
 * 配置 UniApp 项目的构建选项
 */

import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [uni()],
  
  // 基础路径 - 使用相对路径，解决本地打开白屏问题
  base: './',
  
  // 开发服务器配置
  server: {
    port: 5173,
    host: '0.0.0.0',
    // API 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  
  // 构建配置
  build: {
    // 资源输出目录
    assetsDir: 'assets',
    // 生产环境移除 console
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 强制使用相对路径
    rollupOptions: {
      output: {
        // 确保资源使用相对路径
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
