<template>
  <!--
    车队长端 - 考勤管理页面
    功能：整合考勤记录查看和请假审批功能
    
    功能特性：
    - 标签页切换（考勤记录/请假审批）
    - 司机列表按仓库分组显示（只显示管辖仓库的司机）
    - 考勤统计显示（出勤天数、迟到天数、请假天数）
    - 搜索功能（支持姓名、拼音首字母、手机号）
    - 请假审批快速操作
    - SSE 实时更新
    
    @module pages/manager/attendance
    @requirements 2.3 - 车队长用户只显示其管辖仓库的司机
  -->
  <view class="attendance-page">
    <!-- 页面标题区 -->
    <view class="page-header">
      <text class="header-title">考勤管理</text>
      <text class="header-subtitle">查看司机考勤记录和处理请假审批</text>
    </view>

    <!-- 标签页切换 -->
    <view class="tab-switcher">
      <view
        :class="['tab-item', { active: activeTab === 'ATTENDANCE' }]"
        @click="handleTabChange('ATTENDANCE')"
      >
        <text class="tab-icon">📋</text>
        <text class="tab-label">考勤记录</text>
      </view>
      <!-- 计件统计标签页 Requirements: 1.1, 1.2, 1.3 -->
      <view
        :class="['tab-item', { active: activeTab === 'PIECE_WORK' }]"
        @click="handleTabChange('PIECE_WORK')"
      >
        <text class="tab-icon">📊</text>
        <text class="tab-label">计件统计</text>
      </view>
      <view
        v-if="hasPendingApplications"
        :class="['tab-item', { active: activeTab === 'APPROVAL' }]"
        @click="handleTabChange('APPROVAL')"
      >
        <text class="tab-icon">✅</text>
        <text class="tab-label">请假审批</text>
        <view v-if="pendingCount > 0" class="badge">{{ pendingCount }}</view>
      </view>
    </view>

    <!-- 考勤记录标签页 -->
    <view v-if="activeTab === 'ATTENDANCE'" class="attendance-tab">
      <!-- 搜索按钮 -->
      <view class="search-toggle" @click="toggleSearch">
        <text class="search-toggle-icon">{{ showSearch ? '✕' : '🔍' }}</text>
        <text class="search-toggle-text">
          {{ showSearch ? '收起搜索' : '搜索司机' }}
        </text>
      </view>

      <!-- 搜索框（可展开） -->
      <view v-if="showSearch" class="search-bar">
        <view class="search-input-wrapper">
          <text class="search-icon">🔍</text>
          <input
            v-model="searchKeyword"
            class="search-input"
            type="text"
            placeholder="输入司机姓名、手机号（支持拼音首字母）"
          />
          <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
        </view>
      </view>

      <!-- 当前仓库信息（车队长只管辖一个仓库） -->
      <view v-if="currentWarehouse" class="warehouse-info">
        <view class="warehouse-header">
          <text class="warehouse-label">🏭 管辖仓库</text>
          <text class="warehouse-count">{{ filteredDrivers.length }} 名司机</text>
        </view>
        <view class="warehouse-card">
          <text class="warehouse-icon">🏭</text>
          <text class="warehouse-name">{{ currentWarehouse.name }}</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="filteredDrivers.length === 0" class="empty-container">
        <text class="empty-icon">👥</text>
        <text class="empty-text">暂无司机数据</text>
      </view>

      <!-- 司机列表 -->
      <view v-else class="driver-list">
        <view
          v-for="driver in filteredDrivers"
          :key="driver.id"
          class="driver-card"
        >
          <!-- 司机头部信息 -->
          <view class="driver-header">
            <view class="driver-avatar">
              <text class="avatar-text">{{ driver.name?.charAt(0) || '?' }}</text>
            </view>
            <view class="driver-info">
              <view class="driver-name-row">
                <text class="driver-name">{{ driver.name || '未设置姓名' }}</text>
                <!-- 实名认证标签 -->
                <view v-if="isDriverVerified(driver)" class="verified-tag">
                  <text class="verified-text">已实名</text>
                </view>
                <!-- 新司机标签 -->
                <view v-if="isNewDriver(driver)" class="new-driver-tag">
                  <text class="new-driver-text">新司机</text>
                </view>
                <!-- 司机类型标签 -->
                <view :class="['driver-type-tag', getDriverTypeClass(driver)]">
                  <text class="driver-type-text">{{ getDriverTypeText(driver) }}</text>
                </view>
              </view>
              <text class="driver-phone">{{ driver.phone || '未设置手机号' }}</text>
              <!-- 入职时间和在职天数 Requirements: 2.7 -->
              <view class="driver-tenure">
                <text class="tenure-text">入职：{{ formatHireDate(driver.created_at) }}</text>
                <text class="tenure-divider">|</text>
                <text class="tenure-text">在职：{{ getTenureDays(driver) }}天</text>
              </view>
            </view>
          </view>

          <!-- 考勤统计 -->
          <view class="attendance-stats">
            <view class="stat-item">
              <text class="stat-icon">✅</text>
              <view class="stat-content">
                <text class="stat-label">出勤天数</text>
                <text class="stat-value">{{ getDriverStats(driver.id).attendanceDays }}天</text>
              </view>
            </view>
            <view class="stat-item">
              <text class="stat-icon">⏰</text>
              <view class="stat-content">
                <text class="stat-label">迟到天数</text>
                <text class="stat-value late">{{ getDriverStats(driver.id).lateDays }}天</text>
              </view>
            </view>
            <view class="stat-item">
              <text class="stat-icon">🏖️</text>
              <view class="stat-content">
                <text class="stat-label">请假天数</text>
                <text class="stat-value leave">{{ getDriverStats(driver.id).leaveDays }}天</text>
              </view>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="action-buttons">
            <!-- 个人信息按钮：已实名可点击，未实名禁用 Requirements: 2.10, 2.11, 2.13 -->
            <view 
              v-if="isDriverVerified(driver)"
              class="action-btn profile-btn" 
              @click="handleViewProfile(driver.id)"
            >
              <text class="btn-icon">👤</text>
              <text class="btn-text">个人信息</text>
            </view>
            <view 
              v-else
              class="action-btn profile-btn disabled"
            >
              <text class="btn-icon">👤</text>
              <text class="btn-text">未实名</text>
            </view>
            <view class="action-btn vehicle-btn" @click="handleViewVehicles(driver.id)">
              <text class="btn-icon">🚗</text>
              <text class="btn-text">车辆管理</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 统计信息 -->
      <view v-if="!loading && drivers.length > 0" class="stats-footer">
        <text class="stats-text">
          共 {{ filteredDrivers.length }} 名司机
        </text>
      </view>
    </view>

    <!-- 计件统计标签页 Requirements: 1.3 -->
    <view v-if="activeTab === 'PIECE_WORK'" class="piece-work-tab">
      <!-- 搜索按钮 Requirements: 4.2, 4.3 -->
      <view class="search-toggle" @click="toggleSearch">
        <text class="search-toggle-icon">{{ showSearch ? '✕' : '🔍' }}</text>
        <text class="search-toggle-text">
          {{ showSearch ? '收起搜索' : '搜索司机' }}
        </text>
      </view>

      <!-- 搜索框（可展开）Requirements: 4.2, 4.3 -->
      <view v-if="showSearch" class="search-bar">
        <view class="search-input-wrapper">
          <text class="search-icon">🔍</text>
          <input
            v-model="searchKeyword"
            class="search-input"
            type="text"
            placeholder="输入司机姓名、手机号（支持拼音首字母）"
          />
          <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
        </view>
      </view>

      <!-- 当前仓库信息 Requirements: 4.1 -->
      <view v-if="currentWarehouse" class="warehouse-info">
        <view class="warehouse-header">
          <text class="warehouse-label">🏭 管辖仓库</text>
          <text class="warehouse-count">{{ filteredDrivers.length }} 名司机</text>
        </view>
        <view class="warehouse-card">
          <text class="warehouse-icon">🏭</text>
          <text class="warehouse-name">{{ currentWarehouse.name }}</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="filteredDrivers.length === 0" class="empty-container">
        <text class="empty-icon">👥</text>
        <text class="empty-text">暂无司机数据</text>
      </view>

      <!-- 司机列表 Requirements: 2.1, 2.2, 2.3, 2.4 -->
      <view v-else class="driver-list">
        <view
          v-for="driver in filteredDrivers"
          :key="driver.id"
          class="driver-card"
        >
          <!-- 司机头部信息 Requirements: 2.1, 2.2, 2.3, 2.4 -->
          <view class="driver-header">
            <view class="driver-avatar">
              <text class="avatar-text">{{ driver.name?.charAt(0) || '?' }}</text>
            </view>
            <view class="driver-info">
              <view class="driver-name-row">
                <text class="driver-name">{{ driver.name || '未设置姓名' }}</text>
                <!-- 实名认证标签 Requirements: 2.4 -->
                <view v-if="isDriverVerified(driver)" class="verified-tag">
                  <text class="verified-text">已实名</text>
                </view>
                <!-- 未实名标签 Requirements: 2.4 -->
                <view v-else class="unverified-tag">
                  <text class="unverified-text">未实名</text>
                </view>
                <!-- 新司机标签 -->
                <view v-if="isNewDriver(driver)" class="new-driver-tag">
                  <text class="new-driver-text">新司机</text>
                </view>
                <!-- 司机类型标签 -->
                <view :class="['driver-type-tag', getDriverTypeClass(driver)]">
                  <text class="driver-type-text">{{ getDriverTypeText(driver) }}</text>
                </view>
              </view>
              <text class="driver-phone">{{ driver.phone || '未设置手机号' }}</text>
              <!-- 入职时间和在职天数 Requirements: 2.3 -->
              <view class="driver-tenure">
                <text class="tenure-text">入职：{{ formatHireDate(driver.created_at) }}</text>
                <text class="tenure-divider">|</text>
                <text class="tenure-text">在职：{{ getTenureDays(driver) }}天</text>
              </view>
            </view>
          </view>

          <!-- 计件统计区域 Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 -->
          <view class="piece-work-stats">
            <view 
              v-for="stat in getDriverPieceStats(driver.id)" 
              :key="stat.warehouseId"
              class="piece-work-row"
            >
              <!-- 仓库名称标签 Requirements: 3.4 -->
              <view class="warehouse-tag">
                <text class="warehouse-tag-text">{{ stat.warehouseName }}</text>
              </view>
              <!-- 统计数据 Requirements: 3.5 -->
              <view class="piece-stats-items">
                <view class="piece-stat-item">
                  <text class="piece-stat-label">今日</text>
                  <text class="piece-stat-value">{{ stat.todayQuantity }}{{ stat.unit }}</text>
                </view>
                <view class="piece-stat-item">
                  <text class="piece-stat-label">本周</text>
                  <text class="piece-stat-value week">{{ stat.weekQuantity }}{{ stat.unit }}</text>
                </view>
                <view class="piece-stat-item">
                  <text class="piece-stat-label">本月</text>
                  <text class="piece-stat-value month">{{ stat.monthQuantity }}{{ stat.unit }}</text>
                </view>
              </view>
            </view>
            <!-- 无计件数据时显示默认行 -->
            <view v-if="getDriverPieceStats(driver.id).length === 0" class="piece-work-row empty-row">
              <view class="piece-stats-items">
                <view class="piece-stat-item">
                  <text class="piece-stat-label">今日</text>
                  <text class="piece-stat-value">0件</text>
                </view>
                <view class="piece-stat-item">
                  <text class="piece-stat-label">本周</text>
                  <text class="piece-stat-value week">0件</text>
                </view>
                <view class="piece-stat-item">
                  <text class="piece-stat-label">本月</text>
                  <text class="piece-stat-value month">0件</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 操作按钮 Requirements: 5.1, 5.2, 5.3, 5.4 -->
          <view class="action-buttons">
            <!-- 个人信息按钮：已实名可点击，未实名禁用 Requirements: 5.2, 5.3 -->
            <view 
              v-if="isDriverVerified(driver)"
              class="action-btn profile-btn" 
              @click="handleViewProfile(driver.id)"
            >
              <text class="btn-icon">👤</text>
              <text class="btn-text">个人信息</text>
            </view>
            <view 
              v-else
              class="action-btn profile-btn disabled"
            >
              <text class="btn-icon">👤</text>
              <text class="btn-text">未实名</text>
            </view>
            <!-- 车辆管理按钮 Requirements: 5.4 -->
            <view class="action-btn vehicle-btn" @click="handleViewVehicles(driver.id)">
              <text class="btn-icon">🚗</text>
              <text class="btn-text">车辆管理</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 统计页脚 Requirements: 6.1, 6.2 -->
      <view v-if="!loading && drivers.length > 0" class="stats-footer">
        <text class="stats-text">
          共 {{ filteredDrivers.length }} 名司机
        </text>
      </view>
    </view>

    <!-- 请假审批标签页 -->
    <view v-if="activeTab === 'APPROVAL'" class="approval-tab">
      <!-- 筛选标签 -->
      <view class="filter-tabs">
        <view
          v-for="tab in filterTabs"
          :key="tab.value"
          :class="['filter-tab', { active: activeFilter === tab.value }]"
          @click="handleFilterChange(tab.value)"
        >
          <text class="tab-text">{{ tab.label }}</text>
          <text v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loadingApplications" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="filteredApplications.length === 0" class="empty-container">
        <text class="empty-icon">📋</text>
        <text class="empty-text">{{ getEmptyText() }}</text>
      </view>

      <!-- 申请列表 -->
      <view v-else class="application-list">
        <view
          v-for="application in filteredApplications"
          :key="application.id"
          class="application-card"
          @click="handleCardClick(application)"
        >
          <!-- 申请人信息 -->
          <view class="applicant-info">
            <view class="applicant-avatar">
              <text class="avatar-text">{{ (application.user_name || '用户').charAt(0) }}</text>
            </view>
            <view class="applicant-detail">
              <view class="applicant-name-row">
                <text class="applicant-name">{{ application.user_name || '未知用户' }}</text>
                <view :class="['type-tag', application.leave_type]">
                  <text class="type-text">{{ getLeaveTypeName(application.leave_type) }}</text>
                </view>
              </view>
              <text class="apply-time">申请时间：{{ formatDateTime(application.created_at) }}</text>
            </view>
          </view>

          <!-- 请假信息 -->
          <view class="leave-info">
            <view class="date-range">
              <text class="date-label">请假时间</text>
              <text class="date-value">{{ formatDate(application.start_date) }} 至 {{ formatDate(application.end_date) }}</text>
            </view>
            <view v-if="application.reason" class="reason">
              <text class="reason-label">请假原因</text>
              <text class="reason-value">{{ application.reason }}</text>
            </view>
          </view>

          <!-- 状态和操作 -->
          <view class="card-footer">
            <view :class="['status-tag', application.status]">
              <text class="status-text">{{ getStatusName(application.status) }}</text>
            </view>
            <view v-if="application.status === 'pending'" class="quick-actions">
              <view class="action-btn reject" @click.stop="handleQuickReject(application)">
                <text class="btn-text">拒绝</text>
              </view>
              <view class="action-btn approve" @click.stop="handleQuickApprove(application)">
                <text class="btn-text">同意</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车队长端 - 考勤管理页面
 * 功能：整合考勤记录查看和请假审批功能
 * 
 * 与老板端的区别：
 * - 只显示车队长管辖仓库的司机（Requirements: 2.3）
 * - 不显示仓库切换器（车队长只管辖一个仓库）
 * 
 * @module pages/manager/attendance
 * @requirements 2.3 - 车队长用户只显示其管辖仓库的司机
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getUsers, 
  getWarehouses, 
  getAttendanceRecords, 
  getLeaveApplications, 
  approveLeaveApplication,
  getPieceWorkRecords
} from '@/api'
import type { User, Warehouse, Attendance, LeaveApplication, DriverWarehousePieceStats, PieceWorkRecord } from '@/api/types'
import { UserRole, LeaveStatus, LeaveType, WarehouseType } from '@/api/types'
import { matchWithPinyin } from '@/utils/pinyin'
import { formatDate, formatDateTime, formatHireDate } from '@/utils'
import { getTodayRange, getWeekRange, getMonthRange } from '@/utils/date'
import { sseService } from '@/utils/sse'
import { useUserStore } from '@/store/user'
import type { LeaveUpdateEvent, LeaveData } from '@/types/sse-events'

