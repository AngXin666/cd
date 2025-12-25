<!--
  老板/管理后台工作台首页
  提供管理后台功能，包括全公司统计、待审批、用户管理、仓库管理、车辆管理等
  UI 风格与主项目保持一致：蓝色主题、渐变背景、卡片式布局、数据仪表盘
  
  @module pages/boss/index
  @requirements 1.2 - 使用蓝色渐变主题
  @requirements 2.1 - 通知铃铛组件
  @requirements 3.1 - 实时通知栏组件
  @requirements 4.1 - 仓库切换器组件
  @requirements 5.1 - 数据仪表盘 2x2 网格布局
  @requirements 6.1 - 显示全公司的今日统计
  @requirements 6.2 - 显示今日出勤人数、计件总量和总金额
  @requirements 6.3 - 显示待审批数量（请假、车辆审核）
  @requirements 6.4 - 点击统计卡片跳转到对应详情页面
  @requirements 6.5 - 显示完整的功能入口网格（用户管理、仓库管理、车辆管理等）
-->
<template>
  <view class="boss-home" :style="{ background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)' }">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <!-- 页面内容 -->
    <scroll-view scroll-y class="page-content" @scrolltolower="onScrollToLower">
      <view class="content-wrapper">
        <!-- 欢迎卡片 - 蓝色主题（与主项目一致）- Requirements 1.2 -->
        <view class="welcome-card">
          <view class="welcome-content">
            <view class="welcome-text">
              <text class="welcome-title">管理后台</text>
              <text class="welcome-subtitle">欢迎回来，{{ displayName }}</text>
            </view>
            <!-- 通知铃铛 - Requirements 2.1 -->
            <NotificationBell :user-id="userStore.userId" />
          </view>
        </view>

        <!-- 实时通知栏 - Requirements 3.1 -->
        <RealNotificationBar ref="notificationBarRef" />

        <!-- 仓库切换器 - Requirements 4.1, 4.2 -->
        <WarehouseSwitcher
          :warehouses="warehouses"
          :current-index="currentWarehouseIndex"
          @change="handleWarehouseChange"
        />

        <!-- 数据仪表盘 - Requirements 5.1, 5.2 -->
        <Dashboard
          :stats="dashboardStats"
          :loading="loading"
          :warehouse-name="currentWarehouseName"
          @card-click="handleDashboardCardClick"
        />

        <!-- 全局概览 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">🌐</text>
              <text class="section-title">全局概览</text>
            </view>
          </view>

          <view class="overview-card">
            <view class="overview-grid">
              <!-- 用户数量 -->
              <view class="overview-item blue" @click="navigateTo('/pages/boss/users/index')">
                <text class="overview-icon">👥</text>
                <text class="overview-label">用户数量</text>
                <text class="overview-value">{{ stats.userCount }}</text>
                <text class="overview-unit">人</text>
              </view>

              <!-- 仓库数量 -->
              <view class="overview-item green" @click="navigateTo('/pages/boss/warehouses/index')">
                <text class="overview-icon">🏭</text>
                <text class="overview-label">仓库数量</text>
                <text class="overview-value">{{ stats.warehouseCount }}</text>
                <text class="overview-unit">个</text>
              </view>

              <!-- 车辆数量 -->
              <view class="overview-item purple" @click="navigateTo('/pages/boss/vehicles/index')">
                <text class="overview-icon">🚗</text>
                <text class="overview-label">车辆数量</text>
                <text class="overview-value">{{ stats.vehicleCount }}</text>
                <text class="overview-unit">辆</text>
              </view>

              <!-- 待审核车辆 -->
              <view class="overview-item orange" @click="navigateTo('/pages/boss/vehicles/review')">
                <text class="overview-icon">🔍</text>
                <text class="overview-label">待审核车辆</text>
                <text class="overview-value">{{ stats.pendingVehicleCount }}</text>
                <text class="overview-unit">辆</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 快捷功能入口 - Requirements 6.5 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">⚡</text>
              <text class="section-title">快捷功能</text>
            </view>
            <!-- 个人中心按钮 -->
            <view class="profile-btn" @click="navigateTo('/pages/profile/index')">
              <text class="profile-icon">👤</text>
              <text class="profile-text">个人中心</text>
            </view>
          </view>

          <view class="quick-actions-card">
            <view class="quick-actions-grid">
              <!-- 用户管理 -->
              <view class="action-item blue" @click="navigateTo('/pages/boss/users/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">👥</text>
                </view>
                <text class="action-text">用户管理</text>
              </view>

              <!-- 仓库管理 -->
              <view class="action-item green" @click="navigateTo('/pages/boss/warehouses/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🏭</text>
                </view>
                <text class="action-text">仓库管理</text>
              </view>

              <!-- 车辆管理 -->
              <view class="action-item purple" @click="navigateTo('/pages/boss/vehicles/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🚗</text>
                </view>
                <text class="action-text">车辆管理</text>
              </view>

              <!-- 数据统计 -->
              <view class="action-item orange" @click="navigateTo('/pages/boss/stats/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">📈</text>
                </view>
                <text class="action-text">数据统计</text>
              </view>

              <!-- 请假审批 -->
              <view class="action-item teal" @click="navigateTo('/pages/boss/approval/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">✅</text>
                  <!-- 待审批数量徽章 -->
                  <view v-if="stats.pendingLeaveCount > 0" class="badge">
                    <text class="badge-count">{{ stats.pendingLeaveCount > 99 ? '99+' : stats.pendingLeaveCount }}</text>
                  </view>
                </view>
                <text class="action-text">请假审批</text>
              </view>

              <!-- 车辆审核 -->
              <view class="action-item pink" @click="navigateTo('/pages/boss/vehicles/review')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🔍</text>
                  <!-- 待审核数量徽章 -->
                  <view v-if="stats.pendingVehicleCount > 0" class="badge">
                    <text class="badge-count">{{ stats.pendingVehicleCount > 99 ? '99+' : stats.pendingVehicleCount }}</text>
                  </view>
                </view>
                <text class="action-text">车辆审核</text>
              </view>

              <!-- 分类管理 -->
              <view class="action-item cyan" @click="navigateTo('/pages/boss/categories/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">📂</text>
                </view>
                <text class="action-text">分类管理</text>
              </view>

              <!-- 通知消息 -->
              <view class="action-item red" @click="navigateTo('/pages/notifications/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🔔</text>
                  <!-- 未读消息数量徽章 -->
                  <view v-if="unreadCount > 0" class="badge">
                    <text class="badge-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
                  </view>
                </view>
                <text class="action-text">通知消息</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 功能菜单 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">📋</text>
              <text class="section-title">功能菜单</text>
            </view>
          </view>

          <view class="menu-card">
            <view class="menu-item" @click="navigateTo('/pages/boss/templates/index')">
              <view class="menu-left">
                <text class="menu-icon">📝</text>
                <text class="menu-text">通知模板</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
            <view class="menu-item" @click="navigateTo('/pages/boss/scheduled/index')">
              <view class="menu-left">
                <text class="menu-icon">⏰</text>
                <text class="menu-text">定时通知</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
            <view class="menu-item" @click="navigateTo('/pages/boss/versions/index')">
              <view class="menu-left">
                <text class="menu-icon">📱</text>
                <text class="menu-text">版本管理</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
            <view class="menu-item" @click="navigateTo('/pages/boss/vehicles/lease-reminders')">
              <view class="menu-left">
                <text class="menu-icon">💳</text>
                <text class="menu-text">租金提醒</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
          </view>
        </view>

        <!-- 退出登录 -->
        <view class="section">
          <view class="logout-card" @click="handleLogout">
            <text class="logout-icon">🚪</text>
            <text class="logout-text">退出登录</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 老板/管理后台工作台首页
 * 
 * @description 提供管理后台功能，包括全公司统计、待审批、用户管理、仓库管理、车辆管理等
 * UI 风格与主项目保持一致：渐变背景、卡片式布局、数据仪表盘
 * 
 * @requirements 6.1 - 显示全公司的今日统计
 * @requirements 6.2 - 显示今日出勤人数、计件总量和总金额
 * @requirements 6.3 - 显示待审批数量（请假、车辆审核）
 * @requirements 6.4 - 点击统计卡片跳转到对应详情页面
 * @requirements 6.5 - 显示完整的功能入口网格（用户管理、仓库管理、车辆管理等）
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { 
  getUsers, 
  getWarehouses, 
  getVehicles,
  getLeaveApplications, 
  getPieceWorkStats,
  getAttendanceRecords,
  getUnreadCount,
} from '@/api'
import { UserRole, LeaveStatus, VehicleStatus } from '@/api/types'
import NotificationBell from '@/components/NotificationBell/index.vue'
import RealNotificationBar from '@/components/RealNotificationBar/index.vue'
import WarehouseSwitcher from '@/components/WarehouseSwitcher/index.vue'
import Dashboard from '@/components/Dashboard/index.vue'
import type { Warehouse } from '@/components/WarehouseSwitcher/types'
import type { DashboardStats, CardType } from '@/components/Dashboard/types'

