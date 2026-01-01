<template>
  <!--
    老板端 - 考勤管理页面
    功能：整合考勤记录查看和请假审批功能
    
    功能特性：
    - 标签页切换（考勤记录/请假审批）
    - 司机列表按仓库分组显示
    - 考勤统计显示（出勤天数、迟到天数、请假天数）
    - 搜索功能（支持姓名、拼音首字母、手机号）
    - 请假审批快速操作
    - SSE 实时更新
    
    @module pages/boss/attendance
    @requirements 1.1-1.5, 2.1-2.12, 3.1-3.4, 4.1-4.6
  -->
  <view class="attendance-page">
    <!-- 数据驾驶舱 - 圆形指标风格 -->
    <view class="dashboard-panel">
      <!-- 标题行 -->
      <view class="dashboard-title-row">
        <text class="dashboard-title">数据概览</text>
        <text class="dashboard-date">{{ currentDateStr }}</text>
      </view>
      
      <!-- 圆形指标网格 -->
      <view class="circle-metrics">
        <!-- 第一行：3个指标 -->
        <view class="circle-row">
          <view 
            class="circle-metric" 
            :class="{ active: activeMetric === 'total' }"
            @click="handleMetricClick('total')"
          >
            <view class="circle-ring total">
              <view class="circle-inner">
                <text class="circle-value">{{ totalDrivers }}</text>
              </view>
            </view>
            <text class="circle-label">司机总数</text>
          </view>
          
          <view 
            class="circle-metric" 
            :class="{ active: activeMetric === 'attendance' }"
            @click="handleMetricClick('attendance')"
          >
            <view class="circle-ring attendance">
              <view class="circle-inner">
                <text class="circle-value">{{ todayAttendance }}</text>
              </view>
            </view>
            <text class="circle-label">今日出勤</text>
          </view>
          
          <view 
            class="circle-metric" 
            :class="{ active: activeMetric === 'recorded' }"
            @click="handleMetricClick('recorded')"
          >
            <view class="circle-ring recorded">
              <view class="circle-inner">
                <text class="circle-value">{{ todayRecordedCount }}</text>
              </view>
            </view>
            <text class="circle-label">已录入</text>
          </view>
        </view>
        
        <!-- 第二行：3个指标 -->
        <view class="circle-row">
          <view 
            class="circle-metric" 
            :class="{ active: activeMetric === 'unrecorded' }"
            @click="handleMetricClick('unrecorded')"
          >
            <view class="circle-ring unrecorded">
              <view class="circle-inner">
                <text class="circle-value">{{ todayUnrecordedCount }}</text>
              </view>
            </view>
            <text class="circle-label">未录入</text>
          </view>
          
          <view 
            class="circle-metric" 
            :class="{ active: activeMetric === 'week' }"
            @click="handleMetricClick('week')"
          >
            <view class="circle-ring week">
              <view class="circle-inner">
                <text class="circle-value">{{ weekPieceTotal }}</text>
              </view>
            </view>
            <text class="circle-label">本周录入</text>
          </view>
          
          <view 
            class="circle-metric" 
            :class="{ active: activeMetric === 'month' }"
            @click="handleMetricClick('month')"
          >
            <view class="circle-ring month">
              <view class="circle-inner">
                <text class="circle-value">{{ monthPieceTotal }}</text>
              </view>
            </view>
            <text class="circle-label">本月录入</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 标签页切换 Requirements: 1.1, 1.2, 1.3 -->
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

      <!-- 仓库切换器（多仓库时显示） -->
      <view v-if="showWarehouseSwitcher" class="warehouse-switcher">
        <view class="warehouse-header">
          <text class="warehouse-label">🏭 选择仓库</text>
          <text class="warehouse-indicator">({{ currentWarehouseIndex + 1 }}/{{ warehousesWithDataOrDrivers.length }})</text>
          <text class="warehouse-count">{{ filteredDrivers.length }} 名司机</text>
        </view>
        <swiper
          class="warehouse-swiper"
          :current="currentWarehouseIndex"
          indicator-dots
          indicator-color="rgba(0, 0, 0, 0.2)"
          indicator-active-color="#1890ff"
          @change="handleWarehouseChange"
        >
          <swiper-item v-for="warehouse in warehousesWithDataOrDrivers" :key="warehouse.id">
            <view class="warehouse-item">
              <text class="warehouse-icon">🏭</text>
              <text class="warehouse-name">{{ warehouse.name }}</text>
              <text class="warehouse-user-count">({{ getWarehouseDriverCount(warehouse.id) }}人)</text>
            </view>
          </swiper-item>
        </swiper>
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
      <!-- 搜索按钮 Requirements: 5.1, 5.2 -->
      <view class="search-toggle" @click="toggleSearch">
        <text class="search-toggle-icon">{{ showSearch ? '✕' : '🔍' }}</text>
        <text class="search-toggle-text">
          {{ showSearch ? '收起搜索' : '搜索司机' }}
        </text>
      </view>

      <!-- 搜索框（可展开）Requirements: 5.1, 5.2 -->
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

      <!-- 仓库切换器（多仓库时显示）Requirements: 4.1, 4.2, 4.3, 4.4 -->
      <view v-if="showWarehouseSwitcher" class="warehouse-switcher">
        <view class="warehouse-header">
          <text class="warehouse-label">🏭 选择仓库</text>
          <text class="warehouse-indicator">({{ currentWarehouseIndex + 1 }}/{{ warehousesWithDataOrDrivers.length }})</text>
          <text class="warehouse-count">{{ filteredDrivers.length }} 名司机</text>
        </view>
        <swiper
          class="warehouse-swiper"
          :current="currentWarehouseIndex"
          indicator-dots
          indicator-color="rgba(0, 0, 0, 0.2)"
          indicator-active-color="#1890ff"
          @change="handleWarehouseChange"
        >
          <swiper-item v-for="warehouse in warehousesWithDataOrDrivers" :key="warehouse.id">
            <view class="warehouse-item">
              <text class="warehouse-icon">🏭</text>
              <text class="warehouse-name">{{ warehouse.name }}</text>
              <text class="warehouse-user-count">({{ getWarehouseDriverCount(warehouse.id) }}人)</text>
            </view>
          </swiper-item>
        </swiper>
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
            <!-- 多仓库时显示仓库名 -->
            <template v-if="getDriverPieceStats(driver.id).length > 1">
              <view 
                v-for="stat in getDriverPieceStats(driver.id)" 
                :key="stat.warehouseId"
                class="piece-work-group"
              >
                <!-- 仓库名称在上方 -->
                <view class="warehouse-title">
                  <text class="warehouse-title-text">{{ stat.warehouseName }}</text>
                </view>
                <!-- 统计数据 -->
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
            </template>
            <!-- 单仓库时不显示仓库名 -->
            <template v-else-if="getDriverPieceStats(driver.id).length === 1">
              <view class="piece-stats-items">
                <view class="piece-stat-item">
                  <text class="piece-stat-label">今日</text>
                  <text class="piece-stat-value">{{ getDriverPieceStats(driver.id)[0].todayQuantity }}{{ getDriverPieceStats(driver.id)[0].unit }}</text>
                </view>
                <view class="piece-stat-item">
                  <text class="piece-stat-label">本周</text>
                  <text class="piece-stat-value week">{{ getDriverPieceStats(driver.id)[0].weekQuantity }}{{ getDriverPieceStats(driver.id)[0].unit }}</text>
                </view>
                <view class="piece-stat-item">
                  <text class="piece-stat-label">本月</text>
                  <text class="piece-stat-value month">{{ getDriverPieceStats(driver.id)[0].monthQuantity }}{{ getDriverPieceStats(driver.id)[0].unit }}</text>
                </view>
              </view>
            </template>
            <!-- 无计件数据时显示默认 -->
            <template v-else>
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
            </template>
          </view>

          <!-- 操作按钮 Requirements: 6.1, 6.2, 6.3, 6.4 -->
          <view class="action-buttons">
            <!-- 个人信息按钮：已实名可点击，未实名禁用 Requirements: 6.2, 6.3 -->
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
            <!-- 车辆管理按钮 Requirements: 6.4 -->
            <view class="action-btn vehicle-btn" @click="handleViewVehicles(driver.id)">
              <text class="btn-icon">🚗</text>
              <text class="btn-text">车辆管理</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 统计页脚 Requirements: 7.1, 7.2 -->
      <view v-if="!loading && drivers.length > 0" class="stats-footer">
        <text class="stats-text">
          共 {{ filteredDrivers.length }} 名司机
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 老板端 - 数据统计页面
 * 功能：考勤记录查看和计件统计
 * 
 * @module pages/boss/attendance
 * @requirements 1.1-1.5, 2.1-2.12, 3.1-3.4, 4.1-4.6
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getUsers, 
  getWarehouses, 
  getAttendanceRecords, 
  getLeaveApplications, 
  approveLeaveApplication,
  getPieceWorkRecords,
  getPieceWorkStats,
} from '@/api'
import type { User, Warehouse, Attendance, LeaveApplication, DriverWarehousePieceStats, PieceWorkRecord } from '@/api/types'
import { UserRole, LeaveStatus, LeaveType, WarehouseType } from '@/api/types'
import { matchWithPinyin } from '@/utils/pinyin'
import { formatDate, formatDateTime, formatHireDate } from '@/utils'
import { getTodayRange, getWeekRange, getMonthRange } from '@/utils/date'
import { sseService } from '@/utils/sse'
import type { LeaveUpdateEvent, LeaveData } from '@/types/sse-events'
import {
  filterWarehousesWithDataOrDrivers,
  shouldShowWarehouseSwitcher,
  createWarehouseDataMap,
  getWarehouseDriverCount as getWarehouseDriverCountUtil,
} from '@/utils/warehouse'

