/**
 * 仓库验证属性测试
 * 使用 fast-check 进行属性测试，验证仓库名称验证的核心功能
 * @module utils/__tests__/warehouseValidation.pbt.test
 *
 * **Feature: boss-missing-pages, Property 1: 仓库名称长度验证**
 * **Validates: Requirements 1.2**
 * 
 * 验证规则：
 * - 仓库名称不能为空
 * - 仓库名称长度不能超过 50 个字符
 * - 仓库名称只能包含中文、英文、数字、空格、括号和横线
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateWarehouseName,
  validateWarehouseAddress,
  validateWarehouseForm,
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
  VALID_NAME_PATTERN
} from '../validation/warehouseValidation'

// ==================== 自定义生成器 ====================

/**
 * 生成有效的仓库名称字符
 * 只包含中文、英文、数字、空格、括号和横线
 */
const validNameCharArbitrary = fc.oneof(
  // 中文字符
  fc.integer({ min: 0x4e00, max: 0x9fa5 }).map(code => String.fromCharCode(code)),
  // 英文字母
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  // 数字
  fc.constantFrom(...'0123456789'.split('')),
  // 空格
  fc.constant(' '),
  // 括号和横线
  fc.constantFrom('-', '(', ')', '（', '）')
)

/**
 * 生成有效的仓库名称（1-50 字符）
 */
const validNameArbitrary = fc.array(validNameCharArbitrary, { minLength: 1, maxLength: MAX_NAME_LENGTH })
  .map(chars => chars.join(''))
  // 确保不是纯空格
  .filter(name => name.trim().length > 0)

/**
 * 生成超长的仓库名称（超过 50 字符）
 */
const tooLongNameArbitrary = fc.array(validNameCharArbitrary, { minLength: MAX_NAME_LENGTH + 1, maxLength: MAX_NAME_LENGTH + 50 })
  .map(chars => chars.join(''))
  // 确保不是纯空格
  .filter(name => name.trim().length > MAX_NAME_LENGTH)

/**
 * 生成空白字符串（空字符串或纯空格）
 */
const emptyOrWhitespaceArbitrary = fc.oneof(
  fc.constant(''),
  fc.stringOf(fc.constant(' '), { minLength: 1, maxLength: 10 })
)

/**
 * 生成包含无效字符的字符串
 */
const invalidCharArbitrary = fc.oneof(
  fc.constant('@'),
  fc.constant('#'),
  fc.constant('$'),
  fc.constant('%'),
  fc.constant('&'),
  fc.constant('*'),
  fc.constant('!'),
  fc.constant('?'),
  fc.constant('<'),
  fc.constant('>'),
  fc.constant('/'),
  fc.constant('\\'),
  fc.constant('|'),
  fc.constant('"'),
  fc.constant("'"),
  fc.constant('`'),
  fc.constant('~'),
  fc.constant('+'),
  fc.constant('='),
  fc.constant('['),
  fc.constant(']'),
  fc.constant('{'),
  fc.constant('}'),
  fc.constant(';'),
  fc.constant(':'),
  fc.constant(','),
  fc.constant('.')
)

/**
 * 生成包含无效字符的仓库名称
 */
const nameWithInvalidCharsArbitrary = fc.tuple(
  fc.array(validNameCharArbitrary, { minLength: 1, maxLength: 10 }),
  invalidCharArbitrary,
  fc.array(validNameCharArbitrary, { minLength: 1, maxLength: 10 })
).map(([prefix, invalid, suffix]) => prefix.join('') + invalid + suffix.join(''))

// ==================== 属性测试 ====================

