<!--
  Empty 空状态组件
  提供统一的空数据状态显示
-->
<template>
  <view class="empty-container">
    <!-- 图标 -->
    <text class="empty-icon">{{ icon }}</text>
    
    <!-- 描述文字 -->
    <text class="empty-text">{{ text }}</text>
    
    <!-- 操作按钮 -->
    <button 
      v-if="showButton" 
      class="empty-button"
      @click="handleClick"
    >
      {{ buttonText }}
    </button>
    
    <!-- 自定义内容 -->
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
/**
 * Empty 空状态组件
 * 
 * @description 显示空数据状态，支持自定义图标、文字和操作按钮
 * 
 * @example
 * <Empty text="暂无数据" />
 * 
 * @example
 * <Empty 
 *   icon="📭" 
 *   text="暂无通知" 
 *   :show-button="true"
 *   button-text="刷新"
 *   @click="handleRefresh"
 * />
 */

// ==================== Props ====================

interface Props {
  /** 图标（支持 emoji 或图片路径） */
  icon?: string
  /** 描述文字 */
  text?: string
  /** 是否显示操作按钮 */
  showButton?: boolean
  /** 按钮文字 */
  buttonText?: string
}

withDefaults(defineProps<Props>(), {
  icon: '📭',
  text: '暂无数据',
  showButton: false,
  buttonText: '刷新',
})

// ==================== Emits ====================

const emit = defineEmits<{
  /** 点击按钮 */
  (e: 'click'): void
}>()

// ==================== 方法 ====================

/**
 * 处理按钮点击
 */
function handleClick() {
  emit('click')
}
</script>

<style lang="scss" scoped>
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 48rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
  text-align: center;
  margin-bottom: 32rpx;
}

.empty-button {
  min-width: 200rpx;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 48rpx;
  background-color: #4a90e2;
  color: #ffffff;
  font-size: 28rpx;
  border-radius: 36rpx;
  border: none;
}
</style>
