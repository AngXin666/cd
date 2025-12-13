/**
 * 热更新管理
 * 用于检测和下载云端更新包
 */

import Taro from '@tarojs/taro'
import {
  getStorageSync,
  hideLoading,
  removeStorageSync,
  setStorageSync,
  showLoading,
  showModal,
  showToast
} from '@/utils/taroCompat'
import {createLogger} from './logger'
import {enhancedErrorHandler} from './errorHandler'

const logger = createLogger('HotUpdate')

const UPDATE_CHECK_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/app-updates/latest.zip'
const UPDATE_VERSION_KEY = 'hot_update_version'
const LAST_CHECK_TIME_KEY = 'last_update_check'
const CHECK_INTERVAL = 3600000 // 1小时检查一次

interface UpdateInfo {
  version: string
  size: number
  downloadUrl: string
}

/**
 * 检查是否需要更新
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    // 检查上次检查时间,避免频繁检查
    const lastCheckTime = getStorageSync<number>(LAST_CHECK_TIME_KEY) || 0
    const now = Date.now()

    if (now - lastCheckTime < CHECK_INTERVAL) {
      return null
    }

    // 发送HEAD请求获取文件信息
    const result = await Taro.request({
      url: UPDATE_CHECK_URL,
      method: 'HEAD'
    })

    if (result.statusCode === 200) {
      const lastModified = result.header['last-modified'] || result.header['Last-Modified']
      const contentLength = result.header['content-length'] || result.header['Content-Length']

      // 使用文件修改时间作为版本号
      const version = lastModified || new Date().toISOString()
      const currentVersion = getStorageSync<string>(UPDATE_VERSION_KEY)

      // 更新最后检查时间
      setStorageSync(LAST_CHECK_TIME_KEY, now)

      // 如果版本不同,说明有新版本
      if (version !== currentVersion) {
        return {
          version,
          size: parseInt(contentLength, 10) || 0,
          downloadUrl: UPDATE_CHECK_URL
        }
      } else {
        return null
      }
    }

    return null
  } catch (error) {
    enhancedErrorHandler.handleWithContext(error, {
      showToast: false,
      context: {
        component: 'HotUpdate',
        action: 'checkForUpdate'
      }
    })
    return null
  }
}

/**
 * 下载并应用更新
 */
export async function downloadAndApplyUpdate(updateInfo: UpdateInfo): Promise<boolean> {
  try {
    // 显示下载进度
    showLoading({
      title: '下载更新中...',
      mask: true
    })

    // 下载更新包
    const downloadTask = Taro.downloadFile({
      url: updateInfo.downloadUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存新版本号
          setStorageSync(UPDATE_VERSION_KEY, updateInfo.version)

          hideLoading()

          // 提示用户重启应用
          showModal({
            title: '更新下载完成',
            content: '应用将重新加载以应用更新',
            showCancel: false,
            success: () => {
              // 重新加载页面
              Taro.reLaunch({
                url: '/pages/index/index'
              })
            }
          })
        } else {
          logger.error('下载失败，状态码非 200', {statusCode: res.statusCode})
          hideLoading()
          showToast({
            title: `下载失败 (${res.statusCode})`,
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        logger.error('downloadFile fail 回调触发', {
          errorType: typeof err,
          errorObject: err,
          errMsg: err.errMsg,
          allKeys: err ? Object.keys(err) : []
        })

        hideLoading()
        showToast({
          title: err.errMsg || '更新下载失败',
          icon: 'none',
          duration: 3000
        })
      }
    })

    if (!downloadTask) {
      logger.error('downloadTask 为 null 或 undefined')
      hideLoading()
      showToast({
        title: '下载任务创建失败',
        icon: 'none'
      })
      return false
    }

    // 监听下载进度
    if (downloadTask.onProgressUpdate) {
      downloadTask.onProgressUpdate((res) => {
        if (res.progress % 10 === 0) {
          showLoading({
            title: `下载中 ${res.progress}%`,
            mask: true
          })
        }
      })
    } else {
    }

    return true
  } catch (error) {
    enhancedErrorHandler.handleWithContext(error, {
      showToast: false,
      context: {
        component: 'HotUpdate',
        action: 'downloadAndApplyUpdate',
        metadata: {
          errorType: typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'N/A'
        }
      }
    })

    hideLoading()
    return false
  }
}

/**
 * 静默检查更新(不打断用户)
 */
export async function silentCheckUpdate(): Promise<void> {
  try {
    const updateInfo = await checkForUpdate()

    if (updateInfo) {
      // 发现新版本,询问用户是否更新
      showModal({
        title: '发现新版本',
        content: `有新功能或修复可用 (${(updateInfo.size / 1024).toFixed(0)}KB),是否立即更新?`,
        confirmText: '立即更新',
        cancelText: '稍后提醒',
        success: (res) => {
          if (res.confirm) {
            downloadAndApplyUpdate(updateInfo)
          }
        }
      })
    }
  } catch (error) {
    enhancedErrorHandler.handleWithContext(error, {
      showToast: false,
      context: {
        component: 'HotUpdate',
        action: 'silentCheckUpdate'
      }
    })
  }
}

/**
 * 强制检查更新(用户手动触发)
 */
export async function forceCheckUpdate(): Promise<void> {
  showLoading({
    title: '检查更新中...',
    mask: true
  })

  try {
    // 清除上次检查时间,强制检查
    removeStorageSync(LAST_CHECK_TIME_KEY)

    const updateInfo = await checkForUpdate()

    hideLoading()

    if (updateInfo) {
      showModal({
        title: '发现新版本',
        content: `有新功能或修复可用 (${(updateInfo.size / 1024).toFixed(0)}KB),是否立即更新?`,
        confirmText: '立即更新',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            downloadAndApplyUpdate(updateInfo)
          }
        }
      })
    } else {
      showToast({
        title: '已是最新版本',
        icon: 'success'
      })
    }
  } catch (_error) {
    hideLoading()
    showToast({
      title: '检查更新失败',
      icon: 'none'
    })
  }
}
