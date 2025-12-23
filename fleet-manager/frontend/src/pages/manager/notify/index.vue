<template>
  <!-- 
    发送通知页面
    选择接收司机
    支持使用模板或自定义内容发送通知
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

    <!-- 发送方式选择 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">发送方式</text>
      </view>
      <view class="mode-tabs">
        <view 
          :class="['mode-tab', { active: sendMode === 'template' }]"
          @click="sendMode = 'template'"
        >
          <text class="tab-text">使用模板</text>
        </view>
        <view 
          :class="['mode-tab', { active: sendMode === 'custom' }]"
          @click="sendMode = 'custom'"
        >
          <text class="tab-text">自定义内容</text>
        </view>
      </view>
    </view>

    <!-- 模板选择（使用模板模式） -->
    <view v-if="sendMode === 'template'" class="section">
      <view class="section-header">
        <text class="section-title">选择模板</text>
      </view>
      
      <!-- 加载状态 -->
      <view v-if="loadingTemplates" class="loading-drivers">
        <text class="loading-text">加载模板中...</text>
      </view>
      
      <!-- 模板列表 -->
      <view v-else class="template-select-list">
        <view
          v-for="template in serverTemplates"
          :key="template.id"
          :class="['template-select-item', { selected: selectedTemplateId === template.id }]"
          @click="selectTemplate(template)"
        >
          <view class="template-select-info">
            <text class="template-select-name">{{ template.name }}</text>
            <text class="template-select-title">{{ template.title }}</text>
          </view>
          <view v-if="selectedTemplateId === template.id" class="template-check">
            <text class="check-icon">✓</text>
          </view>
        </view>
      </view>
      
      <!-- 变量输入 -->
      <view v-if="selectedTemplate && selectedTemplate.variables" class="variables-section">
        <text class="variables-title">填写变量值：</text>
        <view v-for="(desc, key) in selectedTemplate.variables" :key="key" class="variable-input-item">
          <text class="variable-label">{{ key }}（{{ desc }}）</text>
          <input v-model="templateVariables[key]" class="variable-input" type="text" :placeholder="desc" />
        </view>
      </view>
      
      <!-- 预览 -->
      <view v-if="selectedTemplate" class="preview-section">
        <text class="preview-title">预览效果：</text>
        <view class="preview-card">
          <text class="preview-card-title">{{ renderedTitle }}</text>
          <text class="preview-card-content">{{ renderedContent }}</text>
        </view>
      </view>
    </view>

    <!-- 自定义内容（自定义模式） -->
    <view v-if="sendMode === 'custom'" class="section">
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

    <!-- 快捷模板（自定义模式） -->
    <view v-if="sendMode === 'custom'" class="section">
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
 * 选择接收司机
 * 支持使用模板或自定义内容发送通知
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { getUsers, createNotification, getNotificationTemplates, createNotificationFromTemplate } from '@/api'
import type { User, NotificationTemplate } from '@/api/types'
import { UserRole } from '@/api/types'

// ==================== 类型定义 ====================

/** 快捷通知模板 */
interface QuickTemplate {
  title: string
  content: string
}

// ==================== 状态 ====================

/** 发送模式：template=使用模板，custom=自定义内容 */
const sendMode = ref<'template' | 'custom'>('template')

/** 加载司机状态 */
const loadingDrivers = ref(false)

/** 加载模板状态 */
const loadingTemplates = ref(false)

/** 司机列表 */
const drivers = ref<User[]>([])

/** 服务端模板列表 */
const serverTemplates = ref<NotificationTemplate[]>([])

/** 选中的司机ID列表 */
const selectedDriverIds = ref<number[]>([])

/** 选中的模板ID */
const selectedTemplateId = ref<number | null>(null)

/** 选中的模板对象 */
const selectedTemplate = ref<NotificationTemplate | null>(null)

/** 模板变量值 */
const templateVariables = reactive<Record<string, string>>({})

/** 通知标题（自定义模式） */
const notifyTitle = ref('')

/** 通知内容（自定义模式） */
const notifyContent = ref('')

/** 快捷模板列表（自定义模式） */
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

/** 渲染后的标题 */
const renderedTitle = computed(() => {
  if (!selectedTemplate.value) return ''
  let title = selectedTemplate.value.title
  for (const [key, value] of Object.entries(templateVariables)) {
    title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`)
  }
  return title
})

/** 渲染后的内容 */
const renderedContent = computed(() => {
  if (!selectedTemplate.value) return ''
  let content = selectedTemplate.value.content
  for (const [key, value] of Object.entries(templateVariables)) {
    content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`)
  }
  return content
})

