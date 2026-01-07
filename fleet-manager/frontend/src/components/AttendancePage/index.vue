<template>
  <!--
    考勤管理公共组件
    功能：整合考勤记录查看和计件统计功能
    
    功能特性：
    - 标签页切换（考勤记录/计件统计）
    - 司机列表按仓库分组显示
    - 考勤统计显示（出勤天数、迟到天数、请假天数）
    - 搜索功能（支持姓名、拼音首字母、手机号）
    - SSE 实时更新
    - Boss: 显示所有仓库，支持仓库切换
    - Manager: 显示管辖的仓库（支持多仓库），支持仓库切换
    
    @module components/AttendancePage
    @props role - 用户角色：boss 显示所有仓库，manager 显示管辖仓库
    @requirements 1.1, 1.2, 1.3, 1.4
  -->
  <view class="attendance-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="handleBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="nav-title">
        <text class="title-text">考勤管理</text>
      </view>
      <view class="nav-right" />
    </view>

    <!-- 数据驾驶舱 - 圆形指标风格 -->
    <view class="dashboard-panel">
      <view class="dashboard-title-row">
        <text class="dashboard-title">数据概览</text>
        <text class="dashboard-date">{{ currentDateStr }}</text>
      </view>
      
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

    <!-- 标签页切换 -->
    <view class="tab-switcher">
      <view
        :class="['tab-item', { active: activeTab === 'ATTENDANCE' }]"
        @click="handleTabChange('ATTENDANCE')"
      >
        <text class="tab-icon">📋</text>
        <text class="tab-label">考勤记录</text>
      </view>
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

      <!-- 仓库切换器（多仓库时显示）- Boss 和 Manager 统一使用 -->
      <view v-if="showWarehouseSwitcher" class="warehouse-switcher">
        <view class="warehouse-header">
          <text class="warehouse-label">🏭 {{ role === 'boss' ? '选择仓库' : '管辖仓库' }}</text>
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

      <!-- 单仓库时显示仓库信息（不显示切换器） -->
      <view v-else-if="warehousesWithDataOrDrivers.length === 1" class="warehouse-info">
        <view class="warehouse-header">
          <text class="warehouse-label">🏭 {{ role === 'boss' ? '当前仓库' : '管辖仓库' }}</text>
          <text class="warehouse-count">{{ filteredDrivers.length }} 名司机</text>
        </view>
        <view class="warehouse-card">
          <text class="warehouse-icon">🏭</text>
          <text class="warehouse-name">{{ warehousesWithDataOrDrivers[0].name }}</text>
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
                <view v-if="isDriverVerified(driver)" class="verified-tag">
                  <text class="verified-text">已实名</text>
                </view>
                <view v-if="isNewDriver(driver)" class="new-driver-tag">
                  <text class="new-driver-text">新司机</text>
                </view>
                <view :class="['driver-type-tag', getDriverTypeClass(driver)]">
                  <text class="driver-type-text">{{ getDriverTypeText(driver) }}</text>
                </view>
              </view>
              <text class="driver-phone">{{ driver.phone || '未设置手机号' }}</text>
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

    <!-- 计件统计标签页 -->
    <view v-if="activeTab === 'PIECE_WORK'" class="piece-work-tab">
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
          <text class="warehouse-label">🏭 {{ role === 'boss' ? '选择仓库' : '管辖仓库' }}</text>
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

      <!-- 单仓库时显示仓库信息 -->
      <view v-else-if="warehousesWithDataOrDrivers.length === 1" class="warehouse-info">
        <view class="warehouse-header">
          <text class="warehouse-label">🏭 {{ role === 'boss' ? '当前仓库' : '管辖仓库' }}</text>
          <text class="warehouse-count">{{ filteredDrivers.length }} 名司机</text>
        </view>
        <view class="warehouse-card">
          <text class="warehouse-icon">🏭</text>
          <text class="warehouse-name">{{ warehousesWithDataOrDrivers[0].name }}</text>
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
                <view v-if="isDriverVerified(driver)" class="verified-tag">
                  <text class="verified-text">已实名</text>
                </view>
                <view v-else class="unverified-tag">
                  <text class="unverified-text">未实名</text>
                </view>
                <view v-if="isNewDriver(driver)" class="new-driver-tag">
                  <text class="new-driver-text">新司机</text>
                </view>
                <view :class="['driver-type-tag', getDriverTypeClass(driver)]">
                  <text class="driver-type-text">{{ getDriverTypeText(driver) }}</text>
                </view>
              </view>
              <text class="driver-phone">{{ driver.phone || '未设置手机号' }}</text>
              <view class="driver-tenure">
                <text class="tenure-text">入职：{{ formatHireDate(driver.created_at) }}</text>
                <text class="tenure-divider">|</text>
                <text class="tenure-text">在职：{{ getTenureDays(driver) }}天</text>
              </view>
            </view>
          </view>

          <!-- 计件统计区域 -->
          <view class="piece-work-stats">
            <!-- 多仓库时显示仓库名 -->
            <template v-if="getDriverPieceStats(driver.id).length > 1">
              <view 
                v-for="stat in getDriverPieceStats(driver.id)" 
                :key="stat.warehouseId"
                class="piece-work-group"
              >
                <view class="warehouse-title">
                  <text class="warehouse-title-text">{{ stat.warehouseName }}</text>
                </view>
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

          <!-- 操作按钮 -->
          <view class="action-buttons">
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

      <!-- 统计页脚 -->
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
 * 考勤管理公共组件
 * 
 * 角色差异：
 * - Boss: 获取所有仓库数据，显示仓库切换器
 * - Manager: 获取用户管辖的仓库数据（支持多仓库），显示仓库切换器
 * 
 * @module components/AttendancePage
 * @requirements 1.1, 1.2, 1.3, 1.4
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getUsers, 
  getWarehouses, 
  getAttendanceRecords, 
  getLeaveApplications, 
  getPieceWorkRecords,
  getUserWarehouses,
} from '@/api'
import type { User, Warehouse, Attendance, LeaveApplication, DriverWarehousePieceStats } from '@/api/types'
import { UserRole, LeaveStatus, WarehouseType } from '@/api/types'
import { matchWithPinyin } from '@/utils/pinyin'
import { formatHireDate } from '@/utils'
import { getTodayRange, getWeekRange, getMonthRange, getLocalDateString } from '@/utils/date'
import { sseService } from '@/utils/sse'
import { useUserStore } from '@/store/user'
import type { AssignmentUpdateEvent } from '@/types/sse-events'
import {
  filterWarehousesWithDataOrDrivers,
  shouldShowWarehouseSwitcher,
} from '@/utils/warehouse'

