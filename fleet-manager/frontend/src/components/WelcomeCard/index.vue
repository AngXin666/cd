<template>
  <view class="welcome-card">
    <view class="welcome-content">
      <view class="welcome-text">
        <text class="welcome-title">{{ title }}</text>
        <text class="welcome-subtitle">{{ subtitle }}</text>
      </view>
      <!-- 右侧内容插槽（通知铃铛、请假状态等） -->
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * WelcomeCard 欢迎卡片组件
 * 用于三端首页顶部展示，支持自定义右侧内容
 * 
 * @example
 * <WelcomeCard title="老板控制台" subtitle="欢迎回来，张三">
 *   <NotificationBell :user-id="userId" />
 * </WelcomeCard>
 */
import type { WelcomeCardProps } from './types'

defineProps<WelcomeCardProps>()
</script>

<style lang="scss" scoped>
/**
 * 欢迎卡片样式
 * 蓝色渐变背景，与三端首页原有样式保持一致
 */
.welcome-card {
  background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(30, 58, 138, 0.3);
}

.welcome-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.welcome-text {
  display: flex;
  flex-direction: column;
}

.welcome-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.welcome-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}
</style>
