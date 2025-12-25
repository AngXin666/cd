/**
 * 草稿图片存储属性测试
 * 使用 fast-check 进行属性测试，验证草稿图片存储的核心功能
 * @module utils/__tests__/draftStorage.pbt.test
 *
 * Property 10: 草稿图片持久化
 * - 保存到草稿的图片，重新读取后应该能正常显示
 * - 验证 Requirements 10.1, 10.2, 10.3, 10.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { DraftImageStorage } from '../draftStorage/DraftImageStorage'
import { StorageManager } from '../storage/StorageManager'
import type { DraftImageInfo, ImageType, SaveImageOptions } from '../draftStorage/types'

/**
 * 测试用的图片类型数组
 */
const IMAGE_TYPES: ImageType[] = ['license', 'vehicle', 'driver', 'damage']

/**
 * 生成随机图片数据（模拟 JPEG 图片）
 * @param size - 数据大小（字节）
 * @returns ArrayBuffer
 */
function generateImageData(size: number): ArrayBuffer {
  // 创建一个简单的模拟图片数据
  const buffer = new ArrayBuffer(size)
  const view = new Uint8Array(buffer)

  // 添加 JPEG 文件头标识（FFD8FF）
  if (size >= 3) {
    view[0] = 0xff
    view[1] = 0xd8
    view[2] = 0xff
  }

  // 填充随机数据
  for (let i = 3; i < size; i++) {
    view[i] = Math.floor(Math.random() * 256)
  }

  return buffer
}

/**
 * 生成随机草稿 ID
 * @returns 草稿 ID
 */
function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * 将 ArrayBuffer 转换为 Base64
 * @param buffer - ArrayBuffer
 * @returns Base64 字符串
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * 从 Base64 data URL 提取数据并转换为 ArrayBuffer
 * @param dataUrl - Base64 data URL
 * @returns ArrayBuffer
 */
