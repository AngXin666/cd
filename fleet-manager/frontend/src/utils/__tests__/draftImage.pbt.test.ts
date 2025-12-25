/**
 * 草稿图片存储属性测试（Property-Based Testing）
 * 使用 fast-check 验证草稿图片存储系统的正确性属性
 * @module utils/__tests__/draftImage.pbt.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { DraftImageStorage } from '../draftImage'
import { StorageManager } from '../storage'

/**
 * 生成有效的草稿 ID
 * 确保 ID 格式正确，可以作为目录名使用
 */
const validDraftIdArb = fc.string({ minLength: 5, maxLength: 20 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
  .map(s => `draft_${s}`)

/**
 * 生成有效的文件名
 * 确保文件名格式正确
 */
const validFilenameArb = fc.string({ minLength: 3, maxLength: 15 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
  .map(s => `${s}.jpg`)

/**
 * 生成有效的图片数据（Uint8Array）
 * 生成随机字节数组作为模拟图片数据
 */
const validImageDataArb = fc.uint8Array({ minLength: 10, maxLength: 500 })

describe('DraftImageStorage Property-Based Tests', () => {
  let draftStorage: DraftImageStorage

  beforeEach(async () => {
    // 重置单例实例
    DraftImageStorage.resetInstance()
    StorageManager.resetInstance()
    
    // 创建新实例
    draftStorage = DraftImageStorage.getInstance({
      expirationTime: 60 * 1000, // 1 分钟过期（便于测试）
      debug: false
    })
    
    await draftStorage.initialize()
  })

  afterEach(async () => {
    // 清理所有草稿
    await draftStorage.clearAllDrafts()
    DraftImageStorage.resetInstance()
    StorageManager.resetInstance()
  })

  /**
   * 辅助函数：将 Uint8Array 转换为 ArrayBuffer
   * 避免 SharedArrayBuffer 类型问题
   */
  function toArrayBuffer(uint8Array: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(uint8Array.length)
    const view = new Uint8Array(buffer)
    view.set(uint8Array)
    return buffer
  }

  /**
   * 辅助函数：将 Base64 字符串解码为 Uint8Array
   */
  function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }


  /**
   * **Feature: backend-vehicle-api, Property 10: 草稿图片持久化**
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
   * 
   * *For any* 保存到草稿的图片，重新读取草稿后图片应该能正常显示
   * 
   * 这个属性验证：
   * 1. 用户拍摄或选择图片后，图片立即保存到本地存储（10.1）
   * 2. 用户保存草稿时，图片本地路径与草稿数据关联存储（10.2）
   * 3. 用户重新打开草稿时，从本地存储加载图片并正常显示（10.3）
   * 4. 本地图片文件存在时，直接显示本地图片（10.4）
   */
  describe('Property 10: 草稿图片持久化', () => {
    it('*For any* 保存到草稿的图片，重新读取后应该返回相同的图片数据', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          validFilenameArb,
          validImageDataArb,
          async (draftId, filename, imageBytes) => {
            // 将 Uint8Array 转换为 ArrayBuffer
            const imageData = toArrayBuffer(imageBytes)
            
            // 保存图片到草稿目录（模拟用户拍摄照片后立即保存）
            const localPath = await draftStorage.saveImage(
              draftId,
              imageData,
              filename,
              { mimeType: 'image/jpeg', overwrite: true }
            )
            
            // 验证返回的路径格式正确
            expect(localPath).toContain(draftId)
            expect(localPath).toContain(filename)
            expect(localPath).toMatch(/^drafts\//)
            
            // 验证图片存在
            const exists = await draftStorage.imageExists(localPath)
            expect(exists).toBe(true)
            
            // 读取图片数据
            const readData = await draftStorage.readImage(localPath, { format: 'base64' })
            
            // 解码 Base64 并验证数据一致性
            const decodedData = base64ToUint8Array(readData as string)
            
            // 验证数据长度一致
            expect(decodedData.length).toBe(imageBytes.length)
            
            // 验证数据内容一致
            for (let i = 0; i < imageBytes.length; i++) {
              expect(decodedData[i]).toBe(imageBytes[i])
            }
            
            return true
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      )
    })

    it('保存图片后，草稿元数据应该正确记录图片信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          validFilenameArb,
          validImageDataArb,
          async (draftId, filename, imageBytes) => {
            // 每次测试前清理该草稿
            await draftStorage.deleteDraftImages(draftId)
            
            const imageData = toArrayBuffer(imageBytes)
            
            // 保存图片
            await draftStorage.saveImage(draftId, imageData, filename, {
              mimeType: 'image/jpeg',
              imageType: 'vehicle',
              overwrite: true
            })
            
            // 获取草稿信息
            const draftInfo = await draftStorage.getDraftInfo(draftId)
            expect(draftInfo).not.toBeNull()
            expect(draftInfo!.draftId).toBe(draftId)
            expect(draftInfo!.imageCount).toBe(1)
            expect(draftInfo!.totalSize).toBe(imageBytes.length)
            
            // 验证图片元数据
            const imageMetas = await draftStorage.getDraftImageMetas(draftId)
            expect(imageMetas.length).toBe(1)
            expect(imageMetas[0].filename).toBe(filename)
            expect(imageMetas[0].size).toBe(imageBytes.length)
            expect(imageMetas[0].mimeType).toBe('image/jpeg')
            expect(imageMetas[0].imageType).toBe('vehicle')
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('同一草稿可以保存多张图片，且都能正确读取', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          fc.array(
            fc.tuple(validFilenameArb, validImageDataArb),
            { minLength: 2, maxLength: 5 }
          ),
          async (draftId, imageItems) => {
            // 每次测试前清理该草稿
            await draftStorage.deleteDraftImages(draftId)
            
            // 确保文件名唯一
            const uniqueItems = imageItems.filter((item, index, self) =>
              index === self.findIndex(t => t[0] === item[0])
            )
            
            if (uniqueItems.length < 2) return true
            
            // 保存所有图片
            const savedPaths: string[] = []
            for (const [filename, imageBytes] of uniqueItems) {
              const imageData = toArrayBuffer(imageBytes)
              const path = await draftStorage.saveImage(draftId, imageData, filename, {
                overwrite: true
              })
              savedPaths.push(path)
            }
            
            // 验证草稿信息
            const draftInfo = await draftStorage.getDraftInfo(draftId)
            expect(draftInfo).not.toBeNull()
            expect(draftInfo!.imageCount).toBe(uniqueItems.length)
            
            // 验证所有图片路径
            const paths = await draftStorage.getDraftImagePaths(draftId)
            expect(paths.length).toBe(uniqueItems.length)
            
            // 验证每张图片都能正确读取
            for (let i = 0; i < uniqueItems.length; i++) {
              const [, originalBytes] = uniqueItems[i]
              const readData = await draftStorage.readImage(savedPaths[i], { format: 'base64' })
              const decodedData = base64ToUint8Array(readData as string)
              
              expect(decodedData.length).toBe(originalBytes.length)
              for (let j = 0; j < originalBytes.length; j++) {
                expect(decodedData[j]).toBe(originalBytes[j])
              }
            }
            
            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('覆盖保存应该更新图片数据', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          validFilenameArb,
          validImageDataArb,
          validImageDataArb,
          async (draftId, filename, data1, data2) => {
            // 每次测试前清理该草稿
            await draftStorage.deleteDraftImages(draftId)
            
            // 第一次保存
            const buffer1 = toArrayBuffer(data1)
            await draftStorage.saveImage(draftId, buffer1, filename, { overwrite: true })
            
            // 第二次保存（覆盖）
            const buffer2 = toArrayBuffer(data2)
            await draftStorage.saveImage(draftId, buffer2, filename, { overwrite: true })
            
            // 读取应该得到第二次保存的数据
            const paths = await draftStorage.getDraftImagePaths(draftId)
            expect(paths.length).toBe(1) // 应该只有一张图片
            
            const readData = await draftStorage.readImage(paths[0], { format: 'base64' })
            const decodedData = base64ToUint8Array(readData as string)
            
            // 验证是第二次保存的数据
            expect(decodedData.length).toBe(data2.length)
            for (let i = 0; i < data2.length; i++) {
              expect(decodedData[i]).toBe(data2[i])
            }
            
            return true
          }
        ),
        { numRuns: 30 }
      )
    })
  })


  /**
   * 草稿清理测试
   * 验证草稿提交/删除/过期时的清理逻辑
   */
  describe('草稿清理', () => {
    it('deleteDraftImages 应该删除草稿的所有图片', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          fc.array(validFilenameArb, { minLength: 1, maxLength: 5 }),
          async (draftId, filenames) => {
            // 确保文件名唯一
            const uniqueFilenames = [...new Set(filenames)]
            const imageData = new Uint8Array([1, 2, 3, 4, 5]).buffer
            
            // 保存多张图片
            for (const filename of uniqueFilenames) {
              await draftStorage.saveImage(draftId, imageData, filename, { overwrite: true })
            }
            
            // 验证图片存在
            const pathsBefore = await draftStorage.getDraftImagePaths(draftId)
            expect(pathsBefore.length).toBe(uniqueFilenames.length)
            
            // 删除草稿的所有图片
            const deletedCount = await draftStorage.deleteDraftImages(draftId)
            expect(deletedCount).toBe(uniqueFilenames.length)
            
            // 验证图片已删除
            const pathsAfter = await draftStorage.getDraftImagePaths(draftId)
            expect(pathsAfter.length).toBe(0)
            
            // 验证草稿信息不存在
            const draftInfo = await draftStorage.getDraftInfo(draftId)
            expect(draftInfo).toBeNull()
            
            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('onDraftSubmitted 应该清理草稿关联的图片', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          validFilenameArb,
          validImageDataArb,
          async (draftId, filename, imageBytes) => {
            const imageData = toArrayBuffer(imageBytes)
            
            // 保存图片
            const path = await draftStorage.saveImage(draftId, imageData, filename, {
              overwrite: true
            })
            
            // 验证图片存在
            expect(await draftStorage.imageExists(path)).toBe(true)
            
            // 模拟草稿提交成功
            const deletedCount = await draftStorage.onDraftSubmitted(draftId)
            expect(deletedCount).toBe(1)
            
            // 验证图片已删除
            expect(await draftStorage.imageExists(path)).toBe(false)
            
            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('onDraftDeleted 应该清理草稿关联的图片', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          validFilenameArb,
          validImageDataArb,
          async (draftId, filename, imageBytes) => {
            const imageData = toArrayBuffer(imageBytes)
            
            // 保存图片
            const path = await draftStorage.saveImage(draftId, imageData, filename, {
              overwrite: true
            })
            
            // 验证图片存在
            expect(await draftStorage.imageExists(path)).toBe(true)
            
            // 模拟草稿删除
            const deletedCount = await draftStorage.onDraftDeleted(draftId)
            expect(deletedCount).toBe(1)
            
            // 验证图片已删除
            expect(await draftStorage.imageExists(path)).toBe(false)
            
            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('cleanExpiredDrafts 应该清理过期的草稿', async () => {
      // 创建一个使用非常短过期时间的存储实例
      DraftImageStorage.resetInstance()
      StorageManager.resetInstance()
      
      const shortLivedStorage = DraftImageStorage.getInstance({
        expirationTime: 100, // 100ms 过期
        debug: false
      })
      await shortLivedStorage.initialize()

      await fc.assert(
        fc.asyncProperty(
          fc.array(validDraftIdArb, { minLength: 2, maxLength: 4 }),
          async (draftIds) => {
            // 确保草稿 ID 唯一
            const uniqueDraftIds = [...new Set(draftIds)]
            if (uniqueDraftIds.length < 2) return true
            
            const imageData = new Uint8Array([1, 2, 3]).buffer
            
            // 为每个草稿保存一张图片
            for (const draftId of uniqueDraftIds) {
              await shortLivedStorage.saveImage(draftId, imageData, 'test.jpg', {
                overwrite: true
              })
            }
            
            // 验证所有草稿存在
            const draftsBefore = await shortLivedStorage.getAllDrafts()
            expect(draftsBefore.length).toBe(uniqueDraftIds.length)
            
            // 等待过期
            await new Promise(resolve => setTimeout(resolve, 150))
            
            // 清理过期草稿
            const cleanedCount = await shortLivedStorage.cleanExpiredDrafts()
            expect(cleanedCount).toBe(uniqueDraftIds.length)
            
            // 验证所有草稿已清理
            const draftsAfter = await shortLivedStorage.getAllDrafts()
            expect(draftsAfter.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 15 }
      )
      
      // 清理
      await shortLivedStorage.clearAllDrafts()
    })

    it('clearAllDrafts 应该清理所有草稿', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validDraftIdArb, { minLength: 1, maxLength: 5 }),
          async (draftIds) => {
            // 确保草稿 ID 唯一
            const uniqueDraftIds = [...new Set(draftIds)]
            const imageData = new Uint8Array([1, 2, 3]).buffer
            
            // 为每个草稿保存一张图片
            for (const draftId of uniqueDraftIds) {
              await draftStorage.saveImage(draftId, imageData, 'test.jpg', {
                overwrite: true
              })
            }
            
            // 验证草稿存在
            const draftsBefore = await draftStorage.getAllDrafts()
            expect(draftsBefore.length).toBe(uniqueDraftIds.length)
            
            // 清理所有草稿
            const clearedCount = await draftStorage.clearAllDrafts()
            expect(clearedCount).toBe(uniqueDraftIds.length)
            
            // 验证所有草稿已清理
            const draftsAfter = await draftStorage.getAllDrafts()
            expect(draftsAfter.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * 路径管理测试
   * 验证路径格式和路径相关操作
   */
  describe('路径管理', () => {
    it('保存的图片路径应该符合格式 /drafts/{draftId}/images/{filename}', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          validFilenameArb,
          async (draftId, filename) => {
            const imageData = new Uint8Array([1, 2, 3]).buffer
            
            const path = await draftStorage.saveImage(draftId, imageData, filename, {
              overwrite: true
            })
            
            // 验证路径格式
            const expectedPattern = new RegExp(`^drafts/${draftId}/images/${filename}$`)
            expect(path).toMatch(expectedPattern)
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('getDraftImagePaths 应该返回所有图片的正确路径', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          fc.array(validFilenameArb, { minLength: 1, maxLength: 5 }),
          async (draftId, filenames) => {
            // 每次测试前清理该草稿
            await draftStorage.deleteDraftImages(draftId)
            
            // 确保文件名唯一
            const uniqueFilenames = [...new Set(filenames)]
            const imageData = new Uint8Array([1, 2, 3]).buffer
            
            // 保存图片
            const savedPaths: string[] = []
            for (const filename of uniqueFilenames) {
              const path = await draftStorage.saveImage(draftId, imageData, filename, {
                overwrite: true
              })
              savedPaths.push(path)
            }
            
            // 获取路径列表
            const paths = await draftStorage.getDraftImagePaths(draftId)
            
            // 验证数量一致
            expect(paths.length).toBe(uniqueFilenames.length)
            
            // 验证所有保存的路径都在列表中
            for (const savedPath of savedPaths) {
              expect(paths).toContain(savedPath)
            }
            
            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('imageExists 应该正确判断图片是否存在', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDraftIdArb,
          validFilenameArb,
          async (draftId, filename) => {
            const imageData = new Uint8Array([1, 2, 3]).buffer
            
            // 保存前不存在
            const pathBefore = `drafts/${draftId}/images/${filename}`
            expect(await draftStorage.imageExists(pathBefore)).toBe(false)
            
            // 保存图片
            const path = await draftStorage.saveImage(draftId, imageData, filename, {
              overwrite: true
            })
            
            // 保存后存在
            expect(await draftStorage.imageExists(path)).toBe(true)
            
            // 删除后不存在
            await draftStorage.deleteDraftImages(draftId)
            expect(await draftStorage.imageExists(path)).toBe(false)
            
            return true
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  /**
   * 总大小计算测试
   */
  describe('总大小计算', () => {
    it('getTotalSize 应该正确计算所有草稿的总大小', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(validDraftIdArb, validFilenameArb, validImageDataArb),
            { minLength: 1, maxLength: 5 }
          ),
          async (items) => {
            // 每次测试前清理
            await draftStorage.clearAllDrafts()
            
            // 确保草稿 ID 和文件名组合唯一
            const uniqueItems = items.filter((item, index, self) =>
              index === self.findIndex(t => t[0] === item[0] && t[1] === item[1])
            )
            
            let expectedSize = 0
            
            for (const [draftId, filename, imageBytes] of uniqueItems) {
              const imageData = toArrayBuffer(imageBytes)
              await draftStorage.saveImage(draftId, imageData, filename, { overwrite: true })
              expectedSize += imageBytes.length
            }
            
            const actualSize = await draftStorage.getTotalSize()
            expect(actualSize).toBe(expectedSize)
            
            return true
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})
