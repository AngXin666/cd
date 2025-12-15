// 完全替换文件内容
/**
 * 计件管理 API
 *
 * 功能包括：
 * - 计件记录管理
 * - 计件品类管理
 * - 品类价格配置
 * - 计件统计
 */

import {supabase} from '@/client/supabase'
import {publish} from '@/utils/eventBus'
import type {
  CategoryPrice,
  CategoryPriceInput,
  PieceWorkCategory,
  PieceWorkCategoryInput,
  PieceWorkRecord,
  PieceWorkRecordInput,
  PieceWorkStats
} from '../types'

// ==================== 计件记录 API ====================

/**
 * 获取用户的计件记录
 */
export async function getPieceWorkRecordsByUser(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkRecord[]> {
  let query = supabase
    .from('piece_work_records')
    .select('*')
    .eq('user_id', userId)
    .order('work_date', {ascending: false})

  if (startDate) query = query.gte('work_date', startDate)
  if (endDate) query = query.lte('work_date', endDate)

  const {data, error} = await query
  if (error) {
    console.error('获取计件记录失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 获取仓库的计件记录
 */
export async function getPieceWorkRecordsByWarehouse(
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkRecord[]> {
  let query = supabase
    .from('piece_work_records')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('work_date', {ascending: false})

  if (startDate) query = query.gte('work_date', startDate)
  if (endDate) query = query.lte('work_date', endDate)

  const {data, error} = await query
  if (error) {
    console.error('获取仓库计件记录失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 获取用户在指定仓库的计件记录
 */
export async function getPieceWorkRecordsByUserAndWarehouse(
  userId: string,
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkRecord[]> {
  let query = supabase
    .from('piece_work_records')
    .select('*')
    .eq('user_id', userId)
    .eq('warehouse_id', warehouseId)
    .order('work_date', {ascending: false})

  if (startDate) query = query.gte('work_date', startDate)
  if (endDate) query = query.lte('work_date', endDate)

  const {data, error} = await query
  if (error) {
    console.error('获取用户仓库计件记录失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 获取所有计件记录
 */
export async function getAllPieceWorkRecords(): Promise<PieceWorkRecord[]> {
  const {data, error} = await supabase.from('piece_work_records').select('*').order('work_date', {ascending: false})
  if (error) {
    console.error('获取所有计件记录失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 创建计件记录
 */
export async function createPieceWorkRecord(record: PieceWorkRecordInput): Promise<boolean> {
  const {
    data: {user}
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('创建计件记录失败: 用户未登录')
    return false
  }

  if (!record.user_id || !record.quantity || record.quantity <= 0) {
    console.error('创建计件记录失败: 参数无效')
    return false
  }

  const {error} = await supabase.from('piece_work_records').insert({...record})
  if (error) {
    console.error('创建计件记录失败:', error)
    return false
  }

  // 发布事件通知其他组件刷新数据
  publish('piece_work:created', {userId: record.user_id})

  return true
}

/**
 * 更新计件记录
 */
export async function updatePieceWorkRecord(id: string, record: Partial<PieceWorkRecordInput>): Promise<boolean> {
  const {error} = await supabase.from('piece_work_records').update(record).eq('id', id)
  if (error) {
    console.error('更新计件记录失败:', error)
    return false
  }

  // 发布事件通知其他组件刷新数据
  publish('piece_work:updated', {id})

  return true
}

/**
 * 删除计件记录
 */
export async function deletePieceWorkRecord(id: string): Promise<boolean> {
  const {error} = await supabase.from('piece_work_records').delete().eq('id', id)
  if (error) {
    console.error('删除计件记录失败:', error)
    return false
  }
  return true
}

/**
 * 计算计件统计
 */
export async function calculatePieceWorkStats(
  userId: string,
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkStats> {
  const records = await getPieceWorkRecordsByUserAndWarehouse(userId, warehouseId, startDate, endDate)

  const stats: PieceWorkStats = {
    total_orders: records.length,
    total_quantity: 0,
    total_amount: 0,
    by_category: []
  }

  const {data: categoryPrices} = await supabase.from('category_prices').select('category_id')
  if (!categoryPrices || categoryPrices.length === 0) return stats

  const categoryIds = categoryPrices.map((cp) => cp.category_id)
  const {data: categories} = await supabase.from('piece_work_categories').select('id, name').in('id', categoryIds)
  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) || [])

  const categoryStatsMap = new Map<
    string,
    {category_id: string; category_name: string; quantity: number; amount: number}
  >()

  for (const record of records) {
    stats.total_quantity += record.quantity
    stats.total_amount += Number(record.total_amount)

    const categoryId = record.category_id
    const categoryName = categoryMap.get(categoryId) || '未知品类'
    const existing = categoryStatsMap.get(categoryId)

    if (existing) {
      existing.quantity += record.quantity
      existing.amount += Number(record.total_amount)
    } else {
      categoryStatsMap.set(categoryId, {
        category_id: categoryId,
        category_name: categoryName,
        quantity: record.quantity,
        amount: Number(record.total_amount)
      })
    }
  }

  stats.by_category = Array.from(categoryStatsMap.values())
  return stats
}

// ==================== 计件品类管理 API ====================

/**
 * 获取所有启用的品类
 */
export async function getActiveCategories(): Promise<PieceWorkCategory[]> {
  try {
    const {data, error} = await supabase
      .from('piece_work_categories')
      .select('id, name, description, created_at, updated_at')
      .order('name', {ascending: true})

    if (error) {
      console.error('获取启用品类失败:', error)
      return []
    }

    if (Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        category_name: item.name,
        description: item.description,
        is_active: true,
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
    }
    return []
  } catch (error) {
    console.error('获取启用品类异常:', error)
    return []
  }
}

/**
 * 获取所有品类
 */
export async function getAllCategories(): Promise<PieceWorkCategory[]> {
  try {
    const {data, error} = await supabase
      .from('piece_work_categories')
      .select('id, name, description, created_at, updated_at')
      .order('name', {ascending: true})

    if (error) {
      console.error('获取所有品类失败:', error)
      return []
    }

    if (Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        category_name: item.name,
        description: item.description,
        is_active: true,
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
    }
    return []
  } catch (error) {
    console.error('获取所有品类异常:', error)
    return []
  }
}

/**
 * 创建品类
 * @param category - 品类输入数据
 * @returns 创建的品类对象，失败返回 null
 */
export async function createCategory(category: PieceWorkCategoryInput): Promise<PieceWorkCategory | null> {
  try {
    const {data, error} = await supabase
      .from('piece_work_categories')
      .insert({name: category.name, description: category.description})
      .select()
      .maybeSingle()

    if (error) {
      console.error('创建品类失败:', error)
      return null
    }

    if (data) {
      const result: PieceWorkCategory = {
        id: data.id,
        name: data.name,
        description: data.description,
        is_active: true,
        created_at: data.created_at,
        updated_at: data.updated_at
      }

      // 发布品类创建事件，通知相关页面刷新
      publish('category:created', {
        id: result.id,
        name: result.name,
        description: result.description
      })

      return result
    }
    return null
  } catch (error) {
    console.error('创建品类异常:', error)
    return null
  }
}

/**
 * 更新品类
 * @param id - 品类ID
 * @param updates - 更新数据
 * @returns 是否更新成功
 */
export async function updateCategory(id: string, updates: Partial<PieceWorkCategoryInput>): Promise<boolean> {
  try {
    const mappedUpdates: Partial<{name: string; description: string; updated_at: string}> = {
      updated_at: new Date().toISOString()
    }
    if (updates.name !== undefined) mappedUpdates.name = updates.name
    if (updates.description !== undefined) mappedUpdates.description = updates.description

    const {error} = await supabase.from('piece_work_categories').update(mappedUpdates).eq('id', id)
    if (error) {
      console.error('更新品类失败:', error)
      return false
    }

    // 发布品类更新事件，通知相关页面刷新
    publish('category:updated', {
      id,
      ...updates
    })

    return true
  } catch (error) {
    console.error('更新品类异常:', error)
    return false
  }
}

/**
 * 删除品类
 * @param id - 品类ID
 * @returns 是否删除成功
 */
export async function deleteCategory(id: string): Promise<boolean> {
  try {
    // 1. 先删除关联的价格记录
    const {error: priceError} = await supabase.from('category_prices').delete().eq('category_id', id)
    if (priceError) {
      console.error('删除关联价格记录失败:', priceError)
      return false
    }

    // 2. 删除品类
    const {error} = await supabase.from('piece_work_categories').delete().eq('id', id)
    if (error) {
      console.error('删除品类失败:', error)
      return false
    }

    // 3. 发布品类删除事件，通知相关页面刷新
    publish('category:deleted', {
      id
    })

    return true
  } catch (error) {
    console.error('删除品类异常:', error)
    return false
  }
}

/**
 * 删除未被使用的品类
 */
export async function deleteUnusedCategories(): Promise<{success: boolean; deletedCount: number; error?: string}> {
  try {
    const {data: usedCategoryIds, error: usedError} = await supabase
      .from('category_prices')
      .select('category_id')
      .order('category_id', {ascending: true})

    if (usedError) {
      return {success: false, deletedCount: 0, error: usedError.message}
    }

    const {data: allCategories, error: allError} = await supabase.from('piece_work_categories').select('id')
    if (allError) {
      return {success: false, deletedCount: 0, error: allError.message}
    }

    if (!allCategories || allCategories.length === 0) {
      return {success: true, deletedCount: 0}
    }

    const usedIds = new Set(usedCategoryIds?.map((item) => item.category_id) || [])
    const unusedCategoryIds = allCategories.filter((cat) => !usedIds.has(cat.id)).map((cat) => cat.id)

    if (unusedCategoryIds.length === 0) {
      return {success: true, deletedCount: 0}
    }

    const {error: deleteError} = await supabase.from('piece_work_categories').delete().in('id', unusedCategoryIds)
    if (deleteError) {
      return {success: false, deletedCount: 0, error: deleteError.message}
    }

    return {success: true, deletedCount: unusedCategoryIds.length}
  } catch (error) {
    return {success: false, deletedCount: 0, error: String(error)}
  }
}

// ==================== 品类价格配置 API ====================

/**
 * 获取仓库的所有品类价格配置
 */
export async function getCategoryPricesByWarehouse(warehouseId: string): Promise<CategoryPrice[]> {
  const {data, error} = await supabase
    .from('category_prices')
    .select(`
      *,
      piece_work_categories!inner(name)
    `)
    .eq('warehouse_id', warehouseId)
    .order('created_at', {ascending: true})

  if (error) {
    console.error('获取品类价格配置失败:', error)
    return []
  }

  // 将 piece_work_categories.name 映射到 category_name
  return (data || []).map((item: CategoryPrice & {piece_work_categories?: {name: string}}) => ({
    ...item,
    category_name: item.piece_work_categories?.name || item.category_name
  }))
}

/**
 * 获取指定品类价格配置
 */
export async function getCategoryPrice(warehouseId: string, categoryId: string): Promise<CategoryPrice | null> {
  const {data, error} = await supabase
    .from('category_prices')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('category_id', categoryId)
    .maybeSingle()

  if (error) {
    console.error('获取品类价格配置失败:', error)
    return null
  }
  return data
}

/**
 * 创建或更新品类价格配置
 * 策略：先查询是否存在，存在则更新，不存在则插入
 * @param input - 品类价格输入数据
 * @returns 是否保存成功
 */
export async function upsertCategoryPrice(input: CategoryPriceInput): Promise<boolean> {
  const {
    data: {user}
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('保存品类价格配置失败: 用户未登录')
    return false
  }

  console.log('[PieceworkAPI] 保存单个品类价格:', {
    warehouse_id: input.warehouse_id,
    category_id: input.category_id,
    price: input.price
  })

  // 先查询是否存在
  const {data: existing} = await supabase
    .from('category_prices')
    .select('id')
    .eq('warehouse_id', input.warehouse_id)
    .eq('category_id', input.category_id)
    .maybeSingle()

  let error: Error | null = null

  if (existing) {
    // 存在则更新
    console.log('[PieceworkAPI] 更新已存在的品类价格, id:', existing.id)
    const {error: updateError} = await supabase
      .from('category_prices')
      .update({
        price: input.price,
        driver_type: input.driver_type || 'driver_only',
        effective_date: input.effective_date || new Date().toISOString().split('T')[0]
      })
      .eq('id', existing.id)
    error = updateError as Error | null
  } else {
    // 不存在则插入
    console.log('[PieceworkAPI] 插入新的品类价格')
    const {error: insertError} = await supabase.from('category_prices').insert({
      warehouse_id: input.warehouse_id,
      category_id: input.category_id,
      price: input.price,
      driver_type: input.driver_type || 'driver_only',
      effective_date: input.effective_date || new Date().toISOString().split('T')[0]
    })
    error = insertError as Error | null
  }

  if (error) {
    console.error('保存品类价格配置失败:', error)
    return false
  }

  // 发布品类价格更新事件，通知相关页面刷新
  publish('category_price:updated', {
    warehouse_id: input.warehouse_id,
    category_id: input.category_id,
    price: input.price,
    driver_type: input.driver_type
  })

  console.log('[PieceworkAPI] 保存品类价格成功')
  return true
}

/**
 * 批量创建或更新品类价格配置
 * 使用数据库实际字段：driver_only_price 和 driver_with_vehicle_price
 * 每个品类只有一条记录，包含两种价格
 * @param inputs - 品类价格输入数据数组
 * @returns 是否保存成功
 */
export async function batchUpsertCategoryPrices(inputs: CategoryPriceInput[]): Promise<boolean> {
  const {
    data: {user}
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('批量保存品类价格配置失败: 用户未登录')
    return false
  }

  if (inputs.length === 0) {
    console.log('[PieceworkAPI] 没有品类价格需要保存')
    return true
  }

  // 获取仓库ID（所有输入应该是同一个仓库）
  const warehouseId = inputs[0].warehouse_id

  console.log('[PieceworkAPI] 批量保存品类价格:', {
    warehouseId,
    count: inputs.length,
    inputs: inputs.map((i) => ({
      category_id: i.category_id,
      driver_only_price: i.driver_only_price,
      driver_with_vehicle_price: i.driver_with_vehicle_price
    }))
  })

  // 1. 先查询该仓库已存在的所有品类价格
  const {data: existingPrices, error: queryError} = await supabase
    .from('category_prices')
    .select('id, category_id')
    .eq('warehouse_id', warehouseId)

  if (queryError) {
    console.error('查询已存在品类价格失败:', queryError)
    return false
  }

  // 构建 category_id -> id 的映射
  const existingMap = new Map<string, string>()
  for (const price of existingPrices || []) {
    existingMap.set(price.category_id, price.id)
  }

  console.log('[PieceworkAPI] 已存在的品类价格:', {
    count: existingMap.size,
    categoryIds: Array.from(existingMap.keys())
  })

  // 2. 分离需要更新和需要插入的记录
  interface UpdateRecord {
    id: string
    driver_only_price: number
    driver_with_vehicle_price: number
  }
  interface InsertRecord {
    warehouse_id: string
    category_id: string
    driver_only_price: number
    driver_with_vehicle_price: number
  }

  const toUpdate: UpdateRecord[] = []
  const toInsert: InsertRecord[] = []

  for (const input of inputs) {
    const existingId = existingMap.get(input.category_id)

    if (existingId) {
      // 已存在，需要更新
      toUpdate.push({
        id: existingId,
        driver_only_price: input.driver_only_price || 0,
        driver_with_vehicle_price: input.driver_with_vehicle_price || 0
      })
    } else {
      // 不存在，需要插入
      toInsert.push({
        warehouse_id: input.warehouse_id,
        category_id: input.category_id,
        driver_only_price: input.driver_only_price || 0,
        driver_with_vehicle_price: input.driver_with_vehicle_price || 0
      })
    }
  }

  console.log('[PieceworkAPI] 操作计划:', {
    toUpdateCount: toUpdate.length,
    toInsertCount: toInsert.length
  })

  // 3. 执行更新操作（逐条更新）
  for (const item of toUpdate) {
    const {error: updateError} = await supabase
      .from('category_prices')
      .update({
        driver_only_price: item.driver_only_price,
        driver_with_vehicle_price: item.driver_with_vehicle_price
      })
      .eq('id', item.id)

    if (updateError) {
      console.error('更新品类价格失败:', updateError, item)
      return false
    }
  }

  // 4. 执行插入操作（批量插入）
  if (toInsert.length > 0) {
    const {error: insertError} = await supabase.from('category_prices').insert(toInsert)

    if (insertError) {
      console.error('插入品类价格失败:', insertError)
      return false
    }
  }

  console.log('[PieceworkAPI] 批量保存品类价格成功')
  return true
}

/**
 * 删除品类价格配置
 * @param id - 品类价格配置ID
 * @returns 是否删除成功
 */
export async function deleteCategoryPrice(id: string): Promise<boolean> {
  const {error} = await supabase.from('category_prices').delete().eq('id', id)
  if (error) {
    console.error('删除品类价格配置失败:', error)
    return false
  }

  // 发布品类价格删除事件，通知相关页面刷新
  publish('category_price:deleted', {
    id
  })

  return true
}

/**
 * 获取司机的品类价格
 * 使用数据库实际字段：driver_only_price 和 driver_with_vehicle_price
 * 注意：sorting_unit_price 字段在当前数据库中不存在，暂时返回 0
 * @param warehouseId - 仓库ID
 * @param categoryId - 品类ID
 * @returns 价格配置对象，包含纯司机单价和带车单价
 */
export async function getCategoryPriceForDriver(
  warehouseId: string,
  categoryId: string
): Promise<{unitPrice: number; upstairsPrice: number; sortingUnitPrice: number} | null> {
  console.log('[PieceworkAPI] 查询品类价格:', {warehouseId, categoryId})

  // 查询数据库实际存在的字段（不包含 sorting_unit_price，该字段在数据库中不存在）
  const {data, error} = await supabase
    .from('category_prices')
    .select('driver_only_price, driver_with_vehicle_price')
    .eq('warehouse_id', warehouseId)
    .eq('category_id', categoryId)
    .maybeSingle()

  if (error) {
    console.error('[PieceworkAPI] 获取品类价格失败:', error)
    return null
  }

  console.log('[PieceworkAPI] 查询结果:', JSON.stringify(data, null, 2))

  if (!data) {
    console.warn('[PieceworkAPI] 未找到品类价格配置')
    return null
  }

  // 使用数据库实际字段名，sorting_unit_price 暂时返回 0
  const result = {
    unitPrice: Number(data.driver_only_price) || 0, // 纯司机单价
    upstairsPrice: Number(data.driver_with_vehicle_price) || 0, // 带车单价
    sortingUnitPrice: 0 // 数据库中暂无此字段，返回默认值 0
  }

  console.log('[PieceworkAPI] 返回价格配置:', result)
  return result
}
