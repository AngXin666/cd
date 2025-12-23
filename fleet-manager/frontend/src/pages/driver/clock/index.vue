<template>
  <!-- 
    打卡页面
    实现上班/下班打卡功能，显示当前打卡状态
  -->
  <view class="clock-page">
    <!-- 日期显示 -->
    <view class="date-section">
      <text class="date-text">{{ currentDate }}</text>
      <text class="weekday-text">{{ weekdayText }}</text>
    </view>

    <!-- 时钟显示 -->
    <view class="clock-section">
      <text class="time-text">{{ currentTime }}</text>
    </view>

    <!-- 打卡状态 -->
    <view class="status-section">
      <view class="status-row">
        <view class="status-item">
          <text class="status-label">上班打卡</text>
          <text :class="['status-value', attendance.has_clocked_in ? 'success' : 'pending']">
            {{ attendance.has_clocked_in ? formatTime(attendance.clock_in_time) : '未打卡' }}
          </text>
        </view>
        <view class="status-item">
          <text class="status-label">下班打卡</text>
          <text :class="['status-value', attendance.has_clocked_out ? 'success' : 'pending']">
            {{ attendance.has_clocked_out ? formatTime(attendance.clock_out_time) : '未打卡' }}
          </text>
        </view>
      </view>
      
      <!-- 工时显示 -->
      <view v-if="attendance.work_hours" class="work-hours">
        <text class="work-hours-label">今日工时：</text>
        <text class="work-hours-value">{{ formatWorkHours(attendance.work_hours) }}</text>
      </view>
    </view>

    <!-- 打卡按钮 -->
    <view class="action-section">
      <!-- 上班打卡按钮 -->
      <view 
        v-if="!attendance.has_clocked_in"
        class="clock-button clock-in"
        @click="handleClockIn"
      >
        <text class="button-icon">🌅</text>
        <text class="button-text">上班打卡</text>
      </view>

      <!-- 下班打卡按钮 -->
      <view 
        v-else-if="!attendance.has_clocked_out"
        class="clock-button clock-out"
        @click="handleClockOut"
      >
        <text class="button-icon">🌆</text>
        <text class="button-text">下班打卡</text>
      </view>

      <!-- 已完成打卡 -->
      <view v-else class="clock-done">
        <text class="done-icon">✅</text>
        <text class="done-text">今日打卡已完成</text>
      </view>
    </view>

    <!-- 提示信息 -->
    <view class="tips-section">
      <text class="tips-title">打卡说明</text>
      <view class="tips-list">
        <text class="tips-item">• 每天只能打卡一次上班和一次下班</text>
        <text class="tips-item">• 打卡时间将自动记录</text>
        <text class="tips-item">• 工时根据上下班时间自动计算</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-content">
        <text class="loading-text">{{ loadingText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 打卡页面
 * 实现上班/下班打卡功能
 * 显示当前时间和打卡状态
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getTodayAttendance, clockIn, clockOut } from '@/api'
import type { TodayAttendance } from '@/api/types'
import { formatTime, formatWorkHours } from '@/utils'

// ==================== 状态 ====================

/** 当前时间 */
const currentTime = ref('')

/** 当前日期 */
const currentDate = ref('')

/** 星期几 */
const weekdayText = ref('')

/** 打卡状态 */
const attendance = ref<TodayAttendance>({
  has_clocked_in: false,
  has_clocked_out: false,
  clock_in_time: null,
  clock_out_time: null,
  work_hours: null,
})

/** 加载状态 */
const loading = ref(false)

/** 加载文本 */
const loadingText = ref('加载中...')

/** 定时器 ID */
let timer: ReturnType<typeof setInterval> | null = null

// ==================== 生命周期 ====================

onMounted(() => {
  // 更新时间
  updateTime()
  
  // 启动定时器，每秒更新时间
  timer = setInterval(updateTime, 1000)
  
  // 加载打卡状态
  loadAttendance()
})

onUnmounted(() => {
  // 清除定时器
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

onShow(() => {
  // 刷新打卡状态
  loadAttendance()
})

// ==================== 方法 ====================

/**
 * 更新当前时间
 */
function updateTime(): void {
  const now = new Date()
  
  // 格式化时间 HH:mm:ss
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
  
  // 格式化日期 YYYY年MM月DD日
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  currentDate.value = `${year}年${month}月${day}日`
  
  // 星期几
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  weekdayText.value = weekdays[now.getDay()]
}

/**
 * 加载打卡状态
 */
async function loadAttendance(): Promise<void> {
  try {
    const data = await getTodayAttendance()
    attendance.value = data
  } catch (error) {
    console.error('加载打卡状态失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  }
}

/**
 * 上班打卡
 */
async function handleClockIn(): Promise<void> {
  // 确认打卡
  uni.showModal({
    title: '确认打卡',
    content: '确定要进行上班打卡吗？',
    success: async (res) => {
      if (res.confirm) {
        await doClockIn()
      }
    },
  })
}

/**
 * 执行上班打卡
 */
async function doClockIn(): Promise<void> {
  loading.value = true
  loadingText.value = '打卡中...'
  
  try {
    await clockIn()
    
    // 刷新状态
    await loadAttendance()
    
    uni.showToast({
      title: '上班打卡成功',
      icon: 'success',
    })
  } catch (error: any) {
    console.error('上班打卡失败:', error)
    uni.showToast({
      title: error.message || '打卡失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 下班打卡
 */
async function handleClockOut(): Promise<void> {
  // 确认打卡
  uni.showModal({
    title: '确认打卡',
    content: '确定要进行下班打卡吗？',
    success: async (res) => {
      if (res.confirm) {
        await doClockOut()
      }
    },
  })
}

/**
 * 执行下班打卡
 */
async function doClockOut(): Promise<void> {
  loading.value = true
  loadingText.value = '打卡中...'
  
  try {
    await clockOut()
    
    // 刷新状态
    await loadAttendance()
    
    uni.showToast({
      title: '下班打卡成功',
      icon: 'success',
    })
  } catch (error: any) {
    console.error('下班打卡失败:', error)
    uni.showToast({
      title: error.message || '打卡失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}
</script>


<style lang="scss" scoped>
.clock-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
}

/* 日期区域 */
.date-section {
  text-align: center;
  margin-bottom: 32rpx;
}

.date-text {
  font-size: 32rpx;
  color: #333333;
  display: block;
  margin-bottom: 8rpx;
}

.weekday-text {
  font-size: 28rpx;
  color: #666666;
}

/* 时钟区域 */
.clock-section {
  text-align: center;
  margin-bottom: 48rpx;
}

.time-text {
  font-size: 96rpx;
  font-weight: bold;
  color: #333333;
  font-family: 'Courier New', monospace;
}

/* 状态区域 */
.status-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 48rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.status-row {
  display: flex;
}

.status-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.status-label {
  font-size: 26rpx;
  color: #999999;
  margin-bottom: 12rpx;
}

.status-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  
  &.success {
    color: #52c41a;
  }
  
  &.pending {
    color: #faad14;
  }
}

.work-hours {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0f0f0;
}

.work-hours-label {
  font-size: 28rpx;
  color: #666666;
}

.work-hours-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #4a90e2;
  margin-left: 8rpx;
}

/* 打卡按钮区域 */
.action-section {
  display: flex;
  justify-content: center;
  margin-bottom: 48rpx;
}

.clock-button {
  width: 280rpx;
  height: 280rpx;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  
  &.clock-in {
    background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  }
  
  &.clock-out {
    background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  }
}

.button-icon {
  font-size: 64rpx;
  margin-bottom: 12rpx;
}

.button-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

.clock-done {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.done-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.done-text {
  font-size: 32rpx;
  color: #52c41a;
  font-weight: bold;
}

/* 提示区域 */
.tips-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.tips-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
  display: block;
}

.tips-list {
  display: flex;
  flex-direction: column;
}

.tips-item {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.8;
}

/* 加载遮罩 */
.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-content {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 48rpx 64rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #333333;
}
</style>
