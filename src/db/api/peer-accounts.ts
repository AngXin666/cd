/**
 * 平级账号管理 API
 *
 * 功能包括：
 * - 创建平级账号
 * - 查询平级账号列表
 * - 验证主账号身份
 */

import {supabase} from '../supabase'
import {Profile, UserRole, UserWithRole} from '../types'
import {convertUsersToProfiles, convertUserToProfile} from '../helpers'

/**
 * 创建平级账号
 * @param mainAccountId 主账号ID
 * @param account 账号信息
 * @param email 邮箱地址（可选）
 * @param password 密码
 * @returns Profile | null | 'EMAIL_EXISTS'
 */
export async function createPeerAccount(
  mainAccountId: string,
  account: {
    name: string | null
    phone: string | null
    company_name?: string | null
    monthly_fee?: number | null
    notes?: string | null
  },
  email: string | null,
  password: string
): Promise<Profile | null | 'EMAIL_EXISTS'> {
  try {
    // 1. 获取主账号信息 - 单用户架构：从 users 表查询
    const {data: mainAccount, error: mainAccountError} = await supabase
      .from('users')
      .select('*')
      .eq('id', mainAccountId)
      .maybeSingle()

    if (mainAccountError || !mainAccount) {
      console.error('获取主账号信息失败:', mainAccountError)
      return null
    }

    // 2. 验证主账号是否为主账号（main_account_id 为 NULL）
    if (mainAccount.main_account_id !== null) {
      console.error('指定的账号不是主账号，无法创建平级账号')
      return null
    }

    // 如果没有提供邮箱，使用手机号作为邮箱（添加 @fleet.com 后缀）
    const authEmail = email || `${account.phone}@fleet.com`

    // 3. 创建认证用户
    const {data: authData, error: authError} = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          name: account.name,
          phone: account.phone,
          role: 'BOSS'
        }
      }
    })

    if (authError) {
      // 检查是否是邮箱已存在的错误
      if (authError.message?.includes('User already registered') || authError.message?.includes('already registered')) {
        console.error('邮箱已被注册:', authEmail)
        return 'EMAIL_EXISTS'
      }
      console.error('创建认证用户失败:', authError)
      return null
    }

    if (!authData.user) {
      console.error('创建认证用户失败：未返回用户数据')
      return null
    }

    // 4. 自动确认用户邮箱（这会触发 handle_new_user 触发器创建基础 profiles 记录）
    const {error: confirmError} = await supabase.rpc('confirm_user_email', {
      user_id: authData.user.id
    })

    if (confirmError) {
      console.error('确认用户邮箱失败:', confirmError)
      return null
    }

    // 5. 等待触发器创建 users 记录（短暂延迟）
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 6. 更新 users 记录，设置平级账号相关字段（单用户架构）
    const {data: userData, error: userError} = await supabase
      .from('users')
      .update({
        name: account.name,
        phone: account.phone,
        email: email, // 保存真实邮箱（可能为 null）
        company_name: account.company_name || mainAccount.company_name,
        monthly_fee: account.monthly_fee || mainAccount.monthly_fee,
        lease_start_date: mainAccount.lease_start_date,
        lease_end_date: mainAccount.lease_end_date,
        notes: account.notes,
        status: 'active',
        main_account_id: mainAccountId // 设置主账号ID
      })
      .eq('id', authData.user.id)
      .select()
      .maybeSingle()

    if (userError) {
      console.error('更新平级账号 users 记录失败:', userError)
      return null
    }

    // 7. user_roles 已废弃，role 字段已在上面的 update 中设置

    // 转换为 Profile 格式
    if (!userData) {
      console.error('更新失败：返回数据为空')
      return null
    }

    const profile: Profile = convertUserToProfile({
      ...userData,
      role: 'BOSS' as UserRole
    })

    return profile
  } catch (error) {
    console.error('创建平级账号异常:', error)
    return null
  }
}

/**
 * 获取主账号的所有平级账号（包括主账号本身）
 * @param accountId 当前账号ID
 * @returns 平级账号列表
 */
export async function getPeerAccounts(accountId: string): Promise<Profile[]> {
  try {
    // 1. 获取当前账号信息 - 单用户架构：从 users 表查询
    const {data: currentAccount, error: currentError} = await supabase
      .from('users')
      .select('*')
      .eq('id', accountId)
      .maybeSingle()

    if (currentError || !currentAccount) {
      console.error('获取当前账号信息失败:', currentError)
      return []
    }

    // 2. 确定主账号ID
    const primaryAccountId = currentAccount.main_account_id || currentAccount.id

    // 3. 查询主账号和所有平级账号 - 单用户架构：从 users 表查询
    const {data: usersData, error} = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${primaryAccountId},main_account_id.eq.${primaryAccountId}`)
      .order('created_at', {ascending: true})

    if (error) {
      console.error('获取平级账号列表失败:', error)
      return []
    }

    if (!usersData || usersData.length === 0) {
      return []
    }

    // 4. 批量查询角色信息
    const userIds = usersData.map((u) => u.id)
    const {data: rolesData} = await supabase.from('users').select('id, role').in('id', userIds)

    // 创建角色映射
    const roleMap = new Map<string, UserRole>()
    if (rolesData) {
      for (const roleItem of rolesData) {
        roleMap.set(roleItem.id, roleItem.role)
      }
    }

    // 5. 合并用户和角色信息
    const usersWithRole: UserWithRole[] = usersData.map((user) => ({
      ...user,
      role: roleMap.get(user.id) || null
    }))

    // 6. 转换为 Profile 类型
    return convertUsersToProfiles(usersWithRole)
  } catch (error) {
    console.error('获取平级账号列表异常:', error)
    return []
  }
}

/**
 * 检查账号是否为主账号
 * @param accountId 账号ID
 * @returns 是否为主账号
 */
export async function isPrimaryAccount(accountId: string): Promise<boolean> {
  try {
    // 单用户架构：从 users 表查询 main_account_id
    const {data, error} = await supabase.from('users').select('main_account_id').eq('id', accountId).maybeSingle()

    if (error || !data) {
      return false
    }

    return data.main_account_id === null
  } catch (error) {
    console.error('检查主账号状态异常:', error)
    return false
  }
}
