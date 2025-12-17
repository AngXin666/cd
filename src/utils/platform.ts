/**
 * 平台检测与兼容工具
 * 提供跨平台（H5/小程序/Android）的环境检测和 API 兼容层
 * 
 * @module utils/platform
 */

import Taro from '@tarojs/taro'

// ==================== 平台类型枚举 ====================

/**
 * 平台类型枚举
 * 用于标识当前运行的平台环境
 */
export enum PlatformType {
  /** 微信小程序 */
  WEAPP = 'weapp',
  /** H5 网页 */
  H5 = 'h5',
  /** Android APP（Capacitor） */
  ANDROID = 'android',
  /** 支付宝小程序 */
  ALIPAY = 'alipay',
  /** 未知平台 */
  UNKNOWN = 'unknown'
}

// ==================== 环境检测常量 ====================

/**
 * 检测当前是否为 H5 环境
 */
export const isH5 = process.env.TARO_ENV === 'h5'

/**
 * 检测当前是否为微信小程序环境
 */
export const isWeapp = process.env.TARO_ENV === 'weapp'

/**
 * 检测当前是否为支付宝小程序环境
 */
export const isAlipay = process.env.TARO_ENV === 'alipay'

/**
 * 检测当前是否为 Android APP 环境（Capacitor）
 * @returns 是否为 Android APP 环境
 */
export function isAndroid(): boolean {
  // 检查是否在 Capacitor 环境中
  const capacitor = (window as any)?.Capacitor
  if (capacitor) {
    const platform = capacitor.getPlatform?.()
    return platform === 'android'
  }
  return false
}

/**
 * 获取当前平台名称
 * @returns 平台名称字符串
 */
export function getPlatformName(): string {
  if (isAndroid()) return 'Android'
  if (isH5) return 'H5'
  if (isWeapp) return '微信小程序'
  if (isAlipay) return '支付宝小程序'
  return process.env.TARO_ENV || 'unknown'
}

/**
 * 获取当前平台类型
 * @returns 平台类型枚举值
 */
export function getCurrentPlatform(): PlatformType {
  // 优先检测 Capacitor Android 环境
  if (isAndroid()) return PlatformType.ANDROID
  if (isWeapp) return PlatformType.WEAPP
  if (isH5) return PlatformType.H5
  if (isAlipay) return PlatformType.ALIPAY
  return PlatformType.UNKNOWN
}

// ==================== 平台检测对象 ====================

/**
 * 平台检测工具对象
 * 提供各种平台检测方法
 */
export const platform = {
  /**
   * 检测是否为微信小程序环境
   * @returns 是否为微信小程序
   */
  isWeapp: (): boolean => isWeapp,
  
  /**
   * 检测是否为 H5 环境
   * @returns 是否为 H5
   */
  isH5: (): boolean => isH5,
  
  /**
   * 检测是否为 Android APP 环境
   * @returns 是否为 Android APP
   */
  isAndroid: (): boolean => isAndroid(),
  
  /**
   * 检测是否为支付宝小程序环境
   * @returns 是否为支付宝小程序
   */
  isAlipay: (): boolean => isAlipay,
  
  /**
   * 获取当前平台类型
   * @returns 平台类型枚举值
   */
  getCurrent: (): PlatformType => getCurrentPlatform(),
  
  /**
   * 获取当前平台名称
   * @returns 平台名称字符串
   */
  getName: (): string => getPlatformName()
}

// ==================== Loading 兼容层 ====================

/**
 * 兼容 H5 和小程序的 showLoading
 * H5 环境下不显示原生 loading（避免兼容性问题）
 * 
 * @param options - loading 配置选项
 * @param options.title - loading 提示文字
 */
export function showLoading(options: { title: string }): void {
  if (isH5) {
    // H5 环境下 Taro.showLoading 可能有兼容性问题
    // 可以在这里集成自定义 loading 组件
    // 目前选择静默处理
    return
  }
  Taro.showLoading(options)
}

/**
 * 兼容 H5 和小程序的 hideLoading
 */
export function hideLoading(): void {
  if (isH5) {
    // H5 环境下静默处理
    return
  }
  Taro.hideLoading()
}

// ==================== Toast 兼容层 ====================

/**
 * 兼容 H5 和小程序的 showToast
 * 
 * @param options - toast 配置选项
 */
export function showToast(options: Taro.showToast.Option): void {
  Taro.showToast({
    ...options,
    duration: options.duration || 2000
  })
}

// ==================== Storage 兼容层 ====================

/**
 * 兼容 H5 和小程序的同步获取存储
 * 
 * @param key - 存储键名
 * @returns 存储的值，不存在时返回 null
 */
export function getStorageSync<T = string>(key: string): T | null {
  try {
    const value = Taro.getStorageSync(key)
    return value || null
  } catch (error) {
    console.error(`[platform] getStorageSync 失败: ${key}`, error)
    return null
  }
}

/**
 * 兼容 H5 和小程序的同步设置存储
 * 
 * @param key - 存储键名
 * @param value - 要存储的值
 * @returns 是否设置成功
 */
export function setStorageSync<T = string>(key: string, value: T): boolean {
  try {
    Taro.setStorageSync(key, value)
    return true
  } catch (error) {
    console.error(`[platform] setStorageSync 失败: ${key}`, error)
    return false
  }
}

/**
 * 兼容 H5 和小程序的同步删除存储
 * 
 * @param key - 存储键名
 * @returns 是否删除成功
 */
