/**
 * 测试 injectOnErrorPlugin 插件配置
 * 只启用 injectOnErrorPlugin，用于排查是否是它导致内存泄漏
 */
import type {UserConfigExport} from '@tarojs/cli'
import {injectOnErrorPlugin} from 'miaoda-sc-plugin'

export default {
  mini: {
    debugReact: true
  },
  h5: {},
  compiler: {
    type: 'vite',
    vitePlugins: [
      // makeTagger - 已禁用
      // injectedGuiListenerPlugin - 已禁用
      injectOnErrorPlugin()
    ]
  }
} satisfies UserConfigExport<'vite'>
