/**
 * 平台差异处理工具
 * 统一处理微信小程序、H5、安卓APP的平台差异
 */

import Taro from '@tarojs/taro'

// 平台类型枚举
export enum PlatformType {
  WEAPP = 'weapp', // 微信小程序
  H5 = 'h5', // H5网页
  ANDROID = 'android', // 安卓APP
  UNKNOWN = 'unknown' // 未知平台
}

/**
 * 获取当前运行平台
 */
export const getCurrentPlatform = (): PlatformType => {
  const env = Taro.getEnv()

  switch (env) {
    case Taro.ENV_TYPE.WEAPP:
      return PlatformType.WEAPP
    case Taro.ENV_TYPE.WEB:
      // 在Capacitor环境中运行的H5被视为安卓APP
      if (isCapacitorApp()) {
        return PlatformType.ANDROID
      }
      return PlatformType.H5
    default:
      return PlatformType.UNKNOWN
  }
}

/**
 * 检查是否在Capacitor环境中运行（安卓APP）
 */
export const isCapacitorApp = (): boolean => {
  return !!(window as any)?.Capacitor
}

/**
 * 平台判断工具函数
 */
export const platform = {
  // 是否为微信小程序
  isWeapp: () => getCurrentPlatform() === PlatformType.WEAPP,

  // 是否为H5网页
  isH5: () => getCurrentPlatform() === PlatformType.H5,

  // 是否为安卓APP
  isAndroid: () => getCurrentPlatform() === PlatformType.ANDROID,

  // 是否为移动端（小程序或安卓APP）
  isMobile: () => {
    const current = getCurrentPlatform()
    return current === PlatformType.WEAPP || current === PlatformType.ANDROID
  },

  // 是否支持原生功能
  isNative: () => getCurrentPlatform() === PlatformType.ANDROID
}

/**
 * 平台特定功能执行器
 */
export const platformExecute = {
  /**
   * 根据平台执行不同的逻辑
   */
  byPlatform: <T>(handlers: {weapp?: () => T; h5?: () => T; android?: () => T; default?: () => T}): T | undefined => {
    const currentPlatform = getCurrentPlatform()

    switch (currentPlatform) {
      case PlatformType.WEAPP:
        return handlers.weapp?.() || handlers.default?.()
      case PlatformType.H5:
        return handlers.h5?.() || handlers.default?.()
      case PlatformType.ANDROID:
        return handlers.android?.() || handlers.default?.()
      default:
        return handlers.default?.()
    }
  },

  /**
   * 仅在微信小程序中执行
   */
  onWeapp: <T>(handler: () => T): T | undefined => {
    return platform.isWeapp() ? handler() : undefined
  },

  /**
   * 仅在H5中执行
   */
  onH5: <T>(handler: () => T): T | undefined => {
    return platform.isH5() ? handler() : undefined
  },

  /**
   * 仅在安卓APP中执行
   */
  onAndroid: <T>(handler: () => T): T | undefined => {
    return platform.isAndroid() ? handler() : undefined
  },

  /**
   * 仅在移动端执行（小程序或安卓APP）
   */
  onMobile: <T>(handler: () => T): T | undefined => {
    return platform.isMobile() ? handler() : undefined
  }
}

/**
 * 平台特定的UI配置
 */
