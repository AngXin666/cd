# 设计文档：仓库切换无感优化

## 概述

本设计文档描述了如何优化仓库切换体验，通过数据预加载和缓存策略实现无感切换，消除切换时的"加载中"闪动问题。

## 架构

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      页面组件层                          │
│  (boss/index, manager/index, driver/index, etc.)       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 使用
                 ↓
┌─────────────────────────────────────────────────────────┐
│                  Composable 层                          │
│              useWarehouseDataCache                      │
│  - 数据预加载                                            │
│  - 缓存管理                                              │
│  - 切换逻辑                                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 调用
                 ↓
┌─────────────────────────────────────────────────────────┐
│                    API 层                               │
│  - 统计数据 API                                          │
│  - 仓库列表 API                                          │
└─────────────────────────────────────────────────────────┘
```

### 数据流

```
1. 页面初始化
   ↓
2. 加载当前仓库数据（显示加载状态）
   ↓
3. 显示当前仓库数据
   ↓
4. 后台预加载其他仓库数据（不显示加载状态）
   ↓
5. 用户切换仓库
   ↓
6. 从缓存读取数据（无加载状态）
   ↓
7. 立即显示数据
```

## 组件和接口

### 1. Composable: useWarehouseDataCache

这是核心的数据缓存和管理 composable，提供统一的仓库数据管理接口。

```typescript
/**
 * 仓库数据缓存 Composable
 * 提供数据预加载、缓存管理和无感切换功能
 */
interface UseWarehouseDataCacheOptions<T> {
  /** 数据加载函数，接收仓库 ID，返回该仓库的数据 */
  loadDataFn: (warehouseId: number) => Promise<T>
  
  /** 仓库列表 */
  warehouses: Ref<Warehouse[]>
  
  /** 当前仓库索引 */
  currentIndex: Ref<number>
  
  /** 缓存过期时间（毫秒），默认 5 分钟 */
  cacheExpiry?: number
  
  /** 是否启用后台预加载，默认 true */
  enablePreload?: boolean
}

interface UseWarehouseDataCacheReturn<T> {
  /** 当前仓库的数据 */
  currentData: ComputedRef<T | null>
  
  /** 是否正在加载当前仓库数据 */
  isLoading: Ref<boolean>
  
  /** 是否正在后台预加载其他仓库数据 */
  isPreloading: Ref<boolean>
  
  /** 预加载进度（0-100） */
  preloadProgress: ComputedRef<number>
  
  /** 切换仓库 */
  switchWarehouse: (index: number) => Promise<void>
  
  /** 刷新当前仓库数据 */
  refreshCurrent: () => Promise<void>
  
  /** 刷新所有仓库数据 */
  refreshAll: () => Promise<void>
  
  /** 清空缓存 */
  clearCache: () => void
  
  /** 获取指定仓库的数据 */
  getWarehouseData: (warehouseId: number) => T | null
  
  /** 检查指定仓库是否已缓存 */
  isCached: (warehouseId: number) => boolean
}

function useWarehouseDataCache<T>(
  options: UseWarehouseDataCacheOptions<T>
): UseWarehouseDataCacheReturn<T>
```

### 2. 缓存数据结构

```typescript
/**
 * 缓存项
 */
interface CacheItem<T> {
  /** 缓存的数据 */
  data: T
  
  /** 缓存时间戳 */
  timestamp: number
  
  /** 是否正在加载 */
  loading: boolean
  
  /** 加载错误 */
  error: Error | null
}

/**
 * 缓存存储
 * Key: 仓库 ID
 * Value: 缓存项
 */
type CacheStore<T> = Map<number, CacheItem<T>>
```

### 3. 页面集成接口

页面组件需要实现以下接口来使用缓存功能：

```typescript
/**
 * 页面数据加载函数
 * 每个页面需要提供自己的数据加载逻辑
 */
interface PageDataLoader {
  /**
   * 加载指定仓库的数据
   * @param warehouseId - 仓库 ID
   * @returns 该仓库的统计数据
   */
  loadWarehouseData(warehouseId: number): Promise<PageData>
}

/**
 * 页面数据类型（示例）
 */
