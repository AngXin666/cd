/**
 * 图片本地缓存工具
 * 使用 IndexedDB 存储图片的 base64 数据，实现真正的本地缓存
 * 适用于不会改变的图片（如车辆照片、证件照片等）
 *
 * @module utils/imageCache
 */

import {createLogger} from './logger'

const logger = createLogger('ImageCache')

/** 数据库名称 */
const DB_NAME = 'ImageCacheDB'
/** 数据库版本 */
const DB_VERSION = 1
/** 存储对象名称 */
const STORE_NAME = 'images'
/** 默认缓存过期时间：30天（毫秒） */
const DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000

/** 缓存条目接口 */
interface CacheEntry {
  /** 图片URL（作为key） */
  url: string
  /** 图片base64数据 */
  data: string
  /** 缓存时间戳 */
  timestamp: number
  /** 过期时间戳 */
  expiry: number
}

/** 数据库实例 */
let db: IDBDatabase | null = null

/**
 * 初始化 IndexedDB 数据库
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      logger.error('打开数据库失败', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      logger.debug('数据库已打开')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      // 创建存储对象，使用 url 作为主键
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {keyPath: 'url'})
        // 创建过期时间索引，用于清理过期缓存
        store.createIndex('expiry', 'expiry', {unique: false})
        logger.info('数据库存储对象已创建')
      }
    }
  })
}

/**
 * 从网络获取图片并转换为 base64
 * @param url - 图片URL
 * @returns base64 数据
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 从缓存获取图片
 * @param url - 图片URL
 * @returns base64 数据，如果不存在或已过期则返回 null
 */
export async function getCachedImage(url: string): Promise<string | null> {
  try {
    const database = await initDB()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve) => {
      const request = store.get(url)

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined
        if (!entry) {
          resolve(null)
          return
        }

        // 检查是否过期
        if (Date.now() > entry.expiry) {
          // 异步删除过期缓存
          deleteCachedImage(url).catch(() => {})
          resolve(null)
          return
        }

        logger.debug('图片缓存命中', {url: url.substring(0, 50)})
        resolve(entry.data)
      }

      request.onerror = () => {
        logger.error('获取缓存失败', request.error)
        resolve(null)
      }
    })
  } catch (error) {
    logger.error('获取缓存异常', error)
    return null
  }
}

/**
 * 缓存图片到本地
 * @param url - 图片URL
 * @param data - base64 数据
 * @param ttl - 缓存过期时间（毫秒），默认30天
 */
export async function setCachedImage(url: string, data: string, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    const database = await initDB()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const now = Date.now()
    const entry: CacheEntry = {
      url,
      data,
      timestamp: now,
      expiry: now + ttl
    }

    return new Promise((resolve, reject) => {
      const request = store.put(entry)

      request.onsuccess = () => {
        logger.debug('图片已缓存', {url: url.substring(0, 50)})
        resolve()
      }

      request.onerror = () => {
        logger.error('缓存图片失败', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    logger.error('缓存图片异常', error)
  }
}

/**
 * 删除缓存的图片
 * @param url - 图片URL
 */
export async function deleteCachedImage(url: string): Promise<void> {
  try {
    const database = await initDB()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve) => {
      const request = store.delete(url)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    })
  } catch (error) {
    logger.error('删除缓存异常', error)
  }
}

/**
 * 获取图片（优先从缓存，否则从网络获取并缓存）
 * @param url - 图片URL
 * @param ttl - 缓存过期时间（毫秒），默认30天
 * @returns base64 数据或原始URL（如果缓存失败）
 */
export async function getImageWithCache(url: string, ttl: number = DEFAULT_TTL): Promise<string> {
  if (!url) return url

  try {
    // 1. 尝试从缓存获取
    const cached = await getCachedImage(url)
    if (cached) {
      return cached
    }

    // 2. 从网络获取并缓存
    const base64 = await fetchImageAsBase64(url)
    // 异步缓存，不阻塞返回
    setCachedImage(url, base64, ttl).catch(() => {})

    return base64
  } catch (error) {
    logger.error('获取图片失败，返回原始URL', {url: url.substring(0, 50), error})
    // 如果获取失败，返回原始URL
    return url
  }
}

/**
 * 清理过期的缓存
 * @returns 清理的条目数量
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const database = await initDB()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('expiry')

    const now = Date.now()
    let count = 0

    return new Promise((resolve) => {
      // 使用游标遍历过期的条目
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          count++
          cursor.continue()
        } else {
          if (count > 0) {
            logger.info('清理过期图片缓存', {count})
          }
          resolve(count)
        }
      }

      request.onerror = () => {
        resolve(count)
      }
    })
  } catch (error) {
    logger.error('清理缓存异常', error)
    return 0
  }
}

/**
 * 清空所有图片缓存
 */
export async function clearAllImageCache(): Promise<void> {
  try {
    const database = await initDB()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve) => {
      const request = store.clear()
      request.onsuccess = () => {
        logger.info('所有图片缓存已清空')
        resolve()
      }
      request.onerror = () => resolve()
    })
  } catch (error) {
    logger.error('清空缓存异常', error)
  }
}

/**
 * 获取缓存统计信息
 */
export async function getImageCacheStats(): Promise<{count: number; size: number}> {
  try {
    const database = await initDB()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve) => {
      const countRequest = store.count()
      let count = 0
      let size = 0

      countRequest.onsuccess = () => {
        count = countRequest.result

        // 计算总大小
        const cursorRequest = store.openCursor()
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor) {
            const entry = cursor.value as CacheEntry
            size += entry.data.length
            cursor.continue()
          } else {
            resolve({count, size})
          }
        }
        cursorRequest.onerror = () => resolve({count, size})
      }

      countRequest.onerror = () => resolve({count: 0, size: 0})
    })
  } catch (error) {
    logger.error('获取缓存统计异常', error)
    return {count: 0, size: 0}
  }
}
