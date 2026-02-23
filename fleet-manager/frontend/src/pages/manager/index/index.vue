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

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { 
  getUsers, 
  getLeaveApplications, 
  getPieceWorkStats,
  getAttendanceRecords,
  getUnreadCount,
  getWarehouseUsers,
  getPieceWorkRecords,
} from '@/api'
import { UserRole, LeaveStatus, getWarehousePresetUnit } from '@/api/types'
import type { Warehouse } from '@/api/types'
import type { DashboardStats, CardType } from '@/components/Dashboard/types'
import type { DriverStatsData } from '@/components/DriverStats/types'
import type { QuickAction } from '@/components/QuickActions/types'
import type { AssignmentUpdateEvent } from '@/types/sse-events'
import { sseService } from '@/utils/sse'

/**
 * 车队长首页数据类型
 * 包含仪表盘统计数据和司机状态统计数据
 * 
 * @requirements 7.2 - 车队长首页数据结构
 */
interface ManagerHomeData {
  /** 仪表盘统计数据 */
  stats: DashboardStats
  /** 司机状态统计数据 */
  driverStats: DriverStatsData
}

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
import { useWarehouseDataCache } from '@/composables/useWarehouseDataCache'

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
 * 有数据或有司机的仓库列表
 * 使用统一的工具函数过滤，按今日出勤排序（从多到少）
 * 
 * 注意：必须在 useWarehouseDataCache 之前定义，因为 composable 初始化时需要使用
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

/**
 * 仓库列表（用于缓存，转换为 Warehouse 类型）
 */
const warehousesForCache = ref<any[]>([])

// 使用 watch 同步仓库列表
watch(warehousesWithDataOrDrivers, (newWarehouses) => {
  warehousesForCache.value = newWarehouses.map(w => ({
    id: parseInt(w.id),
    name: w.name,
    address: null,
    is_active: true,
    created_at: '',
    warehouse_type: 'NORMAL' as const,
    preset_unit: '件',
  }))
}, { immediate: true })

/**
 * 使用 useWarehouseDataCache composable 管理仓库数据缓存
 * 实现无感切换功能
 * @requirements 7.2 - 车队长首页集成缓存
 */
const {
  currentData: cachedManagerHomeData,
  isLoading: cacheLoading,
  isPreloading,
  preloadProgress,
  switchWarehouse: switchWarehouseCache,
  refreshCurrent: refreshCurrentCache,
  refreshAll: refreshAllCache,
  clearCache,
  getWarehouseData,
  isCached,
} = useWarehouseDataCache<ManagerHomeData>({
  loadDataFn: loadManagerHomeData,
  warehouses: warehousesForCache,
  currentIndex: currentWarehouseIndex,
  cacheExpiry: 5 * 60 * 1000, // 5 分钟
  enablePreload: true,
})

// ==================== 状态 ====================

/** 加载状态（综合仓库加载、统计加载和缓存加载） */
const loading = computed(() => warehouseLoading.value || statsLoading.value || (cacheLoading?.value ?? false))

/** 司机统计加载状态 */
const driverStatsLoading = ref(false)

/** 未读通知数量 */
const unreadCount = ref(0)

/** 待审批数量 */
const pendingCount = ref(0)

/** 
 * 司机统计数据
 * 优先使用缓存数据，如果缓存数据不存在则使用旧的加载方式
 */
const driverStats = computed<DriverStatsData | null>(() => {
  // 优先使用缓存数据
  if (cachedManagerHomeData.value) {
    return cachedManagerHomeData.value.driverStats
  }
  
  // 降级：使用旧的状态变量（兼容过渡期）
  return driverStatsRef.value
})

/** 旧的司机统计数据（用于降级） */
const driverStatsRef = ref<DriverStatsData | null>(null)

// ==================== 计算属性 ====================

const displayName = computed(() => userStore.userName || '车队长')
const todayDate = computed(() => new Date().toLocaleDateString('zh-CN'))

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
 * 优先使用缓存数据，如果缓存数据不存在则使用旧的加载方式
 * 只在加载中时返回 null，加载完成后始终返回数据（即使为 0）
 */
