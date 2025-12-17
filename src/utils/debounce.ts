/**
 * 防抖工具函数
 * 提供通用的防抖功能，用于限制高频函数调用
 *
 * 主要用途：
 * - 搜索输入框的实时搜索
 * - 窗口 resize 事件处理
 * - 表单输入验证
 * - API 请求节流
 *
 * @module utils/debounce
 */

/**
 * 防抖函数的返回类型
 * 包含防抖后的函数和取消方法
 *
 * @template T - 原始函数类型
 */
export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  /**
   * 防抖后的函数，调用时会延迟执行
   * @param args - 原始函数的参数
   */
  (...args: Parameters<T>): void

  /**
   * 取消待执行的防抖调用
   * 如果有待执行的调用，调用此方法后将不会执行
   */
  cancel: () => void

  /**
   * 立即执行待执行的防抖调用
   * 如果有待执行的调用，调用此方法后将立即执行
   */
  flush: () => void

  /**
   * 检查是否有待执行的调用
   * @returns 如果有待执行的调用返回 true，否则返回 false
   */
  pending: () => boolean
}

/**
 * 防抖配置选项
 */
export interface DebounceOptions {
  /**
   * 延迟时间（毫秒）
   * @default 300
   */
  delay?: number

  /**
   * 是否在延迟开始前立即执行一次
   * @default false
   */
  leading?: boolean

  /**
   * 是否在延迟结束后执行
   * @default true
   */
  trailing?: boolean

  /**
   * 最大等待时间（毫秒）
   * 如果设置，即使持续触发，也会在此时间后强制执行
   * @default undefined (无限制)
   */
  maxWait?: number
}

/**
 * 默认防抖延迟时间（毫秒）
 * 300ms 是搜索输入的推荐延迟时间
 */
export const DEFAULT_DEBOUNCE_DELAY = 300

/**
 * 创建防抖函数
 *
 * 防抖函数会延迟执行，在指定时间内多次调用只执行最后一次。
 * 适用于搜索输入、窗口 resize 等高频触发场景。
 *
 * @template T - 原始函数类型
 * @param fn - 要防抖的函数
 * @param options - 防抖配置选项或延迟时间（毫秒）
 * @returns 防抖后的函数，带有 cancel、flush 和 pending 方法
 *
 * @example
 * // 基本用法
 * const debouncedSearch = debounce(searchApi, 300)
 * debouncedSearch('query') // 300ms 后执行
 *
 * @example
 * // 使用配置选项
 * const debouncedSearch = debounce(searchApi, {
 *   delay: 500,
 *   leading: true,  // 立即执行第一次
 *   maxWait: 2000   // 最多等待 2 秒
 * })
 *
 * @example
 * // 取消防抖
 * const debouncedFn = debounce(fn, 300)
 * debouncedFn()
 * debouncedFn.cancel() // 取消待执行的调用
 *
 * @example
 * // 在 React 组件中使用
 * const debouncedSearch = useCallback(
 *   debounce((term: string) => {
 *     fetchResults(term)
 *   }, 300),
 *   []
 * )
 *
 * useEffect(() => {
 *   return () => debouncedSearch.cancel()
 * }, [debouncedSearch])
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: number | DebounceOptions
): DebouncedFunction<T> {
  // 解析配置选项
  const config: Required<Omit<DebounceOptions, 'maxWait'>> & Pick<DebounceOptions, 'maxWait'> =
    typeof options === 'number'
      ? {delay: options, leading: false, trailing: true, maxWait: undefined}
      : {
          delay: options?.delay ?? DEFAULT_DEBOUNCE_DELAY,
          leading: options?.leading ?? false,
          trailing: options?.trailing ?? true,
          maxWait: options?.maxWait
        }

  // 定时器 ID
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  // 最大等待定时器 ID
  let maxWaitTimeoutId: ReturnType<typeof setTimeout> | null = null

  // 最后一次调用的参数
  let lastArgs: Parameters<T> | null = null

  // 最后一次调用的上下文
  let lastThis: unknown = null

  // 上次执行时间
  let lastInvokeTime = 0

  // 是否已经在 leading 阶段执行过
  let leadingInvoked = false

  /**
   * 执行原始函数
   */
  const invokeFunc = (): void => {
    if (lastArgs === null) return

    const args = lastArgs
    const thisArg = lastThis

    // 重置状态
    lastArgs = null
    lastThis = null
    lastInvokeTime = Date.now()
    leadingInvoked = false

    // 执行原始函数
    fn.apply(thisArg, args)
  }

  /**
   * 清除所有定时器
   */
  const clearTimers = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (maxWaitTimeoutId !== null) {
      clearTimeout(maxWaitTimeoutId)
      maxWaitTimeoutId = null
    }
  }

  /**
   * 设置延迟执行定时器
   */
  const startTimer = (): void => {
    // 清除之前的定时器
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    // 设置新的定时器
    timeoutId = setTimeout(() => {
      timeoutId = null

      // 如果配置了 trailing，在延迟结束后执行
      if (config.trailing && lastArgs !== null) {
        invokeFunc()
      }

      // 清除最大等待定时器
      if (maxWaitTimeoutId !== null) {
        clearTimeout(maxWaitTimeoutId)
        maxWaitTimeoutId = null
      }
    }, config.delay)
  }

  /**
   * 设置最大等待定时器
   */
  const startMaxWaitTimer = (): void => {
    if (config.maxWait === undefined || maxWaitTimeoutId !== null) return

    maxWaitTimeoutId = setTimeout(() => {
      maxWaitTimeoutId = null

      // 强制执行
      if (lastArgs !== null) {
        // 清除普通定时器
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        invokeFunc()
      }
    }, config.maxWait)
  }

  /**
   * 防抖后的函数
   */
  const debouncedFn = function (this: unknown, ...args: Parameters<T>): void {
    // 保存调用参数和上下文
    lastArgs = args
    lastThis = this

    const now = Date.now()
    const timeSinceLastInvoke = now - lastInvokeTime

    // 判断是否应该在 leading 阶段执行
    const shouldInvokeLeading =
      config.leading && !leadingInvoked && (timeoutId === null || timeSinceLastInvoke >= config.delay)

    if (shouldInvokeLeading) {
      // 立即执行
      leadingInvoked = true
      lastInvokeTime = now
      fn.apply(this, args)
      lastArgs = null
      lastThis = null
    }

    // 启动延迟定时器
    startTimer()

    // 启动最大等待定时器（如果配置了）
    startMaxWaitTimer()
  } as DebouncedFunction<T>

  /**
   * 取消待执行的防抖调用
   */
  debouncedFn.cancel = (): void => {
    clearTimers()
    lastArgs = null
    lastThis = null
    leadingInvoked = false
  }

  /**
   * 立即执行待执行的防抖调用
   */
  debouncedFn.flush = (): void => {
    if (lastArgs !== null) {
      clearTimers()
      invokeFunc()
    }
  }

  /**
   * 检查是否有待执行的调用
   */
  debouncedFn.pending = (): boolean => {
    return timeoutId !== null || lastArgs !== null
  }

  return debouncedFn
}

