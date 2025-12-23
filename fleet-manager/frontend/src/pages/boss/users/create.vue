<template>
  <!-- 
    创建用户页面
    填写用户信息，选择角色和仓库
    仅老板角色可访问
  -->
  <view class="create-user-page">
    <!-- 表单内容 -->
    <view class="form-card">
      <view class="card-title">
        <text class="title-text">用户信息</text>
      </view>
      
      <!-- 账号 -->
      <view class="form-item">
        <text class="form-label required">账号</text>
        <input
          v-model="form.username"
          class="form-input"
          type="text"
          placeholder="请输入登录账号"
        />
        <text class="form-hint">账号用于登录系统，创建后不可修改</text>
      </view>
      
      <!-- 密码 -->
      <view class="form-item">
        <text class="form-label required">密码</text>
        <input
          v-model="form.password"
          class="form-input"
          type="text"
          placeholder="请输入登录密码"
        />
        <text class="form-hint">密码长度至少6位</text>
      </view>
      
      <!-- 确认密码 -->
      <view class="form-item">
        <text class="form-label required">确认密码</text>
        <input
          v-model="form.confirmPassword"
          class="form-input"
          type="text"
          placeholder="请再次输入密码"
        />
      </view>
      
      <!-- 姓名 -->
      <view class="form-item">
        <text class="form-label required">姓名</text>
        <input
          v-model="form.name"
          class="form-input"
          type="text"
          placeholder="请输入真实姓名"
        />
      </view>
      
      <!-- 手机号 -->
      <view class="form-item">
        <text class="form-label">手机号</text>
        <input
          v-model="form.phone"
          class="form-input"
          type="text"
          placeholder="请输入手机号（选填）"
        />
      </view>
    </view>

    <!-- 角色选择 -->
    <view class="form-card">
      <view class="card-title">
        <text class="title-text">角色分配</text>
      </view>
      
      <view class="role-list">
        <view
          v-for="role in roleOptions"
          :key="role.value"
          :class="['role-item', { active: form.role === role.value }]"
          @click="form.role = role.value"
        >
          <view class="role-icon-wrapper">
            <text class="role-icon">{{ role.icon }}</text>
          </view>
          <view class="role-info">
            <text class="role-name">{{ role.label }}</text>
            <text class="role-desc">{{ role.description }}</text>
          </view>
          <view v-if="form.role === role.value" class="check-icon">
            <text class="check-text">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-section">
      <view class="submit-btn" @click="handleSubmit">
        <text class="btn-text">创建用户</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 创建用户页面
 * 填写用户信息，选择角色和仓库
 * 仅老板角色可访问
 */

import { reactive } from 'vue'
import { createUser } from '@/api'
import { UserRole } from '@/api/types'

// ==================== 状态 ====================

/** 表单数据 */
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  phone: '',
  role: UserRole.DRIVER as UserRole,
})

/** 角色选项配置 */
const roleOptions = [
  {
    label: '司机',
    value: UserRole.DRIVER,
    icon: '🚗',
    description: '可以打卡、录入计件、申请请假、管理车辆',
  },
  {
    label: '车队长',
    value: UserRole.MANAGER,
    icon: '👨‍💼',
    description: '可以管理司机、审批请假、查看统计报表',
  },
  {
    label: '老板',
    value: UserRole.BOSS,
    icon: '👔',
    description: '拥有所有权限，可以管理用户、仓库、分类等',
  },
]

// ==================== 方法 ====================

/**
 * 验证表单
 * 
 * @returns 是否验证通过
 */
function validateForm(): boolean {
  // 验证账号
  if (!form.username.trim()) {
    uni.showToast({
      title: '请输入账号',
      icon: 'none',
    })
    return false
  }
  
  // 验证账号格式（只允许字母、数字、下划线）
  if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
    uni.showToast({
      title: '账号只能包含字母、数字和下划线',
      icon: 'none',
    })
    return false
  }
  
  // 验证密码
  if (!form.password) {
    uni.showToast({
      title: '请输入密码',
      icon: 'none',
    })
    return false
  }
  
  // 验证密码长度
  if (form.password.length < 6) {
    uni.showToast({
      title: '密码长度至少6位',
      icon: 'none',
    })
    return false
  }
  
  // 验证确认密码
  if (form.password !== form.confirmPassword) {
    uni.showToast({
      title: '两次输入的密码不一致',
      icon: 'none',
    })
    return false
  }
  
  // 验证姓名
  if (!form.name.trim()) {
    uni.showToast({
      title: '请输入姓名',
      icon: 'none',
    })
    return false
  }
  
  // 验证手机号格式（如果填写了）
  if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none',
    })
    return false
  }
  
  return true
}

/**
 * 提交创建用户
 */
async function handleSubmit(): Promise<void> {
  // 表单验证
  if (!validateForm()) {
    return
  }
  
  try {
    uni.showLoading({ title: '创建中...' })
    
    await createUser({
      username: form.username.trim(),
      password: form.password,
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
    })
    
    uni.hideLoading()
    uni.showToast({
      title: '创建成功',
      icon: 'success',
    })
    
    // 返回上一页
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    console.error('创建用户失败:', error)
    uni.hideLoading()
    
    // 处理特定错误
    const errorMsg = error?.message || '创建失败'
    if (errorMsg.includes('already exists') || errorMsg.includes('已存在')) {
      uni.showToast({
        title: '账号已存在',
        icon: 'none',
      })
    } else {
      uni.showToast({
        title: errorMsg,
        icon: 'none',
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.create-user-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

/* 表单卡片 */
.form-card {
  margin: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.card-title {
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 20rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

/* 表单项 */
.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 12rpx;
  display: block;
  
  &.required::before {
    content: '*';
    color: #ff4d4f;
    margin-right: 8rpx;
  }
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333333;
}

.form-hint {
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
  display: block;
}

/* 角色列表 */
.role-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.role-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  
  &.active {
    background-color: #e6f7ff;
    border-color: #1890ff;
  }
}

.role-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.role-icon {
  font-size: 40rpx;
}

.role-info {
  flex: 1;
}

.role-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 8rpx;
}

.role-desc {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.4;
}

.check-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background-color: #1890ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: bold;
}

/* 提交按钮 */
.submit-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.submit-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 12rpx;
}

.btn-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
