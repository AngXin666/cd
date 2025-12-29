<!--
  仓库切换器组件
  支持 Swiper 滑动切换多个仓库
  集成 SSE 实时更新功能，当仓库分配变化时自动通知父组件刷新
  
  @module components/WarehouseSwitcher
  @requirements 4.1, 4.3, 4.4 - 仓库切换器组件
  @requirements 5.4 - 仓库选择器集成实时更新
-->
<template>
  <!-- 无仓库提示 - Requirements 4.4 -->
  <view v-if="warehouses.length === 0" class="no-warehouse">
    <view class="no-warehouse-icon">🏠</view>
    <text class="no-warehouse-title">暂无分配仓库</text>
    <text class="no-warehouse-desc">请联系老板为您分配仓库</text>
  </view>
  
  <!-- 单个仓库显示 - Requirements 4.3 -->
  <view v-else-if="warehouses.length === 1" class="single-warehouse">
    <view class="warehouse-icon">🏠</view>
    <text class="warehouse-name">{{ warehouses[0].name }}</text>
  </view>
  
  <!-- 多仓库切换器 - Requirements 4.1 -->
  <view v-else class="warehouse-switcher">
    <view class="switcher-header">
      <view class="header-left">
        <view class="header-icon">🏠</view>
        <text class="header-title">选择仓库</text>
        <text class="header-count">({{ currentIndex + 1 }}/{{ warehouses.length }})</text>
      </view>
      <text class="header-hint">按数据量排序</text>
    </view>
    
    <view class="switcher-content">
      <swiper
        class="warehouse-swiper"
        :current="currentIndex"
        :indicator-dots="true"
        indicator-color="rgba(0, 0, 0, 0.2)"
        indicator-active-color="#1E3A8A"
        @change="handleChange"
      >
        <swiper-item
          v-for="(warehouse, index) in warehouses"
          :key="warehouse.id"
          class="swiper-item"
        >
          <view class="warehouse-card">
            <view class="card-icon">🏠</view>
            <text class="card-name">{{ warehouse.name }}</text>
          </view>
        </swiper-item>
      </swiper>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 仓库切换器组件
 * 
 * @description 支持 Swiper 滑动切换多个仓库，集成 SSE 实时更新功能
 * 
 * @requirements 4.1 - 用户分配了多个仓库时显示 Swiper 滑动切换器
 * @requirements 4.3 - 用户只有一个仓库时显示单个仓库卡片而非切换器
 * @requirements 4.4 - 用户没有分配仓库时显示"暂无分配仓库"提示
 * @requirements 5.4 - 仓库选择器集成实时更新
 */

import { ref, watch, onMounted, onUnmounted } from 'vue'
import { sseService } from '@/utils/sse'
import { useUserStore } from '@/store/user'
import type { Warehouse } from './types'
import type { AssignmentUpdateEvent } from '@/types/sse-events'

// ==================== Props ====================

interface Props {
  /** 仓库列表 */
  warehouses: Warehouse[]
  /** 当前选中的仓库索引 */
  currentIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  warehouses: () => [],
  currentIndex: 0,
})

// ==================== Emits ====================

const emit = defineEmits<{
  /** 仓库切换事件 */
  (e: 'change', index: number): void
  /** 
   * 仓库分配更新事件
   * 当收到 SSE 仓库分配更新事件时触发，通知父组件刷新仓库列表
   * Requirements: 5.4 - 仓库选择器集成实时更新
   */
  (e: 'assignment-update', data: AssignmentUpdateEvent): void
}>()

// ==================== 状态 ====================

/** 内部索引状态 */
const internalIndex = ref(props.currentIndex)

/** 用户 Store */
const userStore = useUserStore()

/** 原始 SSE 回调（用于恢复） */
let originalOnAssignmentUpdate: ((data: AssignmentUpdateEvent) => void) | undefined

// 监听外部索引变化
watch(() => props.currentIndex, (newIndex) => {
  internalIndex.value = newIndex
})

// ==================== SSE 实时更新 ====================

