<template>
  <view class="quick-actions-card">
    <view class="quick-actions-grid" :class="[`columns-${columns}`, { compact }]">
      <view
        v-for="action in actions"
        :key="action.key"
        :class="['action-item', action.color, { compact }]"
        @click="handleClick(action.key)"
      >
        <view class="action-icon-wrapper">
          <text :class="['action-icon', { compact }]">{{ action.icon }}</text>
          <view v-if="action.badge && action.badge > 0" class="badge">
            <text class="badge-count">{{ action.badge > 99 ? '99+' : action.badge }}</text>
          </view>
        </view>
        <text :class="['action-text', { compact }]">{{ action.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * QuickActions 快捷功能入口组件
 * 用于三端首页功能按钮网格展示，支持自定义列数和徽章显示
 * 
 * @example
 * <QuickActions
 *   :actions="[
 *     { key: 'attendance', icon: '📋', text: '考勤管理', color: 'blue' },
 *     { key: 'approval', icon: '✅', text: '审批', color: 'green', badge: 3 }
 *   ]"
 *   :columns="2"
 *   @click="handleActionClick"
 * />
 */
import type { QuickAction } from './types'

/**
 * 组件属性定义
 * 直接在组件内定义以避免 Vue 编译器类型解析问题
 */
interface Props {
  /** 功能列表 */
  actions: QuickAction[]
  /** 列数（默认 2） */
  columns?: 2 | 3 | 4
  /** 紧凑模式（用于司机端 4 列布局，图标和间距更小） */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  columns: 2,
  compact: false
})

const emit = defineEmits<{
  /** 点击功能按钮时触发，传递 action.key */
  (e: 'click', key: string): void
}>()

/**
 * 处理功能按钮点击
 * @param key - 功能项唯一标识
 */
function handleClick(key: string): void {
  emit('click', key)
}
</script>

<style lang="scss" scoped>
/**
 * 快捷功能卡片样式
 * 白色背景卡片，包含功能按钮网格
 */
.quick-actions-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

/**
 * 功能按钮网格布局
 * 支持 2/3/4 列配置
 */
.quick-actions-grid {
  display: grid;
  gap: 20rpx;
  
  &.columns-2 { grid-template-columns: repeat(2, 1fr); }
  &.columns-3 { grid-template-columns: repeat(3, 1fr); }
  &.columns-4 { grid-template-columns: repeat(4, 1fr); }
}

/**
 * 功能按钮项样式
 * 支持多种颜色主题的渐变背景
 */
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 16rpx;
  border-radius: 16rpx;
  transition: transform 0.2s;
  
  // 紧凑模式（司机端 4 列布局）
  &.compact {
    padding: 20rpx 12rpx;
  }
  
  &:active { transform: scale(0.95); }
  
  // 颜色主题渐变背景
  &.blue { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); }
  &.green { background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); }
  &.orange { background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); }
  &.purple { background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); }
  &.teal { background: linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%); }
  &.red { background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); }
  &.cyan { background: linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%); }
}

/**
 * 图标容器样式
 * 用于定位徽章
 */
.action-icon-wrapper {
  position: relative;
  margin-bottom: 12rpx;
  
  .compact & {
    margin-bottom: 8rpx;
  }
}

/**
 * 图标样式
 */
.action-icon {
  font-size: 56rpx;
  
  // 紧凑模式图标更小
  &.compact {
    font-size: 48rpx;
  }
}

/**
 * 徽章样式
 * 红色圆形背景，显示数量
 */
.badge {
  position: absolute;
  top: -8rpx;
  right: -16rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: #EF4444;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

// 紧凑模式徽章位置调整
.compact .badge {
  right: -12rpx;
}

/**
 * 徽章数量文字样式
 */
.badge-count {
  font-size: 20rpx;
  font-weight: bold;
  color: #ffffff;
}

/**
 * 功能文字样式
 */
.action-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #374151;
  text-align: center;
  
  // 紧凑模式文字更小
  &.compact {
    font-size: 24rpx;
  }
}
</style>
