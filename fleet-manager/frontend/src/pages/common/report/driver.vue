<template>
  <!-- 
    司机详情页
    显示指定司机的计件记录列表
    支持统计汇总展示
    Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
  -->
  <view class="driver-detail-page">
    <!-- 顶部导航栏 -->
    <!-- Requirements: 5.2 - 显示司机姓名 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="nav-back">←</text>
      </view>
      <text class="nav-title">{{ driverName }} - 计件记录</text>
      <view class="nav-right"></view>
    </view>

    <!-- 周期信息 -->
    <!-- Requirements: 5.2 - 显示仓库名称和当前周期 -->
    <view class="period-info">
      <text class="period-text">{{ warehouseName }} · {{ periodLabel }}</text>
    </view>

    <!-- 统计汇总 -->
    <!-- Requirements: 5.7 - 显示统计汇总（总件数、总金额） -->
    <view v-if="!loading && records.length > 0" class="summary-container">
      <view class="summary-item">
        <text class="summary-value">{{ formatQuantity(totalQuantity) }}</text>
        <text class="summary-label">总{{ unitLabel }}</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item">
        <text class="summary-value">¥{{ formatAmount(totalAmount) }}</text>
        <text class="summary-label">总金额</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 计件记录列表 -->
    <!-- Requirements: 5.3, 5.4, 5.5, 5.6 -->
    <template v-else>
      <!-- 空数据提示 -->
      <!-- Requirements: 5.6 -->
      <view v-if="records.length === 0" class="empty-container">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无计件记录</text>
        <text class="empty-hint">当前周期内没有计件记录</text>
      </view>

      <!-- 计件记录列表 -->
      <!-- Requirements: 5.3, 5.4, 5.5 -->
      <scroll-view v-else scroll-y class="record-list">
        <view 
          v-for="record in records" 
          :key="record.id"
          class="record-card"
        >
          <view class="record-header">
            <text class="record-date">{{ formatDate(record.work_date) }}</text>
          </view>
          <view class="record-content">
            <view class="record-main">
              <text class="record-category">{{ record.category_name }}</text>
              <text class="record-quantity">{{ record.quantity }} {{ unitLabel }}</text>
            </view>
            <view class="record-amount">
              <text class="amount-value">¥{{ formatAmount(record.amount) }}</text>
            </view>
          </view>
          <view v-if="record.remark" class="record-remark">
            <text class="remark-text">备注: {{ record.remark }}</text>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 司机详情页组件
 * 显示指定司机的计件记录列表
 * 
 * @module pages/common/report/driver
 * 
 * Requirements:
 * - 5.1: 点击司机卡片跳转到司机计件记录页面
 * - 5.2: 显示司机姓名、仓库名称和当前周期
 * - 5.3: 显示该司机在当前周期内的所有计件记录
 * - 5.4: 每条记录显示工作日期、品类名称、数量
 * - 5.5: 按工作日期降序排列计件记录
 * - 5.6: 无计件记录时显示提示
 * - 5.7: 在页面顶部显示统计汇总（总件数）
 */

import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getDriverRecords, type PieceWorkRecordItem } from '@/api/report'
import { 
  ReportPeriodType, 
  REPORT_PERIOD_DISPLAY_NAMES 
} from '@/types/report'
import { formatPeriodLabel } from '@/utils/report'
import { getWarehousePresetUnit } from '@/api/types'

// ==================== 路由参数 ====================

/** 司机 ID */
const driverId = ref<number>(0)

/** 司机姓名 */
const driverName = ref<string>('')

/** 仓库 ID */
const warehouseId = ref<number>(0)

/** 仓库名称 */
const warehouseName = ref<string>('')

/** 仓库类型 */
const warehouseType = ref<string>('')

/** 周期类型 */
const periodType = ref<ReportPeriodType>(ReportPeriodType.DAILY)

/** 开始日期 */
const startDate = ref<string>('')

/** 结束日期 */
const endDate = ref<string>('')

// ==================== 状态 ====================

/** 计件记录列表 */
const records = ref<PieceWorkRecordItem[]>([])

/** 总件数 */
const totalQuantity = ref<number>(0)

/** 总金额 */
const totalAmount = ref<number>(0)

/** 加载状态 */
const loading = ref(false)

// ==================== 计算属性 ====================

/**
 * 周期标签显示文本
 * Requirements: 5.2
 */
const periodLabel = computed(() => {
  if (!startDate.value) return ''
  
  // 使用开始日期来格式化周期标签
  return formatPeriodLabel(periodType.value, startDate.value)
})