// ==================== 类型定义 ====================

/** 标签页类型 - 包含考勤记录、计件统计、请假审批 */
type TabType = 'ATTENDANCE' | 'PIECE_WORK' | 'APPROVAL'

/** 筛选类型 */
type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

/** 司机考勤统计 */
interface DriverAttendanceStats {
  /** 出勤天数 */
  attendanceDays: number
  /** 迟到天数 */
  lateDays: number
  /** 请假天数 */
  leaveDays: number
}

// ==================== Store ====================

/** 用户 Store - 用于获取当前车队长的仓库信息 */
const userStore = useUserStore()

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 请假申请加载状态 */
const loadingApplications = ref(false)

/** 司机列表 */
const drivers = ref<User[]>([])

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 考勤记录 */
const attendanceRecords = ref<Attendance[]>([])

/** 请假申请列表 */
const applications = ref<LeaveApplication[]>([])

/** 司机考勤统计映射 */
const driverStatsMap = ref<Map<number, DriverAttendanceStats>>(new Map())

/**
 * 司机计件统计映射
 * key: 司机ID
 * value: 该司机在各仓库的计件统计数组
 * Requirements: 3.2, 3.3
 */
const driverPieceStatsMap = ref<Map<number, DriverWarehousePieceStats[]>>(new Map())

