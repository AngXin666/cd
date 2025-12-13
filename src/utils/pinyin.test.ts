/**
 * 拼音工具函数 - 单元测试
 */
import {describe, it, expect} from 'vitest'
import {matchWithPinyin, getPinyinInitials} from './pinyin'

describe('pinyin utils', () => {
  describe('matchWithPinyin', () => {
    it('应该匹配完全相同的文本', () => {
      const result = matchWithPinyin('张三', '张三')
      expect(result).toBe(true)
    })

    it('应该匹配部分文本', () => {
      const result = matchWithPinyin('张三丰', '三')
      expect(result).toBe(true)
    })

    it('应该不区分大小写', () => {
      const result = matchWithPinyin('Hello World', 'hello')
      expect(result).toBe(true)
    })

    it('应该处理空文本', () => {
      const result = matchWithPinyin('', '张')
      expect(result).toBe(false)
    })

    it('应该处理空关键词', () => {
      const result = matchWithPinyin('张三', '')
      expect(result).toBe(false)
    })

    it('应该处理不匹配的情况', () => {
      const result = matchWithPinyin('张三', '李四')
      expect(result).toBe(false)
    })

    it('应该去除关键词的空格', () => {
      const result = matchWithPinyin('张三', ' 张 ')
      expect(result).toBe(true)
    })

    it('应该匹配英文字符', () => {
      const result = matchWithPinyin('test@example.com', 'example')
      expect(result).toBe(true)
    })

    it('应该匹配数字', () => {
      const result = matchWithPinyin('13800138000', '138')
      expect(result).toBe(true)
    })
  })

  describe('getPinyinInitials', () => {
    it('应该返回空字符串（简化实现）', () => {
      const result = getPinyinInitials('张三')
      expect(result).toBe('')
    })

    it('应该处理空字符串', () => {
      const result = getPinyinInitials('')
      expect(result).toBe('')
    })
  })
})
