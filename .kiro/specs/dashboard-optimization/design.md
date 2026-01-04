# Design Document

## Overview

本设计文档描述了司机端、老板端、车队长端首页仪表盘的减负优化方案。采用保守策略，仅实施低风险的样式和组件提取，不修改任何业务逻辑。

### 设计原则

1. **零逻辑修改**：所有业务逻辑保持原样，仅做代码结构调整
2. **向后兼容**：现有 API 和函数调用方式保持不变
3. **渐进式重构**：先提取样式，再提取组件，最后应用到页面
4. **可回滚**：每个步骤都可以独立回滚

## Architecture

```
src/
├── styles/
│   └── home-common.scss          # 新增：首页共享样式
├── components/
│   ├── WelcomeCard/              # 新增：欢迎卡片组件
│   │   ├── index.vue
│   │   └── types.ts
│   ├── LogoutCard/               # 新增：退出登录组件
│   │   └── index.vue
│   ├── QuickActions/             # 新增：快捷功能组件
│   │   ├── index.vue
│   │   └── types.ts
│   └── index.ts                  # 更新：导出新组件
├── composables/                  # 新增：业务逻辑 Composable
│   ├── useHomeStats.ts           # 新增：统计数据加载
│   └── useWarehouseLoader.ts     # 新增：仓库列表加载
├── utils/
│   ├── warehouse.ts              # 更新：简化过滤函数
│   └── date.ts                   # 更新：添加日期范围函数
└── pages/
    ├── driver/index/index.vue    # 更新：使用新组件
    ├── boss/index/index.vue      # 更新：使用新组件和 composable
    └── manager/index/index.vue   # 更新：使用新组件和 composable
```

## Components and Interfaces

### 1. 共享样式文件 (home-common.scss)

```scss
// src/styles/home-common.scss

// ==================== 安全区域 ====================
.safe-area-top {
  height: env(safe-area-inset-top);
  height: constant(safe-area-inset-top);
}

// ==================== 区块样式 ====================
.section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title-wrapper {
  display: flex;
  align-items: center;
}

.section-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1F2937;
}

// ==================== 加载动画 ====================
.loading-icon {
  font-size: 28rpx;
  margin-left: 12rpx;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// ==================== 渐变背景 Mixin ====================
@mixin gradient-bg($color) {
  @if $color == 'blue' {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  } @else if $color == 'green' {
    background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
  } @else if $color == 'orange' {
    background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
  } @else if $color == 'purple' {
    background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  } @else if $color == 'teal' {
    background: linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%);
  } @else if $color == 'red' {
    background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
  } @else if $color == 'cyan' {
    background: linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%);
  }
}

// 渐变背景类
.bg-blue { @include gradient-bg('blue'); }
.bg-green { @include gradient-bg('green'); }
.bg-orange { @include gradient-bg('orange'); }
.bg-purple { @include gradient-bg('purple'); }
.bg-teal { @include gradient-bg('teal'); }
.bg-red { @include gradient-bg('red'); }
.bg-cyan { @include gradient-bg('cyan'); }

// ==================== 徽章样式 ====================
.badge {
  position: absolute;
  top: -8rpx;
  right: -16rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: #EF4444;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.badge-count {
  font-size: 20rpx;
  font-weight: bold;
  color: #ffffff;
}
```

### 2. WelcomeCard 组件

```typescript
// src/components/WelcomeCard/types.ts
export interface WelcomeCardProps {
  /** 标题（如：老板控制台、司机工作台） */
  title: string
  /** 副标题（如：欢迎回来，张三） */
  subtitle: string
}
```

```vue
<!-- src/components/WelcomeCard/index.vue -->
<template>
  <view class="welcome-card">
    <view class="welcome-content">
      <view class="welcome-text">
        <text class="welcome-title">{{ title }}</text>
        <text class="welcome-subtitle">{{ subtitle }}</text>
      </view>
      <!-- 右侧内容插槽（通知铃铛、请假状态等） -->
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import type { WelcomeCardProps } from './types'

defineProps<WelcomeCardProps>()
</script>

<style lang="scss" scoped>
.welcome-card {
  background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(30, 58, 138, 0.3);
}

.welcome-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.welcome-text {
  display: flex;
  flex-direction: column;
}

.welcome-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.welcome-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}
</style>
```