/** 用户仓库ID映射 */
const userWarehouseIdsMap = ref<Map<number, number[]>>(new Map())

// ==================== 筛选状态 ====================

/** 当前标签页 */
const activeTab = ref<TabType>('ATTENDANCE')

/** 搜索关键词 */
const searchKeyword = ref('')

/** 是否显示搜索框 */
const showSearch = ref(false)

/** 请假审批筛选 */
const activeFilter = ref<FilterType>('pending')

// ==================== 计算属性 ====================

/**
 * 当前车队长管辖的仓库
 * Requirements: 2.3 - 车队长用户只显示其管辖仓库的司机
 */
const currentWarehouse = computed(() => {
  const warehouseId = userStore.user?.warehouse_id
  if (!warehouseId) return null
  return warehouses.value.find(w => w.id === warehouseId) || null
})

/**
 * 当前车队长管辖的仓库ID
 * Requirements: 2.3 - 车队长用户只显示其管辖仓库的司机
 */
const currentWarehouseId = computed(() => userStore.user?.warehouse_id || null)

/** 待审批数量 */
const pendingCount = computed(() => 
  applications.value.filter(a => a.status === LeaveStatus.PENDING).length
)

/** 已批准数量 */
const approvedCount = computed(() => 
  applications.value.filter(a => a.status === LeaveStatus.APPROVED).length
)

