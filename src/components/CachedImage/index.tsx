/**
 * 带本地缓存的图片组件
 * 自动将图片缓存到 IndexedDB，实现秒开效果
 * 适用于不会改变的图片（如车辆照片、证件照片等）
 *
 * @module components/CachedImage
 */

import {Image} from '@tarojs/components'
import type {ImageProps} from '@tarojs/components'
import {useEffect, useState} from 'react'
import {getImageWithCache} from '@/utils/imageCache'

/** CachedImage 组件属性 */
interface CachedImageProps extends Omit<ImageProps, 'src'> {
  /** 图片URL */
  src: string
  /** 是否启用缓存，默认 true */
  enableCache?: boolean
  /** 缓存过期时间（毫秒），默认30天 */
  cacheTTL?: number
}

/**
 * 带本地缓存的图片组件
 *
 * @example
 * ```tsx
 * <CachedImage
 *   src="https://example.com/image.jpg"
 *   mode="aspectFit"
 *   className="w-full h-full"
 * />
 * ```
 */
export function CachedImage({src, enableCache = true, cacheTTL, ...props}: CachedImageProps) {
  // 缓存后的图片URL（base64或原始URL）
  const [cachedSrc, setCachedSrc] = useState<string>(src)

  useEffect(() => {
    if (!src) {
      setCachedSrc('')
      return
    }

    // 如果不启用缓存，直接使用原始URL
    if (!enableCache) {
      setCachedSrc(src)
      return
    }

    // 先显示原始URL，避免白屏
    setCachedSrc(src)

    // 异步获取缓存的图片（缓存命中时会替换为 base64）
    getImageWithCache(src, cacheTTL).then((cached) => {
      setCachedSrc(cached)
    })
  }, [src, enableCache, cacheTTL])

  return <Image {...props} src={cachedSrc} />
}

export default CachedImage
