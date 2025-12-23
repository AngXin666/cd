<template>
  <!-- 
    计件记录页面
    显示历史计件记录，显示统计汇总
  -->
  <view class="list-page">
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

    <!-- 统计汇总 -->
    <view class="stats-section">
      <view class="stats-item">
        <text class="stats-value">{{ stats.record_count }}</text>
        <text class="stats-label">记录数</text>
      </view>
      <view class="stats-item">
        <text class="stats-value">{{ stats.total_quantity }}</text>
        <text class="stats-label">总数量</text>
      </view>
      <view class="stats-item">
        <text class="stats-value highlight">¥{{ formatMoney(stats.total_amount) }}</text>
        <text class="stats-label">总金额</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="list-section">
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="records.length === 0" class="empty-container">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无计件记录</text>
      </view>
      
      <view v-else class="record-list">
        <view 
          v-for="record in records" 
          :key="record.id" 
          class="record-item"
        >
          <view class="record-header">
            <text class="record-date">{{ formatDate(record.work_date) }}</text>
            <text class="record-category">{{ record.category_name }}</text>
          </view>
          <view class="record-body">
            <view class="record-quantity">
              <text class="quantity-value">{{ record.quantity }}</text>
              <text class="quantity-unit">件</text>
            </view>
            <view class="record-amount">
              <text class="amount-value">¥{{ formatMoney(record.amount) }}</text>
            </view>
          </view>
          <view v-if="record.remark" class="record-remark">
            <text class="remark-text">{{ record.remark }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 新增按钮 -->
    <view class="fab-btn" @click="goToEntry">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 计件记录页面
 * 显示历史计件记录，显示统计汇总
 */

import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPieceWorkRecords, getPieceWorkStats } from '@/api'
import type { PieceWorkRecord, PieceWorkStats } from '@/api/types'
import { formatDate, formatMoney, navigateTo } from '@/utils'

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
  loadData()
})

onShow(() => {
  // 刷新数据
  if (startDate.value && endDate.value) {
    loadData()
  }
})

// ==================== 方法 ====================

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
  
  loadData()
}

/**
 * 跳转到录入页面
 */
function goToEntry(): void {
  navigateTo('/pages/driver/piece-work/entry')
}
</script>

<style lang="scss" scoped>
.list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
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
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.record-date {
  font-size: 26rpx;
  color: #666666;
}

.record-category {
  font-size: 26rpx;
  color: #4a90e2;
  background-color: #e6f0ff;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.record-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-quantity {
  display: flex;
  align-items: baseline;
}

.quantity-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #333333;
}

.quantity-unit {
  font-size: 26rpx;
  color: #666666;
  margin-left: 8rpx;
}

.record-amount {
  text-align: right;
}

.amount-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff6b35;
}

.record-remark {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.remark-text {
  font-size: 24rpx;
  color: #999999;
}

/* 浮动按钮 */
.fab-btn {
  position: fixed;
  right: 32rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(74, 144, 226, 0.4);
}

.fab-icon {
  font-size: 56rpx;
  color: #ffffff;
  font-weight: bold;
}
</style>