/** 已拒绝数量 */
const rejectedCount = computed(() => 
  applications.value.filter(a => a.status === LeaveStatus.REJECTED).length
)

/** 是否有待处理的申请（用于显示请假审批标签页） */
const hasPendingApplications = computed(() => pendingCount.value > 0)

/** 筛选标签配置 */
const filterTabs = computed(() => [
  { label: '待审批', value: 'pending' as const, count: pendingCount.value },
  { label: '已批准', value: 'approved' as const, count: approvedCount.value },
  { label: '已拒绝', value: 'rejected' as const, count: rejectedCount.value },
  { label: '全部', value: 'all' as const, count: applications.value.length },
])

/**
 * 筛选后的司机列表
 * 根据仓库、搜索关键词进行筛选
 * Requirements: 2.3 - 车队长用户只显示其管辖仓库的司机
 */
const filteredDrivers = computed(() => {
  let result = drivers.value

  // 1. 按车队长管辖的仓库筛选（核心区别：只显示管辖仓库的司机）
  // Requirements: 2.3 - 车队长用户只显示其管辖仓库的司机
  if (currentWarehouseId.value) {
    result = result.filter(u => {
      const userWarehouseIds = userWarehouseIdsMap.value.get(u.id) || []
      // 只显示分配到车队长管辖仓库的司机
      return userWarehouseIds.includes(currentWarehouseId.value!)
    })
  }

  // 2. 按关键词搜索（支持拼音首字母）
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim()
    result = result.filter(u => {
      const name = u.name || ''
      const phone = u.phone || ''
      // 姓名拼音匹配
      if (matchWithPinyin(name, keyword)) return true
      // 手机号匹配
      if (phone.includes(keyword)) return true
      return false
    })
  }

  return result
})

/** 筛选后的申请列表 */
const filteredApplications = computed(() => {
  // 先按车队长管辖仓库筛选申请
  let result = applications.value
  
  // 只显示管辖仓库司机的申请
  if (currentWarehouseId.value) {
    const managedDriverIds = new Set(
      drivers.value
        .filter(d => {
          const userWarehouseIds = userWarehouseIdsMap.value.get(d.id) || []
          return userWarehouseIds.includes(currentWarehouseId.value!)
        })
        .map(d => d.id)
    )
    result = result.filter(a => managedDriverIds.has(a.user_id))
  }
  
  // 再按状态筛选
  if (activeFilter.value === 'all') return result
  const statusMap: Record<string, LeaveStatus> = {
    pending: LeaveStatus.PENDING,
    approved: LeaveStatus.APPROVED,
    rejected: LeaveStatus.REJECTED,
  }
  return result.filter(a => a.status === statusMap[activeFilter.value])
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
  // 注册 SSE 请假更新事件回调
  registerSSECallbacks()
})

onUnmounted(() => {
  unregisterSSECallbacks()
})

onShow(() => {
  // 每次显示页面时刷新数据
  loadData()
})

// ==================== SSE 实时更新 ====================

/**
 * 注册 SSE 请假更新事件回调
 */
function registerSSECallbacks(): void {
  sseService.setCallbacks({
    onLeaveUpdate: handleLeaveUpdate,
  })
  console.log('[车队长考勤管理] 已注册 SSE 请假更新回调')
}

/**
 * 取消 SSE 回调注册
 */
function unregisterSSECallbacks(): void {
  sseService.setCallbacks({
    onLeaveUpdate: undefined,
  })
  console.log('[车队长考勤管理] 已取消 SSE 请假更新回调')
}

/**
 * 处理请假更新事件
 * @param event - 请假更新事件数据
 */
function handleLeaveUpdate(event: LeaveUpdateEvent): void {
  console.log('[车队长考勤管理] 收到请假更新事件:', event.action, event.leave.id)
  
  const { action, leave: leaveData } = event
  
  switch (action) {
    case 'create':
      handleLeaveCreate(leaveData)
      break
    case 'update':
      handleLeaveUpdateData(leaveData)
      break
    default:
      console.warn('[车队长考勤管理] 未知的事件动作类型:', action)
  }
}

/**
 * 处理请假创建事件
 * @param leaveData - 请假数据
 */
function handleLeaveCreate(leaveData: LeaveData): void {
  const newApplication: LeaveApplication = convertLeaveDataToApplication(leaveData)
  
  const existingIndex = applications.value.findIndex(a => a.id === leaveData.id)
  if (existingIndex >= 0) {
    applications.value[existingIndex] = newApplication
  } else {
    applications.value.unshift(newApplication)
    uni.showToast({
      title: '收到新的请假申请',
      icon: 'none',
      duration: 2000,
    })
  }
}

/**
 * 处理请假更新事件
 * @param leaveData - 请假数据
 */
function handleLeaveUpdateData(leaveData: LeaveData): void {
  const updatedApplication: LeaveApplication = convertLeaveDataToApplication(leaveData)
  
  const index = applications.value.findIndex(a => a.id === leaveData.id)
  if (index >= 0) {
    applications.value[index] = updatedApplication
  } else {
    applications.value.unshift(updatedApplication)
  }
}

