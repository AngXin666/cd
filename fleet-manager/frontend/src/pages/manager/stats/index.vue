<template>
  <!-- 
    统计报表页面
    显示考勤统计和计件汇总
    支持日期范围筛选
  -->
  <view class="stats-page">
    <!-- 日期筛选 -->
    <view class="filter-section">
      <view class="date-picker">
        <picker mode="date" :value="startDate" @change="handleStartDateChange">
          <view class="date-input">
            <text class="date-label">开始</text>
            <text class="date-value">{{ startDate }}</text>
          </view>
        </picker>
        <text class="date-separator">至</text>
        <picker mode="date" :value="endDate" @change="handleEndDateChange">
          <view class="date-input">
            <text class="date-label">结束</text>
            <text class="date-value">{{ endDate }}</text>
          </view>
        </picker>
      </view>
      
      <!-- 快捷日期选择 -->
      <view class="quick-dates">
        <view
          v-for="item in quickDateOptions"
          :key="item.value"
          :class="['quick-date-btn', { active: activeQuickDate === item.value }]"
          @click="handleQuickDateSelect(item.value)"
        >
          <text class="quick-date-text">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 考勤统计卡片 -->
      <view class="stats-card">
        <view class="card-header">
          <text class="card-title">📅 考勤统计</text>
        </view>
        <view class="stats-grid">
          <view class="stats-item">
            <text class="stats-value">{{ attendanceStats.totalDays }}</text>
            <text class="stats-label">总天数</text>
          </view>
          <view class="stats-item">
            <text class="stats-value success">{{ attendanceStats.normalDays }}</text>
            <text class="stats-label">正常出勤</text>
          </view>
          <view class="stats-item">
            <text class="stats-value warning">{{ attendanceStats.lateDays }}</text>
            <text class="stats-label">迟到</text>
          </view>
          <view class="stats-item">
            <text class="stats-value">{{ formatWorkHours(attendanceStats.totalHours) }}</text>
            <text class="stats-label">总工时</text>
          </view>
        </view>
      </view>

      <!-- 计件统计卡片 -->
      <view class="stats-card">
        <view class="card-header">
          <text class="card-title">📊 计件统计</text>
        </view>
        <view class="stats-grid">
          <view class="stats-item">
            <text class="stats-value">{{ pieceWorkStats.record_count }}</text>
            <text class="stats-label">记录数</text>
          </view>
          <view class="stats-item">
            <text class="stats-value">{{ pieceWorkStats.total_quantity }}</text>
            <text class="stats-label">总数量</text>
          </view>
          <view class="stats-item full-width">
            <text class="stats-value highlight">¥{{ formatMoney(pieceWorkStats.total_amount) }}</text>
            <text class="stats-label">总金额</text>
          </view>
        </view>
      </view>

      <!-- 司机排行榜 -->
      <view class="ranking-card">
        <view class="card-header">
          <text class="card-title">🏆 司机计件排行</text>
        </view>
        
        <view v-if="driverRanking.length === 0" class="empty-ranking">
          <text class="empty-text">暂无数据</text>
        </view>
        
        <view v-else class="ranking-list">
          <view
            v-for="(driver, index) in driverRanking"
            :key="driver.user_id"
            class="ranking-item"
          >
            <view class="ranking-index">
              <text :class="['index-text', { top: index < 3 }]">{{ index + 1 }}</text>
            </view>
            <view class="ranking-info">
              <text class="driver-name">{{ driver.user_name }}</text>
              <text class="driver-stats">{{ driver.quantity }} 件</text>
            </view>
            <view class="ranking-amount">
              <text class="amount-text">¥{{ formatMoney(driver.amount) }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 统计报表页面
 * 显示考勤统计和计件汇总
 * 支持日期范围筛选
 */

import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAttendanceRecords, getPieceWorkRecords, getPieceWorkStats } from '@/api'
import type { Attendance, PieceWorkRecord, PieceWorkStats } from '@/api/types'
import { formatMoney, getToday } from '@/utils'

// ==================== 类型定义 ====================

/** 司机排行数据 */
interface DriverRankingItem {
  user_id: number
  user_name: string
  quantity: number
  amount: number
}

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 开始日期 */
const startDate = ref(getMonthStart())

/** 结束日期 */
const endDate = ref(getToday())

/** 当前选中的快捷日期 */
const activeQuickDate = ref<string>('month')

/** 考勤统计 */
const attendanceStats = ref({
  totalDays: 0,
  normalDays: 0,
  lateDays: 0,
  totalHours: 0,
})

/** 计件统计 */
const pieceWorkStats = ref<PieceWorkStats>({
  total_quantity: 0,
  total_amount: 0,
  record_count: 0,
})

/** 司机排行榜 */
const driverRanking = ref<DriverRankingItem[]>([])

/** 快捷日期选项 */
const quickDateOptions = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
]

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
})

onShow(() => {
  loadData()
})

// ==================== 方法 ====================

/**
 * 获取本月第一天
 */
