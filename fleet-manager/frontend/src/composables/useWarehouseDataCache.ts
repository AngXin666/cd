/**
 * 仓库数据缓存 Composable
 * 提供数据预加载、缓存管理和无感切换功能
 * 
 * @module composables/useWarehouseDataCache
 * @requirements 1.2, 3.4
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { Warehouse } from '@/api/types'

// ==================== 类型定义 ====================

/**
 * 缓存项接口
 * 存储单个仓库的缓存数据和元信息
 * 
 * @template T - 缓存数据的类型
 */
export interface CacheItem<T> {
  /** 缓存的数据 */
  data: T
  
  /** 缓存时间戳（毫秒） */
  timestamp: number
  
  /** 是否正在加载 */
  loading: boolean
  
  /** 加载错误（如果有） */
  error: Error | null
}

/**
 * 仓库数据缓存配置选项
 * 
 * @template T - 仓库数据的类型
 */
export interface UseWarehouseDataCacheOptions<T> {
  /** 
   * 数据加载函数
   * 接收仓库 ID，返回该仓库的数据
   * @param warehouseId - 仓库 ID
   * @returns Promise<T> - 仓库数据
   */
  loadDataFn: (warehouseId: number) => Promise<T>
  
  /** 仓库列表（响应式引用） */
  warehouses: Ref<Warehouse[]>
  
  /** 当前仓库索引（响应式引用） */
  currentIndex: Ref<number>
  
  /** 
   * 缓存过期时间（毫秒）
   * @default 300000 (5 分钟)
   */
  cacheExpiry?: number
  
  /** 
   * 是否启用后台预加载
   * @default true
   */
  enablePreload?: boolean
}

/**
 * 仓库数据缓存返回值接口
 * 
 * @template T - 仓库数据的类型
 */
export interface UseWarehouseDataCacheReturn<T> {
  /** 当前仓库的数据（计算属性） */
  currentData: ComputedRef<T | null>
  
  /** 当前仓库的错误状态（计算属性） */
  currentError: ComputedRef<Error | null>
  
  /** 是否正在加载当前仓库数据 */
  isLoading: Ref<boolean>
  
  /** 是否正在后台预加载其他仓库数据 */
  isPreloading: Ref<boolean>
  
  /** 预加载进度（0-100） */
  preloadProgress: ComputedRef<number>
  
  /** 
   * 切换仓库
   * @param index - 目标仓库索引
   */
  switchWarehouse: (index: number) => Promise<void>
  
  /** 刷新当前仓库数据 */
  refreshCurrent: () => Promise<void>
  
  /** 刷新所有仓库数据 */
  refreshAll: () => Promise<void>
  
  /** 清空缓存 */
  clearCache: () => void
  
  /** 
   * 获取指定仓库的数据
   * @param warehouseId - 仓库 ID
   * @returns 仓库数据或 null
   */
  getWarehouseData: (warehouseId: number) => T | null
  
  /** 
   * 检查指定仓库是否已缓存
   * @param warehouseId - 仓库 ID
   * @returns 是否已缓存
   */
  isCached: (warehouseId: number) => boolean
}

// ==================== Composable 实现 ====================

/**
 * 仓库数据缓存 Composable
 * 
 * 提供统一的仓库数据管理接口，支持：
 * - 数据预加载：页面初始化时预加载所有仓库数据
 * - 缓存管理：将已加载的数据缓存在内存中
 * - 无感切换：切换仓库时直接从缓存读取，无需等待加载
 * - 自动更新：定期检查并更新过期的缓存数据
 * 
 * @template T - 仓库数据的类型
 * @param options - 配置选项
 * @returns 缓存管理接口
 * 
 * @requirements 1.2, 3.4
 */
