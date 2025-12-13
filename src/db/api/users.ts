/**
 * 用户管理 API
 *
 * 功能包括：
 * - 用户认证和个人资料
 * - 用户列表查询
 * - 角色管理
 * - 用户信息更新
 * - 头像上传
 * - 密码修改
 */

import {supabase} from '@/client/supabase'
import {createLogger} from '@/utils/logger'
import {
  convertUsersToProfiles,
  convertUserToProfile,
  getUsersByRole,
  getUsersWithRole,
  getUserWithRole
} from '../helpers'
import type {DriverType, ManagerPermission, ManagerPermissionInput, Profile, ProfileUpdate, UserRole} from '../types'

// 创建数据库操作日志记录器
const logger = createLogger('UsersAPI')

// ==================== 当前用户相关 ====================

/**
 * 获取当前用户档案
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  try {
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserProfile] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      return null
    }

    const userWithRole = await getUserWithRole(user.id)

    if (!userWithRole) {
      return null
    }

    return convertUserToProfile(userWithRole)
  } catch (error) {
    console.error('[getCurrentUserProfile] 未预期的错误:', error)
    return null
  }
}

/**
 * 获取当前用户档案（包含真实姓名）
 */
export async function getCurrentUserWithRealName(): Promise<(Profile & {real_name: string | null}) | null> {
  try {
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserWithRealName] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      return null
    }

    const userWithRole = await getUserWithRole(user.id)

    if (!userWithRole) {
      return null
    }

    const {data: licenseData} = await supabase
      .from('driver_licenses')
      .select('id_card_name')
      .eq('driver_id', user.id)
      .maybeSingle()

    const realName = licenseData?.id_card_name || null
    const profile = convertUserToProfile(userWithRole)

    return {
      ...profile,
      real_name: realName
    }
  } catch (error) {
    console.error('[getCurrentUserWithRealName] 未预期的错误:', error)
    return null
  }
}

/**
 * 快速获取当前用户角色
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserRole] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      return null
    }

    const {data, error} = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()

    if (error) {
      console.error('[getCurrentUserRole] 查询用户角色失败:', error)
      return null
    }

    if (!data) {
      return null
    }

    return data.role as UserRole
  } catch (error) {
    console.error('[getCurrentUserRole] 未预期的错误:', error)
    return null
  }
}

/**
 * 获取指定用户的所有角色
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    const {data, error} = await supabase.from('users').select('role').eq('id', userId).maybeSingle()

    if (error) {
      console.error('[getUserRoles] 查询用户角色失败:', error)
      return []
    }

    const roles = data?.role ? [data.role] : []
    return roles
  } catch (error) {
    console.error('[getUserRoles] 未预期的错误:', error)
    return []
  }
}

/**
 * 获取当前用户的角色和租户
 */
export async function getCurrentUserRoleAndTenant(): Promise<{
  role: UserRole
  tenant_id: string | null
}> {
  try {
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserRoleAndTenant] 获取认证用户失败:', authError)
      throw new Error('获取认证用户失败')
    }

    if (!user) {
      throw new Error('用户未登录')
    }

    const {data: roleData, error: roleError} = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (roleError) {
      console.error('[getCurrentUserRoleAndTenant] 查询 users 出错:', roleError)
      throw new Error('查询用户信息失败')
    }

    if (!roleData) {
      console.error('[getCurrentUserRoleAndTenant] 用户角色不存在')
      throw new Error('用户角色不存在')
    }

    const tenant_id = null

    return {role: roleData.role as UserRole, tenant_id}
  } catch (error) {
    console.error('[getCurrentUserRoleAndTenant] 发生错误:', error)
    return {role: 'DRIVER', tenant_id: null}
  }
}

/**
 * 获取当前用户的权限配置
 */
export async function getCurrentUserPermissions(): Promise<ManagerPermission | null> {
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return getManagerPermission(user.id)
}

// ==================== 用户列表查询 ====================

/**
 * 获取所有用户档案
 */
export async function getAllProfiles(): Promise<Profile[]> {
  try {
    const usersWithRole = await getUsersWithRole()

    if (!usersWithRole || usersWithRole.length === 0) {
      return []
    }

    return convertUsersToProfiles(usersWithRole)
  } catch (error) {
    console.error('获取所有用户档案异常:', error)
    return []
  }
}

/**
 * 获取所有用户
 */
