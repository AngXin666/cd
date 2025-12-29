/**
 * 租金验证工具函数
 * 提供车辆租金相关的验证功能
 * @module utils/validation/rentalValidation
 * 
 * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
 * **Validates: Requirements 2.4**
 */

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

/**
 * 租金表单数据接口
 */
export interface RentalFormData {
  /** 月租金 */
  monthlyRent: string | number
  /** 开始日期 */
  startDate: string
  /** 结束日期 */
  endDate: string
  /** 押金（可选） */
  deposit?: string | number
}

/**
 * 租金表单验证结果接口
 */
export interface RentalFormValidationResult {
  /** 整体是否验证通过 */
  isValid: boolean
  /** 月租金验证结果 */
  monthlyRent: ValidationResult
  /** 开始日期验证结果 */
  startDate: ValidationResult
  /** 结束日期验证结果 */
  endDate: ValidationResult
  /** 押金验证结果 */
  deposit: ValidationResult
}

// ==================== 常量定义 ====================

/** 月租金最大值：100000元 */
export const MAX_MONTHLY_RENT = 100000

/** 押金最大值：100000元 */
export const MAX_DEPOSIT = 100000

/** 日期格式正则表达式：YYYY-MM-DD */
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/

// ==================== 验证函数 ====================

/**
 * 验证日期格式是否正确
 * 检查日期字符串是否为有效的 YYYY-MM-DD 格式
 * 
 * @param dateStr - 日期字符串
 * @returns 验证结果
 * 
 * **Validates: Requirements 2.3**
 * 
 * @example
 * ```typescript
 * validateDateFormat('2024-01-15') // { valid: true }
 * validateDateFormat('2024-1-15')  // { valid: false, error: '日期格式不正确，请使用 YYYY-MM-DD 格式' }
 * validateDateFormat('invalid')    // { valid: false, error: '日期格式不正确，请使用 YYYY-MM-DD 格式' }
 * ```
 */
export function validateDateFormat(dateStr: string): ValidationResult {
  // 空字符串检查
  if (!dateStr || dateStr.trim() === '') {
    return {
      valid: false,
      error: '请选择日期'
    }
  }

  const trimmedDate = dateStr.trim()

  // 检查格式是否为 YYYY-MM-DD
  if (!DATE_FORMAT_REGEX.test(trimmedDate)) {
    return {
      valid: false,
      error: '日期格式不正确，请使用 YYYY-MM-DD 格式'
    }
  }

  // 解析日期各部分
  const [yearStr, monthStr, dayStr] = trimmedDate.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)

  // 验证月份范围（1-12）
  if (month < 1 || month > 12) {
    return {
      valid: false,
      error: '月份必须在 1-12 之间'
    }
  }

  // 验证日期范围
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) {
    return {
      valid: false,
      error: `日期必须在 1-${daysInMonth} 之间`
    }
  }

  // 检查是否为有效日期（防止 2024-02-30 这种情况）
  const date = new Date(trimmedDate)
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: '无效的日期'
    }
  }

  return { valid: true }
}

/**
 * 验证租金日期范围有效性
 * 验证结束日期必须晚于开始日期
 * 
 * @param startDate - 开始日期（YYYY-MM-DD 格式）
 * @param endDate - 结束日期（YYYY-MM-DD 格式）
 * @returns 验证结果
 * 
 * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
 * **Validates: Requirements 2.4**
 * 
 * @example
 * ```typescript
 * validateRentalDateRange('2024-01-01', '2024-12-31') // { valid: true }
 * validateRentalDateRange('2024-12-31', '2024-01-01') // { valid: false, error: '结束日期必须晚于开始日期' }
 * validateRentalDateRange('2024-01-01', '2024-01-01') // { valid: false, error: '结束日期必须晚于开始日期' }
 * ```
 */
export function validateRentalDateRange(startDate: string, endDate: string): ValidationResult {
  // 先验证开始日期格式
  const startDateValidation = validateDateFormat(startDate)
  if (!startDateValidation.valid) {
    return {
      valid: false,
      error: `开始日期: ${startDateValidation.error}`
    }
  }

  // 再验证结束日期格式
  const endDateValidation = validateDateFormat(endDate)
  if (!endDateValidation.valid) {
    return {
      valid: false,
      error: `结束日期: ${endDateValidation.error}`
    }
  }

  // 解析日期进行比较
  const start = new Date(startDate.trim())
  const end = new Date(endDate.trim())

  // 验证结束日期必须晚于开始日期（不能等于）
  if (end.getTime() <= start.getTime()) {
    return {
      valid: false,
      error: '结束日期必须晚于开始日期'
    }
  }

  return { valid: true }
}

/**
 * 验证月租金
 * 必须为正数且不超过 100000
 * 
 * @param monthlyRent - 月租金（字符串或数字）
 * @returns 验证结果
 * 
 * **Validates: Requirements 2.2**
 * 
 * @example
 * ```typescript
 * validateMonthlyRent(5000)    // { valid: true }
 * validateMonthlyRent('5000')  // { valid: true }
 * validateMonthlyRent(0)       // { valid: false, error: '月租金必须为正数' }
 * validateMonthlyRent(150000)  // { valid: false, error: '月租金不能超过100000元' }
 * ```
 */
