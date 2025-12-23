<template>
  <!-- 
    请假审批列表页面
    显示待审批的请假申请
    支持快速审批操作
  -->
  <view class="approval-list-page">
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
    <view v-if="loading" class="loading-container">
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
        @click="viewDetail(application.id)"
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
            <text class="date-value">
              {{ formatDate(application.start_date) }} 至 {{ formatDate(application.end_date) }}
            </text>
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
          
          <!-- 待审批状态显示快速操作按钮 -->
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
</template>

<script setup lang="ts">
/**
 * 请假审批列表页面
 * 显示待审批的请假申请
 * 支持快速审批操作
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getLeaveApplications, approveLeaveApplication } from '@/api'
import type { LeaveApplication } from '@/api/types'
import { LeaveStatus, LeaveType } from '@/api/types'
import { formatDate, formatDateTime } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 申请列表 */
const applications = ref<LeaveApplication[]>([])

/** 当前筛选条件 */
const activeFilter = ref<'all' | 'pending' | 'approved' | 'rejected'>('pending')

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

/** 筛选标签配置 */
const filterTabs = computed(() => [
  { label: '待审批', value: 'pending' as const, count: pendingCount.value },
  { label: '已批准', value: 'approved' as const, count: approvedCount.value },
  { label: '已拒绝', value: 'rejected' as const, count: rejectedCount.value },
  { label: '全部', value: 'all' as const, count: applications.value.length },
])

/** 筛选后的申请列表 */
const filteredApplications = computed(() => {
  if (activeFilter.value === 'all') {
    return applications.value
  }
  
  const statusMap: Record<string, LeaveStatus> = {
    pending: LeaveStatus.PENDING,
    approved: LeaveStatus.APPROVED,
    rejected: LeaveStatus.REJECTED,
  }
  
  return applications.value.filter(a => a.status === statusMap[activeFilter.value])
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadApplications()
})

onShow(() => {
  // 每次显示页面时刷新数据
  loadApplications()
})

// ==================== 方法 ====================

/**
 * 加载申请列表
 */
async function loadApplications(): Promise<void> {
  loading.value = true
  try {
    const data = await getLeaveApplications()
    applications.value = data
  } catch (error) {
    console.error('加载申请列表失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 处理筛选条件变化
 * 
 * @param filter - 筛选条件
 */
function handleFilterChange(filter: 'all' | 'pending' | 'approved' | 'rejected'): void {
  activeFilter.value = filter
}

/**
 * 获取空状态文本
 * 
 * @returns 空状态提示文本
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
 * 
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
 * 
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
 * 查看申请详情
 * 
 * @param id - 申请ID
 */
function viewDetail(id: number): void {
  uni.navigateTo({
    url: `/pages/manager/approval/detail?id=${id}`,
  })
}

/**
 * 快速批准
 * 
 * @param application - 申请信息
 */
async function handleQuickApprove(application: LeaveApplication): Promise<void> {
  uni.showModal({
    title: '确认批准',
    content: `确定批准 ${application.user_name || '该用户'} 的${getLeaveTypeName(application.leave_type)}申请吗？`,
    success: async (res) => {
      if (res.confirm) {
        await doApprove(application.id, LeaveStatus.APPROVED)
      }
    },
  })
}

/**
 * 快速拒绝
 * 
 * @param application - 申请信息
 */
async function handleQuickReject(application: LeaveApplication): Promise<void> {
  uni.showModal({
    title: '确认拒绝',
    content: `确定拒绝 ${application.user_name || '该用户'} 的${getLeaveTypeName(application.leave_type)}申请吗？`,
    success: async (res) => {
      if (res.confirm) {
        await doApprove(application.id, LeaveStatus.REJECTED)
      }
    },
  })
}

/**
 * 执行审批操作
 * 
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
    
    // 刷新列表
    await loadApplications()
  } catch (error) {
    console.error('审批失败:', error)
    uni.hideLoading()
    uni.showToast({
      title: '操作失败',
      icon: 'none',
    })
  }
}
</script>


<style lang="scss" scoped>
.approval-list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  background-color: #ffffff;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
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
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 申请列表 */
.application-list {
  padding: 24rpx;
}

.application-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

/* 申请人信息 */
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

.avatar-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
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

/* 请假信息 */
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

/* 卡片底部 */
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

/* 快速操作按钮 */
.quick-actions {
  display: flex;
}

.action-btn {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;
  
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

.btn-text {
  font-size: 26rpx;
}
</style>
