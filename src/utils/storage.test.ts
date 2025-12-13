/**
 * 存储工具属性测试
 * Feature: code-quality-fixes, Property 5: 存储操作类型安全
 * Validates: Requirements 2.3, 2.4, 5.4
 */

import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {TypeSafeStorage, getStorage, setStorage, removeStorage, clearStorage} from './storage'

// Mock Taro
vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: vi.fn(),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
    clearStorageSync: vi.fn(),
    getStorageInfoSync: vi.fn(() => ({
      keys: [],
      currentSize: 0,
      limitSize: 10240
    }))
  }
}))

// Mock logger
vi.mock('./logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  })
}))

describe('TypeSafeStorage 属性测试', () => {
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('属性 5: 存储后读取应返回相同值', () => {
    it('应正确存储和读取字符串', () => {
      const key = 'test-string'
      const value = 'hello world'

      TypeSafeStorage.set(key, value)
      const retrieved = TypeSafeStorage.get<string>(key)

      expect(retrieved).toBe(value)
    })

    it('应正确存储和读取数字', () => {
      const key = 'test-number'
      const value = 42

      TypeSafeStorage.set(key, value)
      const retrieved = TypeSafeStorage.get<number>(key)

      expect(retrieved).toBe(value)
    })

    it('应正确存储和读取布尔值', () => {
      const key = 'test-boolean'
      const value = true

      TypeSafeStorage.set(key, value)
      const retrieved = TypeSafeStorage.get<boolean>(key)

      expect(retrieved).toBe(value)
    })

    it('应正确存储和读取对象', () => {
      const key = 'test-object'
      const value = {name: 'test', age: 18, active: true}

      TypeSafeStorage.set(key, value)
      const retrieved = TypeSafeStorage.get<typeof value>(key)

      expect(retrieved).toEqual(value)
    })

    it('应正确存储和读取数组', () => {
      const key = 'test-array'
      const value = [1, 2, 3, 4, 5]

      TypeSafeStorage.set(key, value)
      const retrieved = TypeSafeStorage.get<number[]>(key)

      expect(retrieved).toEqual(value)
    })

    it('应正确存储和读取嵌套对象', () => {
      const key = 'test-nested'
      const value = {
        user: {
          name: 'test',
          profile: {
            age: 18,
            tags: ['tag1', 'tag2']
          }
        }
      }

      TypeSafeStorage.set(key, value)
      const retrieved = TypeSafeStorage.get<typeof value>(key)

      expect(retrieved).toEqual(value)
    })

    it('应正确存储和读取 null', () => {
      const key = 'test-null'
      const value = null

      TypeSafeStorage.set(key, value)
      const retrieved = TypeSafeStorage.get(key)

      expect(retrieved).toBeNull()
    })
  })

  describe('属性: 删除后读取应返回 null 或默认值', () => {
    it('删除后读取应返回 null', () => {
      const key = 'test-remove'
      const value = 'test value'

      TypeSafeStorage.set(key, value)
      TypeSafeStorage.remove(key)
      const retrieved = TypeSafeStorage.get(key)

      expect(retrieved).toBeNull()
    })

    it('删除后读取应返回默认值', () => {
      const key = 'test-remove-default'
      const value = 'test value'
      const defaultValue = 'default'

      TypeSafeStorage.set(key, value)
      TypeSafeStorage.remove(key)
      const retrieved = TypeSafeStorage.get(key, defaultValue)

      expect(retrieved).toBe(defaultValue)
    })

    it('不存在的键应返回默认值', () => {
      const key = 'non-existent'
      const defaultValue = 'default'

      const retrieved = TypeSafeStorage.get(key, defaultValue)

      expect(retrieved).toBe(defaultValue)
    })
  })

  describe('属性: 类型安全性', () => {
    it('应保持类型推断', () => {
      interface User {
        id: string
        name: string
        age: number
      }

      const key = 'test-user'
      const user: User = {id: '1', name: 'Test', age: 18}

      TypeSafeStorage.set<User>(key, user)
      const retrieved = TypeSafeStorage.get<User>(key)

      expect(retrieved).toEqual(user)
      if (retrieved) {
        expect(typeof retrieved.id).toBe('string')
        expect(typeof retrieved.name).toBe('string')
        expect(typeof retrieved.age).toBe('number')
      }
    })
  })

  describe('has() 方法', () => {
    it('存在的键应返回 true', () => {
      const key = 'test-exists'
      TypeSafeStorage.set(key, 'value')

      expect(TypeSafeStorage.has(key)).toBe(true)
    })

    it('不存在的键应返回 false', () => {
      const key = 'test-not-exists'

      expect(TypeSafeStorage.has(key)).toBe(false)
    })

    it('删除后应返回 false', () => {
      const key = 'test-removed'
      TypeSafeStorage.set(key, 'value')
      TypeSafeStorage.remove(key)

      expect(TypeSafeStorage.has(key)).toBe(false)
    })
  })

  describe('keys() 方法', () => {
    it('应返回所有存储键', () => {
      TypeSafeStorage.set('key1', 'value1')
      TypeSafeStorage.set('key2', 'value2')
      TypeSafeStorage.set('key3', 'value3')

      const keys = TypeSafeStorage.keys()

      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })

    it('清空后应返回空数组', () => {
      TypeSafeStorage.set('key1', 'value1')
      TypeSafeStorage.clear()

      const keys = TypeSafeStorage.keys()

      expect(keys).toHaveLength(0)
    })
  })

  describe('批量操作', () => {
    it('应正确批量获取', () => {
      TypeSafeStorage.set('key1', 'value1')
      TypeSafeStorage.set('key2', 'value2')
      TypeSafeStorage.set('key3', 'value3')

      const result = TypeSafeStorage.getMultiple<string>(['key1', 'key2', 'key3'])

      expect(result.key1).toBe('value1')
      expect(result.key2).toBe('value2')
      expect(result.key3).toBe('value3')
    })

    it('应正确批量设置', () => {
      const data = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      }

      const success = TypeSafeStorage.setMultiple(data)

      expect(success).toBe(true)
      expect(TypeSafeStorage.get('key1')).toBe('value1')
      expect(TypeSafeStorage.get('key2')).toBe('value2')
      expect(TypeSafeStorage.get('key3')).toBe('value3')
    })

    it('应正确批量删除', () => {
      TypeSafeStorage.set('key1', 'value1')
      TypeSafeStorage.set('key2', 'value2')
      TypeSafeStorage.set('key3', 'value3')

      const success = TypeSafeStorage.removeMultiple(['key1', 'key2'])

      expect(success).toBe(true)
      expect(TypeSafeStorage.has('key1')).toBe(false)
      expect(TypeSafeStorage.has('key2')).toBe(false)
      expect(TypeSafeStorage.has('key3')).toBe(true)
    })
  })

  describe('便捷函数', () => {
    it('getStorage 应正常工作', () => {
      setStorage('test', 'value')
      expect(getStorage('test')).toBe('value')
    })

    it('setStorage 应正常工作', () => {
      const success = setStorage('test', 'value')
      expect(success).toBe(true)
      expect(getStorage('test')).toBe('value')
    })

    it('removeStorage 应正常工作', () => {
      setStorage('test', 'value')
      const success = removeStorage('test')
      expect(success).toBe(true)
      expect(getStorage('test')).toBeNull()
    })

    it('clearStorage 应正常工作', () => {
      setStorage('test1', 'value1')
      setStorage('test2', 'value2')
      const success = clearStorage()
      expect(success).toBe(true)
      expect(TypeSafeStorage.keys()).toHaveLength(0)
    })
  })

  describe('getInfo() 方法', () => {
    it('应返回存储信息', () => {
      TypeSafeStorage.set('key1', 'value1')
      TypeSafeStorage.set('key2', 'value2')

      const info = TypeSafeStorage.getInfo()

      expect(info).toHaveProperty('keys')
      expect(info).toHaveProperty('currentSize')
      expect(info).toHaveProperty('limitSize')
      expect(info.keys.length).toBeGreaterThan(0)
    })
  })
})
