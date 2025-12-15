/**
 * 最小化开发配置
 * 禁用所有可能导致内存泄漏的插件
 * 
 * 使用方法：
 * 1. 备份 config/dev.ts
 * 2. 将此文件内容复制到 config/dev.ts
 * 3. 运行 npm run dev:h5 观察内存
 * 4. 如果内存正常，说明问题在被禁用的插件中
 */
import type {UserConfigExport} from '@tarojs/cli'

export default {
  mini: {
    debugReact: true
  },
  h5: {},
  compiler: {
    type: 'vite',
    vitePlugins: [
      // 所有 miaoda-sc-plugin 插件已禁用
      // 如果此配置下内存正常，问题在以下插件之一：
      // - makeTagger
      // - injectedGuiListenerPlugin
      // - injectOnErrorPlugin
    ]
  }
} satisfies UserConfigExport<'vite'>
