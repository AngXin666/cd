/**
 * 测试 injectedGuiListenerPlugin 插件配置
 * 只启用 injectedGuiListenerPlugin，用于排查是否是它导致内存泄漏
 */
import type {UserConfigExport} from '@tarojs/cli'
import {injectedGuiListenerPlugin} from 'miaoda-sc-plugin'

export default {
  mini: {
    debugReact: true
  },
  h5: {},
  compiler: {
    type: 'vite',
    vitePlugins: [
      // makeTagger - 已禁用
      injectedGuiListenerPlugin({
        path: 'https://resource-static.cdn.bcebos.com/common/v2/injected.js'
      })
      // injectOnErrorPlugin - 已禁用
    ]
  }
} satisfies UserConfigExport<'vite'>
