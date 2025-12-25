<!--
  老板/管理后台工作台首页
  提供管理后台功能，包括全公司统计、待审批、用户管理、仓库管理、车辆管理等
  UI 风格与主项目保持一致：蓝色主题、渐变背景、卡片式布局、数据仪表盘
  
  布局结构（与主项目对齐）：
  1. 安全区域 + 离线提示
  2. 欢迎卡片 + 通知铃铛
  3. 实时通知栏
  4. 数据仪表盘 2x2
  5. 仓库切换器
  6. 司机实时状态 4列
  7. 权限管理板块 2x2
  8. 系统功能板块 2x2
  9. 退出登录
  
  @module pages/boss/index
  @requirements 1.2 - 使用蓝色渐变主题
  @requirements 2.1 - 通知铃铛组件
  @requirements 3.1 - 实时通知栏组件
  @requirements 4.1 - 仓库切换器组件
  @requirements 5.1 - 数据仪表盘 2x2 网格布局
  @requirements 6.1 - 司机实时状态统计
-->
<template>
  <!-- 加载超时提示页面 -->
  <view v-if="loadTimeout" class="timeout-page">
    <view class="timeout-content">
      <text class="timeout-icon">⚠️</text>
      <text class="timeout-title">加载超时</text>
      <text class="timeout-desc">数据加载时间过长，请检查网络连接</text>
      <view class="retry-btn" @click="handleRetry">
        <text class="retry-text">重试</text>
      </view>
    </view>
  </view>

  <!-- 正常页面内容 -->
  <view v-else class="boss-home" :style="{ background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)' }">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <!-- 页面内容 -->
    <scroll-view scroll-y class="page-content" @scrolltolower="onScrollToLower">
      <view class="content-wrapper">
        <!-- 离线模式提示 - Requirements 3.1, 3.2 -->
        <view v-if="isOffline" class="offline-indicator">
          <text class="offline-icon">📡</text>
          <view class="offline-text-wrapper">
            <text class="offline-title">离线模式</text>
            <text class="offline-desc">部分数据可能不是最新的，请检查网络连接</text>
          </view>
        </view>

        <!-- 欢迎卡片 - 蓝色主题（与主项目一致）- Requirements 1.2 -->
        <view class="welcome-card">
          <view class="welcome-content">
            <view class="welcome-text">
              <text class="welcome-title">{{ roleTitle }}</text>
              <text class="welcome-subtitle">欢迎回来，{{ displayName }}</text>
            </view>
            <!-- 通知铃铛 - Requirements 2.1 -->
            <NotificationBell :user-id="userStore.user?.id?.toString() || ''" />
          </view>
        </view>

        <!-- 实时通知栏 - Requirements 3.1 -->
        <RealNotificationBar ref="notificationBarRef" />

        <!-- 数据仪表盘 - Requirements 5.1, 5.2 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">📊</text>
              <text class="section-title">数据仪表盘</text>
              <text v-if="loading" class="loading-icon">⏳</text>
            </view>
            <view class="section-info">
              <text class="section-warehouse">{{ currentWarehouseName }}</text>
              <text class="section-divider">|</text>
              <text class="section-date">{{ todayDate }}</text>
            </view>
          </view>
          <Dashboard
            :stats="dashboardStats"
            :loading="loading"
            :warehouse-name="currentWarehouseName"
            @card-click="handleDashboardCardClick"
          />
        </view>

        <!-- 仓库切换器 - Requirements 4.1, 4.2 -->
        <view v-if="warehouses.length > 0" class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">🏭</text>
              <text class="section-title">选择仓库</text>
              <text class="warehouse-count">({{ currentWarehouseIndex + 1 }}/{{ warehouses.length }})</text>
            </view>
            <text class="sort-hint">按数据量排序</text>
          </view>
          <WarehouseSwitcher
            :warehouses="warehouses"
            :current-index="currentWarehouseIndex"
            @change="handleWarehouseChange"
          />
        </view>

        <!-- 司机实时状态统计 - Requirements 1.1, 1.2 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">👥</text>
              <text class="section-title">统计概览</text>
              <text v-if="driverStatsLoading" class="loading-icon">⏳</text>
            </view>
            <text class="section-warehouse">{{ currentWarehouseName }}</text>
          </view>
          <DriverStats
            :stats="driverStats"
            :loading="driverStatsLoading"
            :warehouse-name="currentWarehouseName"
          />
        </view>

        <!-- 权限管理板块 - Requirements 2.1, 2.2, 2.4 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">🛡️</text>
              <text class="section-title">权限管理</text>
            </view>
            <!-- 个人中心按钮 -->
            <view class="profile-btn" @click="navigateTo('/pages/profile/index')">
              <text class="profile-icon">👤</text>
              <text class="profile-text">个人中心</text>
            </view>
          </view>

          <view class="feature-card">
            <view class="feature-grid-2x2">
              <!-- 用户管理 -->
              <view class="feature-item blue" @click="navigateTo('/pages/boss/users/index')">
                <text class="feature-icon">👥</text>
                <text class="feature-text">用户管理</text>
              </view>

              <!-- 仓库管理 -->
              <view class="feature-item green" @click="navigateTo('/pages/boss/warehouses/index')">
                <text class="feature-icon">🏭</text>
                <text class="feature-text">仓库管理</text>
              </view>

              <!-- 计件品类 -->
              <view class="feature-item purple" @click="navigateTo('/pages/boss/categories/index')">
                <text class="feature-icon">📂</text>
                <text class="feature-text">计件品类</text>
              </view>

              <!-- 车辆管理 -->
              <view class="feature-item orange" @click="navigateTo('/pages/boss/vehicles/index')">
                <text class="feature-icon">🚗</text>
                <text class="feature-text">车辆管理</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 系统功能板块 - Requirements 2.1, 2.3 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">⚡</text>
              <text class="section-title">系统功能</text>
            </view>
          </view>

          <view class="feature-card">
            <view class="feature-grid-2x2">
              <!-- 件数报表 -->
              <view class="feature-item orange" @click="navigateTo('/pages/boss/stats/index')">
                <text class="feature-icon">📈</text>
                <text class="feature-text">件数报表</text>
              </view>

              <!-- 考勤管理 -->
              <view class="feature-item red" @click="navigateTo('/pages/boss/approval/index')">
                <view class="feature-icon-wrapper">
                  <text class="feature-icon">✅</text>
                  <!-- 待审批数量徽章 -->
                  <view v-if="totalPendingCount > 0" class="badge">
                    <text class="badge-count">{{ totalPendingCount > 99 ? '99+' : totalPendingCount }}</text>
                  </view>
                </view>
                <text class="feature-text">考勤管理</text>
              </view>

              <!-- 通知中心 -->
              <view class="feature-item blue" @click="navigateTo('/pages/notifications/index')">
                <view class="feature-icon-wrapper">
                  <text class="feature-icon">🔔</text>
                  <!-- 未读消息数量徽章 -->
                  <view v-if="unreadCount > 0" class="badge">
                    <text class="badge-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
                  </view>
                </view>
                <text class="feature-text">通知中心</text>
              </view>

              <!-- 发送通知 -->
              <view class="feature-item purple" @click="navigateTo('/pages/boss/templates/index')">
                <text class="feature-icon">📢</text>
                <text class="feature-text">发送通知</text>
              </view>
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
 * 布局结构（与主项目对齐）：
 * 1. 安全区域 + 离线提示
 * 2. 欢迎卡片 + 通知铃铛
 * 3. 实时通知栏
 * 4. 数据仪表盘 2x2
 * 5. 仓库切换器
 * 6. 司机实时状态 4列
 * 7. 权限管理板块 2x2
 * 8. 系统功能板块 2x2
 * 9. 退出登录
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
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
import { LeaveStatus, VehicleStatus } from '@/api/types'
import NotificationBell from '@/components/NotificationBell/index.vue'
import RealNotificationBar from '@/components/RealNotificationBar/index.vue'
import WarehouseSwitcher from '@/components/WarehouseSwitcher/index.vue'
import Dashboard from '@/components/Dashboard/index.vue'
import DriverStats from '@/components/DriverStats/index.vue'
import type { Warehouse } from '@/components/WarehouseSwitcher/types'
import type { DashboardStats, CardType } from '@/components/Dashboard/types'
import type { DriverStatsData } from '@/components/DriverStats/types'

