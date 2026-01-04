<!--
  首页 - 角色路由跳转页面
  根据用户角色自动跳转到对应的工作台页面
  - 司机 → /pages/driver/index
  - 车队长 → /pages/manager/index
  - 老板/调度 → /pages/boss/index
  
  简化版本：不做网络请求，直接根据本地存储状态跳转
  
  @requirements 2.2 - 角色路由
-->
<template>
  <view class="index-page">
    <!-- 简单的加载界面，使用白色背景避免闪屏 -->
    <view class="loading-container">
      <text class="loading-text">正在加载...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 首页 - 角色路由跳转页面
 * 
 * @description 根据用户角色自动跳转到对应的工作台页面
 * 这是一个中转页面，不显示实际内容，只负责路由跳转
 * 
 * 简化逻辑：不做任何网络请求，直接根据本地存储状态跳转
 */

import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { UserRole } from '@/api/types'

// ==================== Store ====================

const userStore = useUserStore()

/** 是否已跳转（防止重复跳转） */
let hasRedirected = false

// ==================== 生命周期 ====================

// 使用 onLoad 替代 onMounted，更早执行
onLoad(() => {
  console.log('[Index] 页面加载，开始检查登录状态')
  
  // 立即隐藏 tabBar，避免闪屏
  uni.hideTabBar({ animation: false })
  
  // 确保从存储初始化
  userStore.initFromStorage()
  
  // 立即执行跳转，不再延迟
  checkAndRedirect()
})

// ==================== 方法 ====================

/**
 * 检查登录状态并跳转到对应页面
 * 纯本地检查，不做任何网络请求
 */
function checkAndRedirect(): void {
  if (hasRedirected) return
  
  console.log('[Index] 检查登录状态:', {
    isLoggedIn: userStore.isLoggedIn,
    role: userStore.role,
    hasToken: !!userStore.token,
    hasUser: !!userStore.user
  })
  
  // 检查是否已登录
  if (!userStore.isLoggedIn) {
    console.log('[Index] 未登录，跳转到登录页')
    redirectTo('/pages/login/index')
    return
  }
  
  // 获取用户角色
  const role = userStore.role
  
  if (!role) {
    console.log('[Index] 无角色信息，跳转到登录页')
    redirectTo('/pages/login/index')
    return
  }
  
  // 根据角色跳转
  console.log('[Index] 已登录，角色:', role)
  redirectByRole(role)
}

/**
 * 根据角色跳转到对应页面
 * @param role - 用户角色
 */
function redirectByRole(role: string): void {
  // 根据角色跳转到对应的工作台
  switch (role) {
    case UserRole.DRIVER:
      redirectTo('/pages/driver/index/index')
      break
      
    case UserRole.MANAGER:
      redirectTo('/pages/manager/index/index')
      break
      
    case UserRole.BOSS:
    case UserRole.PEER_ADMIN:
      redirectTo('/pages/boss/index/index')
      break
      
    default:
      // 未知角色 → 登录页
      redirectTo('/pages/login/index')
  }
}

/**
 * 跳转到指定页面
 * @param url - 目标页面路径
 */
function redirectTo(url: string): void {
  if (hasRedirected) return
  hasRedirected = true
  
  console.log('[Index] 跳转到:', url)
  
  // 使用 reLaunch 确保跳转成功
  uni.reLaunch({
    url,
    fail: (err) => {
      console.error('[Index] reLaunch 失败:', err)
      // 备用方案
      uni.navigateTo({ 
        url,
        fail: () => {
          console.error('[Index] navigateTo 也失败了')
        }
      })
    }
  })
}
</script>

<style lang="scss" scoped>
/* 首页容器 - 使用与登录页相同的背景，避免跳转闪烁 */
.index-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #60A5FA 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 加载容器 */
.loading-container {
  text-align: center;
}

.loading-text {
  color: #ffffff;
  font-size: 32rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
}
</style>
