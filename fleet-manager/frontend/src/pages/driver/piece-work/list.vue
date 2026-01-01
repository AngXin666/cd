<template>
  <!-- 
    计件记录页面
    显示历史计件记录，支持快捷筛选、仓库筛选、排序、编辑和删除功能
    集成 SSE 实时更新，实现审批结果实时显示
    UI 风格与主项目对齐：渐变背景、卡片式布局、图标按钮
    Requirements: 2.1-2.10, 4.2
  -->
  <view class="list-page" :style="{ background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)' }">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <view class="page-wrapper">
      <!-- 页面标题卡片（橙色渐变，与主项目对齐） -->
      <view class="page-title-card">
        <text class="page-title">我的计件</text>
        <view class="page-subtitle-row">
          <text class="page-subtitle">查看和管理计件工作记录</text>
          <!-- 显示当前筛选范围标签 -->
          <view v-if="rangeParam" class="range-badge">
            <text class="range-badge-text">
              {{ rangeParam === 'today' ? '📅 今天数据' : '📊 本月数据' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 快捷筛选按钮组（带图标，与主项目对齐） -->
      <view class="quick-filter-section">
        <view 
          class="quick-filter-btn"
          :class="{ active: quickFilter === 'today' }"
          @click="setQuickFilter('today')"
        >
          <text class="quick-filter-icon">📅</text>
          <text class="quick-filter-text">今天</text>
        </view>
        <view 
          class="quick-filter-btn week"
          :class="{ active: quickFilter === 'week' }"
          @click="setQuickFilter('week')"
        >
          <text class="quick-filter-icon">📆</text>
          <text class="quick-filter-text">本周</text>
        </view>
        <view 
          class="quick-filter-btn month"
          :class="{ active: quickFilter === 'month' }"
          @click="setQuickFilter('month')"
        >
          <text class="quick-filter-icon">🗓️</text>
          <text class="quick-filter-text">本月</text>
        </view>
        <view 
          class="quick-filter-btn nextday"
          :class="{ active: quickFilter === 'nextday' }"
          @click="setQuickFilter('nextday')"
        >
          <text class="quick-filter-icon">➡️</text>
          <text class="quick-filter-text">后一天</text>
          <text class="quick-filter-date">{{ getNextDayDisplay() }}</text>
        </view>
      </view>

    <!-- 日期筛选和仓库筛选 -->
    <view class="filter-section">
      <!-- 日期范围选择 -->
      <view class="date-filter">
        <picker mode="date" :value="startDate" @change="onStartDateChange">
          <view class="filter-item">
            <text class="filter-label">开始</text>
            <text class="filter-value">{{ startDate || '请选择' }}</text>
          </view>
        </picker>
        <text class="filter-separator">至</text>
        <picker mode="date" :value="endDate" @change="onEndDateChange">
          <view class="filter-item">
            <text class="filter-label">结束</text>
            <text class="filter-value">{{ endDate || '请选择' }}</text>
          </view>
        </picker>
      </view>
      
      <!-- 仓库筛选和排序 -->
      <view class="extra-filter">
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
        
        <!-- 排序按钮 -->
        <view class="sort-btn" @click="toggleSort">
          <text class="sort-icon">{{ sortOrder === 'desc' ? '↓' : '↑' }}</text>
          <text class="sort-text">日期</text>
        </view>
      </view>
    </view>

    <!-- 统计汇总（2列布局，与主项目对齐） -->
    <view class="stats-section">
      <view class="stats-card">
        <view class="stats-header">
          <text class="stats-label">总件数</text>
          <text class="stats-icon">📦</text>
        </view>
        <text class="stats-value">{{ filteredStats.total_quantity }}</text>
      </view>
      <view class="stats-card income">
        <view class="stats-header">
          <text class="stats-label">总收入</text>
          <text class="stats-icon">💰</text>
        </view>
        <text class="stats-value highlight">¥{{ formatMoney(filteredStats.total_amount) }}</text>
      </view>
    </view>

    <!-- 记录列表（带标题和记录数） -->
    <view class="list-section">
      <view class="list-header">
        <view class="list-title-wrapper">
          <text class="list-icon">📋</text>
          <text class="list-title">计件记录</text>
        </view>
        <text class="list-count">共 {{ sortedRecords.length }} 条</text>
      </view>
      
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="sortedRecords.length === 0" class="empty-container">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无计件记录</text>
        <text class="empty-hint">请先录入计件数据</text>
      </view>
      
      <view v-else class="record-list">
        <view 
          v-for="record in sortedRecords" 
          :key="record.id" 
          class="record-card"
        >
          <!-- 日期标签卡片（蓝色渐变背景，与主项目对齐） -->
          <view class="date-tag-card">
            <view class="date-tag-left">
              <text class="date-tag-icon">📅</text>
              <text class="date-tag-text">{{ formatDateChineseYMD(record.work_date) }}</text>
            </view>
            <text class="date-tag-weekday">{{ getWeekdayName(record.work_date) }}</text>
          </view>
          
          <!-- 记录内容 -->
          <view class="record-content">
            <!-- 仓库和品类信息 -->
            <view class="record-header">
              <view class="record-info">
                <view class="info-row">
                  <text class="info-icon">🏭</text>
                  <text class="warehouse-name">{{ record.warehouse_name || '未指定仓库' }}</text>
                </view>
                <view class="info-row">
                  <text class="info-icon">🏷️</text>
                  <text class="category-name">{{ record.category_name }}</text>
                  <!-- 标签（上楼/分拣） -->
                  <text v-if="record.need_upstairs" class="tag upstairs-tag">需上楼</text>
                  <text v-if="record.need_sorting" class="tag sorting-tag">需分拣</text>
                </view>
              </view>
            </view>
            
            <!-- 数据明细（网格布局，与主项目对齐） -->
            <view class="record-detail-card">
              <view class="detail-grid">
                <view class="detail-item">
                  <text class="detail-label">件数</text>
                  <text class="detail-value">{{ record.quantity }}</text>
                </view>
                <view class="detail-item">
                  <text class="detail-label">单价</text>
                  <text class="detail-value">¥{{ formatMoney(record.unit_price || 0) }}</text>
                </view>
                <!-- 上楼信息 -->
                <view v-if="record.need_upstairs" class="detail-item">
                  <text class="detail-label">上楼单价</text>
                  <text class="detail-value upstairs">¥{{ formatMoney(record.upstairs_price || 0) }}</text>
                </view>
                <view v-if="record.need_upstairs" class="detail-item">
                  <text class="detail-label">上楼金额</text>
                  <text class="detail-value upstairs">¥{{ formatMoney(record.upstairs_amount || 0) }}</text>
                </view>
                <!-- 分拣信息 -->
                <view v-if="record.need_sorting" class="detail-item">
                  <text class="detail-label">分拣件数</text>
                  <text class="detail-value sorting">{{ record.sorting_quantity || 0 }}</text>
                </view>
                <view v-if="record.need_sorting" class="detail-item">
                  <text class="detail-label">分拣金额</text>
                  <text class="detail-value sorting">¥{{ formatMoney(record.sorting_amount || 0) }}</text>
                </view>
              </view>
            </view>
            
            <!-- 总金额（绿色渐变背景，与主项目对齐） -->
            <view class="total-amount-card">
              <text class="total-label">总金额</text>
              <text class="total-value">¥{{ formatMoney(record.amount) }}</text>
            </view>
            
            <!-- 备注 -->
            <view v-if="record.remark" class="record-remark">
              <text class="remark-text">{{ record.remark }}</text>
            </view>
            
            <!-- 操作按钮（渐变背景，与主项目对齐） -->
            <view class="record-actions">
              <view class="action-btn edit-btn" @click="handleEdit(record)">
                <text class="action-icon">✏️</text>
                <text class="action-text">编辑</text>
              </view>
              <view class="action-btn delete-btn" @click="handleDelete(record)">
                <text class="action-icon">🗑️</text>
                <text class="action-text">删除</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑弹窗（支持编辑上楼和分拣字段，与主项目对齐） -->
    <view v-if="showEditModal" class="edit-modal-mask" @click="closeEditModal">
      <view class="edit-modal" @click.stop>
        <view class="edit-modal-header">
          <text class="edit-modal-title">编辑计件记录</text>
          <view class="edit-modal-close" @click="closeEditModal">
            <text class="close-icon">×</text>
          </view>
        </view>
        
        <scroll-view scroll-y class="edit-modal-body">
          <!-- 显示基本信息（只读） -->
          <view class="edit-section">
            <view class="edit-section-title">
              <text class="section-icon">ℹ️</text>
              <text class="section-text">记录信息</text>
            </view>
            <view class="edit-info-row">
              <text class="edit-label">日期：</text>
              <text class="edit-value">{{ formatDateChineseYMD(editingRecord?.work_date) }}</text>
            </view>
            <view class="edit-info-row">
              <text class="edit-label">仓库：</text>
              <text class="edit-value">{{ editingRecord?.warehouse_name || '未指定' }}</text>
            </view>
            <view class="edit-info-row">
              <text class="edit-label">品类：</text>
              <text class="edit-value">{{ editingRecord?.category_name }}</text>
            </view>
          </view>
          
          <!-- 可编辑字段 -->
          <view class="edit-section">
            <view class="edit-section-title">
              <text class="section-icon">✏️</text>
              <text class="section-text">编辑数据</text>
            </view>
            
            <!-- 件数 -->
            <view class="edit-form-row">
              <text class="edit-label"><text class="required">*</text> 件数：</text>
              <input 
                type="number" 
                class="edit-input"
                v-model="editForm.quantity"
                placeholder="请输入件数（正整数）"
              />
            </view>
            
            <!-- 单价 -->
            <view class="edit-form-row">
              <text class="edit-label"><text class="required">*</text> 单价：</text>
              <input 
                type="digit" 
                class="edit-input"
                v-model="editForm.unitPrice"
                placeholder="请输入单价（元/件）"
              />
            </view>
            
            <!-- 是否需要上楼 -->
            <view class="edit-switch-row">
              <text class="switch-label">是否需要上楼</text>
              <switch 
                :checked="editForm.needUpstairs" 
                @change="onUpstairsChange"
                color="#3B82F6"
              />
            </view>
            
            <!-- 上楼单价（条件显示） -->
            <view v-if="editForm.needUpstairs" class="edit-form-row">
              <text class="edit-label"><text class="required">*</text> 上楼单价：</text>
              <input 
                type="digit" 
                class="edit-input"
                v-model="editForm.upstairsPrice"
                placeholder="请输入上楼单价（元/件）"
              />
            </view>
            
            <!-- 是否需要分拣 -->
            <view class="edit-switch-row sorting">
              <text class="switch-label">是否需要分拣</text>
              <switch 
                :checked="editForm.needSorting" 
                @change="onSortingChange"
                color="#8B5CF6"
              />
            </view>
            
            <!-- 分拣件数和单价（条件显示） -->
            <view v-if="editForm.needSorting" class="edit-form-row">
              <text class="edit-label"><text class="required">*</text> 分拣件数：</text>
              <input 
                type="number" 
                class="edit-input"
                v-model="editForm.sortingQuantity"
                placeholder="请输入分拣件数（正整数）"
              />
            </view>
            <view v-if="editForm.needSorting" class="edit-form-row">
              <text class="edit-label"><text class="required">*</text> 分拣单价：</text>
              <input 
                type="digit" 
                class="edit-input"
                v-model="editForm.sortingUnitPrice"
                placeholder="请输入分拣单价（元/件）"
              />
            </view>
            
            <!-- 备注 -->
            <view class="edit-form-row">
              <text class="edit-label">备注：</text>
              <input 
                type="text" 
                class="edit-input"
                v-model="editForm.remark"
                placeholder="请输入备注（可选）"
              />
            </view>
          </view>
        </scroll-view>
        
        <view class="edit-modal-footer">
          <view class="modal-btn cancel-btn" @click="closeEditModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @click="confirmEditAction">
            <text class="btn-text">保存修改</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 新增按钮 -->
    <view class="fab-btn" @click="goToEntry">
      <text class="fab-icon">+</text>
    </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 计件记录页面
 * 显示历史计件记录，支持快捷筛选、仓库筛选、排序、编辑和删除功能
 * 集成 SSE 实时更新，实现审批结果实时显示
 * 
 * @module pages/driver/piece-work/list
 * 
 * Requirements:
 * - 2.1: 显示快捷筛选按钮组（今天/本周/本月/后一天）
 * - 2.2: 高亮选中的按钮并更新日期范围
 * - 2.3: 后一天按钮基于当前结束日期计算
 * - 2.4: 仓库筛选功能
 * - 2.5: 日期排序功能
 * - 2.6, 2.7: 编辑功能
 * - 2.8: 删除功能
 * - 2.9, 2.10: 记录列表样式优化
 * - 4.2: 司机计件页集成实时更新，实现审批结果实时显示
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getPieceWorkRecords, 
  getPieceWorkStats, 
  getWarehouses,
  updatePieceWorkRecord,
  deletePieceWorkRecord,
} from '@/api'
import type { PieceWorkRecord, PieceWorkStats, Warehouse } from '@/api/types'
import { formatMoney, navigateTo } from '@/utils'
import {
  filterWarehousesWithData,
  createWarehouseDataMap,
} from '@/utils/warehouse'
import { 
  getLocalDateString, 
  getMondayDateString, 
  getFirstDayOfMonthString,
  getNextDay,
} from '@/utils/date'
import { formatDateChineseYMD, getWeekdayName } from '@/utils/dateFormat'
import { confirmDelete, confirmEdit } from '@/utils/confirm'
import { sseService } from '@/utils/sse'
import type { PieceWorkUpdateEvent, PieceWorkRecordData } from '@/types/sse-events'

// ==================== 类型定义 ====================

/** 快捷筛选类型 */
type QuickFilterType = 'today' | 'week' | 'month' | 'nextday' | 'custom'

/** 排序顺序类型 */
type SortOrder = 'asc' | 'desc'

/** 仓库选项（包含"全部仓库"） */
interface WarehouseOption {
  id: number | null
  name: string
}

/** 编辑表单数据（扩展支持上楼和分拣字段，与主项目对齐） */
interface EditFormData {
  quantity: string
  unitPrice: string
  needUpstairs: boolean
  upstairsPrice: string
  needSorting: boolean
  sortingQuantity: string
  sortingUnitPrice: string
  remark: string
}

// ==================== 状态 ====================

/** 计件记录列表 */
const records = ref<PieceWorkRecord[]>([])

/** 统计数据 */
const stats = ref<PieceWorkStats>({
  total_quantity: 0,
  total_amount: 0,
  record_count: 0,
})

/** 加载状态 */
const loading = ref(false)

/** 开始日期 */
const startDate = ref('')

/** 结束日期 */
const endDate = ref('')

/** 快捷筛选类型 */
const quickFilter = ref<QuickFilterType>('month')

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 仓库数据映射（warehouseId -> hasData） */
const warehouseDataMap = ref<Map<number, boolean>>(new Map())

/** 选中的仓库 ID（null 表示全部仓库） */
const selectedWarehouseId = ref<number | null>(null)

/** 排序顺序 */
const sortOrder = ref<SortOrder>('desc')

/** 是否显示编辑弹窗 */
const showEditModal = ref(false)

/** 正在编辑的记录 */
const editingRecord = ref<PieceWorkRecord | null>(null)

/** 编辑表单数据 */
const editForm = ref<EditFormData>({
  quantity: '',
  unitPrice: '',
  needUpstairs: false,
  upstairsPrice: '',
  needSorting: false,
  sortingQuantity: '',
  sortingUnitPrice: '',
  remark: '',
})

/** URL 参数（用于显示筛选范围标签） */
const rangeParam = ref('')

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
 * 仓库选项列表（包含"全部仓库"选项）
 * 只显示有数据的仓库
 */
const warehouseOptions = computed<WarehouseOption[]>(() => {
  return [
    { id: null, name: '全部仓库' },
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
  return option?.name || '全部仓库'
})

/**
 * 根据仓库筛选后的记录列表
 * Requirements: 2.4 - 仓库筛选过滤
 */
const filteredRecords = computed(() => {
  if (selectedWarehouseId.value === null) {
    return records.value
  }
  return records.value.filter(r => r.warehouse_id === selectedWarehouseId.value)
})

/**
 * 排序后的记录列表
 * Requirements: 2.5 - 日期排序
 */
const sortedRecords = computed(() => {
  const sorted = [...filteredRecords.value]
  sorted.sort((a, b) => {
    const dateA = new Date(a.work_date).getTime()
    const dateB = new Date(b.work_date).getTime()
    // 降序：最新的在前面；升序：最早的在前面
    return sortOrder.value === 'desc' ? dateB - dateA : dateA - dateB
  })
  return sorted
})

/**
 * 筛选后的统计数据
 */
const filteredStats = computed<PieceWorkStats>(() => {
  const filtered = filteredRecords.value
  return {
    record_count: filtered.length,
    total_quantity: filtered.reduce((sum, r) => sum + r.quantity, 0),
    total_amount: filtered.reduce((sum, r) => sum + r.amount, 0),
  }
})

// ==================== 生命周期 ====================

onMounted(async () => {
  // 注册 SSE 计件更新事件回调
  // Requirements: 4.2 - 司机计件页集成实时更新
  registerSSECallbacks()
  
  // 加载仓库列表
  await loadWarehouses()
  
  // 获取页面参数，支持从首页跳转时传入 range 参数
  // Requirements: 4.6 - 点击统计卡片跳转到计件记录页面（带日期范围参数）
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any)?.options || {}
  
  // 保存 range 参数用于显示标签
  rangeParam.value = options.range || ''
  
  // 根据 range 参数设置初始筛选
  if (options.range === 'today') {
    setQuickFilter('today')
  } else if (options.range === 'month') {
    setQuickFilter('month')
  } else if (options.range === 'week') {
    setQuickFilter('week')
  } else {
    // 默认查询本月数据
    setQuickFilter('month')
  }
})

/**
 * 页面卸载时取消 SSE 回调注册
 * Requirements: 4.2 - 页面卸载时取消回调注册
 */
onUnmounted(() => {
  unregisterSSECallbacks()
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
 */
async function loadWarehouses(): Promise<void> {
  try {
    const data = await getWarehouses({ is_active: true })
    warehouses.value = data
    
    // 获取本月第一天（用于统计本月数据）
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]
    
    // 并行获取每个仓库的计件数据
    const warehouseStatsPromises = data.map(async (warehouse) => {
      try {
        const stats = await getPieceWorkStats({
          warehouse_id: warehouse.id,
          start_date: monthStartStr,
          end_date: todayStr,
        })
        return {
          warehouseId: warehouse.id,
          hasData: (stats.total_quantity || 0) > 0,
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
 * 加载数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  
  try {
    // 并行加载记录和统计
    const [recordsData, statsData] = await Promise.all([
      getPieceWorkRecords({
        start_date: startDate.value,
        end_date: endDate.value,
        limit: 100,
      }),
      getPieceWorkStats({
        start_date: startDate.value,
        end_date: endDate.value,
      }),
    ])
    
    records.value = recordsData
    stats.value = statsData
  } catch (error) {
    console.error('加载数据失败:', error)
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
 * Requirements: 2.1, 2.2, 2.3
 * 
 * @param type - 快捷筛选类型
 */
function setQuickFilter(type: QuickFilterType): void {
  quickFilter.value = type
  
  const today = getLocalDateString()
  
  switch (type) {
    case 'today':
      // 今天
      startDate.value = today
      endDate.value = today
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
    case 'nextday':
      // 后一天：基于当前结束日期计算
      // Requirements: 2.3
      if (endDate.value) {
        const nextDay = getNextDay(endDate.value)
        startDate.value = nextDay
        endDate.value = nextDay
      }
      break
  }
  
  // 加载数据
  loadData()
}

/**
 * 获取后一天的日期显示（用于快捷筛选按钮）
 * @returns 格式化后的日期字符串
 */
function getNextDayDisplay(): string {
  const baseDate = endDate.value || getLocalDateString()
  const nextDay = getNextDay(baseDate)
  return formatDateChineseYMD(nextDay)
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
 * 仓库选择变化
 * Requirements: 2.4
 */
function onWarehouseChange(e: any): void {
  const index = parseInt(e.detail.value)
  const option = warehouseOptions.value[index]
  selectedWarehouseId.value = option?.id ?? null
}

/**
 * 切换排序顺序
 * Requirements: 2.5
 */
function toggleSort(): void {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

/**
 * 处理编辑
 * Requirements: 2.6 - 支持编辑上楼和分拣字段
 * 
 * @param record - 要编辑的记录
 */
function handleEdit(record: PieceWorkRecord): void {
  editingRecord.value = record
  // 初始化编辑表单，包含所有可编辑字段
  editForm.value = {
    quantity: String(record.quantity),
    unitPrice: String(record.unit_price || 0),
    needUpstairs: record.need_upstairs || false,
    upstairsPrice: String(record.upstairs_price || 0),
    needSorting: record.need_sorting || false,
    sortingQuantity: String(record.sorting_quantity || 0),
    sortingUnitPrice: String(record.sorting_unit_price || 0),
    remark: record.remark || '',
  }
  showEditModal.value = true
}

/**
 * 关闭编辑弹窗
 */
function closeEditModal(): void {
  showEditModal.value = false
  editingRecord.value = null
  editForm.value = {
    quantity: '',
    unitPrice: '',
    needUpstairs: false,
    upstairsPrice: '',
    needSorting: false,
    sortingQuantity: '',
    sortingUnitPrice: '',
    remark: '',
  }
}

/**
 * 处理上楼开关变化
 * @param e - 开关事件
 */
function onUpstairsChange(e: any): void {
  editForm.value.needUpstairs = e.detail.value
}

/**
 * 处理分拣开关变化
 * @param e - 开关事件
 */
function onSortingChange(e: any): void {
  editForm.value.needSorting = e.detail.value
}

/**
 * 确认编辑
 * Requirements: 2.7 - 保存时显示二次确认，支持编辑上楼和分拣字段
 */
async function confirmEditAction(): Promise<void> {
  if (!editingRecord.value) return
  
  // 验证件数
  const quantity = parseInt(editForm.value.quantity)
  if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    uni.showToast({
      title: '件数必须是正整数',
      icon: 'none',
    })
    return
  }
  
  // 验证单价
  const unitPrice = parseFloat(editForm.value.unitPrice)
  if (isNaN(unitPrice) || unitPrice < 0) {
    uni.showToast({
      title: '单价必须是非负数',
      icon: 'none',
    })
    return
  }
  
  // 验证上楼单价（如果需要上楼）
  const upstairsPrice = parseFloat(editForm.value.upstairsPrice) || 0
  if (editForm.value.needUpstairs && (isNaN(upstairsPrice) || upstairsPrice < 0)) {
    uni.showToast({
      title: '上楼单价必须是非负数',
      icon: 'none',
    })
    return
  }
  
  // 验证分拣件数和单价（如果需要分拣）
  const sortingQuantity = parseInt(editForm.value.sortingQuantity) || 0
  const sortingUnitPrice = parseFloat(editForm.value.sortingUnitPrice) || 0
  if (editForm.value.needSorting) {
    if (isNaN(sortingQuantity) || sortingQuantity <= 0 || !Number.isInteger(sortingQuantity)) {
      uni.showToast({
        title: '分拣件数必须是正整数',
        icon: 'none',
      })
      return
    }
    if (isNaN(sortingUnitPrice) || sortingUnitPrice < 0) {
      uni.showToast({
        title: '分拣单价必须是非负数',
        icon: 'none',
      })
      return
    }
  }
  
  // 二次确认
  const confirmed = await confirmEdit('确认修改', '确定要保存对这条记录的修改吗？')
  if (!confirmed) return
  
  try {
    // 计算总金额
    const baseAmount = quantity * unitPrice
    const upstairsAmount = editForm.value.needUpstairs ? quantity * upstairsPrice : 0
    const sortingAmount = editForm.value.needSorting ? sortingQuantity * sortingUnitPrice : 0
    const totalAmount = baseAmount + upstairsAmount + sortingAmount
    
    // 调用 API 更新记录（包含所有字段）
    await updatePieceWorkRecord(editingRecord.value.id, {
      quantity,
      unit_price: unitPrice,
      need_upstairs: editForm.value.needUpstairs,
      upstairs_price: upstairsPrice,
      need_sorting: editForm.value.needSorting,
      sorting_quantity: sortingQuantity,
      sorting_unit_price: sortingUnitPrice,
      amount: totalAmount,
      remark: editForm.value.remark || undefined,
    })
    
    uni.showToast({
      title: '修改成功',
      icon: 'success',
    })
    
    // 关闭弹窗并刷新数据
    closeEditModal()
    loadData()
  } catch (error) {
    console.error('更新记录失败:', error)
    uni.showToast({
      title: '修改失败',
      icon: 'none',
    })
  }
}

/**
 * 处理删除
 * Requirements: 2.8 - 显示详细的删除确认对话框
 * 
 * @param record - 要删除的记录
 */
async function handleDelete(record: PieceWorkRecord): Promise<void> {
  // 构建详细的确认内容
  const content = [
    `仓库：${record.warehouse_name || '未指定'}`,
    `品类：${record.category_name}`,
    `件数：${record.quantity}`,
    `金额：¥${formatMoney(record.amount)}`,
    '',
    '删除后无法恢复，确定要删除吗？',
  ].join('\n')
  
  const confirmed = await confirmDelete('删除计件记录', content)
  if (!confirmed) return
  
  try {
    await deletePieceWorkRecord(record.id)
    
    uni.showToast({
      title: '删除成功',
      icon: 'success',
    })
    
    // 刷新数据
    loadData()
  } catch (error) {
    console.error('删除记录失败:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'none',
    })
  }
}

/**
 * 跳转到录入页面
 */
function goToEntry(): void {
  navigateTo('/pages/driver/piece-work/entry')
}

// ==================== SSE 实时更新 ====================

/**
 * 注册 SSE 计件更新事件回调
 * 当收到计件更新事件时，直接更新本地计件列表数据
 * Requirements: 4.2 - 司机计件页集成实时更新
 */
function registerSSECallbacks(): void {
  sseService.setCallbacks({
    onPieceWorkUpdate: handlePieceWorkUpdate,
  })
  console.log('[司机计件] 已注册 SSE 计件更新回调')
}

/**
 * 取消 SSE 回调注册
 * 清除计件更新事件的回调处理器
 * Requirements: 4.2 - 页面卸载时取消回调注册
 */
function unregisterSSECallbacks(): void {
  sseService.setCallbacks({
    onPieceWorkUpdate: undefined,
  })
  console.log('[司机计件] 已取消 SSE 计件更新回调')
}

/**
 * 处理计件更新事件
 * 根据事件动作类型更新本地计件列表，实现审批结果实时显示
 * Requirements: 4.2 - 实现审批结果实时显示
 * @param event - 计件更新事件数据
 */
function handlePieceWorkUpdate(event: PieceWorkUpdateEvent): void {
  console.log('[司机计件] 收到计件更新事件:', event.action, event.record.id)
  
  const { action, record: recordData } = event
  
  // 检查记录日期是否在当前筛选范围内
  const recordDate = recordData.work_date.split('T')[0]
  if (!isDateInRange(recordDate)) {
    console.log('[司机计件] 记录日期不在当前筛选范围内，忽略:', recordDate)
    return
  }
  
  // 根据事件动作类型处理
  switch (action) {
    case 'create':
      // 新增计件记录：添加到列表
      handlePieceWorkCreate(recordData)
      break
    case 'update':
      // 更新计件记录：更新列表中对应的数据（审批结果）
      handlePieceWorkUpdateData(recordData)
      break
    default:
      console.warn('[司机计件] 未知的事件动作类型:', action)
  }
  
  // 更新统计数据
  updateLocalStats()
}

/**
 * 检查日期是否在当前筛选范围内
 * @param dateStr - 日期字符串（YYYY-MM-DD 格式）
 * @returns 是否在范围内
 */
function isDateInRange(dateStr: string): boolean {
  if (!startDate.value || !endDate.value) {
    return false
  }
  return dateStr >= startDate.value && dateStr <= endDate.value
}

/**
 * 处理计件创建事件
 * 将新计件记录添加到列表
 * @param recordData - 计件记录数据
 */
function handlePieceWorkCreate(recordData: PieceWorkRecordData): void {
  // 转换为 PieceWorkRecord 类型
  const newRecord: PieceWorkRecord = convertPieceWorkDataToRecord(recordData)
  
  // 检查是否已存在（避免重复添加）
  const existingIndex = records.value.findIndex(r => r.id === recordData.id)
  if (existingIndex >= 0) {
    // 已存在，更新数据
    records.value[existingIndex] = newRecord
    console.log('[司机计件] 更新已存在的记录:', recordData.id)
  } else {
    // 添加到列表开头
    records.value.unshift(newRecord)
    console.log('[司机计件] 添加新记录到列表:', recordData.id)
    
    // 显示提示
    uni.showToast({
      title: '新计件记录已添加',
      icon: 'none',
      duration: 2000,
    })
  }
}

/**
 * 处理计件更新事件
 * 更新列表中对应的计件数据，实现审批结果实时显示
 * Requirements: 4.2 - 实现审批结果实时显示
 * @param recordData - 计件记录数据
 */
function handlePieceWorkUpdateData(recordData: PieceWorkRecordData): void {
  // 转换为 PieceWorkRecord 类型
  const updatedRecord: PieceWorkRecord = convertPieceWorkDataToRecord(recordData)
  
  // 查找并更新列表中的记录
  const index = records.value.findIndex(r => r.id === recordData.id)
  if (index >= 0) {
    records.value[index] = updatedRecord
    console.log('[司机计件] 更新记录:', recordData.id)
    
    // 显示审批结果提示
    showApprovalResultToast(recordData)
  } else {
    // 不在列表中，可能是新创建的，添加到列表
    records.value.unshift(updatedRecord)
    console.log('[司机计件] 记录不在列表中，添加:', recordData.id)
  }
}

/**
 * 将 SSE 事件的 PieceWorkRecordData 转换为 PieceWorkRecord 类型
 * @param recordData - SSE 事件中的计件记录数据
 * @returns PieceWorkRecord 类型的数据
 */
function convertPieceWorkDataToRecord(recordData: PieceWorkRecordData): PieceWorkRecord {
  return {
    id: recordData.id,
    user_id: recordData.user_id,
    user_name: recordData.user_name,
    warehouse_id: recordData.warehouse_id,
    warehouse_name: recordData.warehouse_name,
    category_id: recordData.category_id,
    category_name: recordData.category_name,
    quantity: recordData.quantity,
    amount: recordData.amount,
    work_date: recordData.work_date,
    remark: recordData.remark,
    created_at: recordData.created_at,
  }
}

/**
 * 显示审批结果提示
 * 根据计件记录的状态显示不同的提示信息
 * Requirements: 4.2 - 实现审批结果实时显示
 * @param recordData - 计件记录数据
 */
function showApprovalResultToast(recordData: PieceWorkRecordData): void {
  // 根据状态显示不同的提示
  if (recordData.status === 'approved') {
    uni.showToast({
      title: '计件记录已通过审批',
      icon: 'success',
      duration: 2000,
    })
  } else if (recordData.status === 'rejected') {
    uni.showToast({
      title: '计件记录已被驳回',
      icon: 'none',
      duration: 2000,
    })
  }
}

/**
 * 更新本地统计数据
 * 根据当前列表重新计算统计数据
 */
function updateLocalStats(): void {
  // 重新计算统计数据
  const totalQuantity = records.value.reduce((sum, r) => sum + r.quantity, 0)
  const totalAmount = records.value.reduce((sum, r) => sum + r.amount, 0)
  const recordCount = records.value.length
  
  stats.value = {
    total_quantity: totalQuantity,
    total_amount: totalAmount,
    record_count: recordCount,
  }
  
  console.log('[司机计件] 更新统计数据:', stats.value)
}
</script>


<style lang="scss" scoped>
/**
 * 计件记录页面样式
 * UI 风格与主项目对齐：渐变背景、卡片式布局、图标按钮
 * Requirements: 2.9, 2.10 - 优化记录列表样式
 */

.list-page {
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* 顶部安全区域 */
.safe-area-top {
  height: env(safe-area-inset-top);
  height: constant(safe-area-inset-top);
}

.page-wrapper {
  padding: 32rpx;
}

/* ==================== 页面标题卡片（橙色渐变，与主项目对齐） ==================== */
.page-title-card {
  background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(234, 88, 12, 0.3);
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
  display: block;
  margin-bottom: 12rpx;
}

.page-subtitle-row {
  display: flex;
  align-items: center;
}

.page-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.range-badge {
  margin-left: 16rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
  padding: 8rpx 20rpx;
}

.range-badge-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
}

/* ==================== 快捷筛选按钮组（带图标，与主项目对齐） ==================== */
/* Requirements: 2.1, 2.2 */
.quick-filter-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.quick-filter-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx 12rpx;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  border-radius: 16rpx;
  transition: all 0.2s;
  
  /* 选中状态高亮 - 蓝色 */
  &.active {
    background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
    box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.3);
    
    .quick-filter-icon,
    .quick-filter-text,
    .quick-filter-date {
      color: #ffffff;
    }
  }
  
  /* 本周按钮 - 绿色 */
  &.week {
    background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
    
    .quick-filter-icon,
    .quick-filter-text {
      color: #16A34A;
    }
    
    &.active {
      background: linear-gradient(135deg, #16A34A 0%, #22C55E 100%);
      box-shadow: 0 4rpx 16rpx rgba(22, 163, 74, 0.3);
      
      .quick-filter-icon,
      .quick-filter-text {
        color: #ffffff;
      }
    }
  }
  
  /* 本月按钮 - 橙色 */
  &.month {
    background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
    
    .quick-filter-icon,
    .quick-filter-text {
      color: #EA580C;
    }
    
    &.active {
      background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);
      box-shadow: 0 4rpx 16rpx rgba(234, 88, 12, 0.3);
      
      .quick-filter-icon,
      .quick-filter-text {
        color: #ffffff;
      }
    }
  }
  
  /* 后一天按钮 - 紫色 */
  &.nextday {
    background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
    
    .quick-filter-icon,
    .quick-filter-text {
      color: #7C3AED;
    }
    
    .quick-filter-date {
      color: #A78BFA;
    }
    
    &.active {
      background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%);
      box-shadow: 0 4rpx 16rpx rgba(124, 58, 237, 0.3);
      
      .quick-filter-icon,
      .quick-filter-text,
      .quick-filter-date {
        color: #ffffff;
      }
    }
  }
}

.quick-filter-icon {
  font-size: 36rpx;
  margin-bottom: 8rpx;
  color: #2563EB;
}

.quick-filter-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #1E40AF;
}

.quick-filter-date {
  font-size: 20rpx;
  color: #60A5FA;
  margin-top: 4rpx;
}

/* ==================== 日期和仓库筛选 ==================== */
.filter-section {
  background-color: #ffffff;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.date-filter {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.filter-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.filter-label {
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 4rpx;
}

.filter-value {
  font-size: 26rpx;
  color: #333333;
}

.filter-separator {
  font-size: 24rpx;
  color: #999999;
  margin: 0 16rpx;
}

/* 仓库筛选和排序 */
.extra-filter {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

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
  font-size: 26rpx;
  color: #333333;
}

.warehouse-arrow {
  font-size: 20rpx;
  color: #999999;
}

/* 排序按钮 */
.sort-btn {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: #e6f0ff;
  border-radius: 8rpx;
}

.sort-icon {
  font-size: 28rpx;
  color: #4a90e2;
  margin-right: 8rpx;
}

.sort-text {
  font-size: 26rpx;
  color: #4a90e2;
}

/* ==================== 统计区域（2列布局，与主项目对齐） ==================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 32rpx;
}

.stats-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.stats-label {
  font-size: 28rpx;
  color: #6B7280;
}

.stats-icon {
  font-size: 40rpx;
}

.stats-value {
  font-size: 56rpx;
  font-weight: bold;
  color: #1E3A8A;
  display: block;
  
  &.highlight {
    color: #16A34A;
  }
}

.stats-card.income {
  .stats-value {
    color: #16A34A;
  }
}

/* ==================== 列表区域 ==================== */
.list-section {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.list-title-wrapper {
  display: flex;
  align-items: center;
}

.list-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.list-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1F2937;
}

.list-count {
  font-size: 24rpx;
  color: #9CA3AF;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #9CA3AF;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 24rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 32rpx;
  color: #6B7280;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #9CA3AF;
}

/* ==================== 记录卡片（与主项目对齐） ==================== */
/* Requirements: 2.9, 2.10 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.record-card {
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

/* 日期标签卡片（蓝色渐变背景，与主项目对齐） */
/* Requirements: 2.9 */
.date-tag-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
  box-shadow: 0 4rpx 12rpx rgba(37, 99, 235, 0.3);
}

.date-tag-left {
  display: flex;
  align-items: center;
}

.date-tag-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.date-tag-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

.date-tag-weekday {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 记录内容 */
.record-content {
  padding: 24rpx;
}

.record-header {
  margin-bottom: 20rpx;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.info-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.info-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.warehouse-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F2937;
}

.category-name {
  font-size: 26rpx;
  color: #4B5563;
}

/* 标签（上楼/分拣，与主项目对齐） */
/* Requirements: 2.10 */
.tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  margin-left: 8rpx;
}

.upstairs-tag {
  color: #2563EB;
  background-color: #DBEAFE;
}

.sorting-tag {
  color: #7C3AED;
  background-color: #EDE9FE;
}

/* 数据明细卡片（网格布局，与主项目对齐） */
.record-detail-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 22rpx;
  color: #9CA3AF;
  margin-bottom: 4rpx;
}

.detail-value {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F2937;
  
  &.upstairs {
    color: #2563EB;
  }
  
  &.sorting {
    color: #7C3AED;
  }
}

/* 总金额卡片（绿色渐变背景，与主项目对齐） */
.total-amount-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.total-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #374151;
}

.total-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #16A34A;
}

/* 备注 */
.record-remark {
  background-color: #FEF9C3;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}

.remark-text {
  font-size: 24rpx;
  color: #713F12;
}

/* 操作按钮（渐变背景，与主项目对齐） */
.record-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  border-radius: 12rpx;
  transition: all 0.2s;
  
  &:active {
    transform: scale(0.95);
  }
}

.edit-btn {
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3);
}

