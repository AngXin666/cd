<template>
  <!-- 
    定时通知管理页面
    管理定时通知任务，支持创建、编辑、删除、取消、手动执行
    仅管理员角色可访问
  -->
  <view class="scheduled-page">
    <!-- 头部区域 -->
    <view class="header-section">
      <text class="header-title">定时通知管理</text>
      <view class="header-actions">
        <view class="status-indicator" :class="{ running: schedulerRunning }">
          <text class="status-dot"></text>
          <text class="status-text">{{ schedulerRunning ? '调度器运行中' : '调度器已停止' }}</text>
        </view>
        <view class="add-btn" @click="showCreateModal">
          <text class="add-icon">+</text>
          <text class="add-text">添加任务</text>
        </view>
      </view>
    </view>

    <!-- 状态筛选 -->
    <view class="filter-section">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-list">
          <view 
            v-for="st in statusOptions" 
            :key="st.value" 
            :class="['filter-item', { active: selectedStatus === st.value }]"
            @click="selectStatus(st.value)"
          >
            <text class="filter-text">{{ st.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 调度器状态卡片 -->
    <view class="scheduler-card">
      <view class="scheduler-info">
        <view class="info-item">
          <text class="info-label">待执行任务</text>
          <text class="info-value">{{ schedulerStatus?.pending_tasks || 0 }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">活跃任务</text>
          <text class="info-value">{{ schedulerStatus?.active_tasks || 0 }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">下次执行</text>
          <text class="info-value">{{ formatNextExecution(schedulerStatus?.next_execution) }}</text>
        </view>
      </view>
      <view class="scheduler-actions">
        <view class="action-btn trigger" @click="handleTriggerCheck">
          <text class="btn-text">立即检查</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredList.length === 0" class="empty-container">
      <text class="empty-icon">⏰</text>
      <text class="empty-text">暂无定时通知任务</text>
      <view class="empty-action" @click="showCreateModal">
        <text class="action-text">+ 添加任务</text>
      </view>
    </view>

    <!-- 任务列表 -->
    <view v-else class="task-list">
      <view v-for="task in filteredList" :key="task.id" class="task-card">
        <view class="task-header">
          <view class="task-info">
            <text class="task-name">{{ task.name }}</text>
            <view :class="['status-badge', getStatusClass(task.status)]">
              <text class="status-text">{{ getStatusLabel(task.status) }}</text>
            </view>
          </view>
          <view class="repeat-badge">
            <text class="repeat-text">{{ getRepeatLabel(task.repeat_type) }}</text>
          </view>
        </view>
        
        <view class="task-content">
          <view class="content-row">
            <text class="content-label">通知内容：</text>
            <text class="content-value">{{ task.template_name || task.title || '未设置' }}</text>
          </view>
          <view class="content-row">
            <text class="content-label">目标用户：</text>
            <text class="content-value">{{ task.target_user_count }} 人</text>
          </view>
          <view class="content-row">
            <text class="content-label">计划时间：</text>
            <text class="content-value">{{ formatDateTime(task.scheduled_time) }}</text>
          </view>
          <view v-if="task.next_execute_at" class="content-row">
            <text class="content-label">下次执行：</text>
            <text class="content-value highlight">{{ formatDateTime(task.next_execute_at) }}</text>
          </view>
          <view class="content-row">
            <text class="content-label">已执行：</text>
            <text class="content-value">{{ task.execution_count }} 次</text>
          </view>
        </view>

        <view class="task-actions">
          <view v-if="canExecute(task)" class="action-btn execute" @click="handleExecute(task)">
            <text class="btn-text">立即执行</text>
          </view>
          <view v-if="canCancel(task)" class="action-btn cancel" @click="handleCancel(task)">
            <text class="btn-text">取消</text>
          </view>
          <view class="action-btn edit" @click="showEditModal(task)">
            <text class="btn-text">编辑</text>
          </view>
          <view class="action-btn delete" @click="confirmDelete(task)">
            <text class="btn-text">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 定时通知管理页面
 * 管理定时通知任务，支持创建、编辑、删除、取消、手动执行
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getScheduledNotifications, 
  createScheduledNotification, 
  updateScheduledNotification,
  deleteScheduledNotification,
  cancelScheduledNotification,
  executeScheduledNotification,
  getSchedulerStatus,
  triggerSchedulerCheck,
  getNotificationTemplates,
  getUsers,
} from '@/api'
import type { 
  ScheduledNotification, 
  SchedulerStatusResponse,
  NotificationTemplate,
  User,
} from '@/api/types'
import { 
  ScheduledNotificationStatus, 
  RepeatType,
  UserRole,
} from '@/api/types'
import { formatDateTime } from '@/utils'

// 状态
const loading = ref(false)
const taskList = ref<ScheduledNotification[]>([])
const schedulerStatus = ref<SchedulerStatusResponse | null>(null)
const schedulerRunning = computed(() => schedulerStatus.value?.is_running ?? false)
const selectedStatus = ref<string>('')
const templates = ref<NotificationTemplate[]>([])
const users = ref<User[]>([])

// 状态选项
const statusOptions = [
  { value: '', label: '全部' },
  { value: ScheduledNotificationStatus.PENDING, label: '待执行' },
  { value: ScheduledNotificationStatus.ACTIVE, label: '执行中' },
  { value: ScheduledNotificationStatus.COMPLETED, label: '已完成' },
  { value: ScheduledNotificationStatus.CANCELLED, label: '已取消' },
  { value: ScheduledNotificationStatus.FAILED, label: '失败' },
]

// 重复类型选项
const repeatOptions = [
  { value: RepeatType.ONCE, label: '仅一次' },
  { value: RepeatType.DAILY, label: '每天' },
  { value: RepeatType.WEEKLY, label: '每周' },
  { value: RepeatType.MONTHLY, label: '每月' },
]

// 角色选项
const roleOptions = [
  { value: UserRole.DRIVER, label: '司机' },
  { value: UserRole.MANAGER, label: '车队长' },
  { value: UserRole.PEER_ADMIN, label: '调度' },
  { value: UserRole.BOSS, label: '老板' },
]

// 计算属性：筛选后的任务列表
const filteredList = computed(() => {
  if (!selectedStatus.value) return taskList.value
  return taskList.value.filter(t => t.status === selectedStatus.value)
})

onMounted(() => { 
  loadData()
})
onShow(() => { 
  loadData()
})

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    const [tasksData, statusData, templatesData, usersData] = await Promise.all([
      getScheduledNotifications(),
      getSchedulerStatus(),
      getNotificationTemplates({ is_active: true }),
      getUsers({ is_active: true }),
    ])
    taskList.value = tasksData
    schedulerStatus.value = statusData
    templates.value = templatesData
    users.value = usersData
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 选择状态筛选
 */
function selectStatus(status: string): void {
  selectedStatus.value = status
}

/**
 * 获取状态显示名称
 */
function getStatusLabel(status: ScheduledNotificationStatus): string {
  const found = statusOptions.find(s => s.value === status)
  return found ? found.label : status
}

/**
 * 获取状态样式类
 */
function getStatusClass(status: ScheduledNotificationStatus): string {
  switch (status) {
    case ScheduledNotificationStatus.PENDING: return 'pending'
    case ScheduledNotificationStatus.ACTIVE: return 'active'
    case ScheduledNotificationStatus.COMPLETED: return 'completed'
    case ScheduledNotificationStatus.CANCELLED: return 'cancelled'
    case ScheduledNotificationStatus.FAILED: return 'failed'
    default: return ''
  }
}

/**
 * 获取重复类型显示名称
 */
function getRepeatLabel(repeatType: RepeatType): string {
  const found = repeatOptions.find(r => r.value === repeatType)
  return found ? found.label : repeatType
}

/**
 * 格式化下次执行时间
 */
function formatNextExecution(dateStr: string | null | undefined): string {
  if (!dateStr) return '无'
  return formatDateTime(dateStr) || '无'
}

/**
 * 是否可以执行
 */
function canExecute(task: ScheduledNotification): boolean {
  return task.status !== ScheduledNotificationStatus.CANCELLED
}

/**
 * 是否可以取消
 */
function canCancel(task: ScheduledNotification): boolean {
  return task.status === ScheduledNotificationStatus.PENDING || 
         task.status === ScheduledNotificationStatus.ACTIVE
}

/**
 * 显示创建弹窗
 */
function showCreateModal(): void {
  uni.navigateTo({ url: '/pages/boss/scheduled/edit?mode=create' })
}

/**
 * 显示编辑弹窗
 */
function showEditModal(task: ScheduledNotification): void {
  uni.navigateTo({ url: `/pages/boss/scheduled/edit?mode=edit&id=${task.id}` })
}

/**
 * 手动执行任务
 */
async function handleExecute(task: ScheduledNotification): Promise<void> {
  uni.showModal({
    title: '确认执行',
    content: `确定要立即执行"${task.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '执行中...' })
          const result = await executeScheduledNotification(task.id)
          uni.hideLoading()
          uni.showToast({ title: result.message, icon: 'success' })
          await loadData()
        } catch (error) {
          console.error('执行失败:', error)
          uni.hideLoading()
          uni.showToast({ title: '执行失败', icon: 'none' })
        }
      }
    }
  })
}

/**
 * 取消任务
 */
async function handleCancel(task: ScheduledNotification): Promise<void> {
  uni.showModal({
    title: '确认取消',
    content: `确定要取消"${task.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '取消中...' })
          await cancelScheduledNotification(task.id)
          uni.hideLoading()
          uni.showToast({ title: '已取消', icon: 'success' })
          await loadData()
        } catch (error) {
          console.error('取消失败:', error)
          uni.hideLoading()
          uni.showToast({ title: '取消失败', icon: 'none' })
        }
      }
    }
  })
}

