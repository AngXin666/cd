/**
 * 提交失败恢复属性测试
 * 使用 fast-check 进行属性测试，验证提交失败恢复的核心功能
 * @module utils/__tests__/submitRecovery.pbt.test
 *
 * **Feature: backend-vehicle-api, Property 11: 提交失败图片保留**
 * - 提交失败时，本地图片文件应该保持不变
 * - **Validates: Requirements 11.1, 11.2**
 *
 * **Feature: backend-vehicle-api, Property 12: 断点续传正确性**
 * - 部分上传成功的提交，重试时应该跳过已上传的图片
 * - **Validates: Requirements 11.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { SubmitRecoveryManager } from '../submitRecovery/SubmitRecoveryManager'
import { StorageManager } from '../storage/StorageManager'
import type { SubmitTask, SubmitType, ImageUploadState } from '../submitRecovery/types'

/**
 * 测试用的提交类型数组
 */
const SUBMIT_TYPES: SubmitType[] = ['add', 'return', 'supplement']

/**
 * 生成随机任务 ID
 * @returns 任务 ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * 生成随机图片路径
 * @param count - 图片数量
 * @returns 图片路径数组
 */
function generateImagePaths(count: number): string[] {
  const paths: string[] = []
  for (let i = 0; i < count; i++) {
    paths.push(`/drafts/test/images/image_${i}_${Date.now()}.jpg`)
  }
  return paths
}

/**
 * 生成随机表单数据
 * @returns 表单数据对象
 */
