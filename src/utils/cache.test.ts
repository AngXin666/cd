/**
 * 缓存管理器单元测试
 */

import {describe, test, expect, beforeEach, vi} from 'vitest'
import {CacheManager, createCache, withCache} from './cache'

describe('CacheManager', () => {
  let cache: CacheManager<string>

  beforeEach(() => {
    cache = new CacheManager<string>({
      ttl: 1000, // 1秒
      maxSize: 3,
      strategy: 'LRU'
    })
  })

  describe('基本功能', () => {
    test('应该能设置和获取缓存', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    test('应该在缓存不存在时返回null', () => {
      expect(cache.get('nonexistent')).toBeNull()
    })

    test('应该能删除缓存', () => {
      cache.set('key1', 'value1')
      expect(cache.delete('key1')).toBe(true)
      expect(cache.get('key1')).toBeNull()
    })

    test('应该能清空所有缓存', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      expect(cache.size()).toBe(0)
    })

    test('应该能检查缓存是否存在', () => {
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
    })

    test('应该能获取缓存大小', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(2)
    })

    test('应该能获取所有缓存键', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      const keys = cache.keys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
    })
  })

  describe('TTL过期', () => {
    test('应该在TTL过期后返回null', async () => {
      cache.set('key1', 'value1', 100) // 100ms TTL
      expect(cache.get('key1')).toBe('value1')

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(cache.get('key1')).toBeNull()
    })

    test('应该能使用自定义TTL', async () => {
      cache.set('key1', 'value1', 200) // 200ms TTL
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(cache.get('key1')).toBe('value1')

      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(cache.get('key1')).toBeNull()
    })

    test('应该在检查has时清理过期缓存', async () => {
      cache.set('key1', 'value1', 100)
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(cache.has('key1')).toBe(false)
    })
  })

  describe('LRU淘汰策略', () => {
    test('应该在缓存满时淘汰最久未访问的项', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // 访问key3和key2，使key1成为最久未访问
      cache.get('key3')
      cache.get('key2')

      // 添加第4个项，应该淘汰key1（最久未访问）
      cache.set('key4', 'value4')

      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
      expect(cache.get('key4')).toBe('value4')
    })
  })

  describe('LFU淘汰策略', () => {
    test('应该在缓存满时淘汰访问次数最少的项', () => {
      const lfuCache = new CacheManager<string>({
        ttl: 10000,
        maxSize: 3,
        strategy: 'LFU'
      })

      lfuCache.set('key1', 'value1')
      lfuCache.set('key2', 'value2')
      lfuCache.set('key3', 'value3')

      // 多次访问key1
      lfuCache.get('key1')
      lfuCache.get('key1')
      lfuCache.get('key1')

      // 访问key2一次
      lfuCache.get('key2')

      // 添加第4个项，应该淘汰key3（访问次数最少）
      lfuCache.set('key4', 'value4')

      expect(lfuCache.get('key1')).toBe('value1')
      expect(lfuCache.get('key2')).toBe('value2')
      expect(lfuCache.get('key3')).toBeNull()
      expect(lfuCache.get('key4')).toBe('value4')
    })
  })

  describe('清理功能', () => {
    test('应该能清理过期缓存', async () => {
      cache.set('key1', 'value1', 100)
      cache.set('key2', 'value2', 1000)

      await new Promise((resolve) => setTimeout(resolve, 150))

      const count = cache.cleanup()
      expect(count).toBe(1)
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBe('value2')
    })
  })

  describe('统计信息', () => {
    test('应该能获取缓存统计信息', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      const stats = cache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(3)
      expect(stats.strategy).toBe('LRU')
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })
  })
})

describe('createCache', () => {
  test('应该创建缓存实例', () => {
    const cache = createCache<string>()
    expect(cache).toBeInstanceOf(CacheManager)
  })

  test('应该使用自定义选项', () => {
    const cache = createCache<string>({
      ttl: 2000,
      maxSize: 50,
      strategy: 'LFU'
    })

    const stats = cache.getStats()
    expect(stats.maxSize).toBe(50)
    expect(stats.strategy).toBe('LFU')
  })
})

describe('withCache', () => {
  test('应该缓存函数结果', async () => {
    const cache = createCache<string>()
    const mockFn = vi.fn(async (id: string) => `result-${id}`)

    const cachedFn = withCache(mockFn, cache, (id: string) => `key-${id}`)

    // 第一次调用
    const result1 = await cachedFn('123')
    expect(result1).toBe('result-123')
    expect(mockFn).toHaveBeenCalledTimes(1)

    // 第二次调用，应该从缓存获取
    const result2 = await cachedFn('123')
    expect(result2).toBe('result-123')
    expect(mockFn).toHaveBeenCalledTimes(1) // 没有再次调用

    // 不同参数，应该调用函数
    const result3 = await cachedFn('456')
    expect(result3).toBe('result-456')
    expect(mockFn).toHaveBeenCalledTimes(2)
  })

  test('应该使用自定义TTL', async () => {
    const cache = createCache<string>()
    const mockFn = vi.fn(async (id: string) => `result-${id}`)

    const cachedFn = withCache(mockFn, cache, (id: string) => `key-${id}`, 100)

    await cachedFn('123')
    expect(mockFn).toHaveBeenCalledTimes(1)

    // 等待过期
    await new Promise((resolve) => setTimeout(resolve, 150))

    await cachedFn('123')
    expect(mockFn).toHaveBeenCalledTimes(2) // 缓存过期，再次调用
  })
})
