/**
 * 简化的拼音匹配工具（不依赖外部库）
 */

/**
 * 检查文本是否匹配搜索关键词
 * @param text 要搜索的文本
 * @param keyword 搜索关键词
 * @returns 是否匹配
 */
export function matchWithPinyin(text: string, keyword: string): boolean {
  if (!text || !keyword) return false

  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase().trim()

  // 直接匹配原文本
  return lowerText.includes(lowerKeyword)
}

/**
 * 获取中文字符串的拼音首字母（简化版本）
 * @param text 中文字符串
 * @returns 拼音首字母（小写）
 */
export function getPinyinInitials(text: string): string {
  if (!text) return ''
  // 简化实现：仅返回空字符串
  // 如果需要完整的拼音功能，需要在服务端实现
  return ''
}