/**
 * 创建简单的防抖函数（简化版本）
 *
 * 这是 debounce 函数的简化版本，只支持基本的延迟功能。
 * 适用于简单场景，不需要 leading、trailing、maxWait 等高级功能。
 *
 * @template T - 原始函数类型
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒），默认 300ms
 * @returns 防抖后的函数，带有 cancel 方法
 *
 * @example
 * const debouncedFn = simpleDebounce(fn, 300)
 * debouncedFn('arg1', 'arg2')
 * debouncedFn.cancel() // 取消
 */
export function simpleDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = DEFAULT_DEBOUNCE_DELAY
): {(...args: Parameters<T>): void; cancel: () => void} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debouncedFn = (...args: Parameters<T>): void => {
    // 清除之前的定时器
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    // 设置新的定时器
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }

  // 添加取消方法
  debouncedFn.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debouncedFn
}

/**
 * 节流函数
 *
 * 节流函数会限制函数的执行频率，在指定时间内最多执行一次。
 * 与防抖不同，节流保证函数会定期执行。
 *
 * @template T - 原始函数类型
 * @param fn - 要节流的函数
 * @param interval - 节流间隔（毫秒），默认 300ms
 * @returns 节流后的函数，带有 cancel 方法
 *
 * @example
 * const throttledScroll = throttle(handleScroll, 100)
 * window.addEventListener('scroll', throttledScroll)
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number = DEFAULT_DEBOUNCE_DELAY
): {(...args: Parameters<T>): void; cancel: () => void} {
  // 上次执行时间
  let lastExecTime = 0

  // 待执行的定时器
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  // 最后一次调用的参数
  let lastArgs: Parameters<T> | null = null

  const throttledFn = (...args: Parameters<T>): void => {
    const now = Date.now()
    const timeSinceLastExec = now - lastExecTime

    // 保存最新的参数
    lastArgs = args

    // 如果距离上次执行已经超过间隔，立即执行
    if (timeSinceLastExec >= interval) {
      lastExecTime = now
      fn(...args)
      lastArgs = null
      return
    }

    // 否则，设置定时器在剩余时间后执行
    if (timeoutId === null) {
      const remaining = interval - timeSinceLastExec
      timeoutId = setTimeout(() => {
        lastExecTime = Date.now()
        timeoutId = null
        if (lastArgs !== null) {
          fn(...lastArgs)
          lastArgs = null
        }
      }, remaining)
    }
  }

  // 添加取消方法
  throttledFn.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastArgs = null
  }

  return throttledFn
}
