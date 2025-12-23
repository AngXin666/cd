/**
 * 认证工具模块
 * 提供用户登出、会话管理等认证相关功能
 *
 * @module utils/auth
 */

import Taro from '@tarojs/taro'
import {supabase} from '@/client/supabase'
import {realtimeCacheInvalidator} from '@/db/realtime'
import {clearAllCache, apiCache, clearAllRepositoryCache} from './cache'
import {createLogger} from './logger'
import {hideLoading} from './taroCompat'
import {clearSession, stopRealtimeMonitor} from './sessionManager'
import {SUCCESS_MESSAGES, ERROR_MESSAGES} from '@/constants/messages'

const logger = createLogger('Auth')

/**
 * 全局退出登录状态标志
 * 用于防止退出登录时首页组件显示 "加载用户信息中..." 的 loading
 * 当设置为 true 时，首页组件应该跳过显示 loading
 */
let isLoggingOut = false

/**
 * 检查是否正在退出登录
 * @returns 是否正在退出登录
 */
export function isLogoutInProgress(): boolean {
  return isLoggingOut
}

/**
 * 重置退出登录状态
 * 在登录成功后调用，确保状态被正确重置
 */
export function resetLogoutState(): void {
  isLoggingOut = false
}

/**
 * 清理所有用户相关的缓存和存储
 * 在退出登录时调用，确保下次登录时不会加载旧数据
 *
 * 清理内容包括：
 * 1. 内存缓存（clearAllCache、apiCache）
 * 2. Repository 层缓存（clearAllRepositoryCache）
 * 3. localStorage 中的用户数据（保留记住密码相关数据）
 *
 * 注意：H5 环境下 Taro.getStorageInfoSync 不可用，需要直接使用 localStorage API
 */
function clearUserData(): void {
  try {
    // 1. 清理内存缓存（旧的简单缓存）
    clearAllCache()
    apiCache.clear()

    // 2. 清理所有 Repository 层缓存（新的 Repository 模式缓存）
    clearAllRepositoryCache()

    // 3. 需要保留的存储键（记住密码相关）
    const keysToKeep = ['saved_account', 'saved_password', 'remember_me', 'login_bg_index']

    // 4. 根据环境选择不同的清理方式
    if (process.env.TARO_ENV === 'h5' && typeof localStorage !== 'undefined') {
      // H5 环境：直接使用 localStorage API
      const localStorageKeysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && !keysToKeep.includes(key)) {
          localStorageKeysToRemove.push(key)
        }
      }
      for (const key of localStorageKeysToRemove) {
        try {
          localStorage.removeItem(key)
        } catch (_e) {
          // 忽略单个键清理失败
        }
      }
    } else {
      // 小程序环境：使用 Taro API
      try {
        const storageInfo = Taro.getStorageInfoSync()
        const allKeys = storageInfo.keys || []

        for (const key of allKeys) {
          if (!keysToKeep.includes(key)) {
            try {
              Taro.removeStorageSync(key)
            } catch (_e) {
              // 忽略单个键清理失败
            }
          }
        }
      } catch (_e) {
        // 如果 getStorageInfoSync 失败，忽略错误
        logger.warn('获取存储信息失败，跳过存储清理')
      }
    }

    logger.info('用户数据已清理（包括 Repository 缓存）')
  } catch (error) {
    logger.error('清理用户数据失败', error)
  }
}

/**
 * 智能退出登录
 * 根据登录来源决定退出后跳转的页面
 * - 如果是通过测试登录进入的，退出后返回对应的测试登录页面
 * - 如果是通过正常登录进入的，退出后返回正常登录页面
 *
 * 退出时会：
 * 1. 停止会话检查定时器
 * 2. 清理 Realtime 缓存失效订阅
 * 3. 清除数据库中的会话令牌
 * 4. 清理所有缓存和用户数据
 * 5. 跳转到登录页面
 */
export async function smartLogout(): Promise<void> {
  try {
    // 设置退出登录状态标志，防止首页组件显示 loading
    isLoggingOut = true

    // 先隐藏所有 loading 状态，防止退出后还显示 "加载用户信息中..."
    hideLoading()

    // 停止实时会话监听（包括 WebSocket 和轮询）
    stopRealtimeMonitor()

    // 清理 Realtime 缓存失效订阅（在清除缓存之前）
    try {
      await realtimeCacheInvalidator.cleanup()
      logger.debug('Realtime 缓存失效订阅已清理')
    } catch (error) {
      logger.error('清理 Realtime 缓存失效订阅失败', error)
      // 不阻塞登出流程
    }

    // 检查登录来源页面（在清理前获取）
    const loginSourcePage = Taro.getStorageSync('loginSourcePage')

    // 获取当前用户ID，用于清除数据库中的会话令牌
    const { data: { user } } = await supabase.auth.getUser()
    
    // 清除数据库中的会话令牌（单点登录）
    if (user?.id) {
      await clearSession(user.id)
    }

    // 执行退出登录
    await supabase.auth.signOut()

    // 清理所有用户相关的缓存和存储
    clearUserData()

    // 显示退出成功提示
    Taro.showToast({
      title: SUCCESS_MESSAGES.LOGOUT,
      icon: 'success',
      duration: 1500
    })

    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      // 跳转前再次隐藏 loading，确保干净
      hideLoading()

      if (loginSourcePage) {
        // 返回登录来源页面
        Taro.reLaunch({url: loginSourcePage})
      } else {
        // 默认返回正常登录页面
        Taro.reLaunch({url: '/pages/login/index'})
      }

      // 页面跳转后重置退出状态（延迟一点确保跳转完成）
      setTimeout(() => {
        isLoggingOut = false
      }, 500)
    }, 1500)
  } catch (error) {
    // 发生错误时重置退出状态
    isLoggingOut = false
    logger.error('退出登录失败', error)
    Taro.showToast({
      title: ERROR_MESSAGES.LOGOUT,
      icon: 'none'
    })
  }
}