export function validateMonthlyRent(monthlyRent: string | number): ValidationResult {
  // 转换为字符串处理
  const rentStr = String(monthlyRent).trim()

  // 空值检查
  if (!rentStr) {
    return {
      valid: false,
      error: '请输入月租金'
    }
  }

  // 转换为数字
  const rent = parseFloat(rentStr)

  // 检查是否为有效数字
  if (isNaN(rent)) {
    return {
      valid: false,
      error: '请输入有效的数字'
    }
  }

  // 检查是否为正数
  if (rent <= 0) {
    return {
      valid: false,
      error: '月租金必须为正数'
    }
  }

  // 检查是否超过最大值
  if (rent > MAX_MONTHLY_RENT) {
    return {
      valid: false,
      error: `月租金不能超过${MAX_MONTHLY_RENT}元`
    }
  }

  return { valid: true }
}

/**
 * 验证押金
 * 如果填写，必须为非负数且不超过 100000
 * 
 * @param deposit - 押金（字符串或数字，可选）
 * @returns 验证结果
 * 
 * @example
 * ```typescript
 * validateDeposit(5000)    // { valid: true }
 * validateDeposit('')      // { valid: true } - 押金是可选的
 * validateDeposit(-100)    // { valid: false, error: '押金不能为负数' }
 * validateDeposit(150000)  // { valid: false, error: '押金不能超过100000元' }
 * ```
 */
export function validateDeposit(deposit?: string | number): ValidationResult {
  // 押金是可选的，空值直接通过
  if (deposit === undefined || deposit === null || deposit === '') {
    return { valid: true }
  }

  // 转换为字符串处理
  const depositStr = String(deposit).trim()

  // 空字符串直接通过
  if (!depositStr) {
    return { valid: true }
  }

  // 转换为数字
  const depositNum = parseFloat(depositStr)

  // 检查是否为有效数字
  if (isNaN(depositNum)) {
    return {
      valid: false,
      error: '请输入有效的数字'
    }
  }

  // 检查是否为非负数
  if (depositNum < 0) {
    return {
      valid: false,
      error: '押金不能为负数'
    }
  }

  // 检查是否超过最大值
  if (depositNum > MAX_DEPOSIT) {
    return {
      valid: false,
      error: `押金不能超过${MAX_DEPOSIT}元`
    }
  }

  return { valid: true }
}

/**
 * 验证租金表单
 * 综合验证所有租金相关字段
 * 
 * @param formData - 租金表单数据
 * @returns 表单验证结果
 * 
 * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
 * **Validates: Requirements 2.2, 2.3, 2.4**
 * 
 * @example
 * ```typescript
 * validateRentalForm({
 *   monthlyRent: 5000,
 *   startDate: '2024-01-01',
 *   endDate: '2024-12-31',
 *   deposit: 10000
 * })
 * // { isValid: true, monthlyRent: { valid: true }, ... }
 * ```
 */
export function validateRentalForm(formData: RentalFormData): RentalFormValidationResult {
  // 验证月租金
  const monthlyRentResult = validateMonthlyRent(formData.monthlyRent)

  // 验证开始日期
  const startDateResult = validateDateFormat(formData.startDate)

  // 验证结束日期（包含日期范围验证）
  let endDateResult: ValidationResult
  if (startDateResult.valid) {
    // 如果开始日期有效，验证日期范围
    const rangeResult = validateRentalDateRange(formData.startDate, formData.endDate)
    if (!rangeResult.valid && rangeResult.error?.includes('结束日期必须晚于')) {
      endDateResult = {
        valid: false,
        error: '结束日期必须晚于开始日期'
      }
    } else if (!rangeResult.valid && rangeResult.error?.includes('结束日期:')) {
      // 提取结束日期的具体错误
      endDateResult = {
        valid: false,
        error: rangeResult.error.replace('结束日期: ', '')
      }
    } else {
      endDateResult = rangeResult
    }
  } else {
    // 如果开始日期无效，只验证结束日期格式
    endDateResult = validateDateFormat(formData.endDate)
  }

  // 验证押金
  const depositResult = validateDeposit(formData.deposit)

  // 计算整体验证结果
  const isValid = monthlyRentResult.valid && 
                  startDateResult.valid && 
                  endDateResult.valid && 
                  depositResult.valid

  return {
    isValid,
    monthlyRent: monthlyRentResult,
    startDate: startDateResult,
    endDate: endDateResult,
    deposit: depositResult
  }
}

/**
 * 比较两个日期
 * 返回日期比较结果
 * 
 * @param date1 - 第一个日期（YYYY-MM-DD 格式）
 * @param date2 - 第二个日期（YYYY-MM-DD 格式）
 * @returns 比较结果：-1 表示 date1 < date2，0 表示相等，1 表示 date1 > date2
 * 
 * @example
 * ```typescript
 * compareDates('2024-01-01', '2024-12-31') // -1
 * compareDates('2024-12-31', '2024-01-01') // 1
 * compareDates('2024-06-15', '2024-06-15') // 0
 * ```
 */
export function compareDates(date1: string, date2: string): -1 | 0 | 1 {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  
  const time1 = d1.getTime()
  const time2 = d2.getTime()
  
  if (time1 < time2) return -1
  if (time1 > time2) return 1
  return 0
}
