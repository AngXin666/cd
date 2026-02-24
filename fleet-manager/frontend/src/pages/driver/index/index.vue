<!--
  司机工作台首页
  提供司机工作台功能，包括今日打卡状态、计件统计、快捷功能入口等
  UI 风格与主项目保持一致：渐变背景、卡片式布局、数据仪表盘
  
  @module pages/driver/index
  @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7 - 司机首页深度转换
-->
<template>
  <view class="driver-home" :style="{ background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)' }">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <!-- 页面内容 -->
    <scroll-view scroll-y class="page-content" @scrolltolower="onScrollToLower">
      <view class="content-wrapper">
        <!-- 欢迎卡片 - 使用共享组件 -->
        <WelcomeCard title="司机工作台" :subtitle="'欢迎回来，' + displayName">
          <!-- 请假状态提示 -->
          <view v-if="onLeave" class="leave-badge">
            <text class="leave-icon">🏖️</text>
            <view class="leave-info">
              <text class="leave-title">今天您休息</text>
              <text class="leave-desc">无需打卡</text>
            </view>
          </view>
        </WelcomeCard>

        <!-- 今日打卡状态卡片 - Requirements 4.1, 4.2, 4.3 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">🕐</text>
              <text class="section-title">今日打卡</text>
              <text v-if="loadingAttendance" class="loading-icon">⏳</text>
            </view>
            <text class="section-date">{{ today }}</text>
          </view>

          <view class="attendance-card">
            <!-- 已打卡状态 -->
            <view v-if="todayAttendance && todayAttendance.has_clocked_in" class="attendance-status clocked-in">
              <view class="attendance-header">
                <view class="status-badge success">
                  <text class="badge-icon">✅</text>
                  <text class="badge-text">已打卡</text>
                </view>
              </view>

              <view class="attendance-details">
                <!-- 上班打卡信息 -->
                <view class="detail-item">
                  <view class="detail-icon-wrapper blue">
                    <text class="detail-icon">🌅</text>
                  </view>
                  <view class="detail-content">
                    <text class="detail-label">上班打卡</text>
                    <text class="detail-value">{{ formatTime(todayAttendance.clock_in_time, '--:--') }}</text>
                  </view>
                </view>
                
                <!-- 仓库信息 -->
                <view v-if="todayAttendance.warehouse_name" class="detail-item">
                  <view class="detail-icon-wrapper purple">
                    <text class="detail-icon">🏭</text>
                  </view>
                  <view class="detail-content">
                    <text class="detail-label">打卡仓库</text>
                    <text class="detail-value">{{ todayAttendance.warehouse_name }}</text>
                  </view>
                </view>
                
                <!-- 下班打卡信息 -->
                <view v-if="todayAttendance.has_clocked_out" class="detail-item">
                  <view class="detail-icon-wrapper orange">
                    <text class="detail-icon">🌆</text>
                  </view>
                  <view class="detail-content">
                    <text class="detail-label">下班打卡</text>
                    <text class="detail-value">{{ formatTime(todayAttendance.clock_out_time, '--:--') }}</text>
                  </view>
                </view>
                
                <!-- 工作时长 -->
                <view v-if="todayAttendance.work_hours" class="detail-item">
                  <view class="detail-icon-wrapper green">
                    <text class="detail-icon">⏱️</text>
                  </view>
                  <view class="detail-content">
                    <text class="detail-label">工作时长</text>
                    <text class="detail-value highlight">{{ formatWorkHours(todayAttendance.work_hours) }}</text>
                  </view>
                </view>
              </view>
              
              <!-- 下班打卡按钮（如果还没下班打卡） -->
              <view v-if="!todayAttendance.has_clocked_out" class="attendance-action">
                <view class="clock-out-btn" @click="navigateTo('/pages/driver/clock/index')">
                  <text class="btn-icon">🌆</text>
                  <text class="btn-text">去下班打卡</text>
                </view>
              </view>
            </view>

            <!-- 未打卡状态 -->
            <view v-else class="attendance-status not-clocked">
              <view class="not-clocked-content">
                <view class="not-clocked-icon-wrapper">
                  <text class="not-clocked-icon">⏰</text>
                </view>
                <view class="not-clocked-info">
                  <text class="not-clocked-title">今日未打卡</text>
                  <text class="not-clocked-desc">请先进行上班打卡</text>
                </view>
              </view>
              
              <!-- 打卡按钮 -->
              <view class="clock-in-btn" @click="navigateTo('/pages/driver/clock/index')">
                <text class="btn-icon">🌅</text>
                <text class="btn-text">去打卡</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 数据仪表盘 - 6个统计卡片，与主项目对齐 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">📊</text>
              <text class="section-title">数据仪表盘</text>
              <text v-if="loadingStats" class="loading-icon">⏳</text>
            </view>
            <text class="section-date">{{ today }}</text>
          </view>

          <view class="dashboard-card">
            <view class="dashboard-grid">
              <!-- 今天数量 -->
              <view class="dashboard-item blue" @click="navigateToPieceWorkList('today')">
                <text class="dashboard-icon">📦</text>
                <text class="dashboard-label">今天{{ currentUnit }}数</text>
                <text class="dashboard-value">{{ stats.todayPieceCount }}</text>
                <text class="dashboard-unit">{{ currentUnit }}</text>
              </view>

              <!-- 今天收入 -->
              <view class="dashboard-item green" @click="navigateToPieceWorkList('today')">
                <text class="dashboard-icon">💰</text>
                <text class="dashboard-label">今天收入</text>
                <text class="dashboard-value money">{{ stats.todayIncome.toFixed(0) }}</text>
                <text class="dashboard-unit">元</text>
              </view>

              <!-- 本月数量 -->
              <view class="dashboard-item purple" @click="navigateToPieceWorkList('month')">
                <text class="dashboard-icon">📅</text>
                <text class="dashboard-label">本月{{ currentUnit }}数</text>
                <text class="dashboard-value">{{ stats.monthPieceCount }}</text>
                <text class="dashboard-unit">{{ currentUnit }}</text>
              </view>

              <!-- 本月收入 -->
              <view class="dashboard-item orange" @click="navigateToPieceWorkList('month')">
                <text class="dashboard-icon">💵</text>
                <text class="dashboard-label">本月收入</text>
                <text class="dashboard-value money">{{ stats.monthIncome.toFixed(0) }}</text>
                <text class="dashboard-unit">元</text>
              </view>

              <!-- 出勤天数 -->
              <view class="dashboard-item teal" @click="navigateTo('/pages/driver/attendance/index')">
                <text class="dashboard-icon">✅</text>
                <text class="dashboard-label">出勤天数</text>
                <text class="dashboard-value">{{ stats.attendanceDays }}</text>
                <text class="dashboard-unit">天</text>
              </view>

              <!-- 请假天数 -->
              <view class="dashboard-item red" @click="navigateTo('/pages/driver/leave/list')">
                <text class="dashboard-icon">🏖️</text>
                <text class="dashboard-label">请假天数</text>
                <text class="dashboard-value">{{ stats.leaveDays }}</text>
                <text class="dashboard-unit">天</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 仓库切换器（多仓库时显示）- 与主项目对齐 -->
        <view v-if="showWarehouseSwitcher" class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">🏭</text>
              <text class="section-title">选择仓库</text>
              <text class="warehouse-count">({{ currentWarehouseIndex + 1 }}/{{ warehousesWithData.length }})</text>
            </view>
            <text class="section-hint">按数据量排序</text>
          </view>

          <view class="warehouse-swiper-card">
            <swiper
              class="warehouse-swiper"
              :current="currentWarehouseIndex"
              indicator-dots
              indicator-color="rgba(0, 0, 0, 0.2)"
              indicator-active-color="#1E3A8A"
              @change="handleWarehouseChange"
            >
              <swiper-item v-for="warehouse in warehousesWithData" :key="warehouse.id">
                <view class="warehouse-swiper-item">
                  <text class="warehouse-swiper-icon">🏭</text>
                  <text class="warehouse-swiper-name">{{ warehouse.name }}</text>
                </view>
              </swiper-item>
            </swiper>
          </view>
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

          <QuickActions
            :actions="quickActions"
            :columns="3"
            @click="handleQuickActionClick"
          />
        </view>

        <!-- 所属仓库卡片 - 与主项目对齐 -->
        <view class="section">
          <view class="section-header">
            <view class="section-title-wrapper">
              <text class="section-icon">🏭</text>
              <text class="section-title">所属仓库</text>
              <text v-if="loadingWarehouses" class="loading-icon">⏳</text>
            </view>
          </view>

          <view class="warehouses-card">
            <view v-if="warehouses.length > 0" class="warehouses-list">
              <view 
                v-for="warehouse in warehouses" 
                :key="warehouse.id"
                class="warehouse-item"
                @click="navigateToWarehouseStats(warehouse.id)"
              >
                <view class="warehouse-item-left">
                  <text class="warehouse-item-icon">📍</text>
                  <text class="warehouse-item-name">{{ warehouse.name }}</text>
                </view>
                <view class="warehouse-item-right">
                  <view :class="['warehouse-status', warehouse.is_active ? 'active' : 'inactive']">
                    <text class="status-text">{{ warehouse.is_active ? '启用中' : '已禁用' }}</text>
                  </view>
                  <text class="warehouse-arrow">›</text>
                </view>
              </view>
            </view>
            <view v-else class="warehouses-empty">
              <text class="empty-icon">⚠️</text>
              <text class="empty-title">暂未分配仓库</text>
              <text class="empty-desc">请联系管理员分配仓库</text>
            </view>
          </view>
        </view>

        <!-- 退出登录 - 使用共享组件 -->
        <view class="section">
          <LogoutCard />
        </view>
      </view>
    </scroll-view>
  </view>