### 3. LogoutCard 组件

```vue
<!-- src/components/LogoutCard/index.vue -->
<template>
  <view class="logout-card" @click="handleLogout">
    <text class="logout-icon">🚪</text>
    <text class="logout-text">退出登录</text>
  </view>
</template>

<script setup lang="ts">
/**
 * 退出登录卡片组件
 * 复用现有的退出逻辑，不做任何修改
 */
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

/**
 * 退出登录处理
 * 逻辑与原有代码完全一致
 */
function handleLogout(): void {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.logout-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(239, 68, 68, 0.3);
  
  &:active {
    opacity: 0.9;
  }
}

.logout-icon {
  font-size: 40rpx;
  margin-right: 12rpx;
}

.logout-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
```

### 4. QuickActions 组件

```typescript
// src/components/QuickActions/types.ts
export interface QuickAction {
  /** 唯一标识 */
  key: string
  /** 图标（emoji） */
  icon: string
  /** 文本 */
  text: string
  /** 颜色主题 */
  color: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red' | 'cyan'
  /** 徽章数量（可选） */
  badge?: number
}

export interface QuickActionsProps {
  /** 功能列表 */
  actions: QuickAction[]
  /** 列数（默认 2） */
  columns?: 2 | 3 | 4
}
```

```vue
<!-- src/components/QuickActions/index.vue -->
<template>
  <view class="quick-actions-card">
    <view class="quick-actions-grid" :class="`columns-${columns}`">
      <view
        v-for="action in actions"
        :key="action.key"
        :class="['action-item', action.color]"
        @click="handleClick(action.key)"
      >
        <view class="action-icon-wrapper">
          <text class="action-icon">{{ action.icon }}</text>
          <view v-if="action.badge && action.badge > 0" class="badge">
            <text class="badge-count">{{ action.badge > 99 ? '99+' : action.badge }}</text>
          </view>
        </view>
        <text class="action-text">{{ action.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { QuickActionsProps } from './types'

const props = withDefaults(defineProps<QuickActionsProps>(), {
  columns: 2
})

const emit = defineEmits<{
  (e: 'click', key: string): void
}>()

function handleClick(key: string): void {
  emit('click', key)
}
</script>

<style lang="scss" scoped>
.quick-actions-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.quick-actions-grid {
  display: grid;
  gap: 20rpx;
  
  &.columns-2 { grid-template-columns: repeat(2, 1fr); }
  &.columns-3 { grid-template-columns: repeat(3, 1fr); }
  &.columns-4 { grid-template-columns: repeat(4, 1fr); }
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 16rpx;
  border-radius: 16rpx;
  transition: transform 0.2s;
  
  &:active { transform: scale(0.95); }
  
  &.blue { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); }
  &.green { background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); }
  &.orange { background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); }
  &.purple { background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); }
  &.teal { background: linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%); }
  &.red { background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); }
  &.cyan { background: linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%); }
}

.action-icon-wrapper {
  position: relative;
  margin-bottom: 12rpx;
}

.action-icon {
  font-size: 56rpx;
}

.badge {
  position: absolute;
  top: -8rpx;
  right: -16rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: #EF4444;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.badge-count {
  font-size: 20rpx;
  font-weight: bold;
  color: #ffffff;
}

.action-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #374151;
  text-align: center;
}
</style>
```

### 5. 简化 warehouse.ts

