<!--
  首页 - 角色路由跳转页面
  根据用户角色自动跳转到对应的工作台页面
  - 司机 → /pages/driver/index
  - 车队长 → /pages/manager/index
  - 老板/调度 → /pages/boss/index
  
  UI 风格与主项目保持一致：加载状态显示、超时处理
  
  @requirements 2.2 - 角色路由
-->
<template>
  <view class="index-page">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <!-- 错误状态 -->
    <view v-if="error" class="error-container">
      <view class="error-card">
        <text class="error-icon">⚠️</text>
        <text class="error-text">{{ error }}</text>
      </view>
    </view>
    
    <!-- 加载状态 - 由 uni.showLoading 显示 -->
  </view>
</template>

<script setup lang="ts">
/**
 * 首页 - 角色路由跳转页面
 * 
 * @description 根据用户角色自动跳转到对应的工作台页面
 * 这是一个中转页面，不显示实际内容，只负责路由跳转
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { UserRole } from '@/api/types'

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 状态 ====================

/** 错误信息 */
const error = ref<string | null>(null)

/** 是否已跳转（防止重复跳转） */
let hasRedirected = false

/** 超时定时器 */
let timeoutTimer: ReturnType<typeof setTimeout> | null = null

// ==================== 生命周期 ====================

onMounted(() => {
  // 显示加载状态
  uni.showLoading({ title: '正在验证身份...' })
  
  // 设置超时处理（8秒）
  timeoutTimer = setTimeout(() => {
    if (!hasRedirected) {
      handleTimeout()
    }
  }, 8000)
  
  // 检查登录状态并跳转
  checkAndRedirect()
})

onShow(() => {
  // 页面显示时重新检查
  if (!hasRedirected) {
    checkAndRedirect()
  }
})

onUnmounted(() => {
  // 清理定时器
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
    timeoutTimer = null
  }
  
  // 隐藏加载状态
  uni.hideLoading()
})

// ==================== 方法 ====================

/**
 * 检查登录状态并跳转到对应页面
 */
async function checkAndRedirect(): Promise<void> {
  // 检查是否已登录
  if (!userStore.isLoggedIn) {
    // 未登录，跳转到登录页
    redirectTo('/pages/login/index')
    return
  }
  
  // 刷新用户信息
  try {
    await userStore.refreshUser()
  } catch (err) {
    console.error('刷新用户信息失败:', err)
  }
  
  // 获取用户角色
  const role = userStore.role
  
  if (!role) {
    // 无角色信息，等待加载
    return
  }
  
  // 根据角色跳转
  redirectByRole(role)
}

/**
 * 根据角色跳转到对应页面
 * @param role - 用户角色
 */
function redirectByRole(role: string): void {
  if (hasRedirected) return
  
  // 更新加载状态
  uni.showLoading({ title: '正在跳转...' })
  
  // 清除超时定时器
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
    timeoutTimer = null
  }
  
  // 根据角色跳转到对应的工作台
  switch (role) {
    case UserRole.DRIVER:
      // 司机 → 司机工作台
      redirectTo('/pages/driver/index/index')
      break
      
    case UserRole.MANAGER:
      // 车队长 → 车队长工作台
      redirectTo('/pages/manager/index/index')
      break
      
    case UserRole.BOSS:
    case UserRole.PEER_ADMIN:
      // 老板/调度 → 管理后台
      redirectTo('/pages/boss/index/index')
      break
      
    case UserRole.SUPER_ADMIN:
      // 超级管理员 → 管理后台
      redirectTo('/pages/boss/index/index')
      break
      
    default:
      // 未知角色 → 个人中心
      redirectTo('/pages/profile/index')
  }
}

/**
 * 跳转到指定页面
 * @param url - 目标页面路径
 */
function redirectTo(url: string): void {
  if (hasRedirected) return
  hasRedirected = true
  
  // 隐藏加载状态
  uni.hideLoading()
  
  // 使用 reLaunch 确保跳转成功
  uni.reLaunch({
    url,
    fail: (err) => {
      console.error('跳转失败:', err)
      // 备用方案：使用 switchTab
      uni.switchTab({
        url,
        fail: () => {
          // 最后尝试 navigateTo
          uni.navigateTo({ url })
        }
      })
    }
  })
}

/**
 * 处理超时
 */
function handleTimeout(): void {
  if (hasRedirected) return
  
  // 隐藏加载状态
  uni.hideLoading()
  
  // 显示错误
  error.value = '加载超时，请重新登录'
  
  // 2秒后跳转到登录页
  setTimeout(() => {
    redirectTo('/pages/login/index')
  }, 2000)
}
</script>

<style lang="scss" scoped>
/* 首页容器 */
.index-page {
  min-height: 100vh;
  background-color: #F8FAFC;
}

/* 顶部安全区域 */
.safe-area-top {
  height: env(safe-area-inset-top);
  height: constant(safe-area-inset-top);
}

/* 错误容器 */
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 88rpx);
  padding: 0 64rpx;
}

/* 错误卡片 */
.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #FEF2F2;
  border-radius: 16rpx;
  padding: 48rpx;
}

.error-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.error-text {
  font-size: 28rpx;
  color: #DC2626;
  text-align: center;
}
</style>
