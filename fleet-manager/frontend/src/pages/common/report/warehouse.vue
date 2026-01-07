<template>
  <!-- 
    仓库详情页
    显示指定仓库的司机统计卡片列表
    支持点击司机卡片跳转到司机详情页
    Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
  -->
  <view class="warehouse-detail-page">
    <!-- 顶部导航栏 -->
    <!-- Requirements: 4.2 - 显示仓库名称和当前周期 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="nav-back">←</text>
      </view>
      <text class="nav-title">{{ warehouseName }} - {{ periodDisplayName }}</text>
      <view class="nav-right"></view>
    </view>

    <!-- 周期信息 -->
    <!-- Requirements: 4.2 -->
    <view class="period-info">
      <text class="period-text">{{ periodLabel }}</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 司机卡片列表 -->
    <!-- Requirements: 4.3, 4.4, 4.5, 4.6, 4.7 -->
    <template v-else>
      <!-- 空数据提示 -->
      <!-- Requirements: 4.7 -->
      <view v-if="driverStats.length === 0" class="empty-container">
        <text class="empty-icon">👤</text>
        <text class="empty-text">暂无司机数据</text>
        <text class="empty-hint">当前周期内没有司机计件记录</text>
      </view>

      <!-- 司机卡片列表 -->
      <!-- Requirements: 4.3, 4.4, 4.5, 4.6 -->
      <scroll-view v-else scroll-y class="driver-list">
        <view 
          v-for="driver in driverStats" 
          :key="driver.driver_id"
          class="driver-card"
          @click="goToDriverDetail(driver)"
        >
          <view class="driver-header">
            <text class="driver-icon">👤</text>
            <text class="driver-name">{{ driver.driver_name }}</text>
            <text class="driver-arrow">›</text>
          </view>
          <view class="driver-stats">
            <view class="stat-item">
              <text class="stat-value">{{ formatQuantity(driver.total_quantity) }}</text>
              <text class="stat-label">总{{ unitLabel }}</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
              <text class="stat-value">{{ driver.record_count }}</text>
              <text class="stat-label">记录数</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 仓库详情页组件
 * 显示指定仓库的司机统计卡片列表
 * 
 * @module pages/common/report/warehouse
 * 
 * Requirements:
 * - 4.1: 点击仓库卡片跳转到仓库详情页面
 * - 4.2: 显示仓库名称和当前周期
 * - 4.3: 司机卡片显示司机姓名
 * - 4.4: 司机卡片显示总件数
 * - 4.5: 司机卡片显示记录条数
 * - 4.6: 按总件数降序排列司机卡片
 * - 4.7: 无司机数据时显示提示
 */

import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getWarehouseDriverStats } from '@/api/report'
import { 
  ReportPeriodType, 
  REPORT_PERIOD_DISPLAY_NAMES,
  type DriverStatItem 
} from '@/types/report'
import { formatPeriodLabel } from '@/utils/report'
import { getWarehousePresetUnit } from '@/api/types'

// ==================== 路由参数 ====================

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

/** 司机统计列表 */
const driverStats = ref<DriverStatItem[]>([])

/** 加载状态 */
const loading = ref(false)

// ==================== 计算属性 ====================

/**
 * 周期类型显示名称
 * Requirements: 4.2
 */
const periodDisplayName = computed(() => {
  return REPORT_PERIOD_DISPLAY_NAMES[periodType.value] || '日报'
})

/**
 * 周期标签显示文本
 * Requirements: 4.2
 */
const periodLabel = computed(() => {
  if (!startDate.value) return ''
  
  // 使用开始日期来格式化周期标签
  return formatPeriodLabel(periodType.value, startDate.value)
})

/**
 * 单位标签
 * Requirements: 4.4 - 使用仓库预设单位
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
 * 加载司机统计数据
 * Requirements: 4.6 - 按总件数降序排列
 */
async function loadData(): Promise<void> {
  if (!warehouseId.value || !startDate.value || !endDate.value) {
    console.error('缺少必要参数')
    return
  }
  
  loading.value = true
  
  try {
    const data = await getWarehouseDriverStats(warehouseId.value, {
      start_date: startDate.value,
      end_date: endDate.value,
    })
    
    // 数据已按总件数降序排列（后端处理）
    driverStats.value = data
  } catch (error) {
    console.error('加载司机统计数据失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none',
    })
    driverStats.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到司机详情页
 * Requirements: 5.1
 * 
 * @param driver - 司机统计数据
 */
function goToDriverDetail(driver: DriverStatItem): void {
  uni.navigateTo({
    url: `/pages/common/report/driver?driverId=${driver.driver_id}&driverName=${encodeURIComponent(driver.driver_name)}&warehouseId=${warehouseId.value}&warehouseName=${encodeURIComponent(warehouseName.value)}&warehouseType=${warehouseType.value}&periodType=${periodType.value}&startDate=${startDate.value}&endDate=${endDate.value}`,
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
</script>


<style lang="scss" scoped>
/**
 * 仓库详情页样式
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

.warehouse-detail-page {
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
/* Requirements: 4.2 */
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
/* Requirements: 4.7 */
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

/* ==================== 司机卡片列表 ==================== */
/* Requirements: 4.3, 4.4, 4.5, 4.6 */
.driver-list {
  flex: 1;
  padding: 24rpx;
}

.driver-card {
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

.driver-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.driver-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.driver-name {
  flex: 1;
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.driver-arrow {
  font-size: 36rpx;
  color: #cccccc;
}

.driver-stats {
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
