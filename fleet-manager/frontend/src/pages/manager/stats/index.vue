<template>
  <!-- 
    数据汇总页面
    显示计件统计数据，支持仓库筛选、司机搜索、快捷日期筛选
    Requirements: 3.1-3.10
  -->
  <view class="stats-page">
    <!-- 筛选条件区域 -->
    <view class="filter-section">
      <!-- 仓库选择器 -->
      <!-- Requirements: 3.1, 3.9, 3.10 -->
      <view class="filter-row">
        <text class="filter-label">仓库</text>
        <picker 
          mode="selector" 
          :range="warehouseOptions" 
          range-key="name"
          :value="selectedWarehouseIndex"
          @change="onWarehouseChange"
        >
          <view class="warehouse-picker">
            <text class="warehouse-text">{{ selectedWarehouseName }}</text>
            <text class="warehouse-arrow">▼</text>
          </view>
        </picker>
      </view>

      <!-- 司机搜索框 -->
      <!-- Requirements: 3.2, 3.3 -->
      <view class="filter-row">
        <text class="filter-label">司机</text>
        <view class="search-input-wrapper">
          <input 
            type="text"
            class="search-input"
            v-model="searchKeyword"
            placeholder="搜索姓名/手机号/拼音首字母"
            @input="onSearchInput"
          />
          <view v-if="searchKeyword" class="clear-btn" @click="clearSearch">
            <text class="clear-icon">×</text>
          </view>
        </view>
      </view>

      <!-- 司机选择器（筛选后的司机列表） -->
      <view v-if="filteredDrivers.length > 0" class="driver-selector">
        <scroll-view scroll-x class="driver-scroll">
          <view 
            class="driver-chip"
            :class="{ active: selectedDriverId === null }"
            @click="selectDriver(null)"
          >
            <text class="driver-chip-text">全部</text>
          </view>
          <view 
            v-for="driver in filteredDrivers"
            :key="driver.id"
            class="driver-chip"
            :class="{ active: selectedDriverId === driver.id }"
            @click="selectDriver(driver.id)"
          >
            <text class="driver-chip-text">{{ driver.name }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 日期范围选择 -->
      <view class="filter-row">
        <view class="date-picker-group">
          <picker mode="date" :value="startDate" @change="onStartDateChange">
            <view class="date-picker-item">
              <text class="date-label">开始</text>
              <text class="date-value">{{ startDate }}</text>
            </view>
          </picker>
          <text class="date-separator">至</text>
          <picker mode="date" :value="endDate" @change="onEndDateChange">
            <view class="date-picker-item">
              <text class="date-label">结束</text>
              <text class="date-value">{{ endDate }}</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 快捷筛选按钮 -->
      <!-- Requirements: 3.4, 3.5 -->
      <view class="quick-filter-row">
        <view 
          class="quick-filter-btn"
          :class="{ active: quickFilter === 'yesterday' }"
          @click="setQuickFilter('yesterday')"
        >
          <text class="quick-filter-text">前一天</text>
        </view>
        <view 
          class="quick-filter-btn"
          :class="{ active: quickFilter === 'week' }"
          @click="setQuickFilter('week')"
        >
          <text class="quick-filter-text">本周</text>
        </view>
        <view 
          class="quick-filter-btn"
          :class="{ active: quickFilter === 'month' }"
          @click="setQuickFilter('month')"
        >
          <text class="quick-filter-text">本月</text>
        </view>
      </view>

      <!-- 排序选项 -->
      <!-- Requirements: 4.1, 4.2, 4.3 -->
      <view class="sort-section">
        <text class="sort-label">排序</text>
        <view class="sort-options">
          <view 
            v-for="option in sortOptions"
            :key="option.field"
            class="sort-option"
            :class="{ active: sortConfig.field === option.field }"
            @click="onSortFieldChange(option.field)"
          >
            <text class="sort-option-icon">{{ option.icon }}</text>
            <text class="sort-option-text">{{ option.label }}</text>
            <!-- 显示当前排序方向（仅在选中时显示） -->
            <text 
              v-if="sortConfig.field === option.field" 
              class="sort-order-icon"
            >
              {{ sortOrderIcon }}
            </text>
          </view>
        </view>
        <!-- 升序/降序切换按钮 -->
        <view class="sort-order-toggle" @click="onToggleSortOrder">
          <text class="sort-order-text">{{ sortOrderLabel }}</text>
          <text class="sort-order-arrow">{{ sortOrderIcon }}</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 统计卡片 -->
      <!-- Requirements: 3.6, 6.1 - 数据统计单位显示 -->
      <view class="stats-card">
        <view class="stats-grid">
          <view class="stats-item">
            <text class="stats-value">{{ totalStats.total_quantity }}</text>
            <text class="stats-label">总{{ getUnitLabel() }}</text>
          </view>
          <view class="stats-item">
            <text class="stats-value highlight">¥{{ formatMoney(totalStats.total_amount) }}</text>
            <text class="stats-label">总金额</text>
          </view>
        </view>
      </view>

      <!-- 品类统计卡片 -->
      <!-- Requirements: 3.7, 6.1 - 数据统计单位显示 -->
      <view v-if="categoryStats.length > 0" class="category-stats-card">
        <view class="card-header">
          <text class="card-title">📊 品类统计</text>
        </view>
        <view class="category-list">
          <view 
            v-for="(category, index) in categoryStats" 
            :key="index"
            class="category-item"
          >
            <view class="category-info">
              <text class="category-name">{{ category.name }}</text>
              <text class="category-quantity">{{ category.quantity }} {{ category.unit }}</text>
            </view>
            <text class="category-amount">¥{{ formatMoney(category.amount) }}</text>
          </view>
        </view>
      </view>

      <!-- 记录列表 -->
      <!-- Requirements: 3.8 -->
      <view class="records-section">
        <view class="section-header">
          <text class="section-title">📝 计件明细</text>
          <text class="section-count">共 {{ filteredRecords.length }} 条</text>
        </view>

        <view v-if="filteredRecords.length === 0" class="empty-container">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无计件记录</text>
        </view>

        <view v-else class="record-list">
          <view 
            v-for="record in filteredRecords" 
            :key="record.id"
            class="record-item"
          >
            <!-- 司机姓名和日期 -->
            <view class="record-header">
              <view class="driver-info">
                <text class="driver-name">{{ record.user_name || '未知司机' }}</text>
                <text class="record-date">{{ formatDateChineseYMD(record.work_date) }}</text>
              </view>
              <text class="record-amount">¥{{ formatMoney(record.amount) }}</text>
            </view>
            
            <!-- 仓库、品类和标签 -->
            <view class="record-body">
              <view class="record-tags">
                <text class="tag warehouse-tag">{{ record.warehouse_name || '未指定仓库' }}</text>
                <text class="tag category-tag">{{ record.category_name }}</text>
              </view>
              <text class="record-quantity">{{ record.quantity }} {{ getRecordUnit(record) }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 数据汇总页面
 * 显示计件统计数据，支持仓库筛选、司机搜索、快捷日期筛选、排序功能
 * 
 * @module pages/manager/stats
 * 
 * Requirements:
 * - 3.1: 显示仓库选择器（包含"所有仓库"选项）
 * - 3.2: 支持姓名、手机号和拼音首字母匹配
 * - 3.3: 搜索关键词变化时重置选中的司机
 * - 3.4: 显示快捷筛选按钮（前一天/本周/本月）
 * - 3.5: 高亮选中的按钮并更新日期范围
 * - 3.6: 显示总件数和总金额统计卡片
 * - 3.7: 显示按品类分组的统计数据
 * - 3.8: 显示司机姓名、仓库、品类、标签和金额信息
 * - 3.9: 老板角色显示所有仓库的数据
 * - 3.10: 车队长角色只显示管辖仓库的数据
 * - 4.1: 显示排序选项（按金额/按数量/按日期）
 * - 4.2: 按选定方式重新排列记录列表
 * - 4.3: 支持升序/降序切换
 */

import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getPieceWorkRecords, 
  getWarehouses,
  getUsers,
  getWarehouseUsers,
} from '@/api'
import type { PieceWorkRecord, Warehouse, User } from '@/api/types'
import { UserRole, getWarehousePresetUnit, WarehouseType } from '@/api/types'
import { formatMoney } from '@/utils'
import { 
  getLocalDateString, 
  getYesterdayDateString,
  getMondayDateString, 
  getFirstDayOfMonthString,
} from '@/utils/date'
import { formatDateChineseYMD } from '@/utils/dateFormat'
import { matchWithPinyin } from '@/utils/pinyin'
import { useUserStore } from '@/store/user'
import {
  sortRecords,
  toggleSortOrder,
  getSortOrderLabel,
  getSortOrderIcon,
  DEFAULT_SORT_OPTIONS,
  DEFAULT_SORT_CONFIG,
  type SortConfig,
  type SortField,
  type SortOption,
} from '@/utils/sort'
import {
  filterWarehousesWithData,
  createWarehouseDataMap,
} from '@/utils/warehouse'

// ==================== 类型定义 ====================

/** 快捷筛选类型 */
type QuickFilterType = 'yesterday' | 'week' | 'month' | 'custom'

/** 仓库选项（包含"所有仓库"） */
interface WarehouseOption {
  id: number | null
  name: string
}

/** 品类统计数据 */
interface CategoryStat {
  name: string
  quantity: number
  amount: number
  /** 单位（根据仓库类型确定） - Requirements: 6.1 */
  unit: string
}

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 计件记录列表 */
const records = ref<PieceWorkRecord[]>([])

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 仓库数据映射（warehouseId -> hasData） */
const warehouseDataMap = ref<Map<number, boolean>>(new Map())

/** 司机列表 */
const drivers = ref<User[]>([])

/** 选中的仓库 ID（null 表示全部仓库） */
const selectedWarehouseId = ref<number | null>(null)

/** 搜索关键词 */
const searchKeyword = ref('')

/** 选中的司机 ID（null 表示全部司机） */
const selectedDriverId = ref<number | null>(null)

/** 开始日期 */
const startDate = ref('')

/** 结束日期 */
const endDate = ref('')

/** 快捷筛选类型 */
const quickFilter = ref<QuickFilterType>('month')

/** 排序配置 */
/** Requirements: 4.1, 4.2, 4.3 */
const sortConfig = ref<SortConfig>({ ...DEFAULT_SORT_CONFIG })

/** 排序选项列表 */
const sortOptions = DEFAULT_SORT_OPTIONS

// ==================== 计算属性 ====================

/**
 * 有数据的仓库列表
 * 使用统一的工具函数过滤
 */
const warehousesWithData = computed(() => {
  return filterWarehousesWithData({
    warehouses: warehouses.value,
    warehouseDataMap: warehouseDataMap.value,
  })
})

/**
 * 仓库选项列表（包含"所有仓库"选项）
 * 只显示有数据的仓库
 * Requirements: 3.1
 */
const warehouseOptions = computed<WarehouseOption[]>(() => {
  return [
    { id: null, name: '所有仓库' },
    ...warehousesWithData.value.map(w => ({ id: w.id, name: w.name })),
  ]
})

/**
 * 选中的仓库索引
 */
const selectedWarehouseIndex = computed(() => {
  if (selectedWarehouseId.value === null) return 0
  const index = warehouseOptions.value.findIndex(w => w.id === selectedWarehouseId.value)
  return index >= 0 ? index : 0
})

/**
 * 选中的仓库名称
 */
const selectedWarehouseName = computed(() => {
  const option = warehouseOptions.value[selectedWarehouseIndex.value]
  return option?.name || '所有仓库'
})

/**
 * 根据搜索关键词过滤的司机列表
 * Requirements: 3.2 - 支持姓名、手机号和拼音首字母匹配
 */
const filteredDrivers = computed(() => {
  if (!searchKeyword.value.trim()) {
    return drivers.value
  }
  
  const keyword = searchKeyword.value.trim()
  
  return drivers.value.filter(driver => {
    // 姓名匹配（包含拼音首字母）
    if (matchWithPinyin(driver.name, keyword)) {
      return true
    }
    
    // 手机号匹配
    if (driver.phone && driver.phone.includes(keyword)) {
      return true
    }
    
    return false
  })
})

/**
 * 排序方向显示文本
 * Requirements: 4.3
 */
const sortOrderLabel = computed(() => getSortOrderLabel(sortConfig.value.order))

/**
 * 排序方向图标
 * Requirements: 4.3
 */
const sortOrderIcon = computed(() => getSortOrderIcon(sortConfig.value.order))

/**
 * 根据筛选条件过滤并排序的记录列表
 * Requirements: 4.2 - 按选定方式重新排列记录列表
 */
const filteredRecords = computed(() => {
  let result = records.value
  
  // 按仓库筛选
  if (selectedWarehouseId.value !== null) {
    result = result.filter(r => r.warehouse_id === selectedWarehouseId.value)
  }
  
  // 按司机筛选
  if (selectedDriverId.value !== null) {
    result = result.filter(r => r.user_id === selectedDriverId.value)
  }
  
  // 应用排序
  // Requirements: 4.2 - 按选定方式重新排列记录列表
  result = sortRecords(result, sortConfig.value)
  
  return result
})

/**
 * 总统计数据
 * Requirements: 3.6
 */
const totalStats = computed(() => {
  const filtered = filteredRecords.value
  return {
    total_quantity: filtered.reduce((sum, r) => sum + r.quantity, 0),
    total_amount: filtered.reduce((sum, r) => sum + r.amount, 0),
    record_count: filtered.length,
  }
})

/**
 * 按品类分组的统计数据
 * Requirements: 3.7, 6.1 - 多仓库汇总按类型分组显示单位
 * 
 * 当选择特定仓库时，所有品类使用该仓库的预设单位
 * 当选择"所有仓库"时，按品类+仓库类型分组，每组显示对应单位
 */
const categoryStats = computed<CategoryStat[]>(() => {
  // 如果选择了特定仓库，按品类名称分组
  if (selectedWarehouseId.value !== null) {
    const categoryMap = new Map<string, CategoryStat>()
    const unit = getUnitLabel()
    
    filteredRecords.value.forEach(record => {
      const categoryName = record.category_name || '未分类'
      const existing = categoryMap.get(categoryName)
      
      if (existing) {
        existing.quantity += record.quantity
        existing.amount += record.amount
      } else {
        categoryMap.set(categoryName, {
          name: categoryName,
          quantity: record.quantity,
          amount: record.amount,
          unit: unit,
        })
      }
    })
    
    // 按金额降序排序
    return Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount)
  }
  
  // 选择"所有仓库"时，按品类+仓库类型分组
  // Requirements: 6.1 - 多仓库汇总按类型分组显示单位
  const categoryMap = new Map<string, CategoryStat>()
  
  filteredRecords.value.forEach(record => {
    const categoryName = record.category_name || '未分类'
    const unit = getRecordUnit(record)
    // 使用品类名称+单位作为唯一键，实现按类型分组
    const key = `${categoryName}_${unit}`
    const existing = categoryMap.get(key)
    
    if (existing) {
      existing.quantity += record.quantity
      existing.amount += record.amount
    } else {
      categoryMap.set(key, {
        name: categoryName,
        quantity: record.quantity,
        amount: record.amount,
        unit: unit,
      })
    }
  })
  
  // 按金额降序排序
  return Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount)
})

