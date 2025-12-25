<!--
  顶部导航栏组件
  显示页面标题和操作按钮
  
  @module components/TopNavBar
  @requirements 9.1, 9.2, 9.3 - 顶部导航栏组件
-->
<template>
  <view class="top-nav-bar" :style="{ background: backgroundColor }">
    <!-- 左侧区域 -->
    <view class="nav-left">
      <!-- 返回按钮 -->
      <view v-if="showBack" class="back-btn" @click="handleBack">
        <text class="back-icon">‹</text>
      </view>
      
      <!-- 标题 -->
      <text v-if="title" class="nav-title" :style="{ color: titleColor }">{{ title }}</text>
    </view>
    
    <!-- 右侧区域 -->
    <view class="nav-right">
      <slot name="right">
        <!-- 默认右侧操作按钮 -->
        <view
          v-for="(action, index) in rightActions"
          :key="index"
          class="action-btn"
          @click="action.onClick"
        >
          <text class="action-icon">{{ action.icon }}</text>
        </view>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 顶部导航栏组件
 * 
 * @description 显示页面标题和操作按钮
 * 
 * @requirements 9.1 - 在安全区域下方显示顶部导航栏
 * @requirements 9.2 - 显示页面标题和操作按钮
 * @requirements 9.3 - 点击导航栏按钮执行对应的操作
 */

import type { NavAction } from './types'

// ==================== Props ====================

interface Props {
  /** 页面标题 */
  title?: string
  /** 是否显示返回按钮 */
  showBack?: boolean
  /** 右侧操作按钮 */
  rightActions?: NavAction[]
  /** 背景颜色 */
  backgroundColor?: string
  /** 标题颜色 */
  titleColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showBack: false,
  rightActions: () => [],
  backgroundColor: 'transparent',
  titleColor: '#1F2937',
})

// ==================== Emits ====================

const emit = defineEmits<{
  /** 返回事件 */
  (e: 'back'): void
}>()

// ==================== 方法 ====================

/**
 * 处理返回
 * @requirements 9.3 - 点击导航栏按钮执行对应的操作
 */
function handleBack(): void {
  emit('back')
  // 默认返回上一页
  uni.navigateBack({
    fail: () => {
      // 如果没有上一页，跳转到首页
      uni.switchTab({ url: '/pages/index/index' })
    }
  })
}
</script>

<style lang="scss" scoped>
/**
 * 导航栏容器
 */
.top-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}

/**
 * 左侧区域
 */
.nav-left {
  display: flex;
  align-items: center;
  flex: 1;
}

/**
 * 返回按钮
 */
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  margin-right: 8rpx;
  
  &:active {
    opacity: 0.7;
  }
}

.back-icon {
  font-size: 48rpx;
  color: #1F2937;
  font-weight: bold;
}

/**
 * 标题
 */
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
}

/**
 * 右侧区域
 */
.nav-right {
  display: flex;
  align-items: center;
}

/**
 * 操作按钮
 */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  margin-left: 8rpx;
  
  &:active {
    opacity: 0.7;
  }
}

.action-icon {
  font-size: 40rpx;
}
</style>