// ==================== Props ====================

interface Props {
  /** 用户角色：boss 显示所有仓库，manager 显示管辖仓库 */
  role: 'boss' | 'manager'
}

const props = defineProps<Props>()

// ==================== 类型定义 ====================

type TabType = 'ATTENDANCE' | 'PIECE_WORK'

interface DriverAttendanceStats {
  attendanceDays: number
  lateDays: number
  leaveDays: number
}

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 状态 ====================

const loading = ref(false)
const drivers = ref<User[]>([])
const warehouses = ref<Warehouse[]>([])
const warehouseDataMap = ref<Map<number, boolean>>(new Map())
const attendanceRecords = ref<Attendance[]>([])
const applications = ref<LeaveApplication[]>([])
const driverStatsMap = ref<Map<number, DriverAttendanceStats>>(new Map())
const driverPieceStatsMap = ref<Map<number, DriverWarehousePieceStats[]>>(new Map())
const userWarehouseIdsMap = ref<Map<number, number[]>>(new Map())

// ==================== 筛选状态 ====================

const activeTab = ref<TabType>('ATTENDANCE')
const currentWarehouseIndex = ref(0)
const searchKeyword = ref('')
const showSearch = ref(false)
const activeMetric = ref<string>('')

// ==================== 数据驾驶舱计算属性 ====================

