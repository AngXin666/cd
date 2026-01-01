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
        <!-- 欢迎卡片 -->
        <view class="welcome-card">
          <view class="welcome-content">
            <view class="welcome-text">
              <text class="welcome-title">司机工作台</text>
              <text class="welcome-subtitle">欢迎回来，{{ displayName }}</text>
            </view>
            <!-- 请假状态提示 -->
            <view v-if="onLeave" class="leave-badge">
              <text class="leave-icon">🏖️</text>
              <view class="leave-info">
                <text class="leave-title">今天您休息</text>
                <text class="leave-desc">无需打卡</text>
              </view>
            </view>
          </view>
        </view>

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
                    <text class="detail-value">{{ formatTime(todayAttendance.clock_in_time) }}</text>
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
                    <text class="detail-value">{{ formatTime(todayAttendance.clock_out_time) }}</text>
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
              <!-- 今天件数 -->
              <view class="dashboard-item blue" @click="navigateToPieceWorkList('today')">
                <text class="dashboard-icon">📦</text>
                <text class="dashboard-label">今天件数</text>
                <text class="dashboard-value">{{ stats.todayPieceCount }}</text>
                <text class="dashboard-unit">件</text>
              </view>

              <!-- 今天收入 -->
              <view class="dashboard-item green" @click="navigateToPieceWorkList('today')">
                <text class="dashboard-icon">💰</text>
                <text class="dashboard-label">今天收入</text>
                <text class="dashboard-value money">{{ stats.todayIncome.toFixed(0) }}</text>
                <text class="dashboard-unit">元</text>
              </view>

              <!-- 本月件数 -->
              <view class="dashboard-item purple" @click="navigateToPieceWorkList('month')">
                <text class="dashboard-icon">📅</text>
                <text class="dashboard-label">本月件数</text>
                <text class="dashboard-value">{{ stats.monthPieceCount }}</text>
                <text class="dashboard-unit">件</text>
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

        <!-- 快捷功能入口 - Requirements 4.7 -->
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
              <!-- 计件录入 -->
              <view class="action-item blue" @click="navigateTo('/pages/driver/piece-work/entry')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">📝</text>
                </view>
                <text class="action-text">计件录入</text>
              </view>

              <!-- 计件记录 -->
              <view class="action-item green" @click="navigateTo('/pages/driver/piece-work/list')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">📋</text>
                </view>
                <text class="action-text">计件记录</text>
              </view>

              <!-- 考勤打卡 -->
              <view class="action-item orange" @click="navigateTo('/pages/driver/clock/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🕐</text>
                </view>
                <text class="action-text">考勤打卡</text>
              </view>

              <!-- 请假申请 -->
              <view class="action-item purple" @click="navigateTo('/pages/driver/leave/apply')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">📅</text>
                </view>
                <text class="action-text">请假申请</text>
              </view>

              <!-- 考勤记录 -->
              <view class="action-item teal" @click="navigateTo('/pages/driver/attendance/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">📊</text>
                </view>
                <text class="action-text">考勤记录</text>
              </view>

              <!-- 请假记录 -->
              <view class="action-item pink" @click="navigateTo('/pages/driver/leave/list')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🏖️</text>
                </view>
                <text class="action-text">请假记录</text>
              </view>

              <!-- 车辆管理 -->
              <view class="action-item cyan" @click="navigateTo('/pages/driver/vehicle/list')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🚗</text>
                </view>
                <text class="action-text">车辆管理</text>
              </view>

              <!-- 通知消息 -->
              <view class="action-item red" @click="navigateTo('/pages/notifications/index')">
                <view class="action-icon-wrapper">
                  <text class="action-icon">🔔</text>
                  <!-- 未读消息数量徽章 -->
                  <view v-if="unreadCount > 0" class="unread-badge">
                    <text class="unread-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
                  </view>
                </view>
                <text class="action-text">通知消息</text>
              </view>
            </view>
          </view>
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

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { 
  getPieceWorkStats, 
  getTodayAttendance, 
  getLeaveApplications,
  getUnreadCount,
  getWarehouses,
  getAttendanceRecords,
} from '@/api'
import type { TodayAttendance, LeaveApplication, Warehouse } from '@/api/types'
import { LeaveStatus } from '@/api/types'
import {
  filterWarehousesWithData,
  shouldShowWarehouseSwitcher,
  createWarehouseDataMap,
} from '@/utils/warehouse'

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 状态 ====================

/** 加载考勤状态 */
const loadingAttendance = ref(false)

/** 加载统计状态 */
const loadingStats = ref(false)

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

/** 仓库数据映射（warehouseId -> hasData） */
const warehouseDataMap = ref<Map<number, boolean>>(new Map())

/** 当前选中的仓库索引（用于 Swiper 切换） */
const currentWarehouseIndex = ref(0)

