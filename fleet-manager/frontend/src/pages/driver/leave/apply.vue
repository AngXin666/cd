<template>
  <!-- 
    请假申请页面
    选择请假类型、日期，填写请假原因
  -->
  <view class="apply-page">
    <!-- 请假类型 -->
    <view class="form-section">
      <view class="form-title">请假类型</view>
      <view class="type-list">
        <view 
          :class="['type-item', { active: formData.leave_type === 'leave' }]"
          @click="formData.leave_type = 'leave'"
        >
          <text class="type-icon">📅</text>
          <text class="type-name">请假</text>
        </view>
        <view 
          :class="['type-item', { active: formData.leave_type === 'resign' }]"
          @click="formData.leave_type = 'resign'"
        >
          <text class="type-icon">👋</text>
          <text class="type-name">离职</text>
        </view>
      </view>
    </view>

    <!-- 日期选择 -->
    <view class="form-section">
      <view class="form-title">{{ formData.leave_type === 'resign' ? '离职日期' : '请假日期' }}</view>
      <view class="date-row">
        <picker mode="date" :value="formData.start_date" @change="onStartDateChange">
          <view class="date-item">
            <text class="date-label">开始日期</text>
            <text class="date-value">{{ formData.start_date || '请选择' }}</text>
          </view>
        </picker>
        <text class="date-separator">至</text>
        <picker mode="date" :value="formData.end_date" @change="onEndDateChange">
          <view class="date-item">
            <text class="date-label">结束日期</text>
            <text class="date-value">{{ formData.end_date || '请选择' }}</text>
          </view>
        </picker>
      </view>
      <view v-if="leaveDays > 0" class="days-info">
        <text class="days-text">共 {{ leaveDays }} 天</text>
      </view>
    </view>

    <!-- 请假原因 -->
    <view class="form-section">
      <view class="form-title">{{ formData.leave_type === 'resign' ? '离职原因' : '请假原因' }}</view>
      <textarea 
        class="reason-input"
        v-model="formData.reason"
        :placeholder="formData.leave_type === 'resign' ? '请输入离职原因' : '请输入请假原因'"
        maxlength="500"
      />
      <view class="char-count">
        <text class="count-text">{{ formData.reason.length }}/500</text>
      </view>
    </view>

    <!-- 提示信息 -->
    <view class="tips-section">
      <text class="tips-title">温馨提示</text>
      <view class="tips-list">
        <text class="tips-item">• 请假申请提交后需等待审批</text>
        <text class="tips-item">• 审批通过后方可生效</text>
        <text class="tips-item">• 如有紧急情况请提前联系管理员</text>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-section">
      <view 
        :class="['submit-btn', { disabled: !canSubmit }]"
        @click="handleSubmit"
      >
        <text class="submit-text">{{ submitting ? '提交中...' : '提交申请' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 请假申请页面
 * 选择请假类型、日期，填写请假原因
 */

import { ref, computed, reactive } from 'vue'
import { createLeaveApplication } from '@/api'
import { LeaveType } from '@/api/types'
import { getToday, navigateBack } from '@/utils'

// ==================== 状态 ====================

/** 提交状态 */
const submitting = ref(false)

/** 表单数据 */
const formData = reactive({
  leave_type: 'leave' as 'leave' | 'resign',
  start_date: '',
  end_date: '',
  reason: '',
})

// ==================== 计算属性 ====================

/** 请假天数 */
const leaveDays = computed(() => {
  if (!formData.start_date || !formData.end_date) return 0
  
  const start = new Date(formData.start_date)
  const end = new Date(formData.end_date)
  const diff = end.getTime() - start.getTime()
  
  if (diff < 0) return 0
  
  // 计算天数（包含首尾两天）
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
})

/** 是否可以提交 */
const canSubmit = computed(() => {
  return formData.start_date && 
         formData.end_date && 
         leaveDays.value > 0 &&
         !submitting.value
})

// ==================== 方法 ====================

/**
 * 开始日期变化
 */
function onStartDateChange(e: any): void {
  formData.start_date = e.detail.value
  
  // 如果结束日期早于开始日期，自动调整
  if (formData.end_date && formData.end_date < formData.start_date) {
    formData.end_date = formData.start_date
  }
}

/**
 * 结束日期变化
 */
function onEndDateChange(e: any): void {
  formData.end_date = e.detail.value
  
  // 如果结束日期早于开始日期，提示错误
  if (formData.start_date && formData.end_date < formData.start_date) {
    uni.showToast({
      title: '结束日期不能早于开始日期',
      icon: 'none',
    })
    formData.end_date = formData.start_date
  }
}

/**
 * 提交申请
 */
async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  
  // 确认提交
  const typeText = formData.leave_type === 'resign' ? '离职' : '请假'
  uni.showModal({
    title: '确认提交',
    content: `确定要提交${typeText}申请吗？`,
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
      leave_type: formData.leave_type === 'leave' ? LeaveType.LEAVE : LeaveType.RESIGN,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason || undefined,
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
.apply-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 160rpx;
}

/* 表单区域 */
.form-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.form-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
}

/* 类型选择 */
.type-list {
  display: flex;
  gap: 24rpx;
}

.type-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
  
  &.active {
    background-color: #e6f0ff;
    border-color: #4a90e2;
  }
}

.type-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.type-name {
  font-size: 28rpx;
  color: #333333;
}

/* 日期选择 */
.date-row {
  display: flex;
  align-items: center;
}

.date-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.date-label {
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 8rpx;
}

.date-value {
  font-size: 28rpx;
  color: #333333;
}

.date-separator {
  font-size: 24rpx;
  color: #999999;
  margin: 0 16rpx;
}

.days-info {
  margin-top: 16rpx;
  text-align: center;
}

.days-text {
  font-size: 26rpx;
  color: #4a90e2;
  font-weight: 500;
}

/* 原因输入 */
.reason-input {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.char-count {
  text-align: right;
  margin-top: 8rpx;
}

.count-text {
  font-size: 22rpx;
  color: #999999;
}

/* 提示区域 */
.tips-section {
  background-color: #fff9e6;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.tips-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #faad14;
  margin-bottom: 12rpx;
  display: block;
}

.tips-list {
  display: flex;
  flex-direction: column;
}

.tips-item {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.8;
}

/* 提交按钮 */
.submit-section {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.submit-btn {
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  border-radius: 12rpx;
  padding: 28rpx;
  text-align: center;
  
  &.disabled {
    opacity: 0.5;
  }
}

.submit-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