interface PageData {
  // 老板/车队长首页
  stats?: {
    totalDrivers: number
    activeDrivers: number
    todayAttendance: number
    todayPieceWork: number
  }
  driverStats?: DriverStatus[]
  
  // 司机首页
  attendance?: AttendanceRecord[]
  pieceWork?: PieceWorkRecord[]
  
  // 司机管理页面
  drivers?: User[]
}
```

## 数据模型

### 1. 仓库数据模型

```typescript
/**
 * 仓库信息
 */
interface Warehouse {
  id: number
  name: string
  address?: string
  // ... 其他字段
}
```

### 2. 统计数据模型

```typescript
/**
 * 统计数据（老板/车队长首页）
 */
interface StatsData {
  totalDrivers: number
  activeDrivers: number
  todayAttendance: number
  todayPieceWork: number
}

/**
 * 司机状态统计
 */
interface DriverStatus {
  status: 'checked_in' | 'checked_out' | 'on_leave' | 'absent'
  count: number
}
```

### 3. 司机数据模型

```typescript
/**
 * 司机信息（司机管理页面）
 */
interface Driver {
  id: number
  name: string
  phone: string
  warehouseIds: number[]
  // ... 其他字段
}
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：预加载完整性

*对于任意* 用户分配的仓库列表，当页面初始化并完成预加载后，缓存中应该包含所有仓库的数据。

**验证：需求 1.1, 1.2**

### 属性 2：预加载容错性

*对于任意* 仓库列表，当某个仓库的数据加载失败时，系统应该记录错误但继续加载其他仓库，且页面保持可用状态。

**验证：需求 1.3, 6.1**

### 属性 3：缓存命中时无加载状态

*对于任意* 已缓存的仓库，当用户切换到该仓库时，系统应该立即显示数据且不显示任何加载状态（全局或局部）。

**验证：需求 2.1, 2.3, 4.2**

### 属性 4：缓存未命中时显示局部加载

*对于任意* 未缓存的仓库，当用户切换到该仓库时，系统应该显示局部加载状态（不是全局遮罩）并发起数据请求。

**验证：需求 2.2, 4.3**

### 属性 5：切换后索引更新

*对于任意* 仓库索引，当用户切换到该仓库时，系统应该将当前仓库索引更新为目标索引。

**验证：需求 2.4**

### 属性 6：SSE 事件触发缓存更新

*对于任意* SSE 仓库数据更新事件，当系统收到该事件时，应该更新对应仓库的缓存数据。

**验证：需求 3.1**

### 属性 7：手动刷新清空缓存

*对于任意* 缓存状态，当用户手动刷新页面时，系统应该清空所有缓存并重新加载所有仓库的数据。

**验证：需求 3.2**

### 属性 8：仓库分配变更触发重新加载

*对于任意* 仓库分配变更事件，当系统收到该事件时，应该重新加载仓库列表和所有仓库的数据。

**验证：需求 3.3**

### 属性 9：缓存过期触发后台更新

*对于任意* 缓存项，当其时间戳超过 5 分钟时，系统应该在后台静默更新该数据且不显示加载状态。

**验证：需求 3.4, 4.4**

### 属性 10：加载顺序优先级

*对于任意* 仓库列表和当前仓库索引，当页面初始化时，系统应该先加载当前仓库的数据，然后再异步加载其他仓库的数据。

**验证：需求 5.1, 5.2**

### 属性 11：预加载完成日志记录

*对于任意* 仓库列表，当所有仓库数据加载完成时，系统应该记录日志但不显示任何 UI 提示。

**验证：需求 5.4**

### 属性 12：错误仓库显示重试选项

*对于任意* 加载失败的仓库，当用户切换到该仓库时，系统应该显示错误提示和重试按钮。

**验证：需求 6.2**

### 属性 13：重试触发重新加载

*对于任意* 加载失败的仓库，当用户点击重试按钮时，系统应该重新调用该仓库的数据加载函数。

**验证：需求 6.3**

## 错误处理

### 1. 网络错误

