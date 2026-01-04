<template>
  <!-- 
    发送通知页面
    选择接收司机，发送自定义通知
  -->
  <view class="notify-page">
    <!-- 接收人选择 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">接收人</text>
        <view class="select-all" @click="toggleSelectAll">
          <text class="select-all-text">{{ isAllSelected ? '取消全选' : '全选' }}</text>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view v-if="loadingDrivers" class="loading-drivers">
        <text class="loading-text">加载中...</text>
      </view>
      
      <!-- 司机列表 -->
      <view v-else class="driver-list">
        <view
          v-for="driver in drivers"
          :key="driver.id"
          :class="['driver-item', { selected: selectedDriverIds.includes(driver.id) }]"
          @click="toggleDriverSelect(driver.id)"
        >
          <view class="driver-avatar">
            <text class="avatar-text">{{ driver.name.charAt(0) }}</text>
          </view>
          <view class="driver-info">
            <text class="driver-name">{{ driver.name }}</text>
            <text class="driver-phone">{{ driver.phone || '未设置手机号' }}</text>
          </view>
          <view class="check-box">
            <text v-if="selectedDriverIds.includes(driver.id)" class="check-icon">✓</text>
          </view>
        </view>
      </view>
      
      <!-- 已选择数量 -->
      <view class="selected-count">
        <text class="count-text">已选择 {{ selectedDriverIds.length }} 人</text>
      </view>
    </view>

    <!-- 通知内容 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">通知内容</text>
      </view>
      
      <!-- 标题输入 -->
      <view class="input-group">
        <text class="input-label">标题</text>
        <input
          v-model="notifyTitle"
          class="title-input"
          type="text"
          placeholder="请输入通知标题"
          :maxlength="50"
        />
      </view>
      
      <!-- 内容输入 -->
      <view class="input-group">
        <text class="input-label">内容</text>
        <textarea
          v-model="notifyContent"
          class="content-input"
          placeholder="请输入通知内容..."
          :maxlength="500"
        />
        <text class="char-count">{{ notifyContent.length }}/500</text>
      </view>
    </view>

    <!-- 快捷模板 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">快捷模板</text>
      </view>
      <view class="template-list">
        <view
          v-for="template in quickTemplates"
          :key="template.title"
          class="template-item"
          @click="useQuickTemplate(template)"
        >
          <text class="template-title">{{ template.title }}</text>
        </view>
      </view>
    </view>

    <!-- 发送按钮 -->
    <view class="send-button-wrapper">
      <view
        :class="['send-button', { disabled: !canSend }]"
        @click="handleSend"
      >
        <text class="send-text">发送通知</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 发送通知页面
 * 选择接收司机，发送自定义通知
 */

import { ref, computed, onMounted } from 'vue'
import { getUsers, createNotification } from '@/api'
import type { User } from '@/api/types'
import { UserRole } from '@/api/types'

// ==================== 类型定义 ====================

/** 快捷通知模板 */
interface QuickTemplate {
  title: string
  content: string
}

// ==================== 状态 ====================

/** 加载司机状态 */
const loadingDrivers = ref(false)

/** 司机列表 */
const drivers = ref<User[]>([])

/** 选中的司机ID列表 */
const selectedDriverIds = ref<number[]>([])

/** 通知标题 */
const notifyTitle = ref('')

/** 通知内容 */
const notifyContent = ref('')

/** 快捷模板列表 */
const quickTemplates: QuickTemplate[] = [
  { title: '工作提醒', content: '请注意今日工作安排，按时完成任务。' },
  { title: '会议通知', content: '请于指定时间参加工作会议，准时到场。' },
  { title: '安全提醒', content: '请注意行车安全，遵守交通规则，确保人身安全。' },
  { title: '天气提醒', content: '近期天气变化，请注意防寒保暖/防暑降温，注意安全。' },
]

// ==================== 计算属性 ====================

/** 是否全选 */
const isAllSelected = computed(() => {
  return drivers.value.length > 0 && 
         selectedDriverIds.value.length === drivers.value.length
})

/** 是否可以发送 */
const canSend = computed(() => {
  return selectedDriverIds.value.length > 0 && notifyTitle.value.trim() !== ''
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadDrivers()
})

// ==================== 方法 ====================

/**
 * 加载司机列表
 */