// ==================== 类型定义 ====================

/** 标签页类型 - 包含考勤记录、计件统计、请假审批 Requirements: 1.1, 1.2, 1.3 */
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

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 请假申请加载状态 */
const loadingApplications = ref(false)

/** 司机列表 */
const drivers = ref<User[]>([])

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 仓库数据映射（warehouseId -> hasData） */
const warehouseDataMap = ref<Map<number, boolean>>(new Map())

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
 * 
 * 复用 DriverWarehousePieceStats 和 DriverPieceStatsMap 类型
 * Requirements: 3.1
 */
const driverPieceStatsMap = ref<Map<number, DriverWarehousePieceStats[]>>(new Map())

/** 用户仓库ID映射 */
const userWarehouseIdsMap = ref<Map<number, number[]>>(new Map())

// ==================== 筛选状态 ====================

/** 当前标签页 */
const activeTab = ref<TabType>('ATTENDANCE')

/** 当前仓库索引 */
const currentWarehouseIndex = ref(0)

/** 搜索关键词 */
const searchKeyword = ref('')

/** 是否显示搜索框 */
const showSearch = ref(false)

/** 请假审批筛选 */
const activeFilter = ref<FilterType>('pending')

// ==================== 计算属性 ====================

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

// ==================== 数据驾驶舱计算属性 ====================

