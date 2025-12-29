/**
 * 计件完成率计算工具
 * 提供完成率计算和状态判断功能
 * 
 * @module utils/completionRate
 * 
 * **Feature: manager-page-alignment, Property 7: 完成率状态判断正确性**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 * 
 * 完成率状态规则：
 * - 超过110%：超额完成（绿色）
 * - 100%-110%：达标（蓝色）
 * - 70%-100%：不达标（橙色）
 * - 低于70%：严重不达标（红色）
 */

// ==================== 类型定义 ====================

/**
 * 完成率状态枚举
 * 定义四种完成率状态
 */
export type CompletionStatus = 'excellent' | 'standard' | 'below' | 'critical'

/**
 * 完成率计算结果
 * 包含完成率数值、状态、标签和颜色
 */
export interface CompletionRateResult {
  /** 完成率百分比（0-100+） */
  rate: number
  /** 完成率状态 */
  status: CompletionStatus
  /** 状态文字标签 */
  label: string
  /** 状态颜色（CSS颜色值） */
  color: string
}

/**
 * 完成率阈值配置
 * 定义各状态的阈值边界
 */
export interface CompletionThresholds {
  /** 超额完成阈值（默认110%） */
  excellent: number
  /** 达标阈值（默认100%） */
  standard: number
  /** 不达标阈值（默认70%） */
  below: number
}

// ==================== 常量定义 ====================

/**
 * 默认完成率阈值配置
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */
export const DEFAULT_THRESHOLDS: CompletionThresholds = {
  excellent: 110, // 超过110%为超额完成
  standard: 100,  // 100%-110%为达标
  below: 70,      // 70%-100%为不达标，低于70%为严重不达标
}

/**
 * 状态标签映射
 * 定义各状态的中文标签
 */
export const STATUS_LABELS: Record<CompletionStatus, string> = {
  excellent: '超额完成',
  standard: '达标',
  below: '不达标',
  critical: '严重不达标',
}

/**
 * 状态颜色映射
 * 定义各状态的显示颜色
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */
export const STATUS_COLORS: Record<CompletionStatus, string> = {
  excellent: '#52c41a', // 绿色 - 超额完成
  standard: '#1890ff',  // 蓝色 - 达标
  below: '#fa8c16',     // 橙色 - 不达标
  critical: '#ff4d4f',  // 红色 - 严重不达标
}

// ==================== 核心计算函数 ====================

/**
 * 计算完成率百分比
 * 完成率 = (实际完成量 / 目标量) × 100
 * 
 * @param actual - 实际完成量
 * @param target - 目标量
 * @returns 完成率百分比，保留一位小数
 * 
 * @example
 * calculateRate(110, 100) // 返回 110.0
 * calculateRate(70, 100)  // 返回 70.0
 * calculateRate(0, 100)   // 返回 0.0
 * calculateRate(100, 0)   // 返回 0.0（目标为0时返回0）
 */
export function calculateRate(actual: number, target: number): number {
  // 验证输入参数
  if (!Number.isFinite(actual) || !Number.isFinite(target)) {
    return 0
  }
  
  // 目标为0或负数时，返回0
  if (target <= 0) {
    return 0
  }
  
  // 实际完成量为负数时，返回0
  if (actual < 0) {
    return 0
  }
  
  // 计算完成率，保留一位小数
  const rate = (actual / target) * 100
  return Math.round(rate * 10) / 10
}

/**
 * 根据完成率判断状态
 * 
 * **Feature: manager-page-alignment, Property 7: 完成率状态判断正确性**
 * **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
 * 
 * 状态判断规则：
 * - rate > 110: excellent（超额完成）
 * - 100 <= rate <= 110: standard（达标）
 * - 70 <= rate < 100: below（不达标）
 * - rate < 70: critical（严重不达标）
 * 
 * @param rate - 完成率百分比
 * @param thresholds - 阈值配置（可选，默认使用 DEFAULT_THRESHOLDS）
 * @returns 完成率状态
 * 
 * @example
 * getStatusFromRate(115) // 返回 'excellent'
 * getStatusFromRate(105) // 返回 'standard'
 * getStatusFromRate(85)  // 返回 'below'
 * getStatusFromRate(50)  // 返回 'critical'
 */