async function loadDrivers(): Promise<void> {
  loadingDrivers.value = true
  try {
    const data = await getUsers({ role: UserRole.DRIVER, is_active: true })
    drivers.value = data
  } catch (error) {
    console.error('加载司机列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadingDrivers.value = false
  }
}

/**
 * 切换司机选择状态
 */
function toggleDriverSelect(driverId: number): void {
  const index = selectedDriverIds.value.indexOf(driverId)
  if (index === -1) {
    selectedDriverIds.value.push(driverId)
  } else {
    selectedDriverIds.value.splice(index, 1)
  }
}

/**
 * 切换全选状态
 */
function toggleSelectAll(): void {
  if (isAllSelected.value) {
    selectedDriverIds.value = []
  } else {
    selectedDriverIds.value = drivers.value.map(d => d.id)
  }
}

/**
 * 使用快捷模板
 */
function useQuickTemplate(template: QuickTemplate): void {
  notifyTitle.value = template.title
  notifyContent.value = template.content
}

/**
 * 发送通知
 */
async function handleSend(): Promise<void> {
  if (!canSend.value) {
    uni.showToast({ title: '请选择接收人并填写标题', icon: 'none' })
    return
  }
  
  uni.showModal({
    title: '确认发送',
    content: `确定向 ${selectedDriverIds.value.length} 人发送通知吗？`,
    success: async (res) => {
      if (res.confirm) {
        await doSend()
      }
    },
  })
}

/**
 * 执行发送操作
 */
async function doSend(): Promise<void> {
  try {
    uni.showLoading({ title: '发送中...' })
    
    await createNotification({
      user_ids: selectedDriverIds.value,
      title: notifyTitle.value.trim(),
      content: notifyContent.value.trim() || undefined,
    })
    
    uni.hideLoading()
    uni.showToast({ title: '发送成功', icon: 'success' })
    
    // 清空表单
    selectedDriverIds.value = []
    notifyTitle.value = ''
    notifyContent.value = ''
    
    // 延迟返回上一页
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error) {
    uni.hideLoading()
    console.error('发送通知失败:', error)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.notify-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 160rpx;
}

/* 区块样式 */
.section {
  background-color: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

/* 全选按钮 */
.select-all {
  padding: 8rpx 16rpx;
}

.select-all-text {
  font-size: 28rpx;
  color: #007aff;
}

/* 加载状态 */
.loading-drivers {
  padding: 40rpx;
  text-align: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* 司机列表 */
.driver-list {
  max-height: 400rpx;
  overflow-y: auto;
}

.driver-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  background-color: #f8f8f8;
  transition: all 0.2s;
}

.driver-item.selected {
  background-color: #e6f7ff;
  border: 2rpx solid #007aff;
}

.driver-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: #007aff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.avatar-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

.driver-info {
  flex: 1;
}

.driver-name {
  font-size: 30rpx;
  color: #333333;
  font-weight: 500;
  display: block;
}

.driver-phone {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
  display: block;
}

.check-box {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 2rpx solid #cccccc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.driver-item.selected .check-box {
  background-color: #007aff;
  border-color: #007aff;
}

.check-icon {
  font-size: 24rpx;
  color: #ffffff;
}

/* 已选择数量 */
.selected-count {
  margin-top: 16rpx;
  text-align: right;
}

.count-text {
  font-size: 26rpx;
  color: #666666;
}

/* 输入组 */
.input-group {
  margin-bottom: 24rpx;
}

.input-label {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 12rpx;
  display: block;
}

.title-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.content-input {
  width: 100%;
  height: 200rpx;
  padding: 20rpx 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.char-count {
  font-size: 24rpx;
  color: #999999;
  text-align: right;
  margin-top: 8rpx;
  display: block;
}

/* 快捷模板 */
.template-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.template-item {
  padding: 16rpx 24rpx;
  background-color: #f0f0f0;
  border-radius: 8rpx;
}

.template-title {
  font-size: 26rpx;
  color: #333333;
}

/* 发送按钮 */
.send-button-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.send-button {
  height: 88rpx;
  background-color: #007aff;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button.disabled {
  background-color: #cccccc;
}

.send-text {
  font-size: 32rpx;
  color: #ffffff;
  font-weight: 600;
}
</style>