const dashboardStats = computed<DashboardStats | null>(() => {
  // 加载中时返回 null，显示加载状态
  if (loading.value) return null
  
  // 优先使用缓存数据
  if (cachedManagerHomeData.value) {
    return cachedManagerHomeData.value.stats
  }
  
  // 降级：使用旧的加载方式（兼容过渡期）
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
  { key: 'report', icon: '📈', text: '数据报表', color: 'teal' },
  { key: 'categories', icon: '🏷️', text: '品类配置', color: 'green' },
  { key: 'drivers', icon: '👥', text: '司机管理', color: 'purple' },
  { key: 'notifications', icon: '🔔', text: '通知中心', color: 'blue', badge: unreadCount.value },
  { key: 'notify', icon: '📢', text: '发送通知', color: 'cyan' },
])

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
  
  // 监听仓库分配更新事件
  // Requirements: 3.3 - 仓库分配变更时重新加载数据
  sseService.setCallbacks({
    onAssignmentUpdate: (data: AssignmentUpdateEvent) => {
      console.log('[车队长首页] 收到仓库分配更新事件，重新加载数据')
      // 使用 composable 的 refreshAll 方法刷新所有仓库数据
      refreshAllCache()
    },
  })
})

onShow(() => loadData())

onUnmounted(() => {
  // 清理 SSE 回调
  sseService.setCallbacks({})
})

/**
 * 下拉刷新处理
 * 使用缓存的 refreshAll 方法刷新所有数据
 * @requirements 7.2 - 使用缓存刷新数据
 */
onPullDownRefresh(async () => {
  try {
    // 刷新缓存数据
    await refreshAllCache()
    
    // 同时刷新基础数据（待审批数量等）
    await Promise.allSettled([
      loadWarehouses(),
      loadPendingCount(),
      loadUnreadCount(),
    ])
  } finally {
    uni.stopPullDownRefresh()
  }
})

// ==================== 方法 ====================

/**
 * 加载车队长首页数据
 * 并发加载统计数据和司机状态数据
 * 
 * @param warehouseId - 仓库ID
 * @returns 车队长首页数据
 * @requirements 7.2 - 车队长首页数据加载
 */