// ==================== 常量 ====================

/** 加载超时时间（毫秒） */
const LOAD_TIMEOUT_MS = 8000

/** 欢迎通知存储键 */
const WELCOME_SHOWN_KEY = 'boss_welcome_shown'

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 组件引用 ====================

/** 实时通知栏组件引用 */
const notificationBarRef = ref<InstanceType<typeof RealNotificationBar> | null>(null)

// ==================== 状态 ====================

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 当前选中的仓库索引 */
const currentWarehouseIndex = ref(0)

/** 加载状态 */
const loading = ref(false)

/** 司机统计加载状态 */
const driverStatsLoading = ref(false)

/** 加载超时状态 */
const loadTimeout = ref(false)

/** 离线模式状态 */
const isOffline = ref(false)

/** 超时计时器引用 */
let timeoutTimer: ReturnType<typeof setTimeout> | null = null

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

/** 司机统计数据 */
const driverStats = ref<DriverStatsData | null>(null)

// ==================== 计算属性 ====================

/**
 * 角色标题
 * 根据用户角色显示不同的标题
 */
const roleTitle = computed(() => {
  const role = userStore.user?.role
  if (role === 'PEER_ADMIN') {
    return '调度控制台'
  }
  return '老板控制台'
})

/**
 * 显示名称
 */
