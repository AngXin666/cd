<template>
  <!-- 
    报表主页
    显示日报/周报/月报标签页和仓库卡片列表
    支持日期导航和层级钻取
    Requirements: 1.1, 1.2, 1.3, 2.1-2.6, 3.1-3.6, 7.1-7.5
  -->
  <view class="report-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="nav-back">←</text>
      </view>
      <text class="nav-title">数据报表</text>
      <view class="nav-right"></view>
    </view>

    <!-- 标签页切换 -->
    <!-- Requirements: 2.1, 2.5, 2.6 -->
    <view class="tab-container">
      <view 
        v-for="tab in tabs" 
        :key="tab.value"
        class="tab-item"
        :class="{ active: periodType === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 日期导航 -->
    <!-- Requirements: 7.1, 7.2, 7.3, 7.4, 7.5 -->
    <view class="date-nav">
      <view class="date-nav-btn" @click="goPrevious">
        <text class="date-nav-icon">◀</text>
      </view>
      <view class="date-nav-label">
        <text class="date-text">{{ periodLabel }}</text>
      </view>
      <view 
        class="date-nav-btn"
        :class="{ disabled: !canGoNext }"
        @click="goNext"
      >
        <text class="date-nav-icon">▶</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <!-- Requirements: 3.6 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 仓库卡片列表 -->
    <!-- Requirements: 3.1, 3.2, 3.3, 3.4, 3.5 -->
    <template v-else>
      <!-- 空数据提示 -->
      <view v-if="warehouseStats.length === 0" class="empty-container">
        <text class="empty-icon">📊</text>
        <text class="empty-text">暂无数据</text>
        <text class="empty-hint">当前周期内没有计件记录</text>
      </view>

      <!-- 仓库卡片列表 -->
      <scroll-view v-else scroll-y class="warehouse-list">
        <view 
          v-for="warehouse in warehouseStats" 
          :key="warehouse.warehouse_id"
          class="warehouse-card"
          @click="goToWarehouseDetail(warehouse)"
        >
          <view class="warehouse-header">
            <text class="warehouse-icon">🏭</text>
            <text class="warehouse-name">{{ warehouse.warehouse_name }}</text>
            <text class="warehouse-arrow">›</text>
          </view>
          <view class="warehouse-stats">
            <view class="stat-item">
              <text class="stat-value">{{ formatQuantity(warehouse.total_quantity) }}</text>
              <text class="stat-label">总{{ getUnitLabel(warehouse) }}</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
              <text class="stat-value">{{ warehouse.driver_count }}</text>
              <text class="stat-label">司机数</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 报表主页组件
 * 显示日报/周报/月报标签页和仓库卡片列表
 * 
 * @module pages/common/report/index
 * 
 * Requirements:
 * - 1.1, 1.2, 1.3: 报表入口
 * - 2.1-2.6: 报表周期切换
 * - 3.1-3.6: 仓库卡片展示
 * - 7.1-7.5: 日期导航
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getWarehouseStats } from '@/api/report'
import { 
  ReportPeriodType, 
  REPORT_PERIOD_DISPLAY_NAMES,
  type WarehouseStatItem 
} from '@/types/report'
import {
  calculateDateRange,
  navigatePrevious,
  navigateNext,
  formatPeriodLabel,
  canNavigateNext,
  getDefaultBaseDate,
  dateToString,
} from '@/utils/report'
import { getWarehousePresetUnit } from '@/api/types'

// ==================== 类型定义 ====================

/** 标签页配置 */
interface TabItem {
  label: string
  value: ReportPeriodType
}

// ==================== 常量 ====================

/** 标签页列表 - Requirements: 2.1 */
const tabs: TabItem[] = [
  { label: REPORT_PERIOD_DISPLAY_NAMES[ReportPeriodType.DAILY], value: ReportPeriodType.DAILY },
  { label: REPORT_PERIOD_DISPLAY_NAMES[ReportPeriodType.WEEKLY], value: ReportPeriodType.WEEKLY },
  { label: REPORT_PERIOD_DISPLAY_NAMES[ReportPeriodType.MONTHLY], value: ReportPeriodType.MONTHLY },
]

// ==================== 状态 ====================

/** 当前周期类型 - Requirements: 2.5 默认选中日报 */
const periodType = ref<ReportPeriodType>(ReportPeriodType.DAILY)

/** 当前基准日期 */
const currentDate = ref<Date>(getDefaultBaseDate())

/** 仓库统计列表 */
const warehouseStats = ref<WarehouseStatItem[]>([])

/** 加载状态 */
const loading = ref(false)

// ==================== 计算属性 ====================

/**
 * 当前周期的日期范围
 */
const dateRange = computed(() => {
  return calculateDateRange(periodType.value, currentDate.value)
})

