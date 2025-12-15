/**
 * 测试 makeTagger 插件配置
 * 只启用 makeTagger，用于排查是否是它导致内存泄漏
 */
import type {UserConfigExport} from '@tarojs/cli'
import {makeTagger} from 'miaoda-sc-plugin'

export default {
  mini: {
    debugReact: true
  },
  h5: {},
  compiler: {
    type: 'vite',
    vitePlugins: [
      makeTagger({
        root: process.cwd()
      })
      // injectedGuiListenerPlugin - 已禁用
      // injectOnErrorPlugin - 已禁用
    ]
  }
} satisfies UserConfigExport<'vite'>