const displayName = computed(() => {
  return userStore.userName || '管理员'
})

/**
 * 今天日期
 */
const todayDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN')
})

/**
 * 待审批总数（请假 + 车辆审核）
 */
const totalPendingCount = computed(() => {
  return stats.value.pendingLeaveCount + stats.value.pendingVehicleCount
})

/**
 * 当前选中的仓库名称
 */
const currentWarehouseName = computed(() => {
  return warehouses.value[currentWarehouseIndex.value]?.name || ''
})

/**
 * 当前选中的仓库ID
 */
const currentWarehouseId = computed(() => {
  return warehouses.value[currentWarehouseIndex.value]?.id || ''
})

/**
 * 数据仪表盘统计数据
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
  showWelcomeNotification()
})

onUnmounted(() => {
  // 清理超时计时器
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
    timeoutTimer = null
  }
})

onShow(() => {
  // 页面显示时刷新数据
  loadData()
})

/**
 * 下拉刷新处理
 * @requirements 4.1, 4.2, 4.3
 */
onPullDownRefresh(async () => {
  try {
    await loadData()
  } finally {
    uni.stopPullDownRefresh()
  }
})

// ==================== 方法 ====================

/**
 * 显示欢迎通知（首次访问）
 * @requirements 7.1, 7.2, 7.3
 */
function showWelcomeNotification(): void {
  try {
    const hasShown = uni.getStorageSync(WELCOME_SHOWN_KEY)
    if (!hasShown && notificationBarRef.value) {
      // 添加欢迎通知
      setTimeout(() => {
        if (notificationBarRef.value) {
          // 通过组件方法添加通知（如果组件支持）
          console.log('首次访问，显示欢迎通知')
        }
      }, 500)
      
      // 标记已显示
      uni.setStorageSync(WELCOME_SHOWN_KEY, 'true')
    }
  } catch (error) {
    console.error('显示欢迎通知失败:', error)
  }
}

/**
 * 启动加载超时计时器
 * @requirements 5.1
 */
