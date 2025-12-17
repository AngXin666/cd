/**
 * Taro API H5兼容层
 * 统一处理Taro API在H5环境下的兼容性问题
 *
 * 功能说明：
 * - 在 H5 环境下，部分 Taro API 可能不完全兼容
 * - 本模块提供兼容的实现，使用原生 DOM API
 * - 通过 initTaroCompat() 函数全局覆盖 Taro 的相关方法
 *
 * @module utils/taroCompat
 */

import Taro from '@tarojs/taro'
import {createLogger} from './logger'

const logger = createLogger('TaroCompat')

// 环境检测
const isH5 = process.env.TARO_ENV === 'h5'

// 标记是否已初始化
let isInitialized = false

/**
 * showToast 兼容
 */
export interface ShowToastOptions {
  title: string
  icon?: 'success' | 'error' | 'loading' | 'none'
  duration?: number
  mask?: boolean
}

// 当前显示的 toast 元素引用（用于 hideToast）
let currentToastElement: HTMLElement | null = null
// 当前 toast 的定时器（用于清理）
let currentToastTimer: ReturnType<typeof setTimeout> | null = null

export function showToast(options: ShowToastOptions): void {
  if (isH5) {
    // 先清除已存在的 toast
    hideToast()
    
    // H5环境使用自定义toast组件（原生DOM实现，轻量无依赖）
    if (options.icon !== 'loading') {
      // 创建自定义toast元素
      const toast = document.createElement('div')
      toast.id = 'taro-compat-toast'
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
      currentToastElement = toast

      // 设置自动隐藏定时器
      currentToastTimer = setTimeout(() => {
        hideToast()
      }, options.duration || 1500)
    }
  } else {
    Taro.showToast(options)
  }
}

/**
 * hideToast 兼容
 * 隐藏当前显示的 toast
 */
export function hideToast(): void {
  if (isH5) {
    // 清除定时器
    if (currentToastTimer) {
      clearTimeout(currentToastTimer)
      currentToastTimer = null
    }
    
    // 移除当前 toast 元素
    if (currentToastElement) {
      try {
        if (document.body.contains(currentToastElement)) {
          document.body.removeChild(currentToastElement)
        }
      } catch (e) {
        // 忽略移除错误
      }
      currentToastElement = null
    }
    
    // 也尝试通过 ID 移除（以防引用丢失）
    const existingToast = document.getElementById('taro-compat-toast')
    if (existingToast) {
      try {
        existingToast.remove()
      } catch (e) {
        // 忽略移除错误
      }
    }
  } else {
    Taro.hideToast()
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
    // 先移除已存在的 loading
    hideLoading()
    
    // 创建新的 loading 元素
    loadingElement = document.createElement('div')
    loadingElement.id = 'taro-compat-loading'
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
      z-index: 99999;
      text-align: center;
    `
    loadingElement.innerHTML = `
      <div style="margin-bottom: 8px;">
        <div style="border: 3px solid #f3f3f3; border-top: 3px solid white; border-radius: 50%; width: 24px; height: 24px; animation: taro-compat-spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
      <div>${options.title}</div>
    `

    // 添加旋转动画（如果不存在）
    if (!document.getElementById('taro-compat-spin-style')) {
      const style = document.createElement('style')
      style.id = 'taro-compat-spin-style'
      style.textContent = `
        @keyframes taro-compat-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(loadingElement)
  } else {
    Taro.showLoading(options)
  }
}

/**
 * hideLoading 兼容
 * 移除 loading 元素
 */
export function hideLoading(): void {
  if (isH5) {
    // 移除我们自定义的 loading
    if (loadingElement) {
      try {
        if (document.body.contains(loadingElement)) {
          document.body.removeChild(loadingElement)
        }
      } catch (e) {
        // 忽略移除错误
      }
      loadingElement = null
    }
    
    // 也尝试通过 ID 移除（以防引用丢失）
    const existingLoading = document.getElementById('taro-compat-loading')
    if (existingLoading) {
      try {
        existingLoading.remove()
      } catch (e) {
        // 忽略移除错误
      }
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
      logger.error('setStorageSync失败', e)
    }
  } else {
    Taro.setStorageSync(key, data)
  }
}

/**
 * setStorage 异步版本兼容
 * H5环境使用localStorage
 */
export interface SetStorageOptions<T = unknown> {
  key: string
  data: T
  success?: () => void
  fail?: (error: any) => void
  complete?: () => void
}

export function setStorage<T = unknown>(options: SetStorageOptions<T>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isH5) {
      try {
        localStorage.setItem(options.key, JSON.stringify(options.data))
        options.success?.()
        options.complete?.()
        resolve()
      } catch (e) {
        logger.error('setStorage失败', e)
        options.fail?.(e)
        options.complete?.()
        reject(e)
      }
    } else {
      Taro.setStorage({
        key: options.key,
        data: options.data,
        success: () => {
          options.success?.()
          resolve()
        },
        fail: (err) => {
          options.fail?.(err)
          reject(err)
        },
        complete: options.complete
      })
    }
  })
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

