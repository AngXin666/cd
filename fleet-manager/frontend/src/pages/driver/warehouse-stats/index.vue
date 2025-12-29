<template>
  <!--
    司机仓库统计页面
    显示司机在指定仓库的考勤和计件统计数据
    支持日期范围筛选（本周/本月/全部）
    
    @module pages/driver/warehouse-stats
  -->
  <view class="warehouse-stats-page">
    <!-- 顶部导航栏 -->
    <TopNavBar 
      title="仓库统计" 
      :show-back="true"
      @back="handleBack"
    />

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <scroll-view v-else scroll-y class="page-content">
      <!-- 仓库标题卡片 -->
      <view class="warehouse-header">
        <view class="warehouse-info">
          <text class="warehouse-name">{{ warehouse?.name || '仓库统计' }}</text>
          <text class="warehouse-desc">查看考勤和计件统计数据</text>
        </view>
      </view>

      <!-- 日期范围选择 -->
      <view class="date-range-card">
        <view class="card-header">
          <text class="card-icon">📅</text>
          <text class="card-title">时间范围</text>
        </view>
        <view class="date-range-selector">
          <view 
            v-for="option in dateRangeOptions" 
            :key="option.value"
            :class="['range-option', { active: dateRange === option.value }]"
            @click="handleDateRangeChange(option.value)"
          >
            <text class="range-text">{{ option.label }}</text>
          </view>
        </view>
      </view>

      <!-- 考勤统计概览 -->
      <view class="stats-card">
        <view class="card-header">
          <text class="card-icon">⏰</text>
          <text class="card-title">考勤统计</text>
        </view>
        <view class="stats-grid">
          <view class="stat-item blue">
            <text class="stat-value">{{ attendanceStats.total }}</text>
            <text class="stat-label">出勤天数</text>
          </view>
          <view class="stat-item green">
            <text class="stat-value">{{ attendanceStats.normal }}</text>
            <text class="stat-label">正常天数</text>
          </view>
          <view class="stat-item orange">
            <text class="stat-value">{{ attendanceStats.late }}</text>
            <text class="stat-label">迟到次数</text>
          </view>
          <view class="stat-item purple">
            <text class="stat-value">{{ attendanceStats.totalHours.toFixed(1) }}</text>
            <text class="stat-label">总工时</text>
          </view>
        </view>
      </view>

      <!-- 考勤记录列表 -->
      <view class="records-card">
        <view class="card-header">
          <text class="card-icon">📋</text>
          <text class="card-title">考勤记录</text>
          <text class="card-count">{{ attendanceRecords.length }} 条</text>
        </view>
        
        <view v-if="attendanceRecords.length > 0" class="records-list">
          <view 
            v-for="record in attendanceRecords" 
            :key="record.id"
            class="record-item"
          >
            <view class="record-header">
              <text class="record-date">{{ formatDateChinese(record.work_date) }}</text>
              <view :class="['status-tag', getStatusClass(record.status)]">
                <text class="status-text">{{ getStatusText(record.status) }}</text>
              </view>
            </view>
            <view class="record-details">
              <view class="detail-item">
                <text class="detail-icon">🟢</text>
                <text class="detail-text">{{ formatTime(record.clock_in_time) }}</text>
              </view>
              <view v-if="record.clock_out_time" class="detail-item">
                <text class="detail-icon">🔴</text>
                <text class="detail-text">{{ formatTime(record.clock_out_time) }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-icon">⏱️</text>
                <text class="detail-text">{{ formatWorkHours(record.work_hours) }}</text>
              </view>
            </view>
          </view>
        </view>
        
        <view v-else class="empty-state">
          <text class="empty-icon">📅</text>
          <text class="empty-text">暂无考勤记录</text>
        </view>
      </view>

      <!-- 计件统计概览 -->
      <view class="stats-card">
        <view class="card-header">
          <text class="card-icon">📦</text>
          <text class="card-title">计件统计</text>
        </view>
        <view class="stats-grid-3">
          <view class="stat-item orange">
            <text class="stat-value">{{ pieceWorkStats.record_count }}</text>
            <text class="stat-label">完成订单</text>
          </view>
          <view class="stat-item blue">
            <text class="stat-value">{{ pieceWorkStats.total_quantity }}</text>
            <text class="stat-label">总数量</text>
          </view>
          <view class="stat-item green">
            <text class="stat-value">¥{{ pieceWorkStats.total_amount.toFixed(2) }}</text>
            <text class="stat-label">总金额</text>
          </view>
        </view>

        <!-- 按品类统计 -->
        <view v-if="categoryStats.length > 0" class="category-stats">
          <text class="category-title">按品类统计</text>
          <view 
            v-for="item in categoryStats" 
            :key="item.category_id"
            class="category-item"
          >
            <view class="category-info">
              <text class="category-icon">🏷️</text>
              <text class="category-name">{{ item.category_name }}</text>
            </view>
            <view class="category-data">
              <text class="category-quantity">数量: {{ item.quantity }}</text>
              <text class="category-amount">¥{{ item.amount.toFixed(2) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 计件记录列表 -->
      <view class="records-card">
        <view class="card-header">
          <text class="card-icon">📝</text>
          <text class="card-title">计件记录</text>
          <text class="card-count">{{ pieceWorkRecords.length }} 条</text>
        </view>
        
        <view v-if="pieceWorkRecords.length > 0" class="records-list">
          <view 
            v-for="record in pieceWorkRecords" 
            :key="record.id"
            class="piece-work-item"
          >
            <view class="piece-work-header">
              <view class="piece-work-category">
                <text class="category-icon">🏷️</text>
                <text class="category-text">{{ record.category_name || '未知品类' }}</text>
                <view v-if="record.need_upstairs" class="upstairs-tag">
                  <text class="tag-text">需上楼</text>
                </view>
              </view>
              <text class="piece-work-date">{{ formatDateChinese(record.work_date) }}</text>
            </view>
            <view class="piece-work-details">
              <text class="detail-text">数量: {{ record.quantity }}</text>
              <text class="detail-text">单价: ¥{{ (record.unit_price || 0).toFixed(2) }}</text>
              <text v-if="record.need_upstairs" class="detail-text">
                上楼: ¥{{ (record.upstairs_price || 0).toFixed(2) }}
              </text>
              <text class="amount-text">¥{{ record.amount.toFixed(2) }}</text>
            </view>
            <view v-if="record.remark" class="piece-work-remark">
              <text class="remark-text">{{ record.remark }}</text>
            </view>
          </view>
        </view>
        
        <view v-else class="empty-state">
          <text class="empty-icon">📦</text>
          <text class="empty-text">暂无计件记录</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 司机仓库统计页面
 * 显示司机在指定仓库的考勤和计件统计数据
 * 
 * @description 支持日期范围筛选（本周/本月/全部）
 * 显示考勤统计（出勤天数、正常天数、迟到次数、总工时）
 * 显示计件统计（完成订单、总数量、总金额、按品类统计）
 */

import { ref, computed, onMounted, watch } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { 
  getWarehouse, 
  getAttendanceRecords, 
  getPieceWorkRecords,
  getPieceWorkStats,
} from '@/api'
import type { Warehouse, AttendanceRecord, PieceWorkRecord, PieceWorkStats } from '@/api/types'
import { navigateBack } from '@/utils'
import TopNavBar from '@/components/TopNavBar/index.vue'

// ==================== 类型定义 ====================

/** 日期范围选项 */
interface DateRangeOption {
  label: string
  value: 'week' | 'month' | 'all'
}

/** 品类统计项 */
interface CategoryStatItem {
  category_id: number
  category_name: string
  quantity: number
  amount: number
}

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 仓库ID */
const warehouseId = ref<number>(0)

/** 仓库信息 */
const warehouse = ref<Warehouse | null>(null)

/** 日期范围 */
const dateRange = ref<'week' | 'month' | 'all'>('month')

/** 考勤记录 */
const attendanceRecords = ref<AttendanceRecord[]>([])

/** 计件记录 */
const pieceWorkRecords = ref<PieceWorkRecord[]>([])

/** 计件统计 */
const pieceWorkStats = ref<PieceWorkStats>({
  total_quantity: 0,
  total_amount: 0,
  record_count: 0,
})

/** 品类统计 */
const categoryStats = ref<CategoryStatItem[]>([])

// ==================== 常量 ====================

/** 日期范围选项 */
const dateRangeOptions: DateRangeOption[] = [
  { label: '最近一周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '全部', value: 'all' },
]

// ==================== 计算属性 ====================

/**
 * 考勤统计
 */
const attendanceStats = computed(() => {
  const records = attendanceRecords.value
  return {
    total: records.length,
    normal: records.filter(r => r.status === 'normal').length,
    late: records.filter(r => r.status === 'late').length,
    early: records.filter(r => r.status === 'early').length,
    totalHours: records.reduce((sum, r) => sum + (Number(r.work_hours) || 0), 0),
  }
})

// ==================== 生命周期 ====================

onLoad((options) => {
  if (options?.warehouseId) {
    warehouseId.value = parseInt(options.warehouseId as string, 10)
  }
})

onMounted(() => {
  if (warehouseId.value) {
    loadData()
  }
})

/**
 * 下拉刷新
 */
onPullDownRefresh(async () => {
  try {
    await loadData()
  } finally {
    uni.stopPullDownRefresh()
  }
})

/**
 * 监听日期范围变化
 */
watch(dateRange, () => {
  loadData()
})

// ==================== 方法 ====================

/**
 * 计算日期范围
 */
function getDateRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  let startDate = ''

  if (dateRange.value === 'week') {
    // 最近一周
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    startDate = weekAgo.toISOString().split('T')[0]
  } else if (dateRange.value === 'month') {
    // 本月第一天
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }
  // 'all' 时 startDate 为空，表示不限制开始日期

  return { startDate, endDate }
}

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  if (!warehouseId.value || !userStore.user?.id) return

  loading.value = true
  try {
    const { startDate, endDate } = getDateRange()
    const userId = userStore.user.id

    // 并行加载数据
    const [warehouseData, attendanceData, pieceWorkData, statsData] = await Promise.all([
      // 加载仓库信息
      getWarehouse(warehouseId.value),
      // 加载考勤记录
      getAttendanceRecords({
        user_id: userId,
        warehouse_id: warehouseId.value,
        start_date: startDate || undefined,
        end_date: endDate,
        limit: 100,
      }),
      // 加载计件记录
      getPieceWorkRecords({
        user_id: userId,
        warehouse_id: warehouseId.value,
        start_date: startDate || undefined,
        end_date: endDate,
      }),
      // 加载计件统计
      getPieceWorkStats({
        user_id: userId,
        warehouse_id: warehouseId.value,
        start_date: startDate || undefined,
        end_date: endDate,
      }),
    ])

    warehouse.value = warehouseData
    attendanceRecords.value = attendanceData
    pieceWorkRecords.value = pieceWorkData
    pieceWorkStats.value = statsData

    // 计算品类统计
    calculateCategoryStats(pieceWorkData)
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
 * 计算品类统计
 */
function calculateCategoryStats(records: PieceWorkRecord[]): void {
  const statsMap = new Map<number, CategoryStatItem>()

  for (const record of records) {
    const categoryId = record.category_id
    const existing = statsMap.get(categoryId)

    if (existing) {
      existing.quantity += record.quantity
      existing.amount += record.amount
    } else {
      statsMap.set(categoryId, {
        category_id: categoryId,
        category_name: record.category_name || '未知品类',
        quantity: record.quantity,
        amount: record.amount,
      })
    }
  }

  categoryStats.value = Array.from(statsMap.values())
}

/**
 * 处理日期范围变化
 */
function handleDateRangeChange(value: 'week' | 'month' | 'all'): void {
  dateRange.value = value
}

/**
 * 格式化日期（中文格式）
 */
function formatDateChinese(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 格式化时间
 */
function formatTime(timeStr: string | null): string {
  if (!timeStr) return '--:--'
  // 如果是完整的 ISO 时间字符串，提取时间部分
  if (timeStr.includes('T')) {
    return timeStr.split('T')[1].substring(0, 5)
  }
  // 如果已经是时间格式
  return timeStr.substring(0, 5)
}

/**
 * 格式化工时
 */
function formatWorkHours(hours: number | null): string {
  if (!hours) return '0小时'
  return `${hours.toFixed(1)}小时`
}

/**
 * 获取状态文本
 */
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    normal: '正常',
    late: '迟到',
    early: '早退',
    absent: '缺勤',
  }
  return statusMap[status] || '未知'
}

/**
 * 获取状态样式类
 */
function getStatusClass(status: string): string {
  const classMap: Record<string, string> = {
    normal: 'status-normal',
    late: 'status-late',
    early: 'status-early',
    absent: 'status-absent',
  }
  return classMap[status] || 'status-unknown'
}

/**
 * 返回上一页
 */
function handleBack(): void {
  navigateBack()
}
</script>

<style lang="scss" scoped>
/**
 * 司机仓库统计页面样式
 */

.warehouse-stats-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #F8FAFC, #E2E8F0);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

.page-content {
  height: calc(100vh - 88rpx);
  padding: 24rpx;
  padding-bottom: 48rpx;
}

/* 仓库标题卡片 */
.warehouse-header {
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(30, 58, 138, 0.3);
}

.warehouse-info {
  display: flex;
  flex-direction: column;
}

.warehouse-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.warehouse-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 日期范围选择卡片 */
.date-range-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.card-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1F2937;
  flex: 1;
}

.card-count {
  font-size: 24rpx;
  color: #9CA3AF;
}

.date-range-selector {
  display: flex;
  gap: 16rpx;
}

.range-option {
  flex: 1;
  padding: 16rpx;
  background-color: #F3F4F6;
  border-radius: 12rpx;
  text-align: center;
  transition: all 0.2s;

  &.active {
    background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
  }

  &:active {
    opacity: 0.8;
  }
}

.range-text {
  font-size: 26rpx;
  color: #6B7280;

  .active & {
    color: #ffffff;
    font-weight: 500;
  }
}

/* 统计卡片 */
.stats-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.stats-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.stat-item {
  padding: 24rpx 16rpx;
  border-radius: 16rpx;
  text-align: center;

  &.blue {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  }

  &.green {
    background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
  }

  &.orange {
    background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
  }

  &.purple {
    background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  }
}

.stat-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #1F2937;
  display: block;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #6B7280;
}

/* 品类统计 */
.category-stats {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F3F4F6;
}

.category-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #374151;
  margin-bottom: 16rpx;
  display: block;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #F9FAFB;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.category-info {
  display: flex;
  align-items: center;
}

