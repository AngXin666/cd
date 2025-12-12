/**
 * useLoading Hook
 *
 * @description 提供loading状态管理的Hook
 * @module hooks/useLoading
 *
 * @example
 * ```typescript
 * const {loading, withLoading} = useLoading()
 *
 * const handleSubmit = async () => {
 *   await withLoading(async () => {
 *     await submitData()
 *   })
 * }
 *
 * return <Loading loading={loading}>Content</Loading>
 * ```
 */

import {useCallback, useState} from 'react'

export interface UseLoadingReturn {
  /** 当前loading状态 */
  loading: boolean
  /** 设置loading状态 */
  setLoading: (loading: boolean) => void
  /** 包装异步函数，自动管理loading状态 */
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>
  /** 开始loading */
  startLoading: () => void
  /** 结束loading */
  stopLoading: () => void
}

/**
 * useLoading Hook
 * 提供loading状态管理
 */
export function useLoading(initialLoading: boolean = false): UseLoadingReturn {
  const [loading, setLoading] = useState(initialLoading)

  const startLoading = useCallback(() => {
    setLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    setLoading(false)
  }, [])

  const withLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true)
      const result = await fn()
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    setLoading,
    withLoading,
    startLoading,
    stopLoading
  }
}

/**
 * useGlobalLoading Hook
 * 使用全局loading（Taro.showLoading）
 */
export function useGlobalLoading() {
  const [loading, setLoading] = useState(false)

  const showLoading = useCallback((title: string = '加载中...') => {
    setLoading(true)
    // 这里可以调用全局loading管理器
    // showGlobalLoading(title)
  }, [])

  const hideLoading = useCallback(() => {
    setLoading(false)
    // hideGlobalLoading()
  }, [])

  const withLoading = useCallback(async <T,>(fn: () => Promise<T>, title?: string): Promise<T> => {
    try {
      showLoading(title)
      const result = await fn()
      return result
    } finally {
      hideLoading()
    }
  }, [showLoading, hideLoading])

  return {
    loading,
    showLoading,
    hideLoading,
    withLoading
  }
}