// ==================== 监听器 ====================

/**
 * 监听搜索关键词变化，重置选中的司机
 * Requirements: 3.3
 */
watch(searchKeyword, () => {
  selectedDriverId.value = null
})

// ==================== 生命周期 ====================

onMounted(async () => {
  // 加载仓库和司机列表
  await Promise.all([
    loadWarehouses(),
    loadDrivers(),
  ])
  
  // 默认查询本月数据
  setQuickFilter('month')
})

onShow(() => {
  // 刷新数据
  if (startDate.value && endDate.value) {
    loadData()
  }
})

// ==================== 方法 ====================

/**
 * 加载仓库列表
 * 同时获取每个仓库的计件数据，用于过滤有数据的仓库
 * Requirements: 3.9, 3.10 - 根据用户角色加载仓库列表
 */
async function loadWarehouses(): Promise<void> {
  try {
    const currentUser = userStore.user
    const userRole = currentUser?.role
    
    let data: Warehouse[] = []
    
    // 老板可以看到所有仓库（老板是系统最高权限角色）
    // Requirements: 3.9
    if (userRole === UserRole.BOSS) {
      data = await getWarehouses({ is_active: true })
    } 
    // 车队长只能看到管辖的仓库
    // Requirements: 3.10
    else if (userRole === UserRole.MANAGER && currentUser?.id) {
      // 获取车队长管辖的仓库
      // 这里假设后端会根据用户角色返回对应的仓库
      data = await getWarehouses({ is_active: true })
    }
    // 调度员可以看到所有仓库
    else if (userRole === UserRole.PEER_ADMIN) {
      data = await getWarehouses({ is_active: true })
    }
    else {
      // 其他角色获取所有仓库
      data = await getWarehouses({ is_active: true })
    }
    
    warehouses.value = data
    
    // 获取本月第一天（用于统计本月数据）
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]
    
    // 并行获取每个仓库的计件数据
    const warehouseStatsPromises = data.map(async (warehouse) => {
      try {
        const records = await getPieceWorkRecords({
          warehouse_id: warehouse.id,
          start_date: monthStartStr,
          end_date: todayStr,
          limit: 1,
        })
        return {
          warehouseId: warehouse.id,
          hasData: records.length > 0,
        }
      } catch {
        return { warehouseId: warehouse.id, hasData: false }
      }
    })
    
    const warehouseStatsResults = await Promise.all(warehouseStatsPromises)
    
    // 创建仓库数据映射
    warehouseDataMap.value = createWarehouseDataMap(warehouseStatsResults)
  } catch (error) {
    console.error('加载仓库列表失败:', error)
  }
}

