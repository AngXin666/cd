<!--
  管理员资料页面
  显示当前登录管理员的基本信息，支持编辑姓名和手机号
  仅老板角色可访问
-->
<template>
  <view class="admin-profile-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">
        <text class="title-text">管理员资料</text>
      </view>
      <view class="nav-right" />
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 用户信息 -->
    <view v-else-if="user" class="profile-content">
      <!-- 用户头像和基本信息 -->
      <view class="profile-header">
        <view class="user-avatar">
          <text class="avatar-text">{{ user.name.charAt(0) }}</text>
        </view>
        <view class="user-basic">
          <text class="user-name">{{ user.name }}</text>
          <view class="role-tag">
            <text class="tag-text">{{ getRoleName(user.role) }}</text>
          </view>
        </view>
      </view>

      <!-- 基本信息卡片（只读模式） -->
      <view v-if="!isEditing" class="info-card">
        <view class="card-title">
          <text class="title-text">基本信息</text>
          <view class="edit-btn" @click="startEdit">
            <text class="edit-text">编辑</text>
          </view>
        </view>
        
        <view class="info-item">
          <text class="item-label">账号</text>
          <text class="item-value">{{ user.username }}</text>
        </view>
        
        <view class="info-item">
          <text class="item-label">姓名</text>
          <text class="item-value">{{ user.name }}</text>
        </view>
        
        <view class="info-item">
          <text class="item-label">手机号</text>
          <text class="item-value">{{ user.phone || '未设置' }}</text>
        </view>
        
        <view class="info-item">
          <text class="item-label">角色</text>
          <text class="item-value">{{ getRoleName(user.role) }}</text>
        </view>
        
        <view class="info-item">
          <text class="item-label">状态</text>
          <text :class="['item-value', user.is_active ? 'active' : 'inactive']">
            {{ user.is_active ? '正常' : '已禁用' }}
          </text>
        </view>
        
        <view class="info-item">
          <text class="item-label">创建时间</text>
          <text class="item-value">{{ formatDateTime(user.created_at) }}</text>
        </view>
      </view>

      <!-- 编辑表单（编辑模式） -->
      <view v-else class="edit-card">
        <view class="card-title">
          <text class="title-text">编辑资料</text>
          <view class="cancel-btn" @click="cancelEdit">
            <text class="cancel-text">取消</text>
          </view>
        </view>
        
        <!-- 姓名输入 -->
        <view class="form-item">
          <text class="form-label">姓名 <text class="required">*</text></text>
          <input
            v-model="editForm.name"
            class="form-input"
            type="text"
            placeholder="请输入姓名"
            maxlength="20"
          />
          <text v-if="errors.name" class="error-text">{{ errors.name }}</text>
        </view>
        
        <!-- 手机号输入 -->
        <view class="form-item">
          <text class="form-label">手机号</text>
          <input
            v-model="editForm.phone"
            class="form-input"
            type="text"
            placeholder="请输入手机号"
            maxlength="11"
          />
          <text v-if="errors.phone" class="error-text">{{ errors.phone }}</text>
        </view>

        <!-- 保存按钮 -->
        <view class="save-btn" :class="{ disabled: submitting }" @click="handleSave">
          <text class="save-text">{{ submitting ? '保存中...' : '保存修改' }}</text>
        </view>
      </view>

      <!-- 账号信息卡片（只读） -->
      <view class="info-card readonly">
        <view class="card-title">
          <text class="title-text">账号信息</text>
        </view>
        
        <view class="info-item">
          <text class="item-label">用户ID</text>
          <text class="item-value">{{ user.id }}</text>
        </view>
        
        <view class="info-item">
          <text class="item-label">账号</text>
          <text class="item-value">{{ user.username }}</text>
        </view>
        
        <view class="info-tip">
          <text class="tip-text">账号和角色信息不可修改，如需变更请联系系统管理员</text>
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text class="error-icon">😕</text>
      <text class="error-text">加载失败，请重试</text>
      <view class="retry-btn" @click="loadUserInfo">
        <text class="retry-text">重新加载</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 管理员资料页面
 * 显示当前登录管理员的基本信息，支持编辑姓名和手机号
 * 仅老板角色可访问
 */

import { ref, reactive, onMounted } from 'vue'
import { getCurrentUser, updateUser } from '@/api'
import type { User } from '@/api/types'
import { UserRole } from '@/api/types'
import { formatDateTime, getRoleName } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 提交状态 */
const submitting = ref(false)

/** 是否处于编辑模式 */
const isEditing = ref(false)

/** 用户信息 */
const user = ref<User | null>(null)

/** 编辑表单 */
const editForm = reactive({
  name: '',
  phone: '',
})

