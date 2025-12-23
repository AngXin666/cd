<template>
  <!-- 
    考勤记录页面
    显示历史打卡记录，支持日期筛选
  -->
  <view class="attendance-page">
    <!-- 日期筛选 -->
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

    <!-- 统计信息 -->
    <view class="stats-section">
      <view class="stats-item">
        <text class="stats-value">{{ records.length }}</text>
        <text class="stats-label">出勤天数</text>
      </view>
      <view class="stats-item">
        <text class="stats-value">{{ formatWorkHours(totalWorkHours) }}</text>
        <text class="stats-label">总工时</text>
      </view>
    </view>

    <!-- 记录列表 -->
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
          class="record-item"
        >
          <view class="record-date">
            <text class="date-text">{{ formatDate(record.work_date) }}</text>
            <text class="weekday-text">{{ getWeekday(record.work_date) }}</text>
          </view>
          <view class="record-times">
            <view class="time-item">
              <text class="time-label">上班</text>
              <text :class="['time-value', record.clock_in ? 'success' : 'error']">
                {{ record.clock_in ? formatTime(record.clock_in) : '缺卡' }}
              </text>
            </view>
            <view class="time-item">
              <text class="time-label">下班</text>
              <text :class="['time-value', record.clock_out ? 'success' : 'error']">
                {{ record.clock_out ? formatTime(record.clock_out) : '缺卡' }}
              </text>
            </view>
          </view>
          <view class="record-hours">
            <text class="hours-value">
              {{ record.work_hours ? formatWorkHours(record.work_hours) : '-' }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 考勤记录页面
 * 显示历史打卡记录，支持日期筛选
 */

import { ref, computed, onMounted } from 'vue'
import { getAttendanceRecords } from '@/api'
import type { Attendance } from '@/api/types'
import { formatDate, formatTime, formatWorkHours } from '@/utils'

// ==================== 状态 ====================

/** 考勤记录列表 */
const records = ref<Attendance[]>([])

/** 加载状态 */
const loading = ref(false)

/** 开始日期 */
const startDate = ref('')

/** 结束日期 */
const endDate = ref('')

// ==================== 计算属性 ====================

/** 总工时 */
const totalWorkHours = computed(() => {
  return records.value.reduce((sum, record) => {
    return sum + (record.work_hours || 0)
  }, 0)
})

// ==================== 生命周期 ====================

onMounted(() => {
  // 默认查询本月数据
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  // 本月第一天
  startDate.value = `${year}-${String(month).padStart(2, '0')}-01`
  
  // 今天
  endDate.value = formatDate(now)
  
  // 加载数据
  loadRecords()
})

// ==================== 方法 ====================

/**
 * 加载考勤记录
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
 */
function onStartDateChange(e: any): void {
  startDate.value = e.detail.value
}

/**
 * 结束日期变化
 */
function onEndDateChange(e: any): void {
  endDate.value = e.detail.value
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
 * 获取星期几
 * 
 * @param dateStr - 日期字符串
 * @returns 星期几文本
 */
function getWeekday(dateStr: string): string {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const date = new Date(dateStr)
  return weekdays[date.getDay()]
}
</script>

<style lang="scss" scoped>
.attendance-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 筛选区域 */
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

/* 统计区域 */
.stats-section {
  display: flex;
  background-color: #ffffff;
  padding: 32rpx;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #4a90e2;
  margin-bottom: 8rpx;
}

.stats-label {
  font-size: 24rpx;
  color: #999999;
}

/* 列表区域 */
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

/* 记录列表 */
.record-list {
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.record-item:last-child {
  border-bottom: none;
}

.record-date {
  width: 140rpx;
}

.date-text {
  font-size: 26rpx;
  color: #333333;
  display: block;
}

.weekday-text {
  font-size: 22rpx;
  color: #999999;
}

.record-times {
  flex: 1;
  display: flex;
  justify-content: center;
}

.time-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 24rpx;
}

.time-label {
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 4rpx;
}

.time-value {
  font-size: 26rpx;
  font-weight: 500;
  
  &.success {
    color: #52c41a;
  }
  
  &.error {
    color: #ff4d4f;
  }
}

.record-hours {
  width: 120rpx;
  text-align: right;
}

.hours-value {
  font-size: 26rpx;
  color: #4a90e2;
  font-weight: 500;
}
</style>
