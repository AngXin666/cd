/**
 * Taro API H5兼容层
 * 统一处理Taro API在H5环境下的兼容性问题
 */

import Taro from '@tarojs/taro'

// 环境检测
const isH5 = process.env.TARO_ENV === 'h5'

/**
 * showToast 兼容
 */
export interface ShowToastOptions {
  title: string
  icon?: 'success' | 'error' | 'loading' | 'none'
  duration?: number
  mask?: boolean
}

export function showToast(options: ShowToastOptions): void {
  if (isH5) {
    // H5环境使用自定义toast组件（原生DOM实现，轻量无依赖）
    if (options.icon !== 'loading') {
      // 创建自定义toast元素
      const toast = document.createElement('div')
      toast.innerText = options.title
      toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        max-width: 80%;
        text-align: center;
        word-wrap: break-word;
      `
      document.body.appendChild(toast)

      setTimeout(() => {
        document.body.removeChild(toast)
      }, options.duration || 1500)
    }
  } else {
    Taro.showToast(options)
  }
}

/**
 * showLoading 兼容
 */
export interface ShowLoadingOptions {
  title: string
  mask?: boolean
}

let loadingElement: HTMLElement | null = null

export function showLoading(options: ShowLoadingOptions): void {
  if (isH5) {
    // 创建loading元素
    if (!loadingElement) {
      loadingElement = document.createElement('div')
      loadingElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        text-align: center;
      `
      loadingElement.innerHTML = `
        <div style="margin-bottom: 8px;">
          <div style="border: 3px solid #f3f3f3; border-top: 3px solid white; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
        <div>${options.title}</div>
      `

      // 添加旋转动画
      const style = document.createElement('style')
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(style)

      document.body.appendChild(loadingElement)
    }
  } else {
    Taro.showLoading(options)
  }
}

/**
 * hideLoading 兼容
 */
export function hideLoading(): void {
  if (isH5) {
    if (loadingElement && document.body.contains(loadingElement)) {
      document.body.removeChild(loadingElement)
      loadingElement = null
    }
  } else {
    Taro.hideLoading()
  }
}

/**
 * showModal 兼容
 */
export interface ShowModalOptions {
  title: string
  content: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  success?: (res: {confirm: boolean; cancel: boolean}) => void
  fail?: () => void
}

export function showModal(options: ShowModalOptions): Promise<{confirm: boolean; cancel: boolean}> {
  if (isH5) {
    return new Promise((resolve) => {
      const confirmed = window.confirm(`${options.title}\n\n${options.content}`)
      const result = {confirm: confirmed, cancel: !confirmed}

      if (options.success) {
        options.success(result)
      }

      resolve(result)
    })
  } else {
    return new Promise((resolve) => {
      Taro.showModal({
        ...options,
        success: (res) => {
          if (options.success) {
            options.success(res)
          }
          resolve(res)
        },
        fail: () => {
          if (options.fail) {
            options.fail()
          }
          resolve({confirm: false, cancel: true})
        }
      })
    })
  }
}

/**
 * navigateTo 兼容
 */
export interface NavigateToOptions {
  url: string
  success?: () => void
  fail?: () => void
}

export function navigateTo(options: NavigateToOptions): void {
  if (isH5) {
    // H5环境使用history API
    const url = options.url.startsWith('/') ? options.url : `/${options.url}`
    window.location.hash = url

    if (options.success) {
      options.success()
    }
  } else {
    Taro.navigateTo(options)
  }
}

/**
 * navigateBack 兼容
 */
export interface NavigateBackOptions {
  delta?: number
}

export function navigateBack(options?: NavigateBackOptions): void {
  if (isH5) {
    window.history.go(-(options?.delta || 1))
  } else {
    Taro.navigateBack(options)
  }
}

/**
 * redirectTo 兼容
 */
export function redirectTo(options: NavigateToOptions): void {
  if (isH5) {
    const url = options.url.startsWith('/') ? options.url : `/${options.url}`
    window.location.replace(`#${url}`)

    if (options.success) {
      options.success()
    }
  } else {
    Taro.redirectTo(options)
  }
}

/**
 * switchTab 兼容
 */
export function switchTab(options: NavigateToOptions): void {
  if (isH5) {
    const url = options.url.startsWith('/') ? options.url : `/${options.url}`
    window.location.hash = url

    if (options.success) {
      options.success()
    }
  } else {
    Taro.switchTab(options)
  }
}

/**
 * getStorageSync 兼容
 * H5环境使用localStorage
 */
export function getStorageSync<T = any>(key: string): T | null {
  if (isH5) {
    try {
      const value = localStorage.getItem(key)
      if (value === null) return null
      return JSON.parse(value) as T
    } catch {
      return null
    }
  } else {
    return Taro.getStorageSync<T>(key)
  }
}

/**
 * setStorageSync 兼容
 * H5环境使用localStorage
 */
export function setStorageSync<T = unknown>(key: string, data: T): void {
  if (isH5) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.error('setStorageSync失败:', e)
    }
  } else {
    Taro.setStorageSync(key, data)
  }
}

/**
 * removeStorageSync 兼容
 * H5环境使用localStorage
 */
export function removeStorageSync(key: string): void {
  if (isH5) {
    localStorage.removeItem(key)
  } else {
    Taro.removeStorageSync(key)
  }
}