/**
 * 将 SSE 事件的 LeaveData 转换为 LeaveApplication 类型
 * @param leaveData - SSE 事件中的请假数据
 * @returns LeaveApplication 类型的数据
 */
function convertLeaveDataToApplication(leaveData: LeaveData): LeaveApplication {
  return {
    id: leaveData.id,
    user_id: leaveData.user_id,
    leave_type: leaveData.leave_type as LeaveType,
    start_date: leaveData.start_date,
    end_date: leaveData.end_date,
    status: leaveData.status as LeaveStatus,
    reason: leaveData.reason,
    approver_id: leaveData.approver_id,
    approve_remark: leaveData.approve_remark,
    created_at: leaveData.created_at,
    updated_at: leaveData.updated_at,
  }
}

// ==================== 数据加载方法 ====================

/**
 * 加载所有数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  loadingApplications.value = true
  
  try {
    // 并行加载数据
    const [usersData, warehousesData, applicationsData] = await Promise.all([
      getUsers(),
      getWarehouses({ is_active: true }),
      getLeaveApplications(),
    ])

    // 只保留司机
    drivers.value = usersData.filter(u => u.role === UserRole.DRIVER)
    warehouses.value = warehousesData
    applications.value = applicationsData

    // 加载司机考勤统计
    await loadDriverStats()
    
    // 加载司机计件统计
    await loadDriverPieceStats()
    
    // 构建用户仓库映射
    buildUserWarehouseMap()
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    loadingApplications.value = false
  }
}

/**
 * 加载司机考勤统计
 */
async function loadDriverStats(): Promise<void> {
  const statsMap = new Map<number, DriverAttendanceStats>()
  
  // 获取当月的日期范围
  const now = new Date()
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  
  try {
    // 获取当月考勤记录
    const records = await getAttendanceRecords({
      start_date: startDate,
      end_date: endDate,
    })
    attendanceRecords.value = records
    
    // 统计每个司机的考勤数据
    for (const driver of drivers.value) {
      const driverRecords = records.filter(r => r.user_id === driver.id)
      
      // 计算出勤天数（有打卡记录的天数）
      const attendanceDays = driverRecords.filter(r => r.clock_in).length
      
      // 计算迟到天数（8:30 之后打卡算迟到）
      const lateDays = driverRecords.filter(r => {
        if (!r.clock_in) return false
        const clockInTime = new Date(r.clock_in)
        const hours = clockInTime.getHours()
        const minutes = clockInTime.getMinutes()
        return hours > 8 || (hours === 8 && minutes > 30)
      }).length
      
      // 计算请假天数
      const driverLeaves = applications.value.filter(
        a => a.user_id === driver.id && a.status === LeaveStatus.APPROVED
      )
      let leaveDays = 0
      for (const leave of driverLeaves) {
        const start = new Date(leave.start_date)
        const end = new Date(leave.end_date)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        leaveDays += days
      }
      
      statsMap.set(driver.id, {
        attendanceDays,
        lateDays,
        leaveDays,
      })
    }
  } catch (error) {
    console.error('加载考勤统计失败:', error)
  }
  
  driverStatsMap.value = statsMap
}

/**
 * 加载司机计件统计数据
 * 获取今日、本周、本月的计件记录，按司机和仓库聚合统计数据
 * 
 * Requirements: 3.1, 3.6
 */
async function loadDriverPieceStats(): Promise<void> {
  const statsMap = new Map<number, DriverWarehousePieceStats[]>()
  
  // 获取日期范围
  const todayRange = getTodayRange()
  const weekRange = getWeekRange()
  const monthRange = getMonthRange()
  
  try {
    // 并行获取今日、本周、本月的计件记录
    const [todayRecords, weekRecords, monthRecords] = await Promise.all([
      getPieceWorkRecords({
        start_date: todayRange.startDate,
        end_date: todayRange.endDate,
      }),
      getPieceWorkRecords({
        start_date: weekRange.startDate,
        end_date: weekRange.endDate,
      }),
      getPieceWorkRecords({
        start_date: monthRange.startDate,
        end_date: monthRange.endDate,
      }),
    ])
    
    // 创建仓库ID到仓库信息的映射
    const warehouseMap = new Map<number, Warehouse>()
    for (const warehouse of warehouses.value) {
      warehouseMap.set(warehouse.id, warehouse)
    }
    
    // 按司机和仓库聚合统计数据
    for (const driver of drivers.value) {
      // 获取该司机的所有计件记录
      const driverTodayRecords = todayRecords.filter(r => r.user_id === driver.id)
      const driverWeekRecords = weekRecords.filter(r => r.user_id === driver.id)
      const driverMonthRecords = monthRecords.filter(r => r.user_id === driver.id)
      
      // 收集该司机涉及的所有仓库ID
      const warehouseIds = new Set<number>()
      for (const record of [...driverTodayRecords, ...driverWeekRecords, ...driverMonthRecords]) {
        if (record.warehouse_id) {
          warehouseIds.add(record.warehouse_id)
        }
      }
      
      // 如果司机没有计件记录但有分配仓库，也添加该仓库
      if (warehouseIds.size === 0 && driver.warehouse_id) {
        warehouseIds.add(driver.warehouse_id)
      }
      
      // 为每个仓库计算统计数据
      const driverStats: DriverWarehousePieceStats[] = []
      for (const warehouseId of warehouseIds) {
        const warehouse = warehouseMap.get(warehouseId)
        if (!warehouse) continue
        
        // 计算今日数量
        const todayQuantity = driverTodayRecords
          .filter(r => r.warehouse_id === warehouseId)
          .reduce((sum, r) => sum + r.quantity, 0)
        
        // 计算本周数量
        const weekQuantity = driverWeekRecords
          .filter(r => r.warehouse_id === warehouseId)
          .reduce((sum, r) => sum + r.quantity, 0)
        
        // 计算本月数量
        const monthQuantity = driverMonthRecords
          .filter(r => r.warehouse_id === warehouseId)
          .reduce((sum, r) => sum + r.quantity, 0)
        
        driverStats.push({
          warehouseId,
          warehouseName: warehouse.name,
          warehouseType: warehouse.warehouse_type || WarehouseType.PIECE,
          unit: warehouse.preset_unit || '件',
          todayQuantity,
          weekQuantity,
          monthQuantity,
        })
      }
      
      // 如果司机没有任何仓库数据，添加一个默认的空统计
      if (driverStats.length === 0 && currentWarehouse.value) {
        driverStats.push({
          warehouseId: currentWarehouse.value.id,
          warehouseName: currentWarehouse.value.name,
          warehouseType: currentWarehouse.value.warehouse_type || WarehouseType.PIECE,
          unit: currentWarehouse.value.preset_unit || '件',
          todayQuantity: 0,
          weekQuantity: 0,
          monthQuantity: 0,
        })
      }
      
      statsMap.set(driver.id, driverStats)
    }
  } catch (error) {
    console.error('加载计件统计失败:', error)
  }
  
  driverPieceStatsMap.value = statsMap
}