const currentDateStr = computed(() => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${month}月${day}日 周${weekDays[now.getDay()]}`
})

const totalDrivers = computed(() => filteredDrivers.value.length)

const todayAttendance = computed(() => {
  const today = getLocalDateString()
  const driverIds = new Set(filteredDrivers.value.map(d => d.id))
  const todayRecords = attendanceRecords.value.filter(r => 
    r.work_date === today && r.clock_in && driverIds.has(r.user_id)
  )
  return new Set(todayRecords.map(r => r.user_id)).size
})

const todayRecordedCount = computed(() => {
  let count = 0
  const driverIds = new Set(filteredDrivers.value.map(d => d.id))
  driverPieceStatsMap.value.forEach((stats, driverId) => {
    if (!driverIds.has(driverId)) return
    const hasTodayRecord = stats.some(stat => stat.todayQuantity > 0)
    if (hasTodayRecord) count++
  })
  return count
})

const todayUnrecordedCount = computed(() => totalDrivers.value - todayRecordedCount.value)

const weekPieceTotal = computed(() => {
  let total = 0
  const driverIds = new Set(filteredDrivers.value.map(d => d.id))
  driverPieceStatsMap.value.forEach((stats, driverId) => {
    if (!driverIds.has(driverId)) return
    stats.forEach(stat => { total += stat.weekQuantity })
  })
  return total
})

const monthPieceTotal = computed(() => {
  let total = 0
  const driverIds = new Set(filteredDrivers.value.map(d => d.id))
  driverPieceStatsMap.value.forEach((stats, driverId) => {
    if (!driverIds.has(driverId)) return
    stats.forEach(stat => { total += stat.monthQuantity })
  })
  return total
})

function handleMetricClick(metric: string): void {
  activeMetric.value = activeMetric.value === metric ? '' : metric
  
  switch (metric) {
    case 'total':
      uni.showToast({ title: `共 ${totalDrivers.value} 名司机`, icon: 'none' })
      break
    case 'attendance':
      activeTab.value = 'ATTENDANCE'
      uni.showToast({ title: `今日 ${todayAttendance.value} 人出勤`, icon: 'none' })
      break
    case 'recorded':
      activeTab.value = 'PIECE_WORK'
      uni.showToast({ title: `${todayRecordedCount.value} 人已录入`, icon: 'none' })
      break
    case 'unrecorded':
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

// ==================== 计算属性 ====================

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
 * 多仓库时显示切换器
 */
const showWarehouseSwitcher = computed(() => {
  return shouldShowWarehouseSwitcher(warehousesWithDataOrDrivers.value)
})

/**
 * 筛选后的司机列表
 * 根据仓库、搜索关键词进行筛选
 */
const filteredDrivers = computed(() => {
  let result = drivers.value

  // 1. 按仓库筛选（显示切换器时或单仓库时）
  if (warehousesWithDataOrDrivers.value.length > 0) {
    const currentWarehouse = warehousesWithDataOrDrivers.value[currentWarehouseIndex.value]
    if (currentWarehouse) {
      const currentWarehouseId = currentWarehouse.id
      result = result.filter(u => {
        const userWarehouseIds = userWarehouseIdsMap.value.get(u.id) || []
        // 包含分配到该仓库的用户，以及未分配任何仓库的用户（新用户）
        return userWarehouseIds.includes(currentWarehouseId) || userWarehouseIds.length === 0
      })
    }
  }

  // 2. 按关键词搜索（支持拼音首字母）
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim()
    result = result.filter(u => {
      const name = u.name || ''
      const phone = u.phone || ''
      if (matchWithPinyin(name, keyword)) return true
      if (phone.includes(keyword)) return true
      return false
    })
  }

  return result
})

// ==================== 导航方法 ====================

/**
 * 返回上一页
 */
function handleBack(): void {
  uni.navigateBack({
    fail: () => {
      // 如果没有上一页，跳转到首页
      uni.switchTab({ url: '/pages/index/index' })
    }
  })
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
  registerSSECallbacks()
})

onUnmounted(() => {
  unregisterSSECallbacks()
})

onShow(() => {
  loadData()
})

// ==================== SSE 实时更新 ====================

function registerSSECallbacks(): void {
  sseService.setCallbacks({
    onAssignmentUpdate: handleAssignmentUpdate,
  })
  console.log(`[${props.role}考勤管理] 已注册 SSE 回调`)
}

function unregisterSSECallbacks(): void {
  sseService.setCallbacks({
    onAssignmentUpdate: undefined,
  })
  console.log(`[${props.role}考勤管理] 已取消 SSE 回调`)
}

/**
 * 处理仓库分配更新事件
 * 当收到 SSE 仓库分配更新事件时，刷新数据
 */
function handleAssignmentUpdate(data: AssignmentUpdateEvent): void {
  console.log(`[${props.role}考勤管理] 收到仓库分配更新事件`)
  loadData()
}

// ==================== 数据加载方法 ====================

/**
 * 加载所有数据
 * 根据角色加载不同的仓库数据：
 * - Boss: 加载所有仓库
 * - Manager: 加载用户管辖的仓库（支持多仓库）
 */
async function loadData(): Promise<void> {
  loading.value = true
  
  try {
    // 并行加载基础数据
    const [usersData, applicationsData] = await Promise.all([
      getUsers(),
      getLeaveApplications(),
    ])

    // 只保留司机
    drivers.value = usersData.filter(u => u.role === UserRole.DRIVER)
    applications.value = applicationsData

    // 根据角色加载仓库数据
    await loadWarehousesByRole()
    
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
  }
}

/**
 * 根据角色加载仓库数据
 * - Boss: 获取所有仓库
 * - Manager: 获取用户管辖的仓库（支持多仓库）
 * 
 * @requirements 1.3, 1.4 - 角色差异逻辑
 */
async function loadWarehousesByRole(): Promise<void> {
  if (props.role === 'boss') {
    // Boss: 获取所有仓库
    const warehousesData = await getWarehouses({ is_active: true })
    warehouses.value = warehousesData
  } else {
    // Manager: 获取用户管辖的仓库（支持多仓库）
    const userId = userStore.user?.id
    if (userId) {
      try {
        const userWarehouses = await getUserWarehouses(userId)
        warehouses.value = userWarehouses
      } catch (error) {
        console.error('获取用户仓库失败:', error)
        // 降级：使用用户的 warehouse_id 字段
        const warehouseId = userStore.user?.warehouse_id
        if (warehouseId) {
          const allWarehouses = await getWarehouses({ is_active: true })
          warehouses.value = allWarehouses.filter(w => w.id === warehouseId)
        } else {
          warehouses.value = []
        }
      }
    } else {
      warehouses.value = []
    }
  }
}

/**
 * 加载司机考勤统计
 */
async function loadDriverStats(): Promise<void> {
  const statsMap = new Map<number, DriverAttendanceStats>()
  
  const now = new Date()
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  
  try {
    const records = await getAttendanceRecords({
      start_date: startDate,
      end_date: endDate,
    })
    attendanceRecords.value = records
    
    for (const driver of drivers.value) {
      const driverRecords = records.filter(r => r.user_id === driver.id)
      const attendanceDays = driverRecords.filter(r => r.clock_in).length
      
      const lateDays = driverRecords.filter(r => {
        if (!r.clock_in) return false
        const clockInTime = new Date(r.clock_in)
        const hours = clockInTime.getHours()
        const minutes = clockInTime.getMinutes()
        return hours > 8 || (hours === 8 && minutes > 30)
      }).length
      
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
      
      statsMap.set(driver.id, { attendanceDays, lateDays, leaveDays })
    }
  } catch (error) {
    console.error('加载考勤统计失败:', error)
  }
  
  driverStatsMap.value = statsMap
}

/**
 * 加载司机计件统计数据
 */
async function loadDriverPieceStats(): Promise<void> {
  const statsMap = new Map<number, DriverWarehousePieceStats[]>()
  
  const todayRange = getTodayRange()
  const weekRange = getWeekRange()
  const monthRange = getMonthRange()
  
  try {
    const [todayRecords, weekRecords, monthRecords] = await Promise.all([
      getPieceWorkRecords({ start_date: todayRange.startDate, end_date: todayRange.endDate }),
      getPieceWorkRecords({ start_date: weekRange.startDate, end_date: weekRange.endDate }),
      getPieceWorkRecords({ start_date: monthRange.startDate, end_date: monthRange.endDate }),
    ])
    
    const warehouseMap = new Map<number, Warehouse>()
    for (const warehouse of warehouses.value) {
      warehouseMap.set(warehouse.id, warehouse)
    }
    
    for (const driver of drivers.value) {
      const driverTodayRecords = todayRecords.filter(r => r.user_id === driver.id)
      const driverWeekRecords = weekRecords.filter(r => r.user_id === driver.id)
      const driverMonthRecords = monthRecords.filter(r => r.user_id === driver.id)
      
      const warehouseIds = new Set<number>()
      for (const record of [...driverTodayRecords, ...driverWeekRecords, ...driverMonthRecords]) {
        if (record.warehouse_id) warehouseIds.add(record.warehouse_id)
      }
      
      if (warehouseIds.size === 0 && driver.warehouse_id) {
        warehouseIds.add(driver.warehouse_id)
      }
      
      const driverStats: DriverWarehousePieceStats[] = []
      for (const warehouseId of warehouseIds) {
        const warehouse = warehouseMap.get(warehouseId)
        if (!warehouse) continue
        
        const todayQuantity = driverTodayRecords
          .filter(r => r.warehouse_id === warehouseId)
          .reduce((sum, r) => sum + r.quantity, 0)
        
        const weekQuantity = driverWeekRecords
          .filter(r => r.warehouse_id === warehouseId)
          .reduce((sum, r) => sum + r.quantity, 0)
        
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

function handleTabChange(tab: TabType): void {
  activeTab.value = tab
}

function toggleSearch(): void {
  showSearch.value = !showSearch.value
  if (!showSearch.value) searchKeyword.value = ''
}

function clearSearch(): void {
  searchKeyword.value = ''
}

function handleWarehouseChange(e: { detail: { current: number } }): void {
  currentWarehouseIndex.value = e.detail.current
}

function getWarehouseDriverCount(warehouseId: number): number {
  return drivers.value.filter(u => {
    const userWarehouseIds = userWarehouseIdsMap.value.get(u.id) || []
    return userWarehouseIds.includes(warehouseId)
  }).length
}

// ==================== 司机信息方法 ====================

function getDriverStats(driverId: number): DriverAttendanceStats {
  return driverStatsMap.value.get(driverId) || { attendanceDays: 0, lateDays: 0, leaveDays: 0 }
}

function getDriverPieceStats(driverId: number): DriverWarehousePieceStats[] {
  return driverPieceStatsMap.value.get(driverId) || []
}

function isDriverVerified(driver: User): boolean {
  return driver.is_verified === true
}

function isNewDriver(driver: User): boolean {
  if (!driver.created_at) return false
  const startDate = new Date(driver.created_at)
  const today = new Date()
  const diffTime = today.getTime() - startDate.getTime()
  const workDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return workDays <= 7
}

function getTenureDays(driver: User): number {
  if (!driver.created_at) return 0
  const startDate = new Date(driver.created_at)
  const today = new Date()
  const diffTime = today.getTime() - startDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
}

function getDriverTypeText(driver: User): string {
  const isWithVehicle = (driver as any).driver_type === 'with_vehicle'
  return isWithVehicle ? '带车司机' : '纯司机'
}

function getDriverTypeClass(driver: User): string {
  const isWithVehicle = (driver as any).driver_type === 'with_vehicle'
  return isWithVehicle ? 'with-vehicle' : 'pure'
}

// ==================== 操作方法 ====================

function handleViewProfile(driverId: number): void {
  uni.navigateTo({
    url: `/pages/manager/drivers/detail?id=${driverId}`,
  })
}

function handleViewVehicles(driverId: number): void {
  uni.navigateTo({
    url: `/pages/driver/vehicle/list?driverId=${driverId}`,
  })
}
</script>

<style lang="scss" scoped>
@import './attendance.scss';
</style>