.delete-btn {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  box-shadow: 0 4rpx 12rpx rgba(239, 68, 68, 0.3);
}

.action-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.action-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}

/* ==================== 编辑弹窗（支持上楼和分拣字段，与主项目对齐） ==================== */
.edit-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-modal {
  width: 90%;
  max-width: 680rpx;
  max-height: 85vh;
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.edit-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
}

.edit-modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.edit-modal-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.close-icon {
  font-size: 40rpx;
  color: #ffffff;
}

.edit-modal-body {
  flex: 1;
  padding: 24rpx;
  overflow-y: auto;
}

/* 编辑区块 */
.edit-section {
  background-color: #F9FAFB;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.edit-section-title {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.section-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #1F2937;
}

.edit-info-row {
  display: flex;
  margin-bottom: 12rpx;
  padding: 8rpx 0;
}

.edit-label {
  width: 160rpx;
  font-size: 28rpx;
  color: #6B7280;
  flex-shrink: 0;
}

.edit-value {
  flex: 1;
  font-size: 28rpx;
  color: #1F2937;
}

.edit-form-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.required {
  color: #EF4444;
}

.edit-input {
  flex: 1;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #ffffff;
  border: 2rpx solid #E5E7EB;
  border-radius: 12rpx;
  font-size: 28rpx;
}

/* 开关行样式 */
.edit-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background-color: #EFF6FF;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  
  &.sorting {
    background-color: #F5F3FF;
  }
}

.switch-label {
  font-size: 28rpx;
  color: #374151;
}

.edit-modal-footer {
  display: flex;
  border-top: 2rpx solid #E5E7EB;
}

.modal-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.cancel-btn {
  background-color: #F3F4F6;
  
  .btn-text {
    color: #6B7280;
  }
}

.confirm-btn {
  background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
  
  .btn-text {
    color: #ffffff;
    font-weight: bold;
  }
}

.btn-text {
  font-size: 32rpx;
}

/* ==================== 浮动按钮 ==================== */
.fab-btn {
  position: fixed;
  right: 32rpx;
  bottom: 120rpx;
  width: 112rpx;
  height: 112rpx;
  background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(234, 88, 12, 0.4);
  transition: all 0.2s;
  
  &:active {
    transform: scale(0.95);
  }
}

.fab-icon {
  font-size: 56rpx;
  color: #ffffff;
  font-weight: bold;
}
</style>