/** 当前选中的指标 */
const activeMetric = ref<string>('')

/** 当前日期字符串 */
const currentDateStr = computed(() => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${month}月${day}日 周${weekDays[now.getDay()]}`
})

/** 司机总数 */
const totalDrivers = computed(() => drivers.value.length)

/** 今日出勤人数 */
const todayAttendance = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const todayRecords = attendanceRecords.value.filter(r => 
    r.date === today && r.clock_in
  )
  return new Set(todayRecords.map(r => r.user_id)).size
})

/** 出勤率 */
const attendanceRate = computed(() => {
  if (totalDrivers.value === 0) return 0
  return Math.round((todayAttendance.value / totalDrivers.value) * 100)
})

/** 今日已录入计件的司机数 */
const todayRecordedCount = computed(() => {
  let count = 0
  driverPieceStatsMap.value.forEach(stats => {
    const hasTodayRecord = stats.some(stat => stat.todayQuantity > 0)
    if (hasTodayRecord) count++
  })
  return count
})

/** 今日未录入计件的司机数 */
const todayUnrecordedCount = computed(() => {
  return totalDrivers.value - todayRecordedCount.value
})

/** 已录入率 */
const recordedRate = computed(() => {
  if (totalDrivers.value === 0) return 0
  return Math.round((todayRecordedCount.value / totalDrivers.value) * 100)
})

/** 未录入率 */
const unrecordedRate = computed(() => {
  if (totalDrivers.value === 0) return 0
  return Math.round((todayUnrecordedCount.value / totalDrivers.value) * 100)
})

/** 本周计件总数 */
const weekPieceTotal = computed(() => {
  let total = 0
  driverPieceStatsMap.value.forEach(stats => {
    stats.forEach(stat => {
      total += stat.weekQuantity
    })
  })
  return total
})

/** 本月计件总数 */
const monthPieceTotal = computed(() => {
  let total = 0
  driverPieceStatsMap.value.forEach(stats => {
    stats.forEach(stat => {
      total += stat.monthQuantity
    })
  })
  return total
})

/** 今日计件总数 */
const todayPieceTotal = computed(() => {
  let total = 0
  driverPieceStatsMap.value.forEach(stats => {
    stats.forEach(stat => {
      total += stat.todayQuantity
    })
  })
  return total
})

/**
 * 处理指标点击
 * @param metric - 指标类型
 */
function handleMetricClick(metric: string): void {
  activeMetric.value = activeMetric.value === metric ? '' : metric
  
  // 根据点击的指标执行不同操作
  switch (metric) {
    case 'total':
      // 显示全部司机
      uni.showToast({ title: `共 ${totalDrivers.value} 名司机`, icon: 'none' })
      break
    case 'attendance':
      // 切换到考勤记录
      activeTab.value = 'ATTENDANCE'
      uni.showToast({ title: `今日 ${todayAttendance.value} 人出勤`, icon: 'none' })
      break
    case 'recorded':
      // 切换到计件统计，显示已录入
      activeTab.value = 'PIECE_WORK'
      uni.showToast({ title: `${todayRecordedCount.value} 人已录入`, icon: 'none' })
      break
    case 'unrecorded':
      // 切换到计件统计，显示未录入
      activeTab.value = 'PIECE_WORK'
      uni.showToast({ title: `${todayUnrecordedCount.value} 人未录入`, icon: 'none' })
      break
    case 'week':
      activeTab.value = 'PIECE_WORK'
      uni.showToast({ title: `本周共录入 ${weekPieceTotal.value} 件`, icon: 'none' })
      break
    case 'month':
      activeTab.value = 'PIECE_WORK'
      uni.showToast({ title: `本月共录入 ${monthPieceTotal.value} 件`, icon: 'none' })
      break
  }
}

/** 筛选标签配置 */
const filterTabs = computed(() => [
  { label: '待审批', value: 'pending' as const, count: pendingCount.value },
  { label: '已批准', value: 'approved' as const, count: approvedCount.value },
  { label: '已拒绝', value: 'rejected' as const, count: rejectedCount.value },
  { label: '全部', value: 'all' as const, count: applications.value.length },
])

/**
 * 有数据或有司机的仓库列表
 * 使用统一的工具函数过滤
 */
const warehousesWithDataOrDrivers = computed(() => {
  return filterWarehousesWithDataOrDrivers({
    warehouses: warehouses.value,
    warehouseDataMap: warehouseDataMap.value,
    userWarehouseIdsMap: userWarehouseIdsMap.value,
    users: drivers.value,
    roleFilter: UserRole.DRIVER,
  })
})

/**
 * 是否显示仓库切换器
 * 使用统一的工具函数判断
 */
const showWarehouseSwitcher = computed(() => {
  return shouldShowWarehouseSwitcher(warehousesWithDataOrDrivers.value)
})

/**
 * 筛选后的司机列表
 * 根据仓库、搜索关键词进行筛选
 * Requirements: 2.3, 2.4, 3.2, 3.3
 */
const filteredDrivers = computed(() => {
  let result = drivers.value

  // 1. 按仓库筛选（显示切换器时）
  if (showWarehouseSwitcher.value && warehousesWithDataOrDrivers.value[currentWarehouseIndex.value]) {
    const currentWarehouseId = warehousesWithDataOrDrivers.value[currentWarehouseIndex.value].id
    result = result.filter(u => {
      const userWarehouseIds = userWarehouseIdsMap.value.get(u.id) || []
      // 包含分配到该仓库的用户，以及未分配任何仓库的用户（新用户）
      return userWarehouseIds.includes(currentWarehouseId) || userWarehouseIds.length === 0
    })
  }

  // 2. 按关键词搜索（支持拼音首字母）
  // Requirements: 3.2, 3.3
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
  if (activeFilter.value === 'all') return applications.value
  const statusMap: Record<string, LeaveStatus> = {
    pending: LeaveStatus.PENDING,
    approved: LeaveStatus.APPROVED,
    rejected: LeaveStatus.REJECTED,
  }
  return applications.value.filter(a => a.status === statusMap[activeFilter.value])
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
  // 注册 SSE 请假更新事件回调
  // Requirements: 4.6 - 通过 SSE 实时更新列表
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
 * Requirements: 4.6 - 通过 SSE 实时更新列表
 */
function registerSSECallbacks(): void {
  sseService.setCallbacks({
    onLeaveUpdate: handleLeaveUpdate,
  })
  console.log('[考勤管理] 已注册 SSE 请假更新回调')
}

/**
 * 取消 SSE 回调注册
 */
function unregisterSSECallbacks(): void {
  sseService.setCallbacks({
    onLeaveUpdate: undefined,
  })
  console.log('[考勤管理] 已取消 SSE 请假更新回调')
}

/**
 * 处理请假更新事件
 * Requirements: 4.6 - 新申请到达时自动添加到列表
 * @param event - 请假更新事件数据
 */
function handleLeaveUpdate(event: LeaveUpdateEvent): void {
  console.log('[考勤管理] 收到请假更新事件:', event.action, event.leave.id)
  
  const { action, leave: leaveData } = event
  
  switch (action) {
    case 'create':
      handleLeaveCreate(leaveData)
      break
    case 'update':
      handleLeaveUpdateData(leaveData)
      break
    default:
      console.warn('[考勤管理] 未知的事件动作类型:', action)
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
 * Requirements: 2.6 - 显示考勤统计
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
      
      // 计算迟到天数（这里简化处理，实际需要根据考勤规则判断）
      // 假设 8:30 之后打卡算迟到
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
 * 复用 getTodayRange(), getWeekRange(), getMonthRange() 函数
 * 获取仓库信息以获取单位
 * 
 * Requirements: 3.1, 3.5, 3.6
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
 * Requirements: 1.4 - 切换显示对应的内容区域
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
 * 处理仓库切换
 * @param e - 事件对象
 */
function handleWarehouseChange(e: { detail: { current: number } }): void {
  currentWarehouseIndex.value = e.detail.current
}

/**
 * 获取仓库的司机数量
 * @param warehouseId - 仓库ID
 * @returns 司机数量
 */
function getWarehouseDriverCount(warehouseId: number): number {
  return drivers.value.filter(u => {
    const userWarehouseIds = userWarehouseIdsMap.value.get(u.id) || []
    return userWarehouseIds.includes(warehouseId)
  }).length
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
 * Requirements: 2.6 - 显示考勤统计
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
  return driver.is_verified === true
}

/**
 * 判断是否为新司机（在职天数≤7天）
 * Requirements: 2.8 - 显示新司机标签
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
 * Requirements: 2.11 - 跳转到司机详情页面
 * @param driverId - 司机ID
 */
function handleViewProfile(driverId: number): void {
  uni.navigateTo({
    url: `/pages/manager/drivers/detail?id=${driverId}`,
  })
}

/**
 * 查看司机车辆管理
 * Requirements: 2.12 - 跳转到车辆管理页面
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
 * Requirements: 3.4 - 显示暂无匹配的司机提示
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
 * Requirements: 4.5 - 跳转到申请详情页面
 * @param application - 请假申请
 */
function handleCardClick(application: LeaveApplication): void {
  uni.navigateTo({
    url: `/pages/boss/approval/leave-detail?id=${application.id}`,
  })
}

/**
 * 快速批准
 * Requirements: 4.4 - 显示快速审批按钮
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
 * Requirements: 4.4 - 显示快速审批按钮
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
 * 老板端考勤管理页面样式
 * Requirements: 1.1-1.5, 2.1-2.12
 */

/* 页面容器 */
.attendance-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8fafc, #e2e8f0);
  padding: 24rpx;
  box-sizing: border-box;
}

/* 数据驾驶舱头部 */
/* ==================== 圆形指标数据驾驶舱 ==================== */

.dashboard-panel {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1d4ed8 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(30, 58, 138, 0.3);
}

.dashboard-title-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24rpx;
}

.dashboard-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  letter-spacing: 8rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
}

.dashboard-date {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
}

/* 圆形指标网格 */
.circle-metrics {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.circle-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

/* 单个圆形指标 */
.circle-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.circle-metric:active {
  transform: scale(0.95);
}

.circle-metric.active .circle-ring {
  transform: scale(1.05);
}

/* 圆环容器 */
.circle-ring {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
}

/* 不同类型的圆环颜色 */
.circle-ring.total {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow: 0 4rpx 16rpx rgba(59, 130, 246, 0.4);
}

.circle-ring.attendance {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4rpx 16rpx rgba(16, 185, 129, 0.4);
}

.circle-ring.recorded {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  box-shadow: 0 4rpx 16rpx rgba(139, 92, 246, 0.4);
}

.circle-ring.unrecorded {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4rpx 16rpx rgba(245, 158, 11, 0.4);
}

.circle-ring.week {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  box-shadow: 0 4rpx 16rpx rgba(6, 182, 212, 0.4);
}

.circle-ring.month {
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  box-shadow: 0 4rpx 16rpx rgba(236, 72, 153, 0.4);
}

/* 选中状态增强 */
.circle-metric.active .circle-ring.total {
  box-shadow: 0 6rpx 24rpx rgba(59, 130, 246, 0.6);
}

.circle-metric.active .circle-ring.attendance {
  box-shadow: 0 6rpx 24rpx rgba(16, 185, 129, 0.6);
}

.circle-metric.active .circle-ring.recorded {
  box-shadow: 0 6rpx 24rpx rgba(139, 92, 246, 0.6);
}

.circle-metric.active .circle-ring.unrecorded {
  box-shadow: 0 6rpx 24rpx rgba(245, 158, 11, 0.6);
}

.circle-metric.active .circle-ring.week {
  box-shadow: 0 6rpx 24rpx rgba(6, 182, 212, 0.6);
}

.circle-metric.active .circle-ring.month {
  box-shadow: 0 6rpx 24rpx rgba(236, 72, 153, 0.6);
}

/* 内圆 */
.circle-inner {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #1f2937;
}

.circle-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 10rpx;
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

/* 仓库切换器 */
.warehouse-switcher {
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

.warehouse-indicator {
  font-size: 24rpx;
  color: #9ca3af;
  margin-left: 12rpx;
}

.warehouse-count {
  font-size: 24rpx;
  color: #9ca3af;
  margin-left: auto;
}

.warehouse-swiper {
  height: 120rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.warehouse-item {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  padding: 0 24rpx;
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

.warehouse-user-count {
  font-size: 24rpx;
  color: #6b7280;
  margin-left: 12rpx;
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
/* 考勤统计 - 独立卡片布局 */
.attendance-stats {
  display: flex;
  padding: 16rpx 20rpx;
  gap: 16rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16rpx 12rpx;
  background-color: #f8fafc;
  border-radius: 12rpx;
  border: 1rpx solid #e2e8f0;
}

.stat-icon {
  font-size: 28rpx;
  margin-bottom: 6rpx;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 22rpx;
  color: #64748b;
  margin-bottom: 4rpx;
}

.stat-value {
  font-size: 30rpx;
  font-weight: 600;
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
 * 计件统计区域 - 独立卡片布局
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
.piece-work-stats {
  padding: 16rpx 20rpx;
}

/**
 * 多仓库时的分组容器
 */
.piece-work-group {
  margin-bottom: 16rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

/**
 * 仓库名称标题（多仓库时显示在上方）
 */
.warehouse-title {
  margin-bottom: 12rpx;
  padding-left: 4rpx;
}

.warehouse-title-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #1e40af;
}

/**
 * 计件统计项容器 - 独立卡片布局
 */
.piece-stats-items {
  flex: 1;
  display: flex;
  gap: 12rpx;
}

/**
 * 单个计件统计项 - 独立卡片
 */
.piece-stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 8rpx;
  background-color: #f8fafc;
  border-radius: 10rpx;
  border: 1rpx solid #e2e8f0;
}

.piece-stat-label {
  font-size: 22rpx;
  color: #64748b;
  margin-bottom: 4rpx;
}

/**
 * 计件统计数值
 */
.piece-stat-value {
  font-size: 28rpx;
  font-weight: 600;
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
