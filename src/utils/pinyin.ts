import {pinyin} from 'pinyin-pro'

/**
 * 获取中文字符串的拼音首字母
 * @param text 中文字符串
 * @returns 拼音首字母（小写）
 */
export function getPinyinInitials(text: string): string {
  if (!text) return ''

  try {
    // 获取拼音首字母，返回小写
    const result = pinyin(text, {
      pattern: 'first', // 只获取首字母
      toneType: 'none', // 不带声调
      type: 'array' // 返回数组
    })

    // 将数组转换为字符串并转为小写
    return Array.isArray(result) ? result.join('').toLowerCase() : ''
  } catch (error) {
    console.error('获取拼音首字母失败:', error)
    return ''
  }
}

/**
 * 检查文本是否匹配搜索关键词（支持拼音首字母）
 * @param text 要搜索的文本
 * @param keyword 搜索关键词
 * @returns 是否匹配
 */
export function matchWithPinyin(text: string, keyword: string): boolean {
  if (!text || !keyword) return false

  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase().trim()

  // 1. 直接匹配原文本
  if (lowerText.includes(lowerKeyword)) {
    return true
  }

  // 2. 匹配拼音首字母
  const initials = getPinyinInitials(text)
  if (initials.includes(lowerKeyword)) {
    return true
  }

  // 3. 匹配完整拼音
  try {
    const fullPinyin = pinyin(text, {
      toneType: 'none',
      type: 'string',
      separator: ''
    }).toLowerCase()

    if (fullPinyin.includes(lowerKeyword)) {
      return true
    }
  } catch (error) {
    console.error('匹配拼音失败:', error)
  }

  return false
}
