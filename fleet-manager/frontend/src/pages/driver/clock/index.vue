<!--
  司机打卡页面
  提供上班/下班打卡功能，支持仓库选择和考勤状态显示
  UI 风格与主项目保持一致：渐变背景、卡片式布局、智能打卡
  
  @module pages/driver/clock
  @requirements 3.2 - 考勤打卡
-->
<template>
  <view class="clock-page" :style="{ background: 'linear-gradient(to bottom, #F0F9FF, #E0F2FE)' }">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <!-- 页面内容 -->
    <scroll-view scroll-y class="page-content">
      <view class="content-wrapper">
        <!-- 顶部时间卡片 -->
        <view class="time-card">
          <view class="time-content">
            <text class="date-text">{{ dateText }}</text>
            <text class="time-text">{{ currentTime }}</text>
          </view>
        </view>

        <!-- 今天打卡状态提示卡片 -->
        <view v-if="attendance.has_clocked_in" class="status-card success">
          <view class="status-header">
            <text class="status-icon">✅</text>
            <text class="status-title">今天已打卡</text>
          </view>
          <view class="status-details">
            <view class="detail-row">
              <text class="detail-label">上班时间</text>
              <text class="detail-value">{{ formatTime(attendance.clock_in_time) }}</text>
            </view>
            <view v-if="attendance.has_clocked_out" class="detail-row">
              <text class="detail-label">下班时间</text>
              <text class="detail-value">{{ formatTime(attendance.clock_out_time) }}</text>
            </view>
            <view v-if="attendance.work_hours" class="detail-row">
              <text class="detail-label">工作时长</text>
              <text class="detail-value highlight">{{ formatWorkHours(attendance.work_hours) }}</text>
            </view>
          </view>
        </view>

        <!-- 仓库选择卡片 -->
        <view class="warehouse-card">
          <view class="card-header">
            <text class="card-icon">🏭</text>
            <text class="card-title">选择仓库</text>
            <text v-if="!attendance.has_clocked_in" class="required">*</text>
          </view>

          <view v-if="loadingWarehouses" class="loading-state">
            <text class="loading-icon">⏳</text>
            <text class="loading-text">加载中...</text>
          </view>
          <view v-else-if="warehouses.length === 0" class="empty-state">
            <text class="empty-icon">📦</text>
            <text class="empty-text">暂无可用仓库</text>
          </view>
          <view v-else class="warehouse-list">
            <view 
              v-for="warehouse in warehouses" 
              :key="warehouse.id"
              :class="['warehouse-item', { 
                selected: selectedWarehouseId === warehouse.id,
                disabled: attendance.has_clocked_in && attendance.warehouse_id !== warehouse.id
              }]"
              @click="selectWarehouse(warehouse)"
            >
              <view class="warehouse-radio">
                <view v-if="selectedWarehouseId === warehouse.id" class="radio-checked"></view>
              </view>
              <view class="warehouse-info">
                <text class="warehouse-name">{{ warehouse.name }}</text>
                <text v-if="warehouse.address" class="warehouse-address">{{ warehouse.address }}</text>
                <!-- 考勤规则显示 - Requirements 9.4 -->
                <view v-if="selectedWarehouseId === warehouse.id && currentRule" class="warehouse-rule">
                  <view class="rule-row">
                    <text class="rule-icon">🕐</text>
                    <text class="rule-text">上班：{{ currentRule.work_start_time }} | 下班：{{ currentRule.work_end_time }}</text>
                  </view>
                  <view class="rule-row">
                    <text class="rule-icon">ℹ️</text>
                    <text class="rule-text">{{ requireClockOut ? '需要打下班卡' : '无需打下班卡' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 智能打卡按钮 -->
        <view class="action-section">
          <!-- 请假中状态 - Requirements 9.8 -->
          <view 
            v-if="isOnLeave"
            class="clock-button leave"
          >
            <view class="button-content">
              <text class="button-icon">🏖️</text>
              <text class="button-text">今天休假，无需打卡</text>
            </view>
          </view>
          
          <!-- 上班打卡按钮 -->
          <view 
            v-else-if="!attendance.has_clocked_in"
            :class="['clock-button', 'clock-in', { disabled: !selectedWarehouseId || loading }]"
            @click="handleClockIn"
          >
            <view class="button-content">
              <text class="button-icon">🌅</text>
              <text class="button-text">{{ loading ? '打卡中...' : '上班打卡' }}</text>
            </view>
          </view>

          <!-- 下班打卡按钮 -->
          <view 
            v-else-if="!attendance.has_clocked_out && requireClockOut"
            :class="['clock-button', 'clock-out', { disabled: loading }]"
            @click="handleClockOut"
          >
            <view class="button-content">
              <text class="button-icon">🌆</text>
              <text class="button-text">{{ loading ? '打卡中...' : '下班打卡' }}</text>
            </view>
          </view>

          <!-- 已完成打卡 -->
          <view v-else class="clock-button done">
            <view class="button-content">
              <text class="button-icon">✅</text>
              <text class="button-text">今天已完成</text>
            </view>
          </view>
        </view>

        <!-- 今天打卡记录 -->
        <view v-if="attendance.has_clocked_in" class="record-card">
          <view class="card-header">
            <text class="card-icon">📋</text>
            <text class="card-title">今天打卡记录</text>
          </view>

          <!-- 上班打卡记录 -->
          <view class="record-item clock-in-record">
            <view class="record-header">
              <view class="record-label">
                <text class="record-icon">🌅</text>
                <text class="record-text">上班打卡</text>
              </view>
              <!-- 状态标签 - Requirements 9.9 -->
              <view 
                class="record-status"
                :style="{ backgroundColor: getStatusInfo(attendance.status).bgColor }"
              >
                <text 
                  class="status-text"
                  :style="{ color: getStatusInfo(attendance.status).color }"
                >{{ getStatusInfo(attendance.status).text }}</text>
              </view>
            </view>
            <text class="record-time">{{ formatTime(attendance.clock_in_time) }}</text>
            <view v-if="attendance.warehouse_name" class="record-warehouse">
              <text class="warehouse-icon">🏭</text>
              <text class="warehouse-text">{{ attendance.warehouse_name }}</text>
            </view>
          </view>

          <!-- 下班打卡记录 -->
          <view 
            v-if="requireClockOut"
            :class="['record-item', 'clock-out-record', { pending: !attendance.has_clocked_out }]"
          >
            <view class="record-header">
              <view class="record-label">
                <text class="record-icon">🌆</text>
                <text class="record-text">下班打卡</text>
              </view>
            </view>
            <text v-if="attendance.has_clocked_out" class="record-time">
              {{ formatTime(attendance.clock_out_time) }}
            </text>
            <text v-else class="record-pending">未打卡</text>
            <view v-if="attendance.work_hours" class="record-hours">
              <text class="hours-icon">⏱️</text>
              <text class="hours-text">工作时长：{{ formatWorkHours(attendance.work_hours) }}</text>
            </view>
          </view>
        </view>

        <!-- 温馨提示 -->
        <view class="tips-card">
          <view class="tips-header">
            <text class="tips-icon">💡</text>
            <text class="tips-title">温馨提示</text>
          </view>
          <view class="tips-list">
            <text class="tips-item">• 请在打卡前选择您所在的仓库</text>
            <text class="tips-item">• 系统会自动判断迟到、早退等状态</text>
            <text class="tips-item">• 上班打卡后，按钮会自动切换为下班打卡</text>
            <text class="tips-item">• 部分仓库可能不需要打下班卡</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>


<script setup lang="ts">
/**
 * 司机打卡页面
 * 
 * @description 提供上班/下班打卡功能，支持仓库选择和考勤状态显示
 * UI 风格与主项目保持一致：渐变背景、卡片式布局、智能打卡
 * 
 * 深度转换功能：
 * - 13.1 打卡状态显示（今天已打卡卡片）
 * - 13.2 仓库选择功能（显示考勤规则）
 * - 13.3 智能打卡按钮（请假中禁用）
 * - 13.4 打卡记录显示（状态标签）
 * 
 * @requirements 9.1-9.10
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getTodayAttendance, 
  clockIn, 
  clockOut, 
  getWarehouses,
  getAttendanceRule,
  checkUserOnLeave,
} from '@/api'
import type { TodayAttendance, Warehouse, AttendanceRule } from '@/api/types'

// ==================== 类型定义 ====================

/** 考勤状态类型 */
type AttendanceStatus = 'normal' | 'late' | 'early' | 'absent'

// ==================== 状态 ====================

/** 当前时间显示 */
const currentTime = ref('')

/** 日期文本 */
const dateText = ref('')

/** 打卡状态 */
const attendance = ref<TodayAttendance & { warehouse_name?: string; status?: AttendanceStatus }>({
  has_clocked_in: false,
  has_clocked_out: false,
  clock_in_time: null,
  clock_out_time: null,
  work_hours: null,
  warehouse_id: null,
})

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 选中的仓库 ID */
const selectedWarehouseId = ref<number | null>(null)

/** 加载仓库状态 */
const loadingWarehouses = ref(false)

/** 打卡加载状态 */
const loading = ref(false)

/** 定时器 ID */
let timer: ReturnType<typeof setInterval> | null = null

/** 
 * 当前选中仓库的考勤规则
 * @requirements 9.4 - 显示考勤规则
 */
const currentRule = ref<AttendanceRule | null>(null)

/** 
 * 是否在请假中
 * @requirements 9.8 - 请假中禁用打卡
 */
const isOnLeave = ref(false)

// ==================== 计算属性 ====================

/**
 * 是否需要打下班卡
 * @requirements 9.6 - 根据仓库规则判断
 */
const requireClockOut = computed(() => {
  return currentRule.value?.require_clock_out ?? true
})

/**
 * 获取打卡按钮信息
 * @requirements 9.5, 9.6, 9.7, 9.8
 */
const buttonInfo = computed(() => {
  // 如果在请假中，禁用打卡按钮
  if (isOnLeave.value) {
    return {
      text: '今天休假，无需打卡',
      icon: '🏖️',
      disabled: true,
      type: 'leave',
    }
  }
  
  if (!attendance.value.has_clocked_in) {
    return {
      text: loading.value ? '打卡中...' : '上班打卡',
      icon: '🌅',
      disabled: !selectedWarehouseId.value || loading.value,
      type: 'clock-in',
    }
  }
  
  if (!attendance.value.has_clocked_out && requireClockOut.value) {
    return {
      text: loading.value ? '打卡中...' : '下班打卡',
      icon: '🌆',
      disabled: loading.value,
      type: 'clock-out',
    }
  }
  
  return {
    text: '今天已完成',
    icon: '✅',
    disabled: true,
    type: 'done',
  }
})

// ==================== 生命周期 ====================

onMounted(() => {
  // 更新时间
  updateTime()
  
  // 启动定时器，每秒更新时间
  timer = setInterval(updateTime, 1000)
  
  // 加载数据
  loadData()
})

onUnmounted(() => {
  // 清除定时器
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

onShow(() => {
  // 刷新数据
  loadData()
})

// ==================== 方法 ====================

/**
 * 更新当前时间显示
 */
function updateTime(): void {
  const now = new Date()
  
  // 格式化时间 HH:mm:ss
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
  
  // 格式化日期
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  dateText.value = `${year}年${month}月${day}日 ${weekdays[now.getDay()]}`
}

/**
 * 加载页面数据
 */
async function loadData(): Promise<void> {
  await Promise.all([
    loadAttendance(),
    loadWarehouses(),
    checkLeaveStatus(),
  ])
}

/**
 * 检查是否在请假中
 * @requirements 9.8 - 请假中禁用打卡
 */
async function checkLeaveStatus(): Promise<void> {
  try {
    const result = await checkUserOnLeave()
    isOnLeave.value = result.onLeave
  } catch (error) {
    console.error('检查请假状态失败:', error)
    isOnLeave.value = false
  }
}


/**
 * 加载打卡状态
 */
async function loadAttendance(): Promise<void> {
  try {
    const data = await getTodayAttendance()
    attendance.value = data
    
    // 如果已打卡，自动选中对应仓库
    if (data.warehouse_id) {
      selectedWarehouseId.value = data.warehouse_id
    }
  } catch (error) {
    console.error('加载打卡状态失败:', error)
  }
}

/**
 * 加载仓库列表
 */
async function loadWarehouses(): Promise<void> {
  loadingWarehouses.value = true
  
  try {
    const data = await getWarehouses()
    // 只显示启用的仓库
    warehouses.value = data.filter(w => w.is_active !== false)
  } catch (error) {
    console.error('加载仓库列表失败:', error)
  } finally {
    loadingWarehouses.value = false
  }
}

/**
 * 选择仓库
 * @param warehouse - 仓库对象
 */
async function selectWarehouse(warehouse: Warehouse): Promise<void> {
  // 如果已打卡且不是当前仓库，不允许切换
  if (attendance.value.has_clocked_in && attendance.value.warehouse_id !== warehouse.id) {
    return
  }
  selectedWarehouseId.value = warehouse.id
  
  // 加载该仓库的考勤规则
  await loadAttendanceRule(warehouse.id)
}

/**
 * 加载考勤规则
 * @param warehouseId - 仓库 ID
 * @requirements 9.4 - 显示考勤规则
 */
async function loadAttendanceRule(warehouseId: number): Promise<void> {
  try {
    const rule = await getAttendanceRule(warehouseId)
    currentRule.value = rule
  } catch (error) {
    console.error('加载考勤规则失败:', error)
    currentRule.value = null
  }
}

/**
 * 获取状态信息
 * @param status - 考勤状态
 * @returns 状态显示信息
 */
function getStatusInfo(status: AttendanceStatus | undefined): { text: string; color: string; bgColor: string } {
  switch (status) {
    case 'normal':
      return { text: '正常', color: '#059669', bgColor: '#D1FAE5' }
    case 'late':
      return { text: '迟到', color: '#DC2626', bgColor: '#FEE2E2' }
    case 'early':
      return { text: '早退', color: '#D97706', bgColor: '#FEF3C7' }
    case 'absent':
      return { text: '缺勤', color: '#6B7280', bgColor: '#F3F4F6' }
    default:
      return { text: '正常', color: '#059669', bgColor: '#D1FAE5' }
  }
}

/**
 * 上班打卡
 */
async function handleClockIn(): Promise<void> {
  if (!selectedWarehouseId.value) {
    uni.showToast({ title: '请选择仓库', icon: 'none' })
    return
  }
  
  // 确认打卡
  uni.showModal({
    title: '确认打卡',
    content: '确定要进行上班打卡吗？',
    success: async (res) => {
      if (res.confirm) {
        await doClockIn()
      }
    },
  })
}

/**
 * 执行上班打卡
 */
async function doClockIn(): Promise<void> {
  loading.value = true
  
  try {
    await clockIn(selectedWarehouseId.value!)
    
    // 刷新状态
    await loadAttendance()
    
    // 显示成功提示
    uni.showModal({
      title: '✓ 上班打卡成功',
      content: `打卡时间：${currentTime.value}\n仓库：${warehouses.value.find(w => w.id === selectedWarehouseId.value)?.name || ''}`,
      showCancel: false,
    })
  } catch (error: any) {
    console.error('上班打卡失败:', error)
    uni.showToast({
      title: error.message || '打卡失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}


/**
 * 下班打卡
 */
async function handleClockOut(): Promise<void> {
  // 确认打卡
  uni.showModal({
    title: '确认打卡',
    content: '确定要进行下班打卡吗？',
    success: async (res) => {
      if (res.confirm) {
        await doClockOut()
      }
    },
  })
}

/**
 * 执行下班打卡
 */
async function doClockOut(): Promise<void> {
  loading.value = true
  
  try {
    await clockOut()
    
    // 刷新状态
    await loadAttendance()
    
    // 显示成功提示
    uni.showModal({
      title: '✓ 下班打卡成功',
      content: `打卡时间：${currentTime.value}\n工作时长：${formatWorkHours(attendance.value.work_hours)}`,
      showCancel: false,
    })
  } catch (error: any) {
    console.error('下班打卡失败:', error)
    uni.showToast({
      title: error.message || '打卡失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
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
</script>


<style lang="scss" scoped>
/* 打卡页面容器 */
.clock-page {
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

/* 时间卡片 */
.time-card {
  background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(30, 58, 138, 0.3);
}

.time-content {
  text-align: center;
}

.date-text {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 16rpx;
}

.time-text {
  display: block;
  font-size: 80rpx;
  font-weight: bold;
  color: #ffffff;
  font-family: 'Courier New', monospace;
  letter-spacing: 4rpx;
}

/* 状态卡片 */
.status-card {
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  
  &.success {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  }
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.status-icon {
  font-size: 48rpx;
  margin-right: 12rpx;
}

.status-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.status-details {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  padding: 24rpx;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}

.detail-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}

.detail-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
  
  &.highlight {
    color: #FEF08A;
  }
}


/* 仓库选择卡片 */
.warehouse-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.card-icon {
  font-size: 40rpx;
  margin-right: 12rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1F2937;
}

.required {
  color: #EF4444;
  margin-left: 8rpx;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
}

.loading-icon,
.empty-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.loading-text,
.empty-text {
  font-size: 26rpx;
  color: #9CA3AF;
}

/* 仓库列表 */
.warehouse-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.warehouse-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border: 4rpx solid #E5E7EB;
  border-radius: 16rpx;
  background-color: #ffffff;
  transition: all 0.2s;
  
  &.selected {
    border-color: #3B82F6;
    background-color: #EFF6FF;
  }
  
  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.warehouse-radio {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #D1D5DB;
  border-radius: 50%;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .warehouse-item.selected & {
    border-color: #3B82F6;
  }
}

.radio-checked {
  width: 24rpx;
  height: 24rpx;
  background-color: #3B82F6;
  border-radius: 50%;
}

.warehouse-info {
  flex: 1;
}

.warehouse-name {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 4rpx;
}

.warehouse-address {
  display: block;
  font-size: 24rpx;
  color: #6B7280;
}

/* 考勤规则显示 - Requirements 9.4 */
.warehouse-rule {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #E5E7EB;
}

.rule-row {
  display: flex;
  align-items: center;
  margin-bottom: 4rpx;
}

.rule-icon {
  font-size: 20rpx;
  margin-right: 8rpx;
}

.rule-text {
  font-size: 22rpx;
  color: #6B7280;
}


/* 打卡按钮区域 */
.action-section {
  display: flex;
  justify-content: center;
  margin-bottom: 32rpx;
}

.clock-button {
  width: 320rpx;
  height: 320rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  
  &:active {
    transform: scale(0.95);
  }
  
  &.clock-in {
    background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
  }
  
  &.clock-out {
    background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
  }
  
  &.done {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  }
  
  /* 请假中状态 - Requirements 9.8 */
  &.leave {
    background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
  }
  
  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.button-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.button-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.button-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 打卡记录卡片 */
.record-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.record-item {
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.clock-in-record {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  }
  
  &.clock-out-record {
    background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
    
    &.pending {
      background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%);
    }
  }
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.record-label {
  display: flex;
  align-items: center;
}

.record-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

.record-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #374151;
}

.record-status {
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  
  &.normal {
    background-color: #D1FAE5;
  }
}

.status-text {
  font-size: 22rpx;
  font-weight: bold;
  color: #059669;
}

.record-time {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 8rpx;
}

.record-pending {
  display: block;
  font-size: 28rpx;
  color: #9CA3AF;
}

.record-warehouse,
.record-hours {
  display: flex;
  align-items: center;
}

.warehouse-icon,
.hours-icon {
  font-size: 24rpx;
  margin-right: 8rpx;
}

.warehouse-text,
.hours-text {
  font-size: 24rpx;
  color: #6B7280;
}


/* 温馨提示卡片 */
.tips-card {
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  border-radius: 24rpx;
  padding: 24rpx;
  border: 2rpx solid #BFDBFE;
}

.tips-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.tips-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

.tips-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1E40AF;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tips-item {
  font-size: 24rpx;
  color: #1E40AF;
  line-height: 1.6;
}
</style>
