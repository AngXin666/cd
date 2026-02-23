<!--
  老板/管理后台工作台首页
  提供管理后台功能，包括全公司统计、待审批、用户管理、仓库管理、车辆管理等
  UI 风格与主项目保持一致：蓝色主题、渐变背景、卡片式布局、数据仪表盘
  
  布局结构（与主项目对齐）：
  1. 安全区域
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
  
  重构说明：
  - 使用 WelcomeCard 组件替换原有欢迎卡片
  - 使用 LogoutCard 组件替换原有退出登录卡片
  - 使用 useHomeStats composable 替换 loadAttendanceStats 和 loadPieceWorkStats
  - 使用 useWarehouseLoader composable 替换 loadWarehouses
  - 引入共享样式 home-common.scss
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

        <!-- 欢迎卡片 - 使用共享组件 WelcomeCard -->
        <WelcomeCard :title="roleTitle" :subtitle="`欢迎回来，${displayName}`">
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

        <!-- 仓库切换器 - Requirements 4.1, 4.2, 5.4 -->
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

        <!-- 错误提示 - Requirements 6.2, 6.3 -->
        <view v-if="currentError" class="error-container">
          <view class="error-card">
            <text class="error-icon">⚠️</text>
            <view class="error-content">
              <text class="error-title">数据加载失败</text>
              <text class="error-message">{{ currentError.message || '无法加载当前仓库的数据' }}</text>
            </view>
            <view class="error-actions">
              <view class="retry-button" @click="handleRetryCurrentWarehouse">
                <text class="retry-icon">🔄</text>
                <text class="retry-text">重试</text>
              </view>
            </view>
          </view>
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
            <!-- 管理员资料按钮 -->
            <view class="profile-btn" @click="navigateTo('/pages/boss/admin-profile/index')">
              <text class="profile-icon">👤</text>
              <text class="profile-text">管理员资料</text>
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
              <!-- 待审批 -->
              <view class="feature-item orange" @click="navigateTo('/pages/boss/approval/index')">
                <view class="feature-icon-wrapper">
                  <text class="feature-icon">📋</text>
                  <!-- 待审批数量徽章 -->
                  <view v-if="totalPendingCount > 0" class="badge">
                    <text class="badge-count">{{ totalPendingCount > 99 ? '99+' : totalPendingCount }}</text>
                  </view>
                </view>
                <text class="feature-text">待审批</text>
              </view>

              <!-- 数据统计 - 跳转到数据统计页面 Requirements 6.2 -->
              <view class="feature-item red" @click="navigateTo('/pages/boss/attendance/index')">
                <view class="feature-icon-wrapper">
                  <text class="feature-icon">📊</text>
                  <!-- 待审批数量徽章 -->
                  <view v-if="totalPendingCount > 0" class="badge">
                    <text class="badge-count">{{ totalPendingCount > 99 ? '99+' : totalPendingCount }}</text>
                  </view>
                </view>
                <text class="feature-text">数据统计</text>
              </view>

              <!-- 数据报表 - 跳转到报表页面 -->
              <view class="feature-item teal" @click="navigateTo('/pages/common/report/index')">
                <text class="feature-icon">📈</text>
                <text class="feature-text">数据报表</text>
              </view>
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
              <view class="feature-item purple" @click="navigateTo('/pages/manager/notify/index')">
                <text class="feature-icon">📢</text>
                <text class="feature-text">发送通知</text>
              </view>
            </view>
          </view>
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
 * 老板/管理后台工作台首页
 * 
 * @description 提供管理后台功能，包括全公司统计、待审批、用户管理、仓库管理、车辆管理等
 * UI 风格与主项目保持一致：渐变背景、卡片式布局、数据仪表盘
 * 
 * 重构说明：
 * - 使用 WelcomeCard 组件替换原有欢迎卡片
 * - 使用 LogoutCard 组件替换原有退出登录卡片
 * - 使用 useHomeStats composable 替换 loadAttendanceStats 和 loadPieceWorkStats
 * - 使用 useWarehouseLoader composable 替换 loadWarehouses
 */

