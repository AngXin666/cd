/**
 * 车损照片对比组合式函数
 * 提供车损照片任意选择和对比的功能
 * @module utils/photoCompare/useDamagePhotoCompare
 */

import { ref, computed } from 'vue'
import type { PhotoItem, CompareSelection } from '@/components/PhotoCompare/types'

/**
 * 车损照片对比组合式函数
 * 支持任意选择 2 张车损照片进行对比
 * @param photos - 车损照片列表
 * @returns 对比相关的状态和方法
 */
export function useDamagePhotoCompare(photos: PhotoItem[]) {
  /** 当前选择的照片 */
  const selection = ref<CompareSelection>({
    first: null,
    second: null
  })

  /** 照片列表引用 */
  const photoList = ref<PhotoItem[]>(photos)

  /**
   * 是否已完成选择（选择了 2 张照片）
   */
  const hasCompleteSelection = computed(() => {
    return selection.value.first !== null && selection.value.second !== null
  })

  /**
   * 已选择的照片数量
   */
  const selectedCount = computed(() => {
    let count = 0
    if (selection.value.first) count++
    if (selection.value.second) count++
    return count
  })

  /**
   * 检查照片是否被选中
   * @param photo - 照片项
   * @returns 是否被选中
   */
  const isSelected = (photo: PhotoItem): boolean => {
    return selection.value.first?.url === photo.url || 
           selection.value.second?.url === photo.url
  }

  /**
   * 获取照片的选择序号
   * @param photo - 照片项
   * @returns 选择序号（1 或 2），未选中返回 0
   */
  const getSelectionIndex = (photo: PhotoItem): number => {
    if (selection.value.first?.url === photo.url) return 1
    if (selection.value.second?.url === photo.url) return 2
    return 0
  }

  /**
   * 选择照片
   * @param photo - 要选择的照片
   */
  const selectPhoto = (photo: PhotoItem): void => {
    // 如果已选中，取消选择
    if (selection.value.first?.url === photo.url) {
      // 将第二张移到第一张位置
      selection.value.first = selection.value.second
      selection.value.second = null
      return
    }
    
    if (selection.value.second?.url === photo.url) {
      selection.value.second = null
      return
    }

    // 添加选择
    if (!selection.value.first) {
      selection.value.first = photo
    } else if (!selection.value.second) {
      selection.value.second = photo
    } else {
      // 已选择两张，替换第二张
      selection.value.second = photo
    }
  }

  /**
   * 取消选择照片
   * @param photo - 要取消选择的照片
   */
  const deselectPhoto = (photo: PhotoItem): void => {
    if (selection.value.first?.url === photo.url) {
      selection.value.first = selection.value.second
      selection.value.second = null
    } else if (selection.value.second?.url === photo.url) {
      selection.value.second = null
    }
  }

  /**
   * 清除所有选择
   */
  const clearSelection = (): void => {
    selection.value = {
      first: null,
      second: null
    }
  }

  /**
   * 交换两张照片的位置
   */
  const swapSelection = (): void => {
    if (selection.value.first && selection.value.second) {
      const temp = selection.value.first
      selection.value.first = selection.value.second
      selection.value.second = temp
    }
  }

  /**
   * 更新照片列表
   * @param newPhotos - 新的照片列表
   */
  const updatePhotos = (newPhotos: PhotoItem[]): void => {
    photoList.value = newPhotos
    // 清除不在新列表中的选择
    if (selection.value.first && !newPhotos.some(p => p.url === selection.value.first?.url)) {
      selection.value.first = null
    }
    if (selection.value.second && !newPhotos.some(p => p.url === selection.value.second?.url)) {
      selection.value.second = null
    }
  }

  /**
   * 按来源过滤照片
   * @param source - 来源类型
   * @returns 过滤后的照片列表
   */
  const filterBySource = (source: 'pickup' | 'return' | 'all'): PhotoItem[] => {
    if (source === 'all') {
      return photoList.value
    }
    return photoList.value.filter(p => p.source === source)
  }

  /**
   * 按时间排序照片
   * @param order - 排序顺序
   * @returns 排序后的照片列表
   */
  const sortByTime = (order: 'asc' | 'desc' = 'desc'): PhotoItem[] => {
    return [...photoList.value].sort((a, b) => {
      const timeA = new Date(a.takenAt).getTime()
      const timeB = new Date(b.takenAt).getTime()
      return order === 'asc' ? timeA - timeB : timeB - timeA
    })
  }

  return {
    // 状态
    selection,
    photoList,
    hasCompleteSelection,
    selectedCount,
    
    // 方法
    isSelected,
    getSelectionIndex,
    selectPhoto,
    deselectPhoto,
    clearSelection,
    swapSelection,
    updatePhotos,
    filterBySource,
    sortByTime
  }
}
