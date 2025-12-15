/**
 * 调试用开发配置
 * 禁用可能导致内存泄漏的插件，用于排查问题
 * 
 * 使用方法：
 * 1. 将 config/dev.ts 重命名为 config/dev.backup.ts
 * 2. 将此文件重命名为 config/dev.ts
 * 3. 运行 npm run dev:h5 观察内存使用
 * 4. 逐步启用插件，找出问题插件
 */
import type {UserConfigExport} from '@tarojs/cli'

// 调试模式：禁用所有 miaoda-sc-plugin 插件
export default {
  mini: {
    debugReact: true
  },
  h5: {},
  compiler: {
    type: 'vite',
    vitePlugins: [
      // 暂时禁用以下插件进行调试：
      // makeTagger - 可能导致内存泄漏
      // injectedGuiListenerPlugin - 注入外部脚本
      // injectOnErrorPlugin - 错误处理注入
    ]
  }
} satisfies UserConfigExport<'vite'>
