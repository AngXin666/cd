<!--
  车队长工作台首页
  提供车队长工作台功能，包括今日统计、待审批、司机管理等
  UI 风格与主项目保持一致：蓝色主题、渐变背景、卡片式布局、数据仪表盘
  
  @module pages/manager/index
  @requirements 1.1 - 使用蓝色渐变主题
  @requirements 2.1 - 通知铃铛组件
  @requirements 3.1 - 实时通知栏组件
  @requirements 4.1 - 仓库切换器组件
  @requirements 5.1 - 数据仪表盘 2x2 网格布局
  @requirements 6.1 - 司机实时状态统计
-->
<template>
  <view class="manager-home" :style="{ background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)' }">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <!-- 页面内容 -->
    <scroll-view scroll-y class="page-content" @scrolltolower="onScrollToLower">
      <view class="content-wrapper">
        <!-- 欢迎卡片 - 蓝色主题（与主项目一致）- Requirements 1.1 -->
        <view class="welcome-card">
          <view class="welcome-content">
            <view class="welcome-text">
              <text class="welcome-title">车队长工作台</text>
              <text class="welcome-subtitle">欢迎回来，{{ displayName }}</text>
            </view>
            <!-- 通知铃铛 - Requirements 2.1 -->
            <NotificationBell :user-id="userStore.user?.id?.toString() || ''" />
          </view>
        </view>

        <!-- 实时通知栏 - Requirements 3.1 -->
        <RealNotificationBar ref="notificationBarRef" />

        <!-- 数据仪表盘 - Requirements 5.1 -->
        <Dashboard
          :stats="dashboardStats"
          :loading="loading"
          :warehouse-name="currentWarehouseName"
          @card-click="handleDashboardCardClick"
        />

        <!-- 仓库切换器 - Requirements 4.1, 5.4 -->
        <WarehouseSwitcher
          :warehouses="warehouses"
          :current-index="currentWarehouseIndex"
          @change="handleWarehouseChange"
          @assignment-update="handleAssignmentUpdate"
        />

        <!-- 司机实时状态统计 - Requirements 6.1 -->
        <DriverStats
          :stats="driverStats"
          :loading="driverStatsLoading"
          :warehouse-name="currentWarehouseName"
          @click="navigateTo('/pages/manager/drivers/index')"
        />

        <!-- 快捷功能入口 - 2x3 网格布局 -->
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
              <!-- 件数报表 -->
              <view class="action-item orange" @click="navigateTo('/pages/manager/piece-work/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">📊</text>
                </view>
                <text class="action-text">件数报表</text>
              </view>

              <!-- 考勤管理 -->
              <view class="action-item red" @click="navigateTo('/pages/manager/approval/list')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">📅</text>
                  <view v-if="stats.pendingCount > 0" class="badge">
                    <text class="badge-count">{{ stats.pendingCount > 99 ? '99+' : stats.pendingCount }}</text>
                  </view>
                </view>
                <text class="action-text">考勤管理</text>
              </view>

              <!-- 品类配置 -->
              <view class="action-item green" @click="handleWarehouseCategories">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🏷️</text>
                </view>
                <text class="action-text">品类配置</text>
              </view>

              <!-- 司机管理 -->
              <view class="action-item purple" @click="navigateTo('/pages/manager/drivers/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">👥</text>
                </view>
                <text class="action-text">司机管理</text>
              </view>

              <!-- 通知中心 -->
              <view class="action-item blue" @click="navigateTo('/pages/notifications/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🔔</text>
                  <view v-if="unreadCount > 0" class="badge">
                    <text class="badge-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
                  </view>
                </view>
                <text class="action-text">通知中心</text>
              </view>

              <!-- 发送通知 -->
              <view class="action-item teal" @click="navigateTo('/pages/manager/notify/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">📢</text>
                </view>
                <text class="action-text">发送通知</text>
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
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { 
  getUsers, 
  getLeaveApplications, 
  getPieceWorkStats,
  getAttendanceRecords,
  getUnreadCount,
  getWarehouses,
} from '@/api'
import { UserRole, LeaveStatus } from '@/api/types'
import type { DashboardStats, CardType } from '@/components/Dashboard/types'
import type { DriverStatsData } from '@/components/DriverStats/types'
import type { Warehouse } from '@/components/WarehouseSwitcher/types'
import type { AssignmentUpdateEvent } from '@/types/sse-events'
import NotificationBell from '@/components/NotificationBell/index.vue'
import RealNotificationBar from '@/components/RealNotificationBar/index.vue'
import Dashboard from '@/components/Dashboard/index.vue'
import WarehouseSwitcher from '@/components/WarehouseSwitcher/index.vue'
import DriverStats from '@/components/DriverStats/index.vue'

