/**
 * 账号状态检查工具
 *
 * 用于检查用户账号是否可以登录，并返回相应的提示信息。
 * 支持检查账号过期、停用等状态。
 *
 * @module utils/account-status-check
 */

import Taro from '@tarojs/taro'
import { supabase } from '@/client/supabase'
import { usersRepository } from '@/db/repositories'
import { createLogger } from './logger'

const logger = createLogger('AccountStatusCheck')

/**
 * 账号状态检查结果接口
 */
export interface AccountStatusResult {
  /** 是否可以登录 */
  can_login: boolean
  /** 账号状态 */
  status: 'active' | 'inactive' | 'expired' | 'not_found' | 'no_lease'
  /** 状态消息 */
  message: string
  /** 用户角色 */
  role?: 'BOSS' | 'admin' | 'DRIVER'
  /** 是否是主账号 */
  is_main_account?: boolean
  /** 租赁结束日期 */
  lease_end_date?: string
}

/**
 * 检查账号状态
 *
 * 通过 RPC 调用检查用户账号是否可以登录。
 * 注意：RPC 调用保留直接 Supabase 调用，因为不属于 Repository 范围。
 *
 * @param userId - 用户 ID
 * @returns 账号状态检查结果，如果检查失败则返回 null
 *
 * @example
 * ```typescript
 * const status = await checkAccountStatus('user-123')
 * if (status && !status.can_login) {
 *   console.log('账号不可用:', status.message)
 * }
 * ```
 */
export async function checkAccountStatus(userId: string): Promise<AccountStatusResult | null> {
  try {
    // RPC 调用保留直接 Supabase 调用（不属于 Repository 范围）
    const { data, error } = await supabase.rpc('check_account_status', {
      user_id: userId
    })

    if (error) {
      logger.error('检查账号状态失败', error)
      return null
    }

    return data as AccountStatusResult
  } catch (error) {
    logger.error('检查账号状态异常', error)
    return null
  }
}

/**
 * 登录后检查账号状态
 *
 * 在用户登录后调用，检查账号是否可以继续使用。
 * 如果账号已过期或被停用，显示相应的提示信息并跳转到登录页。
 *
 * @returns 是否可以继续登录
 *
 * @example
 * ```typescript
 * const canLogin = await checkLoginStatus()
 * if (!canLogin) {
 *   // 用户已被登出并跳转到登录页
 * }
 * ```
 */
export async function checkLoginStatus(): Promise<boolean> {
  try {
    // 获取当前登录用户
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      return false
    }

    // 检查账号状态
    const status = await checkAccountStatus(user.id)

    if (!status) {
      logger.error('无法获取账号状态')
      Taro.showToast({
        title: '无法获取账号状态，请重试',
        icon: 'none',
        duration: 2000
      })
      return false
    }

    // 如果不能登录，显示提示信息
    if (!status.can_login) {
      // 显示提示信息
      await Taro.showModal({
        title: '账号状态提示',
        content: status.message,
        showCancel: false,
        confirmText: '确定'
      })

      // 退出登录
      await supabase.auth.signOut()

      // 跳转到登录页
      Taro.reLaunch({
        url: '/pages/login/index'
      })

      return false
    }

    // 可以登录
    return true
  } catch (error) {
    logger.error('检查登录状态异常', error)
    return false
  }
}

/**
 * 显示账号过期提示
 *
 * 根据用户角色显示不同的提示信息。
 *
 * @param role - 用户角色
 * @param isMainAccount - 是否是主账号
 *
 * @example
 * ```typescript
 * showExpiredMessage('BOSS', true)  // 显示：您的账号已过期，请续费使用
 * showExpiredMessage('DRIVER', false)  // 显示：您的账号已被停用，请联系管理员
 * ```
 */
export function showExpiredMessage(role: string, isMainAccount: boolean = false) {
  let message = ''

  if (role === 'BOSS' && isMainAccount) {
    // 主账号（老板）
    message = '您的账号已过期，请续费使用'
  } else if (role === 'BOSS' || role === 'admin') {
    // 平级账号或车队长
    message = '您的账号已过期，请联系老板续费使用'
  } else {
    // 其他角色
    message = '您的账号已被停用，请联系管理员'
  }

  Taro.showModal({
    title: '账号状态提示',
    content: message,
    showCancel: false,
    confirmText: '确定'
  })
}

/**
 * 在页面显示时检查账号状态
 *
 * 在 useDidShow 中调用，确保每次页面显示时都检查账号状态。
 * 使用 usersRepository 获取用户角色（带缓存）。
 *
 * @param excludeRoles - 排除的角色（这些角色不需要检查）
 * @returns 是否可以继续使用
 *
 * @example
 * ```typescript
 * // 在页面中使用
 * useDidShow(async () => {
 *   const canContinue = await checkAccountStatusOnPageShow(['BOSS'])
 *   if (!canContinue) {
 *     // 用户已被登出
 *   }
 * })
 * ```
 */
export async function checkAccountStatusOnPageShow(excludeRoles: string[] = []): Promise<boolean> {
  try {
    // 获取当前登录用户
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      return false
    }

    // 使用 usersRepository 获取用户角色（带缓存）
    const userRole = await usersRepository.getRole(user.id)

    if (!userRole) {
      return false
    }

    // 如果是排除的角色，不检查
    if (excludeRoles.includes(userRole)) {
      return true
    }

    // 检查账号状态
    return await checkLoginStatus()
  } catch (error) {
    logger.error('页面显示时检查账号状态异常', error)
    return false
  }
}
