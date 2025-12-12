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
  const {data: {user}} = await supabase.auth.getUser()
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

  const categoryStatsMap = new Map<string, {category_id: string; category_name: string; quantity: number; amount: number}>()

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
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        is_active: true,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    }
    return null
  } catch (error) {
    console.error('创建品类异常:', error)
    return null
  }
}

/**
 * 更新品类
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
    return true
  } catch (error) {
    console.error('更新品类异常:', error)
    return false
  }
}

/**
 * 删除品类
 */
export async function deleteCategory(id: string): Promise<boolean> {
  try {
    const {error: priceError} = await supabase.from('category_prices').delete().eq('category_id', id)
    if (priceError) {
      console.error('删除关联价格记录失败:', priceError)
      return false
    }

    const {error} = await supabase.from('piece_work_categories').delete().eq('id', id)
    if (error) {
      console.error('删除品类失败:', error)
      return false
    }
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
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('created_at', {ascending: true})

  if (error) {
    console.error('获取品类价格配置失败:', error)
    return []
  }
  return data || []
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
 */
export async function upsertCategoryPrice(input: CategoryPriceInput): Promise<boolean> {
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) {
    console.error('保存品类价格配置失败: 用户未登录')
    return false
  }

  const {error} = await supabase.from('category_prices').upsert(
    {
      warehouse_id: input.warehouse_id,
      category_id: input.category_id,
      price: input.price,
      driver_type: input.driver_type,
      effective_date: input.effective_date
    },
    {onConflict: 'category_id,warehouse_id,driver_type,effective_date'}
  )

  if (error) {
    console.error('保存品类价格配置失败:', error)
    return false
  }
  return true
}

/**
 * 批量创建或更新品类价格配置
 */
export async function batchUpsertCategoryPrices(inputs: CategoryPriceInput[]): Promise<boolean> {
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) {
    console.error('批量保存品类价格配置失败: 用户未登录')
    return false
  }

  const {error} = await supabase.from('category_prices').upsert(
    inputs.map((input) => ({
      warehouse_id: input.warehouse_id,
      category_id: input.category_id,
      price: input.price,
      driver_type: input.driver_type,
      effective_date: input.effective_date
    })),
    {onConflict: 'category_id,warehouse_id,driver_type,effective_date'}
  )

  if (error) {
    console.error('批量保存品类价格配置失败:', error)
    return false
  }
  return true
}

/**
 * 删除品类价格配置
 */
export async function deleteCategoryPrice(id: string): Promise<boolean> {
  const {error} = await supabase.from('category_prices').delete().eq('id', id)
  if (error) {
    console.error('删除品类价格配置失败:', error)
    return false
  }
  return true
}

/**
 * 获取司机的品类价格
 */
export async function getCategoryPriceForDriver(
  warehouseId: string,
  categoryId: string
): Promise<{unitPrice: number; upstairsPrice: number; sortingUnitPrice: number} | null> {
  const {data, error} = await supabase
    .from('category_prices')
    .select('price, driver_type')
    .eq('warehouse_id', warehouseId)
    .eq('category_id', categoryId)

  if (error) {
    console.error('获取品类价格失败:', error)
    return null
  }

  if (!data || data.length === 0) return null

  const driverOnlyPrice = data.find((item: any) => item.driver_type === 'driver_only')
  const defaultPrice = driverOnlyPrice || data[0]

  return {
    unitPrice: defaultPrice.price || 0,
    upstairsPrice: 0,
    sortingUnitPrice: 0
  }
}