/**
 * 周期标签显示文本
 * Requirements: 7.1
 */
const periodLabel = computed(() => {
  return formatPeriodLabel(periodType.value, currentDate.value)
})

/**
 * 是否可以导航到下一个周期
 * Requirements: 7.4
 */
const canGoNext = computed(() => {
  return canNavigateNext(periodType.value, currentDate.value)
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
})

onShow(() => {
  // 页面显示时刷新数据
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
 * 切换标签页
 * Requirements: 2.2, 2.3, 2.4, 2.6
 * 
 * @param type - 周期类型
 */
function switchTab(type: ReportPeriodType): void {
  if (periodType.value === type) return
  
  periodType.value = type
  // 切换标签时重置为今天
  currentDate.value = getDefaultBaseDate()
  loadData()
}

/**
 * 导航到上一个周期
 * Requirements: 7.2
 */
function goPrevious(): void {
  currentDate.value = navigatePrevious(periodType.value, currentDate.value)
  loadData()
}

/**
 * 导航到下一个周期
 * Requirements: 7.3, 7.4
 */
function goNext(): void {
  if (!canGoNext.value) return
  
  currentDate.value = navigateNext(periodType.value, currentDate.value)
  loadData()
}

/**
 * 加载仓库统计数据
 * Requirements: 3.5, 7.5
 */
async function loadData(): Promise<void> {
  loading.value = true
  
  try {
    const { startDate, endDate } = dateRange.value
    const data = await getWarehouseStats({
      start_date: startDate,
      end_date: endDate,
    })
    
    // 数据已按总件数降序排列（后端处理）
    warehouseStats.value = data
  } catch (error) {
    console.error('加载报表数据失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none',
    })
    warehouseStats.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到仓库详情页
 * Requirements: 4.1
 * 
 * @param warehouse - 仓库统计数据
 */
function goToWarehouseDetail(warehouse: WarehouseStatItem): void {
  const { startDate, endDate } = dateRange.value
  
  uni.navigateTo({
    url: `/pages/common/report/warehouse?warehouseId=${warehouse.warehouse_id}&warehouseName=${encodeURIComponent(warehouse.warehouse_name)}&warehouseType=${warehouse.warehouse_type || ''}&periodType=${periodType.value}&startDate=${startDate}&endDate=${endDate}`,
  })
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
 * 获取仓库的单位标签
 * Requirements: 3.2 - 使用仓库预设单位
 * 
 * @param warehouse - 仓库统计数据
 * @returns 单位标签
 */
function getUnitLabel(warehouse: WarehouseStatItem): string {
  if (warehouse.warehouse_type) {
    return getWarehousePresetUnit(warehouse.warehouse_type)
  }
  return '件'
}
</script>


<style lang="scss" scoped>
/**
 * 报表主页样式
 * Requirements: 2.1-2.6, 3.1-3.6, 7.1-7.5
 */

.report-page {
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
  font-size: 34rpx;
  font-weight: bold;
  color: #333333;
}

.nav-right {
  width: 80rpx;
}

/* ==================== 标签页切换 ==================== */
/* Requirements: 2.1, 2.5, 2.6 */
.tab-container {
  display: flex;
  background-color: #ffffff;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  transition: all 0.2s;
  
  /* 选中状态高亮 - Requirements: 2.6 */
  &.active {
    background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
    
    .tab-text {
      color: #ffffff;
      font-weight: 500;
    }
  }
}

.tab-text {
  font-size: 28rpx;
  color: #666666;
}

/* ==================== 日期导航 ==================== */
/* Requirements: 7.1, 7.2, 7.3, 7.4 */
.date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
  gap: 32rpx;
}

.date-nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 50%;
  transition: all 0.2s;
  
  &:active {
    background-color: #e0e0e0;
  }
  
  /* 禁用状态 - Requirements: 7.4 */
  &.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}

.date-nav-icon {
  font-size: 24rpx;
  color: #333333;
}

.date-nav-label {
  min-width: 300rpx;
  text-align: center;
}

.date-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
}

/* ==================== 加载状态 ==================== */
/* Requirements: 3.6 */
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
/* Requirements: 3.4 */
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

/* ==================== 仓库卡片列表 ==================== */
/* Requirements: 3.1, 3.2, 3.3, 3.5 */
.warehouse-list {
  flex: 1;
  padding: 24rpx;
}

.warehouse-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
}

.warehouse-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.warehouse-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.warehouse-name {
  flex: 1;
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.warehouse-arrow {
  font-size: 36rpx;
  color: #cccccc;
}

.warehouse-stats {
  display: flex;
  align-items: center;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #4a90e2;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #999999;
}

.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background-color: #e0e0e0;
  margin: 0 20rpx;
}
</style>
