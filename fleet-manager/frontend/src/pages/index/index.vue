<template>
  <!-- 
    首页
    根据用户角色显示不同的快捷入口和功能菜单
    - 司机端：显示今日打卡状态和计件汇总
    - 车队长端：显示仓库统计和待审批数量
    - 老板端：显示全局统计数据
  -->
  <view class="index-page">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-info">
        <view class="avatar">
          <text class="avatar-text">{{ userInitial }}</text>
        </view>
        <view class="user-detail">
          <text class="user-name">{{ userName }}</text>
          <text class="user-role">{{ roleName }}</text>
        </view>
      </view>
    </view>

    <!-- 车队长端：仓库统计 -->
    <view v-if="isManager" class="stats-card">
      <view class="stats-header">
        <text class="stats-title">仓库概览</text>
      </view>
      <view class="stats-content">
        <view class="stats-item">
          <text class="stats-value">{{ managerStats.driverCount }}</text>
          <text class="stats-label">司机数</text>
        </view>
        <view class="stats-item">
          <text class="stats-value highlight-warning">{{ managerStats.pendingLeaveCount }}</text>
          <text class="stats-label">待审批</text>
        </view>
        <view class="stats-item">
          <text class="stats-value highlight">¥{{ formatMoney(managerStats.todayAmount) }}</text>
          <text class="stats-label">今日计件</text>
        </view>
      </view>
    </view>

    <!-- 老板端：全局统计 -->
    <view v-if="isBoss" class="stats-card">
      <view class="stats-header">
        <text class="stats-title">全局概览</text>
      </view>
      <view class="stats-content">
        <view class="stats-item">
          <text class="stats-value">{{ bossStats.userCount }}</text>
          <text class="stats-label">用户数</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">{{ bossStats.warehouseCount }}</text>
          <text class="stats-label">仓库数</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">{{ bossStats.vehicleCount }}</text>
          <text class="stats-label">车辆数</text>
        </view>
      </view>
    </view>

    <!-- 司机端：今日打卡状态 -->
    <view v-if="isDriver" class="status-card">
      <view class="status-header">
        <text class="status-title">今日打卡</text>
        <text class="status-date">{{ today }}</text>
      </view>
      <view class="status-content">
        <view class="status-item">
          <text class="status-label">上班</text>
          <text :class="['status-value', todayAttendance.has_clocked_in ? 'success' : 'pending']">
            {{ todayAttendance.has_clocked_in ? formatTime(todayAttendance.clock_in_time) : '未打卡' }}
          </text>
        </view>
        <view class="status-divider"></view>
        <view class="status-item">
          <text class="status-label">下班</text>
          <text :class="['status-value', todayAttendance.has_clocked_out ? 'success' : 'pending']">
            {{ todayAttendance.has_clocked_out ? formatTime(todayAttendance.clock_out_time) : '未打卡' }}
          </text>
        </view>
        <view class="status-divider"></view>
        <view class="status-item">
          <text class="status-label">工时</text>
          <text class="status-value">
            {{ todayAttendance.work_hours ? formatWorkHours(todayAttendance.work_hours) : '-' }}
          </text>
        </view>
      </view>
    </view>

    <!-- 司机端：今日计件汇总 -->
    <view v-if="isDriver" class="stats-card">
      <view class="stats-header">
        <text class="stats-title">今日计件</text>
      </view>
      <view class="stats-content">
        <view class="stats-item">
          <text class="stats-value">{{ todayStats.record_count }}</text>
          <text class="stats-label">记录数</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">{{ todayStats.total_quantity }}</text>
          <text class="stats-label">总数量</text>
        </view>
        <view class="stats-item">
          <text class="stats-value highlight">¥{{ formatMoney(todayStats.total_amount) }}</text>
          <text class="stats-label">总金额</text>
        </view>
      </view>
    </view>

    <!-- 司机快捷入口 -->
    <view v-if="isDriver" class="quick-actions">
      <view class="action-item" @click="navigateTo('/pages/driver/clock/index')">
        <view class="action-icon clock-icon">🕐</view>
        <text class="action-text">打卡</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/driver/piece-work/entry')">
        <view class="action-icon">📝</view>
        <text class="action-text">计件</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/driver/leave/apply')">
        <view class="action-icon">📅</view>
        <text class="action-text">请假</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/driver/vehicle/list')">
        <view class="action-icon">🚗</view>
        <text class="action-text">车辆</text>
      </view>
    </view>

    <!-- 车队长快捷入口 -->
    <view v-if="isManager" class="quick-actions">
      <view class="action-item" @click="navigateTo('/pages/manager/drivers/index')">
        <view class="action-icon">👥</view>
        <text class="action-text">司机</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/manager/approval/list')">
        <view class="action-icon">✅</view>
        <text class="action-text">审批</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/manager/piece-work/index')">
        <view class="action-icon">📊</view>
        <text class="action-text">计件</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/manager/stats/index')">
        <view class="action-icon">📈</view>
        <text class="action-text">统计</text>
      </view>
    </view>

    <!-- 老板快捷入口 -->
    <view v-if="isBoss" class="quick-actions">
      <view class="action-item" @click="navigateTo('/pages/boss/users/index')">
        <view class="action-icon">👥</view>
        <text class="action-text">用户</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/boss/warehouses/index')">
        <view class="action-icon">🏭</view>
        <text class="action-text">仓库</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/boss/vehicles/index')">
        <view class="action-icon">🚗</view>
        <text class="action-text">车辆</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/boss/stats/index')">
        <view class="action-icon">📈</view>
        <text class="action-text">统计</text>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-section">
      <view class="menu-title">功能菜单</view>
      
      <!-- 司机菜单 -->
      <view v-if="isDriver" class="menu-list">
        <view class="menu-item" @click="navigateTo('/pages/driver/attendance/index')">
          <text class="menu-text">考勤记录</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/driver/piece-work/list')">
          <text class="menu-text">计件记录</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/driver/leave/list')">
          <text class="menu-text">请假记录</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 车队长菜单 -->
      <view v-if="isManager" class="menu-list">
        <view class="menu-item" @click="navigateTo('/pages/manager/notify/index')">
          <text class="menu-text">发送通知</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 老板菜单 -->
      <view v-if="isBoss" class="menu-list">
        <view class="menu-item" @click="navigateTo('/pages/boss/approval/index')">
          <text class="menu-text">请假审批</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/boss/vehicles/review')">
          <text class="menu-text">车辆审核</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/boss/categories/index')">
          <text class="menu-text">分类管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/boss/templates/index')">
          <text class="menu-text">通知模板</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/boss/scheduled/index')">
          <text class="menu-text">定时通知</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/boss/versions/index')">
          <text class="menu-text">版本管理</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 首页
 * 根据用户角色显示不同的快捷入口和功能菜单
 * - 司机端：显示今日打卡状态和计件汇总
 * - 车队长端：显示仓库统计和待审批数量
 * - 老板端：显示全局统计数据
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { 
  getTodayAttendance, 
  getPieceWorkStats, 
  getUsers, 
  getLeaveApplications,
  getWarehouses,
  getVehicles,
} from '@/api'
import type { TodayAttendance, PieceWorkStats } from '@/api/types'
import { UserRole, LeaveStatus } from '@/api/types'
import { getRoleName, formatTime, formatWorkHours, formatMoney, getToday } from '@/utils'

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 状态 ====================

