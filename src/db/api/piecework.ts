/**
 * 计件管理 API
 *
 * 功能包括：
 * - 计件记录管理
 * - 计件品类管理（使用 CategoriesRepository，带缓存）
 * - 品类价格配置（使用 CategoryPricesRepository，带缓存）
 * - 计件统计
 *
 * 注意：此文件是 Repository 层的包装器
 * 所有数据访问都通过 Repository 层进行，确保缓存一致性
 *
 * @module db/api/piecework
 */

import { supabase } from '@/client/supabase'
import { publish } from '@/utils/eventBus'
import {
  categoriesRepository,
  pieceWorkRepository,
  categoryPricesRepository
} from '../repositories'
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
 *
 * @param userId - 用户 ID
 * @param startDate - 开始日期（可选）
 * @param endDate - 结束日期（可选）
 * @returns 计件记录列表
 */
export async function getPieceWorkRecordsByUser(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkRecord[]> {
  return pieceWorkRepository.getByUser(userId, startDate, endDate)
}

/**
 * 获取仓库的计件记录
 *
 * @param warehouseId - 仓库 ID
 * @param startDate - 开始日期（可选）
 * @param endDate - 结束日期（可选）
 * @returns 计件记录列表
 */
export async function getPieceWorkRecordsByWarehouse(
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkRecord[]> {
  return pieceWorkRepository.getByWarehouse(warehouseId, startDate, endDate)
}

/**
 * 获取用户在指定仓库的计件记录
 *
 * @param userId - 用户 ID
 * @param warehouseId - 仓库 ID
 * @param startDate - 开始日期（可选）
 * @param endDate - 结束日期（可选）
 * @returns 计件记录列表
 */
export async function getPieceWorkRecordsByUserAndWarehouse(
  userId: string,
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkRecord[]> {
  return pieceWorkRepository.getByUserAndWarehouse(userId, warehouseId, startDate, endDate)
}

/**
 * 获取所有计件记录
 *
 * @returns 所有计件记录列表
 */
export async function getAllPieceWorkRecords(): Promise<PieceWorkRecord[]> {
  return pieceWorkRepository.getAllRecords()
}

/**
 * 创建计件记录
 *
 * @param record - 计件记录输入数据
 * @returns 是否创建成功
 */
export async function createPieceWorkRecord(record: PieceWorkRecordInput): Promise<boolean> {
  // 验证用户登录状态
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('创建计件记录失败: 用户未登录')
    return false
  }

  // 验证必填字段
  if (!record.user_id || !record.quantity || record.quantity <= 0) {
    console.error('创建计件记录失败: 参数无效')
    return false
  }

  const result = await pieceWorkRepository.createRecord(record)

  if (result) {
    // 发布事件通知其他组件刷新数据
    publish('piece_work:created', { userId: record.user_id })
    return true
  }

  return false
}

/**
 * 更新计件记录
 *
 * @param id - 计件记录 ID
 * @param record - 更新数据
 * @returns 是否更新成功
 */
export async function updatePieceWorkRecord(id: string, record: Partial<PieceWorkRecordInput>): Promise<boolean> {
  const result = await pieceWorkRepository.updateRecord(id, record)

  if (result) {
    // 发布事件通知其他组件刷新数据
    publish('piece_work:updated', { id })
    return true
  }

  return false
}

/**
 * 删除计件记录
 *
 * @param id - 计件记录 ID
 * @returns 是否删除成功
 */
export async function deletePieceWorkRecord(id: string): Promise<boolean> {
  return pieceWorkRepository.deleteRecord(id)
}

/**
 * 计算计件统计
 *
 * @param userId - 用户 ID
 * @param warehouseId - 仓库 ID
 * @param startDate - 开始日期（可选）
 * @param endDate - 结束日期（可选）
 * @returns 计件统计数据
 */
export async function calculatePieceWorkStats(
  userId: string,
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkStats> {
  // 获取用户在仓库的计件记录
  const records = await pieceWorkRepository.getByUserAndWarehouse(userId, warehouseId, startDate, endDate)

  // 初始化统计数据
  const stats: PieceWorkStats = {
    total_orders: records.length,
    total_quantity: 0,
    total_amount: 0,
    by_category: []
  }

  // 获取品类信息用于统计
  const categories = await categoriesRepository.getAllCategories()
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  // 按品类统计
  const categoryStatsMap = new Map<
    string,
    { category_id: string; category_name: string; quantity: number; amount: number }
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
// 注意：品类管理 API 已迁移到 CategoriesRepository，带缓存（TTL 10 分钟）

/**
 * 获取所有启用的品类
 * 使用 CategoriesRepository，带缓存（TTL 10 分钟）
 *
 * @returns 启用的品类数组
 */
export async function getActiveCategories(): Promise<PieceWorkCategory[]> {
  return categoriesRepository.getActiveCategories()
}

/**
 * 获取所有品类
 * 使用 CategoriesRepository，带缓存（TTL 10 分钟）
 *
 * @returns 所有品类数组
 */
export async function getAllCategories(): Promise<PieceWorkCategory[]> {
  return categoriesRepository.getAllCategories()
}

/**
 * 创建品类
 * 使用 CategoriesRepository，创建成功后自动清除缓存
 *
 * @param category - 品类输入数据
 * @returns 创建的品类对象，失败返回 null
 */
export async function createCategory(category: PieceWorkCategoryInput): Promise<PieceWorkCategory | null> {
  return categoriesRepository.createCategory(category)
}

/**
 * 更新品类
 * 使用 CategoriesRepository，更新成功后自动清除缓存
 *
 * @param id - 品类 ID
 * @param updates - 更新数据
 * @returns 是否更新成功
 */
export async function updateCategory(id: string, updates: Partial<PieceWorkCategoryInput>): Promise<boolean> {
  return categoriesRepository.updateCategory(id, updates)
}

/**
 * 删除品类
 * 使用 CategoriesRepository，删除成功后自动清除缓存
 * 注意：会先删除关联的价格记录
 *
 * @param id - 品类 ID
 * @returns 是否删除成功
 */
export async function deleteCategory(id: string): Promise<boolean> {
  return categoriesRepository.deleteCategory(id)
}

/**
 * 删除未被使用的品类
 *
 * @returns 删除结果
 */
export async function deleteUnusedCategories(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    // 获取所有被使用的品类 ID
    const { data: usedCategoryIds, error: usedError } = await supabase
      .from('category_prices')
      .select('category_id')
      .order('category_id', { ascending: true })

    if (usedError) {
      return { success: false, deletedCount: 0, error: usedError.message }
    }

    // 获取所有品类
    const allCategories = await categoriesRepository.getAllCategories()

    if (allCategories.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    // 找出未被使用的品类
    const usedIds = new Set(usedCategoryIds?.map((item) => item.category_id) || [])
    const unusedCategoryIds = allCategories.filter((cat) => !usedIds.has(cat.id)).map((cat) => cat.id)

    if (unusedCategoryIds.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    // 删除未使用的品类
    const { error: deleteError } = await supabase.from('piece_work_categories').delete().in('id', unusedCategoryIds)

    if (deleteError) {
      return { success: false, deletedCount: 0, error: deleteError.message }
    }

    return { success: true, deletedCount: unusedCategoryIds.length }
  } catch (error) {
    return { success: false, deletedCount: 0, error: String(error) }
  }
}

// ==================== 品类价格配置 API ====================
// 注意：品类价格 API 已迁移到 CategoryPricesRepository，带缓存（TTL 5 分钟）

/**
 * 获取仓库的所有品类价格配置
 *
 * @param warehouseId - 仓库 ID
 * @returns 品类价格列表
 */
export async function getCategoryPricesByWarehouse(warehouseId: string): Promise<CategoryPrice[]> {
  // 获取价格数据
  const prices = await categoryPricesRepository.getByWarehouse(warehouseId)

  // 获取品类名称
  const categories = await categoriesRepository.getAllCategories()
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  // 将品类名称映射到价格数据
  return prices.map((price) => ({
    ...price,
    category_name: categoryMap.get(price.category_id) || price.category_name
  }))
}

/**
 * 获取指定品类价格配置
 *
 * @param warehouseId - 仓库 ID
 * @param categoryId - 品类 ID
 * @returns 品类价格，不存在返回 null
 */
export async function getCategoryPrice(warehouseId: string, categoryId: string): Promise<CategoryPrice | null> {
  return categoryPricesRepository.getPrice(warehouseId, categoryId)
}

/**
 * 创建或更新品类价格配置
 * 策略：先查询是否存在，存在则更新，不存在则插入
 *
 * @param input - 品类价格输入数据
 * @returns 是否保存成功
 */
export async function upsertCategoryPrice(input: CategoryPriceInput): Promise<boolean> {
  // 验证用户登录状态
  const {
    data: { user }
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

  const result = await categoryPricesRepository.upsertPrice(input)

  if (result) {
    // 发布品类价格更新事件
    publish('category_price:updated', {
      warehouse_id: input.warehouse_id,
      category_id: input.category_id,
      price: input.price,
      driver_type: input.driver_type
    })

    console.log('[PieceworkAPI] 保存品类价格成功')
    return true
  }

  return false
}

/**
 * 批量创建或更新品类价格配置
 * 使用数据库实际字段：driver_only_price 和 driver_with_vehicle_price
 *
 * @param inputs - 品类价格输入数据数组
 * @returns 是否保存成功
 */
export async function batchUpsertCategoryPrices(inputs: CategoryPriceInput[]): Promise<boolean> {
  // 验证用户登录状态
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('批量保存品类价格配置失败: 用户未登录')
    return false
  }

  if (inputs.length === 0) {
    console.log('[PieceworkAPI] 没有品类价格需要保存')
    return true
  }

  console.log('[PieceworkAPI] 批量保存品类价格:', {
    warehouseId: inputs[0].warehouse_id,
    count: inputs.length
  })

  const results = await categoryPricesRepository.batchUpsertPrices(inputs)

  if (results.length > 0) {
    console.log('[PieceworkAPI] 批量保存品类价格成功')
    return true
  }

  return false
}

/**
 * 删除品类价格配置
 *
 * @param id - 品类价格配置 ID
 * @returns 是否删除成功
 */
export async function deleteCategoryPrice(id: string): Promise<boolean> {
  const success = await categoryPricesRepository.deletePrice(id)

  if (success) {
    // 发布品类价格删除事件
    publish('category_price:deleted', { id })
  }

  return success
}

/**
 * 获取司机的品类价格
 * 根据司机类型返回对应的单价
 *
 * @param warehouseId - 仓库 ID
 * @param categoryId - 品类 ID
 * @param driverType - 司机类型：'with_vehicle'（带车司机）或其他（纯司机）
 * @returns 价格配置对象
 */
export async function getCategoryPriceForDriver(
  warehouseId: string,
  categoryId: string,
  driverType?: string | null
): Promise<{ unitPrice: number; driverOnlyPrice: number; driverWithVehiclePrice: number; sortingUnitPrice: number } | null> {
  console.log('[PieceworkAPI] 查询品类价格:', { warehouseId, categoryId, driverType })

  // 使用 Repository 获取价格
  const price = await categoryPricesRepository.getPrice(warehouseId, categoryId)

  if (!price) {
    console.warn('[PieceworkAPI] 未找到品类价格配置')
    return null
  }

  const driverOnlyPrice = Number(price.driver_only_price) || 0
  const driverWithVehiclePrice = Number(price.driver_with_vehicle_price) || 0

  // 根据司机类型选择对应的单价
  // 带车司机使用 driver_with_vehicle_price，纯司机使用 driver_only_price
  const unitPrice = driverType === 'with_vehicle' ? driverWithVehiclePrice : driverOnlyPrice

  const result = {
    unitPrice, // 根据司机类型选择的单价
    driverOnlyPrice, // 纯司机单价（供参考）
    driverWithVehiclePrice, // 带车司机单价（供参考）
    sortingUnitPrice: 0 // 数据库中暂无此字段，返回默认值 0
  }

  console.log('[PieceworkAPI] 返回价格配置:', result, '司机类型:', driverType)
  return result
}
