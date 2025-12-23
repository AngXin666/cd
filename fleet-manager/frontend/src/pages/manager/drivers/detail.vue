<template>
  <!-- 
    司机详情页面
    显示司机档案信息
    显示考勤记录和计件记录
  -->
  <view class="driver-detail-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="driver">
      <!-- 司机基本信息卡片 -->
      <view class="info-card">
        <view class="driver-header">
          <view class="driver-avatar">
            <text class="avatar-text">{{ driver.name.charAt(0) }}</text>
          </view>
          <view class="driver-info">
            <view class="name-row">
              <text class="driver-name">{{ driver.name }}</text>
              <view :class="['status-tag', driver.is_active ? 'active' : 'inactive']">
                <text class="status-text">{{ driver.is_active ? '在职' : '离职' }}</text>
              </view>
            </view>
            <text class="driver-phone">{{ driver.phone || '未设置手机号' }}</text>
          </view>
        </view>
        
        <view class="info-list">
          <view class="info-item">
            <text class="info-label">用户名</text>
            <text class="info-value">{{ driver.username }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">入职时间</text>
            <text class="info-value">{{ formatDate(driver.created_at) }}</text>
          </view>
        </view>
      </view>

      <!-- 标签页切换 -->
      <view class="tab-bar">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          :class="['tab-item', { active: activeTab === tab.value }]"
          @click="activeTab = tab.value"
        >
          <text class="tab-text">{{ tab.label }}</text>
        </view>
      </view>

      <!-- 考勤记录 -->
      <view v-if="activeTab === 'attendance'" class="record-section">
        <view v-if="attendanceRecords.length === 0" class="empty-records">
          <text class="empty-text">暂无考勤记录</text>
        </view>
        <view v-else class="record-list">
          <view
            v-for="record in attendanceRecords"
            :key="record.id"
            class="record-card"
          >
            <view class="record-date">
              <text class="date-text">{{ formatDate(record.work_date) }}</text>
            </view>
            <view class="record-content">
              <view class="record-item">
                <text class="record-label">上班</text>
                <text :class="['record-value', record.clock_in ? 'success' : 'pending']">
                  {{ record.clock_in ? formatTime(record.clock_in) : '未打卡' }}
                </text>
              </view>
              <view class="record-item">
                <text class="record-label">下班</text>
                <text :class="['record-value', record.clock_out ? 'success' : 'pending']">
                  {{ record.clock_out ? formatTime(record.clock_out) : '未打卡' }}
                </text>
              </view>
              <view class="record-item">
                <text class="record-label">工时</text>
                <text class="record-value">
                  {{ record.work_hours ? formatWorkHours(record.work_hours) : '-' }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 计件记录 -->
      <view v-if="activeTab === 'piecework'" class="record-section">
        <!-- 计件统计 -->
        <view class="stats-card">
          <view class="stats-item">
            <text class="stats-value">{{ pieceWorkStats.record_count }}</text>
            <text class="stats-label">记录数</text>
          </view>
          <view class="stats-item">
            <text class="stats-value">{{ pieceWorkStats.total_quantity }}</text>
            <text class="stats-label">总数量</text>
          </view>
          <view class="stats-item">
            <text class="stats-value highlight">¥{{ formatMoney(pieceWorkStats.total_amount) }}</text>
            <text class="stats-label">总金额</text>
          </view>
        </view>

        <view v-if="pieceWorkRecords.length === 0" class="empty-records">
          <text class="empty-text">暂无计件记录</text>
        </view>
        <view v-else class="record-list">
          <view
            v-for="record in pieceWorkRecords"
            :key="record.id"
            class="record-card piecework-card"
          >
            <view class="piecework-header">
              <text class="category-name">{{ record.category_name || '未知分类' }}</text>
              <text class="piecework-date">{{ formatDate(record.work_date) }}</text>
            </view>
            <view class="piecework-content">
              <view class="piecework-item">
                <text class="piecework-label">数量</text>
                <text class="piecework-value">{{ record.quantity }}</text>
              </view>
              <view class="piecework-item">
                <text class="piecework-label">金额</text>
                <text class="piecework-value highlight">¥{{ formatMoney(record.amount) }}</text>
              </view>
            </view>
            <view v-if="record.remark" class="piecework-remark">
              <text class="remark-text">备注：{{ record.remark }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text class="error-text">加载司机信息失败</text>
      <view class="retry-btn" @click="loadDriverDetail">
        <text class="retry-text">重试</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 司机详情页面
 * 显示司机档案信息
 * 显示考勤记录和计件记录
 */

import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getUser, getAttendanceRecords, getPieceWorkRecords, getPieceWorkStats } from '@/api'
import type { User, Attendance, PieceWorkRecord, PieceWorkStats } from '@/api/types'
import { formatDate, formatTime, formatWorkHours, formatMoney } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 司机ID */
const driverId = ref<number>(0)

/** 司机信息 */
const driver = ref<User | null>(null)

/** 当前标签页 */
const activeTab = ref<'attendance' | 'piecework'>('attendance')

/** 考勤记录 */
const attendanceRecords = ref<Attendance[]>([])

/** 计件记录 */
const pieceWorkRecords = ref<PieceWorkRecord[]>([])

/** 计件统计 */
const pieceWorkStats = ref<PieceWorkStats>({
  total_quantity: 0,
  total_amount: 0,
  record_count: 0,
})

/** 标签页配置 */
const tabs = [
  { label: '考勤记录', value: 'attendance' as const },
  { label: '计件记录', value: 'piecework' as const },
]

// ==================== 生命周期 ====================

onLoad((options) => {
  // 获取司机ID
  if (options?.id) {
    driverId.value = parseInt(options.id as string, 10)
  }
})

onMounted(() => {
  if (driverId.value) {
    loadDriverDetail()
  }
})

// ==================== 方法 ====================

/**
 * 加载司机详情
 */
async function loadDriverDetail(): Promise<void> {
  loading.value = true
  try {
    // 并行加载司机信息和记录
    const [driverData, attendanceData, pieceWorkData, statsData] = await Promise.all([
      getUser(driverId.value),
      getAttendanceRecords({ user_id: driverId.value, limit: 30 }),
      getPieceWorkRecords({ user_id: driverId.value, limit: 30 }),
      getPieceWorkStats({ user_id: driverId.value }),
    ])
    
    driver.value = driverData
    attendanceRecords.value = attendanceData
    pieceWorkRecords.value = pieceWorkData
    pieceWorkStats.value = statsData
  } catch (error) {
    console.error('加载司机详情失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.driver-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
}

/* 加载状态 */
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

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
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

/* 基本信息卡片 */
.info-card {
  background-color: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.driver-header {
  display: flex;
  align-items: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.driver-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
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
  color: #333333;
  margin-right: 12rpx;
}

.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  
  &.active {
    background-color: #e6f7e6;
    
    .status-text {
      color: #52c41a;
    }
  }
  
  &.inactive {
    background-color: #fff2e8;
    
    .status-text {
      color: #fa8c16;
    }
  }
}

.status-text {
  font-size: 22rpx;
}

.driver-phone {
  font-size: 28rpx;
  color: #666666;
}

.info-list {
  padding-top: 24rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.info-label {
  font-size: 28rpx;
  color: #999999;
}

.info-value {
  font-size: 28rpx;
  color: #333333;
}

/* 标签页 */
.tab-bar {
  display: flex;
  background-color: #ffffff;
  margin: 0 24rpx;
  border-radius: 16rpx 16rpx 0 0;
}

.tab-item {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  position: relative;
  
  &.active {
    .tab-text {
      color: #1890ff;
      font-weight: bold;
    }
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background-color: #1890ff;
      border-radius: 2rpx;
    }
  }
}

.tab-text {
  font-size: 28rpx;
  color: #666666;
}

/* 记录区域 */
.record-section {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 0 0 16rpx 16rpx;
  padding: 24rpx;
}

/* 统计卡片 */
.stats-card {
  display: flex;
  background-color: #f8f9fa;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
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
  color: #333333;
  margin-bottom: 8rpx;
  
  &.highlight {
    color: #ff6b35;
  }
}

.stats-label {
  font-size: 24rpx;
  color: #999999;
}

/* 空记录 */
.empty-records {
  padding: 48rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 记录列表 */
.record-list {
  // 考勤记录样式
}

.record-card {
  background-color: #f8f9fa;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.record-date {
  margin-bottom: 12rpx;
}

.date-text {
  font-size: 26rpx;
  color: #666666;
}

.record-content {
  display: flex;
}

.record-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.record-label {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 4rpx;
}

.record-value {
  font-size: 26rpx;
  color: #333333;
  
  &.success {
    color: #52c41a;
  }
  
  &.pending {
    color: #faad14;
  }
}

/* 计件记录卡片 */
.piecework-card {
  // 继承 record-card 样式
}

.piecework-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.category-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
}

.piecework-date {
  font-size: 24rpx;
  color: #999999;
}

.piecework-content {
  display: flex;
}

.piecework-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.piecework-label {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 4rpx;
}

.piecework-value {
  font-size: 28rpx;
  color: #333333;
  
  &.highlight {
    color: #ff6b35;
  }
}

.piecework-remark {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #e8e8e8;
}

.remark-text {
  font-size: 24rpx;
  color: #999999;
}
</style>
