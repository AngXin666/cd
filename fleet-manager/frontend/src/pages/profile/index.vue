<!--
  个人中心页面
  显示用户信息，提供修改密码、退出登录等功能
  
  @requirements 7.1 - 统一的页面布局和用户体验
-->
<template>
  <view class="profile-page">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <!-- 头像区域 -->
      <view class="avatar-section">
        <view class="avatar">
          <text class="avatar-text">{{ avatarText }}</text>
        </view>
        <view class="user-info">
          <text class="user-name">{{ userStore.userName || '未登录' }}</text>
          <view class="role-tag" :class="roleClass">
            <text>{{ roleText }}</text>
          </view>
        </view>
      </view>

      <!-- 用户详情 -->
      <view class="user-details">
        <view class="detail-item">
          <text class="detail-label">用户名</text>
          <text class="detail-value">{{ userStore.user?.username || '-' }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">手机号</text>
          <text class="detail-value">{{ userStore.user?.phone || '未绑定' }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">注册时间</text>
          <text class="detail-value">{{ formatDate(userStore.user?.created_at) }}</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @click="showPasswordModal = true">
          <text class="menu-icon">🔐</text>
          <text class="menu-text">修改密码</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="handleRefresh">
          <text class="menu-icon">🔄</text>
          <text class="menu-text">刷新信息</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="menu-group">
        <view class="menu-item" @click="handleAbout">
          <text class="menu-icon">ℹ️</text>
          <text class="menu-text">关于我们</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-section">
      <button class="logout-btn" @click="handleLogout">
        退出登录
      </button>
    </view>

    <!-- 版本信息 -->
    <view class="version-section">
      <text class="version-text">版本 1.0.0</text>
    </view>

    <!-- 修改密码弹窗 -->
    <view v-if="showPasswordModal" class="modal-overlay" @click="closePasswordModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">修改密码</text>
          <text class="modal-close" @click="closePasswordModal">✕</text>
        </view>
        
        <view class="modal-body">
          <!-- 旧密码 -->
          <view class="form-item">
            <text class="form-label">旧密码</text>
            <input
              v-model="passwordForm.oldPassword"
              class="form-input"
              type="password"
              placeholder="请输入旧密码"
            />
          </view>
          
          <!-- 新密码 -->
          <view class="form-item">
            <text class="form-label">新密码</text>
            <input
              v-model="passwordForm.newPassword"
              class="form-input"
              type="password"
              placeholder="请输入新密码（至少6位）"
            />
          </view>
          
          <!-- 确认密码 -->
          <view class="form-item">
            <text class="form-label">确认密码</text>
            <input
              v-model="passwordForm.confirmPassword"
              class="form-input"
              type="password"
              placeholder="请再次输入新密码"
            />
          </view>
        </view>
        
        <view class="modal-footer">
          <button class="modal-btn cancel" @click="closePasswordModal">取消</button>
          <button 
            class="modal-btn confirm" 
            :disabled="changingPassword"
            @click="handleChangePassword"
          >
            {{ changingPassword ? '提交中...' : '确认修改' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 个人中心页面组件
 * 
 * @description 显示用户信息，提供修改密码、退出登录等功能
 */

import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { useAppStore } from '@/store/app'
import { changePassword } from '@/api'
import { UserRole } from '@/api/types'

// ==================== Store ====================

const userStore = useUserStore()
const appStore = useAppStore()

// ==================== 状态 ====================

/** 是否显示修改密码弹窗 */
const showPasswordModal = ref(false)

/** 是否正在修改密码 */
const changingPassword = ref(false)

/** 密码表单 */
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// ==================== 计算属性 ====================

/**
 * 头像文字
 * 取用户名的第一个字符
 */
const avatarText = computed(() => {
  const name = userStore.userName
  return name ? name.charAt(0).toUpperCase() : '?'
})

/**
 * 角色显示文本
 */
const roleText = computed(() => {
  const role = userStore.role
  switch (role) {
    case UserRole.DRIVER:
      return '司机'
    case UserRole.MANAGER:
      return '车队长'
    case UserRole.BOSS:
      return '老板'
    default:
      return '未知'
  }
})

/**
 * 角色样式类
 */
const roleClass = computed(() => {
  const role = userStore.role
  switch (role) {
    case UserRole.DRIVER:
      return 'role-driver'
    case UserRole.MANAGER:
      return 'role-manager'
    case UserRole.BOSS:
      return 'role-boss'
    default:
      return ''
  }
})

// ==================== 方法 ====================

/**
 * 格式化日期
 * @param dateStr - 日期字符串
 * @returns 格式化后的日期
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return '-'
  }
}

/**
 * 刷新用户信息
 */
async function handleRefresh() {
  try {
    uni.showLoading({ title: '刷新中...' })
    await userStore.refreshUser()
    uni.hideLoading()
    appStore.showSuccess('刷新成功')
  } catch (error) {
    uni.hideLoading()
    appStore.showError('刷新失败')
  }
}

/**
 * 关闭密码弹窗
 */
function closePasswordModal() {
  showPasswordModal.value = false
  // 清空表单
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
}

/**
 * 处理修改密码
 */
async function handleChangePassword() {
  const { oldPassword, newPassword, confirmPassword } = passwordForm.value

  // 验证旧密码
  if (!oldPassword) {
    appStore.showError('请输入旧密码')
    return
  }

  // 验证新密码
  if (!newPassword) {
    appStore.showError('请输入新密码')
    return
  }

  if (newPassword.length < 6) {
    appStore.showError('新密码至少6位')
    return
  }

  // 验证确认密码
  if (newPassword !== confirmPassword) {
    appStore.showError('两次密码不一致')
    return
  }

  // 提交修改
  changingPassword.value = true

  try {
    await changePassword({
      old_password: oldPassword,
      new_password: newPassword,
    })

    appStore.showSuccess('密码修改成功')
    closePasswordModal()
  } catch (error) {
    console.error('修改密码失败:', error)
    const errorMessage = error instanceof Error ? error.message : '修改失败'
    appStore.showError(errorMessage)
  } finally {
    changingPassword.value = false
  }
}

/**
 * 处理退出登录
 */
async function handleLogout() {
  const confirmed = await appStore.showConfirm({
    title: '退出登录',
    content: '确定要退出登录吗？',
    confirmText: '退出',
    cancelText: '取消',
  })

  if (confirmed) {
    // 清除登录状态
    userStore.logout()

    // 跳转到登录页
    uni.reLaunch({
      url: '/pages/login/index',
    })
  }
}

/**
 * 显示关于信息
 */
function handleAbout() {
  uni.showModal({
    title: '关于车队管家',
    content: '车队管家是一款专业的车队管理应用，提供考勤打卡、计件管理、请假审批、车辆管理等功能。\n\n版本：1.0.0\n开发团队：车队管家团队',
    showCancel: false,
    confirmText: '知道了',
  })
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.profile-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 用户卡片 */
.user-card {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  padding: 48rpx 32rpx;
  margin-bottom: 24rpx;
}

.avatar-section {
  display: flex;
  align-items: center;
  margin-bottom: 32rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8rpx;
  display: block;
}

.role-tag {
  display: inline-flex;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}

.role-driver {
  background-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.role-manager {
  background-color: rgba(250, 173, 20, 0.8);
  color: #ffffff;
}

.role-boss {
  background-color: rgba(245, 34, 45, 0.8);
  color: #ffffff;
}

/* 用户详情 */
.user-details {
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  padding: 24rpx;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.detail-item:not(:last-child) {
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}

.detail-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.detail-value {
  font-size: 28rpx;
  color: #ffffff;
}

/* 菜单区域 */
.menu-section {
  padding: 0 24rpx;
}

.menu-group {
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background-color: #f5f5f5;
}

.menu-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333333;
}

.menu-arrow {
  font-size: 32rpx;
  color: #cccccc;
}

/* 退出登录 */
.logout-section {
  padding: 48rpx 24rpx;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  background-color: #ffffff;
  border: 2rpx solid #f5222d;
  border-radius: 16rpx;
  font-size: 32rpx;
  color: #f5222d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn:active {
  background-color: #fff1f0;
}

/* 版本信息 */
.version-section {
  text-align: center;
  padding-bottom: 32rpx;
}

.version-text {
  font-size: 24rpx;
  color: #999999;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 600rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333333;
}

.modal-close {
  font-size: 36rpx;
  color: #999999;
  padding: 8rpx;
}

.modal-body {
  padding: 32rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 12rpx;
  display: block;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.modal-footer {
  display: flex;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.modal-btn.cancel {
  background-color: #f5f5f5;
  color: #666666;
  margin-right: 16rpx;
}

.modal-btn.confirm {
  background-color: #4a90e2;
  color: #ffffff;
}

.modal-btn.confirm:disabled {
  background-color: #cccccc;
}
</style>
