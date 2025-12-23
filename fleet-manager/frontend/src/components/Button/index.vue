<!--
  Button 按钮组件
  提供统一的按钮样式
-->
<template>
  <button
    class="custom-button"
    :class="[
      `button-${type}`,
      `button-${size}`,
      { 'button-block': block, 'button-disabled': disabled, 'button-loading': loading }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- 加载图标 -->
    <view v-if="loading" class="button-loading-icon">
      <view class="loading-spinner"></view>
    </view>
    
    <!-- 按钮文字 -->
    <text class="button-text">{{ text }}</text>
    
    <!-- 插槽内容 -->
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
/**
 * Button 按钮组件
 * 
 * @description 提供统一的按钮样式，支持多种类型和尺寸
 * 
 * @example
 * <Button text="提交" type="primary" @click="handleSubmit" />
 * 
 * @example
 * <Button text="删除" type="danger" :loading="deleting" />
 */

// ==================== Props ====================

interface Props {
  /** 按钮文字 */
  text?: string
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  /** 按钮尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 是否块级按钮 */
  block?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 是否加载中 */
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  text: '',
  type: 'default',
  size: 'medium',
  block: false,
  disabled: false,
  loading: false,
})

// ==================== Emits ====================

const emit = defineEmits<{
  /** 点击按钮 */
  (e: 'click'): void
}>()

// ==================== 方法 ====================

/**
 * 处理点击
 */
function handleClick() {
  emit('click')
}
</script>

<style lang="scss" scoped>
.custom-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 12rpx;
  font-weight: 500;
  transition: opacity 0.2s;
}

.custom-button::after {
  border: none;
}

/* 类型样式 */
.button-default {
  background-color: #f5f5f5;
  color: #333333;
}

.button-primary {
  background-color: #4a90e2;
  color: #ffffff;
}

.button-success {
  background-color: #52c41a;
  color: #ffffff;
}

.button-warning {
  background-color: #faad14;
  color: #ffffff;
}

.button-danger {
  background-color: #ff4d4f;
  color: #ffffff;
}

/* 尺寸样式 */
.button-small {
  height: 56rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
}

.button-medium {
  height: 80rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
}

.button-large {
  height: 96rpx;
  padding: 0 48rpx;
  font-size: 32rpx;
}

/* 块级按钮 */
.button-block {
  display: flex;
  width: 100%;
}

/* 禁用状态 */
.button-disabled {
  opacity: 0.5;
}

/* 加载状态 */
.button-loading {
  opacity: 0.8;
}

.button-loading-icon {
  margin-right: 12rpx;
}

.loading-spinner {
  width: 32rpx;
  height: 32rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.button-default .loading-spinner {
  border-color: rgba(0, 0, 0, 0.1);
  border-top-color: #333333;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.button-text {
  /* 继承父元素样式 */
}
</style>