- **场景**：API 请求失败（网络断开、超时、服务器错误）
- **处理**：
  - 记录错误日志
  - 在缓存中标记该仓库为错误状态
  - 继续加载其他仓库（不中断预加载流程）
  - 用户切换到该仓库时显示错误提示和重试按钮

### 2. 数据格式错误

- **场景**：API 返回的数据格式不符合预期
- **处理**：
  - 记录错误日志和原始响应数据
  - 使用默认值或空数据
  - 显示错误提示

### 3. 缓存过期

- **场景**：缓存数据超过 5 分钟
- **处理**：
  - 在后台静默更新数据
  - 更新失败时保留旧数据
  - 不显示任何加载状态

### 4. 全局加载失败

- **场景**：所有仓库数据都加载失败
- **处理**：
  - 显示全局错误提示
  - 提供"重新加载"按钮
  - 清空缓存并重新开始加载流程

## 测试策略

### 单元测试

使用 Vitest 进行单元测试，重点测试：

1. **useWarehouseDataCache Composable**
   - 缓存的增删改查操作
   - 缓存过期检测
   - 预加载逻辑
   - 错误处理

2. **工具函数**
   - 缓存时间戳计算
   - 数据合并逻辑

### 属性测试

使用 fast-check 进行属性测试，每个测试运行至少 100 次：

1. **属性 1-13**：为每个正确性属性编写对应的属性测试
2. **测试标签格式**：`Feature: warehouse-switch-optimization, Property {number}: {property_text}`

### 集成测试

测试完整的页面集成：

1. **老板首页集成测试**
   - 测试预加载流程
   - 测试切换流程
   - 测试 SSE 更新

2. **车队长首页集成测试**
   - 同上

3. **司机首页集成测试**
   - 同上

### 性能测试

1. **预加载性能**
   - 测试 10 个仓库的预加载时间应 < 5 秒
   - 测试当前仓库加载时间应 < 1 秒

2. **切换性能**
   - 测试缓存命中时切换时间应 < 100ms
   - 测试缓存未命中时切换时间应 < 2 秒

3. **内存占用**
   - 测试缓存 10 个仓库数据的内存占用应 < 10MB



## 实现细节

### 1. useWarehouseDataCache Composable 实现