```typescript
// src/utils/warehouse.ts - 简化版本

import type { Warehouse } from '@/api/types'

/**
 * 简化的仓库过滤选项
 */
export interface SimpleFilterOptions {
  /** 仓库列表 */
  warehouses: Warehouse[]
  /** 数据映射 (warehouseId -> hasData) */
  dataMap?: Map<number, boolean>
  /** 司机数量映射 (warehouseId -> count) */
  driverCountMap?: Map<number, number>
  /** 排序值映射 (warehouseId -> sortValue) */
  sortMap?: Map<number, number>
  /** 过滤模式：'data' 仅有数据 | 'drivers' 仅有司机 | 'any' 有数据或有司机 */
  filterMode?: 'data' | 'drivers' | 'any'
}

/**
 * 统一的仓库过滤函数
 * 合并原有 3 个过滤函数的功能
 */
export function filterWarehouses(options: SimpleFilterOptions): Warehouse[] {
  const { warehouses, dataMap, driverCountMap, sortMap, filterMode = 'any' } = options
  
  // 过滤
  const filtered = warehouses.filter(warehouse => {
    const hasData = dataMap?.get(warehouse.id) === true
    const hasDrivers = (driverCountMap?.get(warehouse.id) || 0) > 0
    
    switch (filterMode) {
      case 'data': return hasData
      case 'drivers': return hasDrivers
      case 'any': return hasData || hasDrivers
      default: return true
    }
  })
  
  // 排序（降序）
  if (sortMap && sortMap.size > 0) {
    filtered.sort((a, b) => {
      const valueA = sortMap.get(a.id) || 0
      const valueB = sortMap.get(b.id) || 0
      return valueB - valueA
    })
  }
  
  return filtered
}

// ==================== 向后兼容的别名函数 ====================

/**
 * 过滤有数据的仓库（向后兼容）
 * @deprecated 请使用 filterWarehouses({ filterMode: 'data' })
 */
export function filterWarehousesWithData(options: WarehouseFilterOptions): Warehouse[] {
  return filterWarehouses({
    warehouses: options.warehouses,
    dataMap: options.warehouseDataMap,
    sortMap: options.warehouseTodayPieceCountMap,
    filterMode: 'data',
  })
}

/**
 * 过滤有司机的仓库（向后兼容）
 * @deprecated 请使用 filterWarehouses({ filterMode: 'drivers' })
 */
export function filterWarehousesWithDrivers(options: WarehouseFilterOptions): Warehouse[] {
  // 保持原有逻辑：从用户列表计算司机数量
  const driverCountMap = computeDriverCountMap(options)
  return filterWarehouses({
    warehouses: options.warehouses,
    driverCountMap,
    filterMode: 'drivers',
  })
}

/**
 * 过滤有数据或有司机的仓库（向后兼容）
 * @deprecated 请使用 filterWarehouses({ filterMode: 'any' })
 */
export function filterWarehousesWithDataOrDrivers(options: WarehouseFilterOptions): Warehouse[] {
  const driverCountMap = options.warehouseDriverCountMap || computeDriverCountMap(options)
  const sortMap = options.warehouseTodayPieceCountMap || options.warehouseTodayAttendanceMap
  
  return filterWarehouses({
    warehouses: options.warehouses,
    dataMap: options.warehouseDataMap,
    driverCountMap,
    sortMap,
    filterMode: 'any',
  })
}

// 保留原有的辅助函数和类型定义...
```

### 6. useHomeStats Composable

