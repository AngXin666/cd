/**
 * 件数计算验证工具
 * 提供计件数据的计算和验证功能
 * 
 * @module utils/validation/pieceWorkCalculation
 * 
 * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
 * **Validates: Requirements 4.2**
 * 
 * 验证规则：
 * - 总件数应等于各品类件数之和
 * - 总金额应等于各品类金额之和
 * - 品类分组后的统计应与原始数据一致
 */

import type { PieceWorkRecord } from '@/api/types'

// ==================== 类型定义 ====================

/**
 * 品类统计结果
 */
export interface CategoryStats {
  /** 品类名称 */
  categoryName: string
  /** 品类ID */
  categoryId: number
  /** 总数量 */
  totalQuantity: number
  /** 总金额 */
  totalAmount: number
  /** 记录数 */
  recordCount: number
}

/**
 * 计件汇总结果
 */
export interface PieceWorkSummary {
  /** 总数量 */
  totalQuantity: number
  /** 总金额 */
  totalAmount: number
  /** 记录数 */
  recordCount: number
  /** 按品类分组的统计 */
  categoryStats: CategoryStats[]
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误信息 */
  error?: string
}

// ==================== 计算函数 ====================

/**
 * 计算单条记录的金额
 * 金额 = 数量 × 单价
 * 
 * @param quantity - 数量
 * @param unitPrice - 单价
 * @returns 计算的金额
 */
export function calculateRecordAmount(quantity: number, unitPrice: number): number {
  // 确保数值有效
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return 0
  }
  
  // 确保非负
  const safeQuantity = Math.max(0, quantity)
  const safeUnitPrice = Math.max(0, unitPrice)
  
  // 计算金额，保留两位小数
  return Math.round(safeQuantity * safeUnitPrice * 100) / 100
}

/**
 * 计算记录列表的总数量
 * 
 * @param records - 计件记录列表
 * @returns 总数量
 */
export function calculateTotalQuantity(records: PieceWorkRecord[]): number {
  if (!Array.isArray(records) || records.length === 0) {
    return 0
  }
  
  return records.reduce((sum, record) => {
    const quantity = Number(record.quantity) || 0
    return sum + Math.max(0, quantity)
  }, 0)
}

/**
 * 计算记录列表的总金额
 * 
 * @param records - 计件记录列表
 * @returns 总金额
 */
export function calculateTotalAmount(records: PieceWorkRecord[]): number {
  if (!Array.isArray(records) || records.length === 0) {
    return 0
  }
  
  const total = records.reduce((sum, record) => {
    const amount = Number(record.amount) || 0
    return sum + Math.max(0, amount)
  }, 0)
  
  // 保留两位小数
  return Math.round(total * 100) / 100
}

/**
 * 按品类分组计算统计
 * 
 * @param records - 计件记录列表
 * @returns 按品类分组的统计结果
 */
export function calculateCategoryStats(records: PieceWorkRecord[]): CategoryStats[] {
  if (!Array.isArray(records) || records.length === 0) {
    return []
  }
  
  // 使用 Map 按品类分组
  const categoryMap = new Map<string, CategoryStats>()
  
  for (const record of records) {
    const categoryName = record.category_name || '未知分类'
    const categoryId = record.category_id || 0
    const key = `${categoryId}-${categoryName}`
    
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        categoryName,
        categoryId,
        totalQuantity: 0,
        totalAmount: 0,
        recordCount: 0,
      })
    }
    
    const stats = categoryMap.get(key)!
    stats.totalQuantity += Math.max(0, Number(record.quantity) || 0)
    stats.totalAmount += Math.max(0, Number(record.amount) || 0)
    stats.recordCount += 1
  }
  
  // 转换为数组并保留两位小数
  return Array.from(categoryMap.values()).map(stats => ({
    ...stats,
    totalAmount: Math.round(stats.totalAmount * 100) / 100,
  }))
}

/**
 * 计算计件汇总
 * 
 * @param records - 计件记录列表
 * @returns 汇总结果
 */
export function calculatePieceWorkSummary(records: PieceWorkRecord[]): PieceWorkSummary {
  const categoryStats = calculateCategoryStats(records)
  
  return {
    totalQuantity: calculateTotalQuantity(records),
    totalAmount: calculateTotalAmount(records),
    recordCount: records.length,
    categoryStats,
  }
}

