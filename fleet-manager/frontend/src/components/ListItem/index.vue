<!--
  ListItem 列表项组件
  提供统一的列表项样式
-->
<template>
  <view 
    class="list-item" 
    :class="{ 'list-item-border': border, 'list-item-clickable': clickable }"
    @click="handleClick"
  >
    <!-- 左侧图标 -->
    <view v-if="icon || $slots.icon" class="list-item-icon">
      <text v-if="icon" class="icon-text">{{ icon }}</text>
      <slot name="icon"></slot>
    </view>
    
    <!-- 内容区域 -->
    <view class="list-item-content">
      <view class="list-item-main">
        <text class="list-item-title">{{ title }}</text>
        <text v-if="subtitle" class="list-item-subtitle">{{ subtitle }}</text>
      </view>
      <slot></slot>
    </view>
    
    <!-- 右侧区域 -->
    <view class="list-item-right">
      <text v-if="value" class="list-item-value">{{ value }}</text>
      <slot name="right"></slot>
      <text v-if="showArrow" class="list-item-arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * ListItem 列表项组件
 * 
 * @description 提供统一的列表项样式，支持图标、标题、副标题、右侧内容
 * 
 * @example
 * <ListItem title="设置" show-arrow @click="handleClick" />
 * 
 * @example
 * <ListItem 
 *   icon="👤" 
 *   title="用户名" 
 *   value="张三"
 * />
 */

// ==================== Props ====================

interface Props {
  /** 左侧图标（支持 emoji） */
  icon?: string
  /** 标题 */
  title: string
  /** 副标题 */
  subtitle?: string
  /** 右侧值 */
  value?: string
  /** 是否显示箭头 */
  showArrow?: boolean
  /** 是否显示底部边框 */
  border?: boolean
  /** 是否可点击 */
  clickable?: boolean
}

withDefaults(defineProps<Props>(), {
  icon: '',
  subtitle: '',
  value: '',
  showArrow: false,
  border: true,
  clickable: true,
})

// ==================== Emits ====================

const emit = defineEmits<{
  /** 点击列表项 */
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
.list-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
}

.list-item-border {
  border-bottom: 1rpx solid #f0f0f0;
}

.list-item-clickable:active {
  background-color: #f5f5f5;
}

.list-item-icon {
  margin-right: 24rpx;
}

.icon-text {
  font-size: 40rpx;
}

.list-item-content {
  flex: 1;
  min-width: 0;
}

.list-item-main {
  display: flex;
  flex-direction: column;
}

.list-item-title {
  font-size: 30rpx;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-item-subtitle {
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-item-right {
  display: flex;
  align-items: center;
  margin-left: 16rpx;
}

.list-item-value {
  font-size: 28rpx;
  color: #999999;
  margin-right: 8rpx;
}

.list-item-arrow {
  font-size: 32rpx;
  color: #cccccc;
}
</style>