</template>


<script setup lang="ts">
/**
 * 司机工作台首页
 * 
 * @description 提供司机工作台功能，包括今日打卡状态、计件统计、快捷功能入口等
 * UI 风格与主项目保持一致：渐变背景、卡片式布局、数据仪表盘
 * 
 * @requirements 4.1 - 显示今日打卡状态卡片
 * @requirements 4.2 - 已打卡时显示打卡时间和仓库信息
 * @requirements 4.3 - 未打卡时显示打卡按钮
 * @requirements 4.4 - 显示今日计件统计（件数和金额）
 * @requirements 4.5 - 显示本月计件统计（件数和金额）
 * @requirements 4.6 - 点击统计卡片跳转到计件记录页面（带日期范围参数）
 * @requirements 4.7 - 显示功能入口网格（计件录入、计件记录、请假申请等）
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useWarehouseDataCache } from '@/composables/useWarehouseDataCache'
import { WelcomeCard, LogoutCard, QuickActions } from '@/components'
import type { QuickAction } from '@/components/QuickActions/types'
import { 
  getPieceWorkStats, 
  getTodayAttendance, 
  getLeaveApplications,
  getUnreadCount,
  getWarehouses,
  getAttendanceRecords,
} from '@/api'
import type { TodayAttendance, LeaveApplication, Warehouse } from '@/api/types'
import { LeaveStatus, getWarehousePresetUnit } from '@/api/types'
import {
  filterWarehousesWithData,
  shouldShowWarehouseSwitcher,
} from '@/utils/warehouse'
import { getLocalDateString, getMonthStartStr } from '@/utils/date'
import { formatTime } from '@/utils/dateFormat'
import { sseService } from '@/utils/sse'
import type { AssignmentUpdateEvent } from '@/types/sse-events'
import { logger } from '@/utils/logger'

// ==================== 立即执行的日志 ====================
logger.log('[司机首页] ========== 脚本开始执行 ==========')
logger.log('[司机首页] 当前时间:', new Date().toISOString())
logger.log('[司机首页] 当前 URL:', window.location.href)

// ==================== 类型定义 ====================

/**
 * 司机首页数据类型
 * 包含统计数据和考勤记录
 */