async function loadManagerHomeData(warehouseId: number): Promise<ManagerHomeData> {
  try {
    // 获取今日日期字符串（使用本地时间）
    const todayStr = getLocalDateString()
    
    // 获取本月第一天
    const monthStartStr = (() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}-01`
    })()
    
    // 并发加载所有数据
    const [
      attendanceRecords,
      todayPieceStats,
      monthPieceStats,
      warehouseUsers,
      pieceWorkRecords,
    ] = await Promise.all([
      // 加载今日考勤记录
      getAttendanceRecords({
        start_date: todayStr,
        end_date: todayStr,
        warehouse_id: warehouseId,
        limit: 1000,
      }),
      // 加载今日计件统计
      getPieceWorkStats({
        start_date: todayStr,
        end_date: todayStr,
        warehouse_id: warehouseId,
      }),
      // 加载本月计件统计
      getPieceWorkStats({
        start_date: monthStartStr,
        end_date: todayStr,
        warehouse_id: warehouseId,
      }),
      // 加载仓库用户
      getWarehouseUsers(warehouseId),
      // 加载今日计件记录
      getPieceWorkRecords({
        start_date: todayStr,
        end_date: todayStr,
        warehouse_id: warehouseId,
        limit: 1000,
      }),
    ])
    
    // 统计今日出勤人数（去重）
    const uniqueUserIds = new Set(attendanceRecords.map(r => r.user_id))
    const todayAttendanceCount = uniqueUserIds.size
    
    // 获取司机列表
    const drivers = warehouseUsers.filter(u => u.role === UserRole.DRIVER)
    
    // 统计已打卡司机（今日有打卡记录的）
    const onlineDriverIds = new Set(attendanceRecords.map(r => r.user_id))
    
    // 统计已计数司机（今日有计件记录的）
    const busyDriverIds = new Set(pieceWorkRecords.map(r => r.user_id))
    const busyDriverCount = busyDriverIds.size
    
    // 未计数司机 = 已打卡司机 - 已计数司机
    const idleDriverCount = Math.max(0, onlineDriverIds.size - busyDriverCount)
    
    // 获取当前仓库的计量单位
    const warehouseType = warehouseTypeMap.value.get(warehouseId)
    const unit = warehouseType ? getWarehousePresetUnit(warehouseType) : '件'
    
    // 构造返回数据
    return {
      stats: {
        todayAttendance: todayAttendanceCount,
        todayPieceCount: todayPieceStats.total_quantity || 0,
        pendingCount: pendingCount.value,
        monthlyPieceCount: monthPieceStats.total_quantity || 0,
        unit,
      },
      driverStats: {
        totalDrivers: drivers.length,
        onlineDrivers: onlineDriverIds.size,
        busyDrivers: busyDriverCount,
        idleDrivers: idleDriverCount,
      },
    }
  } catch (error) {
    console.error('[loadManagerHomeData] 加载失败:', error)
    throw error
  }
}

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
    
    // 检查是否是认证错误
    if (error instanceof Error && error.message.includes('登录已过期')) {
      // 认证错误，handleAuthError 已经处理了跳转，不需要显示错误提示
      console.log('[车队长首页] 认证错误，等待跳转到登录页')
      return
    }
    
    // 其他错误，显示错误提示
    uni.showToast({
      title: '加载失败',
      icon: 'none',
      duration: 2000
    })
  } finally {
    driverStatsLoading.value = false
  }
}

/**
 * 加载司机实时状态统计（降级方法）
 * 当缓存数据不可用时使用
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
    driverStatsRef.value = { totalDrivers, onlineDrivers, busyDrivers, idleDrivers }
  } catch (error) {
    console.error('加载司机实时状态失败:', error)
    driverStatsRef.value = null
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

/**
 * 处理仓库切换
 * 使用缓存的 switchWarehouse 方法实现无感切换
 * @requirements 7.2 - 使用缓存切换仓库
 */
async function handleWarehouseChange(index: number): Promise<void> {
  await switchWarehouseCache(index)
  
  // 同时更新待审批数量和未读通知数量（这些不在缓存中）
  await Promise.allSettled([
    loadPendingCount(),
    loadUnreadCount(),
  ])
}

/**
 * 处理仓库分配更新事件
 * 使用缓存的 refreshAll 方法刷新所有数据
 * @requirements 7.2 - 仓库分配更新时刷新缓存
 */
async function handleAssignmentUpdate(data: AssignmentUpdateEvent): Promise<void> {
  console.log('[ManagerHome] 收到仓库分配更新事件:', data)
  
  // 检查当前索引是否越界
  if (currentWarehouseIndex.value >= warehousesWithDataOrDrivers.value.length) {
    currentWarehouseIndex.value = Math.max(0, warehousesWithDataOrDrivers.value.length - 1)
  }
  
  // 刷新缓存数据
  await refreshAllCache()
  
  // 同时刷新基础数据（待审批数量等）
  await Promise.allSettled([
    loadWarehouses(),
    loadPendingCount(),
    loadUnreadCount(),
  ])
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
    case 'report': navigateTo('/pages/common/report/index'); break
    case 'categories': navigateTo('/pages/boss/categories/index'); break
    case 'drivers': navigateTo('/pages/manager/drivers/index'); break
    case 'notifications': navigateTo('/pages/notifications/index'); break
    case 'notify': navigateTo('/pages/manager/notify/index'); break
  }
}

function navigateTo(url: string): void {
  console.log('[ManagerHome] navigateTo 被调用，目标路径:', url)
  
  // tabBar 页面列表（只包含实际的 tabBar 页面）
  const tabBarPages = ['/pages/index/index', '/pages/profile/index']
  const isTabBarPage = tabBarPages.some(page => url.startsWith(page))
  
  if (isTabBarPage) {
    console.log('[ManagerHome] 使用 switchTab 跳转')
    uni.switchTab({ 
      url,
      success: () => console.log('[ManagerHome] switchTab 成功'),
      fail: (err) => console.error('[ManagerHome] switchTab 失败:', err),
    })
  } else {
    console.log('[ManagerHome] 使用 navigateTo 跳转')
    uni.navigateTo({ 
      url,
      success: () => console.log('[ManagerHome] navigateTo 成功'),
      fail: (err) => {
        console.error('[ManagerHome] navigateTo 失败:', err)
        // 如果 navigateTo 失败，尝试使用 redirectTo
        uni.redirectTo({
          url,
          fail: (err2) => console.error('[ManagerHome] redirectTo 也失败:', err2),
        })
      },
    })
  }
}

function onScrollToLower(): void {}
</script>


<style lang="scss" scoped>
/* 引入共享样式 */
@import '@/styles/home-common.scss';

/* ==================== 主页面容器 ==================== */
.manager-home { min-height: 100vh; }
</style>
