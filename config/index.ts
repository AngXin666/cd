import path from 'node:path'
import {defineConfig, type UserConfigExport} from '@tarojs/cli'
import {miaodaDevPlugin} from 'miaoda-sc-plugin'
import tailwindcss from 'tailwindcss'
import type {Plugin} from 'vite'
import {UnifiedViteWeappTailwindcssPlugin as uvtw} from 'weapp-tailwindcss/vite'

import devConfig from './dev'
import prodConfig from './prod'

const base = String(process.argv[process.argv.length - 1])
const publicPath = /^http/.test(base) ? base : '/'

// 递归展平数组并过滤 null/undefined
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

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
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
      // 小程序场景使用微信polyfill版本supabase-js
      '@supabase/supabase-js': process.env.TARO_ENV === 'h5' ? '@supabase/supabase-js' : 'supabase-wechat-js'
    },
    defineConstants: {},
    copy: {
      patterns: [],
      options: {}
    },
    framework: 'react',
    compiler: {
      type: 'vite',
      vitePlugins: flattenPlugins([
        miaodaDevPlugin({appType: process.env.TARO_ENV === 'h5' ? 'web' : 'miniapp', cdnBase: publicPath}),

        {
          name: 'hmr-toggle',
          configureServer(server) {
            let hmrEnabled = true

            // 包装原来的 send 方法
            const _send = server.ws.send
            server.ws.send = (payload) => {
              if (hmrEnabled) {
                return _send.call(server.ws, payload)
              } else {
                console.log('[HMR disabled] skipped payload:', payload.type)
              }
            }

            // 提供接口切换 HMR
            server.middlewares.use('/innerapi/v1/sourcecode/__hmr_off', (_req, res) => {
              hmrEnabled = false
              const body = {
                status: 0,
                msg: 'HMR disabled'
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(body))
            })

            server.middlewares.use('/innerapi/v1/sourcecode/__hmr_on', (_req, res) => {
              hmrEnabled = true
              const body = {
                status: 0,
                msg: 'HMR enabled'
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(body))
            })

            // 注册一个 HTTP API，用来手动触发一次整体刷新
            server.middlewares.use('/innerapi/v1/sourcecode/__hmr_reload', (_req, res) => {
              if (hmrEnabled) {
                server.ws.send({
                  type: 'full-reload',
                  path: '*' // 整页刷新
                })
              }
              res.statusCode = 200
              const body = {
                status: 0,
                msg: 'Manual full reload triggered'
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(body))
            })
          },
          load(id) {
            if (id === 'virtual:after-update') {
              return `
        if (import.meta.hot) {
          import.meta.hot.on('vite:afterUpdate', () => {
            window.postMessage(
              {
                type: 'editor-update'
              },
              '*'
            );
          });
        }
      `
            }
          },
          transformIndexHtml(html) {
            return {
              html,
              tags: [
                {
                  tag: 'script',
                  attrs: {
                    type: 'module',
                    src: '/@id/virtual:after-update'
                  },
                  injectTo: 'body'
                }
              ]
            }
          }
        },

        {
          // 通过 vite 插件加载 postcss,
          name: 'postcss-config-loader-plugin',
          config(config) {
            // 加载 tailwindcss
            if (typeof config.css?.postcss === 'object') {
              config.css?.postcss.plugins?.unshift(tailwindcss())
            }
          }
        },
        ...(process.env.TARO_ENV !== 'h5' && process.env.TARO_ENV !== 'harmony' && process.env.TARO_ENV !== 'rn'
          ? [
              uvtw({
                // rem转rpx
                rem2rpx: true,
                // 由于 taro vite 默认会移除所有的 tailwindcss css 变量，所以一定要开启这个配置，进行css 变量的重新注入
                injectAdditionalCssVarScope: true
              })
            ]
          : []),
        {
          name: 'taro-app-config-watcher',
          configureServer(server) {
            // 监听 app.config.* 文件
            server.watcher.add('src/app.config.*')

            server.watcher.on('change', (file) => {
              if (file.includes('app.config.')) {
                server.ws.send({type: 'full-reload'})
              }
            })
          }
        }
      ])
    },
    mini: {
      compile: {
        exclude: [
          // 排除不需要编译的文件 - 使用字符串模式替代函数以兼容 Node.js v24
          'node_modules/**'
        ]
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
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
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
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
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
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }

  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