export function useWarehouseDataCache<T>(
  options: UseWarehouseDataCacheOptions<T>
): UseWarehouseDataCacheReturn<T> {
  // 解构配置，设置默认值
  const {
    loadDataFn,
    warehouses,
    currentIndex,
    cacheExpiry = 5 * 60 * 1000, // 默认 5 分钟
    enablePreload = true,
  } = options

  // ==================== 状态定义 ====================

  /** 缓存存储（使用 Map 结构，key 为仓库 ID） */
  const cache = ref<Map<number, CacheItem<T>>>(new Map())
  
  /** 是否正在加载当前仓库数据 */
  const isLoading = ref(false)
  
  /** 是否正在后台预加载其他仓库数据 */
  const isPreloading = ref(false)
  
  /** 已预加载的仓库数量 */
  const preloadedCount = ref(0)

  // ==================== 计算属性 ====================

  /**
   * 当前仓库的数据
   * 根据当前索引从缓存中获取数据
   */
  const currentData = computed<T | null>(() => {
    const currentWarehouse = warehouses.value[currentIndex.value]
    if (!currentWarehouse) return null
    
    const cacheItem = cache.value.get(currentWarehouse.id)
    return (cacheItem?.data as T) || null
  })

  /**
   * 当前仓库的错误状态
   * 根据当前索引从缓存中获取错误信息
   * 
   * @requirements 6.2 - 错误仓库显示重试选项
   */
  const currentError = computed<Error | null>(() => {
    const currentWarehouse = warehouses.value[currentIndex.value]
    if (!currentWarehouse) return null
    
    const cacheItem = cache.value.get(currentWarehouse.id)
    return cacheItem?.error || null
  })

  /**
   * 预加载进度（百分比）
   * 计算已预加载的仓库数量占总仓库数量的百分比
   */
  const preloadProgress = computed(() => {
    if (warehouses.value.length === 0) return 0
    return Math.round((preloadedCount.value / warehouses.value.length) * 100)
  })

  // ==================== 工具函数 ====================

  /**
   * 检查缓存是否过期
   * 
   * @param timestamp - 缓存时间戳
   * @returns 是否过期
   * @requirements 3.4
   */
  function isCacheExpired(timestamp: number): boolean {
    return Date.now() - timestamp > cacheExpiry
  }

  /**
   * 检查指定仓库是否已缓存
   * 
   * 判断条件：
   * 1. 缓存项存在
   * 2. 没有错误
   * 3. 未过期
   * 
   * @param warehouseId - 仓库 ID
   * @returns 是否已缓存
   * @requirements 1.2
   */
  function isCached(warehouseId: number): boolean {
    const cacheItem = cache.value.get(warehouseId)
    return !!cacheItem && !cacheItem.error && !isCacheExpired(cacheItem.timestamp)
  }

  /**
   * 获取指定仓库的数据
   * 
   * @param warehouseId - 仓库 ID
   * @returns 仓库数据或 null
   */
  function getWarehouseData(warehouseId: number): T | null {
    const cacheItem = cache.value.get(warehouseId)
    return (cacheItem?.data as T) || null
  }

  // ==================== 核心方法 ====================

  /**
   * 加载单个仓库数据
   * 
   * 该函数负责加载指定仓库的数据并更新缓存。
   * 支持静默模式，用于后台预加载时不显示错误提示。
   * 
   * 流程：
   * 1. 设置缓存项的 loading 状态为 true
   * 2. 调用 loadDataFn 加载数据
   * 3. 成功：更新缓存数据和时间戳，清除错误
   * 4. 失败：记录错误到缓存，非静默模式下显示提示
   * 
   * @param warehouseId - 仓库 ID
   * @param silent - 是否静默模式（不显示错误提示），默认 false
   * @returns Promise<void>
   * 
   * @requirements 1.1, 1.3, 6.1
   */
  async function loadWarehouse(
    warehouseId: number,
    silent = false
  ): Promise<void> {
    try {
      // 获取现有缓存项（如果存在）
      const existingItem = cache.value.get(warehouseId)
      
      // 设置加载状态
      // 保留现有数据和时间戳，避免加载过程中数据丢失
      const loadingItem: CacheItem<T> = {
        data: (existingItem?.data || {}) as T,
        timestamp: existingItem?.timestamp || 0,
        loading: true,
        error: null,
      }
      cache.value.set(warehouseId, loadingItem as any)

      // 调用数据加载函数
      const data = await loadDataFn(warehouseId)

      // 更新缓存：存储新数据、更新时间戳、清除加载状态和错误
      const successItem: CacheItem<T> = {
        data: data as T,
        timestamp: Date.now(),
        loading: false,
        error: null,
      }
      cache.value.set(warehouseId, successItem as any)

      // 记录成功日志
      console.log(`[Cache] 仓库 ${warehouseId} 数据已加载`)
    } catch (error) {
      // 记录错误日志
      console.error(`[Cache] 仓库 ${warehouseId} 加载失败:`, error)

      // 将错误记录到缓存中
      const errorItem: CacheItem<T> = {
        data: {} as T,
        timestamp: 0,
        loading: false,
        error: error as Error,
      }
      cache.value.set(warehouseId, errorItem as any)

      // 非静默模式下显示错误提示
      if (!silent) {
        uni.showToast({
          title: '数据加载失败',
          icon: 'none',
        })
      }
    }
  }

  /**
   * 预加载所有仓库数据
   * 
   * 该函数负责并发加载所有仓库的数据，用于页面初始化时的后台预加载。
   * 使用静默模式加载，不会显示错误提示，避免干扰用户体验。
   * 
   * 特点：
   * - 并发加载：使用 Promise.allSettled 同时加载所有仓库
   * - 容错性：某个仓库失败不影响其他仓库的加载
   * - 进度跟踪：实时更新 preloadedCount 和 preloadProgress
   * - 静默模式：加载失败时不显示 UI 提示
   * 
   * 流程：
   * 1. 检查是否启用预加载和仓库列表是否为空
   * 2. 设置预加载状态为 true
   * 3. 重置预加载计数器
   * 4. 并发加载所有仓库数据（静默模式）
   * 5. 每完成一个仓库，增加计数器
   * 6. 等待所有加载完成（无论成功或失败）
   * 7. 记录预加载完成日志
   * 8. 设置预加载状态为 false
   * 
   * @returns Promise<void>
   * 
   * @requirements 1.1, 1.2, 1.3, 5.4
   */
  async function preloadAll(): Promise<void> {
    // 检查是否启用预加载
    if (!enablePreload) {
      console.log('[Cache] 预加载已禁用')
      return
    }

    // 检查仓库列表是否为空
    if (warehouses.value.length === 0) {
      console.log('[Cache] 仓库列表为空，跳过预加载')
      return
    }

    // 设置预加载状态
    isPreloading.value = true
    preloadedCount.value = 0

    console.log(`[Cache] 开始预加载 ${warehouses.value.length} 个仓库`)

    // 并发加载所有仓库数据
    // 使用 Promise.allSettled 确保所有请求都完成（无论成功或失败）
    // 使用静默模式（silent = true）避免显示错误提示
    const promises = warehouses.value.map(async (warehouse) => {
      await loadWarehouse(warehouse.id, true)
      // 每完成一个仓库，增加计数器
      preloadedCount.value++
    })

    // 等待所有加载完成
    await Promise.allSettled(promises)

    // 设置预加载状态为 false
    isPreloading.value = false

    // 记录预加载完成日志（不显示 UI 提示）
    console.log(`[Cache] 预加载完成，成功 ${preloadedCount.value}/${warehouses.value.length}`)
  }

  /**
   * 切换仓库
   * 
   * 该函数负责切换到指定索引的仓库，并根据缓存状态决定是否需要加载数据。
   * 这是实现无感切换的核心函数。
   * 
   * 切换策略：
   * - 缓存命中：直接切换索引，立即显示数据，不显示加载状态
   * - 缓存未命中：显示加载状态，加载数据后再切换索引
   * 
   * 流程：
   * 1. 获取目标仓库对象
   * 2. 检查目标仓库是否已缓存（使用 isCached 函数）
   * 3. 如果已缓存：
   *    - 记录缓存命中日志
   *    - 直接更新 currentIndex（无感切换）
   *    - 立即返回（不显示加载状态）
   * 4. 如果未缓存：
   *    - 记录缓存未命中日志
   *    - 设置 isLoading 为 true（显示加载状态）
   *    - 调用 loadWarehouse 加载数据（非静默模式）
   *    - 加载完成后更新 currentIndex
   *    - 设置 isLoading 为 false
   * 
   * @param index - 目标仓库索引
   * @returns Promise<void>
   * 
   * @requirements 1.4, 2.1, 2.2, 2.3, 2.4
   */
  async function switchWarehouse(index: number): Promise<void> {
    // 获取目标仓库对象
    const warehouse = warehouses.value[index]
    
    // 如果目标仓库不存在，直接返回
    if (!warehouse) {
      console.warn(`[Cache] 仓库索引 ${index} 不存在`)
      return
    }

    // 检查目标仓库是否已缓存
    if (isCached(warehouse.id)) {
      // 缓存命中：直接切换，无需加载
      console.log(`[Cache] 缓存命中，仓库 ${warehouse.id} (${warehouse.name})`)
      
      // 直接更新当前索引，实现无感切换
      currentIndex.value = index
      
      // 立即返回，不显示加载状态
      return
    }

    // 缓存未命中：需要加载数据
    console.log(`[Cache] 缓存未命中，加载仓库 ${warehouse.id} (${warehouse.name})`)
    
    // 显示加载状态
    isLoading.value = true

    try {
      // 加载仓库数据（非静默模式，失败时会显示错误提示）
      await loadWarehouse(warehouse.id, false)
      
      // 加载成功后更新当前索引
      currentIndex.value = index
    } finally {
      // 无论成功或失败，都要清除加载状态
      isLoading.value = false
    }
  }

  /**
   * 刷新当前仓库数据
   * 
   * 该函数负责重新加载当前仓库的数据，用于用户手动刷新或数据过期时更新。
   * 会显示加载状态，让用户知道正在刷新数据。
   * 
   * 流程：
   * 1. 获取当前仓库对象
   * 2. 如果当前仓库不存在，直接返回
   * 3. 设置 isLoading 为 true（显示加载状态）
   * 4. 调用 loadWarehouse 重新加载数据（非静默模式）
   * 5. 加载完成后清除加载状态
   * 
   * @returns Promise<void>
   * 
   * @requirements 3.2
   */
  async function refreshCurrent(): Promise<void> {
    // 获取当前仓库对象
    const currentWarehouse = warehouses.value[currentIndex.value]
    
    // 如果当前仓库不存在，直接返回
    if (!currentWarehouse) {
      console.warn('[Cache] 当前仓库不存在，无法刷新')
      return
    }

    console.log(`[Cache] 刷新当前仓库 ${currentWarehouse.id} (${currentWarehouse.name})`)

    // 显示加载状态
    isLoading.value = true

    try {
      // 重新加载当前仓库数据（非静默模式，失败时会显示错误提示）
      await loadWarehouse(currentWarehouse.id, false)
    } finally {
      // 无论成功或失败，都要清除加载状态
      isLoading.value = false
    }
  }

  /**
   * 刷新所有仓库数据
   * 
   * 该函数负责清空所有缓存并重新加载所有仓库的数据。
   * 用于用户手动下拉刷新或收到仓库分配变更事件时。
   * 
   * 刷新策略：
   * 1. 先清空所有缓存（调用 clearCache）
   * 2. 优先加载当前仓库数据（显示加载状态）
   * 3. 后台预加载其他仓库数据（不显示加载状态）
   * 
   * 这种策略确保：
   * - 用户能快速看到当前仓库的最新数据
   * - 其他仓库在后台静默加载，不影响用户体验
   * - 下次切换仓库时能立即显示数据
   * 
   * 流程：
   * 1. 清空所有缓存
   * 2. 获取当前仓库对象
   * 3. 如果当前仓库存在：
   *    - 设置 isLoading 为 true
   *    - 加载当前仓库数据（非静默模式）
   *    - 清除加载状态
   * 4. 如果启用预加载：
   *    - 后台预加载其他仓库数据（静默模式）
   * 
   * @returns Promise<void>
   * 
   * @requirements 3.2
   */
  async function refreshAll(): Promise<void> {
    console.log('[Cache] 刷新所有仓库数据')
    
    // 1. 清空所有缓存
    clearCache()
    
    // 2. 获取当前仓库对象
    const currentWarehouse = warehouses.value[currentIndex.value]
    
    // 3. 先加载当前仓库数据（显示加载状态）
    if (currentWarehouse) {
      isLoading.value = true
      
      try {
        await loadWarehouse(currentWarehouse.id, false)
      } finally {
        isLoading.value = false
      }
    }

    // 4. 后台预加载其他仓库数据（不显示加载状态）
    if (enablePreload) {
      // 不等待预加载完成，让它在后台运行
      preloadAll()
    }
  }

  /**
   * 清空缓存
   * 
   * 该函数负责清空所有缓存数据和状态，用于刷新所有数据或重置缓存。
   * 
   * 操作：
   * 1. 清空缓存 Map（删除所有缓存项）
   * 2. 重置预加载计数器为 0
   * 3. 记录清空日志
   * 
   * 注意：此函数不会重新加载数据，只是清空缓存。
   * 通常配合 refreshAll 使用，先清空缓存再重新加载。
   * 
   * @requirements 3.2
   */
  function clearCache(): void {
    // 清空缓存 Map
    cache.value.clear()
    
    // 重置预加载计数器
    preloadedCount.value = 0
    
    // 记录清空日志
    console.log('[Cache] 缓存已清空')
  }

  /**
   * 后台更新过期缓存
   * 
   * 该函数负责查找所有过期的缓存项并在后台静默更新它们。
   * 用于定期检查缓存，确保用户看到的数据不会太旧。
   * 
   * 特点：
   * - 静默更新：不显示任何加载状态或错误提示
   * - 后台运行：不阻塞用户交互
   * - 容错性：某个仓库更新失败不影响其他仓库
   * - 智能过滤：只更新已缓存且过期的仓库
   * 
   * 流程：
   * 1. 遍历所有仓库，查找过期的缓存项
   * 2. 过滤条件：
   *    - 缓存项存在
   *    - 缓存时间戳已过期（超过 cacheExpiry）
   * 3. 如果没有过期缓存，直接返回
   * 4. 并发更新所有过期缓存（静默模式）
   * 5. 记录更新完成日志
   * 
   * @returns Promise<void>
   * 
   * @requirements 3.4, 4.4
   */
  async function updateExpiredCache(): Promise<void> {
    // 1. 查找所有过期的缓存项
    const expiredWarehouses = warehouses.value.filter((warehouse) => {
      const cacheItem = cache.value.get(warehouse.id)
      
      // 检查缓存项是否存在且已过期
      return cacheItem && isCacheExpired(cacheItem.timestamp)
    })

    // 2. 如果没有过期缓存，直接返回
    if (expiredWarehouses.length === 0) {
      return
    }

    // 记录后台更新日志
    console.log(`[Cache] 后台更新 ${expiredWarehouses.length} 个过期缓存`)

    // 3. 并发更新所有过期缓存
    // 使用静默模式（silent = true）：
    // - 不显示加载状态
    // - 不显示错误提示
    // - 不影响用户体验
    const promises = expiredWarehouses.map((warehouse) =>
      loadWarehouse(warehouse.id, true)
    )

    // 4. 等待所有更新完成（无论成功或失败）
    await Promise.allSettled(promises)

    // 记录更新完成日志
    console.log(`[Cache] 后台更新完成`)
  }

  // ==================== 生命周期钩子 ====================

  /**
   * 定时器 ID（用于清理）
   */
  let updateInterval: number | null = null

  /**
   * 组件挂载时初始化
   * 
   * 该钩子负责初始化缓存和设置定时器。
   * 
   * 初始化流程：
   * 1. 先加载当前仓库数据（显示加载状态）
   *    - 确保用户能快速看到当前仓库的数据
   *    - 显示加载状态，让用户知道正在加载
   * 2. 延迟 500ms 后台预加载其他仓库数据
   *    - 避免阻塞当前仓库的渲染
   *    - 确保用户能快速看到当前仓库的数据
   *    - 后台静默加载，不影响用户体验
   * 3. 设置缓存过期检查定时器
   *    - 每 1 分钟检查并更新过期缓存
   *    - 确保用户看到的数据不会太旧
   * 
   * 定时器设置：
   * - 每 1 分钟检查并更新过期缓存
   * - 在 onUnmounted 中清理定时器
   * 
   * @requirements 3.4, 5.1, 5.2
   */
  onMounted(async () => {
    console.log('[Cache] 开始初始化')

    // ==================== 步骤 1：加载当前仓库数据 ====================
    
    // 获取当前仓库对象
    const currentWarehouse = warehouses.value[currentIndex.value]
    
    // 如果当前仓库存在，先加载它的数据
    if (currentWarehouse) {
      console.log(`[Cache] 加载当前仓库 ${currentWarehouse.id} (${currentWarehouse.name})`)
      
      // 显示加载状态，让用户知道正在加载
      isLoading.value = true
      
      try {
        // 加载当前仓库数据（非静默模式，失败时会显示错误提示）
        await loadWarehouse(currentWarehouse.id, false)
        
        console.log('[Cache] 当前仓库数据加载完成')
      } catch (error) {
        // 错误已在 loadWarehouse 中处理，这里只记录日志
        console.error('[Cache] 当前仓库数据加载失败:', error)
      } finally {
        // 无论成功或失败，都要清除加载状态
        isLoading.value = false
      }
    } else {
      console.warn('[Cache] 当前仓库不存在，跳过初始加载')
    }

    // ==================== 步骤 2：延迟预加载其他仓库 ====================
    
    // 延迟 500ms 开始预加载，避免阻塞当前仓库的渲染
    // 这样可以确保用户能快速看到当前仓库的数据
    // 其他仓库在后台静默加载，不影响用户体验
    if (enablePreload && warehouses.value.length > 1) {
      console.log('[Cache] 将在 500ms 后开始预加载其他仓库')
      
      setTimeout(() => {
        console.log('[Cache] 开始后台预加载其他仓库')
        
        // 调用预加载函数
        // 注意：这是一个异步函数，但我们不需要等待它完成
        // 它会在后台静默运行，不影响用户体验
        preloadAll()
      }, 500)
    } else if (!enablePreload) {
      console.log('[Cache] 预加载已禁用，跳过预加载')
    } else if (warehouses.value.length <= 1) {
      console.log('[Cache] 只有一个仓库，跳过预加载')
    }

    // ==================== 步骤 3：设置缓存过期检查定时器 ====================
    
    // 设置定时器：每 1 分钟检查并更新过期缓存
    // 60 * 1000 = 60000 毫秒 = 1 分钟
    updateInterval = setInterval(() => {
      // 调用后台更新函数
      // 注意：这是一个异步函数，但我们不需要等待它完成
      // 它会在后台静默运行，不影响用户体验
      updateExpiredCache()
    }, 60 * 1000) as unknown as number

    console.log('[Cache] 定时器已设置，每 1 分钟检查过期缓存')
    console.log('[Cache] 初始化完成')
  })

  /**
   * 组件卸载时清理
   * 
   * 该钩子负责清理定时器，避免内存泄漏。
   * 
   * 操作：
   * 1. 检查定时器是否存在
   * 2. 如果存在，清除定时器
   * 3. 重置定时器 ID
   * 4. 记录清理日志
   * 
   * @requirements 3.4
   */
  onUnmounted(() => {
    // 清理定时器
    if (updateInterval !== null) {
      clearInterval(updateInterval)
      updateInterval = null
      console.log('[Cache] 定时器已清理')
    }
  })

  // ==================== 返回接口 ====================

  return {
    currentData,
    currentError,
    isLoading,
    isPreloading,
    preloadProgress,
    switchWarehouse,
    refreshCurrent,
    refreshAll,
    clearCache,
    getWarehouseData,
    isCached,
  }
}
