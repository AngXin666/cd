<template>
  <!-- 
    件数报表详情页面
    显示指定司机在指定日期的计件详情
    支持查看各品类的计件数量和金额
    Requirements: 8.1
  -->
  <view class="piece-work-detail-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 司机信息卡片 -->
      <view class="driver-card">
        <view class="driver-avatar">
          <text class="avatar-text">{{ (driverName || '司').charAt(0) }}</text>
        </view>
        <view class="driver-info">
          <text class="driver-name">{{ driverName || '未知司机' }}</text>
          <text class="work-date">{{ formatDate(workDate) }}</text>
        </view>
      </view>

      <!-- 统计汇总卡片 -->
      <view class="summary-card">
        <view class="summary-item">
          <text class="summary-value">{{ stats.record_count }}</text>
          <text class="summary-label">记录数</text>
        </view>
        <view class="summary-divider"></view>
        <view class="summary-item">
          <text class="summary-value">{{ stats.total_quantity }}</text>
          <text class="summary-label">总数量</text>
        </view>
        <view class="summary-divider"></view>
        <view class="summary-item">
          <text class="summary-value highlight">¥{{ formatMoney(stats.total_amount) }}</text>
          <text class="summary-label">总金额</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="records.length === 0" class="empty-container">
        <text class="empty-icon">📊</text>
        <text class="empty-text">暂无计件记录</text>
      </view>

      <!-- 计件记录列表 -->
      <view v-else class="record-list">
        <view class="list-title">
          <text class="title-text">计件明细</text>
        </view>
        
        <view
          v-for="record in records"
          :key="record.id"
          class="record-item"
        >
          <view class="record-left">
            <view class="category-tag">
              <text class="category-text">{{ record.category_name || '未知分类' }}</text>
            </view>
            <view v-if="record.warehouse_name" class="warehouse-info">
              <text class="warehouse-text">{{ record.warehouse_name }}</text>
            </view>
          </view>
          
          <view class="record-center">
            <view class="quantity-row">
              <text class="quantity-label">数量：</text>
              <text class="quantity-value">{{ record.quantity }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">单价：</text>
              <text class="price-value">¥{{ formatMoney(getUnitPrice(record)) }}</text>
            </view>
          </view>
          
          <view class="record-right">
            <text class="amount-value">¥{{ formatMoney(record.amount) }}</text>
            <text class="amount-label">金额</text>
          </view>
        </view>
      </view>

      <!-- 备注信息 -->
      <view v-if="hasRemarks" class="remarks-card">
        <view class="card-title">
          <text class="title-text">备注信息</text>
        </view>
        <view
          v-for="record in recordsWithRemarks"
          :key="record.id"
          class="remark-item"
        >
          <text class="remark-category">{{ record.category_name }}：</text>
          <text class="remark-content">{{ record.remark }}</text>
        </view>
      </view>

      <!-- 录入时间 -->
      <view v-if="records.length > 0" class="time-info">
        <text class="time-text">最后更新：{{ formatDateTime(latestUpdateTime) }}</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 件数报表详情页面
 * 显示指定司机在指定日期的计件详情
 * 支持查看各品类的计件数量和金额
 * 
 * @requirements 8.1 - 件数报表详情页面
 */

import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPieceWorkRecords, getPieceWorkStats, getUser } from '@/api'
import type { PieceWorkRecord, PieceWorkStats } from '@/api/types'
import { formatDate, formatDateTime, formatMoney } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 司机ID */
const userId = ref<number>(0)

/** 司机名称 */
const driverName = ref<string>('')

/** 工作日期 */
const workDate = ref<string>('')

/** 计件记录列表 */
const records = ref<PieceWorkRecord[]>([])

/** 统计数据 */
const stats = ref<PieceWorkStats>({
  total_quantity: 0,
  total_amount: 0,
  record_count: 0,
})

// ==================== 计算属性 ====================

