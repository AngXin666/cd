<template>
  <!--
    司机数据统计页面
    整合计件记录、考勤记录、请假记录三个功能入口
    提供统一的数据查看入口
  -->
  <view class="stats-page" :style="{ background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)' }">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <view class="page-wrapper">
      <!-- 页面标题卡片 -->
      <view class="page-title-card">
        <text class="page-title">数据统计</text>
        <text class="page-subtitle">查看我的工作数据记录</text>
      </view>

      <!-- 统计概览卡片 -->
      <view class="overview-section">
        <view class="section-header">
          <text class="section-icon">📊</text>
          <text class="section-title">本月概览</text>
        </view>
        
        <view class="overview-grid">
          <!-- 计件统计 -->
          <view class="overview-item blue" @click="navigateTo('/pages/driver/piece-work/list?range=month')">
            <text class="overview-icon">📦</text>
            <text class="overview-label">计件数</text>
            <text class="overview-value">{{ monthStats.pieceCount }}</text>
            <text class="overview-unit">{{ currentUnit }}</text>
          </view>
          
          <!-- 计件收入 -->
          <view class="overview-item green" @click="navigateTo('/pages/driver/piece-work/list?range=month')">
            <text class="overview-icon">💰</text>
            <text class="overview-label">计件收入</text>
            <text class="overview-value money">{{ monthStats.income.toFixed(0) }}</text>
            <text class="overview-unit">元</text>
          </view>
          
          <!-- 出勤天数 -->
          <view class="overview-item purple" @click="navigateTo('/pages/driver/attendance/index')">
            <text class="overview-icon">✅</text>
            <text class="overview-label">出勤天数</text>
            <text class="overview-value">{{ monthStats.attendanceDays }}</text>
            <text class="overview-unit">天</text>
          </view>
          
          <!-- 请假天数 -->
          <view class="overview-item orange" @click="navigateTo('/pages/driver/leave/list')">
            <text class="overview-icon">🏖️</text>
            <text class="overview-label">请假天数</text>
            <text class="overview-value">{{ monthStats.leaveDays }}</text>
            <text class="overview-unit">天</text>
          </view>
        </view>
      </view>

      <!-- 功能入口 -->
      <view class="entry-section">
        <view class="section-header">
          <text class="section-icon">📋</text>
          <text class="section-title">数据记录</text>
        </view>
        
        <view class="entry-list">
          <!-- 计件记录 -->
          <view class="entry-card" @click="navigateTo('/pages/driver/piece-work/list')">
            <view class="entry-left">
              <view class="entry-icon-wrapper blue">
                <text class="entry-icon">📦</text>
              </view>
              <view class="entry-info">
                <text class="entry-title">计件记录</text>
                <text class="entry-desc">查看历史计件工作记录</text>
              </view>
            </view>
            <text class="entry-arrow">›</text>
          </view>
          
          <!-- 考勤记录 -->
          <view class="entry-card" @click="navigateTo('/pages/driver/attendance/index')">
            <view class="entry-left">
              <view class="entry-icon-wrapper green">
                <text class="entry-icon">🕐</text>
              </view>
              <view class="entry-info">
                <text class="entry-title">考勤记录</text>
                <text class="entry-desc">查看打卡和出勤记录</text>
              </view>
            </view>
            <text class="entry-arrow">›</text>
          </view>
          
          <!-- 请假记录 -->
          <view class="entry-card" @click="navigateTo('/pages/driver/leave/list')">
            <view class="entry-left">
              <view class="entry-icon-wrapper orange">
                <text class="entry-icon">🏖️</text>
              </view>
              <view class="entry-info">
                <text class="entry-title">请假记录</text>
                <text class="entry-desc">查看请假申请和审批状态</text>
              </view>
            </view>
            <text class="entry-arrow">›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 司机数据统计页面
 * 整合计件记录、考勤记录、请假记录三个功能入口
 * 
 * @module pages/driver/stats/index
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { 
  getPieceWorkStats, 
  getLeaveApplications,
  getAttendanceRecords,
  getWarehouses,
} from '@/api'
import type { LeaveApplication, Warehouse } from '@/api/types'
import { LeaveStatus, getWarehousePresetUnit } from '@/api/types'
import { getLocalDateString } from '@/utils/date'

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 本月统计数据 */
const monthStats = ref({
  pieceCount: 0,
  income: 0,
  attendanceDays: 0,
  leaveDays: 0,
})