/** 表单错误信息 */
const errors = reactive({
  name: '',
  phone: '',
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadUserInfo()
})

// ==================== 方法 ====================

/**
 * 返回上一页
 */
function handleBack(): void {
  uni.navigateBack()
}

/**
 * 加载当前用户信息
 */
async function loadUserInfo(): Promise<void> {
  loading.value = true
  try {
    const data = await getCurrentUser()
    user.value = data
  } catch (error) {
    console.error('加载用户信息失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 进入编辑模式
 */
function startEdit(): void {
  if (!user.value) return
  
  // 初始化编辑表单
  editForm.name = user.value.name
  editForm.phone = user.value.phone || ''
  
  // 清空错误信息
  errors.name = ''
  errors.phone = ''
  
  isEditing.value = true
}

/**
 * 取消编辑
 */
function cancelEdit(): void {
  isEditing.value = false
  
  // 清空错误信息
  errors.name = ''
  errors.phone = ''
}

/**
 * 验证表单
 * @returns 是否验证通过
 */
function validateForm(): boolean {
  let isValid = true
  
  // 清空错误信息
  errors.name = ''
  errors.phone = ''
  
  // 验证姓名
  const name = editForm.name.trim()
  if (!name) {
    errors.name = '请输入姓名'
    isValid = false
  } else if (name.length > 20) {
    errors.name = '姓名不能超过20个字符'
    isValid = false
  }
  
  // 验证手机号（可选，但如果填写了必须格式正确）
  const phone = editForm.phone.trim()
  if (phone) {
    // 中国大陆手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      errors.phone = '请输入正确的手机号格式'
      isValid = false
    }
  }
  
  return isValid
}

/**
 * 保存用户信息
 */
async function handleSave(): Promise<void> {
  // 防止重复提交
  if (submitting.value) return
  
  // 表单验证
  if (!validateForm()) {
    return
  }
  
  if (!user.value) return
  
  submitting.value = true
  try {
    // 调用 API 更新用户信息
    await updateUser(user.value.id, {
      name: editForm.name.trim(),
      phone: editForm.phone.trim() || undefined,
    })
    
    uni.showToast({
      title: '保存成功',
      icon: 'success',
    })
    
    // 退出编辑模式
    isEditing.value = false
    
    // 重新加载用户信息
    await loadUserInfo()
  } catch (error: any) {
    console.error('保存用户信息失败:', error)
    
    // 处理手机号重复错误
    if (error?.message?.includes('手机号已被使用') || 
        error?.response?.data?.detail?.includes('phone')) {
      errors.phone = '该手机号已被其他用户使用'
    } else {
      uni.showToast({
        title: '保存失败',
        icon: 'none',
      })
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.admin-profile-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 40rpx;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

.nav-left,
.nav-right {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.back-icon {
  font-size: 40rpx;
  color: #ffffff;
}

.nav-title {
  flex: 1;
  text-align: center;
}

.title-text {
  font-size: 34rpx;
  font-weight: bold;
  color: #ffffff;
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

/* 用户头部 */
.profile-header {
  display: flex;
  align-items: center;
  padding: 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
}

.avatar-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
}

.user-basic {
  flex: 1;
}

.user-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 12rpx;
  display: block;
}

.role-tag {
  display: inline-block;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  background-color: rgba(250, 173, 20, 0.3);
}

.tag-text {
  font-size: 24rpx;
  color: #ffffff;
}

/* 信息卡片 */
.info-card,
.edit-card {
  margin: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.info-card.readonly {
  margin-top: 0;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 20rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.edit-btn,
.cancel-btn {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
}

.edit-btn {
  background-color: #e6f7ff;
}

.edit-text {
  font-size: 26rpx;
  color: #1890ff;
}

.cancel-btn {
  background-color: #f5f5f5;
}

.cancel-text {
  font-size: 26rpx;
  color: #666666;
}

/* 信息项 */
.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.item-label {
  font-size: 28rpx;
  color: #666666;
}

.item-value {
  font-size: 28rpx;
  color: #333333;
  
  &.active {
    color: #52c41a;
  }
  
  &.inactive {
    color: #ff4d4f;
  }
}

/* 提示信息 */
.info-tip {
  margin-top: 16rpx;
  padding: 16rpx;
  background-color: #fffbe6;
  border-radius: 8rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #faad14;
}

/* 表单项 */
.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 12rpx;
  display: block;
}

.required {
  color: #ff4d4f;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.error-text {
  font-size: 24rpx;
  color: #ff4d4f;
  margin-top: 8rpx;
  display: block;
}

/* 保存按钮 */
.save-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  margin-top: 32rpx;
  
  &.disabled {
    opacity: 0.6;
  }
}

.save-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #ffffff;
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
  margin-bottom: 32rpx;
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
</style>