/**
 * removeStorage 异步版本兼容
 * H5环境使用localStorage.removeItem
 * 
 * @description 删除指定 key 的本地存储数据
 * 支持 success/fail/complete 回调，同时返回 Promise
 */
export interface RemoveStorageOptions {
  /** 要删除的存储键名 */
  key: string
  /** 删除成功的回调函数 */
  success?: () => void
  /** 删除失败的回调函数 */
  fail?: (error: any) => void
  /** 操作完成的回调函数（无论成功或失败都会调用） */
  complete?: () => void
}

/**
 * 异步删除本地存储数据
 * 
 * @param options - 删除存储选项
 * @param options.key - 要删除的存储键名
 * @param options.success - 删除成功的回调函数
 * @param options.fail - 删除失败的回调函数
 * @param options.complete - 操作完成的回调函数
 * @returns Promise<void> - 删除操作的 Promise
 * 
 * @example
 * // 使用 Promise
 * await removeStorage({ key: 'userToken' })
 * 
 * // 使用回调
 * removeStorage({
 *   key: 'userToken',
 *   success: () => console.log('删除成功'),
 *   fail: (err) => console.error('删除失败', err),
 *   complete: () => console.log('操作完成')
 * })
 */
export function removeStorage(options: RemoveStorageOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isH5) {
      // H5 环境：使用 localStorage.removeItem
      try {
        localStorage.removeItem(options.key)
        // 调用成功回调
        options.success?.()
        // 调用完成回调
        options.complete?.()
        // Promise resolve
        resolve()
      } catch (e) {
        // 记录错误日志
        logger.error('removeStorage失败', e)
        // 调用失败回调
        options.fail?.(e)
        // 调用完成回调
        options.complete?.()
        // Promise reject
        reject(e)
      }
    } else {
      // 非 H5 环境：调用 Taro.removeStorage
      Taro.removeStorage({
        key: options.key,
        success: () => {
          options.success?.()
          resolve()
        },
        fail: (err) => {
          options.fail?.(err)
          reject(err)
        },
        complete: options.complete
      })
    }
  })
}

/**
 * chooseImage 兼容
 * H5环境使用原生 input[type=file] 实现
 */
export interface ChooseImageOptions {
  count?: number
  sizeType?: ('original' | 'compressed')[]
  sourceType?: ('album' | 'camera')[]
  success?: (res: ChooseImageResult) => void
  fail?: (error: any) => void
  complete?: () => void
}

export interface ChooseImageResult {
  tempFilePaths: string[]
  tempFiles: Array<{path: string; size: number}>
}

export function chooseImage(options: ChooseImageOptions): Promise<ChooseImageResult> {
  return new Promise((resolve, reject) => {
    if (isH5) {
      // H5 环境：使用原生 input[type=file] 实现
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = (options.count || 1) > 1
      input.style.display = 'none'
      
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement
        const files = target.files
        if (files && files.length > 0) {
          const tempFilePaths: string[] = []
          const tempFiles: Array<{path: string; size: number}> = []
          
          // 限制文件数量
          const maxCount = options.count || 1
          const fileCount = Math.min(files.length, maxCount)
          
          for (let i = 0; i < fileCount; i++) {
            const file = files[i]
            const url = URL.createObjectURL(file)
            tempFilePaths.push(url)
            tempFiles.push({path: url, size: file.size})
          }
          
          const result: ChooseImageResult = {tempFilePaths, tempFiles}
          options.success?.(result)
          options.complete?.()
          resolve(result)
        } else {
          const error = new Error('未选择图片')
          options.fail?.(error)
          options.complete?.()
          reject(error)
        }
        
        // 清理 input 元素
        document.body.removeChild(input)
      }
      
      input.onerror = (e) => {
        const error = new Error('选择图片失败')
        options.fail?.(error)
        options.complete?.()
        document.body.removeChild(input)
        reject(error)
      }
      
      // 用户取消选择时的处理
      input.oncancel = () => {
        const error = new Error('用户取消选择')
        options.fail?.(error)
        options.complete?.()
        document.body.removeChild(input)
        reject(error)
      }
      
      document.body.appendChild(input)
      input.click()
    } else {
      // 非 H5 环境：使用 Taro 原生 API
      Taro.chooseImage({
        count: options.count || 1,
        sizeType: options.sizeType || ['original', 'compressed'],
        sourceType: options.sourceType || ['album', 'camera'],
        success: (res) => {
          const result: ChooseImageResult = {
            tempFilePaths: res.tempFilePaths,
            tempFiles: res.tempFiles.map(f => ({path: f.path, size: f.size || 0}))
          }
          options.success?.(result)
          resolve(result)
        },
        fail: (err) => {
          options.fail?.(err)
          reject(err)
        },
        complete: options.complete
      })
    }
  })
}

/**
 * previewImage 兼容
 * H5环境使用新窗口打开图片
 */
export interface PreviewImageOptions {
  urls: string[]
  current?: string
  success?: () => void
  fail?: (error: any) => void
}