/**
 * 加载司机列表
 */
async function loadDrivers(): Promise<void> {
  try {
    // 获取所有司机
    const data = await getUsers({ role: UserRole.DRIVER, is_active: true })
    drivers.value = data
  } catch (error) {
    console.error('加载司机列表失败:', error)
  }
}

/**
 * 加载计件数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  
  try {
    const params: Record<string, any> = {
      start_date: startDate.value,
      end_date: endDate.value,
      limit: 500,
    }
    
    // 如果选择了特定仓库，添加仓库筛选
    if (selectedWarehouseId.value !== null) {
      params.warehouse_id = selectedWarehouseId.value
    }
    
    // 如果选择了特定司机，添加司机筛选
    if (selectedDriverId.value !== null) {
      params.user_id = selectedDriverId.value
    }
    
    const data = await getPieceWorkRecords(params)
    records.value = data
  } catch (error) {
    console.error('加载计件数据失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 设置快捷筛选
 * Requirements: 3.4, 3.5
 * 
 * @param type - 快捷筛选类型
 */
function setQuickFilter(type: QuickFilterType): void {
  quickFilter.value = type
  
  const today = getLocalDateString()
  
  switch (type) {
    case 'yesterday':
      // 前一天
      const yesterday = getYesterdayDateString()
      startDate.value = yesterday
      endDate.value = yesterday
      break
    case 'week':
      // 本周（从周一到今天）
      startDate.value = getMondayDateString()
      endDate.value = today
      break
    case 'month':
      // 本月（从月初到今天）
      startDate.value = getFirstDayOfMonthString()
      endDate.value = today
      break
  }
  
  // 加载数据
  loadData()
}