// ==================== 验证函数 ====================

/**
 * 验证总数量是否等于各品类数量之和
 * 
 * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
 * **Validates: Requirements 4.2**
 * 
 * @param records - 计件记录列表
 * @returns 验证结果
 */
export function validateTotalQuantity(records: PieceWorkRecord[]): ValidationResult {
  if (!Array.isArray(records)) {
    return { valid: false, error: '记录列表无效' }
  }
  
  if (records.length === 0) {
    return { valid: true }
  }
  
  // 计算总数量
  const totalQuantity = calculateTotalQuantity(records)
  
  // 计算各品类数量之和
  const categoryStats = calculateCategoryStats(records)
  const categoryTotalQuantity = categoryStats.reduce(
    (sum, stats) => sum + stats.totalQuantity,
    0
  )
  
  // 验证是否相等
  if (totalQuantity !== categoryTotalQuantity) {
    return {
      valid: false,
      error: `总数量(${totalQuantity})与各品类数量之和(${categoryTotalQuantity})不一致`,
    }
  }
  
  return { valid: true }
}

/**
 * 验证总金额是否等于各品类金额之和
 * 
 * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
 * **Validates: Requirements 4.2**
 * 
 * @param records - 计件记录列表
 * @returns 验证结果
 */
export function validateTotalAmount(records: PieceWorkRecord[]): ValidationResult {
  if (!Array.isArray(records)) {
    return { valid: false, error: '记录列表无效' }
  }
  
  if (records.length === 0) {
    return { valid: true }
  }
  
  // 计算总金额
  const totalAmount = calculateTotalAmount(records)
  
  // 计算各品类金额之和
  const categoryStats = calculateCategoryStats(records)
  const categoryTotalAmount = categoryStats.reduce(
    (sum, stats) => sum + stats.totalAmount,
    0
  )
  
  // 保留两位小数后比较（避免浮点数精度问题）
  const roundedTotal = Math.round(totalAmount * 100) / 100
  const roundedCategoryTotal = Math.round(categoryTotalAmount * 100) / 100
  
  // 验证是否相等（允许 0.01 的误差）
  if (Math.abs(roundedTotal - roundedCategoryTotal) > 0.01) {
    return {
      valid: false,
      error: `总金额(${roundedTotal})与各品类金额之和(${roundedCategoryTotal})不一致`,
    }
  }
  
  return { valid: true }
}

/**
 * 验证计件数据的完整性
 * 
 * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
 * **Validates: Requirements 4.2**
 * 
 * @param records - 计件记录列表
 * @returns 验证结果
 */
export function validatePieceWorkData(records: PieceWorkRecord[]): {
  isValid: boolean
  quantityValidation: ValidationResult
  amountValidation: ValidationResult
} {
  const quantityValidation = validateTotalQuantity(records)
  const amountValidation = validateTotalAmount(records)
  
  return {
    isValid: quantityValidation.valid && amountValidation.valid,
    quantityValidation,
    amountValidation,
  }
}

/**
 * 验证单条记录的数量是否为非负整数
 * 
 * @param quantity - 数量
 * @returns 验证结果
 */
export function validateQuantity(quantity: number): ValidationResult {
  // 检查是否为数字
  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
    return { valid: false, error: '数量必须是有效数字' }
  }
  
  // 检查是否为非负数
  if (quantity < 0) {
    return { valid: false, error: '数量不能为负数' }
  }
  
  // 检查是否为整数
  if (!Number.isInteger(quantity)) {
    return { valid: false, error: '数量必须是整数' }
  }
  
  return { valid: true }
}

/**
 * 验证单价是否为非负数
 * 
 * @param unitPrice - 单价
 * @returns 验证结果
 */
export function validateUnitPrice(unitPrice: number): ValidationResult {
  // 检查是否为数字
  if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice)) {
    return { valid: false, error: '单价必须是有效数字' }
  }
  
  // 检查是否为非负数
  if (unitPrice < 0) {
    return { valid: false, error: '单价不能为负数' }
  }
  
  return { valid: true }
}