describe('仓库名称验证属性测试', () => {
  /**
   * **Feature: boss-missing-pages, Property 1: 仓库名称长度验证**
   * **Validates: Requirements 1.2**
   */
  describe('Property 1: 仓库名称长度验证', () => {
    
    it('Property 1.1: 有效名称（1-50字符）应该验证通过', () => {
      /**
       * 属性：对于任意有效的仓库名称（1-50字符，只包含有效字符），
       * validateWarehouseName 应该返回 { valid: true }
       * 
       * **Feature: boss-missing-pages, Property 1: 仓库名称长度验证**
       * **Validates: Requirements 1.2**
       */
      fc.assert(
        fc.property(validNameArbitrary, (name) => {
          const result = validateWarehouseName(name)
          
          // 有效名称应该验证通过
          expect(result.valid).toBe(true)
          expect(result.error).toBeUndefined()
        }),
        { numRuns: 100 }
      )
    })

    it('Property 1.2: 超长名称（>50字符）应该验证失败', () => {
      /**
       * 属性：对于任意超过 50 字符的仓库名称，
       * validateWarehouseName 应该返回 { valid: false, error: '...' }
       * 
       * **Feature: boss-missing-pages, Property 1: 仓库名称长度验证**
       * **Validates: Requirements 1.2**
       */
      fc.assert(
        fc.property(tooLongNameArbitrary, (name) => {
          const result = validateWarehouseName(name)
          
          // 超长名称应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toContain('50')
        }),
        { numRuns: 100 }
      )
    })

    it('Property 1.3: 空名称应该验证失败', () => {
      /**
       * 属性：对于任意空字符串或纯空格字符串，
       * validateWarehouseName 应该返回 { valid: false, error: '请输入仓库名称' }
       * 
       * **Feature: boss-missing-pages, Property 1: 仓库名称长度验证**
       * **Validates: Requirements 1.2**
       */
      fc.assert(
        fc.property(emptyOrWhitespaceArbitrary, (name) => {
          const result = validateWarehouseName(name)
          
          // 空名称应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toBe('请输入仓库名称')
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.4: 包含无效字符的名称应该验证失败', () => {
      /**
       * 属性：对于任意包含无效字符的仓库名称，
       * validateWarehouseName 应该返回 { valid: false, error: '...' }
       * 
       * **Feature: boss-missing-pages, Property 1: 仓库名称长度验证**
       * **Validates: Requirements 1.2**
       */
      fc.assert(
        fc.property(nameWithInvalidCharsArbitrary, (name) => {
          const result = validateWarehouseName(name)
          
          // 包含无效字符的名称应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toContain('只能包含')
        }),
        { numRuns: 100 }
      )
    })

    it('Property 1.5: 名称长度边界值测试', () => {
      /**
       * 属性：验证边界值
       * - 长度为 50 的名称应该通过
       * - 长度为 51 的名称应该失败
       * 
       * **Feature: boss-missing-pages, Property 1: 仓库名称长度验证**
       * **Validates: Requirements 1.2**
       */
      fc.assert(
        fc.property(
          // 生成 1-50 个有效字符
          fc.integer({ min: 1, max: MAX_NAME_LENGTH }),
          (length) => {
            // 生成指定长度的有效名称（使用字母 'a'）
            const validName = 'a'.repeat(length)
            const result = validateWarehouseName(validName)
            
            // 长度在 1-50 范围内应该通过
            expect(result.valid).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
      
      // 测试边界值 51
      const tooLongName = 'a'.repeat(MAX_NAME_LENGTH + 1)
      const result = validateWarehouseName(tooLongName)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('50')
    })

    it('Property 1.6: 首尾空格应该被正确处理', () => {
      /**
       * 属性：对于任意有效名称，添加首尾空格后验证结果应该与原名称一致
       * 
       * **Feature: boss-missing-pages, Property 1: 仓库名称长度验证**
       * **Validates: Requirements 1.2**
       */
      fc.assert(
        fc.property(
          validNameArbitrary,
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 }),
          (name, leadingSpaces, trailingSpaces) => {
            // 添加首尾空格
            const nameWithSpaces = ' '.repeat(leadingSpaces) + name + ' '.repeat(trailingSpaces)
            
            // 验证原名称
            const originalResult = validateWarehouseName(name)
            
            // 验证带空格的名称
            const spacedResult = validateWarehouseName(nameWithSpaces)
            
            // 结果应该一致（因为会 trim）
            expect(spacedResult.valid).toBe(originalResult.valid)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})

describe('仓库地址验证属性测试', () => {
  /**
   * 地址验证的属性测试
   */
  
  it('空地址应该验证通过（地址是可选的）', () => {
    fc.assert(
      fc.property(emptyOrWhitespaceArbitrary, (address) => {
        const result = validateWarehouseAddress(address)
        
        // 空地址应该验证通过
        expect(result.valid).toBe(true)
      }),
      { numRuns: 50 }
    )
  })

  it('超长地址（>200字符）应该验证失败', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { 
          minLength: MAX_ADDRESS_LENGTH + 1, 
          maxLength: MAX_ADDRESS_LENGTH + 50 
        }),
        (address) => {
          const result = validateWarehouseAddress(address)
          
          // 超长地址应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toContain('200')
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('仓库表单验证属性测试', () => {
  /**
   * 表单整体验证的属性测试
   */
  
  it('有效表单数据应该验证通过', () => {
    fc.assert(
      fc.property(validNameArbitrary, (name) => {
        const result = validateWarehouseForm({ name, address: '' })
        
        // 有效表单应该验证通过
        expect(result.isValid).toBe(true)
        expect(result.name.valid).toBe(true)
        expect(result.address.valid).toBe(true)
      }),
      { numRuns: 50 }
    )
  })

  it('无效名称应该导致表单验证失败', () => {
    fc.assert(
      fc.property(emptyOrWhitespaceArbitrary, (name) => {
        const result = validateWarehouseForm({ name, address: '北京市' })
        
        // 无效名称应该导致表单验证失败
        expect(result.isValid).toBe(false)
        expect(result.name.valid).toBe(false)
      }),
      { numRuns: 50 }
    )
  })
})
