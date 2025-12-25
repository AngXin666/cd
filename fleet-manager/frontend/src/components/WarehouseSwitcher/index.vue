<!--
  仓库切换器组件
  支持 Swiper 滑动切换多个仓库
  
  @module components/WarehouseSwitcher
  @requirements 4.1, 4.3, 4.4 - 仓库切换器组件
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
 * @description 支持 Swiper 滑动切换多个仓库
 * 
 * @requirements 4.1 - 用户分配了多个仓库时显示 Swiper 滑动切换器
 * @requirements 4.3 - 用户只有一个仓库时显示单个仓库卡片而非切换器
 * @requirements 4.4 - 用户没有分配仓库时显示"暂无分配仓库"提示
 */

import { ref, watch } from 'vue'
import type { Warehouse } from './types'

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
}>()

// ==================== 状态 ====================

/** 内部索引状态 */
const internalIndex = ref(props.currentIndex)

// 监听外部索引变化
watch(() => props.currentIndex, (newIndex) => {
  internalIndex.value = newIndex
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