interface DriverHomeData {
  /** 统计数据 */
  stats: {
    /** 今日计件数量 */
    todayPieceCount: number
    /** 今日收入 */
    todayIncome: number
    /** 本月计件数量 */
    monthPieceCount: number
    /** 本月收入 */
    monthIncome: number
    /** 本月出勤天数 */
    attendanceDays: number
    /** 本月请假天数 */
    leaveDays: number
  }
  /** 考勤记录（用于计算出勤天数） */
  attendanceRecords: any[]
}

// ==================== Store ====================

logger.log('[司机首页] 初始化 userStore')
const userStore = useUserStore()
logger.log('[司机首页] userStore 初始化完成:', {
  isLoggedIn: userStore.isLoggedIn,
  role: userStore.role,
  userName: userStore.userName,
  userId: userStore.userId
})

// ==================== 数据加载函数 ====================

/**
 * 加载司机首页数据
 * 根据仓库ID加载统计数据和考勤记录
 * @param warehouseId - 仓库ID
 * @returns 司机首页数据
 */
async function loadDriverHomeData(warehouseId: number): Promise<DriverHomeData> {
  // 获取今日日期字符串（使用本地时间）
  const todayStr = getLocalDateString()
  
  // 获取本月第一天（使用共享工具函数）
  const monthStartStr = getMonthStartStr()
  
  // 并行获取今日和本月统计、考勤记录（按仓库过滤）
  const [todayStats, monthStats, attendanceRecords] = await Promise.all([
    getPieceWorkStats({
      start_date: todayStr,
      end_date: todayStr,
      warehouse_id: warehouseId,
    }),
    getPieceWorkStats({
      start_date: monthStartStr,
      end_date: todayStr,
      warehouse_id: warehouseId,
    }),
    // 获取本月考勤记录用于计算出勤天数（按仓库过滤）
    getAttendanceRecords({
      start_date: monthStartStr,
      end_date: todayStr,
      warehouse_id: warehouseId,
    }),
  ])
  
  // 计算出勤天数（有打卡记录的天数）
  const attendanceDays = attendanceRecords.filter(r => r.clock_in).length
  
  return {
    stats: {
      todayPieceCount: todayStats.total_quantity || 0,
      todayIncome: todayStats.total_amount || 0,
      monthPieceCount: monthStats.total_quantity || 0,
      monthIncome: monthStats.total_amount || 0,
      attendanceDays,
      leaveDays: 0, // 请假天数在 loadLeaveStatus 中计算
    },
    attendanceRecords,
  }
}

