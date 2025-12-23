/**
 * 图片缓存 Hook
 * 自动从本地缓存加载图片，实现秒开效果
 *
 * @module hooks/useCachedImage
 */

import {useEffect, useState} from 'react'
import {getImageWithCache} from '@/utils/imageCache'

/**
 * 单张图片缓存 Hook
 * @param url - 图片URL
 * @returns 缓存后的图片URL（base64或原始URL）
 */
export function useCachedImage(url: string | null | undefined): string {
  const [cachedUrl, setCachedUrl] = useState<string>(url || '')

  useEffect(() => {
    if (!url) {
      setCachedUrl('')
      return
    }

    // 先显示原始URL，避免白屏
    setCachedUrl(url)

    // 异步获取缓存的图片
    getImageWithCache(url).then((cached) => {
      setCachedUrl(cached)
    })
  }, [url])

  return cachedUrl
}

/**
 * 多张图片缓存 Hook
 * @param urls - 图片URL数组
 * @returns 缓存后的图片URL数组
 */
export function useCachedImages(urls: string[]): string[] {
  const [cachedUrls, setCachedUrls] = useState<string[]>(urls)

  useEffect(() => {
    if (!urls || urls.length === 0) {
      setCachedUrls([])
      return
    }

    // 先显示原始URL，避免白屏
    setCachedUrls(urls)

    // 并行获取所有图片的缓存
    Promise.all(urls.map((url) => getImageWithCache(url))).then((cached) => {
      setCachedUrls(cached)
    })
  }, [urls.join(',')])

  return cachedUrls
}

export default useCachedImage