export async function getAllUsers(): Promise<Profile[]> {
  try {
    const users = await getUsersWithRole()

    if (!users || users.length === 0) {
      return []
    }

    const profiles = convertUsersToProfiles(users)
    return profiles
  } catch (error) {
    console.error('❌ 获取用户列表异常:', error)
    return []
  }
}

/**
 * 根据ID获取用户档案
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  try {
    const userWithRole = await getUserWithRole(id)

    if (!userWithRole) {
      return null
    }

    return convertUserToProfile(userWithRole)
  } catch (error) {
    console.error('获取用户档案异常:', error)
    return null
  }
}

/**
 * 根据用户ID获取用户信息
 */
export async function getUserById(userId: string): Promise<Profile | null> {
  try {
    const userWithRole = await getUserWithRole(userId)

    if (!userWithRole) {
      return null
    }

    return convertUserToProfile(userWithRole)
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

// ==================== 司机相关 ====================

/**
 * 获取司机档案列表
 */
export async function getDriverProfiles(): Promise<Profile[]> {
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const userWithRole = await getUserWithRole(user.id)
    const drivers = await getUsersByRole('DRIVER', userWithRole)

    if (!drivers || drivers.length === 0) {
      return []
    }

    const profiles = convertUsersToProfiles(drivers)
    return profiles
  } catch (error) {
    console.error('❌ 获取司机档案异常:', error)
    return []
  }
}

/**
 * 获取所有司机列表
 */
export async function getAllDrivers(): Promise<Profile[]> {
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const userWithRole = await getUserWithRole(user.id)
    const drivers = await getUsersByRole('DRIVER', userWithRole)

    if (!drivers || drivers.length === 0) {
      return []
    }

    const profiles = convertUsersToProfiles(drivers)
    return profiles
  } catch (error) {
    console.error('❌ 获取司机列表失败:', error)
    return []
  }
}

/**
 * 获取所有司机档案（包含实名信息）
 */
export async function getAllDriversWithRealName(): Promise<Array<Profile & {real_name: string | null}>> {
  logger.db('查询', 'users + user_roles + driver_licenses', {role: 'DRIVER'})
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const userWithRole = await getUserWithRole(user.id)
    const drivers = await getUsersByRole('DRIVER', userWithRole)

    if (!drivers || drivers.length === 0) {
      return []
    }

    const driverIds = drivers.map((d) => d.id)
    const {data: licenses} = await supabase
      .from('driver_licenses')
      .select('driver_id, id_card_name')
      .in('driver_id', driverIds)

    const licenseMap = new Map(licenses?.map((l) => [l.driver_id, l.id_card_name]) || [])

    const result = drivers.map((driver) => {
      const profile = convertUserToProfile(driver)
      return {
        ...profile,
        real_name: licenseMap.get(driver.id) || null
      }
    })

    return result
  } catch (error) {
    logger.error('获取司机列表异常', error)
    return []
  }
}

/**
 * 获取所有司机ID
 */
export async function getAllDriverIds(): Promise<string[]> {
  try {
    const {data, error} = await supabase.from('users').select('id').eq('role', 'DRIVER').order('id', {ascending: true})

    if (error) {
      console.error('获取所有司机失败:', error)
      return []
    }

    return Array.isArray(data) ? data.map((item) => item.id) : []
  } catch (error) {
    console.error('获取所有司机异常:', error)
    return []
  }
}

// ==================== 管理员相关 ====================

/**
 * 获取管理员档案列表
 */
export async function getManagerProfiles(): Promise<Profile[]> {
  try {
    const allUsers = await getUsersWithRole()

    if (!allUsers || allUsers.length === 0) {
      return []
    }

    const managers = allUsers.filter((u) => u.role === 'MANAGER' || u.role === 'BOSS')
    const profiles = convertUsersToProfiles(managers)

    return profiles
  } catch (error) {
    console.error('获取管理员档案异常:', error)
    return []
  }
}

/**
 * 获取所有管理员用户
 */
export async function getAllManagers(): Promise<Profile[]> {
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const userWithRole = await getUserWithRole(user.id)
    const managers = await getUsersByRole('MANAGER', userWithRole)

    if (!managers || managers.length === 0) {
      return []
    }

    const profiles = convertUsersToProfiles(managers)
    return profiles
  } catch (error) {
    console.error('❌ 获取管理员列表异常:', error)
    return []
  }
}