/**
 * 处理仓库分配更新事件
 * 当收到 SSE 仓库分配更新事件时，检查是否与当前用户相关
 * 如果相关，则通知父组件刷新仓库列表
 * 
 * @param data - 仓库分配更新事件数据
 * Requirements: 5.4 - 仓库选择器集成实时更新
 */
function handleAssignmentUpdate(data: AssignmentUpdateEvent): void {
  // 获取当前用户 ID
  const currentUserId = userStore.user?.id
  
  // 检查事件是否与当前用户相关
  if (currentUserId && data.user_id === currentUserId) {
    console.log('[WarehouseSwitcher] 收到仓库分配更新事件，通知父组件刷新')
    
    // 通知父组件刷新仓库列表
    emit('assignment-update', data)
    
    // 显示提示
    uni.showToast({
      title: '仓库分配已更新',
      icon: 'none',
      duration: 2000,
    })
  }
}

/**
 * 注册 SSE 仓库分配更新回调
 * Requirements: 5.4 - 仓库选择器集成实时更新
 */
function registerSSECallback(): void {
  // 保存原始回调
  const currentCallbacks = (sseService as any).callbacks || {}
  originalOnAssignmentUpdate = currentCallbacks.onAssignmentUpdate
  
  // 设置新的回调，同时保留原有回调
  sseService.setCallbacks({
    ...currentCallbacks,
    onAssignmentUpdate: (data: AssignmentUpdateEvent) => {
      // 先调用原有回调
      originalOnAssignmentUpdate?.(data)
      // 再调用组件的处理函数
      handleAssignmentUpdate(data)
    },
  })
  
  console.log('[WarehouseSwitcher] SSE 仓库分配更新回调已注册')
}

/**
 * 取消注册 SSE 仓库分配更新回调
 * 恢复原始回调
 * Requirements: 5.4 - 仓库选择器集成实时更新
 */
function unregisterSSECallback(): void {
  // 恢复原始回调
  const currentCallbacks = (sseService as any).callbacks || {}
  sseService.setCallbacks({
    ...currentCallbacks,
    onAssignmentUpdate: originalOnAssignmentUpdate,
  })
  
  console.log('[WarehouseSwitcher] SSE 仓库分配更新回调已取消注册')
}

// ==================== 生命周期 ====================

onMounted(() => {
  // 注册 SSE 回调
  registerSSECallback()
})

onUnmounted(() => {
  // 取消注册 SSE 回调
  unregisterSSECallback()
})

// ==================== 方法 ====================

/**
 * 处理仓库切换
 * @param e - Swiper change 事件
 */
function handleChange(e: any): void {
  const index = e.detail.current
  internalIndex.value = index
  emit('change', index)
}
</script>

<style lang="scss" scoped>
/**
 * 无仓库提示
 */
.no-warehouse {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 64rpx 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  margin-bottom: 24rpx;
}

.no-warehouse-icon {
  font-size: 96rpx;
  margin-bottom: 24rpx;
  opacity: 0.5;
}

.no-warehouse-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #374151;
  margin-bottom: 12rpx;
}

.no-warehouse-desc {
  font-size: 26rpx;
  color: #9CA3AF;
}

/**
 * 单个仓库显示
 */
.single-warehouse {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  margin-bottom: 24rpx;
}

.warehouse-icon {
  font-size: 48rpx;
  margin-right: 16rpx;
}

.warehouse-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #1E3A8A;
}

/**
 * 多仓库切换器
 */
.warehouse-switcher {
  margin-bottom: 24rpx;
}

.switcher-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

.header-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #374151;
}

.header-count {
  font-size: 24rpx;
  color: #9CA3AF;
  margin-left: 8rpx;
}

.header-hint {
  font-size: 24rpx;
  color: #9CA3AF;
}

.switcher-content {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.warehouse-swiper {
  height: 128rpx;
}

.swiper-item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.warehouse-card {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  padding: 0 32rpx;
}

.card-icon {
  font-size: 48rpx;
  margin-right: 16rpx;
}

.card-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #1E3A8A;
}
</style>
