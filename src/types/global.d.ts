/// <reference types="@tarojs/taro" />

declare namespace NodeJS {
  interface ProcessEnv {
    TARO_ENV: 'weapp' | 'h5' | 'rn' | 'tt' | 'qq' | 'jd' | 'swan' | 'alipay' | 'quickapp' | 'harmony'
    NODE_ENV: 'development' | 'production' | 'test'
    TARO_APP_SUPABASE_URL: string
    TARO_APP_SUPABASE_ANON_KEY: string
    TARO_APP_APP_ID: string
    TARO_APP_SUPABASE_BUCKET: string
    TARO_APP_NAME: string
  }
}

declare const process: {
  env: NodeJS.ProcessEnv
  cwd(): string
  argv: string[]
}

// 扩展 Headers 接口
interface Headers {
  entries(): IterableIterator<[string, string]>
}

declare module '*.png'
declare module '*.gif'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.svg'
declare module '*.css'
declare module '*.less'
declare module '*.scss'
declare module '*.sass'
declare module '*.styl'

declare namespace NodeJS {
  interface ProcessEnv {
    /** NODE 内置环境变量, 会影响到最终构建生成产物 */
    NODE_ENV: 'development' | 'production'
    /** 当前构建的平台 */
    TARO_ENV: 'weapp' | 'swan' | 'alipay' | 'h5' | 'rn' | 'tt' | 'quickapp' | 'qq' | 'jd'
    /**
     * 当前构建的小程序 appid
     * @description 若不同环境有不同的小程序，可通过在 env 文件中配置环境变量`TARO_APP_ID`来方便快速切换 appid， 而不必手动去修改 dist/project.config.json 文件
     * @see https://taro-docs.jd.com/docs/next/env-mode-config#特殊环境变量-taro_app_id
     */
    TARO_APP_ID: string
  }
}
