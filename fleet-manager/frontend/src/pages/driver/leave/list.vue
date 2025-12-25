<template>
  <!-- 
    请假记录页面
    显示本月数据统计、快捷操作按钮、请假/离职/草稿箱标签切换
    Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
  -->
  <view class="leave-list-page">
    <!-- 欢迎卡片 -->
    <view class="welcome-card">
      <text class="welcome-title">请假与离职</text>
      <text class="welcome-subtitle">欢迎，{{ userName }}</text>
    </view>

    <!-- 数据仪表盘 - Requirements: 10.1 -->
    <view class="dashboard-section">
      <view class="section-header">
        <text class="section-icon">📊</text>
        <text class="section-title">本月数据统计</text>
      </view>
      
      <view v-if="statsLoading" class="dashboard-loading">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else class="dashboard-card">
        <view class="dashboard-grid">
          <!-- 本月出勤天数 -->
          <view class="dashboard-item green">
            <text class="dashboard-icon">📅</text>
            <text class="dashboard-label">本月出勤</text>
            <text class="dashboard-value">{{ stats.attendanceDays }}</text>
            <text class="dashboard-unit">天</text>
          </view>
          
          <!-- 本月请假天数 -->
          <view class="dashboard-item orange">
            <text class="dashboard-icon">🏖️</text>
            <text class="dashboard-label">本月请假</text>
            <text class="dashboard-value">{{ stats.leaveDays }}</text>
            <text class="dashboard-unit">天</text>
          </view>
          
          <!-- 剩余额度 -->
          <view class="dashboard-item blue">
            <text class="dashboard-icon">📝</text>
            <text class="dashboard-label">剩余额度</text>
            <text class="dashboard-value">{{ stats.remainingDays }}</text>
            <text class="dashboard-unit">天</text>
          </view>
        </view>
        
        <!-- 月度上限提示 -->
        <view v-if="stats.monthlyLimit > 0" class="monthly-limit-tip">
          <text class="limit-text">月度请假上限：{{ stats.monthlyLimit }} 天</text>
        </view>
      </view>
    </view>

    <!-- 快捷操作按钮 - Requirements: 10.2, 10.3, 10.4 -->
    <view class="quick-actions">
      <view 
        :class="['action-btn', 'leave-btn', { disabled: hasPendingLeave }]"
        @click="handleApplyLeave"
      >
        <text class="action-icon">{{ hasPendingLeave ? '⏳' : '📅' }}</text>
        <text class="action-text">{{ hasPendingLeave ? '请假审批中' : '申请请假' }}</text>
      </view>
      
      <view 
        :class="['action-btn', 'resign-btn', { disabled: hasPendingResignation }]"
        @click="handleApplyResignation"
      >
        <text class="action-icon">{{ hasPendingResignation ? '⏳' : '👋' }}</text>
        <text class="action-text">{{ hasPendingResignation ? '离职审批中' : '申请离职' }}</text>
      </view>
    </view>

    <!-- 标签切换 - Requirements: 10.5 -->
    <view class="tab-section">
      <view 
        :class="['tab-item', { active: activeTab === 'leave' }]"
        @click="activeTab = 'leave'"
      >
        <text class="tab-text">请假申请</text>
      </view>
      <view 
        :class="['tab-item', 'orange', { active: activeTab === 'resignation' }]"
        @click="activeTab = 'resignation'"
      >
        <text class="tab-text">离职申请</text>
      </view>
      <view 
        :class="['tab-item', 'purple', { active: activeTab === 'draft' }]"
        @click="activeTab = 'draft'"
      >
        <text class="tab-text">草稿箱{{ draftCount > 0 ? ` (${draftCount})` : '' }}</text>
      </view>
    </view>

    <!-- 请假申请列表 - Requirements: 10.6 -->
    <view v-if="activeTab === 'leave'" class="list-section">
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="leaveApplications.length === 0" class="empty-container">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无请假申请记录</text>
      </view>
      
      <view v-else class="record-list">
        <view 
          v-for="app in leaveApplications" 
          :key="app.id" 
          class="record-card"
          @click="handleViewDetail(app.id, 'leave')"
        >
          <!-- 头部：类型和状态 -->
          <view class="record-header">
            <view class="type-info">
              <text class="type-icon">📅</text>
              <text class="type-text">{{ getLeaveTypeText(app.leave_type) }}</text>
            </view>
            <view :class="['status-tag', app.status]">
              <text class="status-text">{{ getStatusText(app.status) }}</text>
            </view>
          </view>
          
          <!-- 内容 -->
          <view class="record-content">
            <view class="info-row">
              <text class="info-label">请假时间：</text>
              <text class="info-value">
                {{ formatDate(app.start_date) }} 至 {{ formatDate(app.end_date) }}
                （共{{ calculateDays(app.start_date, app.end_date) }}天）
              </text>
            </view>
            <view class="info-row">
              <text class="info-label">请假事由：</text>
              <text class="info-value">{{ app.reason || '无' }}</text>
            </view>
            <view v-if="app.approve_remark" class="info-row">
              <text class="info-label">审批意见：</text>
              <text class="info-value">{{ app.approve_remark }}</text>
            </view>
          </view>
          
          <!-- 底部 -->
          <view class="record-footer">
            <text class="time-text">申请时间：{{ formatDate(app.created_at) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 离职申请列表 - Requirements: 10.7 -->
    <view v-if="activeTab === 'resignation'" class="list-section">
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="resignationApplications.length === 0" class="empty-container">
        <text class="empty-icon">👋</text>
        <text class="empty-text">暂无离职申请记录</text>
      </view>
      
      <view v-else class="record-list">
        <view 
          v-for="app in resignationApplications" 
          :key="app.id" 
          class="record-card resignation"
          @click="handleViewDetail(app.id, 'resignation')"
        >
          <!-- 头部：类型和状态 -->
          <view class="record-header">
            <view class="type-info">
              <text class="type-icon">👋</text>
              <text class="type-text">离职申请</text>
            </view>
            <view :class="['status-tag', app.status]">
              <text class="status-text">{{ getStatusText(app.status) }}</text>
            </view>
          </view>
          
          <!-- 内容 -->
          <view class="record-content">
            <view class="info-row">
              <text class="info-label">预计离职日期：</text>
              <text class="info-value">{{ formatDate(app.end_date) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">离职原因：</text>
              <text class="info-value">{{ app.reason || '无' }}</text>
            </view>
            <view v-if="app.approve_remark" class="info-row">
              <text class="info-label">审批意见：</text>
              <text class="info-value">{{ app.approve_remark }}</text>
            </view>
          </view>
          
          <!-- 底部 -->
          <view class="record-footer">
            <text class="time-text">申请时间：{{ formatDate(app.created_at) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 草稿箱 - Requirements: 10.8 -->
    <view v-if="activeTab === 'draft'" class="list-section">
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="draftCount === 0" class="empty-container">
        <text class="empty-icon">📄</text>
        <text class="empty-text">暂无草稿</text>
      </view>
      
      <view v-else class="record-list">
        <!-- 请假草稿 -->
        <view v-if="leaveDrafts.length > 0" class="draft-section">
          <text class="draft-section-title">请假草稿</text>
          <view 
            v-for="draft in leaveDrafts" 
            :key="draft.id" 
            class="draft-card"
          >
            <view class="draft-header">
              <view class="type-info">
                <text class="type-icon">📝</text>
                <text class="type-text">{{ getLeaveTypeText(draft.leave_type) }}</text>
              </view>
              <view class="draft-tag">
                <text class="draft-tag-text">草稿</text>
              </view>
            </view>
            
            <view class="draft-content">
              <view v-if="draft.start_date && draft.end_date" class="info-row">
                <text class="info-label">请假时间：</text>
                <text class="info-value">
                  {{ formatDate(draft.start_date) }} 至 {{ formatDate(draft.end_date) }}
                  （共{{ calculateDays(draft.start_date, draft.end_date) }}天）
                </text>
              </view>
              <view v-else class="info-row">
                <text class="info-value placeholder">请假时间：未填写</text>
              </view>
              
              <view v-if="draft.reason" class="info-row">
                <text class="info-label">请假事由：</text>
                <text class="info-value">{{ draft.reason }}</text>
              </view>
              <view v-else class="info-row">
                <text class="info-value placeholder">请假事由：未填写</text>
              </view>
              
              <view class="info-row">
                <text class="time-text">保存时间：{{ formatDate(draft.created_at) }}</text>
              </view>
            </view>
            
            <view class="draft-actions">
              <view class="draft-btn edit" @click="handleEditDraft(draft.id, 'leave')">
                <text class="btn-text">继续编辑</text>
              </view>
              <view class="draft-btn delete" @click="handleDeleteDraft(draft.id, 'leave')">
                <text class="btn-text">删除</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 离职草稿 -->
        <view v-if="resignationDrafts.length > 0" class="draft-section">
          <text class="draft-section-title">离职草稿</text>
          <view 
            v-for="draft in resignationDrafts" 
            :key="draft.id" 
            class="draft-card"
          >
            <view class="draft-header">
              <view class="type-info">
                <text class="type-icon">📝</text>
                <text class="type-text">离职申请</text>
              </view>
              <view class="draft-tag">
                <text class="draft-tag-text">草稿</text>
              </view>
            </view>
            
            <view class="draft-content">
              <view v-if="draft.end_date" class="info-row">
                <text class="info-label">预计离职日期：</text>
                <text class="info-value">{{ formatDate(draft.end_date) }}</text>
              </view>
              <view v-else class="info-row">
                <text class="info-value placeholder">预计离职日期：未填写</text>
              </view>
              
              <view v-if="draft.reason" class="info-row">
                <text class="info-label">离职原因：</text>
                <text class="info-value">{{ draft.reason }}</text>
              </view>
              <view v-else class="info-row">
                <text class="info-value placeholder">离职原因：未填写</text>
              </view>
              
              <view class="info-row">
                <text class="time-text">保存时间：{{ formatDate(draft.created_at) }}</text>
              </view>
            </view>
            
            <view class="draft-actions">
              <view class="draft-btn edit" @click="handleEditDraft(draft.id, 'resignation')">
                <text class="btn-text">继续编辑</text>
              </view>
              <view class="draft-btn delete" @click="handleDeleteDraft(draft.id, 'resignation')">
                <text class="btn-text">删除</text>
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
 * 请假记录页面
 * 显示本月数据统计、快捷操作按钮、请假/离职/草稿箱标签切换
 * 
 * @module pages/driver/leave/list
 * @requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getLeaveApplications, getAttendanceRecords } from '@/api'
import type { LeaveApplication } from '@/api/types'
import { LeaveStatus, LeaveType } from '@/api/types'
import { useUserStore } from '@/store/user'
import { formatDate as formatDateUtil, navigateTo } from '@/utils'

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 状态 ====================

/** 当前激活的标签 */
const activeTab = ref<'leave' | 'resignation' | 'draft'>('leave')

/** 请假申请列表 */
const leaveApplications = ref<LeaveApplication[]>([])

/** 离职申请列表（使用 LeaveApplication 类型，leave_type 为 resign） */
const resignationApplications = ref<LeaveApplication[]>([])

/** 请假草稿列表 */
const leaveDrafts = ref<LeaveApplication[]>([])

/** 离职草稿列表 */
const resignationDrafts = ref<LeaveApplication[]>([])

/** 加载状态 */
const loading = ref(false)

/** 统计数据加载状态 */
const statsLoading = ref(false)

/** 是否有审核中的请假申请 */
const hasPendingLeave = ref(false)

/** 是否有审核中的离职申请 */
const hasPendingResignation = ref(false)

/** 统计数据 */
const stats = ref({
  attendanceDays: 0,
  leaveDays: 0,
  remainingDays: 0,
  monthlyLimit: 3, // 默认月度上限为 3 天
})

// ==================== 计算属性 ====================

/**
 * 用户名称
 */
const userName = computed(() => {
  return userStore.user?.name || userStore.user?.username || '司机'
})

/**
 * 草稿总数
 */
const draftCount = computed(() => {
  return leaveDrafts.value.length + resignationDrafts.value.length
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
  loadStats()
})

onShow(() => {
  // 页面显示时刷新数据
  loadData()
  loadStats()
})

// ==================== 方法 ====================

/**
 * 加载请假和离职申请数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  
  try {
    // 获取所有请假申请
    const allApplications = await getLeaveApplications({
      limit: 100,
    })
    
    // 分离请假和离职申请
    // 请假申请：leave_type 为 'leave' 或未指定
    // 离职申请：leave_type 为 'resign'
    leaveApplications.value = allApplications.filter(
      app => app.leave_type === LeaveType.LEAVE || !app.leave_type
    )
    
    resignationApplications.value = allApplications.filter(
      app => app.leave_type === LeaveType.RESIGN
    )
    
    // 检查是否有审核中的请假申请
    hasPendingLeave.value = leaveApplications.value.some(
      app => app.status === LeaveStatus.PENDING
    )
    
    // 检查是否有审核中的离职申请
    hasPendingResignation.value = resignationApplications.value.some(
      app => app.status === LeaveStatus.PENDING
    )
    
    // 草稿功能：当前后端可能不支持草稿状态，暂时设为空
    // 未来可以通过 status === 'draft' 来筛选草稿
    leaveDrafts.value = []
    resignationDrafts.value = []
    
  } catch (error) {
    console.error('加载请假记录失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 加载统计数据
 * Requirements: 10.1 - 显示本月出勤天数、请假天数、剩余额度
 */
async function loadStats(): Promise<void> {
  statsLoading.value = true
  
  try {
    const userId = userStore.user?.id
    if (!userId) return
    
    // 获取本月的日期范围
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const firstDay = `${year}-${month}-01`
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
    const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    
    // 获取本月考勤记录
    const attendanceRecords = await getAttendanceRecords({
      user_id: userId,
      start_date: firstDay,
      end_date: lastDayStr,
      limit: 100,
    })
    
    // 计算出勤天数（有打卡记录的天数）
    const attendanceDays = attendanceRecords.filter(r => r.clock_in).length
    
    // 获取本月已批准的请假申请
    const approvedLeaves = leaveApplications.value.filter(
      app => app.status === LeaveStatus.APPROVED
    )
    
    // 计算本月请假天数
    let leaveDays = 0
    for (const leave of approvedLeaves) {
      // 检查请假日期是否在本月范围内
      const startDate = leave.start_date
      const endDate = leave.end_date
      
      // 计算与本月重叠的天数
      const overlapStart = startDate > firstDay ? startDate : firstDay
      const overlapEnd = endDate < lastDayStr ? endDate : lastDayStr
      
      if (overlapStart <= overlapEnd) {
        const days = calculateDays(overlapStart, overlapEnd)
        leaveDays += days
      }
    }
    
    // 月度请假上限（默认 3 天，未来可从仓库配置获取）
    const monthlyLimit = 3
    
    // 计算剩余额度
    const remainingDays = Math.max(0, monthlyLimit - leaveDays)
    
    stats.value = {
      attendanceDays,
      leaveDays,
      remainingDays,
      monthlyLimit,
    }
    
  } catch (error) {
    console.error('加载统计数据失败:', error)
  } finally {
    statsLoading.value = false
  }
}

/**
 * 格式化日期
 * 
 * @param dateStr - 日期字符串
 * @returns 格式化后的日期
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  // 只取日期部分
  return dateStr.split('T')[0]
}

/**
 * 计算请假天数
 * 
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 天数
 */
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1
}

/**
 * 获取请假类型文本
 * 
 * @param type - 类型值
 * @returns 类型文本
 */
function getLeaveTypeText(type: string | LeaveType): string {
  const map: Record<string, string> = {
    leave: '请假',
    resign: '离职',
    sick: '病假',
    personal: '事假',
    annual: '年假',
    other: '其他',
  }
  return map[type] || '请假'
}

/**
 * 获取状态文本
 * 
 * @param status - 状态值
 * @returns 状态文本
 */
function getStatusText(status: string | LeaveStatus): string {
  const map: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
  }
  return map[status] || status
}

/**
 * 申请请假
 * Requirements: 10.2, 10.3 - 审批中时禁用
 */
function handleApplyLeave(): void {
  if (hasPendingLeave.value) {
    uni.showToast({
      title: '您有请假申请正在审批中，请等待审批完成',
      icon: 'none',
      duration: 2000,
    })
    return
  }
  
  navigateTo('/pages/driver/leave/apply')
}

/**
 * 申请离职
 * Requirements: 10.2, 10.4 - 审批中时禁用
 */
function handleApplyResignation(): void {
  if (hasPendingResignation.value) {
    uni.showToast({
      title: '您有离职申请正在审批中，请等待审批完成',
      icon: 'none',
      duration: 2000,
    })
    return
  }
  
  // 跳转到离职申请页面（使用请假申请页面，传递类型参数）
  navigateTo('/pages/driver/leave/apply', { type: 'resign' })
}

/**
 * 查看申请详情
 * Requirements: 10.9 - 点击申请记录显示详情弹窗
 * 
 * @param id - 申请 ID
 * @param type - 申请类型
 */
function handleViewDetail(id: number, type: 'leave' | 'resignation'): void {
  // 当前简单实现：显示 Toast 提示
  // 未来可以实现详情弹窗或跳转详情页
  uni.showToast({
    title: '查看详情功能开发中',
    icon: 'none',
  })
}

/**
 * 编辑草稿
 * Requirements: 10.8 - 支持继续编辑
 * 
 * @param draftId - 草稿 ID
 * @param type - 草稿类型
 */
function handleEditDraft(draftId: number, type: 'leave' | 'resignation'): void {
  if (type === 'leave') {
    navigateTo('/pages/driver/leave/apply', { draftId: String(draftId) })
  } else {
    navigateTo('/pages/driver/leave/apply', { draftId: String(draftId), type: 'resign' })
  }
}

/**
 * 删除草稿
 * Requirements: 10.8 - 支持删除草稿
 * 
 * @param draftId - 草稿 ID
 * @param type - 草稿类型
 */
async function handleDeleteDraft(draftId: number, type: 'leave' | 'resignation'): Promise<void> {
  // 显示确认对话框
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个草稿吗？',
    confirmText: '删除',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        try {
          // 当前后端可能不支持草稿删除 API
          // 未来实现时调用对应的删除 API
          
          // 从本地列表中移除
          if (type === 'leave') {
            leaveDrafts.value = leaveDrafts.value.filter(d => d.id !== draftId)
          } else {
            resignationDrafts.value = resignationDrafts.value.filter(d => d.id !== draftId)
          }
          
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          })
        } catch (error) {
          console.error('删除草稿失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'none',
          })
        }
      }
    },
  })
}
</script>