/**
 * 单位标签
 * Requirements: 5.4 - 使用仓库预设单位
 */
const unitLabel = computed(() => {
  if (warehouseType.value) {
    return getWarehousePresetUnit(warehouseType.value)
  }
  return '件'
})

// ==================== 生命周期 ====================

onLoad((options) => {
  // 解析路由参数
  if (options) {
    driverId.value = Number(options.driverId) || 0
    driverName.value = decodeURIComponent(options.driverName || '')
    warehouseId.value = Number(options.warehouseId) || 0
    warehouseName.value = decodeURIComponent(options.warehouseName || '')
    warehouseType.value = options.warehouseType || ''
    periodType.value = (options.periodType as ReportPeriodType) || ReportPeriodType.DAILY
    startDate.value = options.startDate || ''
    endDate.value = options.endDate || ''
  }
  
  // 加载数据
  loadData()
})

// ==================== 方法 ====================

/**
 * 返回上一页
 */
function goBack(): void {
  uni.navigateBack()
}

/**
 * 加载司机计件记录数据
 * Requirements: 5.3, 5.5, 5.7
 */
async function loadData(): Promise<void> {
  if (!driverId.value || !warehouseId.value || !startDate.value || !endDate.value) {
    console.error('缺少必要参数')
    return
  }
  
  loading.value = true
  
  try {
    const response = await getDriverRecords(driverId.value, {
      warehouse_id: warehouseId.value,
      start_date: startDate.value,
      end_date: endDate.value,
    })
    
    // 数据已按工作日期降序排列（后端处理）
    records.value = response.records
    totalQuantity.value = response.total_quantity
    totalAmount.value = response.total_amount
  } catch (error) {
    console.error('加载司机计件记录失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none',
    })
    records.value = []
    totalQuantity.value = 0
    totalAmount.value = 0
  } finally {
    loading.value = false
  }
}

/**
 * 格式化数量显示
 * 
 * @param quantity - 数量
 * @returns 格式化后的数量字符串
 */
function formatQuantity(quantity: number): string {
  if (quantity >= 10000) {
    return (quantity / 10000).toFixed(1) + '万'
  }
  return quantity.toLocaleString()
}

/**
 * 格式化金额显示
 * 
 * @param amount - 金额
 * @returns 格式化后的金额字符串
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

/**
 * 格式化日期显示
 * 
 * @param dateStr - 日期字符串 (YYYY-MM-DD)
 * @returns 格式化后的日期字符串
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  
  // 将 YYYY-MM-DD 格式转换为更友好的显示格式
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[1]}月${parts[2]}日`
  }
  return dateStr
}
</script>


<style lang="scss" scoped>
/**
 * 司机详情页样式
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

.driver-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* ==================== 顶部导航栏 ==================== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
  /* 适配状态栏 */
  padding-top: var(--status-bar-height, 0);
  box-sizing: content-box;
}

.nav-left {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.nav-back {
  font-size: 40rpx;
  color: #333333;
}

.nav-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-right {
  width: 80rpx;
}

/* ==================== 周期信息 ==================== */
/* Requirements: 5.2 */
.period-info {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.period-text {
  font-size: 28rpx;
  color: #666666;
}

/* ==================== 统计汇总 ==================== */
/* Requirements: 5.7 */
.summary-container {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  padding: 24rpx;
  margin: 24rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-value {
  font-size: 44rpx;
  font-weight: bold;
  color: #4a90e2;
  margin-bottom: 8rpx;
}

.summary-label {
  font-size: 24rpx;
  color: #999999;
}

.summary-divider {
  width: 1rpx;
  height: 60rpx;
  background-color: #e0e0e0;
  margin: 0 20rpx;
}

/* ==================== 加载状态 ==================== */
.loading-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* ==================== 空数据提示 ==================== */
/* Requirements: 5.6 */
.empty-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333333;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #999999;
}

/* ==================== 计件记录列表 ==================== */
/* Requirements: 5.3, 5.4, 5.5 */
.record-list {
  flex: 1;
  padding: 0 24rpx 24rpx;
}

.record-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.record-header {
  margin-bottom: 16rpx;
}

.record-date {
  font-size: 26rpx;
  color: #999999;
}

.record-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-main {
  display: flex;
  flex-direction: column;
}

.record-category {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
}

.record-quantity {
  font-size: 28rpx;
  color: #4a90e2;
}

.record-amount {
  display: flex;
  align-items: center;
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
</style>
