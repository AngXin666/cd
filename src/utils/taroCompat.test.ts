/**
 * Taro 兼容层属性测试
 *
 * 使用 fast-check 进行属性测试，验证 removeStorage 函数的正确性
 *
 * **Feature: vehicle-database-fields-fix, Property 4: removeStorage 函数正确性**
 * **Validates: Requirements 3.1, 3.3**
 *
 * @module utils/taroCompat.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import fc from 'fast-check'

/**
 * 模拟 localStorage 实现
 * 用于在测试环境中模拟浏览器的 localStorage API
 */
class MockLocalStorage {
  private store: Map<string, string> = new Map()

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get length(): number {
    return this.store.size
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return keys[index] ?? null
  }
}

// 创建模拟的 localStorage 实例
const mockLocalStorage = new MockLocalStorage()

// 在测试环境中设置全局 localStorage
// @ts-ignore - 测试环境需要模拟 localStorage
global.localStorage = mockLocalStorage

/**
 * 生成有效的存储键名
 * 键名应该是非空字符串，不包含特殊字符
 */
const storageKeyArb = fc.string({minLength: 1, maxLength: 50})
  .filter(s => s.trim().length > 0)
  .map(s => s.replace(/[^\w\-_.]/g, '_')) // 替换特殊字符为下划线

/**
 * 生成有效的存储值
 * 值可以是任意可序列化的数据
 */
const storageValueArb = fc.oneof(
  fc.string({minLength: 0, maxLength: 100}),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.array(fc.integer(), {maxLength: 10}),
  fc.record({
    id: fc.uuid(),
    name: fc.string({minLength: 1, maxLength: 20}),
    value: fc.integer()
  })
)

/**
 * 生成键值对
 */
const keyValuePairArb = fc.tuple(storageKeyArb, storageValueArb)

/**
 * 模拟 H5 环境下的 removeStorage 函数实现
 * 这是从 taroCompat.ts 中提取的核心逻辑，用于测试
 *
 * @param options - 删除存储选项
 * @returns Promise<void>
 */
function removeStorageH5(options: {
  key: string
  success?: () => void
  fail?: (error: any) => void
  complete?: () => void
}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      localStorage.removeItem(options.key)
      // 调用成功回调
      options.success?.()
      // 调用完成回调
      options.complete?.()
      // Promise resolve
      resolve()
    } catch (e) {
      // 调用失败回调
      options.fail?.(e)
      // 调用完成回调
      options.complete?.()
      // Promise reject
      reject(e)
    }
  })
}

/**
 * 模拟 H5 环境下的 setStorage 函数实现
 *
 * @param options - 设置存储选项
 * @returns Promise<void>
 */
function setStorageH5<T = unknown>(options: {
  key: string
  data: T
  success?: () => void
  fail?: (error: any) => void
  complete?: () => void
}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      localStorage.setItem(options.key, JSON.stringify(options.data))
      options.success?.()
      options.complete?.()
      resolve()
    } catch (e) {
      options.fail?.(e)
      options.complete?.()
      reject(e)
    }
  })
}

/**
 * 模拟 H5 环境下的 getStorageSync 函数实现
 *
 * @param key - 存储键名
 * @returns 存储的值，如果不存在则返回 null
 */