<style lang="scss" scoped>
/**
 * 请假记录页面样式
 */

.leave-list-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #fef2f2, #fee2e2);
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 欢迎卡片 */
.welcome-card {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(30, 58, 138, 0.3);
}

.welcome-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  display: block;
  margin-bottom: 8rpx;
}

.welcome-subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 数据仪表盘 */
.dashboard-section {
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1e3a8a;
}

.dashboard-loading {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.dashboard-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.dashboard-item {
  border-radius: 12rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  &.green {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    
    .dashboard-value {
      color: #166534;
    }
  }
  
  &.orange {
    background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
    
    .dashboard-value {
      color: #c2410c;
    }
  }
  
  &.blue {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    
    .dashboard-value {
      color: #1e40af;
    }
  }
}

.dashboard-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.dashboard-label {
  font-size: 22rpx;
  color: #666666;
  margin-bottom: 8rpx;
}

.dashboard-value {
  font-size: 48rpx;
  font-weight: bold;
}

.dashboard-unit {
  font-size: 20rpx;
  color: #999999;
  margin-top: 4rpx;
}

.monthly-limit-tip {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
  text-align: center;
}

.limit-text {
  font-size: 22rpx;
  color: #999999;
}

/* 快捷操作按钮 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.action-btn {
  border-radius: 12rpx;
  padding: 28rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s;
  
  &.leave-btn {
    background-color: #1e3a8a;
    
    &.disabled {
      background-color: #9ca3af;
      opacity: 0.6;
    }
  }
  
  &.resign-btn {
    background-color: #f97316;
    
    &.disabled {
      background-color: #9ca3af;
      opacity: 0.6;
    }
  }
  
  &:active:not(.disabled) {
    transform: scale(0.98);
  }
}

.action-icon {
  font-size: 48rpx;
  margin-bottom: 8rpx;
}

.action-text {
  font-size: 26rpx;
  color: #ffffff;
}

/* 标签切换 */
.tab-section {
  display: flex;
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 8rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  border-radius: 8rpx;
  transition: all 0.2s;
  
  &.active {
    background-color: #1e3a8a;
    
    .tab-text {
      color: #ffffff;
      font-weight: bold;
    }
  }
  
  &.orange.active {
    background-color: #f97316;
  }
  
  &.purple.active {
    background-color: #7c3aed;
  }
}

.tab-text {
  font-size: 26rpx;
  color: #666666;
}

/* 列表区域 */
.list-section {
  min-height: 200rpx;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 记录列表 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  
  &:active {
    transform: scale(0.99);
  }
  
  &.resignation {
    border-left: 6rpx solid #f97316;
  }
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.type-info {
  display: flex;
  align-items: center;
}

.type-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.type-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
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
    background-color: #f6ffed;
    
    .status-text {
      color: #52c41a;
    }
  }
  
  &.rejected {
    background-color: #fff2f0;
    
    .status-text {
      color: #ff4d4f;
    }
  }
}