```typescript
// src/composables/useHomeStats.ts

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { 
  getAttendanceRecords, 
  getPieceWorkStats,
} from '@/api'
import { getLocalDateString, getMonthStartStr } from '@/utils/date'

/**
 * 首页统计数据
 */
export interface HomeStats {
  /** 今日出勤人数 */
  todayAttendanceCount: number
  /** 今日计件总量 */
  todayPieceCount: number
  /** 今日计件金额 */
  todayAmount: number
  /** 本月计件总量 */
  monthPieceCount: number
  /** 本月计件金额 */
  monthAmount: number
}

/**
 * useHomeStats 返回类型
 */
export interface UseHomeStatsReturn {
  /** 统计数据 */
  stats: Ref<HomeStats>
  /** 加载状态 */
  loading: Ref<boolean>
  /** 加载出勤统计 */
  loadAttendanceStats: () => Promise<void>
  /** 加载计件统计 */
  loadPieceWorkStats: () => Promise<void>
  /** 加载所有统计 */
  loadAllStats: () => Promise<void>
}

/**
 * 首页统计数据加载 Composable
 * 封装老板端和车队长端共用的统计数据加载逻辑
 * 
 * @param warehouseId - 当前选中的仓库ID（响应式）
 * @returns 统计数据和加载方法
 * 
 * @example
 * const { stats, loading, loadAllStats } = useHomeStats(currentWarehouseId)
 * onMounted(() => loadAllStats())
 */
export function useHomeStats(
  warehouseId: ComputedRef<number | undefined>
): UseHomeStatsReturn {
  const loading = ref(false)
  
  const stats = ref<HomeStats>({
    todayAttendanceCount: 0,
    todayPieceCount: 0,
    todayAmount: 0,
    monthPieceCount: 0,
    monthAmount: 0,
  })
  
  /**
   * 加载今日出勤统计
   * 逻辑与原有 loadAttendanceStats 完全一致
   */
  async function loadAttendanceStats(): Promise<void> {
    try {
      const todayStr = getLocalDateString()
      const records = await getAttendanceRecords({
        start_date: todayStr,
        end_date: todayStr,
        warehouse_id: warehouseId.value,
        limit: 1000,
      })
      const uniqueUserIds = new Set(records.map(r => r.user_id))
      stats.value.todayAttendanceCount = uniqueUserIds.size
    } catch (error) {
      console.error('加载出勤统计失败:', error)
      throw error
    }
  }
  
  /**
   * 加载计件统计数据
   * 逻辑与原有 loadPieceWorkStats 完全一致
   */
  async function loadPieceWorkStats(): Promise<void> {
    try {
      const todayStr = getLocalDateString()
      const monthStartStr = getMonthStartStr()
      
      const [todayStats, monthStats] = await Promise.all([
        getPieceWorkStats({
          start_date: todayStr,
          end_date: todayStr,
          warehouse_id: warehouseId.value,
        }),
        getPieceWorkStats({
          start_date: monthStartStr,
          end_date: todayStr,
          warehouse_id: warehouseId.value,
        }),
      ])
      
      stats.value.todayPieceCount = todayStats.total_quantity || 0
      stats.value.todayAmount = todayStats.total_amount || 0
      stats.value.monthPieceCount = monthStats.total_quantity || 0
      stats.value.monthAmount = monthStats.total_amount || 0
    } catch (error) {
      console.error('加载计件统计失败:', error)
      throw error
    }
  }
  
  /**
   * 加载所有统计数据
   */
  async function loadAllStats(): Promise<void> {
    loading.value = true
    try {
      await Promise.all([
        loadAttendanceStats(),
        loadPieceWorkStats(),
      ])
    } finally {
      loading.value = false
    }
  }
  
  return {
    stats,
    loading,
    loadAttendanceStats,
    loadPieceWorkStats,
    loadAllStats,
  }
}
```

### 7. useWarehouseLoader Composable

