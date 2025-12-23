<!--
  NavBar 导航栏组件
  提供统一的顶部导航栏，支持自定义标题、返回按钮、右侧操作
-->
<template>
  <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="nav-bar-content">
      <!-- 左侧区域 -->
      <view class="nav-bar-left" @click="handleBack">
        <text v-if="showBack" class="back-icon">‹</text>
        <slot name="left"></slot>
      </view>

      <!-- 标题区域 -->
      <view class="nav-bar-title">
        <text class="title-text">{{ title }}</text>
        <slot name="title"></slot>
      </view>

      <!-- 右侧区域 -->
      <view class="nav-bar-right">
        <slot name="right"></slot>
      </view>
    </view>
  </view>
  
  <!-- 占位元素，防止内容被导航栏遮挡 -->
  <view 
    v-if="placeholder" 
    class="nav-bar-placeholder" 
    :style="{ height: navBarHeight + 'px' }"
  ></view>
</template>

<script setup lang="ts">
/**
 * NavBar 导航栏组件
 * 
 * @description 提供统一的顶部导航栏样式和交互
 * 
 * @example
 * <NavBar title="页面标题" />
 * 
 * @example
 * <NavBar title="页面标题" :show-back="false">
 *   <template #right>
 *     <text @click="handleSave">保存</text>
 *   </template>
 * </NavBar>
 */

import { computed } from 'vue'
import { useAppStore } from '@/store/app'

// ==================== Props ====================

interface Props {
  /** 导航栏标题 */
  title?: string
  /** 是否显示返回按钮 */
  showBack?: boolean
  /** 是否显示占位元素 */
  placeholder?: boolean
  /** 背景颜色 */
  bgColor?: string
  /** 文字颜色 */
  textColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showBack: true,
  placeholder: true,
  bgColor: '#ffffff',
  textColor: '#333333',
})

// ==================== Emits ====================

const emit = defineEmits<{
  /** 点击返回按钮 */
  (e: 'back'): void
}>()

// ==================== Store ====================

const appStore = useAppStore()

// ==================== 计算属性 ====================

/** 状态栏高度 */
const statusBarHeight = computed(() => appStore.statusBarHeight)

/** 导航栏总高度（状态栏 + 内容区） */
const navBarHeight = computed(() => statusBarHeight.value + 44)

// ==================== 方法 ====================

/**
 * 处理返回按钮点击
 */
function handleBack() {
  if (!props.showBack) return
  
  emit('back')
  
  // 默认返回上一页
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    // 如果是第一页，跳转到首页
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<style lang="scss" scoped>
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background-color: v-bind(bgColor);
}

.nav-bar-content {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 12px;
}

.nav-bar-left {
  width: 60px;
  display: flex;
  align-items: center;
}

.back-icon {
  font-size: 28px;
  color: v-bind(textColor);
  font-weight: bold;
}

.nav-bar-title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-text {
  font-size: 17px;
  font-weight: 500;
  color: v-bind(textColor);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-bar-right {
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.nav-bar-placeholder {
  width: 100%;
}
</style>