export const platformUI = {
  // 获取状态栏高度
  getStatusBarHeight: (): number => {
    return (
      platformExecute.byPlatform({
        weapp: () => {
          const systemInfo = Taro.getSystemInfoSync()
          return systemInfo.statusBarHeight || 44
        },
        android: () => {
          // 安卓APP中通过Capacitor获取状态栏高度
          return 44 // 默认值，可以通过Capacitor插件获取实际值
        },
        default: () => 0
      }) || 0
    )
  },

  // 获取导航栏高度
  getNavigationBarHeight: (): number => {
    return (
      platformExecute.byPlatform({
        weapp: () => {
          const systemInfo = Taro.getSystemInfoSync()
          const statusBarHeight = systemInfo.statusBarHeight || 44
          // 微信小程序导航栏高度通常为44px
          return statusBarHeight + 44
        },
        android: () => 56, // 安卓APP导航栏标准高度
        default: () => 44
      }) || 44
    )
  },

  // 获取底部安全区域高度
  getSafeAreaBottom: (): number => {
    return (
      platformExecute.byPlatform({
        weapp: () => {
          const systemInfo = Taro.getSystemInfoSync()
          const safeArea = systemInfo.safeArea
          if (safeArea) {
            return systemInfo.screenHeight - safeArea.bottom
          }
          return 0
        },
        android: () => {
          // 安卓APP中的底部安全区域
          return 0 // 可以通过Capacitor插件获取
        },
        default: () => 0
      }) || 0
    )
  }
}

/**
 * 平台特定的存储配置
 */
export const platformStorage = {
  // 获取存储键前缀
  getStoragePrefix: (): string => {
    return (
      platformExecute.byPlatform({
        weapp: () => 'weapp_',
        h5: () => 'h5_',
        android: () => 'android_',
        default: () => 'app_'
      }) || 'app_'
    )
  },

  // 设置存储
  setStorage: async (key: string, data: any): Promise<void> => {
    const prefixedKey = platformStorage.getStoragePrefix() + key

    return (
      platformExecute.byPlatform({
        weapp: () => Taro.setStorage({key: prefixedKey, data}),
        h5: () => {
          localStorage.setItem(prefixedKey, JSON.stringify(data))
          return Promise.resolve()
        },
        android: () => {
          // 安卓APP中使用Capacitor Storage
          if ((window as any)?.Capacitor?.Plugins?.Storage) {
            return (window as any).Capacitor.Plugins.Storage.set({
              key: prefixedKey,
              value: JSON.stringify(data)
            })
          }
          // 降级到localStorage
          localStorage.setItem(prefixedKey, JSON.stringify(data))
          return Promise.resolve()
        },
        default: () => Promise.resolve()
      }) || Promise.resolve()
    )
  },

  // 获取存储
  getStorage: async (key: string): Promise<any> => {
    const prefixedKey = platformStorage.getStoragePrefix() + key

    return (
      platformExecute.byPlatform({
        weapp: async () => {
          try {
            const result = await Taro.getStorage({key: prefixedKey})
            return result.data
          } catch {
            return null
          }
        },
        h5: () => {
          try {
            const data = localStorage.getItem(prefixedKey)
            return data ? JSON.parse(data) : null
          } catch {
            return null
          }
        },
        android: async () => {
          try {
            if ((window as any)?.Capacitor?.Plugins?.Storage) {
              const result = await (window as any).Capacitor.Plugins.Storage.get({
                key: prefixedKey
              })
              return result.value ? JSON.parse(result.value) : null
            }
            // 降级到localStorage
            const data = localStorage.getItem(prefixedKey)
            return data ? JSON.parse(data) : null
          } catch {
            return null
          }
        },
        default: () => Promise.resolve(null)
      }) || Promise.resolve(null)
    )
  }
}

/**
 * 平台特定的网络请求配置
 */
export const platformNetwork = {
  // 获取请求超时时间
  getRequestTimeout: (): number => {
    return (
      platformExecute.byPlatform({
        weapp: () => 30000, // 微信小程序30秒
        h5: () => 60000, // H5 60秒
        android: () => 45000, // 安卓APP 45秒
        default: () => 30000
      }) || 30000
    )
  },

  // 获取上传超时时间
  getUploadTimeout: (): number => {
    return (
      platformExecute.byPlatform({
        weapp: () => 60000, // 微信小程序60秒
        h5: () => 120000, // H5 120秒
        android: () => 90000, // 安卓APP 90秒
        default: () => 60000
      }) || 60000
    )
  }
}

export default {
  getCurrentPlatform,
  isCapacitorApp,
  platform,
  platformExecute,
  platformUI,
  platformStorage,
  platformNetwork
}
