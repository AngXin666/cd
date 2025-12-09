/**
 * 热更新管理
 * 用于检测和下载云端更新包
 */

import Taro from '@tarojs/taro'

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
    const lastCheckTime = Taro.getStorageSync(LAST_CHECK_TIME_KEY) || 0
    const now = Date.now()
    
    if (now - lastCheckTime < CHECK_INTERVAL) {
      console.log('[热更新] 距离上次检查不足1小时,跳过')
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
      const currentVersion = Taro.getStorageSync(UPDATE_VERSION_KEY)

      // 更新最后检查时间
      Taro.setStorageSync(LAST_CHECK_TIME_KEY, now)

      // 如果版本不同,说明有新版本
      if (version !== currentVersion) {
        console.log(`[热更新] 发现新版本: ${version}`)
        return {
          version,
          size: parseInt(contentLength) || 0,
          downloadUrl: UPDATE_CHECK_URL
        }
      } else {
        console.log('[热更新] 已是最新版本')
        return null
      }
    }

    return null
  } catch (error) {
    console.error('[热更新] 检查更新失败:', error)
    return null
  }
}

/**
 * 下载并应用更新
 */
export async function downloadAndApplyUpdate(updateInfo: UpdateInfo): Promise<boolean> {
  try {
    console.log('========================================')
    console.log('[热更新] 🚀 开始下载更新包')
    console.log('[热更新] 📋 版本号:', updateInfo.version)
    console.log('[热更新] 📦 文件大小:', updateInfo.size, 'bytes')
    console.log('[热更新] 🔗 下载地址:', updateInfo.downloadUrl)
    console.log('========================================')
    
    // 显示下载进度
    Taro.showLoading({
      title: '下载更新中...',
      mask: true
    })

    // 下载更新包
    const downloadTask = Taro.downloadFile({
      url: updateInfo.downloadUrl,
      success: (res) => {
        console.log('[热更新] ✅ downloadFile success 回调触发')
        console.log('[热更新] 📊 响应状态码:', res.statusCode)
        console.log('[热更新] 📁 临时文件路径:', res.tempFilePath)
        console.log('[热更新] 📋 响应头:', JSON.stringify(res.header))
        
        if (res.statusCode === 200) {
          console.log('[热更新] ✅ 下载成功，状态码 200')
          
          // 保存新版本号
          console.log('[热更新] 💾 保存新版本号到本地存储:', updateInfo.version)
          Taro.setStorageSync(UPDATE_VERSION_KEY, updateInfo.version)
          
          Taro.hideLoading()
          console.log('[热更新] 🎉 准备重启应用应用更新')
          
          // 提示用户重启应用
          Taro.showModal({
            title: '更新下载完成',
            content: '应用将重新加载以应用更新',
            showCancel: false,
            success: () => {
              console.log('[热更新] 🔄 用户确认重启，执行 reLaunch')
              // 重新加载页面
              Taro.reLaunch({
                url: '/pages/index/index'
              })
            }
          })
        } else {
          console.error('[热更新] ❌ 下载失败，状态码非 200:', res.statusCode)
          Taro.hideLoading()
          Taro.showToast({
            title: `下载失败 (${res.statusCode})`,
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('========================================')
        console.error('[热更新] ❌ downloadFile fail 回调触发')
        console.error('[热更新] 错误类型:', typeof err)
        console.error('[热更新] 错误对象:', JSON.stringify(err, null, 2))
        console.error('[热更新] errMsg:', err.errMsg)
        
        // 尝试输出所有可能的错误信息字段
        if (err) {
          Object.keys(err).forEach(key => {
            console.error(`[热更新] err.${key}:`, err[key])
          })
        }
        console.error('========================================')
        
        Taro.hideLoading()
        Taro.showToast({
          title: err.errMsg || '更新下载失败',
          icon: 'none',
          duration: 3000
        })
      }
    })

    console.log('[热更新] 📡 downloadTask 对象:', downloadTask)
    console.log('[热更新] 📡 downloadTask 类型:', typeof downloadTask)
    
    if (!downloadTask) {
      console.error('[热更新] ❌ downloadTask 为 null 或 undefined！')
      Taro.hideLoading()
      Taro.showToast({
        title: '下载任务创建失败',
        icon: 'none'
      })
      return false
    }

    // 监听下载进度
    if (downloadTask.onProgressUpdate) {
      console.log('[热更新] ✅ onProgressUpdate 方法存在，开始监听进度')
      downloadTask.onProgressUpdate((res) => {
        console.log(`[热更新] 📊 下载进度: ${res.progress}%, 已下载: ${res.totalBytesWritten}/${res.totalBytesExpectedToWrite}`)
        if (res.progress % 10 === 0) {
          Taro.showLoading({
            title: `下载中 ${res.progress}%`,
            mask: true
          })
        }
      })
    } else {
      console.warn('[热更新] ⚠️ downloadTask.onProgressUpdate 不存在')
    }

    return true
  } catch (error) {
    console.error('========================================')
    console.error('[热更新] ❌ 捕获到异常')
    console.error('[热更新] 异常类型:', typeof error)
    console.error('[热更新] 异常对象:', error)
    console.error('[热更新] 异常消息:', error instanceof Error ? error.message : String(error))
    console.error('[热更新] 堆栈信息:', error instanceof Error ? error.stack : 'N/A')
    console.error('========================================')
    
    Taro.hideLoading()
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
      Taro.showModal({
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
    console.error('[热更新] 静默检查失败:', error)
  }
}

/**
 * 强制检查更新(用户手动触发)
 */
export async function forceCheckUpdate(): Promise<void> {
  Taro.showLoading({
    title: '检查更新中...',
    mask: true
  })

  try {
    // 清除上次检查时间,强制检查
    Taro.removeStorageSync(LAST_CHECK_TIME_KEY)
    
    const updateInfo = await checkForUpdate()
    
    Taro.hideLoading()

    if (updateInfo) {
      Taro.showModal({
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
      Taro.showToast({
        title: '已是最新版本',
        icon: 'success'
      })
    }
  } catch (error) {
    Taro.hideLoading()
    Taro.showToast({
      title: '检查更新失败',
      icon: 'none'
    })
  }
}