```typescript
// composables/useWarehouseDataCache.ts

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'

interface CacheItem<T> {
  data: T
  timestamp: number
  loading: boolean
  error: Error | null
}

interface UseWarehouseDataCacheOptions<T> {
  loadDataFn: (warehouseId: number) => Promise<T>
  warehouses: Ref<Warehouse[]>
  currentIndex: Ref<number>
  cacheExpiry?: number
  enablePreload?: boolean
}

export function useWarehouseDataCache<T>(
  options: UseWarehouseDataCacheOptions<T>
) {
  const {
    loadDataFn,
    warehouses,
    currentIndex,
    cacheExpiry = 5 * 60 * 1000, // 5 分钟
    enablePreload = true,
  } = options

  // 缓存存储
  const cache = ref<Map<number, CacheItem<T>>>(new Map())
  
  // 加载状态
  const isLoading = ref(false)
  const isPreloading = ref(false)
  const preloadedCount = ref(0)

  // 计算属性
  const currentData = computed(() => {
    const currentWarehouse = warehouses.value[currentIndex.value]
    if (!currentWarehouse) return null
    
    const cacheItem = cache.value.get(currentWarehouse.id)
    return cacheItem?.data || null
  })

  const preloadProgress = computed(() => {
    if (warehouses.value.length === 0) return 0
    return Math.round((preloadedCount.value / warehouses.value.length) * 100)
  })

  // 检查缓存是否过期
  function isCacheExpired(timestamp: number): boolean {
    return Date.now() - timestamp > cacheExpiry
  }

  // 检查是否已缓存
  function isCached(warehouseId: number): boolean {
    const cacheItem = cache.value.get(warehouseId)
    return !!cacheItem && !cacheItem.error && !isCacheExpired(cacheItem.timestamp)
  }

  // 获取仓库数据
  function getWarehouseData(warehouseId: number): T | null {
    const cacheItem = cache.value.get(warehouseId)
    return cacheItem?.data || null
  }

  // 加载单个仓库数据
  async function loadWarehouse(
    warehouseId: number,
    silent = false
  ): Promise<void> {
    try {
      // 设置加载状态
      const existingItem = cache.value.get(warehouseId)
      cache.value.set(warehouseId, {
        data: existingItem?.data || ({} as T),
        timestamp: existingItem?.timestamp || 0,
        loading: true,
        error: null,
      })

      // 加载数据
      const data = await loadDataFn(warehouseId)

      // 更新缓存
      cache.value.set(warehouseId, {
        data,
        timestamp: Date.now(),
        loading: false,
        error: null,
      })

      console.log(`[Cache] 仓库 ${warehouseId} 数据已加载`)
    } catch (error) {
      console.error(`[Cache] 仓库 ${warehouseId} 加载失败:`, error)

      // 记录错误
      cache.value.set(warehouseId, {
        data: {} as T,
        timestamp: 0,
        loading: false,
        error: error as Error,
      })

      // 非静默模式下显示错误
      if (!silent) {
        uni.showToast({
          title: '数据加载失败',
          icon: 'none',
        })
      }
    }
  }

  // 预加载所有仓库数据
  async function preloadAll(): Promise<void> {
    if (!enablePreload || warehouses.value.length === 0) return

    isPreloading.value = true
    preloadedCount.value = 0

    console.log(`[Cache] 开始预加载 ${warehouses.value.length} 个仓库`)

    // 并发加载所有仓库（静默模式）
    const promises = warehouses.value.map(async (warehouse) => {
      await loadWarehouse(warehouse.id, true)
      preloadedCount.value++
    })

    await Promise.allSettled(promises)

    isPreloading.value = false
    console.log(`[Cache] 预加载完成，成功 ${preloadedCount.value}/${warehouses.value.length}`)
  }

  // 切换仓库
  async function switchWarehouse(index: number): Promise<void> {
    const warehouse = warehouses.value[index]
    if (!warehouse) return

    // 检查是否已缓存
    if (isCached(warehouse.id)) {
      // 缓存命中，直接切换
      console.log(`[Cache] 缓存命中，仓库 ${warehouse.id}`)
      currentIndex.value = index
      return
    }

    // 缓存未命中，显示加载状态
    console.log(`[Cache] 缓存未命中，加载仓库 ${warehouse.id}`)
    isLoading.value = true

    try {
      await loadWarehouse(warehouse.id, false)
      currentIndex.value = index
    } finally {
      isLoading.value = false
    }
  }

  // 刷新当前仓库
  async function refreshCurrent(): Promise<void> {
    const currentWarehouse = warehouses.value[currentIndex.value]
    if (!currentWarehouse) return

    isLoading.value = true
    try {
      await loadWarehouse(currentWarehouse.id, false)
    } finally {
      isLoading.value = false
    }
  }

  // 刷新所有仓库
  async function refreshAll(): Promise<void> {
    clearCache()
    
    // 先加载当前仓库
    const currentWarehouse = warehouses.value[currentIndex.value]
    if (currentWarehouse) {
      isLoading.value = true
      await loadWarehouse(currentWarehouse.id, false)
      isLoading.value = false
    }

    // 后台预加载其他仓库
    if (enablePreload) {
      await preloadAll()
    }
  }

  // 清空缓存
  function clearCache(): void {
    cache.value.clear()
    preloadedCount.value = 0
    console.log('[Cache] 缓存已清空')
  }

  // 后台更新过期缓存
  async function updateExpiredCache(): Promise<void> {
    const expiredWarehouses = warehouses.value.filter((warehouse) => {
      const cacheItem = cache.value.get(warehouse.id)
      return cacheItem && isCacheExpired(cacheItem.timestamp)
    })

    if (expiredWarehouses.length === 0) return

    console.log(`[Cache] 后台更新 ${expiredWarehouses.length} 个过期缓存`)

    // 静默更新
    const promises = expiredWarehouses.map((warehouse) =>
      loadWarehouse(warehouse.id, true)
    )

    await Promise.allSettled(promises)
  }

  // 初始化
  onMounted(async () => {
    // 先加载当前仓库
    const currentWarehouse = warehouses.value[currentIndex.value]
    if (currentWarehouse) {
      isLoading.value = true
      await loadWarehouse(currentWarehouse.id, false)
      isLoading.value = false
    }

    // 后台预加载其他仓库
    if (enablePreload && warehouses.value.length > 1) {
      // 延迟 500ms 开始预加载，避免阻塞当前仓库的渲染
      setTimeout(() => {
        preloadAll()
      }, 500)
    }

    // 定期检查并更新过期缓存（每 1 分钟）
    const updateInterval = setInterval(() => {
      updateExpiredCache()
    }, 60 * 1000)

    // 清理
    onUnmounted(() => {
      clearInterval(updateInterval)
    })
  })

  return {
    currentData,
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
```