function startTimeoutTimer(): void {
  // 清理之前的计时器
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
  }
  
  // 设置新的超时计时器
  timeoutTimer = setTimeout(() => {
    if (loading.value) {
      loadTimeout.value = true
      loading.value = false
    }
  }, LOAD_TIMEOUT_MS)
}

/**
 * 清理加载超时计时器
 */
function clearTimeoutTimer(): void {
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
    timeoutTimer = null
  }
}

/**
 * 处理重试
 * @requirements 5.3
 */
function handleRetry(): void {
  loadTimeout.value = false
  loadData()
}

/**
 * 加载页面数据
 * 并行加载所有数据以提高性能
 */
async function loadData(): Promise<void> {
  loading.value = true
  loadTimeout.value = false
  isOffline.value = false
  
  // 启动超时计时器
  startTimeoutTimer()
  
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
      loadDriverStats(),
    ])
    
    // 加载成功，清除离线状态
    isOffline.value = false
  } catch (error) {
    console.error('加载数据失败:', error)
    // 设置离线状态
    isOffline.value = true
  } finally {
    loading.value = false
    clearTimeoutTimer()
  }
}

/**
 * 加载仓库列表
 */
async function loadWarehouses(): Promise<void> {
  try {
    const data = await getWarehouses()
    // 将 API 返回的 number 类型 id 转换为 string 类型，以匹配组件类型定义
    warehouses.value = data.map(w => ({ id: String(w.id), name: w.name }))
  } catch (error) {
    console.error('加载仓库列表失败:', error)
    warehouses.value = []
    throw error
  }
}

/**
 * 加载基础统计数据（用户、仓库、车辆数量）
 */
async function loadBasicStats(): Promise<void> {
  try {
    // 并行获取用户、仓库、车辆列表
    const [users, warehouseList, vehicles] = await Promise.all([
      getUsers(),
      getWarehouses(),
      getVehicles(),
    ])
    
    stats.value.userCount = users.length
    stats.value.warehouseCount = warehouseList.length
    stats.value.vehicleCount = vehicles.length
  } catch (error) {
    console.error('加载基础统计失败:', error)
    throw error
  }
}

/**
 * 加载今日出勤统计
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
    throw error
  }
}

/**
 * 加载计件统计数据
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
    throw error
  }
}

/**
 * 加载待审批数量
 */