/**
 * 仓库选择变化
 */
function onWarehouseChange(e: any): void {
  const index = parseInt(e.detail.value)
  const option = warehouseOptions.value[index]
  selectedWarehouseId.value = option?.id ?? null
  loadData()
}

/**
 * 搜索输入变化
 * Requirements: 3.3 - 搜索关键词变化时重置选中的司机
 */
function onSearchInput(): void {
  // watch 已经处理了重置选中司机的逻辑
}

/**
 * 清除搜索
 */
function clearSearch(): void {
  searchKeyword.value = ''
  selectedDriverId.value = null
}

/**
 * 选择司机
 * 
 * @param driverId - 司机 ID，null 表示全部
 */
function selectDriver(driverId: number | null): void {
  selectedDriverId.value = driverId
  loadData()
}

/**
 * 开始日期变化
 */
function onStartDateChange(e: any): void {
  startDate.value = e.detail.value
  quickFilter.value = 'custom'
  loadData()
}

/**
 * 结束日期变化
 */
function onEndDateChange(e: any): void {
  endDate.value = e.detail.value
  quickFilter.value = 'custom'
  loadData()
}

/**
 * 排序字段变化
 * Requirements: 4.1, 4.2 - 点击排序选项时更新排序字段
 * 
 * @param field - 新的排序字段
 */