// ==================== Store ====================

const userStore = useUserStore()

/** 实时通知栏组件引用 */
const notificationBarRef = ref<InstanceType<typeof RealNotificationBar> | null>(null)

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 当前选中的仓库索引 */
const currentWarehouseIndex = ref(0)

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 未读通知数量 */
const unreadCount = ref(0)

/** 统计数据 */
const stats = ref({
  /** 用户总数 */
  userCount: 0,
  /** 仓库数量 */
  warehouseCount: 0,
  /** 车辆数量 */
  vehicleCount: 0,
  /** 今日出勤人数 */
  todayAttendanceCount: 0,
  /** 今日计件总量 */
  todayPieceCount: 0,
  /** 今日计件金额 */
  todayAmount: 0,
  /** 本月计件总量 */
  monthPieceCount: 0,
  /** 本月计件金额 */
  monthAmount: 0,
  /** 待审批请假数量 */
  pendingLeaveCount: 0,
  /** 待审核车辆数量 */
  pendingVehicleCount: 0,
})

// ==================== 计算属性 ====================

/**
 * 显示名称
 */
const displayName = computed(() => {
  return userStore.userName || '管理员'
})

/**
 * 今天日期
 */
const today = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${year}年${month}月${day}日 ${weekdays[now.getDay()]}`
})

/**
 * 待审批总数（请假 + 车辆审核）
 * @requirements 6.3
 */
const totalPendingCount = computed(() => {
  return stats.value.pendingLeaveCount + stats.value.pendingVehicleCount
})

/**
 * 当前选中的仓库名称
 * @requirements 4.2
 */
const currentWarehouseName = computed(() => {
  return warehouses.value[currentWarehouseIndex.value]?.name || ''
})

/**
 * 数据仪表盘统计数据
 * @requirements 5.1, 5.2 - 数据仪表盘 2x2 网格布局
 */
const dashboardStats = computed<DashboardStats | null>(() => {
  // 加载中且没有数据时返回 null
  if (loading.value && stats.value.todayAttendanceCount === 0) return null
  return {
    todayAttendance: stats.value.todayAttendanceCount,
    todayPieceCount: stats.value.todayPieceCount,
    pendingCount: totalPendingCount.value,
    monthlyPieceCount: stats.value.monthPieceCount,
  }
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
 * 加载页面数据
 * 并行加载所有数据以提高性能
 */
async function loadData(): Promise<void> {
  loading.value = true
  
  try {
    // 先加载仓库列表
    await loadWarehouses()
    
    // 并行加载数据
    await Promise.all([
      loadBasicStats(),
      loadAttendanceStats(),
      loadPieceWorkStats(),
      loadPendingCounts(),
      loadUnreadCount(),
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 加载仓库列表
 * @requirements 4.1 - 仓库切换器组件
 */
async function loadWarehouses(): Promise<void> {
  try {
    const data = await getWarehouses()
    warehouses.value = data.map(w => ({ id: w.id, name: w.name }))
  } catch (error) {
    console.error('加载仓库列表失败:', error)
    warehouses.value = []
  }
}

/**
 * 加载基础统计数据（用户、仓库、车辆数量）
 */
async function loadBasicStats(): Promise<void> {
  try {
    // 并行获取用户、仓库、车辆列表
    const [users, warehouses, vehicles] = await Promise.all([
      getUsers(),
      getWarehouses(),
      getVehicles(),
    ])
    
    stats.value.userCount = users.length
    stats.value.warehouseCount = warehouses.length
    stats.value.vehicleCount = vehicles.length
  } catch (error) {
    console.error('加载基础统计失败:', error)
  }
}

/**
 * 加载今日出勤统计
 * @requirements 6.2 - 显示今日出勤人数
 */
async function loadAttendanceStats(): Promise<void> {
  try {
    // 获取今日日期字符串
    const todayStr = new Date().toISOString().split('T')[0]
    
    // 获取今日考勤记录
    const records = await getAttendanceRecords({
      start_date: todayStr,
      end_date: todayStr,
      limit: 1000, // 获取所有记录
    })
    
    // 统计今日出勤人数（去重）
    const uniqueUserIds = new Set(records.map(r => r.user_id))
    stats.value.todayAttendanceCount = uniqueUserIds.size
  } catch (error) {
    console.error('加载出勤统计失败:', error)
  }
}

/**
 * 加载计件统计数据
 * @requirements 6.2 - 显示今日计件总量和总金额
 */
async function loadPieceWorkStats(): Promise<void> {
  try {
    // 获取今日日期字符串
    const todayStr = new Date().toISOString().split('T')[0]
    
    // 获取本月第一天
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    
    // 并行获取今日和本月统计
    const [todayStats, monthStats] = await Promise.all([
      getPieceWorkStats({
        start_date: todayStr,
        end_date: todayStr,
      }),
      getPieceWorkStats({
        start_date: monthStartStr,
        end_date: todayStr,
      }),
    ])
    
    // 更新统计数据
    stats.value.todayPieceCount = todayStats.total_quantity || 0
    stats.value.todayAmount = todayStats.total_amount || 0
    stats.value.monthPieceCount = monthStats.total_quantity || 0
    stats.value.monthAmount = monthStats.total_amount || 0
  } catch (error) {
    console.error('加载计件统计失败:', error)
  }
}

/**
 * 加载待审批数量
 * @requirements 6.3 - 显示待审批的请假和车辆审核数量
 */
async function loadPendingCounts(): Promise<void> {
  try {
    // 并行获取待审批请假和待审核车辆
    const [pendingLeaves, pendingVehicles] = await Promise.all([
      getLeaveApplications({ 
        status: LeaveStatus.PENDING,
        limit: 1000, // 获取所有待审批记录
      }),
      getVehicles({
        status: VehicleStatus.PENDING,
        limit: 1000, // 获取所有待审核车辆
      }),
    ])
    
    stats.value.pendingLeaveCount = pendingLeaves.length
    stats.value.pendingVehicleCount = pendingVehicles.length
  } catch (error) {
    console.error('加载待审批数量失败:', error)
  }
}

/**
 * 加载未读通知数量
 */
async function loadUnreadCount(): Promise<void> {
  try {
    const data = await getUnreadCount()
    unreadCount.value = data.count || 0
  } catch (error) {
    console.error('加载未读通知数量失败:', error)
    unreadCount.value = 0
  }
}

/**
 * 页面跳转
 * 自动判断是否为 tabBar 页面，使用正确的跳转方法
 * @param url - 目标页面路径
 */
function navigateTo(url: string): void {
  // tabBar 页面列表
  const tabBarPages = [
    '/pages/index/index',
    '/pages/notifications/index',
    '/pages/profile/index',
  ]
  
  // 判断是否为 tabBar 页面
  const isTabBarPage = tabBarPages.some(page => url.startsWith(page))
  
  if (isTabBarPage) {
    // tabBar 页面使用 switchTab
    uni.switchTab({ url })
  } else {
    // 普通页面使用 navigateTo
    uni.navigateTo({ url })
  }
}

/**
 * 处理仓库切换
 * @param index - 新选中的仓库索引
 * @requirements 4.2 - 仓库切换时数据更新
 */
function handleWarehouseChange(index: number): void {
  currentWarehouseIndex.value = index
  // 切换仓库后重新加载数据
  loadData()
}

/**
 * 处理数据仪表盘卡片点击
 * @param type - 卡片类型
 * @requirements 5.3 - 点击统计卡片跳转到对应的详情页面
 */
function handleDashboardCardClick(type: CardType): void {
  switch (type) {
    case 'attendance':
      navigateTo('/pages/boss/users/index')
      break
    case 'todayPiece':
      navigateToStats('today')
      break
    case 'pending':
      navigateTo('/pages/boss/approval/index')
      break
    case 'monthlyPiece':
      navigateToStats('month')
      break
  }
}

/**
 * 跳转到数据统计页面（带日期范围参数）
 * @param range - 日期范围类型 ('today' | 'month')
 * @requirements 6.4 - 点击统计卡片跳转到对应详情页面
 */
function navigateToStats(range: 'today' | 'month'): void {
  uni.navigateTo({ 
    url: `/pages/boss/stats/index?range=${range}` 
  })
}

/**
 * 滚动到底部事件处理
 */
function onScrollToLower(): void {
  // 可以在这里添加加载更多逻辑
}

/**
 * 退出登录
 */
function handleLogout(): void {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  })
}
</script>


<style lang="scss" scoped>
/* 管理后台容器 */
.boss-home {
  min-height: 100vh;
}

/* 顶部安全区域 */
.safe-area-top {
  height: env(safe-area-inset-top);
  height: constant(safe-area-inset-top);
}

/* 页面内容 */
.page-content {
  height: calc(100vh - env(safe-area-inset-top));
}

.content-wrapper {
  padding: 32rpx;
  padding-bottom: 120rpx;
}

/* 欢迎卡片 - 蓝色主题（与主项目一致）*/
.welcome-card {
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(30, 58, 138, 0.3);
}

.welcome-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.welcome-text {
  display: flex;
  flex-direction: column;
}

.welcome-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.welcome-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 待审批徽章 */
.pending-badge {
  display: flex;
  align-items: center;
  background-color: #F97316;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
}

.pending-icon {
  font-size: 40rpx;
  margin-right: 12rpx;
}

.pending-info {
  display: flex;
  flex-direction: column;
}

.pending-title {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

.pending-count {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 区块 */
.section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title-wrapper {
  display: flex;
  align-items: center;
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

.loading-icon {
  font-size: 28rpx;
  margin-left: 12rpx;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.section-date {
  font-size: 24rpx;
  color: #6B7280;
}

/* 个人中心按钮 */
.profile-btn {
  display: flex;
  align-items: center;
  background-color: #EFF6FF;
  border-radius: 32rpx;
  padding: 12rpx 24rpx;
}

.profile-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.profile-text {
  font-size: 26rpx;
  color: #1E3A8A;
  font-weight: 500;
}

/* 统计卡片 */
.stats-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.stat-block {
  border-radius: 20rpx;
  padding: 24rpx;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
  
  &.attendance {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
    border: 2rpx solid #BFDBFE;
  }
  
  &.piece-work {
    background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
    border: 2rpx solid #BBF7D0;
  }
}

.stat-block-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.stat-block-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

.stat-block-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #374151;
}

.stat-block-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 24rpx;
  color: #6B7280;
}

.stat-value-wrapper {
  display: flex;
  align-items: baseline;
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #1F2937;
  
  &.sub {
    font-size: 28rpx;
    color: #6B7280;
  }
  
  &.money {
    color: #059669;
  }
}

.stat-unit {
  font-size: 22rpx;
  color: #9CA3AF;
  margin-left: 4rpx;
}

.stat-block-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
}

.footer-text {
  font-size: 22rpx;
  color: #9CA3AF;
}

.footer-arrow {
  font-size: 28rpx;
  color: #9CA3AF;
  margin-left: 4rpx;
}

/* 本月统计卡片 */
.month-stats-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.month-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.month-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 12rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.95);
  }
}

.month-stat-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.month-stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.month-stat-label {
  font-size: 22rpx;
  color: #6B7280;
  margin-bottom: 4rpx;
}

.month-stat-value-row {
  display: flex;
  align-items: baseline;
}

.month-stat-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #1F2937;
  
  &.money {
    color: #059669;
  }
  
  &.pending {
    color: #F97316;
  }
}

.month-stat-unit {
  font-size: 20rpx;
  color: #9CA3AF;
  margin-left: 4rpx;
}

/* 全局概览卡片 */
.overview-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.overview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 12rpx;
  border-radius: 16rpx;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.95);
  }
  
  &.blue {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
    .overview-value { color: #1E3A8A; }
  }
  
  &.green {
    background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
    .overview-value { color: #166534; }
  }
  
  &.purple {
    background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
    .overview-value { color: #6B21A8; }
  }
  
  &.orange {
    background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
    .overview-value { color: #C2410C; }
  }
}

.overview-icon {
  font-size: 36rpx;
  margin-bottom: 8rpx;
}

.overview-label {
  font-size: 20rpx;
  color: #6B7280;
  margin-bottom: 4rpx;
}

.overview-value {
  font-size: 32rpx;
  font-weight: bold;
}

.overview-unit {
  font-size: 18rpx;
  color: #9CA3AF;
  margin-top: 2rpx;
}

/* 快捷功能卡片 */
.quick-actions-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 12rpx;
  border-radius: 16rpx;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.95);
  }
  
  &.blue { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); }
  &.green { background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); }
  &.orange { background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); }
  &.purple { background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); }
  &.teal { background: linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%); }
  &.pink { background: linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%); }
  &.cyan { background: linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%); }
  &.red { background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); }
}

.action-icon-wrapper {
  position: relative;
  margin-bottom: 8rpx;
}

.action-icon {
  font-size: 48rpx;
}

.badge {
  position: absolute;
  top: -8rpx;
  right: -16rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: #EF4444;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.badge-count {
  font-size: 20rpx;
  font-weight: bold;
  color: #ffffff;
}

.action-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #374151;
  text-align: center;
}

/* 菜单卡片 */
.menu-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid #F3F4F6;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background-color: #F9FAFB;
  }
}

.menu-left {
  display: flex;
  align-items: center;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.menu-text {
  font-size: 30rpx;
  color: #1F2937;
}

.menu-arrow {
  font-size: 36rpx;
  color: #9CA3AF;
}

/* 退出登录卡片 */
.logout-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(239, 68, 68, 0.3);
  
  &:active {
    opacity: 0.9;
  }
}

.logout-icon {
  font-size: 40rpx;
  margin-right: 12rpx;
}

.logout-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