const userStore = useUserStore()
const notificationBarRef = ref<InstanceType<typeof RealNotificationBar> | null>(null)
const loading = ref(false)
const driverStatsLoading = ref(false)
const unreadCount = ref(0)
const warehouses = ref<Warehouse[]>([])
const currentWarehouseIndex = ref(0)

const stats = ref({
  driverCount: 0,
  todayAttendanceCount: 0,
  todayPieceCount: 0,
  todayAmount: 0,
  monthPieceCount: 0,
  monthAmount: 0,
  pendingCount: 0,
})

const driverStats = ref<DriverStatsData | null>(null)

const displayName = computed(() => userStore.userName || '车队长')
const currentWarehouseName = computed(() => warehouses.value[currentWarehouseIndex.value]?.name || '')

const dashboardStats = computed<DashboardStats | null>(() => {
  if (loading.value && stats.value.todayAttendanceCount === 0) return null
  return {
    todayAttendance: stats.value.todayAttendanceCount,
    todayPieceCount: stats.value.todayPieceCount,
    pendingCount: stats.value.pendingCount,
    monthlyPieceCount: stats.value.monthPieceCount,
  }
})

onMounted(() => loadData())
onShow(() => loadData())

async function loadData(): Promise<void> {
  loading.value = true
  driverStatsLoading.value = true
  try {
    await loadWarehouses()
    await Promise.all([
      loadDriverStats(), loadAttendanceStats(), loadPieceWorkStats(),
      loadPendingCount(), loadUnreadCount(), loadDriverStatsData(),
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
    driverStatsLoading.value = false
  }
}

async function loadWarehouses(): Promise<void> {
  try {
    const data = await getWarehouses()
    // 将 API 返回的 number 类型 id 转换为 string 类型，以匹配组件类型定义
    warehouses.value = data.map(w => ({ id: String(w.id), name: w.name }))
  } catch (error) {
    console.error('加载仓库列表失败:', error)
    warehouses.value = []
  }
}

async function loadDriverStats(): Promise<void> {
  try {
    const drivers = await getUsers({ role: UserRole.DRIVER })
    stats.value.driverCount = drivers.length
  } catch (error) {
    console.error('加载司机统计失败:', error)
  }
}

async function loadDriverStatsData(): Promise<void> {
  try {
    const drivers = await getUsers({ role: UserRole.DRIVER })
    const totalDrivers = drivers.length
    const todayStr = new Date().toISOString().split('T')[0]
    const records = await getAttendanceRecords({ start_date: todayStr, end_date: todayStr, limit: 1000 })
    const onlineDriverIds = new Set(records.map(r => r.user_id))
    const onlineDrivers = onlineDriverIds.size
    const pieceWorkStats = await getPieceWorkStats({ start_date: todayStr, end_date: todayStr })
    const busyDrivers = pieceWorkStats.driver_count || 0
    const idleDrivers = Math.max(0, onlineDrivers - busyDrivers)
    driverStats.value = { totalDrivers, onlineDrivers, busyDrivers, idleDrivers }
  } catch (error) {
    console.error('加载司机实时状态失败:', error)
    driverStats.value = null
  }
}

async function loadAttendanceStats(): Promise<void> {
  try {
    const todayStr = new Date().toISOString().split('T')[0]
    const records = await getAttendanceRecords({ start_date: todayStr, end_date: todayStr, limit: 1000 })
    const uniqueUserIds = new Set(records.map(r => r.user_id))
    stats.value.todayAttendanceCount = uniqueUserIds.size
  } catch (error) {
    console.error('加载出勤统计失败:', error)
  }
}

async function loadPieceWorkStats(): Promise<void> {
  try {
    const todayStr = new Date().toISOString().split('T')[0]
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const [todayStats, monthStats] = await Promise.all([
      getPieceWorkStats({ start_date: todayStr, end_date: todayStr }),
      getPieceWorkStats({ start_date: monthStartStr, end_date: todayStr }),
    ])
    stats.value.todayPieceCount = todayStats.total_quantity || 0
    stats.value.todayAmount = todayStats.total_amount || 0
    stats.value.monthPieceCount = monthStats.total_quantity || 0
    stats.value.monthAmount = monthStats.total_amount || 0
  } catch (error) {
    console.error('加载计件统计失败:', error)
  }
}

async function loadPendingCount(): Promise<void> {
  try {
    const pendingLeaves = await getLeaveApplications({ status: LeaveStatus.PENDING, limit: 1000 })
    stats.value.pendingCount = pendingLeaves.length
  } catch (error) {
    console.error('加载待审批数量失败:', error)
  }
}

async function loadUnreadCount(): Promise<void> {
  try {
    const data = await getUnreadCount()
    unreadCount.value = data.count || 0
  } catch (error) {
    console.error('加载未读通知数量失败:', error)
    unreadCount.value = 0
  }
}

function handleWarehouseChange(index: number): void {
  currentWarehouseIndex.value = index
  loadData()
}

/**
 * 处理仓库分配更新事件
 * 当收到 SSE 仓库分配更新事件时，直接使用推送的数据更新本地仓库列表
 * 
 * @param data - 仓库分配更新事件数据
 * Requirements: 5.4 - 仓库选择器集成实时更新
 */
function handleAssignmentUpdate(data: AssignmentUpdateEvent): void {
  console.log('[ManagerHome] 收到仓库分配更新事件:', data)
  
  // 直接使用推送的数据更新本地仓库列表
  // 将 API 返回的 number 类型 id 转换为 string 类型，以匹配组件类型定义
  warehouses.value = data.warehouses.map(w => ({ 
    id: String(w.id), 
    name: w.name 
  }))
  
  // 如果当前选中的仓库索引超出范围，重置为 0
  if (currentWarehouseIndex.value >= warehouses.value.length) {
    currentWarehouseIndex.value = Math.max(0, warehouses.value.length - 1)
  }
  
  // 重新加载数据以更新统计信息
  loadData()
}

function handleDashboardCardClick(type: CardType): void {
  switch (type) {
    case 'attendance': navigateTo('/pages/manager/approval/list'); break
    case 'todayPiece': navigateTo('/pages/manager/stats/index?range=today'); break
    case 'pending': navigateTo('/pages/manager/approval/list'); break
    case 'monthlyPiece': navigateTo('/pages/manager/stats/index?range=month'); break
  }
}

function handleWarehouseCategories(): void {
  const warehouse = warehouses.value[currentWarehouseIndex.value]
  if (warehouse) {
    navigateTo(`/pages/manager/warehouse-categories/index?warehouseId=${warehouse.id}&warehouseName=${encodeURIComponent(warehouse.name)}`)
  } else {
    uni.showToast({ title: '请先选择仓库', icon: 'none' })
  }
}

function navigateTo(url: string): void {
  const tabBarPages = ['/pages/index/index', '/pages/notifications/index', '/pages/profile/index']
  const isTabBarPage = tabBarPages.some(page => url.startsWith(page))
  if (isTabBarPage) { uni.switchTab({ url }) } else { uni.navigateTo({ url }) }
}

function onScrollToLower(): void {}

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
.manager-home { min-height: 100vh; }
.safe-area-top { height: env(safe-area-inset-top); height: constant(safe-area-inset-top); }
.page-content { height: calc(100vh - env(safe-area-inset-top)); }
.content-wrapper { padding: 32rpx; padding-bottom: 120rpx; }

.welcome-card {
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(30, 58, 138, 0.3);
}
.welcome-content { display: flex; align-items: center; justify-content: space-between; }
.welcome-text { display: flex; flex-direction: column; flex: 1; padding-right: 24rpx; }
.welcome-title { font-size: 48rpx; font-weight: bold; color: #ffffff; margin-bottom: 8rpx; }
.welcome-subtitle { font-size: 28rpx; color: rgba(255, 255, 255, 0.8); }

.section { margin-bottom: 24rpx; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.section-title-wrapper { display: flex; align-items: center; }
.section-icon { font-size: 36rpx; margin-right: 12rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #1F2937; }

.profile-btn { display: flex; align-items: center; background-color: #EFF6FF; border-radius: 32rpx; padding: 12rpx 24rpx; }
.profile-icon { font-size: 28rpx; margin-right: 8rpx; }
.profile-text { font-size: 26rpx; color: #1E3A8A; font-weight: 500; }

.quick-actions-card { background-color: #ffffff; border-radius: 24rpx; padding: 24rpx; box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08); }
.quick-actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; }
.action-item {
  display: flex; flex-direction: column; align-items: center; padding: 24rpx 16rpx; border-radius: 16rpx; transition: transform 0.2s;
  &:active { transform: scale(0.95); }
  &.blue { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); }
  &.green { background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); }
  &.orange { background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); }
  &.purple { background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); }
  &.teal { background: linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%); }
  &.red { background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); }
  &.cyan { background: linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%); }
}
.action-icon-wrapper { position: relative; margin-bottom: 12rpx; }
.action-icon { font-size: 56rpx; }
.badge { position: absolute; top: -8rpx; right: -16rpx; min-width: 32rpx; height: 32rpx; background-color: #EF4444; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; padding: 0 8rpx; }
.badge-count { font-size: 20rpx; font-weight: bold; color: #ffffff; }
.action-text { font-size: 26rpx; font-weight: 500; color: #374151; text-align: center; }

.logout-card {
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  border-radius: 24rpx; padding: 32rpx; box-shadow: 0 4rpx 16rpx rgba(239, 68, 68, 0.3);
  &:active { opacity: 0.9; }
}
.logout-icon { font-size: 40rpx; margin-right: 12rpx; }
.logout-text { font-size: 32rpx; font-weight: bold; color: #ffffff; }
</style>
