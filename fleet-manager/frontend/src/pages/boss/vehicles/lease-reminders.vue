<template>
  <!-- 
    租金提醒列表页面
    显示即将到期的租金缴纳提醒
  -->
  <view class="reminders-page">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <text class="filter-label">提前提醒天数：</text>
      <picker 
        mode="selector" 
        :range="daysOptions" 
        :value="selectedDaysIndex"
        @change="onDaysChange"
      >
        <view class="filter-picker">
          <text class="picker-text">{{ daysOptions[selectedDaysIndex] }} 天</text>
          <text class="picker-arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="reminders.length === 0" class="empty-container">
      <text class="empty-icon">🎉</text>
      <text class="empty-text">暂无租金提醒</text>
      <text class="empty-sub">{{ daysOptions[selectedDaysIndex] }} 天内没有需要缴纳的租金</text>
    </view>

    <!-- 提醒列表 -->
    <view v-else class="reminder-list">
      <view 
        v-for="item in reminders" 
        :key="item.id" 
        class="reminder-card"
        @click="goToDetail(item.id)"
      >
        <!-- 紧急程度标识 -->
        <view :class="['urgency-bar', getUrgencyClass(item.days_until_payment)]"></view>
        
        <view class="card-content">
          <!-- 车辆信息 -->
          <view class="vehicle-info">
            <text class="license-plate">{{ item.license_plate }}</text>
            <text class="vehicle-model">{{ item.brand || '' }} {{ item.model || '' }}</text>
          </view>
          
          <!-- 租金信息 -->
          <view class="rent-info">
            <view class="rent-row">
              <text class="rent-label">月租金</text>
              <text class="rent-value">¥{{ item.monthly_rent || 0 }}</text>
            </view>
            <view class="rent-row">
              <text class="rent-label">出租方</text>
              <text class="rent-value">{{ item.lessor_name || '-' }}</text>
            </view>
            <view class="rent-row">
              <text class="rent-label">司机</text>
              <text class="rent-value">{{ item.user_name || '-' }}</text>
            </view>
          </view>
          
          <!-- 缴纳日期 -->
          <view class="payment-info">
            <text class="payment-date">{{ item.next_payment_date }}</text>
            <view :class="['days-tag', getUrgencyClass(item.days_until_payment)]">
              <text class="days-text">
                {{ item.days_until_payment <= 0 ? '已到期' : `${item.days_until_payment}天后` }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 统计信息 -->
    <view v-if="reminders.length > 0" class="stats-bar">
      <text class="stats-text">
        共 {{ reminders.length }} 条提醒，总计 ¥{{ totalRent.toFixed(2) }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 租金提醒列表页面
 * 显示即将到期的租金缴纳提醒
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getLeaseReminders } from '@/api'
import type { VehicleLeaseReminder } from '@/api/types'

// ==================== 状态 ====================

/** 提醒列表 */
const reminders = ref<VehicleLeaseReminder[]>([])

/** 加载状态 */
const loading = ref(false)

/** 天数选项 */
const daysOptions = [3, 7, 14, 30]

/** 选中的天数索引 */
const selectedDaysIndex = ref(1) // 默认7天

// ==================== 计算属性 ====================

/** 总租金 */
const totalRent = computed(() => {
  return reminders.value.reduce((sum, item) => sum + (item.monthly_rent || 0), 0)
})

// ==================== 生命周期 ====================

onShow(() => {
  loadReminders()
})

// ==================== 方法 ====================

/**
 * 获取紧急程度样式类
 * @param days - 距离缴纳的天数
 * @returns 样式类名
 */
function getUrgencyClass(days: number): string {
  if (days <= 0) return 'overdue'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'warning'
  return 'normal'
}

/**
 * 天数选择变更
 */
function onDaysChange(e: any): void {
  selectedDaysIndex.value = e.detail.value
  loadReminders()
}

/**
 * 加载提醒列表
 */
async function loadReminders(): Promise<void> {
  loading.value = true
  
  try {
    const daysAhead = daysOptions[selectedDaysIndex.value]
    const data = await getLeaseReminders(daysAhead)
    reminders.value = data
  } catch (error) {
    console.error('加载租金提醒失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到车辆详情
 * @param vehicleId - 车辆ID
 */
function goToDetail(vehicleId: number): void {
  uni.navigateTo({
    url: `/pages/driver/vehicle/lease?id=${vehicleId}`,
  })
}
</script>

<style lang="scss" scoped>
.reminders-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 100rpx;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.filter-label {
  font-size: 28rpx;
  color: #666666;
}

.filter-picker {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.picker-text {
  font-size: 28rpx;
  color: #333333;
  margin-right: 8rpx;
}

.picker-arrow {
  font-size: 20rpx;
  color: #999999;
}

/* 加载和空状态 */
.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
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
  font-size: 32rpx;
  color: #333333;
  margin-bottom: 8rpx;
}

.empty-sub {
  font-size: 26rpx;
  color: #999999;
}

/* 提醒列表 */
.reminder-list {
  padding: 0 24rpx;
}

.reminder-card {
  display: flex;
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.urgency-bar {
  width: 8rpx;
  
  &.overdue {
    background-color: #ff4d4f;
  }
  
  &.urgent {
    background-color: #ff7a45;
  }
  
  &.warning {
    background-color: #faad14;
  }
  
  &.normal {
    background-color: #52c41a;
  }
}

.card-content {
  flex: 1;
  padding: 24rpx;
}

/* 车辆信息 */
.vehicle-info {
  margin-bottom: 16rpx;
}

.license-plate {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  display: block;
}

.vehicle-model {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* 租金信息 */
.rent-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.rent-row {
  display: flex;
  align-items: center;
}

.rent-label {
  font-size: 24rpx;
  color: #999999;
  margin-right: 8rpx;
}

.rent-value {
  font-size: 24rpx;
  color: #333333;
}

/* 缴纳日期 */
.payment-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.payment-date {
  font-size: 28rpx;
  color: #333333;
}

.days-tag {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  
  &.overdue {
    background-color: #fff2f0;
    .days-text { color: #ff4d4f; }
  }
  
  &.urgent {
    background-color: #fff7e6;
    .days-text { color: #ff7a45; }
  }
  
  &.warning {
    background-color: #fffbe6;
    .days-text { color: #faad14; }
  }
  
  &.normal {
    background-color: #f6ffed;
    .days-text { color: #52c41a; }
  }
}

.days-text {
  font-size: 24rpx;
  font-weight: bold;
}

/* 统计栏 */
.stats-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 24rpx;
  text-align: center;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.stats-text {
  font-size: 28rpx;
  color: #666666;
}
</style>