async function loadPendingCounts(): Promise<void> {
  try {
    // 并行获取待审批请假和待审核车辆
    const [pendingLeaves, pendingVehicles] = await Promise.all([
      getLeaveApplications({ 
        status: LeaveStatus.PENDING,
        limit: 1000,
      }),
      getVehicles({
        status: VehicleStatus.REVIEWING,
        limit: 1000,
      }),
    ])
    
    stats.value.pendingLeaveCount = pendingLeaves.length
    stats.value.pendingVehicleCount = pendingVehicles.length
  } catch (error) {
    console.error('加载待审批数量失败:', error)
    throw error
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
 * 加载司机统计数据
 * @requirements 1.2, 1.3
 */
async function loadDriverStats(): Promise<void> {
  driverStatsLoading.value = true
  
  try {
    // 获取今日日期字符串
    const todayStr = new Date().toISOString().split('T')[0]
    
    // 获取所有用户（司机）
    const users = await getUsers()
    const drivers = users.filter(u => u.role === 'DRIVER')
    
    // 获取今日考勤记录
    const attendanceRecords = await getAttendanceRecords({
      start_date: todayStr,
      end_date: todayStr,
      limit: 1000,
    })
    
    // 获取今日计件记录
    const pieceWorkStats = await getPieceWorkStats({
      start_date: todayStr,
      end_date: todayStr,
    })
    
    // 统计在线司机（今日有打卡记录的）
    const onlineDriverIds = new Set(attendanceRecords.map(r => r.user_id))
    
    // 统计已计件司机（今日有计件记录的）
    // 注意：这里简化处理，实际可能需要更精确的统计
    const busyDriverCount = pieceWorkStats.total_quantity > 0 ? onlineDriverIds.size : 0
    
    // 更新司机统计数据
    driverStats.value = {
      totalDrivers: drivers.length,
      onlineDrivers: onlineDriverIds.size,
      busyDrivers: busyDriverCount,
      idleDrivers: Math.max(0, onlineDriverIds.size - busyDriverCount),
    }
  } catch (error) {
    console.error('加载司机统计失败:', error)
    driverStats.value = {
      totalDrivers: 0,
      onlineDrivers: 0,
      busyDrivers: 0,
      idleDrivers: 0,
    }
  } finally {
    driverStatsLoading.value = false
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
 * @requirements 1.3 - 仓库切换时数据更新
 */
function handleWarehouseChange(index: number): void {
  currentWarehouseIndex.value = index
  // 切换仓库后重新加载数据
  loadData()
}

/**
 * 处理数据仪表盘卡片点击
 * @param type - 卡片类型
 */
function handleDashboardCardClick(type: CardType): void {
  switch (type) {
    case 'attendance':
      navigateTo('/pages/boss/users/index')
      break
    case 'todayPiece':
      navigateTo('/pages/boss/stats/index?range=today')
      break
    case 'pending':
      navigateTo('/pages/boss/approval/index')
      break
    case 'monthlyPiece':
      navigateTo('/pages/boss/stats/index?range=month')
      break
  }
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
/* ==================== 加载超时页面 ==================== */
.timeout-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, #F8FAFC, #E2E8F0);
}

.timeout-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx;
}

.timeout-icon {
  font-size: 96rpx;
  margin-bottom: 32rpx;
}

.timeout-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 16rpx;
}

.timeout-desc {
  font-size: 28rpx;
  color: #6B7280;
  margin-bottom: 48rpx;
  text-align: center;
}

.retry-btn {
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
  border-radius: 16rpx;
  padding: 24rpx 64rpx;
  
  &:active {
    opacity: 0.9;
  }
}

.retry-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

/* ==================== 主页面容器 ==================== */
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

/* ==================== 离线提示 ==================== */
.offline-indicator {
  display: flex;
  align-items: center;
  background-color: #FEF3C7;
  border: 2rpx solid #FCD34D;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
}

.offline-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.offline-text-wrapper {
  flex: 1;
}

.offline-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #92400E;
  display: block;
  margin-bottom: 4rpx;
}

.offline-desc {
  font-size: 24rpx;
  color: #B45309;
  display: block;
}

/* ==================== 欢迎卡片 ==================== */
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

/* ==================== 区块通用样式 ==================== */
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

.section-info {
  display: flex;
  align-items: center;
}

.section-warehouse {
  font-size: 24rpx;
  color: #6B7280;
}

.section-divider {
  font-size: 24rpx;
  color: #D1D5DB;
  margin: 0 12rpx;
}

.section-date {
  font-size: 24rpx;
  color: #6B7280;
}

.warehouse-count {
  font-size: 24rpx;
  color: #9CA3AF;
  margin-left: 8rpx;
}

.sort-hint {
  font-size: 24rpx;
  color: #9CA3AF;
}

/* ==================== 个人中心按钮 ==================== */
.profile-btn {
  display: flex;
  align-items: center;
  background-color: #EFF6FF;
  border-radius: 32rpx;
  padding: 12rpx 24rpx;
  
  &:active {
    background-color: #DBEAFE;
  }
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

/* ==================== 功能卡片 ==================== */
.feature-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.feature-grid-2x2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 24rpx;
  border-radius: 20rpx;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.95);
  }
  
  &.blue { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); }
  &.green { background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); }
  &.orange { background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); }
  &.purple { background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); }
  &.red { background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); }
}

.feature-icon-wrapper {
  position: relative;
}

.feature-icon {
  font-size: 56rpx;
  margin-bottom: 12rpx;
}

.feature-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #374151;
}

/* ==================== 徽章 ==================== */
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

/* ==================== 退出登录卡片 ==================== */
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