// ==================== 状态 ====================

/** 加载考勤状态 */
const loadingAttendance = ref(false)

/** 是否在请假中 */
const onLeave = ref(false)

/** 今日打卡状态 */
const todayAttendance = ref<(TodayAttendance & { warehouse_name?: string }) | null>(null)

/** 未读通知数量 */
const unreadCount = ref(0)

/** 统计数据 - 扩展为6个统计项，与主项目对齐 */
const stats = ref({
  todayPieceCount: 0,
  todayIncome: 0,
  monthPieceCount: 0,
  monthIncome: 0,
  attendanceDays: 0,  // 本月出勤天数
  leaveDays: 0,       // 本月请假天数
})

/** 司机分配的仓库列表 */
const warehouses = ref<Warehouse[]>([])
logger.log('[司机首页] warehouses ref 创建完成')

/** 仓库数据映射（warehouseId -> hasData） */
const warehouseDataMap = ref<Map<number, boolean>>(new Map())

/** 仓库今日件数映射（warehouseId -> todayPieceCount），用于排序 */
const warehouseTodayPieceCountMap = ref<Map<number, number>>(new Map())

/** 当前选中的仓库索引（用于 Swiper 切换） */
const currentWarehouseIndex = ref(0)

/** 加载仓库状态 */
const loadingWarehouses = ref(false)

// ==================== 计算属性（必须在 Composable 之前定义） ====================

/**
 * 有数据的仓库列表
 * 使用统一的工具函数过滤，按今日件数排序（从多到少）
 * 注意：必须在 useWarehouseDataCache 之前定义，因为 composable 需要使用它
 */
const warehousesWithData = computed(() => {
  return filterWarehousesWithData({
    warehouses: warehouses.value,
    warehouseDataMap: warehouseDataMap.value,
    warehouseTodayPieceCountMap: warehouseTodayPieceCountMap.value,
    sortBy: 'todayPieceCount',
  })
})

// ==================== 使用 Composable ====================

logger.log('[司机首页] 开始初始化 useWarehouseDataCache')
/**
 * 使用仓库数据缓存 Composable
 * 提供数据预加载、缓存管理和无感切换功能
 */
const {
  currentData: cachedData,
  isLoading: loadingStats,
  switchWarehouse,
  refreshAll,
} = useWarehouseDataCache<DriverHomeData>({
  loadDataFn: loadDriverHomeData,
  warehouses: computed(() => warehousesWithData.value),
  currentIndex: currentWarehouseIndex,
  enablePreload: true,
})
logger.log('[司机首页] useWarehouseDataCache 初始化完成')

// 监听缓存数据变化，同步到 stats
watch(cachedData, (data) => {
  try {
    logger.log('[司机首页] cachedData 变化:', data)
    if (data) {
      stats.value = data.stats
      logger.log('[司机首页] stats 已更新:', stats.value)
    }
  } catch (error) {
    logger.error('[司机首页] watch cachedData 错误:', error)
  }
}, { immediate: true })

// ==================== 计算属性 ====================

/**
 * 快捷功能列表
 * 定义司机端的快捷功能入口
 */
const quickActions = computed<QuickAction[]>(() => [
  { key: 'piece-work', icon: '📝', text: '计件录入', color: 'blue' },
  { key: 'clock', icon: '🕐', text: '考勤打卡', color: 'orange' },
  { key: 'leave', icon: '📅', text: '请假申请', color: 'purple' },
  { key: 'stats', icon: '📊', text: '数据统计', color: 'teal' },
  { key: 'vehicle', icon: '🚗', text: '车辆管理', color: 'cyan' },
  { key: 'notifications', icon: '🔔', text: '通知消息', color: 'red', badge: unreadCount.value },
])


