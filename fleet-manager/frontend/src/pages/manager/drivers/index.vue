<template>
  <!-- 
    司机列表页面
    显示所管辖仓库的司机列表
    支持搜索筛选和查看详情
  -->
  <view class="drivers-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          type="text"
          placeholder="搜索司机姓名或手机号"
          @input="handleSearch"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in filterTabs"
        :key="tab.value"
        :class="['filter-tab', { active: activeFilter === tab.value }]"
        @click="handleFilterChange(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <text v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredDrivers.length === 0" class="empty-container">
      <text class="empty-icon">👥</text>
      <text class="empty-text">{{ searchKeyword ? '未找到匹配的司机' : '暂无司机' }}</text>
    </view>

    <!-- 司机列表 -->
    <view v-else class="driver-list">
      <view
        v-for="driver in filteredDrivers"
        :key="driver.id"
        class="driver-card"
        @click="viewDriverDetail(driver.id)"
      >
        <!-- 司机头像和基本信息 -->
        <view class="driver-info">
          <view class="driver-avatar">
            <text class="avatar-text">{{ driver.name.charAt(0) }}</text>
          </view>
          <view class="driver-detail">
            <view class="driver-name-row">
              <text class="driver-name">{{ driver.name }}</text>
              <view :class="['status-tag', driver.is_active ? 'active' : 'inactive']">
                <text class="status-text">{{ driver.is_active ? '在职' : '离职' }}</text>
              </view>
            </view>
            <text class="driver-phone">{{ driver.phone || '未设置手机号' }}</text>
            <text class="driver-time">入职时间：{{ formatDate(driver.created_at) }}</text>
          </view>
        </view>
        
        <!-- 右侧箭头 -->
        <view class="driver-arrow">
          <text class="arrow-icon">›</text>
        </view>
      </view>
    </view>

    <!-- 统计信息 -->
    <view v-if="!loading && drivers.length > 0" class="stats-footer">
      <text class="stats-text">
        共 {{ drivers.length }} 名司机，在职 {{ activeCount }} 人
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 司机列表页面
 * 显示所管辖仓库的司机列表
 * 支持搜索筛选和查看详情
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUsers } from '@/api'
import type { User } from '@/api/types'
import { UserRole } from '@/api/types'
import { formatDate } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 司机列表 */
const drivers = ref<User[]>([])

/** 搜索关键词 */
const searchKeyword = ref('')

/** 当前筛选条件 */
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')

// ==================== 计算属性 ====================

/** 筛选标签配置 */
const filterTabs = computed(() => [
  { label: '全部', value: 'all' as const, count: drivers.value.length },
  { label: '在职', value: 'active' as const, count: activeCount.value },
  { label: '离职', value: 'inactive' as const, count: inactiveCount.value },
])

/** 在职司机数量 */
const activeCount = computed(() => 
  drivers.value.filter(d => d.is_active).length
)

/** 离职司机数量 */
const inactiveCount = computed(() => 
  drivers.value.filter(d => !d.is_active).length
)

/** 筛选后的司机列表 */
const filteredDrivers = computed(() => {
  let result = drivers.value
  
  // 按状态筛选
  if (activeFilter.value === 'active') {
    result = result.filter(d => d.is_active)
  } else if (activeFilter.value === 'inactive') {
    result = result.filter(d => !d.is_active)
  }
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(d => 
      d.name.toLowerCase().includes(keyword) ||
      (d.phone && d.phone.includes(keyword))
    )
  }
  
  return result
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadDrivers()
})

onShow(() => {
  // 每次显示页面时刷新数据
  loadDrivers()
})

// ==================== 方法 ====================

/**
 * 加载司机列表
 */
async function loadDrivers(): Promise<void> {
  loading.value = true
  try {
    // 获取所有司机角色的用户
    const data = await getUsers({ role: UserRole.DRIVER })
    drivers.value = data
  } catch (error) {
    console.error('加载司机列表失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 处理搜索输入
 */
function handleSearch(): void {
  // 搜索是实时的，通过计算属性自动过滤
}

/**
 * 清除搜索
 */
function clearSearch(): void {
  searchKeyword.value = ''
}

/**
 * 处理筛选条件变化
 * 
 * @param filter - 筛选条件
 */
function handleFilterChange(filter: 'all' | 'active' | 'inactive'): void {
  activeFilter.value = filter
}

/**
 * 查看司机详情
 * 
 * @param driverId - 司机ID
 */
function viewDriverDetail(driverId: number): void {
  uni.navigateTo({
    url: `/pages/manager/drivers/detail?id=${driverId}`,
  })
}
</script>

<style lang="scss" scoped>
.drivers-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

/* 搜索栏 */
.search-bar {
  background-color: #ffffff;
  padding: 24rpx;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
}

.search-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}

.clear-icon {
  font-size: 28rpx;
  color: #999999;
  padding: 8rpx;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  background-color: #ffffff;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-tab {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  margin-right: 16rpx;
  border-radius: 32rpx;
  background-color: #f5f5f5;
  
  &.active {
    background-color: #e6f7ff;
    
    .tab-text {
      color: #1890ff;
    }
    
    .tab-count {
      background-color: #1890ff;
      color: #ffffff;
    }
  }
}

.tab-text {
  font-size: 26rpx;
  color: #666666;
}

.tab-count {
  font-size: 22rpx;
  color: #999999;
  background-color: #e0e0e0;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-left: 8rpx;
}

/* 加载状态 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 司机列表 */
.driver-list {
  padding: 24rpx;
}

.driver-card {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.driver-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.driver-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.driver-detail {
  flex: 1;
}

.driver-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.driver-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-right: 12rpx;
}

.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  
  &.active {
    background-color: #e6f7e6;
    
    .status-text {
      color: #52c41a;
    }
  }
  
  &.inactive {
    background-color: #fff2e8;
    
    .status-text {
      color: #fa8c16;
    }
  }
}

.status-text {
  font-size: 22rpx;
}

.driver-phone {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 4rpx;
}

.driver-time {
  font-size: 24rpx;
  color: #999999;
}

.driver-arrow {
  padding-left: 16rpx;
}

.arrow-icon {
  font-size: 36rpx;
  color: #cccccc;
}

/* 统计信息 */
.stats-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 24rpx;
  text-align: center;
  border-top: 1rpx solid #f0f0f0;
}

.stats-text {
  font-size: 26rpx;
  color: #999999;
}
</style>
