<!--
  数据仪表盘组件
  2x2 网格布局显示统计数据
  
  @module components/Dashboard
  @requirements 5.1, 5.2, 5.3, 5.4 - 数据仪表盘组件
-->
<template>
  <view class="dashboard">
    <!-- 统计卡片网格 - Requirements 5.1, 5.2 -->
    <view class="dashboard-content">
      <view v-if="stats" class="stats-grid">
        <!-- 今天出勤 - Requirements 5.3 -->
        <view class="stat-card blue" @click="handleCardClick('attendance')">
          <view class="card-icon">👥</view>
          <text class="card-label">今天出勤</text>
          <text class="card-value">{{ stats.todayAttendance }}</text>
          <text class="card-unit">人</text>
        </view>
        
        <!-- 今天总件数 - Requirements 5.3 -->
        <view class="stat-card green" @click="handleCardClick('todayPiece')">
          <view class="card-icon">📦</view>
          <text class="card-label">今天总件数</text>
          <text class="card-value green-text">{{ stats.todayPieceCount }}</text>
          <text class="card-unit">件</text>
        </view>
        
        <!-- 待审批 - Requirements 5.3 -->
        <view class="stat-card orange" @click="handleCardClick('pending')">
          <view class="card-icon">📋</view>
          <text class="card-label">待审批</text>
          <text class="card-value orange-text">{{ stats.pendingCount }}</text>
          <text class="card-unit">条</text>
        </view>
        
        <!-- 本月完成件数 - Requirements 5.3 -->
        <view class="stat-card purple" @click="handleCardClick('monthlyPiece')">
          <view class="card-icon">📈</view>
          <text class="card-label">本月完成件数</text>
          <text class="card-value purple-text">{{ stats.monthlyPieceCount }}</text>
          <text class="card-unit">件</text>
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
 * 数据仪表盘组件
 * 
 * @description 2x2 网格布局显示统计数据
 * 
 * @requirements 5.1 - 使用 2x2 网格布局显示四个统计卡片
 * @requirements 5.2 - 包含今天出勤、今天总件数、待审批、本月完成件数四项数据
 * @requirements 5.3 - 点击统计卡片跳转到对应的详情页面
 * @requirements 5.4 - 数据加载中时显示加载动画
 */

import { computed } from 'vue'
import type { DashboardStats, CardType } from './types'

// ==================== Props ====================

interface Props {
  /** 统计数据 */
  stats: DashboardStats | null
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
  /** 卡片点击事件 */
  (e: 'cardClick', type: CardType): void
}>()

// ==================== 计算属性 ====================

/**
 * 今天日期
 */
const today = computed(() => {
  return new Date().toLocaleDateString('zh-CN')
})

// ==================== 方法 ====================

/**
 * 处理卡片点击
 * @param type - 卡片类型
 * @requirements 5.3 - 点击统计卡片跳转到对应的详情页面
 */
function handleCardClick(type: CardType): void {
  emit('cardClick', type)
}
</script>

<style lang="scss" scoped>
/**
 * 仪表盘容器
 */
.dashboard {
  margin-bottom: 24rpx;
}

/**
 * 标题栏
 */
.dashboard-header {
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

.header-right {
  display: flex;
  align-items: center;
}

.warehouse-name {
  font-size: 24rpx;
  color: #6B7280;
}

.separator {
  font-size: 24rpx;
  color: #D1D5DB;
  margin: 0 8rpx;
}

.date-text {
  font-size: 24rpx;
  color: #6B7280;
}

/**
 * 内容区域
 */
.dashboard-content {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

/**
 * 统计网格 - 2x2 布局
 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

/**
 * 统计卡片
 */
.stat-card {
  border-radius: 20rpx;
  padding: 24rpx;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
  
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

.card-icon {
  font-size: 40rpx;
  margin-bottom: 12rpx;
}

.card-label {
  display: block;
  font-size: 24rpx;
  color: #6B7280;
  margin-bottom: 8rpx;
}

.card-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #1E3A8A;
  
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

.card-unit {
  display: block;
  font-size: 22rpx;
  color: #9CA3AF;
  margin-top: 4rpx;
}

/**
 * 加载占位
 */
.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #9CA3AF;
}
</style>