function onSortFieldChange(field: SortField): void {
  // 如果点击的是当前选中的字段，切换排序方向
  if (sortConfig.value.field === field) {
    sortConfig.value = {
      ...sortConfig.value,
      order: toggleSortOrder(sortConfig.value.order),
    }
  } else {
    // 切换到新字段，默认降序
    sortConfig.value = {
      field,
      order: 'desc',
    }
  }
}

/**
 * 切换排序方向
 * Requirements: 4.3 - 切换升序/降序
 */
function onToggleSortOrder(): void {
  sortConfig.value = {
    ...sortConfig.value,
    order: toggleSortOrder(sortConfig.value.order),
  }
}

// ==================== 单位显示相关方法 ====================
// Requirements: 6.1 - 数据统计单位显示

/**
 * 获取当前选中仓库的预设单位标签
 * 如果选择了特定仓库，返回该仓库的预设单位
 * 如果选择"所有仓库"，返回默认单位"件"
 * 
 * @returns 单位标签字符串
 * Requirements: 6.1 - 单仓库统计显示该仓库的预设单位
 */
function getUnitLabel(): string {
  // 如果选择了特定仓库
  if (selectedWarehouseId.value !== null) {
    const warehouse = warehouses.value.find(w => w.id === selectedWarehouseId.value)
    if (warehouse && warehouse.warehouse_type) {
      return getWarehousePresetUnit(warehouse.warehouse_type)
    }
  }
  // 默认返回"件"
  return '件'
}