### 2. 页面集成示例（老板首页）

```typescript
// pages/boss/index/index.vue

import { useWarehouseDataCache } from '@/composables/useWarehouseDataCache'

// 定义页面数据类型
interface BossHomeData {
  stats: {
    totalDrivers: number
    activeDrivers: number
    todayAttendance: number
    todayPieceWork: number
  }
  driverStats: DriverStatus[]
}

// 数据加载函数
async function loadBossHomeData(warehouseId: number): Promise<BossHomeData> {
  const [statsRes, driverStatsRes] = await Promise.all([
    api.get(`/api/stats/warehouse/${warehouseId}`),
    api.get(`/api/driver-stats/warehouse/${warehouseId}`),
  ])

  return {
    stats: statsRes.data,
    driverStats: driverStatsRes.data,
  }
}

// 使用缓存 composable
const {
  currentData,
  isLoading,
  isPreloading,
  preloadProgress,
  switchWarehouse,
  refreshCurrent,
  refreshAll,
} = useWarehouseDataCache<BossHomeData>({
  loadDataFn: loadBossHomeData,
  warehouses: warehousesWithDataOrDrivers,
  currentIndex: currentWarehouseIndex,
  enablePreload: true,
})

// 处理仓库切换
function handleWarehouseChange(index: number): void {
  switchWarehouse(index)
}

// 处理下拉刷新
async function onPullDownRefresh(): Promise<void> {
  await refreshAll()
  uni.stopPullDownRefresh()
}
```

### 3. SSE 集成

```typescript
// 在页面中监听 SSE 事件
import { sseService } from '@/utils/sse'

onMounted(() => {
  // 监听仓库分配更新
  sseService.setCallbacks({
    onAssignmentUpdate: (data) => {
      // 重新加载仓库列表和数据
      refreshAll()
    },
    // 其他回调...
  })
})
```

## 迁移指南

### 现有页面迁移步骤

1. **导入 composable**
   ```typescript
   import { useWarehouseDataCache } from '@/composables/useWarehouseDataCache'
   ```

2. **定义数据类型**
   ```typescript
   interface PageData {
     // 定义页面需要的数据结构
   }
   ```

3. **创建数据加载函数**
   ```typescript
   async function loadPageData(warehouseId: number): Promise<PageData> {
     // 实现数据加载逻辑
   }
   ```

4. **使用 composable**
   ```typescript
   const { currentData, isLoading, switchWarehouse } = useWarehouseDataCache({
     loadDataFn: loadPageData,
     warehouses: warehousesRef,
     currentIndex: currentIndexRef,
   })
   ```

5. **更新仓库切换处理**
   ```typescript
   function handleWarehouseChange(index: number): void {
     switchWarehouse(index)  // 替换原来的 loadData()
   }
   ```

6. **移除旧的加载逻辑**
   - 删除 `loadData()` 函数中的仓库数据加载代码
   - 删除手动管理的 loading 状态
   - 使用 composable 提供的 `currentData` 和 `isLoading`

### 需要迁移的页面列表

1. `pages/boss/index/index.vue` - 老板首页
2. `pages/manager/index/index.vue` - 车队长首页
3. `pages/driver/index/index.vue` - 司机首页
4. `pages/manager/drivers/index.vue` - 司机管理页面
5. `pages/boss/users/index.vue` - 用户管理页面
