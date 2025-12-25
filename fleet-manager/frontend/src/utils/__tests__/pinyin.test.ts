/**
 * 拼音搜索工具函数属性测试
 * 使用 fast-check 进行属性测试，验证拼音搜索匹配的正确性
 * 
 * **Feature: vue-deep-conversion, Property 9: 拼音搜索匹配**
 * **Validates: Requirements 3.2**
 * 
 * @module utils/__tests__/pinyin.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { matchWithPinyin, getPinyinFirstLetters, searchWithPinyin } from '../pinyin'

/**
 * 常见中文姓名用字及其拼音首字母映射
 * 用于生成测试数据
 * 注意：这些字符必须在 pinyin.ts 的 PINYIN_MAP 中有定义
 */
const CHINESE_NAME_CHARS: Array<{ char: string; pinyin: string }> = [
  // 常见姓氏（与 PINYIN_MAP 保持一致）
  { char: '张', pinyin: 'Z' },
  { char: '王', pinyin: 'W' },
  { char: '李', pinyin: 'L' },
  { char: '赵', pinyin: 'Z' },
  { char: '刘', pinyin: 'L' },
  { char: '陈', pinyin: 'C' },
  { char: '杨', pinyin: 'Y' },
  { char: '黄', pinyin: 'H' },
  { char: '周', pinyin: 'Z' },
  { char: '吴', pinyin: 'W' },
  { char: '徐', pinyin: 'X' },
  { char: '孙', pinyin: 'S' },
  { char: '马', pinyin: 'M' },
  { char: '朱', pinyin: 'Z' },
  { char: '胡', pinyin: 'H' },
  { char: '郭', pinyin: 'G' },
  { char: '何', pinyin: 'H' },
  { char: '高', pinyin: 'G' },
  { char: '林', pinyin: 'L' },
  { char: '罗', pinyin: 'L' },
  // 常见名字用字（与 PINYIN_MAP 保持一致）
  { char: '三', pinyin: 'S' },
  { char: '四', pinyin: 'S' },
  { char: '五', pinyin: 'W' },
  { char: '明', pinyin: 'M' },
  { char: '华', pinyin: 'H' },
  { char: '强', pinyin: 'Q' },
  { char: '伟', pinyin: 'W' },
  { char: '芳', pinyin: 'F' },
  { char: '娜', pinyin: 'N' },
  { char: '敏', pinyin: 'M' },
  { char: '静', pinyin: 'J' },
  { char: '丽', pinyin: 'L' },
  { char: '军', pinyin: 'J' },
  { char: '勇', pinyin: 'Y' },
  { char: '杰', pinyin: 'J' },
  { char: '涛', pinyin: 'T' },
  { char: '超', pinyin: 'C' },
  { char: '秀', pinyin: 'X' },
  { char: '英', pinyin: 'Y' },
  { char: '兰', pinyin: 'L' },
]

/**
 * 生成中文姓名的 Arbitrary
 * 生成 2-4 个字符的中文姓名
 */
const chineseNameArb = fc.array(
  fc.constantFrom(...CHINESE_NAME_CHARS),
  { minLength: 2, maxLength: 4 }
).map(chars => ({
  name: chars.map(c => c.char).join(''),
  pinyin: chars.map(c => c.pinyin).join('')
}))

/**
 * 生成拼音首字母关键词的 Arbitrary
 * 从已知的拼音首字母中选择 1-4 个字母
 */
const pinyinKeywordArb = fc.array(
  fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z'),
  { minLength: 1, maxLength: 4 }
).map(letters => letters.join(''))

