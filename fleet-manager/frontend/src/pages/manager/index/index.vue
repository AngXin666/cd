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
  
  重构说明：
  - 使用 WelcomeCard 组件替换原有欢迎卡片
  - 使用 LogoutCard 组件替换原有退出登录卡片
  - 使用 QuickActions 组件替换原有快捷功能入口
  - 使用 useHomeStats composable 替换 loadAttendanceStats 和 loadPieceWorkStats
  - 使用 useWarehouseLoader composable 替换 loadWarehouses
  - 引入共享样式 home-common.scss
-->
<template>
  <view class="manager-home" :style="{ background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)' }">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <!-- 页面内容 -->
    <scroll-view scroll-y class="page-content" @scrolltolower="onScrollToLower">
      <view class="content-wrapper">
        <!-- 欢迎卡片 - 使用共享组件 WelcomeCard -->
        <WelcomeCard title="车队长工作台" :subtitle="`欢迎回来，${displayName}`">
          <!-- 通知铃铛 - Requirements 2.1 -->
          <NotificationBell :user-id="userStore.user?.id?.toString() || ''" />
        </WelcomeCard>

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

        <!-- 仓库切换器 - Requirements 4.1, 5.4 -->
        <view v-if="showWarehouseSwitcher" class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">🏭</text>
              <text class="section-title">选择仓库</text>
              <text class="warehouse-count">({{ currentWarehouseIndex + 1 }}/{{ warehousesWithDataOrDrivers.length }})</text>
            </view>
            <text class="sort-hint">按数据量排序</text>
          </view>
          <WarehouseSwitcher
            :warehouses="warehousesWithDataOrDrivers"
            :current-index="currentWarehouseIndex"
            @change="handleWarehouseChange"
            @assignment-update="handleAssignmentUpdate"
          />
        </view>

        <!-- 司机实时状态统计 - Requirements 6.1 -->
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
            @click="navigateTo('/pages/manager/drivers/index')"
          />
        </view>

        <!-- 快捷功能入口 - 使用共享组件 QuickActions -->
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
          <QuickActions :actions="quickActions" :columns="2" @click="handleQuickActionClick" />
        </view>

        <!-- 退出登录 - 使用共享组件 LogoutCard -->
        <view class="section">
          <LogoutCard />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车队长工作台首页
 * 
 * @description 提供车队长工作台功能，包括今日统计、待审批、司机管理等
 * 
 * 重构说明：
 * - 使用 WelcomeCard 组件替换原有欢迎卡片
 * - 使用 LogoutCard 组件替换原有退出登录卡片
 * - 使用 QuickActions 组件替换原有快捷功能入口
 * - 使用 useHomeStats composable 替换 loadAttendanceStats 和 loadPieceWorkStats
 * - 使用 useWarehouseLoader composable 替换 loadWarehouses
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { 
  getUsers, 
  getLeaveApplications, 
  getPieceWorkStats,
  getAttendanceRecords,
  getUnreadCount,
  getWarehouseUsers,
} from '@/api'
import { UserRole, LeaveStatus, getWarehousePresetUnit } from '@/api/types'
import type { DashboardStats, CardType } from '@/components/Dashboard/types'
import type { DriverStatsData } from '@/components/DriverStats/types'
import type { QuickAction } from '@/components/QuickActions/types'
import type { AssignmentUpdateEvent } from '@/types/sse-events'

// 共享组件
import { WelcomeCard, LogoutCard, QuickActions } from '@/components'
import NotificationBell from '@/components/NotificationBell/index.vue'
import RealNotificationBar from '@/components/RealNotificationBar/index.vue'
import Dashboard from '@/components/Dashboard/index.vue'
import WarehouseSwitcher from '@/components/WarehouseSwitcher/index.vue'
import DriverStats from '@/components/DriverStats/index.vue'

// Composables
import { useHomeStats } from '@/composables/useHomeStats'
import { useWarehouseLoader } from '@/composables/useWarehouseLoader'

// 工具函数
import {
  filterWarehousesWithDataOrDrivers,
  shouldShowWarehouseSwitcher,
} from '@/utils/warehouse'
import { getLocalDateString } from '@/utils/date'

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 组件引用 ====================

const notificationBarRef = ref<InstanceType<typeof RealNotificationBar> | null>(null)

