/**
 * 热更新服务模块
 * 提供应用热更新检测、下载和安装功能
 * 
 * 支持两种更新模式：
 * 1. 热更新（wgt 包）：仅更新前端资源，无需重新安装 APK
 * 2. 整包更新（APK）：需要下载完整 APK 并重新安装
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.4, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4
 */

import { checkAppUpdate } from '@/api'
import type { UpdateCheckResult, DownloadProgress, VersionInfo, InstallResult } from '@/api/types'

// ==================== 常量定义 ====================

/** 当前应用版本名称（应与 manifest.json 中的版本保持一致） */
const CURRENT_VERSION = '1.0.11'

/** 当前应用版本号（整数，用于版本比较） */
const CURRENT_VERSION_CODE = 111

/** 启动时检查更新的延迟时间（毫秒） */
const UPDATE_CHECK_DELAY = 2000

// ==================== 工具函数 ====================

/**
 * 获取当前平台类型
 * @returns 平台类型字符串：android, ios, h5, weixin, all
 */
function getCurrentPlatform(): 'android' | 'ios' | 'h5' {
  // #ifdef APP-PLUS
  const platform = uni.getSystemInfoSync().platform
  return platform === 'android' ? 'android' : 'ios'
  // #endif
  // #ifdef H5
  return 'h5'
  // #endif
  // #ifndef APP-PLUS
  // #ifndef H5
  return 'h5'
  // #endif
  // #endif
}

/**
 * 格式化文件大小为人类可读格式
 * @param bytes - 字节数
 * @returns 格式化后的字符串，如 "1.5 MB"
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

/**
 * 计算字符串的 MD5 值（用于文件校验）
 * 注意：此函数需要在 APP-PLUS 环境下使用 plus.io 读取文件内容
 * @param filePath - 文件路径
 * @returns MD5 值的 Promise
 */
async function calculateFileMD5(filePath: string): Promise<string> {
  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    // 使用 plus.io 读取文件并计算 MD5
    plus.io.resolveLocalFileSystemURL(
      filePath,
      (entry) => {
        // @ts-ignore - plus.io 类型定义不完整
        entry.file((file: any) => {
          const reader = new plus.io.FileReader()
          reader.onloadend = (e: any) => {
            try {
              // 使用 plus.crypto 计算 MD5
              // @ts-ignore - plus.crypto 类型定义不完整
              const md5 = plus.crypto.digestSync('MD5', e.target.result)
              resolve(md5.toLowerCase())
            } catch (error) {
              // 如果 plus.crypto 不可用，使用简单的哈希算法
              const content = e.target.result as string
              const hash = simpleHash(content)
              resolve(hash)
            }
          }
          reader.onerror = (e: any) => {
            reject(new Error('读取文件失败: ' + e.message))
          }
          reader.readAsDataURL(file)
        }, (error: any) => {
          reject(new Error('获取文件失败: ' + error.message))
        })
      },
      (error) => {
        reject(new Error('解析文件路径失败: ' + error.message))
      }
    )
  })
  // #endif
  // #ifndef APP-PLUS
  // 非 APP 环境下返回空字符串
  return Promise.resolve('')
  // #endif
}

/**
 * 简单哈希算法（备用方案）
 * @param str - 输入字符串
 * @returns 哈希值
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为 32 位整数
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// ==================== MD5 校验功能 ====================

/**
 * 验证文件 MD5 校验值
 * 用于校验下载文件的完整性
 * 
 * @param filePath - 文件路径
 * @param expectedMD5 - 期望的 MD5 值
 * @returns 校验结果，true 表示匹配，false 表示不匹配
 * 
 * Requirements: 3.2 - wgt 包下载完成时验证包的完整性（MD5 校验）
 */
export async function verifyMD5(filePath: string, expectedMD5: string): Promise<boolean> {
  // 如果没有提供期望的 MD5 值，跳过校验
  if (!expectedMD5) {
    console.warn('[HotUpdate] 未提供 MD5 校验值，跳过校验')
    return true
  }

  try {
    const actualMD5 = await calculateFileMD5(filePath)
    const isMatch = actualMD5.toLowerCase() === expectedMD5.toLowerCase()
    
    if (!isMatch) {
      console.error('[HotUpdate] MD5 校验失败:', {
        expected: expectedMD5,
        actual: actualMD5,
      })
    } else {
      console.log('[HotUpdate] MD5 校验成功')
    }
    
    return isMatch
  } catch (error) {
    console.error('[HotUpdate] MD5 校验出错:', error)
    // 校验出错时返回 true，允许继续安装（降级处理）
    return true
  }
}

// ==================== HotUpdateService 类 ====================