/**
 * 获取单条记录的单位
 * 根据记录所属仓库的类型返回对应单位
 * 
 * @param record - 计件记录
 * @returns 单位字符串
 * Requirements: 6.1 - 数据统计单位显示
 */
function getRecordUnit(record: PieceWorkRecord): string {
  // 如果记录有仓库ID，查找仓库获取单位
  if (record.warehouse_id) {
    const warehouse = warehouses.value.find(w => w.id === record.warehouse_id)
    if (warehouse && warehouse.warehouse_type) {
      return getWarehousePresetUnit(warehouse.warehouse_type)
    }
  }
  // 默认返回"件"
  return '件'
}
</script>


<style lang="scss" scoped>
/**
 * 数据汇总页面样式
 * Requirements: 3.1-3.10
 */

.stats-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
}

/* ==================== 筛选区域 ==================== */
.filter-section {
  background-color: #ffffff;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.filter-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.filter-label {
  width: 80rpx;
  font-size: 28rpx;
  color: #666666;
  flex-shrink: 0;
}

/* 仓库选择器 */
/* Requirements: 3.1 */
.warehouse-picker {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.warehouse-text {
  font-size: 28rpx;
  color: #333333;
}

.warehouse-arrow {
  font-size: 20rpx;
  color: #999999;
}

/* 搜索输入框 */
/* Requirements: 3.2 */
.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 16rpx;
}

.search-input {
  flex: 1;
  height: 64rpx;
  font-size: 28rpx;
  color: #333333;
}

