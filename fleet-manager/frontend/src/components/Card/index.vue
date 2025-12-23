<!--
  Card 卡片组件
  提供统一的卡片容器样式
-->
<template>
  <view class="card" :class="{ 'card-shadow': shadow }">
    <!-- 卡片标题 -->
    <view v-if="title || $slots.header" class="card-header">
      <text v-if="title" class="card-title">{{ title }}</text>
      <slot name="header"></slot>
      <view class="card-extra">
        <slot name="extra"></slot>
      </view>
    </view>
    
    <!-- 卡片内容 -->
    <view class="card-body" :style="{ padding: padding }">
      <slot></slot>
    </view>
    
    <!-- 卡片底部 -->
    <view v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Card 卡片组件
 * 
 * @description 提供统一的卡片容器，支持标题、内容、底部区域
 * 
 * @example
 * <Card title="卡片标题">
 *   <text>卡片内容</text>
 * </Card>
 * 
 * @example
 * <Card :shadow="true" padding="24rpx">
 *   <template #header>
 *     <text>自定义标题</text>
 *   </template>
 *   <text>卡片内容</text>
 *   <template #footer>
 *     <button>操作按钮</button>
 *   </template>
 * </Card>
 */

// ==================== Props ====================

interface Props {
  /** 卡片标题 */
  title?: string
  /** 是否显示阴影 */
  shadow?: boolean
  /** 内容区域内边距 */
  padding?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
  shadow: true,
  padding: '24rpx',
})
</script>

<style lang="scss" scoped>
.card {
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.card-shadow {
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
}

.card-extra {
  display: flex;
  align-items: center;
}

.card-body {
  /* padding 通过 props 动态设置 */
}

.card-footer {
  padding: 24rpx;
  border-top: 1rpx solid #f0f0f0;
}
</style>