// ==================== 计算属性 ====================

/**
 * 当前计量单位
 */
const currentUnit = computed(() => {
  if (warehouses.value.length > 0 && warehouses.value[0].warehouse_type) {
    return getWarehousePresetUnit(warehouses.value[0].warehouse_type)
  }
  return '件'
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
})

onShow(() => {
  loadData()
})

// ==================== 方法 ====================

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  
  try {
    await Promise.all([
      loadWarehouses(),
      loadMonthStats(),
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 加载仓库列表
 */
async function loadWarehouses(): Promise<void> {
  try {
    const data = await getWarehouses({ is_active: true })
    warehouses.value = data || []
  } catch (error) {
    console.error('加载仓库列表失败:', error)
  }
}

/**
 * 加载本月统计数据
 */
async function loadMonthStats(): Promise<void> {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = getLocalDateString(monthStart)
    const todayStr = getLocalDateString()
    
    // 并行获取数据
    const [pieceStats, attendanceRecords, leaveApplications] = await Promise.all([
      getPieceWorkStats({
        start_date: monthStartStr,
        end_date: todayStr,
      }),
      getAttendanceRecords({
        start_date: monthStartStr,
        end_date: todayStr,
      }),
      getLeaveApplications({
        status: LeaveStatus.APPROVED,
        limit: 100,
      }),
    ])
    
    // 计算出勤天数
    const attendanceDays = attendanceRecords.filter(r => r.clock_in).length
    
    // 计算本月请假天数
    let leaveDays = 0
    leaveApplications.forEach((app: LeaveApplication) => {
      const appStart = new Date(app.start_date)
      const appEnd = new Date(app.end_date)
      const monthStartDate = new Date(monthStartStr)
      const todayDate = new Date(todayStr)
      
      const overlapStart = appStart > monthStartDate ? appStart : monthStartDate
      const overlapEnd = appEnd < todayDate ? appEnd : todayDate
      
      if (overlapStart <= overlapEnd) {
        const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        leaveDays += days
      }
    })
    
    monthStats.value = {
      pieceCount: pieceStats.total_quantity || 0,
      income: pieceStats.total_amount || 0,
      attendanceDays,
      leaveDays,
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

/**
 * 页面跳转
 * @param url - 目标页面路径
 */
function navigateTo(url: string): void {
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.stats-page {
  min-height: 100vh;
}

/* 顶部安全区域 */
.safe-area-top {
  height: env(safe-area-inset-top);
  height: constant(safe-area-inset-top);
}

.page-wrapper {
  padding: 32rpx;
  padding-bottom: 120rpx;
}

/* 页面标题卡片 */
.page-title-card {
  background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(30, 58, 138, 0.3);
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
  display: block;
  margin-bottom: 8rpx;
}

.page-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 区块样式 */
.overview-section,
.entry-section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1F2937;
}

/* 概览网格 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.overview-item {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  
  &.blue {
    border-left: 6rpx solid #3B82F6;
  }
  
  &.green {
    border-left: 6rpx solid #10B981;
  }
  
  &.purple {
    border-left: 6rpx solid #8B5CF6;
  }
  
  &.orange {
    border-left: 6rpx solid #F97316;
  }
}

.overview-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.overview-label {
  font-size: 24rpx;
  color: #6B7280;
  margin-bottom: 8rpx;
}

.overview-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #1F2937;
  
  &.money {
    color: #10B981;
  }
}

.overview-unit {
  font-size: 22rpx;
  color: #9CA3AF;
}

/* 入口列表 */
.entry-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.entry-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.entry-left {
  display: flex;
  align-items: center;
}

.entry-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  
  &.blue {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  }
  
  &.green {
    background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
  }
  
  &.orange {
    background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
  }
}

.entry-icon {
  font-size: 40rpx;
}

.entry-info {
  display: flex;
  flex-direction: column;
}

.entry-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 4rpx;
}

.entry-desc {
  font-size: 24rpx;
  color: #6B7280;
}

.entry-arrow {
  font-size: 40rpx;
  color: #9CA3AF;
}
</style>
