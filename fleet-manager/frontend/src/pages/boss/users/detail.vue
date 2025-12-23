<template>
  <!-- 
    用户详情页面
    显示用户完整信息，支持编辑和角色分配
    仅老板角色可访问
  -->
  <view class="user-detail-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 用户信息 -->
    <view v-else-if="user" class="user-content">
      <!-- 用户头像和基本信息 -->
      <view class="user-header">
        <view :class="['user-avatar', getRoleClass(user.role)]">
          <text class="avatar-text">{{ user.name.charAt(0) }}</text>
        </view>
        <view class="user-basic">
          <text class="user-name">{{ user.name }}</text>
          <view class="user-tags">
            <view :class="['role-tag', getRoleClass(user.role)]">
              <text class="tag-text">{{ getRoleName(user.role) }}</text>
            </view>
            <view v-if="!user.is_active" class="status-tag inactive">
              <text class="tag-text">已禁用</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 详细信息卡片 -->
      <view class="info-card">
        <view class="card-title">
          <text class="title-text">基本信息</text>
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

      <!-- 编辑表单 -->
      <view class="edit-card">
        <view class="card-title">
          <text class="title-text">编辑信息</text>
        </view>
        
        <!-- 姓名 -->
        <view class="form-item">
          <text class="form-label">姓名</text>
          <input
            v-model="editForm.name"
            class="form-input"
            type="text"
            placeholder="请输入姓名"
          />
        </view>
        
        <!-- 手机号 -->
        <view class="form-item">
          <text class="form-label">手机号</text>
          <input
            v-model="editForm.phone"
            class="form-input"
            type="text"
            placeholder="请输入手机号"
          />
        </view>
        
        <!-- 角色选择 -->
        <view class="form-item">
          <text class="form-label">角色</text>
          <view class="role-selector">
            <view
              v-for="role in roleOptions"
              :key="role.value"
              :class="['role-option', { active: editForm.role === role.value }]"
              @click="editForm.role = role.value"
            >
              <text class="option-text">{{ role.label }}</text>
            </view>
          </view>
        </view>
        
        <!-- 状态开关 -->
        <view class="form-item">
          <text class="form-label">账号状态</text>
          <view class="status-switch">
            <view
              :class="['switch-option', { active: editForm.is_active }]"
              @click="editForm.is_active = true"
            >
              <text class="option-text">启用</text>
            </view>
            <view
              :class="['switch-option', { active: !editForm.is_active }]"
              @click="editForm.is_active = false"
            >
              <text class="option-text">禁用</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <view class="btn save-btn" @click="handleSave">
          <text class="btn-text">保存修改</text>
        </view>
        <view class="btn delete-btn" @click="handleDelete">
          <text class="btn-text">删除用户</text>
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text class="error-icon">😕</text>
      <text class="error-text">用户不存在或加载失败</text>
      <view class="retry-btn" @click="loadUser">
        <text class="retry-text">重新加载</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 用户详情页面
 * 显示用户完整信息，支持编辑和角色分配
 * 仅老板角色可访问
 */

import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getUser, updateUser, deleteUser } from '@/api'
import type { User } from '@/api/types'
import { UserRole } from '@/api/types'
import { formatDateTime, getRoleName } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 用户ID */
const userId = ref<number>(0)

/** 用户信息 */
const user = ref<User | null>(null)

/** 编辑表单 */
const editForm = reactive({
  name: '',
  phone: '',
  role: UserRole.DRIVER as UserRole,
  is_active: true,
})

/** 角色选项 */
const roleOptions = [
  { label: '司机', value: UserRole.DRIVER },
  { label: '车队长', value: UserRole.MANAGER },
  { label: '老板', value: UserRole.BOSS },
]

// ==================== 生命周期 ====================

onLoad((options) => {
  // 从路由参数获取用户ID
  if (options?.id) {
    userId.value = parseInt(options.id as string, 10)
    loadUser()
  }
})

// ==================== 方法 ====================

/**
 * 加载用户信息
 */
async function loadUser(): Promise<void> {
  if (!userId.value) return
  
  loading.value = true
  try {
    const data = await getUser(userId.value)
    user.value = data
    
    // 初始化编辑表单
    editForm.name = data.name
    editForm.phone = data.phone || ''
    editForm.role = data.role
    editForm.is_active = data.is_active
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
 * 获取角色对应的样式类
 * 
 * @param role - 用户角色
 * @returns 样式类名
 */
function getRoleClass(role: string): string {
  switch (role) {
    case UserRole.BOSS:
      return 'boss'
    case UserRole.MANAGER:
      return 'manager'
    case UserRole.DRIVER:
    default:
      return 'driver'
  }
}

/**
 * 保存用户信息
 */
async function handleSave(): Promise<void> {
  // 表单验证
  if (!editForm.name.trim()) {
    uni.showToast({
      title: '请输入姓名',
      icon: 'none',
    })
    return
  }
  
  try {
    uni.showLoading({ title: '保存中...' })
    
    await updateUser(userId.value, {
      name: editForm.name.trim(),
      phone: editForm.phone.trim() || undefined,
      role: editForm.role,
      is_active: editForm.is_active,
    })
    
    uni.hideLoading()
    uni.showToast({
      title: '保存成功',
      icon: 'success',
    })
    
    // 重新加载用户信息
    await loadUser()
  } catch (error) {
    console.error('保存用户信息失败:', error)
    uni.hideLoading()
    uni.showToast({
      title: '保存失败',
      icon: 'none',
    })
  }
}

/**
 * 删除用户
 */
function handleDelete(): void {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除用户"${user.value?.name}"吗？此操作不可恢复。`,
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })
          
          await deleteUser(userId.value)
          
          uni.hideLoading()
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          })
          
          // 返回上一页
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } catch (error) {
          console.error('删除用户失败:', error)
          uni.hideLoading()
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
.user-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 40rpx;
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
.user-header {
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
  
  &.driver {
    background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  }
  
  &.manager {
    background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  }
  
  &.boss {
    background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  }
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
}

.user-tags {
  display: flex;
  gap: 12rpx;
}

.role-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  
  &.driver {
    background-color: rgba(74, 144, 226, 0.3);
  }
  
  &.manager {
    background-color: rgba(82, 196, 26, 0.3);
  }
  
  &.boss {
    background-color: rgba(250, 173, 20, 0.3);
  }
}

.status-tag.inactive {
  background-color: rgba(255, 77, 79, 0.3);
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

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333333;
}

/* 角色选择器 */
.role-selector,
.status-switch {
  display: flex;
  gap: 16rpx;
}

.role-option,
.switch-option {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  
  &.active {
    background-color: #e6f7ff;
    border-color: #1890ff;
    
    .option-text {
      color: #1890ff;
    }
  }
}

.option-text {
  font-size: 28rpx;
  color: #666666;
}

/* 操作按钮 */
.action-buttons {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}

.save-btn {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  
  .btn-text {
    color: #ffffff;
  }
}

.delete-btn {
  background-color: #fff1f0;
  border: 1rpx solid #ffccc7;
  
  .btn-text {
    color: #ff4d4f;
  }
}

.btn-text {
  font-size: 30rpx;
  font-weight: bold;
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
