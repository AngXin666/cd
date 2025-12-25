<!--
  司机实时状态统计组件
  显示司机总数、在线、已计件、未计件
  
  @module components/DriverStats
  @requirements 6.1, 6.2, 6.4 - 司机实时状态统计组件
-->
<template>
  <view class="driver-stats">
    <!-- 标题栏 -->
    <view class="stats-header">
      <view class="header-left">
        <view class="header-icon">📊</view>
        <text class="header-title">统计概览</text>
        <view v-if="loading" class="loading-icon">⏳</view>
      </view>
      <text v-if="warehouseName" class="warehouse-name">{{ warehouseName }}</text>
    </view>
    
    <!-- 统计内容 - Requirements 6.1, 6.2 -->
    <view class="stats-content" @click="handleClick">
      <view v-if="stats" class="stats-card">
        <!-- 司机实时状态标题 -->
        <view class="card-header">
          <view class="card-header-icon">👥</view>
          <text class="card-header-title">司机实时状态</text>
        </view>
        
        <!-- 4 列网格 - Requirements 6.2 -->
        <view class="stats-grid">
          <!-- 总司机数 -->
          <view class="stat-item blue">
            <view class="item-icon">👥</view>
            <text class="item-label">总数</text>
            <text class="item-value blue-text">{{ stats.totalDrivers }}</text>
          </view>
          
          <!-- 在线司机 -->
          <view class="stat-item green">
            <view class="item-icon">✅</view>
            <text class="item-label">在线</text>
            <text class="item-value green-text">{{ stats.onlineDrivers }}</text>
          </view>
          
          <!-- 已计件司机 -->
          <view class="stat-item orange">
            <view class="item-icon">⏰</view>
            <text class="item-label">已计件</text>
            <text class="item-value orange-text">{{ stats.busyDrivers }}</text>
          </view>
          
          <!-- 未计件司机 -->
          <view class="stat-item purple">
            <view class="item-icon">❌</view>
            <text class="item-label">未计件</text>
            <text class="item-value purple-text">{{ stats.idleDrivers }}</text>
          </view>
        </view>
      </view>
      
      <!-- 加载中状态 -->
      <view v-else class="loading-placeholder">
        <text class="loading-text">加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 司机实时状态统计组件
 * 
 * @description 显示司机总数、在线、已计件、未计件
 * 
 * @requirements 6.1 - 显示司机实时状态统计区域
 * @requirements 6.2 - 显示总数、在线、已计件、未计件四项数据
 * @requirements 6.4 - 点击跳转到司机管理页面
 */

import type { DriverStatsData } from './types'

// ==================== Props ====================

interface Props {
  /** 统计数据 */
  stats: DriverStatsData | null
  /** 加载状态 */
  loading?: boolean
  /** 当前仓库名称 */
  warehouseName?: string
}

const props = withDefaults(defineProps<Props>(), {
  stats: null,
  loading: false,
  warehouseName: '',
})

// ==================== Emits ====================

const emit = defineEmits<{
  /** 点击事件 */
  (e: 'click'): void
}>()

// ==================== 方法 ====================

/**
 * 处理点击
 * @requirements 6.4 - 点击跳转到司机管理页面
 */
function handleClick(): void {
  emit('click')
}
</script>

<style lang="scss" scoped>
/**
 * 司机统计容器
 */
.driver-stats {
  margin-bottom: 24rpx;
}

/**
 * 标题栏
 */
.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-icon {
  font-size: 36rpx;
  margin-right: 8rpx;
}

.header-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1F2937;
}

.loading-icon {
  font-size: 28rpx;
  margin-left: 12rpx;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.warehouse-name {
  font-size: 24rpx;
  color: #6B7280;
}

/**
 * 内容区域
 */
.stats-content {
  cursor: pointer;
  
  &:active {
    opacity: 0.9;
  }
}

.stats-card {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

/**
 * 卡片标题
 */
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.card-header-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.card-header-title {
  font-size: 24rpx;
  font-weight: 500;
  color: #6B7280;
}

/**
 * 统计网格 - 4 列布局
 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

/**
 * 统计项
 */
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 12rpx;
  border-radius: 16rpx;
  
  &.blue {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  }
  
  &.green {
    background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
  }
  
  &.orange {
    background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
  }
  
  &.purple {
    background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  }
}

.item-icon {
  font-size: 36rpx;
  margin-bottom: 8rpx;
}

.item-label {
  font-size: 22rpx;
  color: #6B7280;
  margin-bottom: 4rpx;
}

.item-value {
  font-size: 32rpx;
  font-weight: bold;
  
  &.blue-text {
    color: #1E3A8A;
  }
  
  &.green-text {
    color: #059669;
  }
  
  &.orange-text {
    color: #EA580C;
  }
  
  &.purple-text {
    color: #7C3AED;
  }
}

/**
 * 加载占位
 */
.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 64rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.loading-text {
  font-size: 28rpx;
  color: #9CA3AF;
}
</style>
