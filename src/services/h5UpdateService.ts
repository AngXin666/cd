/**
 * H5热更新服务
 * 使用 @capawesome/capacitor-live-update 实现真正的APK内H5代码热更新
 */

import {LiveUpdate} from '@capawesome/capacitor-live-update'
import {supabase} from '@/db/supabase'
import packageJson from '../../package.json'

// 存储键名
const STORAGE_KEY_H5_VERSION = 'h5_local_version'

export interface H5VersionInfo {
  version: string
  h5_url: string
  release_notes?: string
  is_force_update: boolean
  created_at: string
}

export interface UpdateProgress {
  percent: number
  status: 'downloading' | 'installing' | 'complete' | 'error'
  message?: string
}

export type ProgressCallback = (progress: UpdateProgress) => void

export function getCurrentH5Version(): string {
  const localVersion = localStorage.getItem(STORAGE_KEY_H5_VERSION)
  if (localVersion) {
    return localVersion
  }
  return packageJson.version
}

export function getLocalH5Version(): string {
  return packageJson.version
}

export async function getLatestH5Version(): Promise<H5VersionInfo | null> {
  console.log('[H5Update] 开始查询 h5_versions 表...')
  try {
    const {data, error} = await supabase
      .from('h5_versions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', {ascending: false})
      .limit(1)

    if (error) {
      console.error('[H5Update] 查询 h5_versions 失败:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return null
    }

    // 记录查询结果
    console.log('[H5Update] 查询结果:', {
      hasData: !!data,
      recordCount: data?.length || 0
    })

    // 取第一条（最新的）
    if (data && data.length > 0) {
      const versionInfo = data[0] as H5VersionInfo
      console.log('[H5Update] 获取到最新版本:', {
        version: versionInfo.version,
        h5_url: versionInfo.h5_url,
        is_force_update: versionInfo.is_force_update
      })
      return versionInfo
    }

    console.warn('[H5Update] ⚠️ 没有找到活跃的 H5 版本！请检查数据库中 h5_versions 表是否有 is_active=true 的记录')
    return null
  } catch (error) {
    console.error('[H5Update] 查询 h5_versions 异常:', error)
    return null
  }
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

/**
 * 检查是否有 H5 更新
 * @returns 更新检查结果，包含是否需要更新和版本信息
 */
export async function checkForH5Update(): Promise<{
  needsUpdate: boolean
  versionInfo?: H5VersionInfo
}> {
  console.log('[H5Update] 开始检查更新...')
  try {
    const currentVersion = getCurrentH5Version()
    console.log('[H5Update] 当前本地版本:', currentVersion)

    const latestVersion = await getLatestH5Version()

    if (!latestVersion) {
      console.warn('[H5Update] 未获取到服务器版本信息')
      return {needsUpdate: false}
    }

    console.log('[H5Update] 服务器最新版本:', latestVersion.version)

    const comparison = compareVersions(latestVersion.version, currentVersion)
    console.log('[H5Update] 版本比较结果:', comparison, comparison > 0 ? '需要更新' : '无需更新')

    if (comparison > 0) {
      return {needsUpdate: true, versionInfo: latestVersion}
    }
    
    return {needsUpdate: false}
  } catch (error) {
    console.error('[H5Update] 检查更新失败:', error)
    return {needsUpdate: false}
  }
}

/**
 * 应用H5更新 - 使用LiveUpdate下载并应用更新包
 * @param h5Url - zip包URL
 * @param version - 版本号
 * @param onProgress - 进度回调
 * @returns 是否更新成功
 */
export async function applyH5Update(h5Url: string, version: string, onProgress?: ProgressCallback): Promise<boolean> {
  console.log('[H5Update] 开始下载更新:', {h5Url, version})

  try {
    // 确保URL指向zip包
    const zipUrl = h5Url.endsWith('.zip') ? h5Url : `${h5Url}bundle.zip`
    console.log('[H5Update] 最终下载URL:', zipUrl)

    // 检查LiveUpdate是否可用
    if (!LiveUpdate || typeof LiveUpdate.downloadBundle !== 'function') {
      throw new Error('LiveUpdate插件不可用，请在APP中使用此功能')
    }

    // 开始下载
    onProgress?.({percent: 0, status: 'downloading', message: '开始下载...'})

    // 模拟进度（LiveUpdate不提供实时进度）
    let simulatedProgress = 0
    const progressInterval = setInterval(() => {
      if (simulatedProgress < 90) {
        simulatedProgress += Math.random() * 15
        if (simulatedProgress > 90) simulatedProgress = 90
        onProgress?.({
          percent: simulatedProgress,
          status: 'downloading',
          message: '正在下载...'
        })
      }
    }, 300)

    try {
      // 下载更新包
      await LiveUpdate.downloadBundle({
        url: zipUrl,
        bundleId: version
      })

      clearInterval(progressInterval)
      console.log('[H5Update] 下载完成')

      // 安装阶段
      onProgress?.({percent: 95, status: 'installing', message: '正在安装...'})

      // 设置下一次启动使用的bundle
      await LiveUpdate.setNextBundle({
        bundleId: version
      })

      // 验证bundle是否设置成功
      const bundles = await LiveUpdate.getBundles()
      const bundleExists = bundles.bundleIds?.includes(version)

      if (!bundleExists) {
        throw new Error('Bundle设置失败：未找到已下载的bundle')
      }

      console.log('[H5Update] Bundle验证成功')

      // 保存版本信息
      localStorage.setItem(STORAGE_KEY_H5_VERSION, version)

      // 完成
      onProgress?.({percent: 100, status: 'complete', message: '更新完成'})
      console.log('[H5Update] 安装完成')

      return true
    } catch (downloadError) {
      clearInterval(progressInterval)
      throw downloadError
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[H5Update] 更新失败:', error)
    onProgress?.({percent: 0, status: 'error', message: errorMsg})
    return false
  }
}

/**
 * 重启应用以应用更新
 * 注意：LiveUpdate.reload() 只会重新加载WebView，不会重启整个APP
 * 要应用更新，用户需要完全退出APP后重新打开
 */
export async function reloadApp(): Promise<void> {
  try {
    // 这只会重新加载WebView，不是真正的APP重启
    await LiveUpdate.reload()
  } catch (e) {
    console.error('重新加载失败:', e)
    // 降级方案：刷新页面
    window.location.reload()
  }
}

/**
 * 获取当前bundle信息
 */
export async function getCurrentBundle(): Promise<string | null> {
  try {
    const result = await LiveUpdate.getCurrentBundle()
    return result.bundleId || null
  } catch (_e) {
    return null
  }
}

/**
 * 获取所有已下载的bundle
 */
export async function getBundles(): Promise<string[]> {
  try {
    const result = await LiveUpdate.getBundles()
    return result.bundleIds || []
  } catch (_e) {
    return []
  }
}

/**
 * 删除指定bundle
 */
export async function deleteBundle(bundleId: string): Promise<void> {
  try {
    await LiveUpdate.deleteBundle({bundleId})
  } catch (e) {
    console.warn('删除bundle失败:', e)
  }
}

/**
 * 重置到原始版本
 */
export async function resetToDefault(): Promise<void> {
  try {
    await LiveUpdate.reset()
    localStorage.removeItem(STORAGE_KEY_H5_VERSION)
  } catch (e) {
    console.warn('重置失败:', e)
  }
}

/**
 * 初始化LiveUpdate - 在应用启动时调用
 */
export async function initLiveUpdate(): Promise<void> {
  try {
    // 准备下一个bundle（如果有设置的话）
    await LiveUpdate.ready()
    console.log('LiveUpdate初始化完成')
  } catch (e) {
    console.warn('LiveUpdate初始化失败:', e)
  }
}
