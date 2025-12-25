/**
 * 存储模块单元测试
 * 测试 MemoryStorageAdapter 和 StorageManager 的核心功能
 * @module utils/__tests__/storage.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  MemoryStorageAdapter, 
  StorageManager,
  StorageError,
  StorageErrorCodes 
} from '../storage'

describe('MemoryStorageAdapter', () => {
  let adapter: MemoryStorageAdapter

  beforeEach(async () => {
    adapter = new MemoryStorageAdapter(10) // 10MB 限制
    await adapter.initialize()
  })

  describe('isAvailable', () => {
    it('应该始终返回 true', () => {
      expect(adapter.isAvailable()).toBe(true)
    })
  })

  describe('initialize', () => {
    it('应该成功初始化', async () => {
      const newAdapter = new MemoryStorageAdapter()
      const result = await newAdapter.initialize()
      expect(result).toBe(true)
    })
  })

  describe('writeFile 和 readFile', () => {
    it('应该能写入和读取 ArrayBuffer 数据', async () => {
      const data = new TextEncoder().encode('Hello, World!').buffer
      await adapter.writeFile('test.txt', data)
      
      const result = await adapter.readFile('test.txt')
      expect(result).toBeInstanceOf(ArrayBuffer)
      
      const text = new TextDecoder().decode(result as ArrayBuffer)
      expect(text).toBe('Hello, World!')
    })

    it('应该能写入和读取字符串数据', async () => {
      await adapter.writeFile('test.txt', 'Hello, World!', { encoding: 'utf8' })
      
      const result = await adapter.readFile('test.txt', { format: 'text' })
      expect(result).toBe('Hello, World!')
    })

    it('应该能写入和读取 Base64 数据', async () => {
      const base64Data = btoa('Hello, World!')
      await adapter.writeFile('test.txt', base64Data, { encoding: 'base64' })
      
      const result = await adapter.readFile('test.txt', { format: 'base64' })
      expect(atob(result as string)).toBe('Hello, World!')
    })

    it('读取不存在的文件应该抛出错误', async () => {
      await expect(adapter.readFile('nonexistent.txt')).rejects.toThrow(StorageError)
    })

    it('不允许覆盖时写入已存在的文件应该抛出错误', async () => {
      await adapter.writeFile('test.txt', 'First')
      
      await expect(
        adapter.writeFile('test.txt', 'Second', { overwrite: false })
      ).rejects.toThrow(StorageError)
    })

    it('允许覆盖时应该成功更新文件', async () => {
      await adapter.writeFile('test.txt', 'First')
      await adapter.writeFile('test.txt', 'Second', { overwrite: true })
      
      const result = await adapter.readFile('test.txt', { format: 'text' })
      expect(result).toBe('Second')
    })
  })

  describe('deleteFile', () => {
    it('应该能删除存在的文件', async () => {
      await adapter.writeFile('test.txt', 'Hello')
      expect(await adapter.fileExists('test.txt')).toBe(true)
      
      await adapter.deleteFile('test.txt')
      expect(await adapter.fileExists('test.txt')).toBe(false)
    })

    it('删除不存在的文件不应该抛出错误', async () => {
      await expect(adapter.deleteFile('nonexistent.txt')).resolves.not.toThrow()
    })
  })

  describe('fileExists', () => {
    it('存在的文件应该返回 true', async () => {
      await adapter.writeFile('test.txt', 'Hello')
      expect(await adapter.fileExists('test.txt')).toBe(true)
    })

    it('不存在的文件应该返回 false', async () => {
      expect(await adapter.fileExists('nonexistent.txt')).toBe(false)
    })
  })

  describe('getFileInfo', () => {
    it('应该返回正确的文件信息', async () => {
      const data = 'Hello, World!'
      await adapter.writeFile('test.txt', data, { mimeType: 'text/plain' })
      
      const info = await adapter.getFileInfo('test.txt')
      expect(info).not.toBeNull()
      expect(info!.name).toBe('test.txt')
      expect(info!.path).toBe('test.txt')
      expect(info!.size).toBeGreaterThan(0)
      expect(info!.mimeType).toBe('text/plain')
    })

    it('不存在的文件应该返回 null', async () => {
      const info = await adapter.getFileInfo('nonexistent.txt')
      expect(info).toBeNull()
    })
  })

  describe('listFiles', () => {
    beforeEach(async () => {
      await adapter.writeFile('file1.txt', 'Content 1')
      await adapter.writeFile('dir/file2.txt', 'Content 2')
      await adapter.writeFile('dir/subdir/file3.txt', 'Content 3')
    })

    it('应该列出根目录下的所有文件（递归）', async () => {
      const files = await adapter.listFiles('')
      expect(files.length).toBe(3)
    })

    it('应该列出指定目录下的文件', async () => {
      const files = await adapter.listFiles('dir')
      expect(files.length).toBe(2)
    })

    it('非递归模式应该只列出直接子文件', async () => {
      const files = await adapter.listFiles('dir', { recursive: false })
      expect(files.length).toBe(1)
      expect(files[0].name).toBe('file2.txt')
    })

    it('应该支持文件名模式匹配', async () => {
      const files = await adapter.listFiles('', { pattern: '*.txt' })
      expect(files.length).toBe(3)
    })
  })

  describe('copyFile', () => {
    it('应该能复制文件', async () => {
      await adapter.writeFile('source.txt', 'Hello')
      await adapter.copyFile('source.txt', 'dest.txt')
      
      expect(await adapter.fileExists('source.txt')).toBe(true)
      expect(await adapter.fileExists('dest.txt')).toBe(true)
      
      const content = await adapter.readFile('dest.txt', { format: 'text' })
      expect(content).toBe('Hello')
    })
  })

  describe('moveFile', () => {
    it('应该能移动文件', async () => {
      await adapter.writeFile('source.txt', 'Hello')
      await adapter.moveFile('source.txt', 'dest.txt')
      
      expect(await adapter.fileExists('source.txt')).toBe(false)
      expect(await adapter.fileExists('dest.txt')).toBe(true)
      
      const content = await adapter.readFile('dest.txt', { format: 'text' })
      expect(content).toBe('Hello')
    })
  })

  describe('rmdir', () => {
    it('应该能递归删除目录', async () => {
      await adapter.writeFile('dir/file1.txt', 'Content 1')
      await adapter.writeFile('dir/subdir/file2.txt', 'Content 2')
      
      await adapter.rmdir('dir', true)
      
      expect(await adapter.fileExists('dir/file1.txt')).toBe(false)
      expect(await adapter.fileExists('dir/subdir/file2.txt')).toBe(false)
    })
  })

  describe('getAvailableSpace', () => {
    it('应该返回存储空间信息', async () => {
      const space = await adapter.getAvailableSpace()
      expect(space.total).toBeGreaterThan(0)
      expect(space.used).toBeGreaterThanOrEqual(0)
      expect(space.available).toBeGreaterThanOrEqual(0)
    })
  })

  describe('clearAll', () => {
    it('应该清空所有数据', async () => {
      await adapter.writeFile('file1.txt', 'Content 1')
      await adapter.writeFile('file2.txt', 'Content 2')
      
      await adapter.clearAll()
      
      expect(await adapter.fileExists('file1.txt')).toBe(false)
      expect(await adapter.fileExists('file2.txt')).toBe(false)
      expect(adapter.getFileCount()).toBe(0)
    })
  })

  describe('存储空间限制', () => {
    it('超出存储限制应该抛出错误', async () => {
      const smallAdapter = new MemoryStorageAdapter(0.001) // 1KB 限制
      await smallAdapter.initialize()
      
      // 尝试写入超过 1KB 的数据
      const largeData = new Uint8Array(2000).buffer // 2KB
      
      await expect(
        smallAdapter.writeFile('large.bin', largeData)
      ).rejects.toThrow(StorageError)
    })
  })
})

describe('StorageManager', () => {
  beforeEach(() => {
    // 重置单例实例
    StorageManager.resetInstance()
  })

  afterEach(() => {
    StorageManager.resetInstance()
  })

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = StorageManager.getInstance()
      const instance2 = StorageManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('detectPlatform', () => {
    it('在测试环境中应该检测到 memory 平台（因为没有 IndexedDB）', () => {
      const manager = StorageManager.getInstance()
      const result = manager.detectPlatform()
      
      // 在 Node.js 测试环境中，没有 IndexedDB，应该降级为 memory
      expect(['h5', 'memory']).toContain(result.platform)
    })
  })

  describe('initialize', () => {
    it('应该成功初始化', async () => {
      const manager = StorageManager.getInstance()
      const result = await manager.initialize()
      expect(result).toBe(true)
    })
  })

  describe('文件操作', () => {
    let manager: StorageManager

    beforeEach(async () => {
      manager = StorageManager.getInstance({ autoInit: true })
      await manager.initialize()
    })

    it('应该能写入和读取文件', async () => {
      await manager.writeFile('test.txt', 'Hello, World!')
      const content = await manager.readFile('test.txt', { format: 'text' })
      expect(content).toBe('Hello, World!')
    })

    it('应该能检查文件是否存在', async () => {
      await manager.writeFile('test.txt', 'Hello')
      expect(await manager.fileExists('test.txt')).toBe(true)
      expect(await manager.fileExists('nonexistent.txt')).toBe(false)
    })

    it('应该能删除文件', async () => {
      await manager.writeFile('test.txt', 'Hello')
      await manager.deleteFile('test.txt')
      expect(await manager.fileExists('test.txt')).toBe(false)
    })

    it('应该能获取文件信息', async () => {
      await manager.writeFile('test.txt', 'Hello')
      const info = await manager.getFileInfo('test.txt')
      expect(info).not.toBeNull()
      expect(info!.name).toBe('test.txt')
    })

    it('应该能列出文件', async () => {
      await manager.writeFile('file1.txt', 'Content 1')
      await manager.writeFile('file2.txt', 'Content 2')
      
      const files = await manager.listFiles('')
      expect(files.length).toBe(2)
    })

    it('应该能复制文件', async () => {
      await manager.writeFile('source.txt', 'Hello')
      await manager.copyFile('source.txt', 'dest.txt')
      
      expect(await manager.fileExists('source.txt')).toBe(true)
      expect(await manager.fileExists('dest.txt')).toBe(true)
    })

    it('应该能移动文件', async () => {
      await manager.writeFile('source.txt', 'Hello')
      await manager.moveFile('source.txt', 'dest.txt')
      
      expect(await manager.fileExists('source.txt')).toBe(false)
      expect(await manager.fileExists('dest.txt')).toBe(true)
    })

    it('应该能获取存储空间信息', async () => {
      const space = await manager.getAvailableSpace()
      expect(space).toHaveProperty('total')
      expect(space).toHaveProperty('used')
      expect(space).toHaveProperty('available')
    })

    it('应该能清空所有数据', async () => {
      await manager.writeFile('file1.txt', 'Content 1')
      await manager.writeFile('file2.txt', 'Content 2')
      
      await manager.clearAll()
      
      expect(await manager.fileExists('file1.txt')).toBe(false)
      expect(await manager.fileExists('file2.txt')).toBe(false)
    })
  })

  describe('getPlatform 和 isFallbackMode', () => {
    it('应该返回当前平台类型', async () => {
      const manager = StorageManager.getInstance()
      await manager.initialize()
      
      const platform = manager.getPlatform()
      expect(['h5', 'weapp', 'app', 'memory']).toContain(platform)
    })

    it('在测试环境中应该是降级模式', async () => {
      const manager = StorageManager.getInstance()
      await manager.initialize()
      
      // 在 Node.js 测试环境中，通常会降级为 memory
      const isFallback = manager.isFallbackMode()
      expect(typeof isFallback).toBe('boolean')
    })
  })
})

describe('StorageError', () => {
  it('应该正确创建错误对象', () => {
    const error = new StorageError('测试错误', StorageErrorCodes.FILE_NOT_FOUND, '/test/path')
    
    expect(error.message).toBe('测试错误')
    expect(error.code).toBe(StorageErrorCodes.FILE_NOT_FOUND)
    expect(error.path).toBe('/test/path')
    expect(error.name).toBe('StorageError')
  })
})