/** 加载仓库状态 */
const loadingWarehouses = ref(false)

// ==================== 计算属性 ====================

/**
 * 有数据的仓库列表
 * 使用统一的工具函数过滤
 */
const warehousesWithData = computed(() => {
  return filterWarehousesWithData({
    warehouses: warehouses.value,
    warehouseDataMap: warehouseDataMap.value,
  })
})

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
  try {
    // 并行加载数据
    await Promise.all([
      loadAttendance(),
      loadStats(),
      loadLeaveStatus(),
      loadUnreadCount(),
      loadWarehouses(),
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

/**
 * 加载今日打卡状态
 * @requirements 4.1, 4.2, 4.3
 */
async function loadAttendance(): Promise<void> {
  loadingAttendance.value = true
  
  try {
    const data = await getTodayAttendance()
    todayAttendance.value = data
  } catch (error) {
    console.error('加载打卡状态失败:', error)
    todayAttendance.value = null
  } finally {
    loadingAttendance.value = false
  }
}

/**
 * 加载计件统计数据
 * @requirements 4.4, 4.5
 */
async function loadStats(): Promise<void> {
  loadingStats.value = true
  
  try {
    // 获取今日日期字符串
    const todayStr = new Date().toISOString().split('T')[0]
    
    // 获取本月第一天
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    
    // 并行获取今日和本月统计、考勤记录
    const [todayStats, monthStats, attendanceRecords] = await Promise.all([
      getPieceWorkStats({
        start_date: todayStr,
        end_date: todayStr,
      }),
      getPieceWorkStats({
        start_date: monthStartStr,
        end_date: todayStr,
      }),
      // 获取本月考勤记录用于计算出勤天数
      getAttendanceRecords({
        start_date: monthStartStr,
        end_date: todayStr,
      }),
    ])
    
    // 计算出勤天数（有打卡记录的天数）
    const attendanceDays = attendanceRecords.filter(r => r.clock_in).length
    
    stats.value = {
      todayPieceCount: todayStats.total_quantity || 0,
      todayIncome: todayStats.total_amount || 0,
      monthPieceCount: monthStats.total_quantity || 0,
      monthIncome: monthStats.total_amount || 0,
      attendanceDays,
      leaveDays: 0, // 请假天数在 loadLeaveStatus 中计算
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  } finally {
    loadingStats.value = false
  }
}

/**
 * 加载司机分配的仓库列表
 * 用于仓库切换器和所属仓库卡片
 * 同时获取每个仓库的计件数据，用于过滤有数据的仓库
 */
async function loadWarehouses(): Promise<void> {
  loadingWarehouses.value = true
  
  try {
    // 获取所有启用的仓库
    // 注意：后端应该根据当前用户角色返回对应的仓库
    // 如果后端没有过滤，前端需要根据用户分配关系过滤
    const data = await getWarehouses({ is_active: true })
    warehouses.value = data || []
    
    // 获取本月第一天（用于统计本月数据）
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]
    
    // 并行获取每个仓库的计件数据
    const warehouseStatsPromises = warehouses.value.map(async (warehouse) => {
      try {
        const stats = await getPieceWorkStats({
          warehouse_id: warehouse.id,
          start_date: monthStartStr,
          end_date: todayStr,
        })
        // 有数据 = 本月有计件记录
        return {
          warehouseId: warehouse.id,
          hasData: (stats.total_quantity || 0) > 0,
        }
      } catch {
        return { warehouseId: warehouse.id, hasData: false }
      }
    })
    
    const warehouseStatsResults = await Promise.all(warehouseStatsPromises)
    
    // 创建仓库数据映射
    warehouseDataMap.value = createWarehouseDataMap(
      warehouseStatsResults.map(r => ({
        warehouseId: r.warehouseId,
        hasData: r.hasData,
      }))
    )
  } catch (error) {
    console.error('加载仓库列表失败:', error)
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
    // 获取今日日期
    const todayStr = new Date().toISOString().split('T')[0]
    
    // 获取本月第一天
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    
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
 * 格式化时间显示
 * @param timeStr - ISO 时间字符串
 * @returns 格式化后的时间 HH:mm
 */
function formatTime(timeStr: string | null): string {
  if (!timeStr) return '--:--'
  const date = new Date(timeStr)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
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
 * @param e - Swiper 事件
 */
function handleWarehouseChange(e: any): void {
  currentWarehouseIndex.value = e.detail.current
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

/* 欢迎卡片 */
.welcome-card {
  background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
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

/* 统计卡片 - 旧样式保留兼容 */
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

.stat-block {
  border-radius: 20rpx;
  padding: 24rpx;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
  
  &.today {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
    border: 2rpx solid #BFDBFE;
  }
  
  &.month {
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

.unread-badge {
  position: absolute;
  top: -8rpx;
  right: -12rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: #EF4444;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.unread-count {
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
