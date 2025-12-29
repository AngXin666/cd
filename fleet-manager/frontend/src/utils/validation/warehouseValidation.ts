/**
 * 仓库表单验证工具函数
 * 提供仓库名称、地址等字段的验证逻辑
 * @module utils/validation/warehouseValidation
 */

// ==================== 常量定义 ====================

/** 仓库名称最大长度 */
export const MAX_NAME_LENGTH = 50

/** 仓库地址最大长度 */
export const MAX_ADDRESS_LENGTH = 200

/** 仓库名称有效字符正则表达式（中文、英文、数字、空格、括号、横线） */
export const VALID_NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-()（）]+$/

/** 仓库地址有效字符正则表达式（至少包含2个有效字符） */
export const VALID_ADDRESS_PATTERN = /[\u4e00-\u9fa5a-zA-Z0-9]{2,}/

// ==================== 类型定义 ====================

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean
  /** 错误信息（验证失败时） */
  error?: string
}

// ==================== 验证函数 ====================

/**
 * 验证仓库名称
 * 
 * 验证规则：
 * 1. 名称不能为空（去除首尾空格后）
 * 2. 名称长度不能超过 50 个字符
 * 3. 名称只能包含中文、英文、数字、空格、括号和横线
 * 
 * @param name - 仓库名称
 * @returns 验证结果
 * 
 * @example
 * ```typescript
 * validateWarehouseName('北京仓库') // { valid: true }
 * validateWarehouseName('') // { valid: false, error: '请输入仓库名称' }
 * validateWarehouseName('a'.repeat(51)) // { valid: false, error: '仓库名称不能超过50个字符' }
 * ```
 * 
 * **Feature: boss-missing-pages, Property 1: 仓库名称长度验证**
 * **Validates: Requirements 1.2**
 */
export function validateWarehouseName(name: string): ValidationResult {
  // 去除首尾空格
  const trimmedName = name.trim()
  
  // 检查是否为空
  if (!trimmedName) {
    return {
      valid: false,
      error: '请输入仓库名称'
    }
  }
  
  // 检查长度限制
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `仓库名称不能超过${MAX_NAME_LENGTH}个字符`
    }
  }
  
  // 检查是否包含特殊字符
  if (!VALID_NAME_PATTERN.test(trimmedName)) {
    return {
      valid: false,
      error: '仓库名称只能包含中文、英文、数字、空格、括号和横线'
    }
  }
  
  return { valid: true }
}

/**
 * 验证仓库地址
 * 
 * 验证规则：
 * 1. 地址是可选的，为空时跳过验证
 * 2. 地址长度不能超过 200 个字符
 * 3. 地址至少包含 2 个有效字符（中文、英文、数字）
 * 
 * @param address - 仓库地址
 * @returns 验证结果
 * 
 * @example
 * ```typescript
 * validateWarehouseAddress('北京市朝阳区') // { valid: true }
 * validateWarehouseAddress('') // { valid: true } // 地址可选
 * validateWarehouseAddress('a'.repeat(201)) // { valid: false, error: '仓库地址不能超过200个字符' }
 * ```
 */
export function validateWarehouseAddress(address: string): ValidationResult {
  // 去除首尾空格
  const trimmedAddress = address.trim()
  
  // 地址是可选的，如果为空则跳过验证
  if (!trimmedAddress) {
    return { valid: true }
  }
  
  // 检查长度限制
  if (trimmedAddress.length > MAX_ADDRESS_LENGTH) {
    return {
      valid: false,
      error: `仓库地址不能超过${MAX_ADDRESS_LENGTH}个字符`
    }
  }
  
  // 检查地址格式（至少包含2个有效字符）
  if (!VALID_ADDRESS_PATTERN.test(trimmedAddress)) {
    return {
      valid: false,
      error: '请输入有效的仓库地址'
    }
  }
  
  return { valid: true }
}

/**
 * 验证仓库表单数据
 * 
 * @param data - 仓库表单数据
 * @returns 验证结果对象，包含各字段的验证结果
 * 
 * @example
 * ```typescript
 * const result = validateWarehouseForm({ name: '北京仓库', address: '北京市' })
 * // { name: { valid: true }, address: { valid: true }, isValid: true }
 * ```
 */
export function validateWarehouseForm(data: {
  name: string
  address?: string
}): {
  name: ValidationResult
  address: ValidationResult
  isValid: boolean
} {
  const nameResult = validateWarehouseName(data.name)
  const addressResult = validateWarehouseAddress(data.address || '')
  
  return {
    name: nameResult,
    address: addressResult,
    isValid: nameResult.valid && addressResult.valid
  }
}
