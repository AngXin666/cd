<template>
  <!-- 
    请假申请页面
    支持快捷请假和补请假两种模式
    Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10
  -->
  <view class="apply-page">
    <!-- 标题 -->
    <view class="page-header">
      <text class="page-title">请假申请</text>
    </view>

    <!-- 模式切换 - Requirements: 11.1 -->
    <view class="mode-switch">
      <view 
        :class="['mode-btn', { active: mode === 'quick' }]"
        @click="handleModeChange('quick')"
      >
        <text class="mode-text">快捷请假</text>
      </view>
      <view 
        :class="['mode-btn', { active: mode === 'makeup' }]"
        @click="handleModeChange('makeup')"
      >
        <text class="mode-text">补请假</text>
      </view>
    </view>

    <!-- 月度请假统计 - Requirements: 11.6, 11.7 -->
    <view v-if="monthlyLimit > 0" class="monthly-stats-card">
      <view class="stats-header">
        <text class="stats-icon">📊</text>
        <text class="stats-title">本月请假统计</text>
      </view>
      
      <view class="stats-grid">
        <view class="stats-item">
          <text class="stats-label">已批准天数</text>
          <text class="stats-value green">{{ monthlyApprovedDays }} 天</text>
        </view>
        <view class="stats-item">
          <text class="stats-label">待审批天数</text>
          <text class="stats-value orange">{{ monthlyPendingDays }} 天</text>
        </view>
        <view class="stats-item">
          <text class="stats-label">本次申请天数</text>
          <text class="stats-value blue">{{ leaveDays }} 天</text>
        </view>
      </view>

      <view class="stats-total">
        <text class="total-label">累计天数 / 月度上限</text>
        <text :class="['total-value', { exceeded: isExceeded }]">
          {{ totalMonthlyDays }} / {{ monthlyLimit }} 天
        </text>
      </view>
      
      <!-- 超限警告 -->
      <view v-if="isExceeded" class="exceeded-warning">
        <text class="warning-icon">⚠️</text>
        <text class="warning-text">
          本月请假天数已超过上限，无法提交申请。请调整请假天数或联系管理员。
        </text>
      </view>
    </view>

    <!-- 日期调整提示 - Requirements: 11.8 -->
    <view v-if="mode === 'quick' && showDateAdjustTip" class="date-adjust-tip">
      <text class="tip-icon">📅</text>
      <view class="tip-content">
        <text class="tip-title">日期已自动调整</text>
        <text class="tip-desc">
          由于您有已批准或待审批的请假，系统已自动将开始日期调整为 {{ earliestAvailableDate }}（最早可用日期）
        </text>
      </view>
    </view>

    <!-- 表单内容 -->
    <view class="form-card">
      <!-- 仓库选择器 - Requirements: 11.5 -->
      <view v-if="warehouses.length > 1" class="form-item">
        <text class="form-label">选择仓库 *</text>
        <picker 
          mode="selector" 
          :range="warehouseNames" 
          :value="warehouseIndex"
          @change="handleWarehouseChange"
        >
          <view class="picker-box">
            <text class="picker-value">{{ selectedWarehouseName || '请选择仓库' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <text class="form-hint error">请选择您要请假的仓库</text>
      </view>

      <!-- 请假类型 -->
      <view class="form-item">
        <text class="form-label">请假类型</text>
        <picker 
          mode="selector" 
          :range="leaveTypeLabels" 
          :value="leaveTypeIndex"
          @change="handleLeaveTypeChange"
        >
          <view class="picker-box">
            <text class="picker-value">{{ selectedLeaveTypeLabel }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <!-- 快捷请假模式 - Requirements: 11.2, 11.3 -->
      <template v-if="mode === 'quick'">
        <!-- 快捷日期选择 -->
        <view class="form-item">
          <text class="form-label">快捷选择</text>
          <view class="quick-date-btns">
            <view 
              :class="['quick-btn', { active: isQuickDateSelected('tomorrow') }]"
              @click="selectQuickDate('tomorrow')"
            >
              <text class="quick-btn-text">明天</text>
            </view>
            <view 
              :class="['quick-btn', { active: isQuickDateSelected('dayAfterTomorrow') }]"
              @click="selectQuickDate('dayAfterTomorrow')"
            >
              <text class="quick-btn-text">后天</text>
            </view>
          </view>
          <text class="form-hint">点击快捷按钮快速选择日期</text>
        </view>

        <!-- 请假天数选择器 -->
        <view class="form-item">
          <text class="form-label">请假天数</text>
          <picker 
            mode="selector" 
            :range="daysOptions" 
            :value="quickDays - 1"
            @change="handleQuickDaysChange"
          >
            <view class="picker-box">
              <text class="picker-value">{{ quickDays }}天</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
          <text class="form-hint">
            {{ monthlyLimit > 0 ? `根据剩余额度，最多可选${availableQuickDays}天` : `最多可选${availableQuickDays}天` }}
          </text>
        </view>

        <!-- 起始日期 -->
        <view class="form-item">
          <text class="form-label">起始日期</text>
          <picker 
            mode="date" 
            :value="startDate" 
            :start="tomorrowDate"
            @change="handleStartDateChange"
          >
            <view class="picker-box">
              <text class="picker-value">{{ startDate || '请选择' }}</text>
              <text class="picker-arrow">📅</text>
            </view>
          </picker>
          <text class="form-hint">可选明天及之后的日期</text>
        </view>

        <!-- 结束日期 -->
        <view class="form-item">
          <text class="form-label">结束日期</text>
          <picker 
            mode="date" 
            :value="endDate" 
            :start="startDate"
            @change="handleEndDateChange"
          >
            <view class="picker-box">
              <text class="picker-value">{{ endDate || '请选择' }}</text>
              <text class="picker-arrow">📅</text>
            </view>
          </picker>
          <text class="form-hint">自动计算或手动调整</text>
        </view>
      </template>

      <!-- 补请假模式 - Requirements: 11.4 -->
      <template v-else>
        <!-- 开始日期 -->
        <view class="form-item">
          <text class="form-label">开始日期</text>
          <picker 
            mode="date" 
            :value="startDate" 
            :end="todayDate"
            @change="handleStartDateChange"
          >
            <view class="picker-box">
              <text class="picker-value">{{ startDate || '请选择开始日期' }}</text>
              <text class="picker-arrow">📅</text>
            </view>
          </picker>
          <text class="form-hint">可选今天及之前的日期</text>
        </view>

        <!-- 结束日期 -->
        <view class="form-item">
          <text class="form-label">结束日期</text>
          <picker 
            mode="date" 
            :value="endDate" 
            :start="startDate"
            :end="todayDate"
            @change="handleEndDateChange"
          >
            <view class="picker-box">
              <text class="picker-value">{{ endDate || '请选择结束日期' }}</text>
              <text class="picker-arrow">📅</text>
            </view>
          </picker>
        </view>
      </template>

      <!-- 请假天数显示 -->
      <view v-if="leaveDays > 0" class="days-display">
        <text class="days-icon">📆</text>
        <text class="days-text">请假天数：{{ leaveDays }} 天</text>
      </view>

      <!-- 请假事由 -->
      <view class="form-item">
        <text class="form-label">请假事由</text>
        <textarea 
          class="reason-textarea"
          v-model="reason"
          placeholder="请详细说明请假原因"
          maxlength="500"
        />
        <text class="char-count">{{ reason.length }}/500</text>
      </view>
    </view>

    <!-- 按钮组 - Requirements: 11.9, 11.10 -->
    <view class="button-group">
      <view 
        :class="['btn', 'draft-btn', { disabled: submitting }]"
        @click="handleSaveDraft"
      >
        <text class="btn-text">{{ submitting ? '保存中...' : '保存草稿' }}</text>
      </view>
      <view 
        :class="['btn', 'submit-btn', { disabled: !canSubmit || submitting }]"
        @click="handleSubmit"
      >
        <text class="btn-text">{{ submitting ? '提交中...' : '提交申请' }}</text>
      </view>
    </view>
  </view>
</template>


<script setup lang="ts">
/**
 * 请假申请页面
 * 支持快捷请假和补请假两种模式
 * 
 * @module pages/driver/leave/apply
 * @requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10
 */

import { ref, computed, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { 
  getWarehouses, 
  getLeaveApplications, 
  createLeaveApplication,
  getLeaveApplication,
} from '@/api'
import type { Warehouse, LeaveApplication } from '@/api/types'
import { LeaveStatus, LeaveType } from '@/api/types'
import { useUserStore } from '@/store/user'
import { 
  getLocalDateString, 
  getNextDay,
} from '@/utils/date'
import { navigateBack } from '@/utils'

// ==================== 类型定义 ====================

/** 请假模式类型 */
type LeaveMode = 'quick' | 'makeup'

/** 请假类型选项 */
interface LeaveTypeOption {
  label: string
  value: string
}

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 常量 ====================

/** 请假类型选项列表 */
const leaveTypeOptions: LeaveTypeOption[] = [
  { label: '事假', value: 'personal' },
  { label: '病假', value: 'sick' },
  { label: '年假', value: 'annual' },
  { label: '其他', value: 'other' },
]

/** 默认月度请假上限 */
const DEFAULT_MONTHLY_LIMIT = 3

/** 默认最大请假天数 */
const DEFAULT_MAX_LEAVE_DAYS = 7

// ==================== 状态 ====================

/** 请假模式 */
const mode = ref<LeaveMode>('quick')

/** 请假类型 */
const leaveType = ref<string>('personal')

/** 快捷请假天数 */
const quickDays = ref(1)

/** 开始日期 */
const startDate = ref<string>('')

/** 结束日期 */
const endDate = ref<string>('')

/** 请假事由 */
const reason = ref<string>('')

/** 提交状态 */
const submitting = ref(false)

/** 选中的仓库 ID */
const warehouseId = ref<number | null>(null)

/** 草稿 ID（编辑模式） */
const draftId = ref<number | null>(null)

/** 是否为编辑模式 */
const isEditMode = ref(false)

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 月度已批准天数 */
const monthlyApprovedDays = ref(0)

/** 月度待审批天数 */
const monthlyPendingDays = ref(0)

/** 月度请假上限 */
const monthlyLimit = ref(DEFAULT_MONTHLY_LIMIT)

/** 最大请假天数 */
const maxLeaveDays = ref(DEFAULT_MAX_LEAVE_DAYS)

/** 已批准/待审批的请假记录 */
const approvedLeaves = ref<LeaveApplication[]>([])

/** 最早可用的请假日期 */
const earliestAvailableDate = ref<string>('')

// ==================== 计算属性 ====================

/**
 * 今天的日期字符串
 */
const todayDate = computed(() => getLocalDateString())

/**
 * 明天的日期字符串
 */
const tomorrowDate = computed(() => getNextDay(todayDate.value))

/**
 * 后天的日期字符串
 */
const dayAfterTomorrowDate = computed(() => getNextDay(tomorrowDate.value))

/**
 * 请假天数
 */
const leaveDays = computed(() => {
  if (!startDate.value || !endDate.value) return 0
  
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  const diff = end.getTime() - start.getTime()
  
  if (diff < 0) return 0
  
  // 计算天数（包含首尾两天）
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
})

/**
 * 本月累计天数
 */
const totalMonthlyDays = computed(() => {
  return monthlyApprovedDays.value + monthlyPendingDays.value + leaveDays.value
})

/**
 * 是否超过月度上限
 */
const isExceeded = computed(() => {
  return monthlyLimit.value > 0 && totalMonthlyDays.value > monthlyLimit.value
})

/**
 * 实际可用的快捷天数上限
 */
const availableQuickDays = computed(() => {
  if (monthlyLimit.value > 0) {
    const remainingDays = monthlyLimit.value - monthlyApprovedDays.value - monthlyPendingDays.value
    return Math.max(1, Math.min(remainingDays, maxLeaveDays.value))
  }
  return maxLeaveDays.value
})

/**
 * 天数选项列表
 */
const daysOptions = computed(() => {
  return Array.from({ length: availableQuickDays.value }, (_, i) => `${i + 1}天`)
})

/**
 * 仓库名称列表
 */
const warehouseNames = computed(() => {
  return warehouses.value.map(w => w.name)
})

/**
 * 当前选中的仓库索引
 */
const warehouseIndex = computed(() => {
  if (!warehouseId.value) return 0
  return warehouses.value.findIndex(w => w.id === warehouseId.value)
})

/**
 * 当前选中的仓库名称
 */
const selectedWarehouseName = computed(() => {
  if (!warehouseId.value) return ''
  const warehouse = warehouses.value.find(w => w.id === warehouseId.value)
  return warehouse?.name || ''
})

/**
 * 请假类型标签列表
 */
const leaveTypeLabels = computed(() => {
  return leaveTypeOptions.map(t => t.label)
})

/**
 * 当前选中的请假类型索引
 */
const leaveTypeIndex = computed(() => {
  return leaveTypeOptions.findIndex(t => t.value === leaveType.value)
})

/**
 * 当前选中的请假类型标签
 */
const selectedLeaveTypeLabel = computed(() => {
  const option = leaveTypeOptions.find(t => t.value === leaveType.value)
  return option?.label || '事假'
})

/**
 * 是否显示日期调整提示
 */
const showDateAdjustTip = computed(() => {
  return approvedLeaves.value.length > 0 && earliestAvailableDate.value !== tomorrowDate.value
})

/**
 * 是否可以提交
 */
const canSubmit = computed(() => {
  // 必须选择仓库（如果有多个仓库）
  if (warehouses.value.length > 1 && !warehouseId.value) return false
  
  // 必须选择日期
  if (!startDate.value || !endDate.value) return false
  
  // 请假天数必须大于 0
  if (leaveDays.value <= 0) return false
  
  // 不能超过月度上限
  if (isExceeded.value) return false
  
  // 不能正在提交
  if (submitting.value) return false
  
  return true
})

// ==================== 生命周期 ====================

onLoad((options) => {
  // 检查是否为编辑模式
  if (options?.draftId) {
    draftId.value = Number(options.draftId)
    isEditMode.value = true
    loadDraft(draftId.value)
  }
  
  // 检查是否指定了类型（离职申请）
  if (options?.type === 'resign') {
    leaveType.value = 'resign'
  }
})

onMounted(() => {
  loadData()
})

// ==================== 监听器 ====================

/**
 * 监听快捷请假天数变化，自动计算结束日期
 */
watch([() => mode.value, () => quickDays.value, () => startDate.value], () => {
  if (mode.value === 'quick' && startDate.value) {
    endDate.value = calculateEndDate(startDate.value, quickDays.value)
  }
})

/**
 * 监听快捷天数上限变化，自动调整当前选择
 */
watch(availableQuickDays, (newMax) => {
  if (quickDays.value > newMax) {
    quickDays.value = newMax
  }
})

// ==================== 方法 ====================

/**
 * 计算结束日期
 * 
 * @param start - 开始日期
 * @param days - 天数
 * @returns 结束日期字符串
 */
function calculateEndDate(start: string, days: number): string {
  const startDateObj = new Date(start)
  startDateObj.setDate(startDateObj.getDate() + days - 1)
  
  const year = startDateObj.getFullYear()
  const month = String(startDateObj.getMonth() + 1).padStart(2, '0')
  const day = String(startDateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 计算两个日期之间的天数
 * 
 * @param start - 开始日期
 * @param end - 结束日期
 * @returns 天数
 */
function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  if (endTime < startTime) return 0
  const diffTime = endTime - startTime
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * 获取最早可用的请假日期
 * 跳过已批准/待审批的请假日期
 * 
 * @param baseDate - 基准日期（默认明天）
 * @returns 最早可用日期
 */
function getEarliestAvailableLeaveDate(baseDate: string): string {
  let currentDate = baseDate
  
  // 最多检查 30 天
  for (let i = 0; i < 30; i++) {
    let isAvailable = true
    
    // 检查当前日期是否与已批准/待审批的请假重叠
    for (const leave of approvedLeaves.value) {
      if (currentDate >= leave.start_date && currentDate <= leave.end_date) {
        isAvailable = false
        break
      }
    }
    
    if (isAvailable) {
      return currentDate
    }
    
    // 移动到下一天
    currentDate = getNextDay(currentDate)
  }
  
  return baseDate
}

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  if (!userStore.user) return
  if (isEditMode.value) return
  
  try {
    // 获取仓库列表
    const allWarehouses = await getWarehouses({ is_active: true })
    warehouses.value = allWarehouses
    
    if (allWarehouses.length === 0) {
      uni.showToast({
        title: '暂无可用仓库',
        icon: 'none',
        duration: 2000,
      })
      return
    }
    
    // 如果只有一个仓库，自动选择
    if (allWarehouses.length === 1) {
      warehouseId.value = allWarehouses[0].id
    } else {
      // 尝试读取上次选择的仓库
      try {
        const lastWarehouseId = uni.getStorageSync(`leave_application_last_warehouse_${userStore.user.id}`)
        if (lastWarehouseId) {
          const isAvailable = allWarehouses.some(w => w.id === lastWarehouseId)
          if (isAvailable) {
            warehouseId.value = lastWarehouseId
          }
        }
      } catch (_error) {
        // 忽略存储读取错误
      }
    }
    
    // 获取当月请假统计
    await loadMonthlyStats()
    
    // 获取已批准/待审批的请假记录
    await loadApprovedLeaves()
    
    // 计算最早可用的请假日期
    earliestAvailableDate.value = getEarliestAvailableLeaveDate(tomorrowDate.value)
    
    // 初始化快捷请假的日期
    startDate.value = earliestAvailableDate.value
    endDate.value = earliestAvailableDate.value
    
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.showToast({
      title: '加载数据失败',
      icon: 'none',
    })
  }
}

/**
 * 加载月度请假统计
 */
async function loadMonthlyStats(): Promise<void> {
  if (!userStore.user) return
  
  try {
    // 获取当月的日期范围
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    // 获取当前用户的请假申请
    const applications = await getLeaveApplications({
      limit: 100,
    })
    
    // 计算已批准天数
    let approvedDays = 0
    let pendingDays = 0
    
    for (const app of applications) {
      // 只统计请假类型（不包括离职）
      if (app.leave_type === LeaveType.RESIGN) continue
      
      // 计算与本月重叠的天数
      const overlapStart = app.start_date > firstDay ? app.start_date : firstDay
      const overlapEnd = app.end_date < lastDayStr ? app.end_date : lastDayStr
      
      if (overlapStart <= overlapEnd) {
        const days = calculateDays(overlapStart, overlapEnd)
        
        if (app.status === LeaveStatus.APPROVED) {
          approvedDays += days
        } else if (app.status === LeaveStatus.PENDING) {
          pendingDays += days
        }
      }
    }
    
    monthlyApprovedDays.value = approvedDays
    monthlyPendingDays.value = pendingDays
    
  } catch (error) {
    console.error('加载月度统计失败:', error)
  }
}

/**
 * 加载已批准/待审批的请假记录
 */
async function loadApprovedLeaves(): Promise<void> {
  if (!userStore.user) return
  
  try {
    // 获取当前用户的请假申请
    const applications = await getLeaveApplications({
      limit: 100,
    })
    
    // 筛选已批准和待审批的请假（不包括离职）
    approvedLeaves.value = applications.filter(
      app => app.leave_type !== LeaveType.RESIGN && 
             (app.status === LeaveStatus.APPROVED || app.status === LeaveStatus.PENDING)
    )
    
  } catch (error) {
    console.error('加载请假记录失败:', error)
  }
}

/**
 * 加载草稿
 * 
 * @param id - 草稿 ID
 */
async function loadDraft(id: number): Promise<void> {
  try {
    const data = await getLeaveApplication(id)
    
    if (!data) {
      uni.showToast({ title: '加载草稿失败', icon: 'none' })
      return
    }
    
    // 填充表单数据
    leaveType.value = data.leave_type === LeaveType.RESIGN ? 'resign' : 'personal'
    startDate.value = data.start_date || ''
    endDate.value = data.end_date || ''
    reason.value = data.reason || ''
    
    // 判断是快捷请假还是补请假
    if (data.start_date === tomorrowDate.value) {
      mode.value = 'quick'
      quickDays.value = calculateDays(data.start_date, data.end_date || '')
    } else {
      mode.value = 'makeup'
    }
    
    // 加载仓库列表
    await loadData()
    
  } catch (error) {
    console.error('加载草稿失败:', error)
    uni.showToast({ title: '加载草稿失败', icon: 'none' })
  }
}

/**
 * 切换请假模式
 * 
 * @param newMode - 新模式
 */
function handleModeChange(newMode: LeaveMode): void {
  mode.value = newMode
  
  if (newMode === 'quick') {
    // 切换到快捷请假，使用最早可用日期
    const availableDate = earliestAvailableDate.value || tomorrowDate.value
    startDate.value = availableDate
    quickDays.value = 1
    endDate.value = calculateEndDate(availableDate, 1)
  } else {
    // 切换到补请假，重置为今天
    startDate.value = todayDate.value
    endDate.value = todayDate.value
  }
}

/**
 * 检查是否选中了快捷日期
 * 
 * @param type - 日期类型
 * @returns 是否选中
 */
function isQuickDateSelected(type: 'tomorrow' | 'dayAfterTomorrow'): boolean {
  if (type === 'tomorrow') {
    return startDate.value === tomorrowDate.value
  }
  return startDate.value === dayAfterTomorrowDate.value
}

/**
 * 选择快捷日期
 * 
 * @param type - 日期类型
 */
function selectQuickDate(type: 'tomorrow' | 'dayAfterTomorrow'): void {
  const date = type === 'tomorrow' ? tomorrowDate.value : dayAfterTomorrowDate.value
  startDate.value = date
  endDate.value = calculateEndDate(date, quickDays.value)
}

/**
 * 处理仓库选择变化
 * 
 * @param e - 事件对象
 */
function handleWarehouseChange(e: any): void {
  const index = e.detail.value
  const selectedWarehouse = warehouses.value[index]
  warehouseId.value = selectedWarehouse.id
  
  // 保存用户的选择到本地存储
  if (userStore.user) {
    try {
      uni.setStorageSync(`leave_application_last_warehouse_${userStore.user.id}`, selectedWarehouse.id)
    } catch (_error) {
      // 忽略存储错误
    }
  }
}

/**
 * 处理请假类型变化
 * 
 * @param e - 事件对象
 */
function handleLeaveTypeChange(e: any): void {
  const index = e.detail.value
  leaveType.value = leaveTypeOptions[index].value
}

/**
 * 处理快捷天数变化
 * 
 * @param e - 事件对象
 */
function handleQuickDaysChange(e: any): void {
  const index = e.detail.value
  quickDays.value = index + 1
}

/**
 * 处理开始日期变化
 * 
 * @param e - 事件对象
 */
function handleStartDateChange(e: any): void {
  startDate.value = e.detail.value
}

/**
 * 处理结束日期变化
 * 
 * @param e - 事件对象
 */
function handleEndDateChange(e: any): void {
  const newEndDate = e.detail.value
  endDate.value = newEndDate
  
  // 快捷请假模式下，用户手动修改结束日期时，重新计算天数
  if (mode.value === 'quick' && startDate.value && newEndDate) {
    const days = calculateDays(startDate.value, newEndDate)
    quickDays.value = days
  }
}

/**
 * 保存草稿
 * Requirements: 11.10
 */
async function handleSaveDraft(): Promise<void> {
  if (!userStore.user) {
    uni.showToast({ title: '用户信息错误', icon: 'none' })
    return
  }
  
  if (warehouses.value.length > 1 && !warehouseId.value) {
    uni.showToast({ title: '请选择仓库', icon: 'none' })
    return
  }
  
  submitting.value = true
  
  try {
    // 当前后端可能不支持草稿状态，直接创建申请
    // 未来可以扩展为真正的草稿功能
    uni.showToast({
      title: '草稿功能开发中',
      icon: 'none',
    })
  } catch (error: any) {
    console.error('保存草稿失败:', error)
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}

/**
 * 提交申请
 * Requirements: 11.9
 */
async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  
  if (!userStore.user) {
    uni.showToast({ title: '用户信息错误', icon: 'none' })
    return
  }
  
  if (warehouses.value.length > 1 && !warehouseId.value) {
    uni.showToast({ title: '请选择仓库', icon: 'none' })
    return
  }
  
  if (!startDate.value || !endDate.value) {
    uni.showToast({ title: '请选择请假时间', icon: 'none' })
    return
  }
  
  if (new Date(startDate.value) > new Date(endDate.value)) {
    uni.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
    return
  }
  
  // 校验月度请假天数上限
  if (isExceeded.value) {
    uni.showToast({
      title: `本月请假天数已超限`,
      icon: 'none',
      duration: 3000,
    })
    return
  }
  
  // 生成确认提示信息
  const confirmMessage = `确定要提交 ${startDate.value} 至 ${endDate.value} 的请假申请吗？\n\n请假天数：${leaveDays.value}天`
  
  // 显示确认对话框
  uni.showModal({
    title: '确认提交',
    content: confirmMessage,
    confirmText: '确定提交',
    cancelText: '再想想',
    success: async (res) => {
      if (res.confirm) {
        await doSubmit()
      }
    },
  })
}

/**
 * 执行提交
 */
async function doSubmit(): Promise<void> {
  submitting.value = true
  
  try {
    await createLeaveApplication({
      leave_type: LeaveType.LEAVE,
      start_date: startDate.value,
      end_date: endDate.value,
      reason: reason.value.trim() || undefined,
    })
    
    uni.showToast({
      title: '提交成功',
      icon: 'success',
    })
    
    // 延迟返回
    setTimeout(() => {
      navigateBack()
    }, 1500)
    
  } catch (error: any) {
    console.error('提交失败:', error)
    uni.showToast({
      title: error.message || '提交失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}
</script>


<style lang="scss" scoped>
/**
 * 请假申请页面样式
 */

.apply-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #eff6ff, #dbeafe);
  padding: 24rpx;
  padding-bottom: 200rpx;
}

/* 页面标题 */
.page-header {
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #1f2937;
}

/* 模式切换 */
.mode-switch {
  display: flex;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.mode-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  border-radius: 12rpx;
  background-color: #e5e7eb;
  transition: all 0.2s;
  
  &.active {
    background-color: #1e3a8a;
    
    .mode-text {
      color: #ffffff;
    }
  }
}

.mode-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #6b7280;
}

/* 月度统计卡片 */
.monthly-stats-card {
  background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid #c7d2fe;
}

.stats-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.stats-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.stats-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1f2937;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-label {
  font-size: 26rpx;
  color: #4b5563;
}

.stats-value {
  font-size: 26rpx;
  font-weight: 500;
  
  &.green {
    color: #059669;
  }
  
  &.orange {
    color: #d97706;
  }
  
  &.blue {
    color: #2563eb;
  }
}

.stats-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 2rpx solid #c7d2fe;
}

.total-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #374151;
}

.total-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #2563eb;
  
  &.exceeded {
    color: #dc2626;
  }
}

.exceeded-warning {
  display: flex;
  align-items: flex-start;
  background-color: #fef2f2;
  border: 2rpx solid #fecaca;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-top: 16rpx;
}

.warning-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.warning-text {
  font-size: 24rpx;
  color: #b91c1c;
  flex: 1;
}

/* 日期调整提示 */
.date-adjust-tip {
  display: flex;
  align-items: flex-start;
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 2rpx solid #fed7aa;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.tip-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #9a3412;
  display: block;
  margin-bottom: 8rpx;
}

.tip-desc {
  font-size: 24rpx;
  color: #c2410c;
}

/* 表单卡片 */
.form-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 28rpx;
  color: #374151;
  display: block;
  margin-bottom: 12rpx;
}

.picker-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 2rpx solid #d1d5db;
  border-radius: 12rpx;
  padding: 24rpx;
  background-color: #ffffff;
}

.picker-value {
  font-size: 28rpx;
  color: #1f2937;
}

.picker-arrow {
  font-size: 24rpx;
  color: #9ca3af;
}

.form-hint {
  font-size: 22rpx;
  color: #9ca3af;
  display: block;
  margin-top: 8rpx;
  
  &.error {
    color: #ef4444;
  }
}

/* 快捷日期按钮 */
.quick-date-btns {
  display: flex;
  gap: 24rpx;
}

.quick-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  border-radius: 12rpx;
  background-color: #e5e7eb;
  transition: all 0.2s;
  
  &.active {
    background-color: #1e3a8a;
    
    .quick-btn-text {
      color: #ffffff;
    }
  }
}

.quick-btn-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #6b7280;
}

/* 请假天数显示 */
.days-display {
  display: flex;
  align-items: center;
  background-color: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.days-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.days-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #1e40af;
}

/* 请假事由 */
.reason-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx;
  border: 2rpx solid #d1d5db;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1f2937;
  box-sizing: border-box;
}

.char-count {
  font-size: 22rpx;
  color: #9ca3af;
  text-align: right;
  display: block;
  margin-top: 8rpx;
}

/* 按钮组 */
.button-group {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.btn {
  flex: 1;
  text-align: center;
  padding: 28rpx;
  border-radius: 12rpx;
  transition: all 0.2s;
  
  &.draft-btn {
    background-color: #7c3aed;
    
    &.disabled {
      opacity: 0.5;
    }
  }
  
  &.submit-btn {
    background-color: #1e3a8a;
    
    &.disabled {
      opacity: 0.5;
    }
  }
}

.btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