```typescript
// src/composables/useWarehouseLoader.ts

import { ref, computed, type Ref } from 'vue'
import { 
  getWarehouses, 
  getWarehouseUsers,
  getPieceWorkStats,
  getAttendanceRecords,
} from '@/api'
import { UserRole, type Warehouse, type WarehouseType } from '@/api/types'
import { getLocalDateString, getMonthStartStr } from '@/utils/date'

/**
 * 仓库加载配置
 */
export interface WarehouseLoaderOptions {
  /** 排序方式 */
  sortBy?: 'todayPieceCount' | 'todayAttendance'
  /** 是否加载司机数量 */
  includeDriverCount?: boolean
  /** 是否加载今日出勤 */
  includeAttendance?: boolean
}

/**
 * useWarehouseLoader 返回类型
 */
export interface UseWarehouseLoaderReturn {
  /** 仓库列表 */
  warehouses: Ref<Array<{ id: string; name: string }>>
  /** 仓库数据映射 */
  warehouseDataMap: Ref<Map<number, boolean>>
  /** 仓库司机数量映射 */
  warehouseDriverCountMap: Ref<Map<number, number>>
  /** 仓库今日件数映射 */
  warehouseTodayPieceCountMap: Ref<Map<number, number>>
  /** 仓库今日出勤映射 */
  warehouseTodayAttendanceMap: Ref<Map<number, number>>
  /** 仓库类型映射 */
  warehouseTypeMap: Ref<Map<number, WarehouseType>>
  /** 加载状态 */
  loading: Ref<boolean>
  /** 加载仓库列表 */
  loadWarehouses: () => Promise<void>
}

/**
 * 仓库列表加载 Composable
 * 封装老板端和车队长端共用的仓库加载逻辑
 * 
 * @param options - 加载配置
 * @returns 仓库数据和加载方法
 * 
 * @example
 * const { warehouses, warehouseDataMap, loadWarehouses } = useWarehouseLoader({
 *   sortBy: 'todayPieceCount',
 *   includeDriverCount: true,
 * })
 */
export function useWarehouseLoader(
  options: WarehouseLoaderOptions = {}
): UseWarehouseLoaderReturn {
  const { sortBy = 'todayPieceCount', includeDriverCount = true, includeAttendance = false } = options
  
  const loading = ref(false)
  const warehouses = ref<Array<{ id: string; name: string }>>([])
  const warehouseDataMap = ref<Map<number, boolean>>(new Map())
  const warehouseDriverCountMap = ref<Map<number, number>>(new Map())
  const warehouseTodayPieceCountMap = ref<Map<number, number>>(new Map())
  const warehouseTodayAttendanceMap = ref<Map<number, number>>(new Map())
  const warehouseTypeMap = ref<Map<number, WarehouseType>>(new Map())
  
  /**
   * 加载仓库列表
   * 逻辑与原有 loadWarehouses 完全一致
   */
  async function loadWarehouses(): Promise<void> {
    loading.value = true
    
    try {
      const data = await getWarehouses()
      warehouses.value = data.map(w => ({ id: String(w.id), name: w.name }))
      
      // 创建仓库类型映射
      const typeMap = new Map<number, WarehouseType>()
      data.forEach(w => {
        if (w.warehouse_type) {
          typeMap.set(w.id, w.warehouse_type)
        }
      })
      warehouseTypeMap.value = typeMap
      
      // 获取日期范围
      const monthStartStr = getMonthStartStr()
      const todayStr = getLocalDateString()
      
      // 并行获取每个仓库的数据
      const warehouseInfoPromises = data.map(async (warehouse) => {
        try {
          const promises: Promise<any>[] = [
            // 本月统计（用于判断是否有数据）
            getPieceWorkStats({
              warehouse_id: warehouse.id,
              start_date: monthStartStr,
              end_date: todayStr,
            }),
            // 今日统计（用于排序）
            getPieceWorkStats({
              warehouse_id: warehouse.id,
              start_date: todayStr,
              end_date: todayStr,
            }),
          ]
          
          // 可选：加载司机数量
          if (includeDriverCount) {
            promises.push(getWarehouseUsers(warehouse.id))
          }
          
          // 可选：加载今日出勤
          if (includeAttendance) {
            promises.push(getAttendanceRecords({
              warehouse_id: warehouse.id,
              start_date: todayStr,
              end_date: todayStr,
              limit: 1000,
            }))
          }
          
          const results = await Promise.all(promises)
          const [monthStats, todayStats] = results
          
          let driverCount = 0
          if (includeDriverCount && results[2]) {
            driverCount = results[2].filter((u: any) => u.role === UserRole.DRIVER).length
          }
          
          let todayAttendanceCount = 0
          if (includeAttendance && results[includeDriverCount ? 3 : 2]) {
            const records = results[includeDriverCount ? 3 : 2]
            const uniqueUserIds = new Set(records.map((r: any) => r.user_id))
            todayAttendanceCount = uniqueUserIds.size
          }
          
          return {
            warehouseId: warehouse.id,
            hasData: (monthStats.total_quantity || 0) > 0,
            driverCount,
            todayPieceCount: todayStats.total_quantity || 0,
            todayAttendanceCount,
          }
        } catch {
          return { 
            warehouseId: warehouse.id, 
            hasData: false, 
            driverCount: 0, 
            todayPieceCount: 0,
            todayAttendanceCount: 0,
          }
        }
      })
      
      const warehouseInfoResults = await Promise.all(warehouseInfoPromises)
      
      // 创建各种映射
      const dataMap = new Map<number, boolean>()
      const driverCountMap = new Map<number, number>()
      const todayPieceCountMap = new Map<number, number>()
      const attendanceMap = new Map<number, number>()
      
      for (const result of warehouseInfoResults) {
        if (result.hasData) {
          dataMap.set(result.warehouseId, true)
        }
        driverCountMap.set(result.warehouseId, result.driverCount)
        todayPieceCountMap.set(result.warehouseId, result.todayPieceCount)
        attendanceMap.set(result.warehouseId, result.todayAttendanceCount)
      }
      
      warehouseDataMap.value = dataMap
      warehouseDriverCountMap.value = driverCountMap
      warehouseTodayPieceCountMap.value = todayPieceCountMap
      warehouseTodayAttendanceMap.value = attendanceMap
    } catch (error) {
      console.error('加载仓库列表失败:', error)
      warehouses.value = []
      throw error
    } finally {
      loading.value = false
    }
  }
  
  return {
    warehouses,
    warehouseDataMap,
    warehouseDriverCountMap,
    warehouseTodayPieceCountMap,
    warehouseTodayAttendanceMap,
    warehouseTypeMap,
    loading,
    loadWarehouses,
  }
}
```

