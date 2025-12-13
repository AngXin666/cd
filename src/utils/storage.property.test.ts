/**
 * TypeSafeStorage 属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import {describe, it, expect, beforeEach} from 'vitest'
import * as fc from 'fast-check'
import {TypeSafeStorage} from './storage'

describe('TypeSafeStorage 属性测试', () => {
  beforeEach(() => {
    // 清空存储
    TypeSafeStorage.clear()
  })

  describe('属性 5: 存储操作类型安全', () => {
    it('属性: 存储后读取应返回相同值（字符串）', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (key, value) => {
          // 跳过空键
          if (!key) return true

          TypeSafeStorage.set(key, value)
          const retrieved = TypeSafeStorage.get<string>(key)
          expect(retrieved).toBe(value)
          return true
        }),
        {numRuns: 100}
      )
    })

    it('属性: 存储后读取应返回相同值（数字）', () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (key, value) => {
          if (!key) return true

          TypeSafeStorage.set(key, value)
          const retrieved = TypeSafeStorage.get<number>(key)
          expect(retrieved).toBe(value)
          return true
        }),
        {numRuns: 100}
      )
    })

    it('属性: 存储后读取应返回相同值（布尔值）', () => {
      fc.assert(
        fc.property(fc.string(), fc.boolean(), (key, value) => {
          if (!key) return true

          TypeSafeStorage.set(key, value)
          const retrieved = TypeSafeStorage.get<boolean>(key)
          expect(retrieved).toBe(value)
          return true
        }),
        {numRuns: 100}
      )
    })

    it('属性: 存储后读取应返回相同值（对象）', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.record({
            name: fc.string(),
            age: fc.integer({min: 0, max: 120}),
            active: fc.boolean()
          }),
          (key, value) => {
            if (!key) return true

            TypeSafeStorage.set(key, value)
            const retrieved = TypeSafeStorage.get<typeof value>(key)
            expect(retrieved).toEqual(value)
            return true
          }
        ),
        {numRuns: 100}
      )
    })

    it('属性: 删除后读取应返回 null', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (key, value) => {
          if (!key) return true

          TypeSafeStorage.set(key, value)
          TypeSafeStorage.remove(key)
          const retrieved = TypeSafeStorage.get(key)
          expect(retrieved).toBeNull()
          return true
        }),
        {numRuns: 100}
      )
    })

    it('属性: 不存在的键应返回默认值', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (key, defaultValue) => {
          if (!key) return true

          // 确保键不存在
          TypeSafeStorage.remove(key)

          const retrieved = TypeSafeStorage.get(key, defaultValue)
          expect(retrieved).toBe(defaultValue)
          return true
        }),
        {numRuns: 100}
      )
    })

    it('属性: has() 应正确反映键的存在性', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (key, value) => {
          // 跳过空键和空值（空字符串在存储中被视为不存在）
          if (!key || value === '') return true

          // 设置前不存在
          TypeSafeStorage.remove(key)
          expect(TypeSafeStorage.has(key)).toBe(false)

          // 设置后存在
          TypeSafeStorage.set(key, value)
          expect(TypeSafeStorage.has(key)).toBe(true)

          // 删除后不存在
          TypeSafeStorage.remove(key)
          expect(TypeSafeStorage.has(key)).toBe(false)

          return true
        }),
        {numRuns: 100}
      )
    })

    it('属性: keys() 应包含所有已设置的键', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.string({minLength: 1}).filter((s) => s.trim().length > 0),
              fc.string({minLength: 1})
            ),
            {minLength: 1, maxLength: 10}
          ),
          (entries) => {
            // 过滤掉可能与localStorage原型冲突的键
            const validEntries = entries.filter(
              ([key]) =>
                key &&
                key.trim().length > 0 &&
                !['valueOf', 'toString', 'constructor', 'hasOwnProperty'].includes(key)
            )
            if (validEntries.length === 0) return true

            TypeSafeStorage.clear()

            // 设置所有键值对
            for (const [key, value] of validEntries) {
              TypeSafeStorage.set(key, value)
            }

            const keys = TypeSafeStorage.keys()
            const expectedKeys = validEntries.map(([key]) => key)

            // 所有设置的键都应该在 keys() 中
            for (const key of expectedKeys) {
              expect(keys).toContain(key)
            }

            return true
          }
        ),
        {numRuns: 50}
      )
    })

    it('属性: 批量操作应保持一致性', () => {
      fc.assert(
        fc.property(
          fc.dictionary(fc.string(), fc.string(), {minKeys: 1, maxKeys: 10}),
          (data) => {
            const validData = Object.fromEntries(
              Object.entries(data).filter(([key]) => key)
            )

            if (Object.keys(validData).length === 0) return true

            TypeSafeStorage.clear()

            // 批量设置
            TypeSafeStorage.setMultiple(validData)

            // 批量获取
            const keys = Object.keys(validData)
            const retrieved = TypeSafeStorage.getMultiple<string>(keys)

            // 验证所有值
            for (const key of keys) {
              expect(retrieved[key]).toBe(validData[key])
            }

            return true
          }
        ),
        {numRuns: 50}
      )
    })

    it('属性: clear() 应删除所有键', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.string({minLength: 1}).filter((s) => s.trim().length > 0),
              fc.string({minLength: 1})
            ),
            {minLength: 1, maxLength: 10}
          ),
          (entries) => {
            // 过滤掉可能与localStorage原型冲突的键
            const validEntries = entries.filter(
              ([key]) =>
                key &&
                key.trim().length > 0 &&
                !['valueOf', 'toString', 'constructor', 'hasOwnProperty'].includes(key)
            )
            if (validEntries.length === 0) return true

            // 设置多个键
            for (const [key, value] of validEntries) {
              TypeSafeStorage.set(key, value)
            }

            // 清空
            TypeSafeStorage.clear()

            // 验证所有键都不存在
            for (const [key] of validEntries) {
              expect(TypeSafeStorage.has(key)).toBe(false)
            }

            return true
          }
        ),
        {numRuns: 50}
      )
    })
  })

  describe('边界情况', () => {
    it('应处理空字符串值', () => {
      TypeSafeStorage.set('test', '')
      expect(TypeSafeStorage.get('test')).toBe('')
    })

    it('应处理 null 值', () => {
      TypeSafeStorage.set('test', null)
      expect(TypeSafeStorage.get('test')).toBeNull()
    })

    it('应处理嵌套对象', () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      }

      TypeSafeStorage.set('nested', nested)
      const retrieved = TypeSafeStorage.get<typeof nested>('nested')
      expect(retrieved).toEqual(nested)
    })

    it('应处理数组', () => {
      const array = [1, 2, 3, 4, 5]
      TypeSafeStorage.set('array', array)
      const retrieved = TypeSafeStorage.get<number[]>('array')
      expect(retrieved).toEqual(array)
    })

    it('应处理特殊字符键', () => {
      const specialKeys = ['key-with-dash', 'key.with.dot', 'key_with_underscore', 'key:with:colon']

      for (const key of specialKeys) {
        TypeSafeStorage.set(key, 'value')
        expect(TypeSafeStorage.get(key)).toBe('value')
      }
    })
  })
})