.clear-btn {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-icon {
  font-size: 32rpx;
  color: #999999;
}

/* 司机选择器 */
.driver-selector {
  margin-bottom: 20rpx;
}

.driver-scroll {
  white-space: nowrap;
}

.driver-chip {
  display: inline-flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background-color: #f5f5f5;
  border-radius: 32rpx;
  margin-right: 16rpx;
  
  &.active {
    background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
    
    .driver-chip-text {
      color: #ffffff;
    }
  }
}

.driver-chip-text {
  font-size: 26rpx;
  color: #666666;
}

/* 日期选择器 */
.date-picker-group {
  flex: 1;
  display: flex;
  align-items: center;
}

.date-picker-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.date-label {
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 4rpx;
}

.date-value {
  font-size: 26rpx;
  color: #333333;
}

.date-separator {
  font-size: 24rpx;
  color: #999999;
  margin: 0 16rpx;
}

/* 快捷筛选按钮 */
/* Requirements: 3.4, 3.5 */
.quick-filter-row {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.quick-filter-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  transition: all 0.2s;
  
  /* 选中状态高亮 */
  &.active {
    background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
    
    .quick-filter-text {
      color: #ffffff;
      font-weight: 500;
    }
  }
}

.quick-filter-text {
  font-size: 26rpx;
  color: #666666;
}

/* ==================== 排序区域 ==================== */
/* Requirements: 4.1, 4.2, 4.3 */
.sort-section {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.sort-label {
  font-size: 28rpx;
  color: #666666;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.sort-options {
  display: flex;
  flex: 1;
  gap: 12rpx;
}

.sort-option {
  display: flex;
  align-items: center;
  padding: 12rpx 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  transition: all 0.2s;
  
  /* 选中状态 */
  &.active {
    background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
    
    .sort-option-text {
      color: #ffffff;
    }
    
    .sort-option-icon {
      opacity: 1;
    }
    
    .sort-order-icon {
      color: #ffffff;
    }
  }
}

.sort-option-icon {
  font-size: 24rpx;
  margin-right: 6rpx;
  opacity: 0.7;
}

.sort-option-text {
  font-size: 24rpx;
  color: #666666;
}

.sort-order-icon {
  font-size: 20rpx;
  color: #4a90e2;
  margin-left: 4rpx;
  font-weight: bold;
}

/* 升序/降序切换按钮 */
.sort-order-toggle {
  display: flex;
  align-items: center;
  padding: 12rpx 16rpx;
  background-color: #fff3e0;
  border-radius: 8rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}

.sort-order-text {
  font-size: 24rpx;
  color: #ff9800;
}

.sort-order-arrow {
  font-size: 20rpx;
  color: #ff9800;
  margin-left: 4rpx;
  font-weight: bold;
}

/* ==================== 加载状态 ==================== */
.loading-container {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* ==================== 统计卡片 ==================== */
/* Requirements: 3.6 */
.stats-card {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.stats-grid {
  display: flex;
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
  
  &.highlight {
    color: #ff6b35;
  }
}

.stats-label {
  font-size: 26rpx;
  color: #999999;
}

/* ==================== 品类统计卡片 ==================== */
/* Requirements: 3.7 */
.category-stats-card {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card-header {
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.category-name {
  font-size: 28rpx;
  color: #333333;
}

.category-quantity {
  font-size: 24rpx;
  color: #999999;
}

.category-amount {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff6b35;
}

/* ==================== 记录列表 ==================== */
/* Requirements: 3.8 */
.records-section {
  background-color: #ffffff;
  margin: 0 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.section-count {
  font-size: 24rpx;
  color: #999999;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12rpx;
}

.driver-info {
  display: flex;
  flex-direction: column;
}

.driver-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
  margin-bottom: 4rpx;
}

.record-date {
  font-size: 24rpx;
  color: #999999;
}

.record-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b35;
}

.record-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.warehouse-tag {
  color: #1890ff;
  background-color: #e6f7ff;
}

.category-tag {
  color: #722ed1;
  background-color: #f9f0ff;
}

.record-quantity {
  font-size: 26rpx;
  color: #666666;
}
</style>