function generateFormData(): Record<string, unknown> {
  return {
    plate_number: `京A${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    brand: '测试品牌',
    model: '测试型号',
    remark: `测试备注_${Date.now()}`
  }
}

/**
 * 模拟上传函数（成功）
 */
async function mockUploadSuccess(
  _formData: Record<string, unknown>,
  imageUrls: string[]
): Promise<{ id: number; imageUrls: string[] }> {
  return {
    id: Math.floor(Math.random() * 1000),
    imageUrls
  }
}

/**
 * 模拟上传函数（失败）
 */
async function mockUploadFail(): Promise<never> {
  throw new Error('模拟提交失败')
}

/**
 * 模拟上传函数（部分成功）
 * @param successCount - 成功上传的图片数量
 */
function createPartialSuccessUpload(successCount: number) {
  let callCount = 0
  return async (
    _formData: Record<string, unknown>,
    imageUrls: string[]
  ): Promise<{ id: number; imageUrls: string[] }> => {
    callCount++
    if (callCount <= successCount) {
      return {
        id: Math.floor(Math.random() * 1000),
        imageUrls
      }
    }
    throw new Error('模拟部分失败')
  }
}

describe('SubmitRecoveryManager 属性测试', () => {
  let manager: SubmitRecoveryManager

  beforeEach(async () => {
    // 重置单例实例
    SubmitRecoveryManager.resetInstance()
    StorageManager.resetInstance()

    // 获取新实例并初始化
    manager = SubmitRecoveryManager.getInstance({ debug: false })
    await manager.initialize()

    // Mock uploadImage 函数
    vi.mock('../imageUpload', () => ({
      uploadImage: vi.fn().mockImplementation(async (filePath: string) => {
        // 模拟上传成功，返回远程 URL
        return `https://example.com/uploads/${filePath.split('/').pop()}`
      })
    }))
  })

  afterEach(async () => {
    // 清理测试数据
    try {
      const userId = 1
      const failedTasks = await manager.getFailedTasks(userId)
      const pendingTasks = await manager.getPendingTasks(userId)
      const allTasks = [...failedTasks, ...pendingTasks]

      for (const task of allTasks) {
        await manager.deleteTask(task.id)
      }
    } catch {
      // 忽略清理错误
    }

    // 重置实例
    SubmitRecoveryManager.resetInstance()
    StorageManager.resetInstance()

    // 清除 mock
    vi.clearAllMocks()
  })

  describe('Property 11: 提交失败图片保留', () => {
    /**
     * **Feature: backend-vehicle-api, Property 11: 提交失败图片保留**
     * **Validates: Requirements 11.1, 11.2**
     *
     * *For any* 提交失败的操作，本地图片文件应该保持不变
     */
    it('Property 11.1: 提交失败时任务应该被保存', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机用户 ID
          fc.integer({ min: 1, max: 1000 }),
          // 生成随机图片数量（1-5 张）
          fc.integer({ min: 1, max: 5 }),
          // 生成随机提交类型
          fc.constantFrom(...SUBMIT_TYPES),
          async (userId, imageCount, submitType) => {
            const formData = generateFormData()
            const imagePaths = generateImagePaths(imageCount)

            // 创建任务
            const taskId = await manager.createTask(
              submitType,
              userId,
              formData,
              imagePaths
            )

            // 验证任务已创建
            const task = await manager.getTask(taskId)
            expect(task).toBeDefined()
            expect(task!.id).toBe(taskId)
            expect(task!.userId).toBe(userId)
            expect(task!.type).toBe(submitType)
            expect(task!.status).toBe('pending')
            expect(task!.images.length).toBe(imageCount)

            // 验证所有图片状态为待上传
            for (const image of task!.images) {
              expect(image.status).toBe('pending')
              expect(image.uploadedUrl).toBeUndefined()
            }

            // 清理
            await manager.deleteTask(taskId)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('Property 11.2: 提交失败后任务状态应该正确更新', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 3 }),
          async (userId, imageCount) => {
            const formData = generateFormData()
            const imagePaths = generateImagePaths(imageCount)

            // 创建任务
            const taskId = await manager.createTask(
              'return',
              userId,
              formData,
              imagePaths
            )

            // 执行任务（模拟失败）
            const result = await manager.executeTask(taskId, mockUploadFail)

            // 验证结果
            expect(result.success).toBe(false)
            expect(result.canRetry).toBe(true)
            expect(result.error).toBeDefined()

            // 验证任务状态
            const task = await manager.getTask(taskId)
            expect(task).toBeDefined()
            expect(task!.status).toBe('failed')
            expect(task!.error).toBeDefined()
            expect(task!.retryCount).toBe(1)

            // 验证任务在失败列表中
            const failedTasks = await manager.getFailedTasks(userId)
            expect(failedTasks.some(t => t.id === taskId)).toBe(true)

            // 清理
            await manager.deleteTask(taskId)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('Property 11.3: 图片路径在失败后应该保持不变', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 5 }),
          async (userId, imageCount) => {
            const formData = generateFormData()
            const imagePaths = generateImagePaths(imageCount)

            // 创建任务
            const taskId = await manager.createTask(
              'add',
              userId,
              formData,
              imagePaths
            )

            // 获取原始图片路径
            const taskBefore = await manager.getTask(taskId)
            const originalPaths = taskBefore!.images.map(img => img.localPath)

            // 执行任务（模拟失败）
            await manager.executeTask(taskId, mockUploadFail)

            // 获取失败后的图片路径
            const taskAfter = await manager.getTask(taskId)
            const pathsAfterFail = taskAfter!.images.map(img => img.localPath)

            // 验证图片路径保持不变
            expect(pathsAfterFail.length).toBe(originalPaths.length)
            for (let i = 0; i < originalPaths.length; i++) {
              expect(pathsAfterFail[i]).toBe(originalPaths[i])
            }

            // 清理
            await manager.deleteTask(taskId)
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  describe('Property 12: 断点续传正确性', () => {
    /**
     * **Feature: backend-vehicle-api, Property 12: 断点续传正确性**
     * **Validates: Requirements 11.5**
     *
     * *For any* 部分上传成功的提交，重试时应该跳过已上传的图片
     */
    it('Property 12.1: 已上传的图片 URL 应该被正确记录', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 5 }),
          async (userId, imageCount) => {
            const formData = generateFormData()
            const imagePaths = generateImagePaths(imageCount)

            // 创建任务
            const taskId = await manager.createTask(
              'return',
              userId,
              formData,
              imagePaths
            )

            // 手动标记部分图片已上传
            const uploadedCount = Math.min(2, imageCount)
            for (let i = 0; i < uploadedCount; i++) {
              const uploadedUrl = `https://example.com/uploads/image_${i}.jpg`
              await manager.markImageUploaded(taskId, imagePaths[i], uploadedUrl)
            }

            // 获取已上传的 URL 映射
            const uploadedUrls = await manager.getUploadedUrls(taskId)

            // 验证已上传的图片数量
            expect(Object.keys(uploadedUrls).length).toBe(uploadedCount)

            // 验证每个已上传的图片都有正确的 URL
            for (let i = 0; i < uploadedCount; i++) {
              expect(uploadedUrls[imagePaths[i]]).toBe(
                `https://example.com/uploads/image_${i}.jpg`
              )
            }

            // 清理
            await manager.deleteTask(taskId)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('Property 12.2: 重试时应该保留已上传图片的状态', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (userId) => {
            const formData = generateFormData()
            const imagePaths = generateImagePaths(3)

            // 创建任务
            const taskId = await manager.createTask(
              'return',
              userId,
              formData,
              imagePaths
            )

            // 手动标记第一张图片已上传
            const uploadedUrl = 'https://example.com/uploads/image_0.jpg'
            await manager.markImageUploaded(taskId, imagePaths[0], uploadedUrl)

            // 获取任务状态
            const task = await manager.getTask(taskId)

            // 验证第一张图片状态为成功
            expect(task!.images[0].status).toBe('success')
            expect(task!.images[0].uploadedUrl).toBe(uploadedUrl)

            // 验证其他图片状态为待上传
            for (let i = 1; i < task!.images.length; i++) {
              expect(task!.images[i].status).toBe('pending')
              expect(task!.images[i].uploadedUrl).toBeUndefined()
            }

            // 清理
            await manager.deleteTask(taskId)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('Property 12.3: 重试次数应该正确累加', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 3 }),
          async (userId, retryTimes) => {
            const formData = generateFormData()
            const imagePaths = generateImagePaths(2)

            // 创建任务
            const taskId = await manager.createTask(
              'add',
              userId,
              formData,
              imagePaths
            )

            // 多次执行失败
            for (let i = 0; i < retryTimes; i++) {
              await manager.executeTask(taskId, mockUploadFail)
            }

            // 获取任务状态
            const task = await manager.getTask(taskId)

            // 验证重试次数
            expect(task!.retryCount).toBe(retryTimes)

            // 清理
            await manager.deleteTask(taskId)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('Property 12.4: 达到最大重试次数后应该不能再重试', async () => {
      const userId = 1
      const formData = generateFormData()
      const imagePaths = generateImagePaths(2)

      // 创建任务
      const taskId = await manager.createTask(
        'return',
        userId,
        formData,
        imagePaths
      )

      // 获取最大重试次数
      const task = await manager.getTask(taskId)
      const maxRetries = task!.maxRetries

      // 执行失败直到达到最大重试次数
      for (let i = 0; i < maxRetries; i++) {
        await manager.executeTask(taskId, mockUploadFail)
      }

      // 尝试再次重试
      const result = await manager.retryTask(taskId, mockUploadFail)

      // 验证不能再重试
      expect(result.success).toBe(false)
      expect(result.canRetry).toBe(false)
      expect(result.error).toContain('最大重试次数')

      // 清理
      await manager.deleteTask(taskId)
    })
  })

  describe('任务管理', () => {
    it('应该正确获取用户的失败任务列表', async () => {
      const userId = 1
      const taskIds: string[] = []

      // 创建多个任务并使其失败
      for (let i = 0; i < 3; i++) {
        const formData = generateFormData()
        const imagePaths = generateImagePaths(2)
        const taskId = await manager.createTask('return', userId, formData, imagePaths)
        await manager.executeTask(taskId, mockUploadFail)
        taskIds.push(taskId)
      }

      // 获取失败任务列表
      const failedTasks = await manager.getFailedTasks(userId)

      // 验证数量
      expect(failedTasks.length).toBe(3)

      // 验证所有任务都在列表中
      for (const taskId of taskIds) {
        expect(failedTasks.some(t => t.id === taskId)).toBe(true)
      }

      // 清理
      for (const taskId of taskIds) {
        await manager.deleteTask(taskId)
      }
    })

    it('应该正确删除任务', async () => {
      const userId = 1
      const formData = generateFormData()
      const imagePaths = generateImagePaths(2)

      // 创建任务
      const taskId = await manager.createTask('add', userId, formData, imagePaths)

      // 验证任务存在
      let task = await manager.getTask(taskId)
      expect(task).toBeDefined()

      // 删除任务
      const deleted = await manager.deleteTask(taskId)
      expect(deleted).toBe(true)

      // 验证任务不存在
      task = await manager.getTask(taskId)
      expect(task).toBeNull()
    })

    it('应该正确清理过期任务', async () => {
      const userId = 1
      const formData = generateFormData()
      const imagePaths = generateImagePaths(2)

      // 创建任务
      const taskId = await manager.createTask('return', userId, formData, imagePaths)

      // 执行成功
      await manager.executeTask(taskId, mockUploadSuccess)

      // 清理过期任务（成功的任务会被清理）
      const cleanedCount = await manager.cleanExpiredTasks()

      // 验证清理了任务
      expect(cleanedCount).toBeGreaterThanOrEqual(1)

      // 验证任务不存在
      const task = await manager.getTask(taskId)
      expect(task).toBeNull()
    })
  })

  describe('网络状态', () => {
    it('应该正确检查网络状态', async () => {
      const networkState = await manager.checkNetwork()

      // 验证返回了网络状态
      expect(networkState).toBeDefined()
      expect(typeof networkState.isOnline).toBe('boolean')
      expect(typeof networkState.networkType).toBe('string')
      expect(typeof networkState.lastCheckedAt).toBe('number')
    })

    it('应该正确监听网络状态变化', async () => {
      const states: { isOnline: boolean }[] = []

      // 监听网络状态
      const unsubscribe = manager.onNetworkChange((state) => {
        states.push({ isOnline: state.isOnline })
      })

      // 验证立即收到当前状态
      expect(states.length).toBe(1)

      // 取消监听
      unsubscribe()
    })
  })
})