/**
 * 确认删除
 */
function confirmDelete(task: ScheduledNotification): void {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除"${task.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })
          await deleteScheduledNotification(task.id)
          uni.hideLoading()
          uni.showToast({ title: '删除成功', icon: 'success' })
          await loadData()
        } catch (error) {
          console.error('删除失败:', error)
          uni.hideLoading()
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

/**
 * 触发调度器检查
 */
async function handleTriggerCheck(): Promise<void> {
  try {
    uni.showLoading({ title: '检查中...' })
    await triggerSchedulerCheck()
    uni.hideLoading()
    uni.showToast({ title: '已触发检查', icon: 'success' })
    await loadData()
  } catch (error) {
    console.error('触发检查失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '触发失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.scheduled-page { min-height: 100vh; background-color: #f5f5f5; }

/* 头部区域 */
.header-section { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; background-color: #ffffff; flex-wrap: wrap; gap: 16rpx; }
.header-title { font-size: 32rpx; font-weight: bold; color: #333333; }
.header-actions { display: flex; align-items: center; gap: 16rpx; }
.status-indicator { display: flex; align-items: center; padding: 8rpx 16rpx; background-color: #f5f5f5; border-radius: 32rpx; }
.status-indicator.running { background-color: #f6ffed; }
.status-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background-color: #999999; margin-right: 8rpx; }
.status-indicator.running .status-dot { background-color: #52c41a; }
.status-text { font-size: 22rpx; color: #666666; }
.status-indicator.running .status-text { color: #52c41a; }
.add-btn { display: flex; align-items: center; padding: 12rpx 24rpx; background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%); border-radius: 8rpx; }
.add-icon { font-size: 28rpx; color: #ffffff; margin-right: 8rpx; }
.add-text { font-size: 26rpx; color: #ffffff; }

/* 状态筛选 */
.filter-section { background-color: #ffffff; padding: 16rpx 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.filter-scroll { white-space: nowrap; }
.filter-list { display: inline-flex; gap: 16rpx; }
.filter-item { padding: 12rpx 24rpx; background-color: #f5f5f5; border-radius: 32rpx; transition: all 0.3s; }
.filter-item.active { background-color: #1890ff; }
.filter-text { font-size: 26rpx; color: #666666; }
.filter-item.active .filter-text { color: #ffffff; }

/* 调度器状态卡片 */
.scheduler-card { margin: 24rpx; padding: 24rpx; background-color: #ffffff; border-radius: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
.scheduler-info { display: flex; justify-content: space-around; margin-bottom: 16rpx; }
.info-item { text-align: center; }
.info-label { font-size: 24rpx; color: #999999; display: block; margin-bottom: 8rpx; }
.info-value { font-size: 32rpx; font-weight: bold; color: #333333; }
.scheduler-actions { display: flex; justify-content: center; }
.action-btn.trigger { padding: 12rpx 32rpx; background-color: #e6f7ff; border-radius: 8rpx; }
.action-btn.trigger .btn-text { color: #1890ff; font-size: 26rpx; }

/* 加载和空状态 */
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }
.empty-container { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; margin-bottom: 32rpx; }
.empty-action { padding: 16rpx 48rpx; background-color: #1890ff; border-radius: 8rpx; }
.action-text { font-size: 28rpx; color: #ffffff; }

/* 任务列表 */
.task-list { padding: 0 24rpx 24rpx; }
.task-card { background-color: #ffffff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }

/* 任务头部 */
.task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.task-info { display: flex; align-items: center; flex: 1; }
.task-name { font-size: 30rpx; font-weight: bold; color: #333333; margin-right: 12rpx; }
.status-badge { padding: 4rpx 12rpx; border-radius: 8rpx; }
.status-badge.pending { background-color: #fff7e6; }
.status-badge.pending .status-text { color: #fa8c16; font-size: 22rpx; }
.status-badge.active { background-color: #e6f7ff; }
.status-badge.active .status-text { color: #1890ff; font-size: 22rpx; }
.status-badge.completed { background-color: #f6ffed; }
.status-badge.completed .status-text { color: #52c41a; font-size: 22rpx; }
.status-badge.cancelled { background-color: #f5f5f5; }
.status-badge.cancelled .status-text { color: #999999; font-size: 22rpx; }
.status-badge.failed { background-color: #fff1f0; }
.status-badge.failed .status-text { color: #ff4d4f; font-size: 22rpx; }
.repeat-badge { padding: 4rpx 12rpx; background-color: #f0f5ff; border-radius: 8rpx; }
.repeat-text { font-size: 22rpx; color: #2f54eb; }

/* 任务内容 */
.task-content { padding: 16rpx 0; border-top: 1rpx solid #f0f0f0; border-bottom: 1rpx solid #f0f0f0; }
.content-row { display: flex; margin-bottom: 8rpx; }
.content-row:last-child { margin-bottom: 0; }
.content-label { font-size: 26rpx; color: #999999; width: 140rpx; flex-shrink: 0; }
.content-value { font-size: 26rpx; color: #333333; flex: 1; }
.content-value.highlight { color: #1890ff; font-weight: bold; }

/* 任务操作 */
.task-actions { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 16rpx; flex-wrap: wrap; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; }
.action-btn.execute { background-color: #f6ffed; }
.action-btn.execute .btn-text { color: #52c41a; font-size: 26rpx; }
.action-btn.cancel { background-color: #fff7e6; }
.action-btn.cancel .btn-text { color: #fa8c16; font-size: 26rpx; }
.action-btn.edit { background-color: #e6f7ff; }
.action-btn.edit .btn-text { color: #1890ff; font-size: 26rpx; }
.action-btn.delete { background-color: #fff1f0; }
.action-btn.delete .btn-text { color: #ff4d4f; font-size: 26rpx; }
</style>