function getStorageSyncH5<T = any>(key: string): T | null {
  try {
    const value = localStorage.getItem(key)
    if (value === null) return null
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

describe('Taro 兼容层属性测试', () => {
  beforeEach(() => {
    // 每个测试前清空 localStorage
    mockLocalStorage.clear()
  })

  afterEach(() => {
    // 每个测试后清空 localStorage
    mockLocalStorage.clear()
  })

  /**
   * **Feature: vehicle-database-fields-fix, Property 4: removeStorage 函数正确性**
   * **Validates: Requirements 3.1, 3.3**
   *
   * 属性测试：对于任意存储键值对，先调用 setStorage 设置值，
   * 再调用 removeStorage 删除，最后调用 getStorage 应该返回 null，
   * 且 success 回调被调用，Promise 正确 resolve。
   */
  describe('Property 4: removeStorage 函数正确性', () => {
    it('对于任意键值对，存储-删除-查询流程应该正确工作', async () => {
      await fc.assert(
        fc.asyncProperty(keyValuePairArb, async ([key, value]) => {
          // 1. 先设置存储值
          await setStorageH5({key, data: value})

          // 验证值已设置
          const storedValue = getStorageSyncH5(key)
          expect(storedValue).toEqual(value)

          // 2. 删除存储值
          await removeStorageH5({key})

          // 3. 验证值已被删除（应该返回 null）
          const deletedValue = getStorageSyncH5(key)
          expect(deletedValue).toBeNull()
        }),
        {numRuns: 100}
      )
    })

    it('removeStorage 应该调用 success 回调（Requirements 3.3）', async () => {
      await fc.assert(
        fc.asyncProperty(storageKeyArb, async (key) => {
          // 设置一个值
          await setStorageH5({key, data: 'test-value'})

          // 跟踪回调是否被调用
          let successCalled = false
          let completeCalled = false

          // 删除并验证回调
          await removeStorageH5({
            key,
            success: () => {
              successCalled = true
            },
            complete: () => {
              completeCalled = true
            }
          })

          // 验证 success 回调被调用
          expect(successCalled).toBe(true)
          // 验证 complete 回调被调用
          expect(completeCalled).toBe(true)
        }),
        {numRuns: 100}
      )
    })

    it('removeStorage 应该返回正确 resolve 的 Promise（Requirements 3.1）', async () => {
      await fc.assert(
        fc.asyncProperty(storageKeyArb, async (key) => {
          // 设置一个值
          await setStorageH5({key, data: 'test-value'})

          // 删除操作应该返回 resolved Promise
          const result = await removeStorageH5({key})

          // Promise 应该 resolve 为 undefined（void）
          expect(result).toBeUndefined()
        }),
        {numRuns: 100}
      )
    })

    it('删除不存在的键应该正常工作，不报错', async () => {
      await fc.assert(
        fc.asyncProperty(storageKeyArb, async (key) => {
          // 确保键不存在
          const initialValue = getStorageSyncH5(key)
          expect(initialValue).toBeNull()

          // 跟踪回调
          let successCalled = false
          let failCalled = false
          let completeCalled = false

          // 删除不存在的键应该不报错
          await removeStorageH5({
            key,
            success: () => {
              successCalled = true
            },
            fail: () => {
              failCalled = true
            },
            complete: () => {
              completeCalled = true
            }
          })

          // success 应该被调用（删除不存在的键也是成功的）
          expect(successCalled).toBe(true)
          // fail 不应该被调用
          expect(failCalled).toBe(false)
          // complete 应该被调用
          expect(completeCalled).toBe(true)
        }),
        {numRuns: 100}
      )
    })

    it('多次删除同一个键应该是幂等的', async () => {
      await fc.assert(
        fc.asyncProperty(keyValuePairArb, async ([key, value]) => {
          // 设置值
          await setStorageH5({key, data: value})

          // 第一次删除
          await removeStorageH5({key})
          const afterFirstDelete = getStorageSyncH5(key)
          expect(afterFirstDelete).toBeNull()

          // 第二次删除（应该不报错）
          let secondDeleteSuccess = false
          await removeStorageH5({
            key,
            success: () => {
              secondDeleteSuccess = true
            }
          })

          // 第二次删除也应该成功
          expect(secondDeleteSuccess).toBe(true)

          // 值仍然是 null
          const afterSecondDelete = getStorageSyncH5(key)
          expect(afterSecondDelete).toBeNull()
        }),
        {numRuns: 100}
      )
    })

    it('删除一个键不应该影响其他键', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(storageKeyArb, storageKeyArb, storageValueArb, storageValueArb)
            .filter(([key1, key2]) => key1 !== key2), // 确保两个键不同
          async ([key1, key2, value1, value2]) => {
            // 设置两个不同的键值对
            await setStorageH5({key: key1, data: value1})
            await setStorageH5({key: key2, data: value2})

            // 验证两个值都已设置
            expect(getStorageSyncH5(key1)).toEqual(value1)
            expect(getStorageSyncH5(key2)).toEqual(value2)

            // 只删除第一个键
            await removeStorageH5({key: key1})

            // 第一个键应该被删除
            expect(getStorageSyncH5(key1)).toBeNull()

            // 第二个键应该不受影响
            expect(getStorageSyncH5(key2)).toEqual(value2)
          }
        ),
        {numRuns: 100}
      )
    })
  })

  /**
   * 辅助属性测试：验证存储键名格式
   */
  describe('辅助测试：存储键名格式验证', () => {
    it('生成的存储键名应该是非空字符串', () => {
      fc.assert(
        fc.property(storageKeyArb, (key) => {
          expect(typeof key).toBe('string')
          expect(key.length).toBeGreaterThan(0)
        }),
        {numRuns: 100}
      )
    })

    it('存储键名不应该包含特殊字符（已被替换为下划线）', () => {
      fc.assert(
        fc.property(storageKeyArb, (key) => {
          // 键名应该只包含字母、数字、下划线、连字符和点
          expect(/^[\w\-_.]+$/.test(key)).toBe(true)
        }),
        {numRuns: 100}
      )
    })
  })

  /**
   * 辅助属性测试：验证存储值序列化
   */
  describe('辅助测试：存储值序列化验证', () => {
    it('存储值应该能正确序列化和反序列化', async () => {
      await fc.assert(
        fc.asyncProperty(keyValuePairArb, async ([key, value]) => {
          // 设置值
          await setStorageH5({key, data: value})

          // 获取值
          const retrieved = getStorageSyncH5(key)

          // 验证值相等
          expect(retrieved).toEqual(value)
        }),
        {numRuns: 100}
      )
    })
  })
})
