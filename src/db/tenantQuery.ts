/**
 * 租户查询包装函数
 *
 * 提供基于 boss_id 的租户数据隔离查询功能
 */

import {supabase} from './supabase'

/**
 * 获取当前用户的 boss_id
 *
 * @returns boss_id 或 null（如果用户未登录或没有 boss_id）
 *
 * @example
 * ```typescript
 * const bossId = await getCurrentUserBossId()
 * if (!bossId) {
 *   throw new Error('无法获取租户标识，请重新登录')
 * }
 * ```
 */
export async function getCurrentUserBossId(): Promise<string | null> {
  try {
    // 获取当前登录用户
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // 从 profiles 表获取用户的 boss_id
    const {data, error} = await supabase.from('profiles').select('boss_id').eq('id', user.id).maybeSingle()

    if (error) {
      console.error('获取 boss_id 失败:', error)
      return null
    }

    return data?.boss_id || null
  } catch (error) {
    console.error('获取 boss_id 异常:', error)
    return null
  }
}

/**
 * 创建带租户过滤的查询构建器
 *
 * 自动添加 boss_id 过滤条件，确保只查询当前租户的数据
 *
 * @param tableName 表名
 * @returns Supabase 查询构建器
 * @throws 如果无法获取 boss_id
 *
 * @example
 * ```typescript
 * // 查询当前租户的所有仓库
 * const query = await createTenantQuery('warehouses')
 * const { data, error } = await query
 *   .select('*')
 *   .eq('is_active', true)
 *   .order('created_at', { ascending: false })
 * ```
 */
export async function createTenantQuery(tableName: string) {
  const bossId = await getCurrentUserBossId()

  if (!bossId) {
    throw new Error('无法获取租户标识，请重新登录')
  }

  return supabase.from(tableName).select('*').eq('boss_id', bossId)
}

/**
 * 插入数据时自动添加 boss_id
 *
 * @param tableName 表名
 * @param data 要插入的数据（不包含 boss_id）
 * @returns 插入结果
 *
 * @example
 * ```typescript
 * const { data, error } = await insertWithTenant('warehouses', {
 *   name: '北京仓库',
 *   address: '北京市朝阳区',
 *   is_active: true
 * })
 * ```
 */
export async function insertWithTenant<T extends Record<string, any>>(
  tableName: string,
  data: Omit<T, 'boss_id'>
): Promise<{data: T | null; error: any}> {
  const bossId = await getCurrentUserBossId()

  if (!bossId) {
    return {
      data: null,
      error: new Error('无法获取租户标识，请重新登录')
    }
  }

  const result = await supabase
    .from(tableName)
    .insert({...data, boss_id: bossId} as any)
    .select()
    .maybeSingle()

  return result as {data: T | null; error: any}
}

/**
 * 批量插入数据时自动添加 boss_id
 *
 * @param tableName 表名
 * @param dataArray 要插入的数据数组（不包含 boss_id）
 * @returns 插入结果
 *
 * @example
 * ```typescript
 * const { data, error } = await insertManyWithTenant('warehouses', [
 *   { name: '北京仓库', address: '北京市朝阳区' },
 *   { name: '上海仓库', address: '上海市浦东新区' }
 * ])
 * ```
 */
export async function insertManyWithTenant<T extends Record<string, any>>(
  tableName: string,
  dataArray: Omit<T, 'boss_id'>[]
): Promise<{data: T[] | null; error: any}> {
  const bossId = await getCurrentUserBossId()

  if (!bossId) {
    return {
      data: null,
      error: new Error('无法获取租户标识，请重新登录')
    }
  }

  const dataWithBossId = dataArray.map((item) => ({
    ...item,
    boss_id: bossId
  }))

  const result = await supabase
    .from(tableName)
    .insert(dataWithBossId as any)
    .select()

  return result as {data: T[] | null; error: any}
}

/**
 * 更新数据时自动添加 boss_id 过滤
 *
 * @param tableName 表名
 * @param id 记录 ID
 * @param data 要更新的数据
 * @returns 更新结果
 *
 * @example
 * ```typescript
 * const { data, error } = await updateWithTenant('warehouses', warehouseId, {
 *   name: '北京仓库（更新）',
 *   is_active: false
 * })
 * ```
 */
export async function updateWithTenant<T extends Record<string, any>>(
  tableName: string,
  id: string,
  data: Partial<Omit<T, 'boss_id' | 'id'>>
): Promise<{data: T | null; error: any}> {
  const bossId = await getCurrentUserBossId()

  if (!bossId) {
    return {
      data: null,
      error: new Error('无法获取租户标识，请重新登录')
    }
  }

  const result = await supabase
    .from(tableName)
    .update(data as any)
    .eq('id', id)
    .eq('boss_id', bossId) // 确保只更新当前租户的数据
    .select()
    .maybeSingle()

  return result as {data: T | null; error: any}
}

/**
 * 删除数据时自动添加 boss_id 过滤
 *
 * @param tableName 表名
 * @param id 记录 ID
 * @returns 删除结果
 *
 * @example
 * ```typescript
 * const { error } = await deleteWithTenant('warehouses', warehouseId)
 * ```
 */
export async function deleteWithTenant(tableName: string, id: string): Promise<{error: any}> {
  const bossId = await getCurrentUserBossId()

  if (!bossId) {
    return {
      error: new Error('无法获取租户标识，请重新登录')
    }
  }

  const result = await supabase.from(tableName).delete().eq('id', id).eq('boss_id', bossId) // 确保只删除当前租户的数据

  return {error: result.error}
}