describe('拼音搜索属性测试', () => {
  /**
   * Property 9: 拼音搜索匹配
   * *For any* 中文姓名和拼音首字母，matchWithPinyin 应该正确匹配（如 "张三" 匹配 "zs"）
   * **Validates: Requirements 3.2**
   */
  describe('Property 9: 拼音搜索匹配', () => {
    it('中文姓名应该匹配其完整拼音首字母', () => {
      fc.assert(
        fc.property(chineseNameArb, ({ name, pinyin }) => {
          // 完整拼音首字母应该匹配（不区分大小写）
          const matchLower = matchWithPinyin(name, pinyin.toLowerCase())
          const matchUpper = matchWithPinyin(name, pinyin.toUpperCase())
          
          return matchLower && matchUpper
        }),
        { numRuns: 100 }
      )
    })

    it('中文姓名应该匹配其拼音首字母前缀', () => {
      fc.assert(
        fc.property(chineseNameArb, ({ name, pinyin }) => {
          // 拼音首字母的任意前缀都应该匹配
          for (let i = 1; i <= pinyin.length; i++) {
            const prefix = pinyin.substring(0, i)
            if (!matchWithPinyin(name, prefix.toLowerCase())) {
              return false
            }
          }
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('中文姓名应该匹配其原文子串', () => {
      fc.assert(
        fc.property(chineseNameArb, ({ name }) => {
          // 原文的任意子串都应该匹配
          for (let i = 0; i < name.length; i++) {
            const substring = name.substring(i, i + 1)
            if (!matchWithPinyin(name, substring)) {
              return false
            }
          }
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('空关键词应该匹配所有文本', () => {
      fc.assert(
        fc.property(chineseNameArb, ({ name }) => {
          // 空关键词应该匹配任何文本
          return matchWithPinyin(name, '') && 
                 matchWithPinyin(name, '   ')
        }),
        { numRuns: 100 }
      )
    })

    it('不匹配的拼音首字母不应该返回 true', () => {
      fc.assert(
        fc.property(
          chineseNameArb,
          pinyinKeywordArb,
          ({ name, pinyin }, keyword) => {
            // 如果关键词不是拼音首字母的子串，也不是原文的子串，则不应该匹配
            const pinyinLower = pinyin.toLowerCase()
            const keywordLower = keyword.toLowerCase()
            const nameLower = name.toLowerCase()
            
            // 如果关键词是拼音首字母的子串或原文的子串，则应该匹配
            if (pinyinLower.includes(keywordLower) || nameLower.includes(keywordLower)) {
              return matchWithPinyin(name, keyword)
            }
            
            // 否则不应该匹配
            return !matchWithPinyin(name, keyword)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('getPinyinFirstLetters 属性测试', () => {
    it('返回的拼音首字母长度应该等于输入字符串长度', () => {
      fc.assert(
        fc.property(chineseNameArb, ({ name }) => {
          const result = getPinyinFirstLetters(name)
          return result.length === name.length
        }),
        { numRuns: 100 }
      )
    })

    it('返回的拼音首字母应该全部是大写字母', () => {
      fc.assert(
        fc.property(chineseNameArb, ({ name }) => {
          const result = getPinyinFirstLetters(name)
          // 检查每个字符是否是大写字母
          return result.split('').every(char => /^[A-Z]$/.test(char))
        }),
        { numRuns: 100 }
      )
    })

    it('空字符串应该返回空字符串', () => {
      expect(getPinyinFirstLetters('')).toBe('')
    })

    it('英文字母应该返回大写形式', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 10 }),
          (str) => {
            const result = getPinyinFirstLetters(str)
            return result === str.toUpperCase()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('searchWithPinyin 属性测试', () => {
    it('空关键词应该返回完整列表', () => {
      fc.assert(
        fc.property(
          fc.array(chineseNameArb, { minLength: 0, maxLength: 10 }),
          (items) => {
            const list = items.map(item => ({ name: item.name }))
            const result = searchWithPinyin(list, '', item => item.name)
            return result.length === list.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果应该是原列表的子集', () => {
      fc.assert(
        fc.property(
          fc.array(chineseNameArb, { minLength: 1, maxLength: 10 }),
          pinyinKeywordArb,
          (items, keyword) => {
            const list = items.map(item => ({ name: item.name }))
            const result = searchWithPinyin(list, keyword, item => item.name)
            
            // 结果应该是原列表的子集
            return result.every(item => list.some(original => original.name === item.name))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果中的每个项都应该匹配关键词', () => {
      fc.assert(
        fc.property(
          fc.array(chineseNameArb, { minLength: 1, maxLength: 10 }),
          pinyinKeywordArb,
          (items, keyword) => {
            const list = items.map(item => ({ name: item.name }))
            const result = searchWithPinyin(list, keyword, item => item.name)
            
            // 结果中的每个项都应该匹配关键词
            return result.every(item => matchWithPinyin(item.name, keyword))
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

/**
 * 具体示例测试
 * 验证常见的中文姓名拼音匹配场景
 */
describe('拼音搜索示例测试', () => {
  it('张三应该匹配 zs', () => {
    expect(matchWithPinyin('张三', 'zs')).toBe(true)
  })

  it('张三应该匹配 ZS（大写）', () => {
    expect(matchWithPinyin('张三', 'ZS')).toBe(true)
  })

  it('张三应该匹配 z（前缀）', () => {
    expect(matchWithPinyin('张三', 'z')).toBe(true)
  })

  it('张三应该匹配 张（原文）', () => {
    expect(matchWithPinyin('张三', '张')).toBe(true)
  })

  it('张三不应该匹配 ls', () => {
    expect(matchWithPinyin('张三', 'ls')).toBe(false)
  })

  it('李四应该匹配 ls', () => {
    expect(matchWithPinyin('李四', 'ls')).toBe(true)
  })

  it('王五应该匹配 ww', () => {
    expect(matchWithPinyin('王五', 'ww')).toBe(true)
  })

  it('空文本不应该匹配任何非空关键词', () => {
    expect(matchWithPinyin('', 'zs')).toBe(false)
  })

  it('getPinyinFirstLetters 应该正确转换张三', () => {
    expect(getPinyinFirstLetters('张三')).toBe('ZS')
  })

  it('getPinyinFirstLetters 应该正确转换李四', () => {
    expect(getPinyinFirstLetters('李四')).toBe('LS')
  })

  it('getPinyinFirstLetters 应该正确转换王五', () => {
    expect(getPinyinFirstLetters('王五')).toBe('WW')
  })
})