### 8. 日期工具函数扩展

```typescript
// src/utils/date.ts - 添加新函数

/**
 * 获取本月第一天的日期字符串
 * @returns 格式为 YYYY-MM-DD 的日期字符串
 */
export function getMonthStartStr(): string {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return getLocalDateString(monthStart)
}

/**
 * 获取日期范围（今天和本月第一天）
 * @returns { todayStr, monthStartStr }
 */
export function getDateRange(): { todayStr: string; monthStartStr: string } {
  return {
    todayStr: getLocalDateString(),
    monthStartStr: getMonthStartStr(),
  }
}
```

## Data Models

本次优化不涉及数据模型修改，所有现有数据结构保持不变。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 组件渲染一致性

*For any* WelcomeCard 组件实例，传入相同的 title 和 subtitle 属性，渲染结果应与原有内联代码完全一致。

**Validates: Requirements 2.3, 2.4**

### Property 2: 退出逻辑等价性

*For any* LogoutCard 组件的点击事件，执行的逻辑应与原有 handleLogout 函数完全等价。

**Validates: Requirements 3.4, 3.5**

### Property 3: 快捷功能事件传递

*For any* QuickActions 组件中的按钮点击，应正确触发 click 事件并传递对应的 action.key。

**Validates: Requirements 4.4, 4.6**

### Property 4: 仓库过滤向后兼容

*For any* 调用 filterWarehousesWithData/filterWarehousesWithDrivers/filterWarehousesWithDataOrDrivers 的代码，简化后的函数应返回与原函数完全相同的结果。

**Validates: Requirements 5.3, 5.4**

### Property 5: 样式视觉一致性

*For any* 使用共享样式的页面，渲染后的视觉效果应与重构前完全一致。

**Validates: Requirements 6.5, 7.7**

### Property 6: useHomeStats 数据等价性

*For any* 使用 useHomeStats composable 的页面，返回的统计数据应与原有 loadAttendanceStats 和 loadPieceWorkStats 函数返回的数据完全一致。

**Validates: Requirements 8.2, 8.3, 8.6**

### Property 7: useWarehouseLoader 数据等价性

*For any* 使用 useWarehouseLoader composable 的页面，返回的仓库数据和映射应与原有 loadWarehouses 函数返回的数据完全一致。

**Validates: Requirements 9.3, 9.6**

### Property 8: 日期函数一致性

*For any* 调用 getMonthStartStr 或 getDateRange 的代码，返回的日期字符串应与原有内联计算的结果完全一致。

**Validates: Requirements 10.2, 10.3, 10.4**

## Error Handling

本次优化不涉及错误处理逻辑修改。所有现有的错误处理保持不变：
- API 调用错误处理保持原样
- 加载状态管理保持原样
- 用户提示逻辑保持原样

## Testing Strategy

### 单元测试

1. **WelcomeCard 组件测试**
   - 验证 props 正确渲染
   - 验证插槽内容正确显示

2. **LogoutCard 组件测试**
   - 验证点击触发确认弹窗
   - 验证确认后调用 logout

3. **QuickActions 组件测试**
   - 验证 actions 正确渲染
   - 验证点击事件正确触发
   - 验证徽章显示逻辑

4. **filterWarehouses 函数测试**
   - 验证各种 filterMode 的过滤结果
   - 验证排序逻辑
   - 验证向后兼容函数返回相同结果

### 视觉回归测试

1. 截图对比重构前后的三端首页
2. 确保 UI 完全一致

### 手动测试

1. 验证三端首页所有功能正常
2. 验证页面跳转正确
3. 验证数据加载和显示正确
