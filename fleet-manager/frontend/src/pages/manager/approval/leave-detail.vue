<template>
  <!-- 
    请假详情页面（车队长端）
    显示申请详情，支持审批操作
    此页面与 detail.vue 功能相同，提供统一的路由命名
    Requirements: 8.5
  -->
  <view class="leave-detail-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="application">
      <!-- 申请人信息卡片 -->
      <view class="applicant-card">
        <view class="applicant-avatar">
          <text class="avatar-text">{{ (application.user_name || '用户').charAt(0) }}</text>
        </view>
        <view class="applicant-info">
          <view class="name-row">
            <text class="applicant-name">{{ application.user_name || '未知用户' }}</text>
            <view :class="['type-tag', application.leave_type]">
              <text class="type-text">{{ getLeaveTypeName(application.leave_type) }}</text>
            </view>
          </view>
          <text class="apply-time">申请时间：{{ formatDateTime(application.created_at) }}</text>
        </view>
      </view>

      <!-- 请假详情卡片 -->
      <view class="detail-card">
        <view class="card-title">
          <text class="title-text">请假详情</text>
        </view>
        
        <view class="detail-list">
          <view class="detail-item">
            <text class="detail-label">请假类型</text>
            <text class="detail-value">{{ getLeaveTypeName(application.leave_type) }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">开始日期</text>
            <text class="detail-value">{{ formatDate(application.start_date) }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">结束日期</text>
            <text class="detail-value">{{ formatDate(application.end_date) }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">请假天数</text>
            <text class="detail-value highlight">{{ calculateDays(application.start_date, application.end_date) }} 天</text>
          </view>
          <view class="detail-item full-width">
            <text class="detail-label">请假原因</text>
            <text class="detail-value reason">{{ application.reason || '未填写' }}</text>
          </view>
        </view>
      </view>

      <!-- 审批状态卡片 -->
      <view class="status-card">
        <view class="card-title">
          <text class="title-text">审批状态</text>
        </view>
        
        <view class="status-content">
          <view :class="['status-badge', application.status]">
            <text class="status-icon">{{ getStatusIcon(application.status) }}</text>
            <text class="status-text">{{ getStatusName(application.status) }}</text>
          </view>
          
          <view v-if="application.approver_name" class="approver-info">
            <text class="approver-label">审批人：</text>
            <text class="approver-name">{{ application.approver_name }}</text>
          </view>
          
          <view v-if="application.approve_remark" class="approve-remark">
            <text class="remark-label">审批备注：</text>
            <text class="remark-content">{{ application.approve_remark }}</text>
          </view>
        </view>
      </view>

      <!-- 审批操作区域（仅待审批状态显示） -->
      <view v-if="application.status === 'pending'" class="action-section">
        <!-- 审批备注输入 -->
        <view class="remark-input">
          <text class="input-label">审批备注（选填）</text>
          <textarea
            v-model="approveRemark"
            class="textarea"
            placeholder="请输入审批备注"
            maxlength="200"
          />
        </view>
        
        <!-- 操作按钮 -->
        <view class="action-buttons">
          <view class="action-btn reject" @click="handleReject">
            <text class="btn-text">拒绝</text>
          </view>
          <view class="action-btn approve" @click="handleApprove">
            <text class="btn-text">批准</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text class="error-icon">😕</text>
      <text class="error-text">加载申请信息失败</text>
      <view class="retry-btn" @click="loadApplication">
        <text class="retry-text">重试</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 请假详情页面（车队长端）
 * 显示申请详情，支持审批操作
 * 
 * @requirements 8.5 - 请假详情页面
 */

import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getLeaveApplication, approveLeaveApplication } from '@/api'
import type { LeaveApplication } from '@/api/types'
import { LeaveStatus, LeaveType } from '@/api/types'
import { formatDate, formatDateTime } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 申请ID */
const applicationId = ref<number>(0)

/** 申请信息 */
const application = ref<LeaveApplication | null>(null)

/** 审批备注 */
const approveRemark = ref('')

// ==================== 生命周期 ====================

onLoad((options) => {
  // 获取申请ID
  if (options?.id) {
    applicationId.value = parseInt(options.id as string, 10)
  }
})

onMounted(() => {
  if (applicationId.value) {
    loadApplication()
  }
})

// ==================== 方法 ====================

/**
 * 加载申请详情
 */
async function loadApplication(): Promise<void> {
  loading.value = true
  try {
    const data = await getLeaveApplication(applicationId.value)
    application.value = data
  } catch (error) {
    console.error('加载申请详情失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
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
 * 获取状态图标
 * 
 * @param status - 状态
 * @returns 图标
 */
function getStatusIcon(status: LeaveStatus): string {
  const iconMap: Record<LeaveStatus, string> = {
    [LeaveStatus.PENDING]: '⏳',
    [LeaveStatus.APPROVED]: '✅',
    [LeaveStatus.REJECTED]: '❌',
  }
  return iconMap[status] || '❓'
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
  return diffDays + 1 // 包含开始和结束日期
}

/**
 * 处理批准操作
 */
async function handleApprove(): Promise<void> {
  if (!application.value) return
  
  uni.showModal({
    title: '确认批准',
    content: `确定批准 ${application.value.user_name || '该用户'} 的${getLeaveTypeName(application.value.leave_type)}申请吗？`,
    success: async (res) => {
      if (res.confirm) {
        await doApprove(LeaveStatus.APPROVED)
      }
    },
  })
}

/**
 * 处理拒绝操作
 */
async function handleReject(): Promise<void> {
  if (!application.value) return
  
  uni.showModal({
    title: '确认拒绝',
    content: `确定拒绝 ${application.value.user_name || '该用户'} 的${getLeaveTypeName(application.value.leave_type)}申请吗？`,
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        await doApprove(LeaveStatus.REJECTED)
      }
    },
  })
}

/**
 * 执行审批操作
 * 
 * @param status - 审批状态
 */
async function doApprove(status: LeaveStatus): Promise<void> {
  try {
    uni.showLoading({ title: '处理中...' })
    
    await approveLeaveApplication(applicationId.value, {
      status,
      approve_remark: approveRemark.value.trim() || undefined,
    })
    
    uni.hideLoading()
    uni.showToast({
      title: status === LeaveStatus.APPROVED ? '已批准' : '已拒绝',
      icon: 'success',
    })
    
    // 刷新详情
    await loadApplication()
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
.leave-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
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

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.error-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.error-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 24rpx;
}

.retry-btn {
  padding: 16rpx 48rpx;
  background-color: #1890ff;
  border-radius: 8rpx;
}

.retry-text {
  font-size: 28rpx;
  color: #ffffff;
}

/* 申请人信息卡片 */
.applicant-card {
  display: flex;
  align-items: center;
  padding: 32rpx 24rpx;
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
}

.applicant-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
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

.applicant-info {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.applicant-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  margin-right: 12rpx;
}

.type-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background-color: rgba(255, 255, 255, 0.2);
  
  &.leave {
    background-color: rgba(24, 144, 255, 0.3);
  }
  
  &.resign {
    background-color: rgba(250, 140, 22, 0.3);
  }
}

.type-text {
  font-size: 22rpx;
  color: #ffffff;
}

.apply-time {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 详情卡片 */
.detail-card {
  background-color: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.card-title {
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 16rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.detail-list {
  display: flex;
  flex-direction: column;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16rpx 0;
  
  &.full-width {
    flex-direction: column;
    
    .detail-label {
      margin-bottom: 8rpx;
    }
    
    .detail-value {
      width: 100%;
    }
  }
}

.detail-label {
  font-size: 28rpx;
  color: #999999;
}

.detail-value {
  font-size: 28rpx;
  color: #333333;
  
  &.highlight {
    color: #1890ff;
    font-weight: bold;
  }
  
  &.reason {
    line-height: 1.6;
    color: #666666;
  }
}

/* 状态卡片 */
.status-card {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.status-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0;
}

.status-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 48rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  
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

.status-icon {
  font-size: 48rpx;
  margin-bottom: 8rpx;
}

.status-text {
  font-size: 28rpx;
  font-weight: bold;
}

.approver-info {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
}

.approver-label {
  font-size: 26rpx;
  color: #999999;
}

.approver-name {
  font-size: 26rpx;
  color: #333333;
}

.approve-remark {
  margin-top: 12rpx;
  text-align: center;
}

.remark-label {
  font-size: 24rpx;
  color: #999999;
}

.remark-content {
  font-size: 24rpx;
  color: #666666;
}

/* 操作区域 */
.action-section {
  background-color: #ffffff;
  margin: 0 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.remark-input {
  margin-bottom: 24rpx;
}

.input-label {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 12rpx;
  display: block;
}

.textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.action-buttons {
  display: flex;
  gap: 24rpx;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  
  &.reject {
    background-color: #fff1f0;
    
    .btn-text {
      color: #ff4d4f;
    }
  }
  
  &.approve {
    background-color: #52c41a;
    
    .btn-text {
      color: #ffffff;
    }
  }
}

.btn-text {
  font-size: 32rpx;
  font-weight: bold;
}
</style>