/** 今日打卡状态 */
const todayAttendance = ref<TodayAttendance>({
  has_clocked_in: false,
  has_clocked_out: false,
  clock_in_time: null,
  clock_out_time: null,
  work_hours: null,
})

/** 今日计件统计 */
const todayStats = ref<PieceWorkStats>({
  total_quantity: 0,
  total_amount: 0,
  record_count: 0,
})

/** 车队长统计数据 */
const managerStats = ref({
  driverCount: 0,        // 司机数量
  pendingLeaveCount: 0,  // 待审批请假数量
  todayAmount: 0,        // 今日计件金额
})

/** 老板统计数据 */
const bossStats = ref({
  userCount: 0,       // 用户总数
  warehouseCount: 0,  // 仓库总数
  vehicleCount: 0,    // 车辆总数
})

// ==================== 计算属性 ====================

/** 用户名称 */
const userName = computed(() => userStore.userName || '用户')

/** 用户名首字母 */
const userInitial = computed(() => userName.value.charAt(0))

/** 角色名称 */
const roleName = computed(() => getRoleName(userStore.role || ''))

/** 是否是司机 */
const isDriver = computed(() => userStore.isDriver)

/** 是否是车队长 */
const isManager = computed(() => userStore.isManager)

/** 是否是老板 */
const isBoss = computed(() => userStore.isBoss)

/** 今天日期 */
const today = computed(() => getToday())

// ==================== 生命周期 ====================

onMounted(() => {
  // 检查登录状态
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  
  // 加载数据
  loadData()
})