.status-text {
  font-size: 24rpx;
  font-weight: 500;
}

.record-content {
  margin-bottom: 16rpx;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  padding: 6rpx 0;
}

.info-label {
  font-size: 26rpx;
  color: #666666;
  flex-shrink: 0;
}

.info-value {
  font-size: 26rpx;
  color: #333333;
  
  &.placeholder {
    color: #999999;
  }
}

.record-footer {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 12rpx;
}

.time-text {
  font-size: 22rpx;
  color: #999999;
}

/* 草稿区域 */
.draft-section {
  margin-bottom: 24rpx;
}

.draft-section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 12rpx;
}

.draft-card {
  background-color: #faf5ff;
  border: 2rpx solid #e9d5ff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.draft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.draft-tag {
  background-color: #7c3aed;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
}

.draft-tag-text {
  font-size: 22rpx;
  color: #ffffff;
}

.draft-content {
  margin-bottom: 16rpx;
}

.draft-actions {
  display: flex;
  gap: 16rpx;
}

.draft-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 8rpx;
  text-align: center;
  
  &.edit {
    background-color: #7c3aed;
  }
  
  &.delete {
    background-color: #ef4444;
  }
  
  .btn-text {
    font-size: 24rpx;
    color: #ffffff;
  }
}
</style>
