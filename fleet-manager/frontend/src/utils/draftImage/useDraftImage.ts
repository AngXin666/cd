/**
 * 草稿图片 Vue Hook
 * 提供在 Vue 组件中使用草稿图片存储功能的便捷方法
 * 集成 DraftImageStorage 实现图片本地持久化
 * @module utils/draftImage/useDraftImage
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { getDraftImageStorage, DraftImageStorage } from './DraftImageStorage'
import type { DraftImageMeta, DraftInfo, SaveImageOptions } from './types'

/**
 * 草稿图片 Hook 返回值接口
 */
export interface UseDraftImageReturn {
  /** 是否已初始化 */
  initialized: Ref<boolean>
  /** 是否正在加载 */
  loading: Ref<boolean>
  /** 草稿信息 */
  draftInfo: Ref<DraftInfo | null>
  /** 保存图片到草稿 */
  saveImage: (
    imageData: Blob | ArrayBuffer | string,
    filename: string,
    options?: SaveImageOptions
  ) => Promise<string>
  /** 读取草稿图片 */
  readImage: (localPath: string) => Promise<string>
  /** 删除单张图片 */
  deleteImage: (localPath: string) => Promise<boolean>
  /** 检查图片是否存在 */
  imageExists: (localPath: string) => Promise<boolean>
  /** 获取草稿所有图片路径 */
  getImagePaths: () => Promise<string[]>
  /** 获取草稿所有图片元数据 */
  getImageMetas: () => Promise<DraftImageMeta[]>
  /** 刷新草稿信息 */
  refreshDraftInfo: () => Promise<void>
  /** 清理当前草稿 */
  clearDraft: () => Promise<number>
  /** 草稿提交成功后清理 */
  onSubmitSuccess: () => Promise<number>
}

/**
 * 草稿图片 Vue Hook
 * 在 Vue 组件中使用草稿图片存储功能
 *
 * @param draftId - 草稿 ID（通常使用 userId_type 格式）
 * @returns 草稿图片相关的状态和方法
 *
 * @example
 * ```vue
 * <script setup>
 * import { useDraftImage } from '@/utils/draftImage/useDraftImage'
 *
 * const userId = 1
 * const draftId = `${userId}_add`
 * const {
 *   initialized,
 *   saveImage,
 *   readImage,
 *   onSubmitSuccess
 * } = useDraftImage(draftId)
 *
 * // 拍照后保存图片
 * async function handlePhotoCapture(tempPath: string) {
 *   const localPath = await saveImage(tempPath, 'left_front.jpg', {
 *     imageType: 'vehicle'
 *   })
 *   console.log('图片已保存到:', localPath)
 * }
 *
 * // 提交成功后清理
 * async function handleSubmitSuccess() {
 *   await onSubmitSuccess()
 * }
 * </script>
 * ```
 */
export function useDraftImage(draftId: string): UseDraftImageReturn {
  // 状态
  const initialized = ref(false)
  const loading = ref(false)
  const draftInfo = ref<DraftInfo | null>(null)

  // 存储管理器实例
  let storage: DraftImageStorage | null = null

  /**
   * 初始化
   */
  async function init(): Promise<void> {
    loading.value = true
    try {
      storage = getDraftImageStorage({ debug: false })
      await storage.initialize()
      initialized.value = true
      // 加载草稿信息
      await refreshDraftInfo()
    } catch (error) {
      console.error('[useDraftImage] 初始化失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 刷新草稿信息
   */
  async function refreshDraftInfo(): Promise<void> {
    if (!storage) return
    draftInfo.value = await storage.getDraftInfo(draftId)
  }

  /**
   * 保存图片到草稿
   * @param imageData - 图片数据（Blob、ArrayBuffer、Base64 或临时文件路径）
   * @param filename - 文件名
   * @param options - 保存选项
   * @returns 本地存储路径
   */
  async function saveImage(
    imageData: Blob | ArrayBuffer | string,
    filename: string,
    options?: SaveImageOptions
  ): Promise<string> {
    if (!storage) {
      throw new Error('存储管理器未初始化')
    }

    // 如果是临时文件路径（以 blob: 或 http 开头），需要先读取为 ArrayBuffer
    let data: Blob | ArrayBuffer | string = imageData
    if (typeof imageData === 'string' && 
        (imageData.startsWith('blob:') || imageData.startsWith('http'))) {
      try {
        const response = await fetch(imageData)
        data = await response.arrayBuffer()
      } catch (error) {
        console.error('[useDraftImage] 读取临时文件失败:', error)
        // 如果读取失败，尝试直接使用路径（可能是 base64）
        data = imageData
      }
    }

    const localPath = await storage.saveImage(draftId, data, filename, options)
    // 刷新草稿信息
    await refreshDraftInfo()
    return localPath
  }

  /**
   * 读取草稿图片
   * @param localPath - 本地路径
   * @returns Base64 数据 URL
   */
  async function readImage(localPath: string): Promise<string> {
    if (!storage) {
      throw new Error('存储管理器未初始化')
    }

    const data = await storage.readImage(localPath, { format: 'base64' })
    // 返回 data URL 格式
    if (typeof data === 'string' && !data.startsWith('data:')) {
      return `data:image/jpeg;base64,${data}`
    }
    return data as string
  }

  /**
   * 删除单张图片
   * @param localPath - 本地路径
   * @returns 是否成功删除
   */
  async function deleteImage(localPath: string): Promise<boolean> {
    if (!storage) return false

    const success = await storage.deleteImage(localPath)
    if (success) {
      await refreshDraftInfo()
    }
    return success
  }

  /**
   * 检查图片是否存在
   * @param localPath - 本地路径
   * @returns 图片是否存在
   */
  async function imageExists(localPath: string): Promise<boolean> {
    if (!storage) return false
    return storage.imageExists(localPath)
  }

  /**
   * 获取草稿所有图片路径
   * @returns 图片路径数组
   */
  async function getImagePaths(): Promise<string[]> {
    if (!storage) return []
    return storage.getDraftImagePaths(draftId)
  }

  /**
   * 获取草稿所有图片元数据
   * @returns 图片元数据数组
   */
  async function getImageMetas(): Promise<DraftImageMeta[]> {
    if (!storage) return []
    return storage.getDraftImageMetas(draftId)
  }

  /**
   * 清理当前草稿
   * @returns 清理的图片数量
   */
  async function clearDraft(): Promise<number> {
    if (!storage) return 0

    const count = await storage.deleteDraftImages(draftId)
    draftInfo.value = null
    return count
  }

  /**
   * 草稿提交成功后清理
   * @returns 清理的图片数量
   */
  async function onSubmitSuccess(): Promise<number> {
    if (!storage) return 0
    return storage.onDraftSubmitted(draftId)
  }

  // 生命周期
  onMounted(() => {
    init()
  })

  return {
    initialized,
    loading,
    draftInfo,
    saveImage,
    readImage,
    deleteImage,
    imageExists,
    getImagePaths,
    getImageMetas,
    refreshDraftInfo,
    clearDraft,
    onSubmitSuccess
  }
}

/**
 * 生成草稿 ID
 * 根据用户 ID 和草稿类型生成唯一的草稿 ID
 *
 * @param userId - 用户 ID
 * @param type - 草稿类型（add/return/supplement）
 * @param vehicleId - 车辆 ID（还车/补录时使用）
 * @returns 草稿 ID
 */
export function generateDraftId(
  userId: number,
  type: 'add' | 'return' | 'supplement',
  vehicleId?: number
): string {
  if (vehicleId) {
    return `${userId}_${type}_${vehicleId}`
  }
  return `${userId}_${type}`
}
