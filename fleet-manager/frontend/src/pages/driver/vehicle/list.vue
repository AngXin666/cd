<template>
  <!-- 
    车辆列表页面
    显示我的车辆，支持添加、查看详情
  -->
  <view class="list-page">
    <!-- 状态筛选 -->
    <view class="filter-section">
      <view 
        v-for="item in statusOptions" 
        :key="item.value"
        :class="['filter-item', { active: currentStatus === item.value }]"
        @click="currentStatus = item.value"
      >
        <text class="filter-text">{{ item.label }}</text>
      </view>
    </view>

    <!-- 车辆列表 -->
    <view class="list-section">
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="filteredVehicles.length === 0" class="empty-container">
        <text class="empty-icon">🚗</text>
        <text class="empty-text">暂无车辆</text>
        <view class="empty-btn" @click="goToAdd">
          <text class="empty-btn-text">添加车辆</text>
        </view>
      </view>
      
      <view v-else class="vehicle-list">
        <view 
          v-for="vehicle in filteredVehicles" 
          :key="vehicle.id" 
          class="vehicle-item"
          @click="goToDetail(vehicle.id)"
        >
          <!-- 车辆图标 -->
          <view class="vehicle-icon">
            <text class="icon-text">🚗</text>
          </view>
          
          <!-- 车辆信息 -->
          <view class="vehicle-info">
            <view class="info-header">
              <text class="license-plate">{{ vehicle.license_plate }}</text>
              <view :class="['status-tag', vehicle.status]">
                <text class="status-text">{{ getVehicleStatusText(vehicle.status) }}</text>
              </view>
            </view>
            <view class="info-detail">
              <text class="detail-text">{{ vehicle.brand || '-' }} {{ vehicle.model || '' }}</text>
            </view>
            <view v-if="vehicle.color" class="info-color">
              <text class="color-label">颜色：</text>
              <text class="color-value">{{ vehicle.color }}</text>
            </view>
          </view>
          
          <!-- 箭头 -->
          <view class="vehicle-arrow">
            <text class="arrow-text">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加按钮 -->
    <view class="fab-btn" @click="goToAdd">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆列表页面
 * 显示我的车辆，支持添加、查看详情
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getVehicles } from '@/api'
import type { Vehicle } from '@/api/types'
import { getVehicleStatusText, navigateTo } from '@/utils'

// ==================== 常量 ====================

/** 状态选项 */
const statusOptions = [
  { label: '全部', value: '' },
  { label: '使用中', value: 'active' },
  { label: '审核中', value: 'reviewing' },
  { label: '已归还', value: 'returned' },
]

// ==================== 状态 ====================

/** 车辆列表 */
const vehicles = ref<Vehicle[]>([])

/** 加载状态 */
const loading = ref(false)

/** 当前筛选状态 */
const currentStatus = ref('')

// ==================== 计算属性 ====================

/** 筛选后的车辆 */
const filteredVehicles = computed(() => {
  if (!currentStatus.value) return vehicles.value
  return vehicles.value.filter(v => v.status === currentStatus.value)
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadVehicles()
})

onShow(() => {
  // 刷新数据
  loadVehicles()
})

// ==================== 方法 ====================

/**
 * 加载车辆列表
 */
async function loadVehicles(): Promise<void> {
  loading.value = true
  
  try {
    const data = await getVehicles({
      limit: 100,
    })
    vehicles.value = data
  } catch (error) {
    console.error('加载车辆列表失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到添加页面
 */
function goToAdd(): void {
  navigateTo('/pages/driver/vehicle/add')
}

/**
 * 跳转到详情页面
 * 
 * @param id - 车辆ID
 */
function goToDetail(id: number): void {
  navigateTo('/pages/driver/vehicle/detail', { id })
}
</script>

<style lang="scss" scoped>
.list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

/* 筛选区域 */
.filter-section {
  display: flex;
  background-color: #ffffff;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.filter-item {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  border-radius: 8rpx;
  transition: all 0.2s;
  
  &.active {
    background-color: #4a90e2;
    
    .filter-text {
      color: #ffffff;
    }
  }
}

.filter-text {
  font-size: 26rpx;
  color: #666666;
}

/* 列表区域 */
.list-section {
  padding: 0 24rpx;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 24rpx;
}

.empty-btn {
  background-color: #4a90e2;
  padding: 16rpx 48rpx;
  border-radius: 8rpx;
}

.empty-btn-text {
  font-size: 28rpx;
  color: #ffffff;
}

/* 车辆列表 */
.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.vehicle-item {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

/* 车辆图标 */
.vehicle-icon {
  width: 100rpx;
  height: 100rpx;
  background-color: #f0f0f0;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.icon-text {
  font-size: 48rpx;
}

/* 车辆信息 */
.vehicle-info {
  flex: 1;
}

.info-header {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.license-plate {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-right: 16rpx;
}

.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  
  &.active {
    background-color: #f6ffed;
    
    .status-text {
      color: #52c41a;
    }
  }
  
  &.reviewing {
    background-color: #fff7e6;
    
    .status-text {
      color: #faad14;
    }
  }
  
  &.returned {
    background-color: #f0f0f0;
    
    .status-text {
      color: #999999;
    }
  }
}

.status-text {
  font-size: 22rpx;
}

.info-detail {
  margin-bottom: 4rpx;
}

.detail-text {
  font-size: 26rpx;
  color: #666666;
}

.info-color {
  display: flex;
  align-items: center;
}

.color-label {
  font-size: 24rpx;
  color: #999999;
}

.color-value {
  font-size: 24rpx;
  color: #666666;
}

/* 箭头 */
.vehicle-arrow {
  margin-left: 16rpx;
}

.arrow-text {
  font-size: 32rpx;
  color: #cccccc;
}

/* 浮动按钮 */
.fab-btn {
  position: fixed;
  right: 32rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(74, 144, 226, 0.4);
}

.fab-icon {
  font-size: 56rpx;
  color: #ffffff;
  font-weight: bold;
}
</style>
