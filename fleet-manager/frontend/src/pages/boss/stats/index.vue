<template>
  <!-- 
    计件报表页面
    显示计件统计和用户统计
    考勤和请假统计已移至考勤管理页面
    仅老板角色可访问
    Requirements: 5.1-5.6, 1.1 (报表入口)
  -->
  <view class="stats-page">
    <!-- 日期筛选和报表入口 -->
    <view class="filter-section">
      <view class="filter-row">
        <view class="date-filter">
        <picker mode="date" :value="startDate" @change="handleStartDateChange">
          <view class="date-picker">
            <text class="date-text">{{ startDate || '开始日期' }}</text>
            <text class="date-icon">📅</text>
          </view>
        </picker>
        <text class="date-separator">至</text>
        <picker mode="date" :value="endDate" @change="handleEndDateChange">
          <view class="date-picker">
            <text class="date-text">{{ endDate || '结束日期' }}</text>
            <text class="date-icon">📅</text>
          </view>
        </picker>
        </view>
        <!-- 报表入口按钮 - Requirements: 1.1 -->
        <view class="report-btn" @click="goToReport">
          <text class="report-btn-icon">📈</text>
          <text class="report-btn-text">报表</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else class="stats-content">
      <!-- 计件统计卡片 -->
      <!-- Requirements: 5.1, 5.2 - 只显示计件统计数据和品类统计数据 -->
      <view class="stats-card piece-work">
        <view class="card-header">
          <text class="card-title">📊 计件统计</text>
        </view>
        <view class="card-body">
          <view class="stat-row">
            <view class="stat-item">
              <text class="stat-value">{{ pieceWorkStats.record_count }}</text>
              <text class="stat-label">总记录数</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ pieceWorkStats.total_quantity }}</text>
              <text class="stat-label">总数量（{{ pieceWorkStats.unit || '件' }}）</text>
            </view>
            <view class="stat-item">
              <text class="stat-value highlight">¥{{ pieceWorkStats.total_amount.toFixed(2) }}</text>
              <text class="stat-label">总金额</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 用户统计卡片 -->
      <!-- Requirements: 5.6 - 保留现有的仓库筛选、司机搜索、日期筛选、排序功能 -->
      <view class="stats-card users">
        <view class="card-header">
          <text class="card-title">👥 用户统计</text>
        </view>
        <view class="card-body">
          <view class="stat-row">
            <view class="stat-item">
              <text class="stat-value">{{ userStats.total }}</text>
              <text class="stat-label">总用户</text>
            </view>
            <view class="stat-item">
              <text class="stat-value driver">{{ userStats.drivers }}</text>
              <text class="stat-label">司机</text>
            </view>
            <view class="stat-item">
              <text class="stat-value manager">{{ userStats.managers }}</text>
              <text class="stat-label">车队长</text>
            </view>
            <view class="stat-item">
              <text class="stat-value boss">{{ userStats.bosses }}</text>
              <text class="stat-label">老板</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 计件报表页面
 * 显示计件统计和用户统计
 * 考勤和请假统计已移至考勤管理页面
 * Requirements: 5.1-5.6, 1.1 (报表入口)
 */
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPieceWorkStats, getUsers } from '@/api'
import { UserRole } from '@/api/types'
import { getLocalDateString } from '@/utils/date'

/** 加载状态 */
const loading = ref(false)
/** 开始日期 */
const startDate = ref('')
/** 结束日期 */
const endDate = ref('')

/** 计件统计数据 - Requirements: 5.1, 5.2 */
const pieceWorkStats = reactive({ total_quantity: 0, total_amount: 0, record_count: 0, unit: '件' })
/** 用户统计数据 */
const userStats = reactive({ total: 0, drivers: 0, managers: 0, bosses: 0 })

onMounted(() => {
  // 默认显示本月数据
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  startDate.value = getLocalDateString(firstDay)
  endDate.value = getLocalDateString(now)
  loadData()
})

onShow(() => { loadData() })

/**
 * 跳转到报表页面
 * Requirements: 1.1 - 老板点击报表入口跳转到报表页面
 */
function goToReport(): void {
  uni.navigateTo({ url: '/pages/common/report/index' })
}

/**
 * 加载统计数据
 * 只加载计件统计和用户统计
 * Requirements: 5.4, 5.5 - 不显示考勤和请假统计
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    const params = { start_date: startDate.value || undefined, end_date: endDate.value || undefined }
    
    // 并行加载计件和用户数据
    const [pieceWork, users] = await Promise.all([
      getPieceWorkStats(params),
      getUsers(),
    ])
    
    // 计件统计
    Object.assign(pieceWorkStats, pieceWork)
    
    // 用户统计
    userStats.total = users.length
    userStats.drivers = users.filter(u => u.role === UserRole.DRIVER).length
    userStats.managers = users.filter(u => u.role === UserRole.MANAGER).length
    userStats.bosses = users.filter(u => u.role === UserRole.BOSS).length
  } catch (error) {
    console.error('加载统计数据失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 处理开始日期变更
 * @param e - 日期选择器事件
 */
function handleStartDateChange(e: any): void { startDate.value = e.detail.value; loadData() }

/**
 * 处理结束日期变更
 * @param e - 日期选择器事件
 */
function handleEndDateChange(e: any): void { endDate.value = e.detail.value; loadData() }
</script>

<style lang="scss" scoped>
/**
 * 计件报表页面样式
 * Requirements: 5.1-5.6, 1.1 (报表入口)
 */
.stats-page { min-height: 100vh; background-color: #f5f5f5; padding-bottom: 24rpx; }
.filter-section { padding: 24rpx; }
.filter-row { display: flex; align-items: center; gap: 16rpx; }
.date-filter { display: flex; align-items: center; background-color: #ffffff; padding: 16rpx 24rpx; border-radius: 12rpx; flex: 1; }
/* 报表入口按钮样式 - Requirements: 1.1 */
.report-btn { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  background-color: #4a90e2; 
  padding: 16rpx 24rpx; 
  border-radius: 12rpx; 
  min-width: 100rpx;
}
.report-btn-icon { font-size: 32rpx; }
.report-btn-text { font-size: 24rpx; color: #ffffff; margin-top: 4rpx; }
.date-picker { display: flex; align-items: center; flex: 1; }
.date-text { font-size: 28rpx; color: #333333; flex: 1; }
.date-icon { font-size: 32rpx; }
.date-separator { font-size: 28rpx; color: #999999; margin: 0 16rpx; }
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }
.stats-content { padding: 0 24rpx; }
.stats-card { background-color: #ffffff; border-radius: 16rpx; margin-bottom: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
.card-header { padding: 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333333; }
.card-body { padding: 24rpx; }
.stat-row { display: flex; }
.stat-item { flex: 1; text-align: center; }
/* 统计数值样式 */
.stat-value { 
  font-size: 36rpx; 
  font-weight: bold; 
  color: #333333; 
  display: block; 
  margin-bottom: 8rpx; 
  /* 计件金额高亮 */
  &.highlight { color: #52c41a; } 
  /* 用户角色颜色 */
  &.driver { color: #4a90e2; } 
  &.manager { color: #52c41a; } 
  &.boss { color: #faad14; } 
}
.stat-label { font-size: 24rpx; color: #666666; }
</style>