/**
 * 构建用户仓库映射
 */
function buildUserWarehouseMap(): void {
  const warehouseIdsMap = new Map<number, number[]>()
  
  for (const user of drivers.value) {
    if (user.warehouse_id) {
      warehouseIdsMap.set(user.id, [user.warehouse_id])
    } else {
      warehouseIdsMap.set(user.id, [])
    }
  }
  
  userWarehouseIdsMap.value = warehouseIdsMap
}

// ==================== 筛选方法 ====================

/**
 * 切换标签页
 * @param tab - 标签页类型
 */
function handleTabChange(tab: TabType): void {
  activeTab.value = tab
}

/**
 * 切换搜索框显示
 */
function toggleSearch(): void {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchKeyword.value = ''
  }
}

/**
 * 清除搜索
 */
function clearSearch(): void {
  searchKeyword.value = ''
}

/**
 * 切换请假审批筛选
 * @param filter - 筛选类型
 */
function handleFilterChange(filter: FilterType): void {
  activeFilter.value = filter
}

// ==================== 司机信息方法 ====================

/**
 * 获取司机考勤统计
 * @param driverId - 司机ID
 * @returns 考勤统计
 */
function getDriverStats(driverId: number): DriverAttendanceStats {
  return driverStatsMap.value.get(driverId) || {
    attendanceDays: 0,
    lateDays: 0,
    leaveDays: 0,
  }
}

/**
 * 获取司机计件统计
 * 返回司机在各仓库的计件统计数组
 * 
 * @param driverId - 司机ID
 * @returns 司机在各仓库的计件统计数组
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
function getDriverPieceStats(driverId: number): DriverWarehousePieceStats[] {
  return driverPieceStatsMap.value.get(driverId) || []
}

/**
 * 判断司机是否已实名
 * @param driver - 司机信息
 * @returns 是否已实名
 */
function isDriverVerified(driver: User): boolean {
  return !!(driver.name && driver.phone)
}

/**
 * 判断是否为新司机（在职天数≤7天）
 * @param driver - 司机信息
 * @returns 是否为新司机
 */
function isNewDriver(driver: User): boolean {
  if (!driver.created_at) return false
  const startDate = new Date(driver.created_at)
  const today = new Date()
  const diffTime = today.getTime() - startDate.getTime()
  const workDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return workDays <= 7
}

/**
 * 获取司机在职天数
 * Requirements: 2.7 - 显示在职天数
 * @param driver - 司机信息
 * @returns 在职天数
 */
function getTenureDays(driver: User): number {
  if (!driver.created_at) return 0
  const startDate = new Date(driver.created_at)
  const today = new Date()
  const diffTime = today.getTime() - startDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * 获取司机类型文本
 * @param driver - 司机信息
 * @returns 司机类型文本
 */
function getDriverTypeText(driver: User): string {
  const isWithVehicle = (driver as any).driver_type === 'with_vehicle'
  return isWithVehicle ? '带车司机' : '纯司机'
}

/**
 * 获取司机类型样式类
 * @param driver - 司机信息
 * @returns 样式类名
 */
function getDriverTypeClass(driver: User): string {
  const isWithVehicle = (driver as any).driver_type === 'with_vehicle'
  return isWithVehicle ? 'with-vehicle' : 'pure'
}

// ==================== 操作方法 ====================

/**
 * 查看司机个人信息
 * @param driverId - 司机ID
 */
function handleViewProfile(driverId: number): void {
  uni.navigateTo({
    url: `/pages/manager/drivers/detail?id=${driverId}`,
  })
}

/**
 * 查看司机车辆管理
 * @param driverId - 司机ID
 */
function handleViewVehicles(driverId: number): void {
  uni.navigateTo({
    url: `/pages/driver/vehicle/list?driverId=${driverId}`,
  })
}

// ==================== 请假审批方法 ====================

/**
 * 获取空状态文本
 */
function getEmptyText(): string {
  const textMap: Record<string, string> = {
    pending: '暂无待审批的申请',
    approved: '暂无已批准的申请',
    rejected: '暂无已拒绝的申请',
    all: '暂无请假申请',
  }
  return textMap[activeFilter.value]
}

/**
 * 获取请假类型名称
 * @param type - 请假类型
 * @returns 类型名称
 */
function getLeaveTypeName(type: LeaveType): string {
  const typeMap: Record<LeaveType, string> = {
    [LeaveType.LEAVE]: '请假',
    [LeaveType.RESIGN]: '离职',
  }
  return typeMap[type] || '未知'
}

/**
 * 获取状态名称
 * @param status - 状态
 * @returns 状态名称
 */
function getStatusName(status: LeaveStatus): string {
  const statusMap: Record<LeaveStatus, string> = {
    [LeaveStatus.PENDING]: '待审批',
    [LeaveStatus.APPROVED]: '已批准',
    [LeaveStatus.REJECTED]: '已拒绝',
  }
  return statusMap[status] || '未知'
}

/**
 * 点击卡片跳转到详情页
 * @param application - 请假申请
 */
function handleCardClick(application: LeaveApplication): void {
  uni.navigateTo({
    url: `/pages/manager/approval/leave-detail?id=${application.id}`,
  })
}

/**
 * 快速批准
 * @param application - 请假申请
 */
function handleQuickApprove(application: LeaveApplication): void {
  uni.showModal({
    title: '确认批准',
    content: `确定批准 ${application.user_name || '该用户'} 的${getLeaveTypeName(application.leave_type)}申请吗？`,
    success: async (res) => {
      if (res.confirm) await doApprove(application.id, LeaveStatus.APPROVED)
    },
  })
}

/**
 * 快速拒绝
 * @param application - 请假申请
 */
function handleQuickReject(application: LeaveApplication): void {
  uni.showModal({
    title: '确认拒绝',
    content: `确定拒绝 ${application.user_name || '该用户'} 的${getLeaveTypeName(application.leave_type)}申请吗？`,
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) await doApprove(application.id, LeaveStatus.REJECTED)
    },
  })
}

