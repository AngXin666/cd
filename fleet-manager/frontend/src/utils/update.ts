/**
 * 热更新检测工具
 * 用于检查应用是否有新版本，并提示用户更新
 */

import { checkAppUpdate } from '@/api'
import type { AppVersionCheckResponse } from '@/api/types'

// 当前应用版本（应与 manifest.json 中的版本保持一致）
const CURRENT_VERSION = '1.0.0'
const CURRENT_VERSION_CODE = 1

// 获取当前平台
function getCurrentPlatform(): string {
  // #ifdef APP-PLUS
  const platform = uni.getSystemInfoSync().platform
  return platform === 'android' ? 'android' : 'ios'
  // #endif
  // #ifdef H5
  return 'h5'
  // #endif
  // #ifdef MP-WEIXIN
  return 'weixin'
  // #endif
  return 'all'
}

/**
 * 检查应用更新
 * @returns 更新检查结果
 */
export async function checkForUpdate(): Promise<AppVersionCheckResponse | null> {
  try {
    const platform = getCurrentPlatform()
    const result = await checkAppUpdate({
      current_version: CURRENT_VERSION,
      current_version_code: CURRENT_VERSION_CODE,
      platform,
    })
    return result
  } catch (error) {
    console.error('检查更新失败:', error)
    return null
  }
}

/**
 * 显示更新提示弹窗
 * @param updateInfo 更新信息
 */
export function showUpdateDialog(updateInfo: AppVersionCheckResponse): void {
  if (!updateInfo.has_update) return

  const title = updateInfo.is_force_update ? '发现新版本（必须更新）' : '发现新版本'
  const content = `
${updateInfo.title || '有新版本可用'}

版本：${updateInfo.latest_version}
${updateInfo.description ? `\n更新内容：\n${updateInfo.description}` : ''}
${updateInfo.file_size ? `\n文件大小：${formatFileSize(updateInfo.file_size)}` : ''}
  `.trim()

  if (updateInfo.is_force_update) {
    // 强制更新：只显示确定按钮
    uni.showModal({
      title,
      content,
      showCancel: false,
      confirmText: '立即更新',
      success: (res) => {
        if (res.confirm && updateInfo.download_url) {
          downloadAndInstall(updateInfo.download_url)
        }
      },
    })
  } else {
    // 可选更新：显示取消和确定按钮
    uni.showModal({
      title,
      content,
      cancelText: '稍后再说',
      confirmText: '立即更新',
      success: (res) => {
        if (res.confirm && updateInfo.download_url) {
          downloadAndInstall(updateInfo.download_url)
        }
      },
    })
  }
}

/**
 * 下载并安装更新
 * @param downloadUrl 下载地址
 */
function downloadAndInstall(downloadUrl: string): void {
  // #ifdef APP-PLUS
  uni.showLoading({ title: '下载中...', mask: true })
  
  const downloadTask = uni.downloadFile({
    url: downloadUrl,
    success: (res) => {
      uni.hideLoading()
      if (res.statusCode === 200) {
        // 安装更新包
        plus.runtime.install(
          res.tempFilePath,
          { force: true },
          () => {
            uni.showModal({
              title: '更新完成',
              content: '应用已更新，是否立即重启？',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  plus.runtime.restart()
                }
              },
            })
          },
          (error) => {
            console.error('安装失败:', error)
            uni.showToast({ title: '安装失败', icon: 'none' })
          }
        )
      } else {
        uni.showToast({ title: '下载失败', icon: 'none' })
      }
    },
    fail: (error) => {
      uni.hideLoading()
      console.error('下载失败:', error)
      uni.showToast({ title: '下载失败', icon: 'none' })
    },
  })

  // 显示下载进度
  downloadTask.onProgressUpdate((res) => {
    uni.showLoading({ title: `下载中 ${res.progress}%`, mask: true })
  })
  // #endif

  // #ifdef H5
  // H5 平台直接打开下载链接
  window.open(downloadUrl, '_blank')
  // #endif
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

/**
 * 应用启动时检查更新
 * 在 App.vue 的 onLaunch 中调用
 */
export async function checkUpdateOnLaunch(): Promise<void> {
  // 延迟检查，避免影响启动速度
  setTimeout(async () => {
    const updateInfo = await checkForUpdate()
    if (updateInfo?.has_update) {
      showUpdateDialog(updateInfo)
    }
  }, 2000)
}
