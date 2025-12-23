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
      <view class="add-btn" @click="showCreateModal">
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
      <view v-if="!searchKeyword" class="empty-action" @click="showCreateModal">
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
              <view v-if="!warehouse.is_active" class="status-tag inactive">
                <text class="status-text">已停用</text>
              </view>
            </view>
            <text class="warehouse-address">{{ warehouse.address || '未设置地址' }}</text>
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

    <!-- 创建仓库弹窗 -->
    <view v-if="showModal" class="modal-overlay" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">添加仓库</text>
          <text class="modal-close" @click="closeModal">✕</text>
        </view>
        
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label required">仓库名称</text>
            <input
              v-model="createForm.name"
              class="form-input"
              type="text"
              placeholder="请输入仓库名称"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">仓库地址</text>
            <input
              v-model="createForm.address"
              class="form-input"
              type="text"
              placeholder="请输入仓库地址（选填）"
            />
          </view>
        </view>
        
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @click="handleCreate">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 仓库管理页面
 * 显示所有仓库列表，支持增删改查
 * 仅老板角色可访问
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getWarehouses, createWarehouse } from '@/api'
import type { Warehouse } from '@/api/types'
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

/** 显示创建弹窗 */
const showModal = ref(false)

/** 创建表单 */
const createForm = reactive({
  name: '',
  address: '',
})

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
 * 显示创建弹窗
 */
function showCreateModal(): void {
  createForm.name = ''
  createForm.address = ''
  showModal.value = true
}

/**
 * 关闭创建弹窗
 */
function closeModal(): void {
  showModal.value = false
}

/**
 * 创建仓库
 */
async function handleCreate(): Promise<void> {
  // 表单验证
  if (!createForm.name.trim()) {
    uni.showToast({
      title: '请输入仓库名称',
      icon: 'none',
    })
    return
  }
  
  try {
    uni.showLoading({ title: '创建中...' })
    
    await createWarehouse({
      name: createForm.name.trim(),
      address: createForm.address.trim() || undefined,
    })
    
    uni.hideLoading()
    uni.showToast({
      title: '创建成功',
      icon: 'success',
    })
    
    // 关闭弹窗并刷新列表
    closeModal()
    await loadWarehouses()
  } catch (error) {
    console.error('创建仓库失败:', error)
    uni.hideLoading()
    uni.showToast({
      title: '创建失败',
      icon: 'none',
    })
  }
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

.status-tag.inactive {
  padding: 4rpx 12rpx;
  background-color: #fff1f0;
  border-radius: 8rpx;
  
  .status-text {
    font-size: 22rpx;
    color: #ff4d4f;
  }
}

.warehouse-address {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 4rpx;
  display: block;
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

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 600rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.modal-close {
  font-size: 36rpx;
  color: #999999;
  padding: 8rpx;
}

.modal-body {
  padding: 32rpx;
}

.form-item {
  margin-bottom: 24rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 12rpx;
  display: block;
  
  &.required::before {
    content: '*';
    color: #ff4d4f;
    margin-right: 8rpx;
  }
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333333;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.cancel {
    border-right: 1rpx solid #f0f0f0;
    
    .btn-text {
      color: #666666;
    }
  }
  
  &.confirm {
    .btn-text {
      color: #1890ff;
      font-weight: bold;
    }
  }
}

.btn-text {
  font-size: 30rpx;
}
</style>
