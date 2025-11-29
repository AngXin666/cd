/**
 * 数据库 API 工具函数
 * 包含所有模块共享的辅助函数
 */

/**
 * 获取本地日期字符串（YYYY-MM-DD格式）
 * 避免使用toISOString()导致的时区问题
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}
