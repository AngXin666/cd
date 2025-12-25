<!--
  实时通知栏组件
  滚动显示最新通知，点击跳转到详情页
  
  @module components/RealNotificationBar
  @requirements 3.1, 3.2, 3.3, 3.4 - 实时通知栏组件
-->
<template>
  <!-- 无通知时隐藏 - Requirements 3.4 -->
  <view v-if="notifications.length > 0" class="notification-bar" @click="handleClick">
    <view class="bar-icon">📢</view>
    
    <!-- 滚动通知内容 - Requirements 3.2 -->
    <swiper
      class="notification-swiper"
      :autoplay="autoplay"
      :interval="interval"
      :circular="true"
      :vertical="true"
      :display-multiple-items="1"
    >
      <swiper-item
        v-for="(notification, index) in notifications"
        :key="notification.id || index"
        class="notification-item"
      >
        <view class="notification-content">
          <text class="notification-title">{{ notification.title }}</text>
          <text class="notification-text">{{ notification.content }}</text>
        </view>
      </swiper-item>
    </swiper>
    
    <view class="bar-arrow">›</view>
  </view>
</template>

<script setup lang="ts">
/**
 * 实时通知栏组件
 * 
 * @description 滚动显示最新通知，点击跳转到详情页
 * 
 * @requirements 3.1 - 在欢迎卡片下方显示实时通知栏
 * @requirements 3.2 - 存在多条通知时自动滚动显示通知内容
 * @requirements 3.3 - 点击通知栏跳转到对应的详情页面
 * @requirements 3.4 - 无通知内容时隐藏通知栏组件
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { Notification } from './types'

// ==================== Props ====================

interface Props {
  /** 是否自动播放 */
  autoplay?: boolean
  /** 自动切换间隔（毫秒） */
  interval?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: true,
  interval: 3000,
})

// ==================== 状态 ====================

/** 通知列表 */
const notifications = ref<Notification[]>([])

// ==================== 生命周期 ====================

onMounted(() => {
  loadNotifications()
})

onShow(() => {
  // 页面显示时刷新通知
  loadNotifications()
})

// ==================== 方法 ====================

/**
 * 加载通知列表
 * 获取最近的系统通知
 */
async function loadNotifications(): Promise<void> {
  try {
    // 模拟获取通知数据
    // 实际项目中应该调用 API 获取
    notifications.value = [
      {
        id: '1',
        type: 'system',
        title: '系统通知',
        content: '欢迎使用车队管家系统',
        createdAt: new Date().toISOString(),
      },
    ]
  } catch (error) {
    console.error('加载通知失败:', error)
    notifications.value = []
  }
}

/**
 * 点击通知栏跳转
 * @requirements 3.3 - 点击通知栏跳转到对应的详情页面
 */
function handleClick(): void {
  // 跳转到通知列表页面
  uni.navigateTo({
    url: '/pages/notifications/index'
  })
}

/**
 * 添加通知
 * 用于外部调用添加新通知
 */
function addNotification(notification: Notification): void {
  notifications.value.unshift(notification)
  // 最多保留 10 条通知
  if (notifications.value.length > 10) {
    notifications.value = notifications.value.slice(0, 10)
  }
}

/**
 * 清空通知
 */
function clearNotifications(): void {
  notifications.value = []
}

// ==================== 暴露方法 ====================

defineExpose({
  /** 刷新通知 */
  refresh: loadNotifications,
  /** 添加通知 */
  addNotification,
  /** 清空通知 */
  clearNotifications,
})
</script>

<style lang="scss" scoped>
/**
 * 通知栏容器
 */
.notification-bar {
  display: flex;
  align-items: center;
  background-color: #FEF3C7;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
  
  &:active {
    opacity: 0.9;
  }
}

/**
 * 通知图标
 */
.bar-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

/**
 * 通知滚动区域
 */
.notification-swiper {
  flex: 1;
  height: 40rpx;
}

/**
 * 通知项
 */
.notification-item {
  display: flex;
  align-items: center;
  height: 40rpx;
}

/**
 * 通知内容
 */
.notification-content {
  display: flex;
  align-items: center;
  width: 100%;
  overflow: hidden;
}

/**
 * 通知标题
 */
.notification-title {
  font-size: 24rpx;
  font-weight: bold;
  color: #92400E;
  margin-right: 12rpx;
  flex-shrink: 0;
}

/**
 * 通知文本
 */
.notification-text {
  font-size: 24rpx;
  color: #B45309;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/**
 * 箭头
 */
.bar-arrow {
  font-size: 32rpx;
  color: #B45309;
  margin-left: 12rpx;
  flex-shrink: 0;
}
</style>