onShow(() => {
  // 刷新用户信息
  userStore.refreshUser()
  
  // 刷新数据
  if (userStore.isLoggedIn) {
    loadData()
  }
})

// ==================== 方法 ====================

/**
 * 加载页面数据
 */
async function loadData(): Promise<void> {
  // 司机端加载打卡状态和计件统计
  if (isDriver.value) {
    await Promise.all([
      loadTodayAttendance(),
      loadTodayStats(),
    ])
  }
  
  // 车队长端加载仓库统计
  if (isManager.value) {
    await loadManagerStats()
  }
  
  // 老板端加载全局统计
  if (isBoss.value) {
    await loadBossStats()
  }
}

/**
 * 加载今日打卡状态
 */
async function loadTodayAttendance(): Promise<void> {
  try {
    const data = await getTodayAttendance()
    todayAttendance.value = data
  } catch (error) {
    console.error('加载打卡状态失败:', error)
  }
}

/**
 * 加载今日计件统计
 */
async function loadTodayStats(): Promise<void> {
  try {
    const data = await getPieceWorkStats({
      start_date: getToday(),
      end_date: getToday(),
    })
    todayStats.value = data
  } catch (error) {
    console.error('加载计件统计失败:', error)
  }
}

/**
 * 加载车队长统计数据
 * 包括司机数量、待审批请假数量、今日计件金额
 */
async function loadManagerStats(): Promise<void> {
  try {
    // 并行加载多个数据
    const [drivers, pendingLeaves, todayPieceWork] = await Promise.all([
      // 获取司机列表
      getUsers({ role: UserRole.DRIVER }),
      // 获取待审批请假
      getLeaveApplications({ status: LeaveStatus.PENDING }),
      // 获取今日计件统计
      getPieceWorkStats({
        start_date: getToday(),
        end_date: getToday(),
      }),
    ])
    
    managerStats.value = {
      driverCount: drivers.length,
      pendingLeaveCount: pendingLeaves.length,
      todayAmount: todayPieceWork.total_amount,
    }
  } catch (error) {
    console.error('加载车队长统计失败:', error)
  }
}

/**
 * 加载老板统计数据
 * 包括用户总数、仓库总数、车辆总数
 */
async function loadBossStats(): Promise<void> {
  try {
    // 并行加载多个数据
    const [users, warehouses, vehicles] = await Promise.all([
      getUsers(),
      getWarehouses(),
      getVehicles(),
    ])
    
    bossStats.value = {
      userCount: users.length,
      warehouseCount: warehouses.length,
      vehicleCount: vehicles.length,
    }
  } catch (error) {
    console.error('加载老板统计失败:', error)
  }
}

/**
 * 页面跳转
 * 
 * @param url - 目标页面路径
 */
function navigateTo(url: string): void {
  uni.navigateTo({ url })
}
</script>


<style lang="scss" scoped>
.index-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

/* 用户卡片 */
.user-card {
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  padding: 48rpx 32rpx;
  margin-bottom: 24rpx;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 44rpx;
  font-weight: bold;
  color: #ffffff;
}

.user-detail {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.user-role {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 打卡状态卡片 */
.status-card {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.status-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.status-date {
  font-size: 24rpx;
  color: #999999;
}

.status-content {
  display: flex;
  align-items: center;
}

.status-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.status-label {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 8rpx;
}

.status-value {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
  
  &.success {
    color: #52c41a;
  }
  
  &.pending {
    color: #faad14;
  }
}

.status-divider {
  width: 1rpx;
  height: 60rpx;
  background-color: #f0f0f0;
}

/* 计件统计卡片 */
.stats-card {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.stats-header {
  margin-bottom: 24rpx;
}

.stats-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.stats-content {
  display: flex;
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
  
  &.highlight {
    color: #ff6b35;
  }
  
  &.highlight-warning {
    color: #faad14;
  }
}

.stats-label {
  font-size: 24rpx;
  color: #999999;
}

/* 快捷入口 */
.quick-actions {
  display: flex;
  background-color: #ffffff;
  padding: 32rpx 0;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
  font-size: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.action-text {
  font-size: 26rpx;
  color: #666666;
}

/* 功能菜单 */
.menu-section {
  margin: 0 24rpx;
}

.menu-title {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.menu-list {
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-text {
  font-size: 30rpx;
  color: #333333;
}

.menu-arrow {
  font-size: 32rpx;
  color: #cccccc;
}
</style>