/**
 * 是否显示仓库切换器
 * 使用统一的工具函数判断
 */
const showWarehouseSwitcher = computed(() => {
  return shouldShowWarehouseSwitcher(warehousesWithData.value)
})

/**
 * 显示名称
 */
const displayName = computed(() => {
  return userStore.userName || '司机'
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
 * 当前选中仓库的计量单位
 * 根据仓库类型返回对应的单位（件/点/车/公里）
 */
const currentUnit = computed(() => {
  const currentWarehouse = warehousesWithData.value[currentWarehouseIndex.value]
  if (currentWarehouse?.warehouse_type) {
    return getWarehousePresetUnit(currentWarehouse.warehouse_type)
  }
  // 如果没有选中仓库或仓库没有类型，尝试从第一个仓库获取
  if (warehouses.value.length > 0 && warehouses.value[0].warehouse_type) {
    return getWarehousePresetUnit(warehouses.value[0].warehouse_type)
  }
  return '件' // 默认单位
})

// ==================== 生命周期 ====================

// 监听计件录入成功事件，刷新数据（必须在 onMounted 之前注册）
uni.$on('refreshDriverHome', () => {
  logger.log('[司机首页] 收到刷新事件，重新加载数据')
  loadData()
})

onMounted(async () => {
  logger.log('[司机首页] ========== onMounted 开始 ==========')
  logger.log('[司机首页] userStore 状态:', {
    isLoggedIn: userStore.isLoggedIn,
    role: userStore.role,
    userName: userStore.userName,
    userId: userStore.userId,
    token: userStore.token ? '存在' : '不存在'
  })
  logger.log('[司机首页] warehouses 初始值:', warehouses.value)
  
  try {
    logger.log('[司机首页] 准备调用 loadData()')
    await loadData()
    logger.log('[司机首页] loadData() 调用完成')
  } catch (error) {
    logger.error('[司机首页] loadData() 调用失败:', error)
    uni.showToast({
      title: '加载失败: ' + error,
      icon: 'none',
      duration: 5000
    })
  }
  
  // 监听仓库分配更新事件
  // Requirements: 3.3 - 仓库分配变更时重新加载数据
  sseService.setCallbacks({
    onAssignmentUpdate: (data: AssignmentUpdateEvent) => {
      logger.log('[司机首页] 收到仓库分配更新事件，重新加载数据')
      // 使用 composable 的 refreshAll 方法刷新所有仓库数据
      refreshAll()
    },
  })
  logger.log('[司机首页] ========== onMounted 完成 ==========')
})

onShow(() => {
  logger.log('[司机首页] ========== onShow 触发 ==========')
  // 页面显示时静默刷新数据（不显示 loading）
  loadData(true) // 传入 silent 参数
})

onUnmounted(() => {
  // 清理 SSE 回调
  sseService.setCallbacks({})
  // 移除刷新事件监听
  uni.$off('refreshDriverHome')
})


// ==================== 方法 ====================

/**
 * 加载页面数据
 * 先加载仓库数据，composable 会自动处理统计数据的预加载
 * @param silent - 是否静默加载（不显示 loading 提示）
 */
async function loadData(silent = false): Promise<void> {
  logger.log('[司机首页] ========== loadData 开始 ==========')
  logger.log('[司机首页] 静默模式:', silent)
  
  // 只在非静默模式下显示加载提示
  if (!silent) {
    logger.log('[司机首页] 显示加载提示')
    uni.showLoading({
      title: '加载中...',
      mask: true
    })
  }
  
  try {
    // 先加载仓库数据（因为统计数据依赖仓库选择）
    logger.log('[司机首页] 步骤 1: 开始加载仓库数据')
    await loadWarehouses()
    logger.log('[司机首页] 步骤 1: 仓库数据加载完成，仓库数量:', warehouses.value.length)
    logger.log('[司机首页] 步骤 1: 仓库列表:', warehouses.value.map(w => ({ id: w.id, name: w.name })))
    
    // composable 会自动预加载所有仓库的统计数据
    // 不需要手动调用 loadAllWarehousesStats()
    
    // 并行加载其他数据
    logger.log('[司机首页] 步骤 2: 开始并行加载其他数据')
    await Promise.all([
      loadAttendance(),
      loadLeaveStatus(),
      loadUnreadCount(),
    ])
    logger.log('[司机首页] 步骤 2: 所有数据加载完成')
    
    // 只在非静默模式下隐藏加载提示
    if (!silent) {
      logger.log('[司机首页] 隐藏加载提示')
      uni.hideLoading()
    }
    
    logger.log('[司机首页] ========== loadData 完成 ==========')
  } catch (error) {
    logger.error('[司机首页] ========== loadData 失败 ==========')
    logger.error('[司机首页] 错误详情:', error)
    
    // 只在非静默模式下隐藏加载提示
    if (!silent) {
      uni.hideLoading()
    }
    
    // 检查是否是认证错误
    if (error instanceof Error && error.message.includes('登录已过期')) {
      // 认证错误，handleAuthError 已经处理了跳转，不需要显示错误提示
      logger.log('[司机首页] 认证错误，等待跳转到登录页')
      return
    }
    
    // 其他错误，只在非静默模式下显示错误提示
    if (!silent) {
      uni.showToast({
        title: '加载失败: ' + (error as Error).message,
        icon: 'none',
        duration: 5000
      })
    }
  }
}

/**
 * 加载今日打卡状态
 * @requirements 4.1, 4.2, 4.3
 */
async function loadAttendance(): Promise<void> {
  logger.log('[司机首页] loadAttendance 开始')
  loadingAttendance.value = true
  
  try {
    const data = await getTodayAttendance()
    logger.log('[司机首页] loadAttendance 成功:', data)
    todayAttendance.value = data
  } catch (error) {
    logger.error('[司机首页] loadAttendance 失败:', error)
    todayAttendance.value = null
  } finally {
    loadingAttendance.value = false
  }
}

/**
 * 加载司机分配的仓库列表
 * 用于仓库切换器和所属仓库卡片
 * 同时获取每个仓库的计件数据，用于过滤有数据的仓库
 */
async function loadWarehouses(): Promise<void> {
  logger.log('[司机首页] loadWarehouses 开始')
  loadingWarehouses.value = true
  
  try {
    // 获取所有启用的仓库
    logger.log('[司机首页] 调用 getWarehouses API')
    const data = await getWarehouses({ is_active: true })
    logger.log('[司机首页] getWarehouses API 返回:', data)
    warehouses.value = data || []
    logger.log('[司机首页] warehouses.value 已更新:', warehouses.value.length, '个仓库')
    
    // 获取本月第一天（使用共享工具函数）
    const monthStartStr = getMonthStartStr()
    const todayStr = getLocalDateString()
    
    // 并行获取每个仓库的计件数据
    const warehouseStatsPromises = warehouses.value.map(async (warehouse) => {
      try {
        // 获取本月统计（用于判断是否有数据）
        const monthStats = await getPieceWorkStats({
          warehouse_id: warehouse.id,
          start_date: monthStartStr,
          end_date: todayStr,
        })
        // 获取今日统计（用于排序）
        const todayStats = await getPieceWorkStats({
          warehouse_id: warehouse.id,
          start_date: todayStr,
          end_date: todayStr,
        })
        // 有数据 = 本月有计件记录
        return {
          warehouseId: warehouse.id,
          hasData: (monthStats.total_quantity || 0) > 0,
          todayPieceCount: todayStats.total_quantity || 0,
        }
      } catch {
        return { warehouseId: warehouse.id, hasData: false, todayPieceCount: 0 }
      }
    })
    
    const warehouseStatsResults = await Promise.all(warehouseStatsPromises)
    
    // 创建仓库数据映射
    const dataMap = new Map<number, boolean>()
    const todayPieceCountMap = new Map<number, number>()
    for (const result of warehouseStatsResults) {
      if (result.hasData) {
        dataMap.set(result.warehouseId, true)
      }
      todayPieceCountMap.set(result.warehouseId, result.todayPieceCount)
    }
    warehouseDataMap.value = dataMap
    warehouseTodayPieceCountMap.value = todayPieceCountMap
  } catch (error) {
    logger.error('[司机首页] 加载仓库列表失败:', error)
    
    // 检查是否是认证错误（401）
    if (error instanceof Error && error.message.includes('登录已过期')) {
      // 认证错误，不处理，让 handleAuthError 跳转到登录页
      logger.log('[司机首页] 检测到认证错误，停止加载')
      throw error // 重新抛出，让上层知道是认证错误
    }
    
    // 其他错误，设置空数据
    warehouses.value = []
    warehouseDataMap.value = new Map()
  } finally {
    loadingWarehouses.value = false
  }
}


/**
 * 加载请假状态
 * 检查用户今天是否在请假中，并计算本月请假天数
 */
async function loadLeaveStatus(): Promise<void> {
  try {
    // 获取今日日期（使用本地时间）
    const todayStr = getLocalDateString()
    
    // 获取本月第一天（使用共享工具函数）
    const monthStartStr = getMonthStartStr()
    
    // 获取已批准的请假申请
    const applications = await getLeaveApplications({
      status: LeaveStatus.APPROVED,
      limit: 100,
    })
    
    // 检查是否有覆盖今天的请假
    onLeave.value = applications.some((app: LeaveApplication) => {
      return app.start_date <= todayStr && app.end_date >= todayStr
    })
    
    // 计算本月请假天数
    let leaveDays = 0
    applications.forEach((app: LeaveApplication) => {
      // 计算请假与本月的重叠天数
      const appStart = new Date(app.start_date)
      const appEnd = new Date(app.end_date)
      const monthStartDate = new Date(monthStartStr)
      const todayDate = new Date(todayStr)
      
      // 计算重叠区间
      const overlapStart = appStart > monthStartDate ? appStart : monthStartDate
      const overlapEnd = appEnd < todayDate ? appEnd : todayDate
      
      if (overlapStart <= overlapEnd) {
        // 计算天数差（包含首尾）
        const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        leaveDays += days
      }
    })
    
    // 更新统计中的请假天数
    stats.value.leaveDays = leaveDays
  } catch (error) {
    console.error('加载请假状态失败:', error)
    onLeave.value = false
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
 * 格式化工作时长
 * @param hours - 工作小时数
 * @returns 格式化后的时长
 */
function formatWorkHours(hours: number | null): string {
  if (!hours) return '0小时'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分钟`
}


/**
 * 页面跳转
 * 自动判断是否为 tabBar 页面，使用正确的跳转方法
 * 注意：/pages/notifications/index 不是 tabBar 页面，应使用 navigateTo
 * @param url - 目标页面路径
 */
function navigateTo(url: string): void {
  // tabBar 页面列表（仅包含 pages.json 中定义的 tabBar 页面）
  const tabBarPages = [
    '/pages/index/index',
    '/pages/profile/index',
  ]
  
  // 判断是否为 tabBar 页面
  const isTabBarPage = tabBarPages.some(page => url.startsWith(page))
  
  console.log('[司机端导航] 目标:', url, '是否tabBar:', isTabBarPage)
  
  if (isTabBarPage) {
    // tabBar 页面使用 switchTab
    uni.switchTab({ 
      url,
      success: () => console.log('[司机端导航] switchTab 成功:', url),
      fail: (err) => console.error('[司机端导航] switchTab 失败:', url, err),
    })
  } else {
    // 普通页面使用 navigateTo
    uni.navigateTo({ 
      url,
      success: () => console.log('[司机端导航] navigateTo 成功:', url),
      fail: (err) => {
        console.error('[司机端导航] navigateTo 失败:', url, err)
        // 失败时尝试 redirectTo 作为备选
        uni.redirectTo({
          url,
          success: () => console.log('[司机端导航] redirectTo 成功:', url),
          fail: (err2) => console.error('[司机端导航] redirectTo 也失败:', url, err2),
        })
      },
    })
  }
}

/**
 * 处理快捷功能点击
 * @param key - 功能项唯一标识
 */
function handleQuickActionClick(key: string): void {
  const routes: Record<string, string> = {
    'piece-work': '/pages/driver/piece-work/entry',
    'clock': '/pages/driver/clock/index',
    'leave': '/pages/driver/leave/apply',
    'stats': '/pages/driver/stats/index',
    'vehicle': '/pages/driver/vehicle/list',
    'notifications': '/pages/notifications/index',
  }
  
  const url = routes[key]
  if (url) {
    navigateTo(url)
  }
}

/**
 * 跳转到计件记录页面（带日期范围参数）
 * @param range - 日期范围类型 ('today' | 'month')
 * @requirements 4.6
 */
function navigateToPieceWorkList(range: 'today' | 'month'): void {
  uni.navigateTo({ 
    url: `/pages/driver/piece-work/list?range=${range}` 
  })
}

/**
 * 滚动到底部事件处理
 */
function onScrollToLower(): void {
  // 可以在这里添加加载更多逻辑
}

/**
 * 处理仓库切换（Swiper 滑动）
 * 使用 composable 的 switchWarehouse 方法实现无感切换
 * @param e - Swiper 事件
 */
function handleWarehouseChange(e: any): void {
  const newIndex = e.detail.current
  // 使用 composable 的切换方法，自动处理缓存
  switchWarehouse(newIndex)
}

/**
 * 跳转到仓库统计页面
 * @param warehouseId - 仓库ID
 */
function navigateToWarehouseStats(warehouseId: number): void {
  uni.navigateTo({ 
    url: `/pages/driver/warehouse-stats/index?warehouseId=${warehouseId}` 
  })
}
</script>


<style lang="scss" scoped>
/* 司机工作台容器 */
.driver-home {
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

/* 请假状态徽章 */
.leave-badge {
  display: flex;
  align-items: center;
  background-color: #F97316;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
}

.leave-icon {
  font-size: 40rpx;
  margin-right: 12rpx;
}

.leave-info {
  display: flex;
  flex-direction: column;
}

.leave-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #ffffff;
}

.leave-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
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
  color: #3B82F6;
  font-weight: 500;
}

/* 打卡状态卡片 */
.attendance-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.attendance-status {
  padding: 32rpx;
}

/* 已打卡状态 */
.attendance-status.clocked-in {
  background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
}

.attendance-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.status-badge {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  
  &.success {
    background-color: #10B981;
  }
}

.badge-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.badge-text {
  font-size: 26rpx;
  font-weight: bold;
  color: #ffffff;
}

.attendance-details {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.detail-item {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
}

.detail-icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  
  &.blue { background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); }
  &.purple { background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); }
  &.orange { background: linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%); }
  &.green { background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); }
}

.detail-icon {
  font-size: 32rpx;
}

.detail-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 26rpx;
  color: #6B7280;
}

.detail-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #1F2937;
  
  &.highlight {
    color: #059669;
  }
}


.attendance-action {
  margin-top: 24rpx;
}

.clock-out-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(249, 115, 22, 0.3);
  
  &:active {
    opacity: 0.9;
  }
}

/* 未打卡状态 */
.attendance-status.not-clocked {
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
}

.not-clocked-content {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.not-clocked-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.not-clocked-icon {
  font-size: 48rpx;
}

.not-clocked-info {
  display: flex;
  flex-direction: column;
}

.not-clocked-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #92400E;
  margin-bottom: 4rpx;
}

.not-clocked-desc {
  font-size: 26rpx;
  color: #B45309;
}

.clock-in-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3);
  
  &:active {
    opacity: 0.9;
  }
}

.btn-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #ffffff;
}


/* 数据仪表盘 - 6个统计卡片 */
.dashboard-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.dashboard-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 16rpx;
  border-radius: 16rpx;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.95);
  }
  
  &.blue { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); }
  &.green { background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); }
  &.purple { background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); }
  &.orange { background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); }
  &.teal { background: linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%); }
  &.red { background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); }
}

.dashboard-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.dashboard-label {
  font-size: 22rpx;
  color: #6B7280;
  margin-bottom: 8rpx;
}

.dashboard-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #1F2937;
  
  &.money {
    color: #059669;
  }
}

.dashboard-unit {
  font-size: 20rpx;
  color: #9CA3AF;
  margin-top: 4rpx;
}

/* 仓库切换器 */
.warehouse-count {
  font-size: 24rpx;
  color: #9CA3AF;
  margin-left: 8rpx;
}

.section-hint {
  font-size: 22rpx;
  color: #9CA3AF;
}

.warehouse-swiper-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.warehouse-swiper {
  height: 120rpx;
}

.warehouse-swiper-item {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  padding: 0 32rpx;
}

.warehouse-swiper-icon {
  font-size: 48rpx;
  margin-right: 16rpx;
}

.warehouse-swiper-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #1E3A8A;
}


/* 所属仓库卡片 */
.warehouses-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.warehouses-list {
  display: flex;
  flex-direction: column;
}

.warehouse-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  border-bottom: 2rpx solid rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    transform: scale(0.98);
  }
}

.warehouse-item-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.warehouse-item-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.warehouse-item-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F2937;
}

.warehouse-item-right {
  display: flex;
  align-items: center;
}

.warehouse-status {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  margin-right: 12rpx;
  
  &.active {
    background-color: #D1FAE5;
  }
  
  &.inactive {
    background-color: #F3F4F6;
  }
}

.status-text {
  font-size: 22rpx;
  
  .active & {
    color: #059669;
  }
  
  .inactive & {
    color: #6B7280;
  }
}

.warehouse-arrow {
  font-size: 32rpx;
  color: #9CA3AF;
}

.warehouses-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 32rpx;
}

.empty-icon {
  font-size: 80rpx;
  color: #D1D5DB;
  margin-bottom: 16rpx;
}

.empty-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #9CA3AF;
  margin-bottom: 8rpx;
}

.empty-desc {
  font-size: 24rpx;
  color: #D1D5DB;
}
</style>