import { ref, computed, onMounted, onUnmounted, toRef, watch } from 'vue'
import type { Ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { 
  getUsers, 
  getWarehouses, 
  getVehicles,
  getLeaveApplications, 
  getPieceWorkRecords,
  getUnreadCount,
  getWarehouseUsers,
} from '@/api'
import { LeaveStatus, VehicleStatus, UserRole, getWarehousePresetUnit, WarehouseType } from '@/api/types'
import type { User, Warehouse } from '@/api/types'
import type { AssignmentUpdateEvent } from '@/types/sse-events'
import type { DashboardStats, CardType } from '@/components/Dashboard/types'
import type { DriverStatsData } from '@/components/DriverStats/types'
import { sseService } from '@/utils/sse'

/**
 * 老板首页数据类型
 * 包含仪表盘统计数据和司机状态统计数据
 * 
 * @requirements 7.1 - 老板首页数据结构
 */
interface BossHomeData {
  /** 仪表盘统计数据 */
  stats: DashboardStats
  /** 司机状态统计数据 */
  driverStats: DriverStatsData
}

// 共享组件
import { WelcomeCard, LogoutCard } from '@/components'
import NotificationBell from '@/components/NotificationBell/index.vue'
import RealNotificationBar from '@/components/RealNotificationBar/index.vue'
import WarehouseSwitcher from '@/components/WarehouseSwitcher/index.vue'
import Dashboard from '@/components/Dashboard/index.vue'
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
import { getLocalDateString, getMonthStartStr } from '@/utils/date'

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

// ==================== Composables ====================

/** 当前选中的仓库索引 */
const currentWarehouseIndex = ref(0)

/**
 * 使用 useWarehouseLoader composable 加载仓库数据
 * 替换原有的 loadWarehouses 函数和相关状态变量
 */
const {
  warehouses,
  warehouseDataMap,
  warehouseDriverCountMap,
  warehouseTodayPieceCountMap,
  warehouseTypeMap,
  loading: warehouseLoading,
  loadWarehouses,
} = useWarehouseLoader({
  sortBy: 'todayPieceCount',
  includeDriverCount: true,
})

/**
 * 有数据或有司机的仓库列表
 * 使用统一的工具函数过滤，按今日件数排序（从多到少）
 * 
 * 注意：必须在 useHomeStats 和 useWarehouseDataCache 之前定义
 */
const warehousesWithDataOrDrivers = computed(() => {
  // 将 Warehouse 类型转换为工具函数需要的类型
  const warehouseList = warehouses.value.map(w => ({
    id: parseInt(w.id),
    name: w.name,
    address: null,
    is_active: true,
    created_at: '',
    warehouse_type: WarehouseType.PIECE,
    preset_unit: '件',
  }))
  return filterWarehousesWithDataOrDrivers({
    warehouses: warehouseList,
    warehouseDataMap: warehouseDataMap.value,
    warehouseDriverCountMap: warehouseDriverCountMap.value,
    warehouseTodayPieceCountMap: warehouseTodayPieceCountMap.value,
    sortBy: 'todayPieceCount',
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
 * 替换原有的 loadAttendanceStats 和 loadPieceWorkStats 函数
 */
const {
  stats: homeStats,
  loading: statsLoading,
  loadAllStats,
} = useHomeStats(currentWarehouseIdForStats)

// ==================== 状态 ====================

/** 加载状态（综合仓库加载、统计加载和缓存加载） */
const loading = computed(() => warehouseLoading.value || statsLoading.value || (cacheLoading?.value ?? false))

/** 司机统计加载状态 */
const driverStatsLoading = ref(false)

/** 加载超时状态 */
const loadTimeout = ref(false)

/** 超时计时器引用 */
let timeoutTimer: ReturnType<typeof setTimeout> | null = null

/** 未读通知数量 */
const unreadCount = ref(0)

/** 基础统计数据（用户、仓库、车辆、待审批数量） */
const basicStats = ref({
  /** 用户总数 */
  userCount: 0,
  /** 仓库数量 */
  warehouseCount: 0,
  /** 车辆数量 */
  vehicleCount: 0,
  /** 待审批请假数量 */
  pendingLeaveCount: 0,
  /** 待审核车辆数量 */
  pendingVehicleCount: 0,
})

/** 
 * 司机统计数据
 * 优先使用缓存数据，如果缓存数据不存在则使用旧的加载方式
 */
const driverStats = computed<DriverStatsData | null>(() => {
  // 优先使用缓存数据
  if (cachedBossHomeData.value) {
    return cachedBossHomeData.value.driverStats
  }
  
  // 降级：使用旧的状态变量（兼容过渡期）
  return driverStatsRef.value
})

/** 旧的司机统计数据（用于降级） */
const driverStatsRef = ref<DriverStatsData | null>(null)

// ==================== 计算属性 ====================

/**
 * 角色标题
 * 根据用户角色显示不同的标题
 */
const roleTitle = computed(() => {
  const role = userStore.user?.role
  if (role === UserRole.PEER_ADMIN) {
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
 * 是否显示仓库切换器
 * 使用统一的工具函数判断
 */
const showWarehouseSwitcher = computed(() => {
  // shouldShowWarehouseSwitcher 只检查长度，所以可以传入简化的数组
  return warehousesWithDataOrDrivers.value.length > 1
})

/**
 * 仓库列表（用于缓存，转换为 Warehouse 类型）
 */
const warehousesForCache = ref<Warehouse[]>([])

// 使用 watch 同步仓库列表
watch(warehousesWithDataOrDrivers, (newWarehouses) => {
  warehousesForCache.value = newWarehouses.map(w => ({
    id: parseInt(w.id),
    name: w.name,
    address: null,
    is_active: true,
    created_at: '',
    warehouse_type: WarehouseType.PIECE,
    preset_unit: '件',
  }))
}, { immediate: true })

/**
 * 使用 useWarehouseDataCache composable 管理仓库数据缓存
 * 实现无感切换功能
 * @requirements 7.1 - 老板首页集成缓存
 */
const {
  currentData: cachedBossHomeData,
  currentError,
  isLoading: cacheLoading,
  isPreloading,
  preloadProgress,
  switchWarehouse: switchWarehouseCache,
  refreshCurrent: refreshCurrentCache,
  refreshAll: refreshAllCache,
  clearCache,
  getWarehouseData,
  isCached,
} = useWarehouseDataCache<BossHomeData>({
  loadDataFn: loadBossHomeData,
  warehouses: warehousesForCache,
  currentIndex: currentWarehouseIndex,
  cacheExpiry: 5 * 60 * 1000, // 5 分钟
  enablePreload: true,
})

/**
 * 待审批总数（请假 + 车辆审核）
 */
const totalPendingCount = computed(() => {
  return basicStats.value.pendingLeaveCount + basicStats.value.pendingVehicleCount
})

/**
 * 当前选中的仓库名称
 */
const currentWarehouseName = computed(() => {
  return warehousesWithDataOrDrivers.value[currentWarehouseIndex.value]?.name || ''
})

/**
 * 当前选中的仓库ID
 */
const currentWarehouseId = computed(() => {
  return warehousesWithDataOrDrivers.value[currentWarehouseIndex.value]?.id || ''
})

/**
 * 当前选中仓库的计量单位
 * 根据仓库类型返回对应的单位（件/点/车/公里）
 */
const currentUnit = computed(() => {
  const warehouseId = currentWarehouseId.value ? parseInt(currentWarehouseId.value) : 0
  const warehouseType = warehouseTypeMap.value.get(warehouseId)
  if (warehouseType) {
    return getWarehousePresetUnit(warehouseType)
  }
  return '件' // 默认单位
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
  if (cachedBossHomeData.value) {
    return cachedBossHomeData.value.stats
  }
  
  // 降级：使用旧的加载方式（兼容过渡期）
  return {
    todayAttendance: homeStats.value.todayAttendanceCount,
    todayPieceCount: homeStats.value.todayPieceCount,
    pendingCount: totalPendingCount.value,
    monthlyPieceCount: homeStats.value.monthPieceCount,
    unit: currentUnit.value,
  }
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
  showWelcomeNotification()
  
  // 监听仓库分配更新事件
  // Requirements: 3.3 - 仓库分配变更时重新加载数据
  sseService.setCallbacks({
    onAssignmentUpdate: (data: AssignmentUpdateEvent) => {
      console.log('[老板首页] 收到仓库分配更新事件，重新加载数据')
      // 使用 composable 的 refreshAll 方法刷新所有仓库数据
      refreshAllCache()
    },
  })
})

onUnmounted(() => {
  // 清理超时计时器
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
    timeoutTimer = null
  }
  
  // 清理 SSE 回调
  sseService.setCallbacks({})
})

onShow(() => {
  // 页面显示时刷新数据
  loadData()
})

/**
 * 下拉刷新处理
 * 使用缓存的 refreshAll 方法刷新所有数据
 * @requirements 4.1, 4.2, 4.3
 * @requirements 7.1 - 使用缓存刷新数据
 */
onPullDownRefresh(async () => {
  try {
    // 刷新缓存数据
    await refreshAllCache()
    
    // 同时刷新基础数据（待审批数量等）
    await Promise.allSettled([
      loadWarehouses(),
      loadBasicStats(),
      loadPendingCounts(),
      loadUnreadCount(),
    ])
  } finally {
    uni.stopPullDownRefresh()
  }
})

// ==================== 方法 ====================

/**
 * 加载老板首页数据
 * 并发加载统计数据和司机状态数据
 * 
 * 注意：老板和调度应该能看到所有司机，不管他们是否分配到仓库
 * 
 * @param warehouseId - 仓库ID
 * @returns 老板首页数据
 * @requirements 7.1 - 老板首页数据加载
 */
async function loadBossHomeData(warehouseId: number): Promise<BossHomeData> {
  try {
    // 获取今日日期字符串（使用本地时间）
    const todayStr = getLocalDateString()
    
    // 获取本月第一天
    const monthStartStr = getMonthStartStr()
    
    // 并发加载所有数据
    const [
      attendanceRecords,
      todayPieceStats,
      monthPieceStats,
      allUsers,
      pieceWorkRecords,
    ] = await Promise.all([
      // 加载今日考勤记录
      (async () => {
        const { getAttendanceRecords } = await import('@/api')
        return getAttendanceRecords({
          start_date: todayStr,
          end_date: todayStr,
          warehouse_id: warehouseId,
          limit: 1000,
        })
      })(),
      // 加载今日计件统计
      (async () => {
        const { getPieceWorkStats } = await import('@/api')
        return getPieceWorkStats({
          start_date: todayStr,
          end_date: todayStr,
          warehouse_id: warehouseId,
        })
      })(),
      // 加载本月计件统计
      (async () => {
        const { getPieceWorkStats } = await import('@/api')
        return getPieceWorkStats({
          start_date: monthStartStr,
          end_date: todayStr,
          warehouse_id: warehouseId,
        })
      })(),
      // 加载所有用户（老板和调度应该能看到所有司机）
      getUsers(),
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
    
    // 获取所有司机列表（不限制仓库）
    const drivers = allUsers.filter(u => u.role === UserRole.DRIVER)
    
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
        pendingCount: totalPendingCount.value,
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
    console.error('[loadBossHomeData] 加载失败:', error)
    throw error
  }
}

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
 * 处理当前仓库重试
 * 当前仓库数据加载失败时，点击重试按钮重新加载
 * @requirements 6.3 - 重试触发重新加载
 */
async function handleRetryCurrentWarehouse(): Promise<void> {
  console.log('[老板首页] 重试加载当前仓库数据')
  await refreshCurrentCache()
}

/**
 * 加载页面数据
 * 并行加载所有数据以提高性能
 * 使用 useWarehouseLoader 和 useHomeStats composables
 */
async function loadData(): Promise<void> {
  loadTimeout.value = false
  
  // 启动超时计时器
  startTimeoutTimer()
  
  try {
    // 先加载仓库列表（使用 composable）
    await loadWarehouses()
    
    // 并行加载数据（使用 Promise.allSettled 避免单个失败导致全部失败）
    await Promise.allSettled([
      loadBasicStats(),
      loadAllStats(), // 使用 useHomeStats 的 loadAllStats
      loadPendingCounts(),
      loadUnreadCount(),
      loadDriverStats(),
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    clearTimeoutTimer()
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
    
    basicStats.value.userCount = users.length
    basicStats.value.warehouseCount = warehouseList.length
    basicStats.value.vehicleCount = vehicles.length
  } catch (error) {
    console.error('加载基础统计失败:', error)
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
    
    basicStats.value.pendingLeaveCount = pendingLeaves.length
    basicStats.value.pendingVehicleCount = pendingVehicles.length
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
 * 根据当前选中的仓库过滤数据
 * 
 * 注意：老板和调度应该能看到所有司机，不管他们是否分配到仓库
 * 
 * @requirements 1.2, 1.3
 */
async function loadDriverStats(): Promise<void> {
  driverStatsLoading.value = true
  
  try {
    // 获取今日日期字符串（使用本地时间）
    const todayStr = getLocalDateString()
    
    // 获取当前选中的仓库ID
    const warehouseId = currentWarehouseId.value ? parseInt(currentWarehouseId.value) : undefined
    
    // 获取所有司机（老板和调度应该能看到所有司机）
    const users = await getUsers()
    const drivers = users.filter(u => u.role === UserRole.DRIVER)
    
    // 获取今日考勤记录（按仓库过滤）
    const { getAttendanceRecords } = await import('@/api')
    const attendanceRecords = await getAttendanceRecords({
      start_date: todayStr,
      end_date: todayStr,
      warehouse_id: warehouseId,
      limit: 1000,
    })
    
    // 获取今日计件记录（按仓库过滤）
    const pieceWorkRecords = await getPieceWorkRecords({
      start_date: todayStr,
      end_date: todayStr,
      warehouse_id: warehouseId,
      limit: 1000,
    })
    
    // 统计已打卡司机（今日有打卡记录的）
    const onlineDriverIds = new Set(attendanceRecords.map(r => r.user_id))
    
    // 统计已计数司机（今日有计件记录的）
    const busyDriverIds = new Set(pieceWorkRecords.map(r => r.user_id))
    const busyDriverCount = busyDriverIds.size
    
    // 未计数司机 = 已打卡司机 - 已计数司机
    const idleDriverCount = Math.max(0, onlineDriverIds.size - busyDriverCount)
    
    // 更新司机统计数据
    driverStatsRef.value = {
      totalDrivers: drivers.length,
      onlineDrivers: onlineDriverIds.size,
      busyDrivers: busyDriverCount,
      idleDrivers: idleDriverCount,
    }
  } catch (error) {
    console.error('加载司机统计失败:', error)
    driverStatsRef.value = {
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
  console.log('[BossHome] navigateTo 被调用，目标路径:', url)
  
  // tabBar 页面列表（只包含实际的 tabBar 页面）
  const tabBarPages = [
    '/pages/index/index',
    '/pages/profile/index',
  ]
  
  // 判断是否为 tabBar 页面
  const isTabBarPage = tabBarPages.some(page => url.startsWith(page))
  
  if (isTabBarPage) {
    // tabBar 页面使用 switchTab
    console.log('[BossHome] 使用 switchTab 跳转')
    uni.switchTab({ 
      url,
      success: () => console.log('[BossHome] switchTab 成功'),
      fail: (err) => console.error('[BossHome] switchTab 失败:', err),
    })
  } else {
    // 普通页面使用 navigateTo
    console.log('[BossHome] 使用 navigateTo 跳转')
    uni.navigateTo({ 
      url,
      success: () => console.log('[BossHome] navigateTo 成功'),
      fail: (err) => {
        console.error('[BossHome] navigateTo 失败:', err)
        // 如果 navigateTo 失败，尝试使用 redirectTo
        uni.redirectTo({
          url,
          fail: (err2) => console.error('[BossHome] redirectTo 也失败:', err2),
        })
      },
    })
  }
}

/**
 * 处理仓库切换
 * 使用缓存实现无感切换
 * @param index - 新选中的仓库索引
 * @requirements 1.3 - 仓库切换时数据更新
 * @requirements 7.1 - 使用缓存实现无感切换
 */
async function handleWarehouseChange(index: number): Promise<void> {
  // 使用缓存切换仓库（无感切换）
  await switchWarehouseCache(index)
  
  // 如果缓存未命中，需要重新加载待审批数量等基础数据
  if (!isCached(parseInt(warehousesWithDataOrDrivers.value[index]?.id || '0'))) {
    await Promise.allSettled([
      loadPendingCounts(),
      loadUnreadCount(),
    ])
  }
}

/**
 * 处理仓库分配更新事件
 * 当收到 SSE 仓库分配更新事件时，直接使用推送的数据更新本地仓库列表
 * 
 * @param data - 仓库分配更新事件数据
 * Requirements: 5.4 - 仓库选择器集成实时更新
 */
function handleAssignmentUpdate(data: AssignmentUpdateEvent): void {
  console.log('[BossHome] 收到仓库分配更新事件:', data)
  
  // 如果当前选中的仓库索引超出范围，重置为 0
  if (currentWarehouseIndex.value >= warehousesWithDataOrDrivers.value.length) {
    currentWarehouseIndex.value = Math.max(0, warehousesWithDataOrDrivers.value.length - 1)
  }
  
  // 重新加载数据以更新统计信息
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
</script>


<style lang="scss" scoped>
/* 引入共享样式 */
@import '@/styles/home-common.scss';

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
  &.teal { background: linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%); }
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

/* ==================== 错误提示 ==================== */
.error-container {
  padding: 0 24rpx;
  margin-bottom: 24rpx;
}

.error-card {
  background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
  border: 2rpx solid #FCA5A5;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.error-icon {
  font-size: 48rpx;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.error-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #991B1B;
}

.error-message {
  font-size: 24rpx;
  color: #B91C1C;
  line-height: 1.5;
}

.error-actions {
  flex-shrink: 0;
}

.retry-button {
  background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  
  &:active {
    opacity: 0.9;
  }
}

.retry-icon {
  font-size: 24rpx;
  color: #ffffff;
}

.retry-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #ffffff;
}
</style>
