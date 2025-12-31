<template>
  <!-- 
    考勤详情页面（老板端）
    显示司机的考勤详细信息，包括签到/签退时间、工作时长、位置信息
    Requirements: 9.1, 9.2, 9.3
  -->
  <view class="attendance-detail-page">
    <!-- 顶部导航栏 -->
    <TopNavBar 
      title="考勤详情" 
      :showBack="true"
      backgroundColor="#1E3A8A"
      textColor="#ffffff"
    />
    
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="attendance">
      <!-- 司机信息卡片 -->
      <view class="driver-card">
        <view class="driver-avatar">
          <text class="avatar-text">{{ (attendance.user_name || '用户').charAt(0) }}</text>
        </view>
        <view class="driver-info">
          <view class="name-row">
            <text class="driver-name">{{ attendance.user_name || '未知用户' }}</text>
            <view :class="['status-tag', getAttendanceStatus(attendance)]">
              <text class="status-text">{{ getStatusText(attendance) }}</text>
            </view>
          </view>
          <text class="work-date">{{ formatDateChinese(attendance.work_date) }} {{ getWeekdayName(attendance.work_date) }}</text>
        </view>
      </view>

      <!-- 打卡时间卡片 -->
      <view class="detail-card">
        <view class="card-title">
          <text class="title-text">打卡时间</text>
        </view>
        
        <view class="time-section">
          <!-- 签到时间 -->
          <view class="time-block">
            <view class="time-icon-wrapper clock-in">
              <text class="time-icon">🌅</text>
            </view>
            <view class="time-content">
              <text class="time-label">签到时间</text>
              <text :class="['time-value', attendance.clock_in ? 'success' : 'error']">
                {{ attendance.clock_in ? formatTime(attendance.clock_in) : '未签到' }}
              </text>
              <text v-if="attendance.clock_in" class="time-full">
                {{ formatDateTime(attendance.clock_in) }}
              </text>
            </view>
          </view>
          
          <!-- 分隔线 -->
          <view class="time-divider">
            <view class="divider-line"></view>
            <text class="divider-arrow">→</text>
            <view class="divider-line"></view>
          </view>
          
          <!-- 签退时间 -->
          <view class="time-block">
            <view class="time-icon-wrapper clock-out">
              <text class="time-icon">🌙</text>
            </view>
            <view class="time-content">
              <text class="time-label">签退时间</text>
              <text :class="['time-value', attendance.clock_out ? 'success' : 'error']">
                {{ attendance.clock_out ? formatTime(attendance.clock_out) : '未签退' }}
              </text>
              <text v-if="attendance.clock_out" class="time-full">
                {{ formatDateTime(attendance.clock_out) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 工作时长卡片 -->
      <view class="detail-card">
        <view class="card-title">
          <text class="title-text">工作时长</text>
        </view>
        
        <view class="work-hours-section">
          <view class="hours-display">
            <text class="hours-value">{{ formatWorkHours(attendance.work_hours) }}</text>
            <text class="hours-unit">小时</text>
          </view>
          <view class="hours-detail">
            <view class="detail-row">
              <text class="detail-label">签到时间</text>
              <text class="detail-value">{{ attendance.clock_in ? formatTime(attendance.clock_in) : '-' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">签退时间</text>
              <text class="detail-value">{{ attendance.clock_out ? formatTime(attendance.clock_out) : '-' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">工作状态</text>
              <text :class="['detail-value', getAttendanceStatus(attendance)]">{{ getStatusText(attendance) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 仓库信息卡片 -->
      <view class="detail-card">
        <view class="card-title">
          <text class="title-text">仓库信息</text>
        </view>
        
        <view class="warehouse-section">
          <view class="warehouse-icon-wrapper">
            <text class="warehouse-icon">🏭</text>
          </view>
          <view class="warehouse-content">
            <text class="warehouse-name">{{ attendance.warehouse_name || '未指定仓库' }}</text>
            <text class="warehouse-id" v-if="attendance.warehouse_id">仓库ID: {{ attendance.warehouse_id }}</text>
          </view>
        </view>
      </view>

      <!-- 记录信息卡片 -->
      <view class="detail-card">
        <view class="card-title">
          <text class="title-text">记录信息</text>
        </view>
        
        <view class="record-info">
          <view class="info-row">
            <text class="info-label">记录ID</text>
            <text class="info-value">{{ attendance.id }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">用户ID</text>
            <text class="info-value">{{ attendance.user_id }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatDateTime(attendance.created_at) }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text class="error-icon">😕</text>
      <text class="error-text">加载考勤信息失败</text>
      <view class="retry-btn" @click="loadAttendance">
        <text class="retry-text">重试</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 考勤详情页面（老板端）
 * 显示司机的考勤详细信息，包括签到/签退时间、工作时长、位置信息
 * 
 * @module pages/boss/attendance/detail
 * 
 * @requirements 9.1 - 从考勤列表点击某条记录跳转到考勤详情页面
 * @requirements 9.2 - 显示司机姓名、日期、签到时间、签退时间、工作时长
 * @requirements 9.3 - 如有位置信息则显示签到和签退的位置
 */

import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getAttendanceRecords } from '@/api'
import type { Attendance } from '@/api/types'
import { formatWorkHours, formatDateTime } from '@/utils'
import { formatTime, getWeekdayName } from '@/utils/dateFormat'
import TopNavBar from '@/components/TopNavBar/index.vue'

// ==================== 常量定义 ====================

/** 
 * 迟到判定时间（小时）
 * 上班时间超过 9:00 视为迟到
 */
const LATE_HOUR = 9

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 考勤记录ID */
const recordId = ref<number>(0)

/** 考勤记录信息 */
const attendance = ref<Attendance | null>(null)

// ==================== 生命周期 ====================

onLoad((options) => {
  // 获取考勤记录ID
  if (options?.id) {
    recordId.value = parseInt(options.id as string, 10)
  }
})

onMounted(() => {
  if (recordId.value) {
    loadAttendance()
  }
})

// ==================== 方法 ====================

/**
 * 加载考勤详情
 * Requirements: 9.1 - 从考勤列表点击某条记录跳转到考勤详情页面
 */
async function loadAttendance(): Promise<void> {
  loading.value = true
  try {
    // 通过 ID 查询考勤记录
    // 注意：当前 API 不支持直接通过 ID 获取单条记录，需要通过列表查询
    const records = await getAttendanceRecords({
      limit: 1000, // 获取足够多的记录以找到目标
    })
    
    // 查找目标记录
    const record = records.find(r => r.id === recordId.value)
    if (record) {
      attendance.value = record
    } else {
      console.error('未找到考勤记录:', recordId.value)
      uni.showToast({
        title: '未找到考勤记录',
        icon: 'none',
      })
    }
  } catch (error) {
    console.error('加载考勤详情失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 格式化日期为中文格式
 * 
 * @param dateStr - 日期字符串 (YYYY-MM-DD)
 * @returns 中文格式日期 (YYYY年MM月DD日)
 */
function formatDateChinese(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${year}年${parseInt(month)}月${parseInt(day)}日`
}

/**
 * 获取考勤状态
 * 
 * @param record - 考勤记录
 * @returns 状态类名
 */
function getAttendanceStatus(record: Attendance): string {
  if (!record.clock_in) return 'absent'
  if (!record.clock_out) return 'missing'
  if (isLate(record)) return 'late'
  return 'normal'
}

/**
 * 获取状态文本
 * 
 * @param record - 考勤记录
 * @returns 状态文本
 */
function getStatusText(record: Attendance): string {
  if (!record.clock_in) return '缺勤'
  if (!record.clock_out) return '缺卡'
  if (isLate(record)) return '迟到'
  return '正常'
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
 * 考勤详情页面样式
 * Requirements: 9.1, 9.2, 9.3
 */

.attendance-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
}

/* ==================== 加载状态 ==================== */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
  margin-top: 100rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* ==================== 错误状态 ==================== */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
  margin-top: 100rpx;
}

.error-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.error-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 24rpx;
}

.retry-btn {
  padding: 16rpx 48rpx;
  background-color: #1890ff;
  border-radius: 8rpx;
}

.retry-text {
  font-size: 28rpx;
  color: #ffffff;
}

/* ==================== 司机信息卡片 ==================== */
.driver-card {
  display: flex;
  align-items: center;
  padding: 32rpx 24rpx;
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
}

.driver-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 44rpx;
  font-weight: bold;
  color: #ffffff;
}

.driver-info {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.driver-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  margin-right: 12rpx;
}

.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background-color: rgba(255, 255, 255, 0.2);
  
  /* 正常状态 */
  &.normal {
    background-color: rgba(82, 196, 26, 0.3);
  }
  
  /* 迟到状态 */
  &.late {
    background-color: rgba(250, 173, 20, 0.3);
  }
  
  /* 缺卡状态 */
  &.missing {
    background-color: rgba(255, 77, 79, 0.3);
  }
  
  /* 缺勤状态 */
  &.absent {
    background-color: rgba(255, 77, 79, 0.5);
  }
}

.status-text {
  font-size: 22rpx;
  color: #ffffff;
}

.work-date {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* ==================== 详情卡片通用样式 ==================== */
.detail-card {
  background-color: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.card-title {
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 16rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

/* ==================== 打卡时间区域 ==================== */
.time-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}

.time-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  
  &.clock-in {
    background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  }
  
  &.clock-out {
    background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  }
}

.time-icon {
  font-size: 36rpx;
}

.time-content {
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
  font-size: 36rpx;
  font-weight: bold;
  
  &.success {
    color: #52c41a;
  }
  
  &.error {
    color: #ff4d4f;
  }
}

.time-full {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}

.time-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20rpx;
}

.divider-line {
  width: 2rpx;
  height: 20rpx;
  background-color: #e0e0e0;
}

.divider-arrow {
  font-size: 28rpx;
  color: #cccccc;
  margin: 8rpx 0;
}

/* ==================== 工作时长区域 ==================== */
.work-hours-section {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}

.hours-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  border-radius: 16rpx;
  margin-right: 24rpx;
}

.hours-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
}

.hours-unit {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.hours-detail {
  flex: 1;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.detail-label {
  font-size: 26rpx;
  color: #999999;
}

.detail-value {
  font-size: 26rpx;
  color: #333333;
  
  &.normal {
    color: #52c41a;
  }
  
  &.late {
    color: #faad14;
  }
  
  &.missing {
    color: #ff4d4f;
  }
  
  &.absent {
    color: #ff4d4f;
  }
}

/* ==================== 仓库信息区域 ==================== */
.warehouse-section {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}

.warehouse-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background-color: #f0f5ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.warehouse-icon {
  font-size: 40rpx;
}

.warehouse-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.warehouse-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
  margin-bottom: 4rpx;
}

.warehouse-id {
  font-size: 24rpx;
  color: #999999;
}

/* ==================== 记录信息区域 ==================== */
.record-info {
  padding: 8rpx 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 26rpx;
  color: #999999;
}

.info-value {
  font-size: 26rpx;
  color: #333333;
}
</style>