/**
 * 获取所有老板列表
 */
export async function getAllSuperAdmins(): Promise<Profile[]> {
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const userWithRole = await getUserWithRole(user.id)
    const bosses = await getUsersByRole('BOSS', userWithRole)

    if (!bosses || bosses.length === 0) {
      return []
    }

    const profiles = convertUsersToProfiles(bosses)
    return profiles
  } catch (error) {
    console.error('❌ 获取老板列表失败:', error)
    return []
  }
}

/**
 * 获取管理员管辖的仓库ID列表
 */
export async function getManagerWarehouseIds(managerId: string): Promise<string[]> {
  const {data, error} = await supabase.from('warehouse_assignments').select('warehouse_id').eq('user_id', managerId)

  if (error) {
    console.error('获取管理员仓库列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data.map((item) => item.warehouse_id) : []
}

// ==================== 权限管理 ====================

/**
 * 获取管理员权限配置
 */
export async function getManagerPermission(managerId: string): Promise<ManagerPermission | null> {
  const {data: roleData, error} = await supabase.from('users').select('role').eq('id', managerId).maybeSingle()

  if (error || !roleData) {
    console.error('获取管理员信息失败:', error)
    return null
  }

  if (roleData.role === 'BOSS' || roleData.role === 'BOSS') {
    const now = new Date().toISOString()
    return {
      id: managerId,
      manager_id: managerId,
      permission_type: 'full',
      can_edit_user_info: true,
      can_edit_piece_work: true,
      can_manage_attendance_rules: true,
      can_manage_categories: true,
      created_at: now,
      updated_at: now
    }
  }

  if (roleData.role === 'MANAGER') {
    const now = new Date().toISOString()
    return {
      id: managerId,
      manager_id: managerId,
      permission_type: 'default',
      can_edit_user_info: true,
      can_edit_piece_work: true,
      can_manage_attendance_rules: false,
      can_manage_categories: false,
      created_at: now,
      updated_at: now
    }
  }

  return null
}

/**
 * 创建或更新管理员权限配置（已废弃）
 */
export async function upsertManagerPermission(_input: ManagerPermissionInput): Promise<boolean> {
  return true
}

/**
 * 更新车队长的权限启用状态
 */
export async function updateManagerPermissionsEnabled(managerId: string, enabled: boolean): Promise<boolean> {
  try {
    const {error} = await supabase.from('users').update({manager_permissions_enabled: enabled}).eq('id', managerId)

    if (error) {
      console.error('[updateManagerPermissionsEnabled] 更新失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[updateManagerPermissionsEnabled] 异常:', error)
    return false
  }
}

/**
 * 获取车队长的权限启用状态
 */
export async function getManagerPermissionsEnabled(managerId: string): Promise<boolean | null> {
  try {
    const {data, error} = await supabase
      .from('users')
      .select('manager_permissions_enabled')
      .eq('id', managerId)
      .maybeSingle()

    if (error) {
      console.error('[getManagerPermissionsEnabled] 获取失败:', error)
      return null
    }

    if (!data) {
      return null
    }

    const enabled = data.manager_permissions_enabled ?? true
    return enabled
  } catch (error) {
    console.error('[getManagerPermissionsEnabled] 获取异常:', error)
    return null
  }
}

// ==================== 用户信息更新 ====================

/**
 * 更新用户档案
 */
export async function updateProfile(id: string, updates: ProfileUpdate): Promise<boolean> {
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('❌ 用户未登录')
      return false
    }

    const {role, ...userUpdates} = updates

    if (Object.keys(userUpdates).length > 0) {
      const {error: userError} = await supabase
        .from('users')
        .update({
          ...userUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (userError) {
        console.error('❌ 更新用户信息失败:', userError)
        return false
      }
    }

    if (role) {
      const {error: roleError} = await supabase.from('users').update({role}).eq('id', id)

      if (roleError) {
        console.error('❌ 更新用户角色失败:', roleError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('❌ 更新用户档案异常:', error)
    return false
  }
}

/**
 * 更新用户个人信息
 */
export async function updateUserProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<{success: boolean; error?: string}> {
  try {
    const {role, ...userUpdates} = updates

    if (Object.keys(userUpdates).length > 0) {
      const {error: userError} = await supabase
        .from('users')
        .update({
          ...userUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (userError) {
        console.error('更新个人信息失败:', userError)
        return {success: false, error: userError.message}
      }
    }

    if (role) {
      const {error: roleError} = await supabase.from('users').update({role}).eq('id', userId)

      if (roleError) {
        console.error('更新用户角色失败:', roleError)
        return {success: false, error: roleError.message}
      }
    }

    return {success: true}
  } catch (error) {
    console.error('更新个人信息异常:', error)
    return {success: false, error: '更新个人信息失败'}
  }
}

/**
 * 修改用户角色
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const {error: roleError} = await supabase.from('users').update({role}).eq('id', userId)

    if (roleError) {
      console.error('修改用户角色失败:', roleError)
      return false
    }

    const updateData: {driver_type?: 'pure' | null} = {}

    if (role === 'DRIVER') {
      updateData.driver_type = 'pure'
    } else {
      updateData.driver_type = null
    }

    if (Object.keys(updateData).length > 0) {
      const {error: userError} = await supabase.from('users').update(updateData).eq('id', userId)

      if (userError) {
        console.error('更新用户 driver_type 失败:', userError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('修改用户角色异常:', error)
    return false
  }
}

/**
 * 更新用户完整信息（老板功能）
 */
export async function updateUserInfo(
  userId: string,
  updates: {
    name?: string
    phone?: string
    email?: string
    role?: UserRole
    driver_type?: DriverType | null
    login_account?: string
    vehicle_plate?: string | null
    join_date?: string
  }
): Promise<boolean> {
  try {
    const {role, ...userUpdates} = updates

    if (Object.keys(userUpdates).length > 0) {
      const {data, error} = await supabase
        .from('users')
        .update({
          ...userUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      if (error) {
        console.error('✖ 更新用户信息失败:', error)
        return false
      }

      if (!data || data.length === 0) {
        console.error('✖ 更新用户信息失败 - 没有返回数据')
        return false
      }
    }

    if (role) {
      const {error: roleError} = await supabase.from('users').update({role}).eq('id', userId)

      if (roleError) {
        console.error('✖ 更新用户角色失败:', roleError)
        return false
      }
    }

    if (updates.login_account) {
      const newEmail = updates.login_account.includes('@')
        ? updates.login_account
        : `${updates.login_account}@fleet.com`

      const {error: authError} = await supabase.rpc('update_user_email', {
        target_user_id: userId,
        new_email: newEmail
      })

      if (authError) {
        console.error('✖ 更新 auth.users 邮箱失败:', authError)
      } else {
        await supabase.from('users').update({email: newEmail}).eq('id', userId)
      }
    }

    return true
  } catch (error) {
    console.error('✖ 更新用户信息异常:', error)
    return false
  }
}

// ==================== 用户创建 ====================

/**
 * 创建司机账号
 */
export async function createDriver(
  phone: string,
  name: string,
  driverType: 'pure' | 'with_vehicle' = 'pure'
): Promise<Profile | null> {
  try {
    const {data, error} = await supabase.rpc('create_driver_in_tenant', {
      p_phone: phone,
      p_name: name,
      p_email: null,
      p_password: null
    })

    if (error) {
      console.error('✖ 创建司机失败:', error)
      return null
    }

    if (!data || !data.success) {
      console.error('✖ 创建司机失败:', data?.error || '未知错误')
      return null
    }

    const profile: Profile = {
      id: data.user_id,
      phone: data.phone,
      email: data.email,
      name,
      role: 'DRIVER',
      driver_type: driverType,
      avatar_url: null,
      nickname: null,
      address_province: null,
      address_city: null,
      address_district: null,
      address_detail: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      login_account: null,
      vehicle_plate: null,
      join_date: new Date().toISOString().split('T')[0],
      status: 'active',
      company_name: null,
      lease_start_date: null,
      lease_end_date: null,
      monthly_fee: null,
      notes: null,
      main_account_id: null,
      peer_account_permission: null,
      manager_permissions_enabled: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return profile
  } catch (error) {
    console.error('✖ 创建司机异常:', error)
    return null
  }
}

/**
 * 创建新用户（支持司机和管理员）
 */
export async function createUser(
  phone: string,
  name: string,
  role: 'DRIVER' | 'MANAGER',
  driverType?: 'pure' | 'with_vehicle'
): Promise<Profile | null> {
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('  ✖ 用户未登录')
      throw new Error('用户未登录')
    }

    const loginEmail = `${phone}@fleet.com`
    let userId: string | null = null

    try {
      const {data: rpcData, error: authError} = await supabase.rpc('create_user_auth_account_first', {
        user_email: loginEmail,
        user_phone: phone
      })

      if (authError || !rpcData || rpcData.success === false) {
        const errorMsg = authError?.message || rpcData?.error || ''
        if (errorMsg.includes('already') || errorMsg.includes('duplicate') || errorMsg.includes('exists')) {
          throw new Error(`该手机号（${phone}）已被注册，请使用其他手机号`)
        }
        throw new Error(authError?.message || rpcData?.error || '创建用户失败')
      }

      userId = rpcData.user_id
    } catch (authError: unknown) {
      const error = authError as Error
      if (error.message?.includes('已被注册')) {
        throw error
      }
      const errorMsg = error?.message || String(authError)
      if (errorMsg.includes('already') || errorMsg.includes('duplicate') || errorMsg.includes('exists')) {
        throw new Error(`该手机号（${phone}）已被注册，请使用其他手机号`)
      }
      throw new Error('创建用户失败，请稍后重试')
    }

    if (!userId) {
      throw new Error('创建用户失败：未能获取用户ID')
    }

    const insertData: {
      id: string
      phone: string
      name: string
      email: string
      role: UserRole
      driver_type?: string
      join_date?: string
    } = {
      id: userId,
      phone,
      name,
      email: loginEmail,
      role: role as UserRole
    }

    if (role === 'DRIVER') {
      insertData.driver_type = driverType || 'pure'
      insertData.join_date = new Date().toISOString().split('T')[0]
    }

    const {data: userData, error: userError} = await supabase.from('users').insert(insertData).select().maybeSingle()

    if (userError) {
      console.error('  ✖ 插入 users 表失败:', userError)
      return null
    }

    if (!userData) {
      console.error('  ✖ 插入失败：返回数据为空')
      return null
    }

    const profile: Profile = convertUserToProfile({
      ...userData,
      role: role as UserRole
    })

    return profile
  } catch (error) {
    console.error('✖ [createUser] 函数执行异常:', error)
    throw error
  }
}

// ==================== 密码管理 ====================

/**
 * 修改密码
 */
export async function changePassword(newPassword: string): Promise<{success: boolean; error?: string}> {
  try {
    const {error} = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('修改密码失败:', error)

      let errorMessage = error.message
      if (errorMessage.includes('New password should be different from the old password')) {
        errorMessage = '新密码不能与原密码相同'
      } else if (errorMessage.includes('Password should be at least')) {
        errorMessage = '密码长度至少8位'
      } else if (errorMessage.includes('Invalid password')) {
        errorMessage = '密码格式不正确'
      }

      return {success: false, error: errorMessage}
    }

    return {success: true}
  } catch (error) {
    console.error('修改密码异常:', error)
    return {success: false, error: '修改密码失败，请稍后重试'}
  }
}

/**
 * 重置用户密码（老板功能）
 */
export async function resetUserPassword(userId: string): Promise<{success: boolean; error?: string}> {
  try {
    const {data, error} = await supabase.rpc('reset_user_password_by_admin', {
      target_user_id: userId,
      new_password: '123456'
    })

    if (error) {
      console.error('✖ RPC 调用失败:', error)
      return {success: false, error: error.message || '调用重置密码函数失败'}
    }

    if (!data) {
      return {success: false, error: '未收到服务器响应'}
    }

    if (data.success === false) {
      return {success: false, error: data.error || data.details || '重置密码失败'}
    }

    return {success: true}
  } catch (error) {
    console.error('✖ 重置密码异常:', error)
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    return {success: false, error: `异常: ${errorMsg}`}
  }
}

// ==================== 头像管理 ====================

/**
 * 上传头像到Supabase Storage
 */
export async function uploadAvatar(
  userId: string,
  file: {path: string; size: number; name?: string; originalFileObj?: File}
): Promise<{success: boolean; url?: string; error?: string}> {
  try {
    if (file.size > 1048576) {
      return {success: false, error: '头像文件大小不能超过1MB'}
    }

    const timestamp = Date.now()
    const ext = file.name?.split('.').pop() || 'jpg'
    const fileName = `${userId}/avatar_${timestamp}.${ext}`

    const fileContent = file.originalFileObj || ({tempFilePath: file.path} as unknown as File)

    const {error} = await supabase.storage.from('app-7cdqf07mbu9t_avatars').upload(fileName, fileContent, {
      cacheControl: '3600',
      upsert: true
    })

    if (error) {
      console.error('上传头像失败:', error)
      return {success: false, error: error.message}
    }

    const {data: urlData} = supabase.storage.from('app-7cdqf07mbu9t_avatars').getPublicUrl(fileName)

    return {success: true, url: urlData.publicUrl}
  } catch (error) {
    console.error('上传头像异常:', error)
    return {success: false, error: '上传头像失败'}
  }
}

// ==================== 统计信息 ====================

/**
 * 获取司机端个人页面统计数据
 */
export async function getDriverStats(userId: string): Promise<{
  monthAttendanceDays: number
  monthPieceWorkIncome: number
  monthLeaveDays: number
  totalWarehouses: number
} | null> {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const monthStart = `${year}-${month}-01`
    const monthEnd = `${year}-${month}-31`

    const {data: attendanceData} = await supabase
      .from('attendance')
      .select('id')
      .eq('id', userId)
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    const monthAttendanceDays = Array.isArray(attendanceData) ? attendanceData.length : 0

    const {data: pieceWorkData} = await supabase
      .from('piece_work_records')
      .select('total_amount')
      .eq('id', userId)
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    const monthPieceWorkIncome = Array.isArray(pieceWorkData)
      ? pieceWorkData.reduce((sum, record) => sum + (record.total_amount || 0), 0)
      : 0

    const {data: leaveData} = await supabase
      .from('leave_applications')
      .select('start_date, end_date')
      .eq('id', userId)
      .eq('status', 'approved')
      .gte('start_date', monthStart)
      .lte('end_date', monthEnd)

    let monthLeaveDays = 0
    if (Array.isArray(leaveData)) {
      for (const leave of leaveData) {
        const start = new Date(leave.start_date)
        const end = new Date(leave.end_date)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        monthLeaveDays += days
      }
    }

    const {data: warehouseData} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', userId)

    const totalWarehouses = Array.isArray(warehouseData) ? warehouseData.length : 0

    return {
      monthAttendanceDays,
      monthPieceWorkIncome,
      monthLeaveDays,
      totalWarehouses
    }
  } catch (error) {
    console.error('获取司机统计数据失败:', error)
    return null
  }
}

/**
 * 获取管理员端个人页面统计数据
 */
export async function getManagerStats(userId: string): Promise<{
  totalWarehouses: number
  totalDrivers: number
  pendingLeaveCount: number
  monthPieceWorkTotal: number
} | null> {
  try {
    const {data: warehouseData} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', userId)

    const totalWarehouses = Array.isArray(warehouseData) ? warehouseData.length : 0
    const warehouseIds = Array.isArray(warehouseData) ? warehouseData.map((w) => w.warehouse_id) : []

    let totalDrivers = 0
    if (warehouseIds.length > 0) {
      const {data: driverData} = await supabase
        .from('warehouse_assignments')
        .select('user_id')
        .in('warehouse_id', warehouseIds)

      const uniqueDrivers = new Set(Array.isArray(driverData) ? driverData.map((d) => d.user_id) : [])
      totalDrivers = uniqueDrivers.size
    }

    let pendingLeaveCount = 0
    if (warehouseIds.length > 0) {
      const {data: leaveData} = await supabase
        .from('leave_applications')
        .select('id')
        .in('warehouse_id', warehouseIds)
        .eq('status', 'pending')

      pendingLeaveCount = Array.isArray(leaveData) ? leaveData.length : 0
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const monthStart = `${year}-${month}-01`
    const monthEnd = `${year}-${month}-31`

    let monthPieceWorkTotal = 0
    if (warehouseIds.length > 0) {
      const {data: pieceWorkData} = await supabase
        .from('piece_work_records')
        .select('total_amount')
        .in('warehouse_id', warehouseIds)
        .gte('work_date', monthStart)
        .lte('work_date', monthEnd)

      monthPieceWorkTotal = Array.isArray(pieceWorkData)
        ? pieceWorkData.reduce((sum, record) => sum + (record.total_amount || 0), 0)
        : 0
    }

    return {
      totalWarehouses,
      totalDrivers,
      pendingLeaveCount,
      monthPieceWorkTotal
    }
  } catch (error) {
    console.error('获取管理员统计数据失败:', error)
    return null
  }
}

/**
 * 获取老板端个人页面统计数据
 */
export async function getSuperAdminStats(): Promise<{
  totalWarehouses: number
  totalDrivers: number
  totalManagers: number
  pendingLeaveCount: number
  monthPieceWorkTotal: number
  totalUsers: number
} | null> {
  try {
    const {data: warehouseData} = await supabase.from('warehouses').select('id').eq('is_active', true)
    const totalWarehouses = Array.isArray(warehouseData) ? warehouseData.length : 0

    const {data: driverData} = await supabase.from('users').select('id').eq('role', 'DRIVER')
    const totalDrivers = Array.isArray(driverData) ? driverData.length : 0

    const {data: managerData} = await supabase.from('users').select('id').eq('role', 'MANAGER')
    const totalManagers = Array.isArray(managerData) ? managerData.length : 0

    const {data: leaveData} = await supabase.from('leave_applications').select('id').eq('status', 'pending')
    const pendingLeaveCount = Array.isArray(leaveData) ? leaveData.length : 0

    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const monthStart = `${year}-${month}-01`
    const monthEnd = `${year}-${month}-31`

    const {data: pieceWorkData} = await supabase
      .from('piece_work_records')
      .select('total_amount')
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    const monthPieceWorkTotal = Array.isArray(pieceWorkData)
      ? pieceWorkData.reduce((sum, record) => sum + (record.total_amount || 0), 0)
      : 0

    const {data: userData} = await supabase.from('users').select('id')
    const totalUsers = Array.isArray(userData) ? userData.length : 0

    return {
      totalWarehouses,
      totalDrivers,
      totalManagers,
      pendingLeaveCount,
      monthPieceWorkTotal,
      totalUsers
    }
  } catch (error) {
    console.error('获取老板统计数据失败:', error)
    return null
  }
}

// ==================== 数据库调试 ====================

// 数据库表信息类型
export interface DatabaseTable {
  table_name: string
  table_schema: string
  table_type: string
}

export interface DatabaseColumn {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
}

export interface DatabaseConstraint {
  constraint_name: string
  table_name: string
  constraint_type: string
  column_name: string
}

/**
 * 获取所有表信息
 */
export async function getDatabaseTables(): Promise<DatabaseTable[]> {
  try {
    const {data, error} = await supabase.rpc('get_database_tables')

    if (error) {
      console.error('获取数据库表信息失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取数据库表信息异常:', error)
    return []
  }
}

/**
 * 获取指定表的列信息
 */
export async function getTableColumns(tableName: string): Promise<DatabaseColumn[]> {
  try {
    const {data, error} = await supabase.rpc('get_table_columns', {table_name_param: tableName})

    if (error) {
      console.error('获取表列信息失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取表列信息异常:', error)
    return []
  }
}

/**
 * 获取指定表的约束信息
 */
export async function getTableConstraints(tableName: string): Promise<DatabaseConstraint[]> {
  try {
    const {data, error} = await supabase.rpc('get_table_constraints', {table_name_param: tableName})

    if (error) {
      console.error('获取表约束信息失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取表约束信息异常:', error)
    return []
  }
}

// ==================== 账号删除 ====================

// 删除租户结果类型
interface DeleteTenantResult {
  success: boolean
  message: string
  error?: string
  deletedData?: {
    tenant: string
    peerAccounts: number
    managers: number
    drivers: number
    vehicles: number
    warehouses: number
    attendance: number
    leaves: number
    pieceWorks: number
    notifications: number
    total: number
  }
}

/**
 * 删除租户（老板账号）- 带详细日志版本
 */
export async function deleteTenantWithLog(id: string): Promise<DeleteTenantResult> {
  try {
    const [{data: user, error: fetchError}, {data: roleData}] = await Promise.all([
      supabase.from('users').select('id, main_account_id, name, phone').eq('id', id).maybeSingle(),
      supabase.from('users').select('role').eq('id', id).maybeSingle()
    ])

    if (fetchError) {
      return {
        success: false,
        message: '查询租户信息失败',
        error: fetchError.message
      }
    }

    if (!user) {
      return {
        success: false,
        message: '租户不存在',
        error: '未找到指定的租户'
      }
    }

    const role = roleData?.role || 'DRIVER'

    if (role !== 'BOSS') {
      return {
        success: false,
        message: '只能删除老板账号',
        error: `当前用户角色为 ${role}，不是 BOSS`
      }
    }

    if (user.main_account_id !== null) {
      return {
        success: false,
        message: '只能删除主账号，不能删除平级账号',
        error: '请删除主账号，平级账号会自动级联删除'
      }
    }

    const [
      {data: peerAccounts},
      {data: managerRoles},
      {data: driverRoles},
      {data: vehicles},
      {data: warehouses},
      {data: attendance},
      {data: leaves},
      {data: pieceWorks},
      {data: notifications}
    ] = await Promise.all([
      supabase.from('users').select('id').eq('main_account_id', id),
      supabase.from('users').select('id').eq('role', 'MANAGER'),
      supabase.from('users').select('id').eq('role', 'DRIVER'),
      supabase.from('vehicles').select('id').eq('tenant_id', id),
      supabase.from('warehouses').select('id').eq('tenant_id', id),
      supabase.from('attendance').select('id').eq('tenant_id', id),
      supabase.from('leave_applications').select('id').eq('tenant_id', id),
      supabase.from('piece_work_records').select('id').eq('tenant_id', id),
      supabase.from('notifications').select('id').eq('tenant_id', id)
    ])

    const stats = {
      tenant: `${user.name || '未命名'} (${user.phone || '无手机号'})`,
      peerAccounts: peerAccounts?.length || 0,
      managers: managerRoles?.length || 0,
      drivers: driverRoles?.length || 0,
      vehicles: vehicles?.length || 0,
      warehouses: warehouses?.length || 0,
      attendance: attendance?.length || 0,
      leaves: leaves?.length || 0,
      pieceWorks: pieceWorks?.length || 0,
      notifications: notifications?.length || 0,
      total: 0
    }

    stats.total =
      1 +
      stats.peerAccounts +
      stats.managers +
      stats.drivers +
      stats.vehicles +
      stats.warehouses +
      stats.attendance +
      stats.leaves +
      stats.pieceWorks +
      stats.notifications

    const {error: deleteError} = await supabase.from('users').delete().eq('id', id)

    if (deleteError) {
      return {
        success: false,
        message: '删除失败',
        error: deleteError.message
      }
    }

    const {data: verifyUser} = await supabase.from('users').select('id').eq('id', id).maybeSingle()

    if (verifyUser) {
      return {
        success: false,
        message: '删除失败：租户仍然存在',
        error: '可能是权限不足或数据库约束问题',
        deletedData: stats
      }
    }

    return {
      success: true,
      message: '删除成功',
      deletedData: stats
    }
  } catch (error) {
    console.error('删除老板账号异常:', error)
    return {
      success: false,
      message: '删除异常',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// ==================== 司机信息查询 ====================

/**
 * 获取司机的显示名称（包含司机类型和姓名）
 * @param userId 用户ID
 * @returns 格式化的司机名称，例如："纯司机 张三" 或 "带车司机 李四"
 */
export async function getDriverDisplayName(userId: string): Promise<string> {
  try {
    const {data, error} = await supabase.from('users').select('name, driver_type').eq('id', userId).maybeSingle()

    if (error || !data) {
      logger.error('获取司机信息失败', {userId, error})
      return '未知司机'
    }

    const driverTypeMap: Record<string, string> = {
      pure: '纯司机',
      with_vehicle: '带车司机'
    }

    const driverType = data.driver_type ? driverTypeMap[data.driver_type] || '司机' : '司机'
    const driverName = data.name || '未知'

    return `${driverType} ${driverName}`
  } catch (error) {
    logger.error('获取司机信息异常', {userId, error})
    return '未知司机'
  }
}

/**
 * 获取司机姓名（仅姓名，不含类型）
 * @deprecated 建议使用 getDriverDisplayName 获取完整的显示名称
 * @param userId 用户ID
 * @returns 司机姓名
 */
export async function getDriverName(userId: string): Promise<string> {
  try {
    const {data, error} = await supabase.from('users').select('name').eq('id', userId).maybeSingle()

    if (error || !data) {
      logger.error('获取司机姓名失败', {userId, error})
      return '未知司机'
    }

    return data.name || '未知司机'
  } catch (error) {
    logger.error('获取司机姓名异常', {userId, error})
    return '未知司机'
  }
}
