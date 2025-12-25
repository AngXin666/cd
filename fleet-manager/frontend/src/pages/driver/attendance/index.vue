<template>
  <!-- 
    考勤记录页面
    显示历史打卡记录，支持快捷筛选、日期范围筛选、出勤统计
    Requirements: 7.1-7.4
  -->
  <view class="attendance-page">
    <!-- 快捷筛选按钮组 -->
    <!-- Requirements: 7.1 - 显示快捷筛选按钮（今天/本周/本月） -->
    <view class="quick-filter-section">
      <view 
        class="quick-filter-btn"
        :class="{ active: quickFilter === 'today' }"
        @click="setQuickFilter('today')"
      >
        <text class="quick-filter-text">今天</text>
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

    <!-- 日期范围筛选 -->
    <!-- Requirements: 7.2 - 根据选择过滤考勤记录 -->
    <view class="filter-section">
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
      <view class="filter-btn" @click="handleSearch">
        <text class="filter-btn-text">查询</text>
      </view>
    </view>

    <!-- 出勤统计 -->
    <!-- Requirements: 7.3 - 显示出勤天数、迟到次数等统计 -->
    <view class="stats-section">
      <view class="stats-item">
        <text class="stats-value">{{ attendanceStats.totalDays }}</text>
        <text class="stats-label">出勤天数</text>
      </view>
      <view class="stats-item">
        <text class="stats-value warning">{{ attendanceStats.lateDays }}</text>
        <text class="stats-label">迟到次数</text>
      </view>
      <view class="stats-item">
        <text class="stats-value">{{ formatWorkHours(attendanceStats.totalWorkHours) }}</text>
        <text class="stats-label">总工时</text>
      </view>
      <view class="stats-item">
        <text class="stats-value highlight">{{ formatWorkHours(attendanceStats.avgWorkHours) }}</text>
        <text class="stats-label">日均工时</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <!-- Requirements: 7.4 - 显示日期、仓库、上班时间、下班时间和工时 -->
    <view class="list-section">
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="records.length === 0" class="empty-container">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无考勤记录</text>
      </view>
      
      <view v-else class="record-list">
        <view 
          v-for="record in records" 
          :key="record.id" 
          class="record-card"
        >
          <!-- 日期标签卡片（蓝色渐变背景） -->
          <view class="date-tag-card">
            <text class="date-tag-text">{{ formatDateChineseYMD(record.work_date) }}</text>
            <text class="date-tag-weekday">{{ getWeekdayName(record.work_date) }}</text>
          </view>
          
          <!-- 记录内容 -->
          <view class="record-content">
            <!-- 仓库信息 -->
            <view class="record-header">
              <view class="warehouse-info">
                <text class="warehouse-icon">🏭</text>
                <text class="warehouse-name">{{ record.warehouse_name || '未指定仓库' }}</text>
              </view>
              <!-- 状态标签 -->
              <view class="status-tags">
                <text v-if="isLate(record)" class="tag late-tag">迟到</text>
                <text v-if="!record.clock_out" class="tag missing-tag">缺卡</text>
              </view>
            </view>
            
            <!-- 打卡时间 -->
            <view class="record-times">
              <view class="time-block">
                <text class="time-label">上班打卡</text>
                <text :class="['time-value', record.clock_in ? 'success' : 'error']">
                  {{ record.clock_in ? formatTime(record.clock_in) : '缺卡' }}
                </text>
              </view>
              <view class="time-divider">
                <text class="divider-line">→</text>
              </view>
              <view class="time-block">
                <text class="time-label">下班打卡</text>
                <text :class="['time-value', record.clock_out ? 'success' : 'error']">
                  {{ record.clock_out ? formatTime(record.clock_out) : '缺卡' }}
                </text>
              </view>
            </view>
            
            <!-- 工时信息 -->
            <view class="record-footer">
              <view class="work-hours">
                <text class="hours-label">工时：</text>
                <text class="hours-value">
                  {{ record.work_hours ? formatWorkHours(record.work_hours) : '-' }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 考勤记录页面
 * 显示历史打卡记录，支持快捷筛选、日期范围筛选、出勤统计
 * 
 * @module pages/driver/attendance/index
 * 
 * Requirements:
 * - 7.1: 显示快捷筛选按钮（今天/本周/本月）
 * - 7.2: 根据选择过滤考勤记录
 * - 7.3: 显示出勤天数、迟到次数等统计
 * - 7.4: 显示日期、仓库、上班时间、下班时间和工时
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAttendanceRecords } from '@/api'
import type { Attendance } from '@/api/types'
import { formatWorkHours } from '@/utils'
import { 
  getLocalDateString, 
  getMondayDateString, 
  getFirstDayOfMonthString,
} from '@/utils/date'
import { formatDateChineseYMD, formatTime, getWeekdayName } from '@/utils/dateFormat'

// ==================== 类型定义 ====================

/** 快捷筛选类型 */
type QuickFilterType = 'today' | 'week' | 'month' | 'custom'

/** 出勤统计数据 */
interface AttendanceStats {
  /** 出勤天数 */
  totalDays: number
  /** 迟到次数 */
  lateDays: number
  /** 总工时（小时） */
  totalWorkHours: number
  /** 日均工时（小时） */
  avgWorkHours: number
}

// ==================== 常量定义 ====================

/** 
 * 迟到判定时间（小时）
 * 上班时间超过 9:00 视为迟到
 */
const LATE_HOUR = 9

// ==================== 状态 ====================

/** 考勤记录列表 */
const records = ref<Attendance[]>([])

/** 加载状态 */
const loading = ref(false)

/** 开始日期 */
const startDate = ref('')

/** 结束日期 */
const endDate = ref('')