// ==================== Composables ====================

/** 当前选中的仓库索引 */
const currentWarehouseIndex = ref(0)

/**
 * 使用 useWarehouseLoader composable 加载仓库数据
 * 车队长端按今日出勤排序
 */
const {
  warehouses,
  warehouseDataMap,
  warehouseDriverCountMap,
  warehouseTodayAttendanceMap,
  warehouseTypeMap,
  loading: warehouseLoading,
  loadWarehouses,
} = useWarehouseLoader({
  sortBy: 'todayAttendance',
  includeDriverCount: true,
  includeAttendance: true,
})

/**
 * 当前选中的仓库ID（用于 useHomeStats）
 */
const currentWarehouseIdForStats = computed(() => {
  const id = warehousesWithDataOrDrivers.value[currentWarehouseIndex.value]?.id
  return id ? parseInt(id) : undefined
})

/**
 * 使用 useHomeStats composable 加载统计数据
 */
const {
  stats: homeStats,
  loading: statsLoading,
  loadAllStats,
} = useHomeStats(currentWarehouseIdForStats)

// ==================== 状态 ====================

/** 加载状态（综合仓库加载和统计加载） */
const loading = computed(() => warehouseLoading.value || statsLoading.value)

/** 司机统计加载状态 */
const driverStatsLoading = ref(false)

/** 未读通知数量 */
const unreadCount = ref(0)

/** 待审批数量 */
const pendingCount = ref(0)

/** 司机统计数据 */
const driverStats = ref<DriverStatsData | null>(null)

// ==================== 计算属性 ====================

const displayName = computed(() => userStore.userName || '车队长')
const todayDate = computed(() => new Date().toLocaleDateString('zh-CN'))

/**
 * 有数据或有司机的仓库列表
 * 使用统一的工具函数过滤，按今日出勤排序（从多到少）
 */
const warehousesWithDataOrDrivers = computed(() => {
  const warehouseList = warehouses.value.map(w => ({
    id: parseInt(w.id),
    name: w.name,
    address: null,
    is_active: true,
    created_at: '',
    warehouse_type: 'NORMAL' as const,
    preset_unit: '',
  }))
  return filterWarehousesWithDataOrDrivers({
    warehouses: warehouseList,
    warehouseDataMap: warehouseDataMap.value,
    warehouseDriverCountMap: warehouseDriverCountMap.value,
    warehouseTodayAttendanceMap: warehouseTodayAttendanceMap.value,
    sortBy: 'todayAttendance',
  }).map(w => ({ id: String(w.id), name: w.name }))
})

/**
 * 是否显示仓库切换器
 */
const showWarehouseSwitcher = computed(() => {
  return shouldShowWarehouseSwitcher(warehousesWithDataOrDrivers.value)
})

/**
 * 当前选中的仓库ID
 */
const currentWarehouseId = computed(() => {
  return warehousesWithDataOrDrivers.value[currentWarehouseIndex.value]?.id || ''
})

const currentWarehouseName = computed(() => warehousesWithDataOrDrivers.value[currentWarehouseIndex.value]?.name || '')

/**
 * 当前选中仓库的计量单位
 */
const currentUnit = computed(() => {
  const warehouseId = currentWarehouseId.value ? parseInt(currentWarehouseId.value) : 0
  const warehouseType = warehouseTypeMap.value.get(warehouseId)
  if (warehouseType) {
    return getWarehousePresetUnit(warehouseType)
  }
  return '件'
})

/**
 * 数据仪表盘统计数据
 * 使用 useHomeStats 返回的统计数据
 */
const dashboardStats = computed<DashboardStats | null>(() => {
  if (loading.value) return null
  
  return {
    todayAttendance: homeStats.value.todayAttendanceCount,
    todayPieceCount: homeStats.value.todayPieceCount,
    pendingCount: pendingCount.value,
    monthlyPieceCount: homeStats.value.monthPieceCount,
    unit: currentUnit.value,
  }
})

/**
 * 快捷功能列表
 * 使用 QuickActions 组件渲染
 */
