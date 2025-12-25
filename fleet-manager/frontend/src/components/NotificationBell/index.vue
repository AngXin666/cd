<!--
  通知铃铛组件
  显示未读通知数量，点击跳转到通知列表
  
  @module components/NotificationBell
  @requirements 2.1, 2.2, 2.3, 2.4 - 通知铃铛组件
-->
<template>
  <view class="notification-bell" @click="handleClick">
    <!-- 铃铛图标 -->
    <view class="bell-icon">🔔</view>
    
    <!-- 未读数量徽章 -->
    <view v-if="displayCount" class="badge">
      <text class="badge-count">{{ displayCount }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 通知铃铛组件
 * 
 * @description 显示未读通知数量，点击跳转到通知列表
 * 
 * @requirements 2.1 - 在欢迎卡片右下角显示通知铃铛图标
 * @requirements 2.2 - 存在未读通知时显示未读数量徽章
 * @requirements 2.3 - 点击跳转到通知列表页面
 * @requirements 2.4 - 未读通知数量超过 99 时显示 "99+"
 */

import { computed, ref, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUnreadCount } from '@/api'

// ==================== Props ====================

interface Props {
  /** 用户ID，用于获取未读通知数量 */
  userId?: string
}

const props = withDefaults(defineProps<Props>(), {
  userId: '',
})

// ==================== 状态 ====================

/** 未读通知数量 */
const unreadCount = ref(0)

// ==================== 计算属性 ====================

/**
 * 显示的数量文本
 * 超过 99 显示 "99+"，为 0 时不显示
 * @requirements 2.4 - 未读通知数量超过 99 时显示 "99+"
 */
const displayCount = computed(() => {
  if (unreadCount.value <= 0) {
    return ''
  }
  if (unreadCount.value > 99) {
    return '99+'
  }
  return String(unreadCount.value)
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadUnreadCount()
})

onShow(() => {
  // 页面显示时刷新未读数量
  loadUnreadCount()
})

// 监听 userId 变化
watch(() => props.userId, () => {
  loadUnreadCount()
})

// ==================== 方法 ====================

/**
 * 加载未读通知数量
 * @requirements 2.2 - 存在未读通知时显示未读数量徽章
 */
async function loadUnreadCount(): Promise<void> {
  try {
    const data = await getUnreadCount()
    unreadCount.value = data.count || 0
  } catch (error) {
    console.error('加载未读通知数量失败:', error)
    unreadCount.value = 0
  }
}

/**
 * 点击铃铛跳转到通知列表
 * @requirements 2.3 - 点击跳转到通知列表页面
 */
function handleClick(): void {
  uni.navigateTo({
    url: '/pages/notifications/index'
  })
}

// ==================== 暴露方法 ====================

defineExpose({
  /** 刷新未读数量 */
  refresh: loadUnreadCount,
})
</script>

<style lang="scss" scoped>
/**
 * 通知铃铛容器
 * 相对定位用于放置徽章
 */
.notification-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
  
  &:active {
    transform: scale(0.95);
    background-color: rgba(255, 255, 255, 0.3);
  }
}

/**
 * 铃铛图标
 */
.bell-icon {
  font-size: 40rpx;
}

/**
 * 未读数量徽章
 * 绝对定位在右上角
 */
.badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 36rpx;
  height: 36rpx;
  background-color: #EF4444;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  border: 2rpx solid #FFFFFF;
}

/**
 * 徽章数字
 */
.badge-count {
  font-size: 20rpx;
  font-weight: bold;
  color: #FFFFFF;
  line-height: 1;
}
</style>