export function removeStorageSync(key: string): boolean {
  try {
    Taro.removeStorageSync(key)
    return true
  } catch (error) {
    console.error(`[platform] removeStorageSync 失败: ${key}`, error)
    return false
  }
}

// ==================== 平台 UI 工具 ====================

/**
 * 平台 UI 工具对象
 * 提供平台相关的 UI 尺寸和样式信息
 */
export const platformUI = {
  /**
   * 获取状态栏高度
   * @returns 状态栏高度（像素）
   */
  getStatusBarHeight: (): number => {
    if (isWeapp) {
      // 微信小程序获取系统信息
      try {
        const systemInfo = Taro.getSystemInfoSync()
        return systemInfo.statusBarHeight || 0
      } catch {
        return 0
      }
    }
    if (isAndroid()) {
      // Android APP 默认状态栏高度
      return 24
    }
    // H5 环境没有状态栏
    return 0
  },
  
  /**
   * 获取导航栏高度
   * @returns 导航栏高度（像素）
   */
  getNavigationBarHeight: (): number => {
    if (isWeapp) {
      // 微信小程序导航栏高度（状态栏 + 标题栏）
      const statusBarHeight = platformUI.getStatusBarHeight()
      return statusBarHeight + 44
    }
    if (isAndroid()) {
      // Android APP 导航栏高度
      return 56
    }
    // H5 环境默认导航栏高度
    return 44
  },
  
  /**
   * 获取底部安全区域高度
   * @returns 底部安全区域高度（像素）
   */
  getSafeAreaBottom: (): number => {
    if (isWeapp) {
      try {
        const systemInfo = Taro.getSystemInfoSync()
        const safeArea = systemInfo.safeArea
        if (safeArea) {
          return systemInfo.screenHeight - safeArea.bottom
        }
      } catch {
        return 0
      }
    }
    if (isAndroid()) {
      // Android APP 底部安全区域（针对全面屏）
      return 0
    }
    // H5 环境检测 iOS Safari 底部安全区域
    if (typeof window !== 'undefined') {
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
      if (isIOS) {
        return 34 // iOS 底部安全区域默认高度
      }
    }
    return 0
  }
}

// ==================== 平台网络工具 ====================

/**
 * 平台网络工具对象
 * 提供平台相关的网络配置
 */
export const platformNetwork = {
  /**
   * 获取请求超时时间
   * @returns 超时时间（毫秒）
   */
  getRequestTimeout: (): number => {
    if (isWeapp) {
      // 微信小程序默认超时时间
      return 60000
    }
    if (isAndroid()) {
      // Android APP 超时时间
      return 30000
    }
    // H5 默认超时时间
    return 30000
  },
  
  /**
   * 获取上传超时时间
   * @returns 超时时间（毫秒）
   */
  getUploadTimeout: (): number => {
    if (isWeapp) {
      // 微信小程序上传超时时间
      return 120000
    }
    if (isAndroid()) {
      // Android APP 上传超时时间
      return 60000
    }
    // H5 上传超时时间
    return 60000
  },
  
  /**
   * 获取下载超时时间
   * @returns 超时时间（毫秒）
   */
  getDownloadTimeout: (): number => {
    if (isWeapp) {
      // 微信小程序下载超时时间
      return 120000
    }
    if (isAndroid()) {
      // Android APP 下载超时时间
      return 60000
    }
    // H5 下载超时时间
    return 60000
  }
}

// ==================== 平台执行工具 ====================

/**
 * 平台特定代码执行工具对象
 * 提供链式调用方式，根据当前平台执行对应的回调函数
 */
export const platformExecute = {
  /**
   * 在微信小程序环境执行回调
   * @param callback - 要执行的回调函数
   * @returns 回调函数的返回值，非小程序环境返回 undefined
   */
  onWeapp: <T>(callback: () => T): T | undefined => {
    if (isWeapp) {
      return callback()
    }
    return undefined
  },
  
  /**
   * 在 H5 环境执行回调
   * @param callback - 要执行的回调函数
   * @returns 回调函数的返回值，非 H5 环境返回 undefined
   */
  onH5: <T>(callback: () => T): T | undefined => {
    if (isH5 && !isAndroid()) {
      return callback()
    }
    return undefined
  },
  
  /**
   * 在 Android APP 环境执行回调
   * @param callback - 要执行的回调函数
   * @returns 回调函数的返回值，非 Android 环境返回 undefined
   */
  onAndroid: <T>(callback: () => T): T | undefined => {
    if (isAndroid()) {
      return callback()
    }
    return undefined
  },
  
  /**
   * 在支付宝小程序环境执行回调
   * @param callback - 要执行的回调函数
   * @returns 回调函数的返回值，非支付宝小程序环境返回 undefined
   */
  onAlipay: <T>(callback: () => T): T | undefined => {
    if (isAlipay) {
      return callback()
    }
    return undefined
  },
  
  /**
   * 根据平台执行对应的回调（对象参数方式）
   * @param options - 各平台的执行回调
   * @returns 执行结果
   */
  execute: <T>(options: {
    weapp?: () => T
    h5?: () => T
    android?: () => T
    alipay?: () => T
    default?: () => T
  }): T | undefined => {
    // 优先检测 Android 环境
    if (isAndroid() && options.android) {
      return options.android()
    }
    if (isWeapp && options.weapp) {
      return options.weapp()
    }
    if (isAlipay && options.alipay) {
      return options.alipay()
    }
    if (isH5 && options.h5) {
      return options.h5()
    }
    if (options.default) {
      return options.default()
    }
    return undefined
  }
}