/**
 * 执行审批操作
 * @param id - 申请ID
 * @param status - 审批状态
 */
async function doApprove(id: number, status: LeaveStatus): Promise<void> {
  try {
    uni.showLoading({ title: '处理中...' })
    await approveLeaveApplication(id, { status })
    uni.hideLoading()
    uni.showToast({
      title: status === LeaveStatus.APPROVED ? '已批准' : '已拒绝',
      icon: 'success',
    })
    await loadData()
  } catch (error) {
    console.error('审批失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>


<style lang="scss" scoped>
/**
 * 车队长端考勤管理页面样式
 * 复用老板端样式，调整仓库显示部分
 */

/* 页面容器 */
.attendance-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8fafc, #e2e8f0);
  padding: 24rpx;
  box-sizing: border-box;
}

/* 页面标题区 */
.page-header {
  background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
  border-radius: 16rpx;
  padding: 48rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(30, 58, 138, 0.3);
}

.header-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 12rpx;
}

.header-subtitle {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 标签页切换 */
.tab-switcher {
  display: flex;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 12rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
  border-radius: 12rpx;
  transition: all 0.3s;
  position: relative;
  
  &.active {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3);
    
    .tab-icon, .tab-label {
      color: #ffffff;
    }
  }
}

.tab-icon {
  font-size: 36rpx;
  margin-bottom: 8rpx;
  color: #6b7280;
}

.tab-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #6b7280;
}

.badge {
  position: absolute;
  top: 8rpx;
  right: 20rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: #ef4444;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #ffffff;
  padding: 0 8rpx;
}

/* 搜索按钮 */
.search-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  border: 2rpx solid #e5e7eb;
}

.search-toggle-icon {
  font-size: 28rpx;
  color: #3b82f6;
  margin-right: 12rpx;
}

.search-toggle-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #3b82f6;
}

/* 搜索栏 */
.search-bar {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 24rpx;
  height: 72rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}

.clear-icon {
  font-size: 28rpx;
  color: #999999;
  padding: 8rpx;
}

/* 仓库信息（车队长端特有样式） */
.warehouse-info {
  margin-bottom: 24rpx;
}

.warehouse-header {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.warehouse-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #1e3a8a;
}

.warehouse-count {
  font-size: 24rpx;
  color: #9ca3af;
  margin-left: auto;
}

.warehouse-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.warehouse-icon {
  font-size: 40rpx;
  margin-right: 12rpx;
}

.warehouse-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #1e3a8a;
}

/* 加载状态 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.empty-icon {
  font-size: 96rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #6b7280;
}

/* 司机列表 */
.driver-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 司机卡片 */
.driver-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  border: 2rpx solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 司机头部 */
.driver-header {
  display: flex;
  align-items: center;
  padding: 24rpx;
}

.driver-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.avatar-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.driver-info {
  flex: 1;
}

.driver-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.driver-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #1f2937;
}

/* 实名认证标签 */
.verified-tag {
  background-color: #dcfce7;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.verified-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #16a34a;
}

/* 新司机标签 */
.new-driver-tag {
  background-color: #fef3c7;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.new-driver-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #b45309;
}

/* 司机类型标签 */
.driver-type-tag {
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  
  &.with-vehicle {
    background-color: #ffedd5;
  }
  
  &.pure {
    background-color: #dbeafe;
  }
}

.driver-type-text {
  font-size: 22rpx;
  font-weight: 500;
  
  .with-vehicle & {
    color: #c2410c;
  }
  
  .pure & {
    color: #2563eb;
  }
}

.driver-phone {
  font-size: 26rpx;
  color: #6b7280;
}

/* 入职时间和在职天数 Requirements: 2.7 */
.driver-tenure {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.tenure-text {
  font-size: 24rpx;
  color: #9ca3af;
}

.tenure-divider {
  font-size: 24rpx;
  color: #d1d5db;
  margin: 0 12rpx;
}

/* 考勤统计 */
.attendance-stats {
  display: flex;
  padding: 20rpx 24rpx;
  background-color: #f9fafb;
  border-top: 1rpx solid #f3f4f6;
  border-bottom: 1rpx solid #f3f4f6;
}

.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 22rpx;
  color: #6b7280;
}

.stat-value {
  font-size: 26rpx;
  font-weight: bold;
  color: #16a34a;
  
  &.late {
    color: #f59e0b;
  }
  
  &.leave {
    color: #3b82f6;
  }
}

/* 操作按钮 */
.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  padding: 16rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  border-radius: 12rpx;
  border: 1rpx solid;
  
  &.profile-btn {
    background-color: #eff6ff;
    border-color: #bfdbfe;
    
    /* 禁用状态样式 Requirements: 2.11 */
    &.disabled {
      background-color: #f3f4f6;
      border-color: #e5e7eb;
      opacity: 0.6;
      cursor: not-allowed;
      
      .btn-text {
        color: #9ca3af;
      }
    }
  }
  
  &.vehicle-btn {
    background-color: #f0fdf4;
    border-color: #bbf7d0;
  }
}

.btn-icon {
  font-size: 24rpx;
  margin-right: 8rpx;
}