/**
 * 热更新服务类
 * 提供完整的热更新检测、下载和安装功能
 * 
 * Requirements:
 * - 1.1: 应用启动时自动检查更新
 * - 1.2: 用户手动触发检查更新
 * - 3.1: 下载 wgt 包并显示下载进度
 * - 3.4: 调用 plus.runtime.install 安装更新
 * - 4.1: 下载 APK 并显示下载进度
 * - 4.2: 调用系统安装器安装 APK
 * - 5.1, 5.2: 显示更新提示弹窗
 * - 5.3: 展示版本号、更新内容和文件大小
 * - 5.4: 显示进度条和百分比
 */
export class HotUpdateService {
  /** 当前是否正在下载 */
  private isDownloading = false
  
  /** 当前下载任务 */
  private downloadTask: UniApp.DownloadTask | null = null

  /**
   * 获取当前应用版本信息
   * @returns 版本信息对象
   * 
   * Requirements: 1.3 - 包含当前版本号、版本名称和平台信息
   */
  getCurrentVersion(): VersionInfo {
    return {
      versionName: CURRENT_VERSION,
      versionCode: CURRENT_VERSION_CODE,
      platform: getCurrentPlatform(),
    }
  }

  /**
   * 应用启动时检查更新
   * 在 App.vue 的 onLaunch 中调用
   * 延迟 2 秒后自动检查更新，避免影响启动速度
   * 
   * Requirements: 1.1 - 应用启动时延迟 2 秒后自动检查更新
   */
  async checkUpdateOnLaunch(): Promise<void> {
    // 显示调试信息
    uni.showToast({ 
      title: '正在检查更新...', 
      icon: 'none',
      duration: 2000
    })
    
    // 延迟检查，避免影响启动速度
    setTimeout(async () => {
      try {
        console.log('[HotUpdate] 开始检查更新...')
        
        // 显示调试信息
        uni.showToast({ 
          title: '检查更新中...', 
          icon: 'none',
          duration: 2000
        })
        
        const updateInfo = await this.checkForUpdate()
        console.log('[HotUpdate] 检查更新完成:', updateInfo)
        
        if (updateInfo?.has_update) {
          console.log('[HotUpdate] 发现新版本，显示更新弹窗')
          
          // 显示调试信息
          uni.showToast({ 
            title: `发现新版本 ${updateInfo.latest_version}`, 
            icon: 'none',
            duration: 2000
          })
          
          this.showUpdateDialog(updateInfo)
        } else {
          console.log('[HotUpdate] 已是最新版本')
          
          // 显示调试信息
          uni.showToast({ 
            title: '已是最新版本', 
            icon: 'none',
            duration: 2000
          })
        }
      } catch (error) {
        // 显示错误信息
        console.error('[HotUpdate] 启动时检查更新失败:', error)
        
        uni.showToast({ 
          title: `检查更新失败: ${error}`, 
          icon: 'none',
          duration: 3000
        })
      }
    }, UPDATE_CHECK_DELAY)
  }

  /**
   * 手动检查更新
   * 立即向服务器发送版本检查请求
   * 
   * @returns 更新检查结果，如果请求失败返回 null
   * 
   * Requirements: 
   * - 1.2: 用户手动触发检查更新时立即发送请求
   * - 1.3: 请求包含当前版本号、版本名称和平台信息
   * - 1.4: 网络请求失败时静默处理错误并记录日志
   */
  async checkForUpdate(): Promise<UpdateCheckResult | null> {
    try {
      const versionInfo = this.getCurrentVersion()
      console.log('[HotUpdate] 检查更新，当前版本:', versionInfo)
      
      // 显示调试信息
      uni.showToast({ 
        title: `当前版本: ${versionInfo.versionName}`, 
        icon: 'none',
        duration: 2000
      })
      
      // 构建请求 URL（用于调试）
      const apiUrl = `http://45.197.148.64:8000/api/app/version/check?platform=${versionInfo.platform}&current_version=${versionInfo.versionName}&current_version_code=${versionInfo.versionCode}`
      console.log('[HotUpdate] 请求 URL:', apiUrl)
      
      const result = await checkAppUpdate({
        current_version: versionInfo.versionName,
        current_version_code: versionInfo.versionCode,
        platform: versionInfo.platform,
      })
      
      console.log('[HotUpdate] 检查更新结果:', result)
      
      // 显示调试信息
      uni.showToast({ 
        title: result?.has_update ? '有更新' : '无更新', 
        icon: 'none',
        duration: 2000
      })
      
      return result
    } catch (error) {
      // 记录错误并显示
      console.error('[HotUpdate] 检查更新失败:', error)
      
      uni.showToast({ 
        title: `请求失败: ${error}`, 
        icon: 'none',
        duration: 3000
      })
      
      return null
    }
  }

