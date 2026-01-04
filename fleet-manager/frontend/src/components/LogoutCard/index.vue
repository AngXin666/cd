<template>
  <view class="logout-card" @click="handleLogout">
    <text class="logout-icon">🚪</text>
    <text class="logout-text">退出登录</text>
  </view>
</template>

<script setup lang="ts">
/**
 * 退出登录卡片组件
 * 
 * @description 复用现有的退出逻辑，不做任何修改
 * 显示红色渐变背景的退出按钮，点击后显示确认弹窗
 */
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

/**
 * 退出登录处理
 * 逻辑与原有代码完全一致
 */
function handleLogout(): void {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
/* ==================== 退出登录卡片 ==================== */
.logout-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(239, 68, 68, 0.3);
  
  &:active {
    opacity: 0.9;
  }
}

.logout-icon {
  font-size: 40rpx;
  margin-right: 12rpx;
}

.logout-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