.btn-text {
  font-size: 24rpx;
  font-weight: 500;
  
  .profile-btn & {
    color: #2563eb;
  }
  
  .vehicle-btn & {
    color: #16a34a;
  }
}

/* 统计信息 */
.stats-footer {
  padding: 24rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  margin-top: 24rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.stats-text {
  font-size: 24rpx;
  color: #6b7280;
}

/* ==================== 计件统计标签页样式 ==================== */

/**
 * 计件统计标签页样式
 * Requirements: 3.4 - 支持多行仓库统计显示
 * 
 * 样式结构：
 * - .piece-work-tab: 标签页容器
 * - .piece-work-stats: 计件统计区域（替代考勤统计区域）
 * - .piece-work-row: 单行仓库统计（支持多行显示）
 * - .warehouse-tag: 仓库名称标签
 * - .piece-stats-items: 统计项容器
 * - .piece-stat-item: 单个统计项（今日/本周/本月）
 */
.piece-work-tab {
  background-color: transparent;
}

/**
 * 计件统计区域
 * 替代考勤统计区域，按仓库分组显示计件数据
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
.piece-work-stats {
  padding: 16rpx 24rpx;
  background-color: #f9fafb;
  border-top: 1rpx solid #f3f4f6;
  border-bottom: 1rpx solid #f3f4f6;
}

/**
 * 计件统计行 - 每个仓库一行
 * 支持单仓库和多仓库司机显示
 * Requirements: 3.2, 3.3
 */
.piece-work-row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  
  /* 多行时添加分隔线 */
  &:not(:last-child) {
    border-bottom: 1rpx dashed #e5e7eb;
    margin-bottom: 12rpx;
    padding-bottom: 12rpx;
  }
  
  /* 首行添加顶部间距（多行时） */
  &:first-child:not(:last-child) {
    padding-top: 4rpx;
  }
  
  /* 无数据时居中显示 */
  &.empty-row {
    justify-content: center;
    
    .piece-stats-items {
      flex: none;
    }
  }
}

/**
 * 仓库名称标签
 * 用于区分不同仓库的计件数据
 * Requirements: 3.4
 */
.warehouse-tag {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  margin-right: 16rpx;
  min-width: 120rpx;
  max-width: 180rpx;
  text-align: center;
  flex-shrink: 0;
  box-shadow: 0 2rpx 4rpx rgba(30, 64, 175, 0.1);
}

.warehouse-tag-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #1e40af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/**
 * 计件统计项容器
 * 水平排列今日/本周/本月统计
 */
.piece-stats-items {
  flex: 1;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

/**
 * 单个计件统计项
 * 垂直排列标签和数值
 */
.piece-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80rpx;
}

.piece-stat-label {
  font-size: 22rpx;
  color: #6b7280;
  margin-bottom: 4rpx;
}

/**
 * 计件统计数值
 * 不同时间段使用不同颜色区分
 * - 今日: 绿色 (#16a34a)
 * - 本周: 蓝色 (#2563eb)
 * - 本月: 紫色 (#7c3aed)
 */
.piece-stat-value {
  font-size: 26rpx;
  font-weight: bold;
  color: #16a34a;
  
  &.week {
    color: #2563eb;
  }
  
  &.month {
    color: #7c3aed;
  }
}

/**
 * 未实名标签
 * 显示在司机姓名旁边，提示司机未完成实名认证
 * Requirements: 2.4
 */
.unverified-tag {
  background-color: #fee2e2;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.unverified-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #dc2626;
}

/* ==================== 请假审批标签页样式 ==================== */

.approval-tab {
  background-color: transparent;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  background-color: #ffffff;
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.filter-tab {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  margin-right: 16rpx;
  border-radius: 32rpx;
  background-color: #f5f5f5;
  
  &.active {
    background-color: #e6f7ff;
    
    .tab-text {
      color: #1890ff;
    }
    
    .tab-count {
      background-color: #1890ff;
      color: #ffffff;
    }
  }
}

.tab-text {
  font-size: 26rpx;
  color: #666666;
}

.tab-count {
  font-size: 22rpx;
  color: #999999;
  background-color: #e0e0e0;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-left: 8rpx;
}

/* 申请列表 */
.application-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.application-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.applicant-info {
  display: flex;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.applicant-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.applicant-detail {
  flex: 1;
}

.applicant-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.applicant-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  margin-right: 12rpx;
}

.type-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  
  &.leave {
    background-color: #e6f7ff;
    
    .type-text {
      color: #1890ff;
    }
  }
  
  &.resign {
    background-color: #fff2e8;
    
    .type-text {
      color: #fa8c16;
    }
  }
}

.type-text {
  font-size: 22rpx;
}

.apply-time {
  font-size: 24rpx;
  color: #999999;
}

.leave-info {
  padding: 20rpx 0;
}

.date-range {
  margin-bottom: 12rpx;
}

.date-label {
  font-size: 24rpx;
  color: #999999;
  margin-right: 12rpx;
}

.date-value {
  font-size: 26rpx;
  color: #333333;
}

.reason {
  display: flex;
  flex-wrap: wrap;
}

.reason-label {
  font-size: 24rpx;
  color: #999999;
  margin-right: 12rpx;
}

.reason-value {
  font-size: 26rpx;
  color: #666666;
  flex: 1;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.status-tag {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  
  &.pending {
    background-color: #fff7e6;
    
    .status-text {
      color: #faad14;
    }
  }
  
  &.approved {
    background-color: #e6f7e6;
    
    .status-text {
      color: #52c41a;
    }
  }
  
  &.rejected {
    background-color: #fff1f0;
    
    .status-text {
      color: #ff4d4f;
    }
  }
}

.status-text {
  font-size: 24rpx;
}

.quick-actions {
  display: flex;
}

.quick-actions .action-btn {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;
  border: none;
  
  &.reject {
    background-color: #fff1f0;
    
    .btn-text {
      color: #ff4d4f;
    }
  }
  
  &.approve {
    background-color: #e6f7e6;
    
    .btn-text {
      color: #52c41a;
    }
  }
}
</style>
