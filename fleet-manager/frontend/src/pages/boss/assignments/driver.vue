<template>
  <!-- 
    司机仓库分配页面
    显示所有司机列表，支持为司机分配仓库
    仅老板角色可访问
    @requirements 7.1, 7.2, 7.3, 7.4
  -->
  <view class="assignment-page">
    <!-- 顶部导航栏 -->
    <TopNavBar title="司机仓库分配" :show-back="true" />
    
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

    <!-- 加载状态 -->
    <view v-if="loading && !refreshing" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredDriverList.length === 0" class="empty-container">
      <text class="empty-icon">👥</text>
      <text class="empty-text">{{ searchKeyword ? '未找到匹配的司机' : '暂无司机' }}</text>
    </view>

    <!-- 司机列表 -->
    <scroll-view
      v-else
      class="driver-list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="handleRefresh"
    >
      <view
        v-for="driver in filteredDriverList"
        :key="driver.id"
        class="driver-card"
        @click="openAssignModal(driver)"
      >
        <!-- 司机头像和基本信息 -->
        <view class="driver-info">
          <view class="driver-avatar">
            <text class="avatar-text">{{ driver.name.charAt(0) }}</text>
          </view>
          <view class="driver-detail">
            <view class="driver-name-row">
              <text class="driver-name">{{ driver.name }}</text>
              <view v-if="!driver.is_active" class="status-tag inactive">
                <text class="status-text">已禁用</text>
              </view>
            </view>
            <text class="driver-phone">{{ driver.phone || '未设置手机号' }}</text>
            <view class="warehouse-info">
              <text class="warehouse-label">当前仓库：</text>
              <text :class="['warehouse-name', { unassigned: !driver.warehouse_id }]">
                {{ getWarehouseName(driver.warehouse_id) }}
              </text>
            </view>
          </view>
        </view>
        
        <!-- 右侧分配按钮 -->
        <view class="assign-btn" @click.stop="openAssignModal(driver)">
          <text class="assign-btn-text">分配</text>
        </view>
      </view>
      
      <!-- 没有更多数据 -->
      <view v-if="filteredDriverList.length > 0" class="no-more">
        <text class="no-more-text">没有更多数据了</text>
      </view>
    </scroll-view>

    <!-- 统计信息 -->
    <view v-if="!loading && driverList.length > 0" class="stats-footer">
      <text class="stats-text">
        共 {{ driverList.length }} 名司机，{{ assignedCount }} 人已分配仓库
      </text>
    </view>

    <!-- 仓库分配弹窗 -->
    <view v-if="showAssignModal" class="modal-overlay" @click="closeAssignModal">
      <view class="modal-content" @click.stop>
        <!-- 弹窗标题 -->
        <view class="modal-header">
          <text class="modal-title">为 {{ selectedDriver?.name }} 分配仓库</text>
          <text class="modal-close" @click="closeAssignModal">✕</text>
        </view>
        
        <!-- 仓库列表 -->
        <scroll-view class="warehouse-list" scroll-y>
          <!-- 取消分配选项 -->
          <view
            :class="['warehouse-item', { selected: selectedWarehouseId === null }]"
            @click="selectWarehouse(null)"
          >
            <view class="warehouse-item-info">
              <text class="warehouse-item-name">不分配仓库</text>
              <text class="warehouse-item-desc">司机将不属于任何仓库</text>
            </view>
            <view v-if="selectedWarehouseId === null" class="check-icon">✓</view>
          </view>
          
          <!-- 仓库选项 -->
          <view
            v-for="warehouse in warehouseList"
            :key="warehouse.id"
            :class="['warehouse-item', { selected: selectedWarehouseId === warehouse.id }]"
            @click="selectWarehouse(warehouse.id)"
          >
            <view class="warehouse-item-info">
              <text class="warehouse-item-name">{{ warehouse.name }}</text>
              <text class="warehouse-item-desc">{{ warehouse.address || '未设置地址' }}</text>
            </view>
            <view v-if="selectedWarehouseId === warehouse.id" class="check-icon">✓</view>
          </view>
        </scroll-view>
        
        <!-- 弹窗底部按钮 -->
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeAssignModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @click="confirmAssign">
            <text class="btn-text">{{ submitting ? '保存中...' : '确认分配' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 司机仓库分配页面
 * 显示所有司机列表，支持为司机分配仓库
 * 仅老板角色可访问
 * @requirements 7.1, 7.2, 7.3, 7.4
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUsers, getWarehouses, updateUser } from '@/api'
import type { User, Warehouse } from '@/api/types'
import { UserRole } from '@/api/types'
import TopNavBar from '@/components/TopNavBar/index.vue'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 下拉刷新状态 */
const refreshing = ref(false)

/** 提交状态 */
const submitting = ref(false)

/** 司机列表 */
const driverList = ref<User[]>([])

/** 仓库列表 */
const warehouseList = ref<Warehouse[]>([])

/** 搜索关键词 */
const searchKeyword = ref('')

/** 是否显示分配弹窗 */
const showAssignModal = ref(false)

/** 当前选中的司机 */
const selectedDriver = ref<User | null>(null)

/** 当前选中的仓库ID（null 表示不分配） */
const selectedWarehouseId = ref<number | null>(null)

// ==================== 计算属性 ====================

/**
 * 已分配仓库的司机数量
 */
const assignedCount = computed(() => 
  driverList.value.filter(d => d.warehouse_id).length
)

/**
 * 筛选后的司机列表
 * 按关键词搜索（姓名或手机号）
 */
const filteredDriverList = computed(() => {
  if (!searchKeyword.value) {
    return driverList.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return driverList.value.filter(d => 
    d.name.toLowerCase().includes(keyword) ||
    (d.phone && d.phone.includes(keyword))
  )
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
})

onShow(() => {
  // 每次显示页面时刷新数据
  loadData()
})

// ==================== 方法 ====================

/**
 * 加载数据（司机列表和仓库列表）
 * @requirements 7.1
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    // 并行加载司机和仓库数据
    const [usersData, warehousesData] = await Promise.all([
      getUsers({ role: UserRole.DRIVER }),
      getWarehouses({ is_active: true }),
    ])
    
    // 只保留司机角色
    driverList.value = usersData.filter(u => u.role === UserRole.DRIVER)
    warehouseList.value = warehousesData
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

/**
 * 处理下拉刷新
 */
async function handleRefresh(): Promise<void> {
  refreshing.value = true
  await loadData()
}

/**
 * 处理搜索输入
 * 搜索是实时的，通过计算属性自动过滤
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
 * 获取仓库名称
 * 
 * @param warehouseId - 仓库ID
 * @returns 仓库名称
 */
function getWarehouseName(warehouseId: number | null | undefined): string {
  if (!warehouseId) return '未分配'
  
  const warehouse = warehouseList.value.find(w => w.id === warehouseId)
  return warehouse ? warehouse.name : '未知仓库'
}

/**
 * 打开分配弹窗
 * 
 * @param driver - 选中的司机
 * @requirements 7.2
 */
function openAssignModal(driver: User): void {
  selectedDriver.value = driver
  // 初始化选中的仓库为司机当前的仓库
  selectedWarehouseId.value = driver.warehouse_id ?? null
  showAssignModal.value = true
}

/**
 * 关闭分配弹窗
 */
function closeAssignModal(): void {
  showAssignModal.value = false
  selectedDriver.value = null
  selectedWarehouseId.value = null
}

/**
 * 选择仓库
 * 
 * @param warehouseId - 仓库ID，null 表示不分配
 */
function selectWarehouse(warehouseId: number | null): void {
  selectedWarehouseId.value = warehouseId
}

/**
 * 确认分配
 * 调用 API 更新司机的仓库分配
 * @requirements 7.3, 7.4
 */
async function confirmAssign(): Promise<void> {
  if (!selectedDriver.value) return
  
  // 检查是否有变化
  const currentWarehouseId = selectedDriver.value.warehouse_id ?? null
  if (selectedWarehouseId.value === currentWarehouseId) {
    uni.showToast({
      title: '仓库未变更',
      icon: 'none',
    })
    return
  }
  
  submitting.value = true
  try {
    // 调用 API 更新用户的仓库分配
    await updateUser(selectedDriver.value.id, {
      warehouse_id: selectedWarehouseId.value,
    })
    
    // 更新本地数据
    const index = driverList.value.findIndex(d => d.id === selectedDriver.value!.id)
    if (index !== -1) {
      driverList.value[index].warehouse_id = selectedWarehouseId.value
    }
    
    // 显示成功提示
    uni.showToast({
      title: '分配成功',
      icon: 'success',
    })
    
    // 关闭弹窗
    closeAssignModal()
  } catch (error) {
    console.error('分配失败:', error)
    uni.showToast({
      title: '分配失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.assignment-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 搜索栏 */
.search-bar {
  padding: 24rpx;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 24rpx;
  height: 72rpx;
}

.search-icon {
  font-size: 28rpx;
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
  flex: 1;
  padding: 24rpx;
}

.driver-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 司机信息 */
.driver-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.driver-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
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
  flex-wrap: wrap;
  gap: 8rpx;
}

.driver-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.status-tag.inactive {
  background-color: #fff1f0;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.status-text {
  font-size: 22rpx;
  color: #ff4d4f;
}

.driver-phone {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 8rpx;
  display: block;
}

.warehouse-info {
  display: flex;
  align-items: center;
}

.warehouse-label {
  font-size: 24rpx;
  color: #999999;
}

.warehouse-name {
  font-size: 24rpx;
  color: #1890ff;
  
  &.unassigned {
    color: #ff4d4f;
  }
}

/* 分配按钮 */
.assign-btn {
  padding: 12rpx 24rpx;
  background-color: #1890ff;
  border-radius: 8rpx;
}

.assign-btn-text {
  font-size: 26rpx;
  color: #ffffff;
}

/* 没有更多数据 */
.no-more {
  display: flex;
  justify-content: center;
  padding: 24rpx 0;
}

.no-more-text {
  font-size: 24rpx;
  color: #999999;
}

/* 统计信息 */
.stats-footer {
  padding: 16rpx 24rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  text-align: center;
}

.stats-text {
  font-size: 24rpx;
  color: #999999;
}

/* 弹窗遮罩 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

/* 弹窗内容 */
.modal-content {
  width: 100%;
  max-height: 80vh;
  background-color: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

/* 弹窗标题 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

/* 仓库列表 */
.warehouse-list {
  flex: 1;
  max-height: 60vh;
  padding: 16rpx 0;
}

.warehouse-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  margin: 0 16rpx 8rpx;
  border-radius: 12rpx;
  background-color: #f9f9f9;
  
  &.selected {
    background-color: #e6f7ff;
    border: 2rpx solid #1890ff;
  }
}

.warehouse-item-info {
  flex: 1;
}

.warehouse-item-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 4rpx;
}

.warehouse-item-desc {
  font-size: 24rpx;
  color: #999999;
}

.check-icon {
  font-size: 32rpx;
  color: #1890ff;
  font-weight: bold;
}

/* 弹窗底部按钮 */
.modal-footer {
  display: flex;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
  gap: 24rpx;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  
  &.cancel {
    background-color: #f5f5f5;
    
    .btn-text {
      color: #666666;
    }
  }
  
  &.confirm {
    background-color: #1890ff;
    
    .btn-text {
      color: #ffffff;
    }
  }
}

.btn-text {
  font-size: 30rpx;
  font-weight: bold;
}
</style>
