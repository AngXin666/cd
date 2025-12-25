/**
 * 照片对比工具函数
 * 提供照片角度匹配和对比相关的工具方法
 * @module utils/photoCompare
 */

import type { PhotoItem, PhotoAngle, PhotoSource } from '@/components/PhotoCompare/types'
import { ANGLE_LABELS } from '@/components/PhotoCompare/types'

/**
 * 照片角度顺序
 * 定义 7 张基本照片的标准顺序
 */
export const ANGLE_ORDER: PhotoAngle[] = [
  'left_front',
  'right_front',
  'left_rear',
  'right_rear',
  'dashboard',
  'rear_door',
  'cargo_box'
]

/**
 * 按角度分组照片
 * 将照片列表按角度分组，便于对比
 * @param photos - 照片列表
 * @returns 按角度分组的照片映射
 */
export function groupPhotosByAngle(photos: PhotoItem[]): Map<PhotoAngle, PhotoItem[]> {
  const grouped = new Map<PhotoAngle, PhotoItem[]>()
  
  // 初始化所有角度
  ANGLE_ORDER.forEach(angle => {
    grouped.set(angle, [])
  })
  
  // 分组照片
  photos.forEach(photo => {
    if (photo.angle) {
      const list = grouped.get(photo.angle) || []
      list.push(photo)
      grouped.set(photo.angle, list)
    }
  })
  
  return grouped
}

/**
 * 获取可对比的角度列表
 * 返回同时有提车和还车照片的角度
 * @param photos - 照片列表
 * @returns 可对比的角度列表
 */
export function getComparableAngles(photos: PhotoItem[]): PhotoAngle[] {
  const grouped = groupPhotosByAngle(photos)
  const comparableAngles: PhotoAngle[] = []
  
  ANGLE_ORDER.forEach(angle => {
    const anglePhotos = grouped.get(angle) || []
    const hasPickup = anglePhotos.some(p => p.source === 'pickup')
    const hasReturn = anglePhotos.some(p => p.source === 'return')
    
    if (hasPickup && hasReturn) {
      comparableAngles.push(angle)
    }
  })
  
  return comparableAngles
}

/**
 * 自动匹配对比照片
 * 根据角度自动匹配提车和还车照片
 * @param photos - 照片列表
 * @param angle - 要匹配的角度
 * @returns 匹配的照片对，如果无法匹配则返回 null
 */
export function matchPhotosByAngle(
  photos: PhotoItem[], 
  angle: PhotoAngle
): { pickup: PhotoItem; return: PhotoItem } | null {
  const anglePhotos = photos.filter(p => p.angle === angle)
  
  const pickupPhoto = anglePhotos.find(p => p.source === 'pickup')
  const returnPhoto = anglePhotos.find(p => p.source === 'return')
  
  if (pickupPhoto && returnPhoto) {
    return {
      pickup: pickupPhoto,
      return: returnPhoto
    }
  }
  
  return null
}

/**
 * 获取所有可匹配的照片对
 * 返回所有角度的提车/还车照片对
 * @param photos - 照片列表
 * @returns 所有可匹配的照片对
 */
export function getAllMatchedPairs(
  photos: PhotoItem[]
): Array<{ angle: PhotoAngle; pickup: PhotoItem; return: PhotoItem }> {
  const pairs: Array<{ angle: PhotoAngle; pickup: PhotoItem; return: PhotoItem }> = []
  
  ANGLE_ORDER.forEach(angle => {
    const matched = matchPhotosByAngle(photos, angle)
    if (matched) {
      pairs.push({
        angle,
        ...matched
      })
    }
  })
  
  return pairs
}

/**
 * 获取角度的中文标签
 * @param angle - 角度枚举值
 * @returns 中文标签
 */
export function getAngleLabel(angle: PhotoAngle): string {
  return ANGLE_LABELS[angle] || angle
}

/**
 * 获取来源的中文标签
 * @param source - 来源枚举值
 * @returns 中文标签
 */
export function getSourceLabel(source: PhotoSource): string {
  const labels: Record<PhotoSource, string> = {
    pickup: '提车',
    return: '还车'
  }
  return labels[source] || source
}

/**
 * 按来源分组照片
 * 将照片列表按来源（提车/还车）分组
 * @param photos - 照片列表
 * @returns 按来源分组的照片
 */
export function groupPhotosBySource(photos: PhotoItem[]): {
  pickup: PhotoItem[]
  return: PhotoItem[]
} {
  return {
    pickup: photos.filter(p => p.source === 'pickup'),
    return: photos.filter(p => p.source === 'return')
  }
}

/**
 * 验证照片是否为基本照片（有角度信息）
 * @param photo - 照片项
 * @returns 是否为基本照片
 */
export function isBasicPhoto(photo: PhotoItem): boolean {
  return !!photo.angle && ANGLE_ORDER.includes(photo.angle)
}

/**
 * 验证照片是否为车损照片（无角度信息）
 * @param photo - 照片项
 * @returns 是否为车损照片
 */
export function isDamagePhoto(photo: PhotoItem): boolean {
  return !photo.angle
}

/**
 * 过滤基本照片
 * @param photos - 照片列表
 * @returns 基本照片列表
 */
export function filterBasicPhotos(photos: PhotoItem[]): PhotoItem[] {
  return photos.filter(isBasicPhoto)
}

/**
 * 过滤车损照片
 * @param photos - 照片列表
 * @returns 车损照片列表
 */
export function filterDamagePhotos(photos: PhotoItem[]): PhotoItem[] {
  return photos.filter(isDamagePhoto)
}

/**
 * 计算照片对比统计
 * @param photos - 照片列表
 * @returns 统计信息
 */
export function getCompareStats(photos: PhotoItem[]): {
  totalPhotos: number
  basicPhotos: number
  damagePhotos: number
  comparableAngles: number
  pickupPhotos: number
  returnPhotos: number
} {
  const basicPhotos = filterBasicPhotos(photos)
  const damagePhotos = filterDamagePhotos(photos)
  const comparableAngles = getComparableAngles(photos)
  const { pickup, return: returnPhotos } = groupPhotosBySource(photos)
  
  return {
    totalPhotos: photos.length,
    basicPhotos: basicPhotos.length,
    damagePhotos: damagePhotos.length,
    comparableAngles: comparableAngles.length,
    pickupPhotos: pickup.length,
    returnPhotos: returnPhotos.length
  }
}