/** 是否可以发送 */
const canSend = computed(() => {
  if (selectedDriverIds.value.length === 0) return false
  
  if (sendMode.value === 'template') {
    return selectedTemplateId.value !== null
  } else {
    return notifyTitle.value.trim() !== ''
  }
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadDrivers()
  loadTemplates()
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
 * 加载模板列表
 */
async function loadTemplates(): Promise<void> {
  loadingTemplates.value = true
  try {
    const data = await getNotificationTemplates({ is_active: true })
    serverTemplates.value = data
  } catch (error) {
    console.error('加载模板列表失败:', error)
  } finally {
    loadingTemplates.value = false
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
 * 选择模板
 */
function selectTemplate(template: NotificationTemplate): void {
  selectedTemplateId.value = template.id
  selectedTemplate.value = template
  // 清空并初始化变量
  Object.keys(templateVariables).forEach(key => delete templateVariables[key])
  if (template.variables) {
    Object.keys(template.variables).forEach(key => {
      templateVariables[key] = ''
    })
  }
}

/**
 * 使用快捷模板（自定义模式）
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
    uni.showToast({ title: '请选择接收人并填写内容', icon: 'none' })
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
    
    if (sendMode.value === 'template' && selectedTemplateId.value) {
      // 使用模板发送
      await createNotificationFromTemplate({
        user_ids: selectedDriverIds.value,
        template_id: selectedTemplateId.value,
        variables: Object.keys(templateVariables).length > 0 ? templateVariables : undefined,
      })
    } else {
      // 自定义内容发送
      await createNotification({
        user_ids: selectedDriverIds.value,
        title: notifyTitle.value.trim(),
        content: notifyContent.value.trim() || undefined,
      })
    }
    
    uni.hideLoading()
    uni.showToast({ title: '发送成功', icon: 'success' })
    
    // 清空表单
    selectedDriverIds.value = []
    selectedTemplateId.value = null
    selectedTemplate.value = null
    Object.keys(templateVariables).forEach(key => delete templateVariables[key])
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
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.select-all {
  padding: 8rpx 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.select-all-text {
  font-size: 24rpx;
  color: #1890ff;
}

/* 发送模式选择 */
.mode-tabs {
  display: flex;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 8rpx;
}

.mode-tab {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  border-radius: 8rpx;
  transition: all 0.3s;
}

.mode-tab.active {
  background-color: #1890ff;
}

.tab-text {
  font-size: 28rpx;
  color: #666666;
}

.mode-tab.active .tab-text {
  color: #ffffff;
  font-weight: bold;
}

/* 加载状态 */
.loading-drivers {
  padding: 48rpx 0;
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
  padding: 16rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  background-color: #f8f9fa;
  
  &.selected {
    background-color: #e6f7ff;
    
    .check-box {
      background-color: #1890ff;
    }
  }
}

.driver-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.avatar-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
}

.driver-info {
  flex: 1;
}

.driver-name {
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 4rpx;
}

.driver-phone {
  font-size: 24rpx;
  color: #999999;
}

.check-box {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  font-size: 24rpx;
  color: #ffffff;
}

/* 已选择数量 */
.selected-count {
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
  margin-top: 16rpx;
}

.count-text {
  font-size: 24rpx;
  color: #999999;
}

/* 模板选择列表 */
.template-select-list {
  max-height: 400rpx;
  overflow-y: auto;
}

.template-select-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  background-color: #f8f9fa;
  
  &.selected {
    background-color: #e6f7ff;
    border: 2rpx solid #1890ff;
  }
}

.template-select-info {
  flex: 1;
}

.template-select-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
  display: block;
}

.template-select-title {
  font-size: 24rpx;
  color: #666666;
}

.template-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #1890ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 变量输入 */
.variables-section {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0f0f0;
}

.variables-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
  display: block;
}

.variable-input-item {
  margin-bottom: 16rpx;
}

.variable-label {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 8rpx;
  display: block;
}

.variable-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

/* 预览 */
.preview-section {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0f0f0;
}

.preview-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
  display: block;
}

.preview-card {
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
}

.preview-card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 12rpx;
  display: block;
}

.preview-card-content {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}

/* 输入组 */
.input-group {
  margin-bottom: 20rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.input-label {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 12rpx;
  display: block;
}

.title-input {
  width: 100%;
  height: 80rpx;
  background-color: #f8f9fa;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.content-input {
  width: 100%;
  height: 200rpx;
  background-color: #f8f9fa;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 快捷模板 */
.template-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.template-item {
  padding: 16rpx 24rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.template-title {
  font-size: 26rpx;
  color: #666666;
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
  background-color: #1890ff;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.disabled {
    background-color: #d9d9d9;
  }
}

.send-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