function getMonthStart(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

/**
 * 获取本周第一天
 */
function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  now.setDate(now.getDate() - diff)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

/**
 * 格式化工时
 */
function formatWorkHours(hours: number): string {
  if (!hours) return '0h'
  return `${hours.toFixed(1)}h`
}

/**
 * 加载统计数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    const params = {
      start_date: startDate.value,
      end_date: endDate.value,
    }
    
    const [attendanceData, pieceWorkData, statsData] = await Promise.all([
      getAttendanceRecords(params),
      getPieceWorkRecords(params),
      getPieceWorkStats(params),
    ])
    
    processAttendanceStats(attendanceData)
    pieceWorkStats.value = statsData
    processDriverRanking(pieceWorkData)
  } catch (error) {
    console.error('加载统计数据失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 处理考勤统计数据
 */
function processAttendanceStats(records: Attendance[]): void {
  let totalDays = records.length
  let normalDays = 0
  let lateDays = 0
  let totalHours = 0
  const normalClockInHour = 9
  
  records.forEach(record => {
    if (record.work_hours) totalHours += record.work_hours
    if (record.clock_in) {
      const clockInTime = new Date(record.clock_in)
      if (clockInTime.getHours() > normalClockInHour) {
        lateDays++
      } else {
        normalDays++
      }
    }
  })
  
  attendanceStats.value = { totalDays, normalDays, lateDays, totalHours }
}

/**
 * 处理司机排行数据
 */
function processDriverRanking(records: PieceWorkRecord[]): void {
  const driverMap = new Map<number, DriverRankingItem>()
  
  records.forEach(record => {
    const existing = driverMap.get(record.user_id)
    if (existing) {
      existing.quantity += record.quantity
      existing.amount += record.amount
    } else {
      driverMap.set(record.user_id, {
        user_id: record.user_id,
        user_name: record.user_name || '未知用户',
        quantity: record.quantity,
        amount: record.amount,
      })
    }
  })
  
  driverRanking.value = Array.from(driverMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
}

/**
 * 处理开始日期变化
 */
function handleStartDateChange(e: { detail: { value: string } }): void {
  startDate.value = e.detail.value
  activeQuickDate.value = ''
  loadData()
}

/**
 * 处理结束日期变化
 */
function handleEndDateChange(e: { detail: { value: string } }): void {
  endDate.value = e.detail.value
  activeQuickDate.value = ''
  loadData()
}

/**
 * 处理快捷日期选择
 */
function handleQuickDateSelect(value: string): void {
  activeQuickDate.value = value
  const today = getToday()
  
  switch (value) {
    case 'today':
      startDate.value = today
      endDate.value = today
      break
    case 'week':
      startDate.value = getWeekStart()
      endDate.value = today
      break
    case 'month':
      startDate.value = getMonthStart()
      endDate.value = today
      break
  }
  
  loadData()
}
</script>

<style lang="scss" scoped>
.stats-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
}

.filter-section {
  background-color: #ffffff;
  padding: 24rpx;
}

.date-picker {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.date-input {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
}

.date-label {
  font-size: 24rpx;
  color: #999999;
  margin-right: 12rpx;
}

.date-value {
  font-size: 28rpx;
  color: #333333;
}

.date-separator {
  font-size: 28rpx;
  color: #999999;
  margin: 0 16rpx;
}

.quick-dates {
  display: flex;
  gap: 16rpx;
}

.quick-date-btn {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  
  &.active {
    background-color: #e6f7ff;
    .quick-date-text { color: #1890ff; }
  }
}

.quick-date-text {
  font-size: 26rpx;
  color: #666666;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

.stats-card {
  background-color: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.card-header {
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.stats-grid {
  display: flex;
  flex-wrap: wrap;
}

.stats-item {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;
  
  &.full-width { width: 100%; }
}

.stats-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
  
  &.highlight { color: #ff6b35; }
  &.success { color: #52c41a; }
  &.warning { color: #faad14; }
}

.stats-label {
  font-size: 24rpx;
  color: #999999;
}

.ranking-card {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.empty-ranking {
  padding: 48rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  
  &:last-child { border-bottom: none; }
}

.ranking-index {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.index-text {
  font-size: 28rpx;
  color: #999999;
  
  &.top {
    font-size: 32rpx;
    font-weight: bold;
    color: #ff6b35;
  }
}

.ranking-info {
  flex: 1;
}

.driver-name {
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 4rpx;
}

.driver-stats {
  font-size: 24rpx;
  color: #999999;
}

.amount-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff6b35;
}
</style>


<style lang="scss" scoped>
.stats-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
}

/* 时间筛选 */
.filter-section {
  display: flex;
  background-color: #ffffff;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}

.period-btn {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  margin-right: 12rpx;
  
  &:last-child { margin-right: 0; }
  
  &.active {
    background-color: #1890ff;
    .period-text { color: #ffffff; }
  }
}

.period-text { font-size: 28rpx; color: #666666; }

/* 加载状态 */
.loading-container {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text { font-size: 28rpx; color: #999999; }

/* 统计卡片 */
.stats-card, .rank-card {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.card-header { margin-bottom: 20rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333333; }

.stats-grid {
  display: flex;
  flex-wrap: wrap;
}

.grid-item {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  
  &.full { width: 100%; }
}

.grid-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
  
  &.success { color: #52c41a; }
  &.warning { color: #faad14; }
  &.danger { color: #ff4d4f; }
  &.highlight { color: #ff6b35; }
}

.grid-label { font-size: 24rpx; color: #999999; }

.stats-summary {
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
  text-align: center;
}

.summary-text { font-size: 28rpx; color: #1890ff; font-weight: bold; }

/* 排行榜 */
.empty-rank {
  padding: 48rpx 0;
  text-align: center;
}

.empty-text { font-size: 28rpx; color: #999999; }

.rank-list { }

.rank-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  
  &:last-child { border-bottom: none; }
}

.rank-index {
  width: 60rpx;
  text-align: center;
}

.index-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #999999;
  
  &.rank-1 { color: #ffd700; }
  &.rank-2 { color: #c0c0c0; }
  &.rank-3 { color: #cd7f32; }
}

.rank-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rank-name { font-size: 28rpx; color: #333333; margin-bottom: 4rpx; }
.rank-count { font-size: 24rpx; color: #999999; }

.rank-amount { }
.amount-text { font-size: 30rpx; font-weight: bold; color: #ff6b35; }
</style>