/**
 * 是否有备注信息
 */
const hasRemarks = computed(() => {
  return records.value.some(r => r.remark)
})

/**
 * 有备注的记录列表
 */
const recordsWithRemarks = computed(() => {
  return records.value.filter(r => r.remark)
})

/**
 * 最后更新时间
 */
const latestUpdateTime = computed(() => {
  if (records.value.length === 0) return ''
  
  // 找到最新的创建时间
  const times = records.value.map(r => new Date(r.created_at).getTime())
  const latest = Math.max(...times)
  return new Date(latest).toISOString()
})

// ==================== 生命周期 ====================

onLoad((options) => {
  // 获取页面参数
  if (options?.user_id) {
    userId.value = parseInt(options.user_id as string, 10)
  }
  if (options?.date) {
    workDate.value = options.date as string
  }
  if (options?.name) {
    driverName.value = decodeURIComponent(options.name as string)
  }
})

onMounted(() => {
  if (userId.value && workDate.value) {
    loadData()
  }
})

// ==================== 方法 ====================

/**
 * 加载数据
 * 获取计件记录和统计信息
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    // 如果没有司机名称，尝试获取
    if (!driverName.value && userId.value) {
      try {
        const user = await getUser(userId.value)
        driverName.value = user.name
      } catch (e) {
        console.warn('获取司机信息失败:', e)
      }
    }
    
    // 构建查询参数
    const params = {
      user_id: userId.value,
      start_date: workDate.value,
      end_date: workDate.value,
    }
    
    // 并行加载记录和统计
    const [recordsData, statsData] = await Promise.all([
      getPieceWorkRecords(params),
      getPieceWorkStats(params),
    ])
    
    records.value = recordsData
    stats.value = statsData
  } catch (error) {
    console.error('加载计件详情失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 计算单价
 * 根据金额和数量计算单价
 * 
 * @param record - 计件记录
 * @returns 单价
 */
function getUnitPrice(record: PieceWorkRecord): number {
  if (record.quantity === 0) return 0
  return record.amount / record.quantity
}
</script>

<style lang="scss" scoped>
.piece-work-detail-page {
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

/* 司机信息卡片 */
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

.driver-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  display: block;
  margin-bottom: 8rpx;
}

.work-date {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 统计汇总卡片 */
.summary-card {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-divider {
  width: 1rpx;
  height: 60rpx;
  background-color: #f0f0f0;
}

.summary-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
  
  &.highlight {
    color: #ff6b35;
  }
}

.summary-label {
  font-size: 24rpx;
  color: #999999;
}

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 记录列表 */
.record-list {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.list-title {
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 16rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.record-left {
  flex: 1;
}

.category-tag {
  display: inline-block;
  padding: 6rpx 16rpx;
  background-color: #e6f7ff;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
}

.category-text {
  font-size: 26rpx;
  color: #1890ff;
}

.warehouse-info {
  margin-top: 4rpx;
}

.warehouse-text {
  font-size: 22rpx;
  color: #999999;
}

.record-center {
  flex: 1;
  padding: 0 16rpx;
}

.quantity-row,
.price-row {
  display: flex;
  align-items: center;
  margin-bottom: 4rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.quantity-label,
.price-label {
  font-size: 24rpx;
  color: #999999;
}

.quantity-value,
.price-value {
  font-size: 24rpx;
  color: #333333;
}

.record-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 120rpx;
}

.amount-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b35;
}

.amount-label {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* 备注信息卡片 */
.remarks-card {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.card-title {
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 16rpx;
}

.remark-item {
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.remark-category {
  font-size: 26rpx;
  color: #666666;
}

.remark-content {
  font-size: 26rpx;
  color: #333333;
}

/* 时间信息 */
.time-info {
  text-align: center;
  padding: 24rpx;
}

.time-text {
  font-size: 22rpx;
  color: #cccccc;
}
</style>