export function getStatusFromRate(
  rate: number,
  thresholds: CompletionThresholds = DEFAULT_THRESHOLDS
): CompletionStatus {
  // 验证输入参数
  if (!Number.isFinite(rate)) {
    return 'critical'
  }
  
  // 根据阈值判断状态
  // Requirements 5.2: 超过110%为超额完成
  if (rate > thresholds.excellent) {
    return 'excellent'
  }
  
  // Requirements 5.3: 100%-110%为达标
  if (rate >= thresholds.standard) {
    return 'standard'
  }
  
  // Requirements 5.4: 70%-100%为不达标
  if (rate >= thresholds.below) {
    return 'below'
  }
  
  // Requirements 5.5: 低于70%为严重不达标
  return 'critical'
}

/**
 * 获取状态标签
 * 
 * @param status - 完成率状态
 * @returns 状态的中文标签
 */
export function getStatusLabel(status: CompletionStatus): string {
  return STATUS_LABELS[status] || '未知'
}

/**
 * 获取状态颜色
 * 
 * @param status - 完成率状态
 * @returns 状态的CSS颜色值
 */
export function getStatusColor(status: CompletionStatus): string {
  return STATUS_COLORS[status] || '#999999'
}

// ==================== 综合计算函数 ====================

/**
 * 计算完成率并返回完整结果
 * 包含完成率数值、状态、标签和颜色
 * 
 * **Feature: manager-page-alignment, Property 7: 完成率状态判断正确性**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 * 
 * @param actual - 实际完成量
 * @param target - 目标量
 * @param thresholds - 阈值配置（可选）
 * @returns 完成率计算结果
 * 
 * @example
 * const result = calculateCompletionRate(110, 100)
 * // result = { rate: 110.0, status: 'standard', label: '达标', color: '#1890ff' }
 * 
 * const result2 = calculateCompletionRate(120, 100)
 * // result2 = { rate: 120.0, status: 'excellent', label: '超额完成', color: '#52c41a' }
 */
export function calculateCompletionRate(
  actual: number,
  target: number,
  thresholds: CompletionThresholds = DEFAULT_THRESHOLDS
): CompletionRateResult {
  // 计算完成率
  const rate = calculateRate(actual, target)
  
  // 判断状态
  const status = getStatusFromRate(rate, thresholds)
  
  // 获取标签和颜色
  const label = getStatusLabel(status)
  const color = getStatusColor(status)
  
  return {
    rate,
    status,
    label,
    color,
  }
}

/**
 * 根据完成率数值直接获取完整结果
 * 适用于已知完成率百分比的场景
 * 
 * @param rate - 完成率百分比
 * @param thresholds - 阈值配置（可选）
 * @returns 完成率计算结果
 * 
 * @example
 * const result = getCompletionRateResult(85)
 * // result = { rate: 85, status: 'below', label: '不达标', color: '#fa8c16' }
 */
export function getCompletionRateResult(
  rate: number,
  thresholds: CompletionThresholds = DEFAULT_THRESHOLDS
): CompletionRateResult {
  // 验证并规范化完成率
  const normalizedRate = Number.isFinite(rate) ? Math.round(rate * 10) / 10 : 0
  
  // 判断状态
  const status = getStatusFromRate(normalizedRate, thresholds)
  
  // 获取标签和颜色
  const label = getStatusLabel(status)
  const color = getStatusColor(status)
  
  return {
    rate: normalizedRate,
    status,
    label,
    color,
  }
}

// ==================== 格式化函数 ====================

/**
 * 格式化完成率为显示字符串
 * 
 * @param rate - 完成率百分比
 * @param showPercent - 是否显示百分号（默认true）
 * @returns 格式化后的字符串
 * 
 * @example
 * formatCompletionRate(110.5)       // 返回 '110.5%'
 * formatCompletionRate(110.5, false) // 返回 '110.5'
 */
export function formatCompletionRate(rate: number, showPercent: boolean = true): string {
  if (!Number.isFinite(rate)) {
    return showPercent ? '0%' : '0'
  }
  
  const formatted = rate.toFixed(1)
  return showPercent ? `${formatted}%` : formatted
}

/**
 * 判断完成率是否达标
 * 达标标准：完成率 >= 100%
 * 
 * @param rate - 完成率百分比
 * @param threshold - 达标阈值（默认100）
 * @returns 是否达标
 */
export function isCompletionRatePassing(rate: number, threshold: number = 100): boolean {
  if (!Number.isFinite(rate)) {
    return false
  }
  return rate >= threshold
}

/**
 * 判断完成率是否超额完成
 * 超额标准：完成率 > 110%
 * 
 * @param rate - 完成率百分比
 * @param threshold - 超额阈值（默认110）
 * @returns 是否超额完成
 */
export function isCompletionRateExcellent(rate: number, threshold: number = 110): boolean {
  if (!Number.isFinite(rate)) {
    return false
  }
  return rate > threshold
}
