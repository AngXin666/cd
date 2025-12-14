/**
 * CacheManager 单元测试
 * 测试缓存管理器的核心功能
 *
 * @feature user-list-cache-optimization
 */

import {beforeEach, describe, expect, it} from 'vitest'
import {CACHE_KEYS, cacheManager} from './cacheManager'

describe('CacheManager', () => {
  beforeEach(() => {
    // 每个测试前清除所有缓存
    cacheManager.clear()
  })

  describe('基本读写功能', () => {
    it('应该正确设置和获取缓存', () => {
      const testData = {users: [{id: '1', name: 'Test User'}]}
      const key = CACHE_KEYS.SUPER_ADMIN_USERS

      cacheManager.set(key, testData)
      const result = cacheManager.get(key)

      expect(result).toEqual(testData)
    })

    it('应该在缓存不存在时返回 null', () => {
      const result = cacheManager.get('non_existent_key')
      expect(result).toBeNull()
    })

    it('应该支持不同类型的数据', () => {
      // 测试对象
      const objData = {id: 1, name: 'test'}
      cacheManager.set('test_obj', objData)
      expect(cacheManager.get('test_obj')).toEqual(objData)

      // 测试数组
      const arrData = [1, 2, 3]
      cacheManager.set('test_arr', arrData)
      expect(cacheManager.get('test_arr')).toEqual(arrData)

      // 测试字符串
      const strData = 'test string'
      cacheManager.set('test_str', strData)
      expect(cacheManager.get('test_str')).toEqual(strData)

      // 测试数字
      const numData = 123
      cacheManager.set('test_num', numData)
      expect(cacheManager.get('test_num')).toEqual(numData)
    })
  })

  describe('缓存过期功能', () => {
    it('应该在过期后返回 null', () => {
      const testData = {users: []}
      const key = 'test_expire'

      // 设置立即过期的缓存（TTL = 0）
      cacheManager.set(key, testData, 0)

      // 等待一小段时间确保过期
      setTimeout(() => {
        const result = cacheManager.get(key)
        expect(result).toBeNull()
      }, 10)
    })

    it('应该在未过期时返回数据', () => {
      const testData = {users: []}
      const key = 'test_not_expire'

      // 设置 1 小时后过期
      cacheManager.set(key, testData, 60 * 60 * 1000)

      const result = cacheManager.get(key)
      expect(result).toEqual(testData)
    })
  })

  describe('缓存失效功能', () => {
    it('应该正确清除单个缓存', () => {
      const key = 'test_invalidate'
      cacheManager.set(key, {data: 'test'})

      expect(cacheManager.has(key)).toBe(true)

      cacheManager.invalidate([key])

      expect(cacheManager.has(key)).toBe(false)
    })

    it('应该正确清除多个缓存', () => {
      const keys = ['key1', 'key2', 'key3']
      // 设置多个缓存
      for (const key of keys) {
        cacheManager.set(key, {data: key})
      }

      // 验证缓存已设置
      for (const key of keys) {
        expect(cacheManager.has(key)).toBe(true)
      }

      cacheManager.invalidate(keys)

      // 验证缓存已清除
      for (const key of keys) {
        expect(cacheManager.has(key)).toBe(false)
      }
    })
  })

  describe('缓存清除功能', () => {
    it('应该清除所有缓存', () => {
      // 设置多个缓存
      cacheManager.set('key1', {data: '1'})
      cacheManager.set('key2', {data: '2'})
      cacheManager.set('key3', {data: '3'})

      // 清除所有缓存
      cacheManager.clear()

      // 验证所有缓存都被清除
      expect(cacheManager.has('key1')).toBe(false)
      expect(cacheManager.has('key2')).toBe(false)
      expect(cacheManager.has('key3')).toBe(false)
    })
  })

  describe('has 方法', () => {
    it('应该正确判断缓存是否存在', () => {
      const key = 'test_has'

      expect(cacheManager.has(key)).toBe(false)

      cacheManager.set(key, {data: 'test'})

      expect(cacheManager.has(key)).toBe(true)
    })

    it('应该在缓存过期后返回 false', () => {
      const key = 'test_has_expire'

      cacheManager.set(key, {data: 'test'}, 0)

      setTimeout(() => {
        expect(cacheManager.has(key)).toBe(false)
      }, 10)
    })
  })

  describe('错误处理', () => {
    it('应该处理损坏的缓存数据', () => {
      const key = 'test_corrupted'

      // 模拟写入损坏的数据
      if (process.env.TARO_ENV === 'h5') {
        localStorage.setItem(key, 'invalid json')
      }

      // 应该返回 null 而不是抛出错误
      const result = cacheManager.get(key)
      expect(result).toBeNull()

      // 损坏的缓存应该被自动清除
      expect(cacheManager.has(key)).toBe(false)
    })
  })
})
