<!--
  Loading 加载组件
  提供统一的加载状态显示
-->
<template>
  <view v-if="visible" class="loading-container" :class="{ fullscreen }">
    <view class="loading-content">
      <!-- 加载动画 -->
      <view class="loading-spinner">
        <view class="spinner"></view>
      </view>
      
      <!-- 加载文字 -->
      <text v-if="text" class="loading-text">{{ text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Loading 加载组件
 * 
 * @description 显示加载状态，支持全屏和内联模式
 * 
 * @example
 * <Loading :visible="loading" text="加载中..." />
 * 
 * @example
 * <Loading :visible="loading" fullscreen />
 */

// ==================== Props ====================

interface Props {
  /** 是否显示 */
  visible?: boolean
  /** 加载文字 */
  text?: string
  /** 是否全屏显示 */
  fullscreen?: boolean
}

withDefaults(defineProps<Props>(), {
  visible: false,
  text: '加载中...',
  fullscreen: false,
})
</script>

<style lang="scss" scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.loading-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 1000;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  margin-bottom: 16rpx;
}

.spinner {
  width: 100%;
  height: 100%;
  border: 4rpx solid #e0e0e0;
  border-top-color: #4a90e2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 28rpx;
  color: #666666;
}
</style>
