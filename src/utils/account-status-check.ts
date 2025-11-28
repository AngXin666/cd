/**
 * 账号状态检查工具
 *
 * 用于检查用户账号是否可以登录，并返回相应的提示信息
 */

import Taro from '@tarojs/taro'
import {supabase} from '@/client/supabase'

/**
 * 账号状态检查结果
 */
export interface AccountStatusResult {
  can_login: boolean
  status: 'active' | 'inactive' | 'expired' | 'not_found' | 'no_lease'
  message: string
  role?: 'super_admin' | 'admin' | 'driver'
  is_main_account?: boolean
  lease_end_date?: string
}

/**
 * 检查账号状态
 *
 * @param userId 用户ID
 * @returns 账号状态检查结果
 */
export async function checkAccountStatus(userId: string): Promise<AccountStatusResult | null> {
  try {
    const {data, error} = await supabase.rpc('check_account_status', {
      user_id: userId
    })

    if (error) {
      console.error('[checkAccountStatus] 检查账号状态失败:', error)
      return null
    }

    return data as AccountStatusResult
  } catch (error) {
    console.error('[checkAccountStatus] 异常:', error)
    return null
  }
}

/**
 * 登录后检查账号状态
 *
 * 在用户登录后调用，检查账号是否可以继续使用
 * 如果账号已过期或被停用，显示相应的提示信息并跳转到登录页
 *
 * @returns 是否可以继续登录
 */
export async function checkLoginStatus(): Promise<boolean> {
  try {
    // 获取当前登录用户
    const {
      data: {user},
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('[checkLoginStatus] 用户未登录')
      return false
    }

    // 检查账号状态
    const status = await checkAccountStatus(user.id)

    if (!status) {
      console.error('[checkLoginStatus] 无法获取账号状态')
      Taro.showToast({
        title: '无法获取账号状态，请重试',
        icon: 'none',
        duration: 2000
      })
      return false
    }

    // 如果不能登录，显示提示信息
    if (!status.can_login) {
      console.log('[checkLoginStatus] 账号不能登录:', status)

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
    console.log('[checkLoginStatus] 账号状态正常:', status)
    return true
  } catch (error) {
    console.error('[checkLoginStatus] 异常:', error)
    return false
  }
}

/**
 * 显示账号过期提示
 *
 * 根据用户角色显示不同的提示信息
 *
 * @param role 用户角色
 * @param isMainAccount 是否是主账号
 */
export function showExpiredMessage(role: string, isMainAccount: boolean = false) {
  let message = ''

  if (role === 'super_admin' && isMainAccount) {
    // 主账号（老板）
    message = '您的账号已过期，请续费使用'
  } else if (role === 'super_admin' || role === 'admin') {
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
 * 在 useDidShow 中调用，确保每次页面显示时都检查账号状态
 *
 * @param excludeRoles 排除的角色（这些角色不需要检查）
 */
export async function checkAccountStatusOnPageShow(excludeRoles: string[] = []): Promise<boolean> {
  try {
    // 获取当前登录用户
    const {
      data: {user},
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      return false
    }

    // 获取用户角色
    const {data: profile} = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

    if (!profile) {
      return false
    }

    // 如果是排除的角色，不检查
    if (excludeRoles.includes(profile.role)) {
      return true
    }

    // 检查账号状态
    return await checkLoginStatus()
  } catch (error) {
    console.error('[checkAccountStatusOnPageShow] 异常:', error)
    return false
  }
}
