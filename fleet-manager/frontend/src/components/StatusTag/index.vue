<!--
  StatusTag 状态标签组件
  提供统一的状态标签显示
-->
<template>
  <view class="status-tag" :style="{ backgroundColor: bgColor, color: textColor }">
    <text class="status-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
/**
 * StatusTag 状态标签组件
 * 
 * @description 显示状态标签，支持自定义颜色和文字
 * 
 * @example
 * <StatusTag text="待审批" type="warning" />
 * 
 * @example
 * <StatusTag text="已通过" type="success" />
 */

import { computed } from 'vue'

// ==================== Props ====================

interface Props {
  /** 标签文字 */
  text: string
  /** 标签类型 */
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 自定义背景色 */
  bgColor?: string
  /** 自定义文字颜色 */
  textColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  bgColor: '',
  textColor: '',
})

// ==================== 计算属性 ====================

/** 类型对应的颜色配置 */
const colorMap: Record<string, { bg: string; text: string }> = {
  default: { bg: '#f0f0f0', text: '#666666' },
  primary: { bg: '#e6f7ff', text: '#1890ff' },
  success: { bg: '#f6ffed', text: '#52c41a' },
  warning: { bg: '#fffbe6', text: '#faad14' },
  danger: { bg: '#fff2f0', text: '#ff4d4f' },
  info: { bg: '#f0f5ff', text: '#2f54eb' },
}

/** 背景颜色 */
const bgColor = computed(() => {
  if (props.bgColor) return props.bgColor
  return colorMap[props.type]?.bg || colorMap.default.bg
})

/** 文字颜色 */
const textColor = computed(() => {
  if (props.textColor) return props.textColor
  return colorMap[props.type]?.text || colorMap.default.text
})
</script>

<style lang="scss" scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.status-text {
  font-size: 24rpx;
  line-height: 1.5;
}
</style>