function base64ToArrayBuffer(dataUrl: string): ArrayBuffer {
  // 移除 data URL 前缀
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

describe('DraftImageStorage 属性测试', () => {
  let storage: DraftImageStorage

  beforeEach(async () => {
    // 重置单例实例
    DraftImageStorage.resetInstance()
    StorageManager.resetInstance()

    // 获取新实例并初始化
    storage = DraftImageStorage.getInstance({ debug: false })
    await storage.initialize()
  })

  afterEach(async () => {
    // 清理测试数据
    try {
      const draftIds = await storage.getAllDraftIds()
      for (const draftId of draftIds) {
        await storage.deleteDraft(draftId)
      }
    } catch {
      // 忽略清理错误
    }

    // 重置实例
    DraftImageStorage.resetInstance()
    StorageManager.resetInstance()
  })

  describe('Property 10: 草稿图片持久化', () => {
    it('Property 10.1: 保存的图片应该能够正确读取', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机图片大小（100 字节到 10KB）
          fc.integer({ min: 100, max: 10240 }),
          // 生成随机图片类型
          fc.constantFrom(...IMAGE_TYPES),
          async (imageSize, imageType) => {
            const draftId = generateDraftId()
            const imageData = generateImageData(imageSize)

            // 保存图片
            const imageInfo = await storage.saveImage(draftId, imageData, {
              imageType,
              mimeType: 'image/jpeg'
            })

            // 验证返回的图片信息
            expect(imageInfo).toBeDefined()
            expect(imageInfo.draftId).toBe(draftId)
            expect(imageInfo.imageType).toBe(imageType)
            expect(imageInfo.size).toBe(imageSize)
            expect(imageInfo.localPath).toBeTruthy()

            // 读取图片
            const readData = await storage.readImage(imageInfo.localPath)

            // 验证读取的数据是 Base64 data URL 格式
            expect(readData).toMatch(/^data:image\/jpeg;base64,/)

            // 验证数据内容一致
            const readBuffer = base64ToArrayBuffer(readData)
            expect(readBuffer.byteLength).toBe(imageSize)

            // 比较原始数据和读取的数据
            const originalView = new Uint8Array(imageData)
            const readView = new Uint8Array(readBuffer)
            for (let i = 0; i < imageSize; i++) {
              expect(readView[i]).toBe(originalView[i])
            }

            // 清理
            await storage.deleteDraft(draftId)
          }
        ),
        { numRuns: 10 } // 限制运行次数以加快测试
      )
    })

    it('Property 10.2: 图片存在性检查应该正确', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 1024 }),
          async (imageSize) => {
            const draftId = generateDraftId()
            const imageData = generateImageData(imageSize)

            // 保存图片
            const imageInfo = await storage.saveImage(draftId, imageData, {
              imageType: 'vehicle',
              mimeType: 'image/jpeg'
            })

            // 验证图片存在
            const exists = await storage.imageExists(imageInfo.localPath)
            expect(exists).toBe(true)

            // 删除图片
            await storage.deleteImage(imageInfo.localPath)

            // 验证图片不存在
            const existsAfterDelete = await storage.imageExists(imageInfo.localPath)
            expect(existsAfterDelete).toBe(false)

            // 清理
            await storage.deleteDraft(draftId)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('Property 10.3: 草稿图片列表应该包含所有保存的图片', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成 1-5 张图片
          fc.integer({ min: 1, max: 5 }),
          async (imageCount) => {
            const draftId = generateDraftId()
            const savedPaths: string[] = []

            // 保存多张图片
            for (let i = 0; i < imageCount; i++) {
              const imageData = generateImageData(100 + i * 50)
              const imageInfo = await storage.saveImage(draftId, imageData, {
                imageType: IMAGE_TYPES[i % IMAGE_TYPES.length],
                mimeType: 'image/jpeg',
                index: i
              })
              savedPaths.push(imageInfo.localPath)
            }

            // 获取草稿的所有图片路径
            const paths = await storage.getDraftImagePaths(draftId)

            // 验证数量一致
            expect(paths.length).toBe(imageCount)

            // 验证所有保存的路径都在列表中
            for (const savedPath of savedPaths) {
              expect(paths).toContain(savedPath)
            }

            // 清理
            await storage.deleteDraft(draftId)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('Property 10.4: 删除草稿应该删除所有关联图片', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (imageCount) => {
            const draftId = generateDraftId()
            const savedPaths: string[] = []

            // 保存多张图片
            for (let i = 0; i < imageCount; i++) {
              const imageData = generateImageData(100)
              const imageInfo = await storage.saveImage(draftId, imageData, {
                imageType: 'vehicle',
                mimeType: 'image/jpeg'
              })
              savedPaths.push(imageInfo.localPath)
            }

            // 验证图片存在
            for (const path of savedPaths) {
              const exists = await storage.imageExists(path)
              expect(exists).toBe(true)
            }

            // 删除草稿
            const deleted = await storage.deleteDraft(draftId)
            expect(deleted).toBe(true)

            // 验证所有图片都被删除
            for (const path of savedPaths) {
              const exists = await storage.imageExists(path)
              expect(exists).toBe(false)
            }

            // 验证草稿元数据被删除
            const meta = await storage.getDraftMeta(draftId)
            expect(meta).toBeNull()
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  describe('草稿元数据管理', () => {
    it('应该正确保存和读取草稿元数据', async () => {
      const draftId = generateDraftId()

      // 保存一张图片以创建草稿
      const imageData = generateImageData(100)
      await storage.saveImage(draftId, imageData, {
        imageType: 'vehicle',
        mimeType: 'image/jpeg'
      })

      // 更新草稿元数据
      await storage.saveDraftMeta({
        id: draftId,
        type: 'return',
        userId: 123,
        vehicleId: 456,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        imageIds: [],
        formData: JSON.stringify({ remark: '测试备注' }),
        uploadedUrls: {}
      })

      // 读取草稿元数据
      const meta = await storage.getDraftMeta(draftId)

      expect(meta).toBeDefined()
      expect(meta!.id).toBe(draftId)
      expect(meta!.type).toBe('return')
      expect(meta!.userId).toBe(123)
      expect(meta!.vehicleId).toBe(456)

      // 清理
      await storage.deleteDraft(draftId)
    })

    it('应该正确标记图片已上传', async () => {
      const draftId = generateDraftId()
      const uploadedUrl = 'https://example.com/images/test.jpg'

      // 保存图片
      const imageData = generateImageData(100)
      const imageInfo = await storage.saveImage(draftId, imageData, {
        imageType: 'vehicle',
        mimeType: 'image/jpeg'
      })

      // 标记已上传
      await storage.markImageUploaded(imageInfo.localPath, uploadedUrl)

      // 验证图片信息已更新
      const updatedInfo = await storage.getImageInfo(imageInfo.localPath)
      expect(updatedInfo).toBeDefined()
      expect(updatedInfo!.uploadedUrl).toBe(uploadedUrl)
      expect(updatedInfo!.uploadedAt).toBeDefined()

      // 验证草稿元数据中的已上传 URL 映射
      const meta = await storage.getDraftMeta(draftId)
      expect(meta).toBeDefined()
      expect(meta!.uploadedUrls[imageInfo.localPath]).toBe(uploadedUrl)

      // 清理
      await storage.deleteDraft(draftId)
    })
  })

  describe('过期草稿清理', () => {
    it('应该清理过期的草稿', async () => {
      const draftId = generateDraftId()

      // 保存图片
      const imageData = generateImageData(100)
      const imageInfo = await storage.saveImage(draftId, imageData, {
        imageType: 'vehicle',
        mimeType: 'image/jpeg'
      })

      // 获取当前草稿元数据
      const currentMeta = await storage.getDraftMeta(draftId)
      expect(currentMeta).toBeDefined()

      // 直接修改元数据缓存中的更新时间（模拟过期）
      // 由于 saveDraftMeta 会自动更新 updatedAt，我们需要直接操作内部状态
      // 这里使用一个很短的过期时间来测试
      const veryShortMaxAge = 1 // 1 毫秒

      // 等待一小段时间确保草稿"过期"
      await new Promise(resolve => setTimeout(resolve, 10))

      // 清理过期草稿（使用 1 毫秒作为过期时间）
      const cleanedCount = await storage.cleanExpiredDrafts(veryShortMaxAge)

      // 验证清理了 1 个草稿
      expect(cleanedCount).toBe(1)

      // 验证草稿已被删除
      const meta = await storage.getDraftMeta(draftId)
      expect(meta).toBeNull()

      // 验证图片已被删除
      const exists = await storage.imageExists(imageInfo.localPath)
      expect(exists).toBe(false)
    })

    it('不应该清理未过期的草稿', async () => {
      const draftId = generateDraftId()

      // 保存图片
      const imageData = generateImageData(100)
      await storage.saveImage(draftId, imageData, {
        imageType: 'vehicle',
        mimeType: 'image/jpeg'
      })

      // 清理过期草稿
      const cleanedCount = await storage.cleanExpiredDrafts()

      // 验证没有清理任何草稿
      expect(cleanedCount).toBe(0)

      // 验证草稿仍然存在
      const meta = await storage.getDraftMeta(draftId)
      expect(meta).toBeDefined()

      // 清理
      await storage.deleteDraft(draftId)
    })
  })

  describe('图片索引排序', () => {
    it('获取图片列表应该按索引排序', async () => {
      const draftId = generateDraftId()

      // 以乱序保存图片
      const indices = [3, 1, 4, 0, 2]
      for (const index of indices) {
        const imageData = generateImageData(100)
        await storage.saveImage(draftId, imageData, {
          imageType: 'vehicle',
          mimeType: 'image/jpeg',
          index
        })
      }

      // 获取图片信息列表
      const images = await storage.getDraftImages(draftId)

      // 验证按索引排序
      expect(images.length).toBe(5)
      for (let i = 0; i < images.length; i++) {
        expect(images[i].index).toBe(i)
      }

      // 清理
      await storage.deleteDraft(draftId)
    })
  })
})