.category-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.category-name {
  font-size: 26rpx;
  color: #374151;
}

.category-data {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.category-quantity {
  font-size: 24rpx;
  color: #6B7280;
}

.category-amount {
  font-size: 26rpx;
  font-weight: 500;
  color: #059669;
}

/* 记录卡片 */
.records-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 考勤记录项 */
.record-item {
  background-color: #F9FAFB;
  border-radius: 16rpx;
  padding: 20rpx;
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.record-date {
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
}

.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.status-normal {
  background-color: #D1FAE5;
}

.status-late {
  background-color: #FED7AA;
}

.status-early {
  background-color: #FECACA;
}

.status-absent {
  background-color: #E5E7EB;
}

.status-unknown {
  background-color: #E5E7EB;
}

.status-text {
  font-size: 22rpx;

  .status-normal & {
    color: #059669;
  }

  .status-late & {
    color: #EA580C;
  }

  .status-early & {
    color: #DC2626;
  }

  .status-absent &,
  .status-unknown & {
    color: #6B7280;
  }
}

.record-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-item {
  display: flex;
  align-items: center;
}

.detail-icon {
  font-size: 24rpx;
  margin-right: 8rpx;
}

.detail-text {
  font-size: 24rpx;
  color: #6B7280;
}

/* 计件记录项 */
.piece-work-item {
  background-color: #F9FAFB;
  border-radius: 16rpx;
  padding: 20rpx;
}

.piece-work-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.piece-work-category {
  display: flex;
  align-items: center;
}

.category-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
}

.upstairs-tag {
  margin-left: 12rpx;
  padding: 4rpx 12rpx;
  background-color: #DBEAFE;
  border-radius: 6rpx;
}

.tag-text {
  font-size: 20rpx;
  color: #1D4ED8;
}

.piece-work-date {
  font-size: 24rpx;
  color: #9CA3AF;
}

.piece-work-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12rpx;
}

.piece-work-details .detail-text {
  font-size: 24rpx;
  color: #6B7280;
}

.amount-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #059669;
}

.piece-work-remark {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #E5E7EB;
}

.remark-text {
  font-size: 24rpx;
  color: #9CA3AF;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 26rpx;
  color: #9CA3AF;
}
</style>