  /**
   * 显示更新提示弹窗
   * 根据是否强制更新显示不同的弹窗样式
   * 
   * @param updateInfo - 更新信息
   * 
   * Requirements:
   * - 5.1: 可选更新显示"稍后再说"和"立即更新"按钮
   * - 5.2: 强制更新仅显示"立即更新"按钮
   * - 5.3: 展示版本号、更新内容和文件大小
   */
  showUpdateDialog(updateInfo: UpdateCheckResult): void {
    if (!updateInfo.has_update) return

    const title = updateInfo.is_force_update ? '发现新版本（必须更新）' : '发现新版本'
    
    // 构建更新内容描述
    const contentParts: string[] = []
    
    // 版本信息
    if (updateInfo.latest_version) {
      contentParts.push(`版本：${updateInfo.latest_version}`)
    }
    
    // 更新说明
    if (updateInfo.description) {
      contentParts.push(`\n更新内容：\n${updateInfo.description}`)
    }
    
    // 文件大小
    if (updateInfo.file_size) {
      contentParts.push(`\n文件大小：${formatFileSize(updateInfo.file_size)}`)
    }
    
    // 更新类型提示
    if (updateInfo.update_type === 'wgt') {
      contentParts.push('\n（热更新，无需重新安装）')
    } else if (updateInfo.update_type === 'apk') {
      contentParts.push('\n（需要下载安装包）')
    }
    
    const content = contentParts.join('')

    if (updateInfo.is_force_update) {
      // 强制更新：只显示确定按钮
      uni.showModal({
        title,
        content,
        showCancel: false,
        confirmText: '立即更新',
        success: (res) => {
          if (res.confirm) {
            this.downloadAndInstall(updateInfo)
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
          if (res.confirm) {
            this.downloadAndInstall(updateInfo)
          }
        },
      })
    }
  }

  /**
   * 下载并安装更新
   * 根据更新类型选择不同的下载和安装方式
   * 
   * @param updateInfo - 更新信息
   * 
   * Requirements:
   * - 3.1: 下载 wgt 包并显示下载进度
   * - 3.2: 下载完成后验证 MD5
   * - 3.4: 调用 plus.runtime.install 安装 wgt 更新
   * - 4.1: 下载 APK 并显示下载进度
   * - 4.2: 调用系统安装器安装 APK
   * - 5.4: 显示进度条和百分比
   */
  async downloadAndInstall(updateInfo: UpdateCheckResult): Promise<void> {
    if (!updateInfo.download_url) {
      uni.showToast({ title: '下载地址无效', icon: 'none' })
      return
    }

    if (this.isDownloading) {
      uni.showToast({ title: '正在下载中...', icon: 'none' })
      return
    }

    // #ifdef APP-PLUS
    this.isDownloading = true
    
    try {
      // 显示下载进度
      uni.showLoading({ title: '准备下载...', mask: true })
      
      // 下载文件
      const filePath = await this.downloadFile(
        updateInfo.download_url,
        (progress) => {
          // 更新下载进度显示
          uni.showLoading({ 
            title: `下载中 ${progress.percent}%`, 
            mask: true 
          })
        }
      )
      
      uni.hideLoading()
      
      // MD5 校验
      if (updateInfo.md5) {
        uni.showLoading({ title: '校验文件...', mask: true })
        const isValid = await verifyMD5(filePath, updateInfo.md5)
        uni.hideLoading()
        
        if (!isValid) {
          // MD5 校验失败
          uni.showModal({
            title: '下载失败',
            content: '文件校验失败，是否重新下载？',
            confirmText: '重新下载',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                this.downloadAndInstall(updateInfo)
              }
            },
          })
          return
        }
      }
      
      // 安装更新
      if (updateInfo.update_type === 'wgt') {
        await this.installWgt(filePath)
      } else {
        await this.installApk(filePath)
      }
    } catch (error) {
      uni.hideLoading()
      console.error('[HotUpdate] 下载安装失败:', error)
      
      // 显示错误提示
      const errorMessage = error instanceof Error ? error.message : '下载失败'
      uni.showModal({
        title: '更新失败',
        content: `${errorMessage}\n\n是否重试？`,
        confirmText: '重试',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.downloadAndInstall(updateInfo)
          }
        },
      })
    } finally {
      this.isDownloading = false
      this.downloadTask = null
    }
    // #endif

    // #ifdef H5
    // H5 平台直接打开下载链接
    if (updateInfo.download_url) {
      window.open(updateInfo.download_url, '_blank')
    }
    // #endif
  }

  /**
   * 下载文件
   * @param url - 下载地址
   * @param onProgress - 进度回调
   * @returns 下载后的本地文件路径
   * 
   * Requirements:
   * - 3.1: 下载 wgt 包并显示下载进度
   * - 4.1: 下载 APK 并显示下载进度
   * - 4.4: 实时显示已下载大小和总大小
   */
  private downloadFile(
    url: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.downloadTask = uni.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath)
          } else {
            reject(new Error(`下载失败，状态码: ${res.statusCode}`))
          }
        },
        fail: (error) => {
          reject(new Error(`下载失败: ${error.errMsg}`))
        },
      })

      // 监听下载进度
      if (this.downloadTask && onProgress) {
        this.downloadTask.onProgressUpdate((res) => {
          onProgress({
            downloaded: res.totalBytesWritten,
            total: res.totalBytesExpectedToWrite,
            percent: res.progress,
          })
        })
      }
    })
  }

  /**
   * 安装 wgt 热更新包
   * @param filePath - wgt 文件路径
   * @returns 安装结果
   * 
   * Requirements:
   * - 3.4: 调用 plus.runtime.install 安装更新
   * - 3.5: 安装成功后提示用户重启应用
   * - 3.6: 安装失败时提示错误信息并建议整包更新
   */
  private installWgt(filePath: string): Promise<InstallResult> {
    return new Promise((resolve) => {
      // #ifdef APP-PLUS
      uni.showLoading({ title: '安装更新...', mask: true })
      
      plus.runtime.install(
        filePath,
        { force: true },
        () => {
          uni.hideLoading()
          console.log('[HotUpdate] wgt 安装成功')
          
          // 安装成功，提示重启
          uni.showModal({
            title: '更新完成',
            content: '应用已更新，是否立即重启？',
            confirmText: '立即重启',
            cancelText: '稍后重启',
            success: (res) => {
              if (res.confirm) {
                plus.runtime.restart()
              }
            },
          })
          
          resolve({ success: true })
        },
        (error) => {
          uni.hideLoading()
          console.error('[HotUpdate] wgt 安装失败:', error)
          
          // 安装失败，建议整包更新
          uni.showModal({
            title: '安装失败',
            content: '热更新安装失败，建议下载完整安装包进行更新。',
            showCancel: false,
            confirmText: '知道了',
          })
          
          resolve({ 
            success: false, 
            error: error.message || '安装失败' 
          })
        }
      )
      // #endif
      
      // #ifndef APP-PLUS
      resolve({ success: false, error: '当前环境不支持热更新' })
      // #endif
    })
  }

  /**
   * 安装 APK 整包
   * @param filePath - APK 文件路径
   * 
   * Requirements:
   * - 4.2: 调用系统安装器安装 APK
   */
  private installApk(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      uni.showLoading({ title: '准备安装...', mask: true })
      
      plus.runtime.install(
        filePath,
        { force: true },
        () => {
          uni.hideLoading()
          console.log('[HotUpdate] APK 安装启动成功')
          resolve()
        },
        (error) => {
          uni.hideLoading()
          console.error('[HotUpdate] APK 安装失败:', error)
          reject(new Error(error.message || 'APK 安装失败'))
        }
      )
      // #endif
      
      // #ifndef APP-PLUS
      reject(new Error('当前环境不支持 APK 安装'))
      // #endif
    })
  }

  /**
   * 取消当前下载
   */
  cancelDownload(): void {
    if (this.downloadTask) {
      this.downloadTask.abort()
      this.downloadTask = null
      this.isDownloading = false
      uni.hideLoading()
      uni.showToast({ title: '已取消下载', icon: 'none' })
    }
  }
}

// ==================== 导出单例实例 ====================

/** 热更新服务单例 */
export const hotUpdateService = new HotUpdateService()

// ==================== 便捷函数导出 ====================

/**
 * 检查应用更新（便捷函数）
 * @returns 更新检查结果
 */
export async function checkForUpdate(): Promise<UpdateCheckResult | null> {
  return hotUpdateService.checkForUpdate()
}

/**
 * 显示更新提示弹窗（便捷函数）
 * @param updateInfo - 更新信息
 */
export function showUpdateDialog(updateInfo: UpdateCheckResult): void {
  hotUpdateService.showUpdateDialog(updateInfo)
}

/**
 * 应用启动时检查更新（便捷函数）
 * 在 App.vue 的 onLaunch 中调用
 */
export async function checkUpdateOnLaunch(): Promise<void> {
  return hotUpdateService.checkUpdateOnLaunch()
}