export function previewImage(options: PreviewImageOptions): void {
  if (isH5) {
    // H5 环境：创建一个简单的图片预览遮罩层
    const currentUrl = options.current || options.urls[0]
    let currentIndex = options.urls.indexOf(currentUrl)
    if (currentIndex === -1) currentIndex = 0

    // 创建预览容器
    const overlay = document.createElement('div')
    overlay.id = 'taro-compat-preview-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    `

    // 创建图片元素
    const img = document.createElement('img')
    img.src = options.urls[currentIndex]
    img.style.cssText = `
      max-width: 90%;
      max-height: 80%;
      object-fit: contain;
    `

    // 创建关闭按钮
    const closeBtn = document.createElement('div')
    closeBtn.innerText = '×'
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      color: white;
      font-size: 36px;
      cursor: pointer;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    // 创建页码指示器（如果有多张图片）
    let indicator: HTMLElement | null = null
    if (options.urls.length > 1) {
      indicator = document.createElement('div')
      indicator.style.cssText = `
        position: absolute;
        bottom: 40px;
        color: white;
        font-size: 14px;
      `
      indicator.innerText = `${currentIndex + 1} / ${options.urls.length}`
    }

    // 更新图片和指示器的函数
    const updateImage = (index: number) => {
      img.src = options.urls[index]
      if (indicator) {
        indicator.innerText = `${index + 1} / ${options.urls.length}`
      }
    }

    // 关闭预览
    const closePreview = () => {
      try {
        document.body.removeChild(overlay)
      } catch (e) {
        // 忽略错误
      }
    }

    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closePreview()
      }
    })

    // 点击关闭按钮关闭
    closeBtn.addEventListener('click', closePreview)

    // 左右滑动切换图片（如果有多张）
    if (options.urls.length > 1) {
      let startX = 0
      overlay.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX
      })
      overlay.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX
        const diff = endX - startX
        if (Math.abs(diff) > 50) {
          if (diff > 0 && currentIndex > 0) {
            // 向右滑，上一张
            currentIndex--
            updateImage(currentIndex)
          } else if (diff < 0 && currentIndex < options.urls.length - 1) {
            // 向左滑，下一张
            currentIndex++
            updateImage(currentIndex)
          }
        }
      })
    }

    // 组装 DOM
    overlay.appendChild(img)
    overlay.appendChild(closeBtn)
    if (indicator) {
      overlay.appendChild(indicator)
    }
    document.body.appendChild(overlay)

    if (options.success) {
      options.success()
    }
  } else {
    Taro.previewImage(options)
  }
}


/**
 * 初始化 Taro 兼容层
 * 在 H5 环境下全局覆盖 Taro 的 showLoading 和 hideLoading 方法
 * 解决 H5 环境下这些 API 可能不存在或不兼容的问题
 *
 * @description 应在应用启动时调用此函数（如 app.tsx 的 componentDidMount）
 */
export function initTaroCompat(): void {
  // 避免重复初始化
  if (isInitialized) {
    return
  }

  if (isH5) {
    logger.info('初始化 Taro H5 兼容层')

    // 全局覆盖 Taro.showLoading
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.showLoading = (options: ShowLoadingOptions) => {
      showLoading(options)
      return Promise.resolve({errMsg: 'showLoading:ok'})
    }

    // 全局覆盖 Taro.hideLoading
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.hideLoading = () => {
      hideLoading()
      return Promise.resolve({errMsg: 'hideLoading:ok'})
    }

    // 全局覆盖 Taro.showToast
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.showToast = (options: ShowToastOptions) => {
      showToast(options)
      return Promise.resolve({errMsg: 'showToast:ok'})
    }

    // 全局覆盖 Taro.hideToast
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.hideToast = () => {
      hideToast()
      return Promise.resolve({errMsg: 'hideToast:ok'})
    }

    // 全局覆盖 Taro.showModal
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.showModal = (options: ShowModalOptions) => {
      return showModal(options)
    }

    // 全局覆盖 Taro.previewImage
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.previewImage = (options: PreviewImageOptions) => {
      previewImage(options)
      return Promise.resolve({errMsg: 'previewImage:ok'})
    }

    // 全局覆盖 Taro.getStorageSync
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.getStorageSync = <T = any>(key: string): T | null => {
      return getStorageSync<T>(key)
    }

    // 全局覆盖 Taro.setStorageSync
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.setStorageSync = <T = unknown>(key: string, data: T): void => {
      setStorageSync(key, data)
    }

    // 全局覆盖 Taro.removeStorageSync
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.removeStorageSync = (key: string): void => {
      removeStorageSync(key)
    }

    // 全局覆盖 Taro.setStorage（异步版本）
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.setStorage = <T = unknown>(options: SetStorageOptions<T>) => {
      return setStorage(options)
    }

    // 全局覆盖 Taro.removeStorage（异步版本）
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.removeStorage = (options: RemoveStorageOptions) => {
      return removeStorage(options)
    }

    // 全局覆盖 Taro.chooseImage
    // @ts-ignore - 需要覆盖 Taro 的方法
    Taro.chooseImage = (options: ChooseImageOptions) => {
      return chooseImage(options)
    }

    logger.info('Taro H5 兼容层初始化完成')
  }

  isInitialized = true
}
