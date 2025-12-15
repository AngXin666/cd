/**
 * 最小化主配置
 * 禁用所有可能导致内存泄漏的插件
 * 用于测试 Taro/Vite 核心是否有内存泄漏
 */
import path from 'node:path'
import {defineConfig, type UserConfigExport} from '@tarojs/cli'
import tailwindcss from 'tailwindcss'
import type {Plugin} from 'vite'
import {UnifiedViteWeappTailwindcssPlugin as uvtw} from 'weapp-tailwindcss/vite'

import devConfig from './dev'
import prodConfig from './prod'

const base = String(process.argv[process.argv.length - 1])
const publicPath = /^http/.test(base) ? base : '/'

/**
 * 递归展平数组并过滤 null/undefined
 * @param plugins - 插件数组
 * @returns 展平后的插件数组
 */
function flattenPlugins(plugins: any[]): Plugin[] {
  const result: Plugin[] = []
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      result.push(...flattenPlugins(plugin))
    } else if (plugin != null) {
      result.push(plugin)
    }
  }
  return result
}

export default defineConfig<'vite'>(async (merge) => {
  const baseConfig: UserConfigExport<'vite'> = {
    projectName: 'taro-vite',
    date: '2025-8-25',
    designWidth: 375,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: ['@tarojs/plugin-generator'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@supabase/supabase-js': process.env.TARO_ENV === 'h5' ? '@supabase/supabase-js' : 'supabase-wechat-js'
    },
    defineConstants: {},
    copy: {
      patterns: [
        {
          from: 'src/assets/images/login-bg-1.jpg',
          to: 'dist/assets/images/login-bg-1.jpg'
        },
        {
          from: 'src/assets/images/login-bg-2.jpg',
          to: 'dist/assets/images/login-bg-2.jpg'
        },
        {
          from: 'src/assets/images/login-bg-3.jpg',
          to: 'dist/assets/images/login-bg-3.jpg'
        }
      ],
      options: {}
    },
    framework: 'react',
    compiler: {
      type: 'vite',
      vitePlugins: flattenPlugins([
        // ========================================
        // 以下插件已禁用用于内存泄漏测试
        // ========================================
        
        // 禁用: miaodaDevPlugin
        // miaodaDevPlugin({appType: process.env.TARO_ENV === 'h5' ? 'web' : 'miniapp', cdnBase: publicPath}),

        // 禁用: hmr-toggle 插件
        // 可能导致内存泄漏：包装了 server.ws.send 方法

        // 保留: postcss-config-loader-plugin (必需)
        {
          name: 'postcss-config-loader-plugin',
          config(config) {
            if (typeof config.css?.postcss === 'object') {
              config.css?.postcss.plugins?.unshift(tailwindcss())
            }
          }
        },

        // 保留: uvtw (小程序需要)
        ...(process.env.TARO_ENV !== 'h5' && process.env.TARO_ENV !== 'harmony' && process.env.TARO_ENV !== 'rn'
          ? [
              uvtw({
                rem2rpx: true,
                injectAdditionalCssVarScope: true
              })
            ]
          : []),

        // 禁用: taro-app-config-watcher
        // 可能导致内存泄漏：添加了文件监听器
      ])
    },
    mini: {
      compile: {
        exclude: ['node_modules/**']
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {
            baseFontSize: 12,
            minRootSize: 12
          }
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    h5: {
      publicPath,
      staticDirectory: 'static',
      sassLoaderOption: {
        additionalData: `@import "@/styles/overrides.scss";`
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {
            baseFontSize: 12,
            minRootSize: 12
          }
        },
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      devServer: {
        port: 10086,
        host: '0.0.0.0',
        open: false
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }

  return merge({}, baseConfig, prodConfig)
})