/** 快捷筛选类型 */
const quickFilter = ref<QuickFilterType>('month')

// ==================== 计算属性 ====================

/**
 * 出勤统计数据
 * Requirements: 7.3 - 显示出勤天数、迟到次数等统计
 */
const attendanceStats = computed<AttendanceStats>(() => {
  const totalDays = records.value.length
  
  // 计算迟到次数（上班时间超过 9:00）
  const lateDays = records.value.filter(record => isLate(record)).length
  
  // 计算总工时
  const totalWorkHours = records.value.reduce((sum, record) => {
    return sum + (record.work_hours || 0)
  }, 0)
  
  // 计算日均工时
  const avgWorkHours = totalDays > 0 ? totalWorkHours / totalDays : 0
  
  return {
    totalDays,
    lateDays,
    totalWorkHours,
    avgWorkHours,
  }
})

// ==================== 生命周期 ====================

onMounted(() => {
  // 默认查询本月数据
  setQuickFilter('month')
})

onShow(() => {
  // 刷新数据
  if (startDate.value && endDate.value) {
    loadRecords()
  }
})

// ==================== 方法 ====================

/**
 * 设置快捷筛选
 * Requirements: 7.1 - 显示快捷筛选按钮（今天/本周/本月）
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
  }
  
  // 加载数据
  loadRecords()
}

/**
 * 加载考勤记录
 * Requirements: 7.2 - 根据选择过滤考勤记录
 */
async function loadRecords(): Promise<void> {
  loading.value = true
  
  try {
    const data = await getAttendanceRecords({
      start_date: startDate.value,
      end_date: endDate.value,
      limit: 100,
    })
    records.value = data
  } catch (error) {
    console.error('加载考勤记录失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 开始日期变化
 * 
 * @param e - 事件对象
 */
function onStartDateChange(e: any): void {
  startDate.value = e.detail.value
  quickFilter.value = 'custom'
}

/**
 * 结束日期变化
 * 
 * @param e - 事件对象
 */
function onEndDateChange(e: any): void {
  endDate.value = e.detail.value
  quickFilter.value = 'custom'
}

/**
 * 查询按钮点击
 */
function handleSearch(): void {
  if (!startDate.value || !endDate.value) {
    uni.showToast({
      title: '请选择日期范围',
      icon: 'none',
    })
    return
  }
  
  loadRecords()
}

/**
 * 判断是否迟到
 * 上班时间超过 9:00 视为迟到
 * 
 * @param record - 考勤记录
 * @returns 是否迟到
 */
function isLate(record: Attendance): boolean {
  if (!record.clock_in) return false
  
  const clockInTime = new Date(record.clock_in)
  const hour = clockInTime.getHours()
  
  // 上班时间超过 9:00 视为迟到
  return hour >= LATE_HOUR
}
</script>

<style lang="scss" scoped>
/**
 * 考勤记录页面样式
 * Requirements: 7.1-7.4
 */

.attendance-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* ==================== 快捷筛选按钮组 ==================== */
/* Requirements: 7.1 */
.quick-filter-section {
  display: flex;
  background-color: #ffffff;
  padding: 20rpx 24rpx;
  gap: 16rpx;
}

.quick-filter-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
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
  font-size: 28rpx;
  color: #666666;
}

/* ==================== 日期筛选区域 ==================== */
/* Requirements: 7.2 */
.filter-section {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.filter-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx;
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

.filter-btn {
  background-color: #4a90e2;
  padding: 20rpx 32rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;
}

.filter-btn-text {
  font-size: 26rpx;
  color: #ffffff;
}

/* ==================== 统计区域 ==================== */
/* Requirements: 7.3 */
.stats-section {
  display: flex;
  background-color: #ffffff;
  padding: 32rpx;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #4a90e2;
  margin-bottom: 8rpx;
  
  /* 警告颜色（迟到） */
  &.warning {
    color: #faad14;
  }
  
  /* 高亮颜色（日均工时） */
  &.highlight {
    color: #52c41a;
  }
}

.stats-label {
  font-size: 24rpx;
  color: #999999;
}

/* ==================== 列表区域 ==================== */
.list-section {
  padding: 0 24rpx;
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
  color: #999999;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* ==================== 记录卡片 ==================== */
/* Requirements: 7.4 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding-bottom: 40rpx;
}

.record-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

/* 日期标签卡片（蓝色渐变背景） */
.date-tag-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
}

.date-tag-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}

.date-tag-weekday {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 记录内容 */
.record-content {
  padding: 20rpx 24rpx;
}

/* 仓库信息 */
.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.warehouse-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.warehouse-icon {
  font-size: 28rpx;
}

.warehouse-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}

/* 状态标签 */
.status-tags {
  display: flex;
  gap: 8rpx;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}

.late-tag {
  color: #faad14;
  background-color: #fffbe6;
}

.missing-tag {
  color: #ff4d4f;
  background-color: #fff1f0;
}

/* 打卡时间 */
.record-times {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-top: 1rpx solid #f0f0f0;
  border-bottom: 1rpx solid #f0f0f0;
}

.time-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-label {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 8rpx;
}

.time-value {
  font-size: 32rpx;
  font-weight: 500;
  
  &.success {
    color: #52c41a;
  }
  
  &.error {
    color: #ff4d4f;
  }
}

.time-divider {
  padding: 0 20rpx;
}

.divider-line {
  font-size: 28rpx;
  color: #cccccc;
}

/* 工时信息 */
.record-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16rpx;
}

.work-hours {
  display: flex;
  align-items: center;
}

.hours-label {
  font-size: 26rpx;
  color: #999999;
}

.hours-value {
  font-size: 28rpx;
  font-weight: 500;
  color: #4a90e2;
}
</style>