const quickActions = computed<QuickAction[]>(() => [
  { key: 'approval', icon: '📋', text: '待审批', color: 'orange', badge: pendingCount.value },
  { key: 'stats', icon: '📊', text: '数据统计', color: 'red', badge: pendingCount.value },
  { key: 'categories', icon: '🏷️', text: '品类配置', color: 'green' },
  { key: 'drivers', icon: '👥', text: '司机管理', color: 'purple' },
  { key: 'notifications', icon: '🔔', text: '通知中心', color: 'blue', badge: unreadCount.value },
  { key: 'notify', icon: '📢', text: '发送通知', color: 'teal' },
])

// ==================== 生命周期 ====================

onMounted(() => loadData())
onShow(() => loadData())

// ==================== 方法 ====================

/**
 * 加载页面数据
 */
async function loadData(): Promise<void> {
  driverStatsLoading.value = true
  try {
    // 先加载仓库列表（使用 composable）
    await loadWarehouses()
    
    // 并行加载数据
    await Promise.all([
      loadAllStats(), // 使用 useHomeStats 的 loadAllStats
      loadPendingCount(),
      loadUnreadCount(),
      loadDriverStatsData(),
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    driverStatsLoading.value = false
  }
}

/**
 * 加载司机实时状态统计
 */
async function loadDriverStatsData(): Promise<void> {
  try {
    const warehouseId = currentWarehouseId.value ? parseInt(currentWarehouseId.value) : undefined
    
    // 获取司机数量
    let drivers: any[] = []
    if (warehouseId) {
      const warehouseUsers = await getWarehouseUsers(warehouseId)
      drivers = warehouseUsers.filter(u => u.role === UserRole.DRIVER)
    } else {
      drivers = await getUsers({ role: UserRole.DRIVER })
    }
    const totalDrivers = drivers.length
    
    const todayStr = getLocalDateString()
    
    // 获取今日考勤记录
    const records = await getAttendanceRecords({ 
      start_date: todayStr, 
      end_date: todayStr, 
      warehouse_id: warehouseId,
      limit: 1000 
    })
    const onlineDriverIds = new Set(records.map(r => r.user_id))
    const onlineDrivers = onlineDriverIds.size
    
    // 获取今日计件统计
    const pieceWorkStats = await getPieceWorkStats({ 
      start_date: todayStr, 
      end_date: todayStr,
      warehouse_id: warehouseId,
    })
    const busyDrivers = pieceWorkStats.driver_count || 0
    const idleDrivers = Math.max(0, onlineDrivers - busyDrivers)
    driverStats.value = { totalDrivers, onlineDrivers, busyDrivers, idleDrivers }
  } catch (error) {
    console.error('加载司机实时状态失败:', error)
    driverStats.value = null
  }
}

async function loadPendingCount(): Promise<void> {
  try {
    const pendingLeaves = await getLeaveApplications({ status: LeaveStatus.PENDING, limit: 1000 })
    pendingCount.value = pendingLeaves.length
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
 */
function handleAssignmentUpdate(data: AssignmentUpdateEvent): void {
  console.log('[ManagerHome] 收到仓库分配更新事件:', data)
  
  if (currentWarehouseIndex.value >= warehousesWithDataOrDrivers.value.length) {
    currentWarehouseIndex.value = Math.max(0, warehousesWithDataOrDrivers.value.length - 1)
  }
  
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

/**
 * 处理快捷功能点击
 */
function handleQuickActionClick(key: string): void {
  switch (key) {
    case 'approval': navigateTo('/pages/manager/approval/index'); break
    case 'stats': navigateTo('/pages/manager/attendance/index'); break
    case 'categories': navigateTo('/pages/boss/categories/index'); break
    case 'drivers': navigateTo('/pages/manager/drivers/index'); break
    case 'notifications': navigateTo('/pages/notifications/index'); break
    case 'notify': navigateTo('/pages/manager/notify/index'); break
  }
}

function navigateTo(url: string): void {
  const tabBarPages = ['/pages/index/index', '/pages/notifications/index', '/pages/profile/index']
  const isTabBarPage = tabBarPages.some(page => url.startsWith(page))
  if (isTabBarPage) { uni.switchTab({ url }) } else { uni.navigateTo({ url }) }
}

function onScrollToLower(): void {}
</script>


<style lang="scss" scoped>
/* 引入共享样式 */
@import '@/styles/home-common.scss';

/* ==================== 主页面容器 ==================== */
.manager-home { min-height: 100vh; }
</style>
