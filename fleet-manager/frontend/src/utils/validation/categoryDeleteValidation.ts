/**
 * 品类删除约束验证工具
 * 提供品类删除前的约束检查功能
 * 
 * @module utils/validation/categoryDeleteValidation
 * 
 * **Feature: manager-page-alignment, Property 5: 品类删除约束**
 * **Validates: Requirements 3.4**
 * 
 * 验证规则：
 * - 如果品类已有计件记录，则不允许删除
 * - 品类删除操作应被拒绝，品类状态保持不变
 */

import type { PieceWorkRecord } from '@/api/types'

// ==================== 类型定义 ====================

/**
 * 品类信息
 */
export interface Category {
  /** 品类ID */
  id: number
  /** 品类名称 */
  name: string
  /** 单价 */
  unit_price?: number
  /** 单位 */
  unit?: string
  /** 是否激活 */
  is_active?: boolean
}

/**
 * 删除验证结果
 */
export interface DeleteValidationResult {
  /** 是否可以删除 */
  canDelete: boolean
  /** 错误信息（如果不能删除） */
  error?: string
  /** 关联的记录数量 */
  recordCount: number
}

/**
 * 品类删除操作结果
 */
export interface CategoryDeleteResult {
  /** 操作是否成功 */
  success: boolean
  /** 删除后的品类列表（如果成功） */
  categories?: Category[]
  /** 错误信息（如果失败） */
  error?: string
}

// ==================== 验证函数 ====================

/**
 * 检查品类是否有关联的计件记录
 * 
 * **Feature: manager-page-alignment, Property 5: 品类删除约束**
 * **Validates: Requirements 3.4**
 * 
 * @param categoryId - 品类ID
 * @param records - 所有计件记录列表
 * @returns 关联的记录数量
 */
export function countCategoryRecords(
  categoryId: number,
  records: PieceWorkRecord[]
): number {
  // 参数验证
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return 0
  }
  
  if (!Array.isArray(records)) {
    return 0
  }
  
  // 统计该品类的记录数量
  return records.filter(record => record.category_id === categoryId).length
}

/**
 * 验证品类是否可以删除
 * 
 * **Feature: manager-page-alignment, Property 5: 品类删除约束**
 * **Validates: Requirements 3.4**
 * 
 * 规则：如果品类已有计件记录，则不允许删除
 * 
 * @param categoryId - 品类ID
 * @param records - 所有计件记录列表
 * @returns 删除验证结果
 */
export function validateCategoryDelete(
  categoryId: number,
  records: PieceWorkRecord[]
): DeleteValidationResult {
  // 统计关联记录数量
  const recordCount = countCategoryRecords(categoryId, records)
  
  // 如果有关联记录，不允许删除
  if (recordCount > 0) {
    return {
      canDelete: false,
      error: `该品类已有 ${recordCount} 条计件记录，无法删除`,
      recordCount,
    }
  }
  
  // 没有关联记录，可以删除
  return {
    canDelete: true,
    recordCount: 0,
  }
}

/**
 * 模拟品类删除操作
 * 
 * **Feature: manager-page-alignment, Property 5: 品类删除约束**
 * **Validates: Requirements 3.4**
 * 
 * 此函数模拟删除操作，用于验证删除约束：
 * - 如果品类有关联记录，删除操作应被拒绝
 * - 如果品类没有关联记录，删除操作应成功
 * 
 * @param categoryId - 要删除的品类ID
 * @param categories - 当前品类列表
 * @param records - 所有计件记录列表
 * @returns 删除操作结果
 */
export function simulateCategoryDelete(
  categoryId: number,
  categories: Category[],
  records: PieceWorkRecord[]
): CategoryDeleteResult {
  // 参数验证
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return {
      success: false,
      error: '无效的品类ID',
    }
  }
  
  if (!Array.isArray(categories)) {
    return {
      success: false,
      error: '品类列表无效',
    }
  }
  
  // 检查品类是否存在
  const categoryExists = categories.some(c => c.id === categoryId)
  if (!categoryExists) {
    return {
      success: false,
      error: '品类不存在',
    }
  }
  
  // 验证是否可以删除
  const validation = validateCategoryDelete(categoryId, records)
  
  if (!validation.canDelete) {
    // 删除被拒绝，返回原品类列表（状态不变）
    return {
      success: false,
      error: validation.error,
      categories: [...categories], // 返回原列表的副本
    }
  }
  
  // 可以删除，从列表中移除该品类
  const updatedCategories = categories.filter(c => c.id !== categoryId)
  
  return {
    success: true,
    categories: updatedCategories,
  }
}

/**
 * 验证删除操作后品类状态是否正确
 * 
 * **Feature: manager-page-alignment, Property 5: 品类删除约束**
 * **Validates: Requirements 3.4**
 * 
 * 此函数用于验证删除操作的正确性：
 * - 如果删除成功，品类应该从列表中移除
 * - 如果删除失败（有关联记录），品类应该保持不变
 * 
 * @param originalCategories - 原始品类列表
 * @param resultCategories - 操作后的品类列表
 * @param categoryId - 被删除的品类ID
 * @param deleteSuccess - 删除是否成功
 * @returns 验证是否通过
 */
export function validateDeleteResult(
  originalCategories: Category[],
  resultCategories: Category[],
  categoryId: number,
  deleteSuccess: boolean
): boolean {
  if (deleteSuccess) {
    // 删除成功：品类应该从列表中移除
    const categoryStillExists = resultCategories.some(c => c.id === categoryId)
    const countReduced = resultCategories.length === originalCategories.length - 1
    return !categoryStillExists && countReduced
  } else {
    // 删除失败：品类列表应该保持不变
    const sameLength = resultCategories.length === originalCategories.length
    const categoryStillExists = resultCategories.some(c => c.id === categoryId)
    return sameLength && categoryStillExists
  }
}

/**
 * 批量检查多个品类的删除约束
 * 
 * @param categoryIds - 品类ID列表
 * @param records - 所有计件记录列表
 * @returns 每个品类的删除验证结果
 */
export function batchValidateCategoryDelete(
  categoryIds: number[],
  records: PieceWorkRecord[]
): Map<number, DeleteValidationResult> {
  const results = new Map<number, DeleteValidationResult>()
  
  if (!Array.isArray(categoryIds)) {
    return results
  }
  
  for (const categoryId of categoryIds) {
    results.set(categoryId, validateCategoryDelete(categoryId, records))
  }
  
  return results
}
