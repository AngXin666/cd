<template>
  <!-- 
    请假记录页面
    显示申请状态，显示审批结果
  -->
  <view class="list-page">
    <!-- 状态筛选 -->
    <view class="filter-section">
      <view 
        v-for="item in statusOptions" 
        :key="item.value"
        :class="['filter-item', { active: currentStatus === item.value }]"
        @click="currentStatus = item.value"
      >
        <text class="filter-text">{{ item.label }}</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="list-section">
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="filteredRecords.length === 0" class="empty-container">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无请假记录</text>
      </view>
      
      <view v-else class="record-list">
        <view 
          v-for="record in filteredRecords" 
          :key="record.id" 
          class="record-item"
        >
          <!-- 头部：类型和状态 -->
          <view class="record-header">
            <view class="type-tag">
              <text class="type-text">{{ getLeaveTypeText(record.leave_type) }}</text>
            </view>
            <view :class="['status-tag', record.status]">
              <text class="status-text">{{ getLeaveStatusText(record.status) }}</text>
            </view>
          </view>
          
          <!-- 日期信息 -->
          <view class="record-dates">
            <view class="date-row">
              <text class="date-label">开始日期</text>
              <text class="date-value">{{ formatDate(record.start_date) }}</text>
            </view>
            <view class="date-row">
              <text class="date-label">结束日期</text>
              <text class="date-value">{{ formatDate(record.end_date) }}</text>
            </view>
            <view class="date-row">
              <text class="date-label">请假天数</text>
              <text class="date-value highlight">{{ calculateDays(record.start_date, record.end_date) }} 天</text>
            </view>
          </view>
          
          <!-- 原因 -->
          <view v-if="record.reason" class="record-reason">
            <text class="reason-label">申请原因：</text>
            <text class="reason-text">{{ record.reason }}</text>
          </view>
          
          <!-- 审批信息 -->
          <view v-if="record.status !== 'pending'" class="record-approval">
            <view class="approval-row">
              <text class="approval-label">审批人：</text>
              <text class="approval-value">{{ record.approver_name || '-' }}</text>
            </view>
            <view v-if="record.approve_remark" class="approval-row">
              <text class="approval-label">审批备注：</text>
              <text class="approval-value">{{ record.approve_remark }}</text>
            </view>
          </view>
          
          <!-- 申请时间 -->
          <view class="record-footer">
            <text class="time-text">申请时间：{{ formatDateTime(record.created_at) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 新增按钮 -->
    <view class="fab-btn" @click="goToApply">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 请假记录页面
 * 显示申请状态，显示审批结果
 */

import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getLeaveApplications } from '@/api'
import type { LeaveApplication } from '@/api/types'
import { LeaveStatus } from '@/api/types'
import { formatDate, formatDateTime, getLeaveStatusText, navigateTo } from '@/utils'

// ==================== 常量 ====================

/** 状态选项 */
const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审批', value: 'pending' },
  { label: '已批准', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
]

// ==================== 状态 ====================

/** 请假记录列表 */
const records = ref<LeaveApplication[]>([])

/** 加载状态 */
const loading = ref(false)

/** 当前筛选状态 */
const currentStatus = ref('')

// ==================== 计算属性 ====================

/** 筛选后的记录 */
const filteredRecords = computed(() => {
  if (!currentStatus.value) return records.value
  return records.value.filter(r => r.status === currentStatus.value)
})

// ==================== 监听器 ====================

watch(currentStatus, () => {
  // 状态变化时不需要重新加载，因为是前端筛选
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadRecords()
})

onShow(() => {
  // 刷新数据
  loadRecords()
})

// ==================== 方法 ====================

/**
 * 加载请假记录
 */
async function loadRecords(): Promise<void> {
  loading.value = true
  
  try {
    const data = await getLeaveApplications({
      limit: 100,
    })
    records.value = data
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
 * 获取请假类型文本
 * 
 * @param type - 类型值
 * @returns 类型文本
 */
function getLeaveTypeText(type: string): string {
  const map: Record<string, string> = {
    leave: '请假',
    resign: '离职',
  }
  return map[type] || type
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
  const diff = end.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}

/**
 * 跳转到申请页面
 */
function goToApply(): void {
  navigateTo('/pages/driver/leave/apply')
}
</script>

<style lang="scss" scoped>
.list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

/* 筛选区域 */
.filter-section {
  display: flex;
  background-color: #ffffff;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.filter-item {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  border-radius: 8rpx;
  transition: all 0.2s;
  
  &.active {
    background-color: #4a90e2;
    
    .filter-text {
      color: #ffffff;
    }
  }
}

.filter-text {
  font-size: 26rpx;
  color: #666666;
}

/* 列表区域 */
.list-section {
  padding: 0 24rpx;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
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

.record-item {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

/* 头部 */
.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.type-tag {
  background-color: #f0f0f0;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
}

.type-text {
  font-size: 24rpx;
  color: #666666;
}

.status-tag {
  padding: 8rpx 20rpx;
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
}

/* 日期信息 */
.record-dates {
  background-color: #f9f9f9;
  border-radius: 8rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}

.date-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.date-label {
  font-size: 24rpx;
  color: #999999;
}

.date-value {
  font-size: 26rpx;
  color: #333333;
  
  &.highlight {
    color: #4a90e2;
    font-weight: 500;
  }
}

/* 原因 */
.record-reason {
  margin-bottom: 16rpx;
}

.reason-label {
  font-size: 24rpx;
  color: #999999;
}

.reason-text {
  font-size: 26rpx;
  color: #333333;
}

/* 审批信息 */
.record-approval {
  background-color: #f0f9ff;
  border-radius: 8rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}

.approval-row {
  display: flex;
  padding: 4rpx 0;
}

.approval-label {
  font-size: 24rpx;
  color: #999999;
  flex-shrink: 0;
}

.approval-value {
  font-size: 24rpx;
  color: #333333;
}

/* 底部 */
.record-footer {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 16rpx;
}

.time-text {
  font-size: 22rpx;
  color: #999999;
}

/* 浮动按钮 */
.fab-btn {
  position: fixed;
  right: 32rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(74, 144, 226, 0.4);
}

.fab-icon {
  font-size: 56rpx;
  color: #ffffff;
  font-weight: bold;
}
</style>
