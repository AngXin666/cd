<template>
  <!-- 
    仓库管理页面
    显示所有仓库列表，支持增删改查
    仅老板角色可访问
  -->
  <view class="warehouses-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          type="text"
          placeholder="搜索仓库名称"
          @input="handleSearch"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
      </view>
      <!-- 添加仓库按钮 -->
      <view class="add-btn" @click="goToCreatePage">
        <text class="add-icon">+</text>
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
    <view v-else-if="filteredWarehouses.length === 0" class="empty-container">
      <text class="empty-icon">🏭</text>
      <text class="empty-text">{{ searchKeyword ? '未找到匹配的仓库' : '暂无仓库' }}</text>
      <view v-if="!searchKeyword" class="empty-action" @click="goToCreatePage">
        <text class="action-text">+ 添加仓库</text>
      </view>
    </view>

    <!-- 仓库列表 -->
    <view v-else class="warehouse-list">
      <view
        v-for="warehouse in filteredWarehouses"
        :key="warehouse.id"
        class="warehouse-card"
        @click="viewWarehouseDetail(warehouse.id)"
      >
        <!-- 仓库图标和基本信息 -->
        <view class="warehouse-info">
          <view class="warehouse-icon">
            <text class="icon-text">🏭</text>
          </view>
          <view class="warehouse-detail">
            <view class="warehouse-name-row">
              <text class="warehouse-name">{{ warehouse.name }}</text>
              <!-- 仓库类型标签 Requirements: 2.1 -->
              <view class="type-tag">
                <text class="type-text">{{ getWarehouseTypeDisplayName(warehouse.warehouse_type) }}</text>
              </view>
              <view v-if="!warehouse.is_active" class="status-tag inactive">
                <text class="status-text">已停用</text>
              </view>
            </view>
            <view class="warehouse-meta">
              <text class="warehouse-address">{{ warehouse.address || '未设置地址' }}</text>
              <!-- 单位显示（支持预设和自定义类型） Requirements: 2.2, 3.5 -->
              <text class="warehouse-unit">单位：{{ getWarehouseUnit(warehouse) || '未设置' }}</text>
            </view>
            <text class="warehouse-time">创建于 {{ formatDate(warehouse.created_at) }}</text>
          </view>
        </view>
        
        <!-- 右侧箭头 -->
        <view class="warehouse-arrow">
          <text class="arrow-icon">›</text>
        </view>
      </view>
    </view>

    <!-- 统计信息 -->
    <view v-if="!loading && warehouses.length > 0" class="stats-footer">
      <text class="stats-text">
        共 {{ warehouses.length }} 个仓库，{{ activeCount }} 个启用中
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 仓库管理页面
 * 显示所有仓库列表，支持增删改查
 * 仅老板角色可访问
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getWarehouses } from '@/api'
import type { Warehouse } from '@/api/types'
import { 
  WarehouseType, 
  WAREHOUSE_TYPE_DISPLAY_NAMES, 
  getWarehouseTypeDisplayName,
  getWarehousePresetUnit,
  getWarehouseUnit 
} from '@/api/types'
import { formatDate } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 搜索关键词 */
const searchKeyword = ref('')

/** 当前筛选条件 */
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')

// ==================== 计算属性 ====================

/** 启用仓库数量 */
const activeCount = computed(() => 
  warehouses.value.filter(w => w.is_active).length
)

/** 停用仓库数量 */
const inactiveCount = computed(() => 
  warehouses.value.filter(w => !w.is_active).length
)

/** 筛选标签配置 */
const filterTabs = computed(() => [
  { label: '全部', value: 'all' as const, count: warehouses.value.length },
  { label: '启用中', value: 'active' as const, count: activeCount.value },
  { label: '已停用', value: 'inactive' as const, count: inactiveCount.value },
])

/** 筛选后的仓库列表 */
const filteredWarehouses = computed(() => {
  let result = warehouses.value
  
  // 按状态筛选
  if (activeFilter.value === 'active') {
    result = result.filter(w => w.is_active)
  } else if (activeFilter.value === 'inactive') {
    result = result.filter(w => !w.is_active)
  }
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(w => 
      w.name.toLowerCase().includes(keyword) ||
      (w.address && w.address.toLowerCase().includes(keyword))
    )
  }
  
  return result
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadWarehouses()
})

onShow(() => {
  // 每次显示页面时刷新数据
  loadWarehouses()
})

// ==================== 方法 ====================

/**
 * 加载仓库列表
 */
async function loadWarehouses(): Promise<void> {
  loading.value = true
  try {
    const data = await getWarehouses()
    warehouses.value = data
  } catch (error) {
    console.error('加载仓库列表失败:', error)
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
 * 跳转到创建仓库页面
 * 跳转到 detail 页面，不传 id 参数即为创建模式
 * Requirements: 2.3
 */
function goToCreatePage(): void {
  uni.navigateTo({
    url: '/pages/boss/warehouses/detail',
  })
}

/**
 * 查看仓库详情
 * 
 * @param warehouseId - 仓库ID
 */
function viewWarehouseDetail(warehouseId: number): void {
  uni.navigateTo({
    url: `/pages/boss/warehouses/detail?id=${warehouseId}`,
  })
}
</script>

<style lang="scss" scoped>
.warehouses-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 36rpx;
}

.search-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
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

.add-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 50%;
  margin-left: 16rpx;
}

.add-icon {
  font-size: 40rpx;
  color: #ffffff;
  font-weight: bold;
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
  padding: 12rpx 20rpx;
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
  margin-bottom: 32rpx;
}

.empty-action {
  padding: 16rpx 48rpx;
  background-color: #1890ff;
  border-radius: 8rpx;
}

.action-text {
  font-size: 28rpx;
  color: #ffffff;
}

/* 仓库列表 */
.warehouse-list {
  padding: 24rpx;
}

.warehouse-card {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.warehouse-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.warehouse-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.icon-text {
  font-size: 40rpx;
}

.warehouse-detail {
  flex: 1;
}

.warehouse-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.warehouse-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  margin-right: 12rpx;
}

/* 仓库类型标签样式 Requirements: 2.1 */
.type-tag {
  padding: 4rpx 12rpx;
  background-color: #e6f7ff;
  border-radius: 8rpx;
  margin-right: 8rpx;
  
  .type-text {
    font-size: 22rpx;
    color: #1890ff;
  }
}

.status-tag.inactive {
  padding: 4rpx 12rpx;
  background-color: #fff1f0;
  border-radius: 8rpx;
  
  .status-text {
    font-size: 22rpx;
    color: #ff4d4f;
  }
}

/* 仓库元信息样式 */
.warehouse-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 4rpx;
}

.warehouse-address {
  font-size: 26rpx;
  color: #666666;
}

/* 预设单位显示样式 Requirements: 2.2 */
.warehouse-unit {
  font-size: 24rpx;
  color: #1890ff;
  background-color: #f0f9ff;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}

.warehouse-time {
  font-size: 24rpx;
  color: #999999;
}

.warehouse-arrow {
  padding-left: 16rpx;
}

.arrow-icon {
  font-size: 36rpx;
  color: #cccccc;
}

/* 统计信息 */
.stats-footer {
  padding: 24rpx;
  text-align: center;
}

.stats-text {
  font-size: 26rpx;
  color: #999999;
}
</style>
