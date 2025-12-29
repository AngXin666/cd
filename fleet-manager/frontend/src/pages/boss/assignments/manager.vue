<template>
  <!-- 
    车队长仓库分配页面
    显示所有车队长列表，支持为车队长分配多个仓库
    仅老板角色可访问
    @requirements 8.1, 8.2, 8.3, 8.4
  -->
  <view class="assignment-page">
    <!-- 顶部导航栏 -->
    <TopNavBar title="车队长仓库分配" :show-back="true" />
    
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          type="text"
          placeholder="搜索车队长姓名或手机号"
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
    <view v-else-if="filteredManagerList.length === 0" class="empty-container">
      <text class="empty-icon">👥</text>
      <text class="empty-text">{{ searchKeyword ? '未找到匹配的车队长' : '暂无车队长' }}</text>
    </view>

    <!-- 车队长列表 -->
    <scroll-view
      v-else
      class="manager-list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="handleRefresh"
    >
      <view
        v-for="manager in filteredManagerList"
        :key="manager.id"
        class="manager-card"
        @click="openAssignModal(manager)"
      >
        <!-- 车队长头像和基本信息 -->
        <view class="manager-info">
          <view class="manager-avatar">
            <text class="avatar-text">{{ manager.name.charAt(0) }}</text>
          </view>
          <view class="manager-detail">
            <view class="manager-name-row">
              <text class="manager-name">{{ manager.name }}</text>
              <view v-if="!manager.is_active" class="status-tag inactive">
                <text class="status-text">已禁用</text>
              </view>
            </view>
            <text class="manager-phone">{{ manager.phone || '未设置手机号' }}</text>
            <view class="warehouse-info">
              <text class="warehouse-label">管理仓库：</text>
              <text :class="['warehouse-name', { unassigned: !getManagerWarehouses(manager.id).length }]">
                {{ getManagerWarehouseNames(manager.id) }}
              </text>
            </view>
          </view>
        </view>
        
        <!-- 右侧分配按钮 -->
        <view class="assign-btn" @click.stop="openAssignModal(manager)">
          <text class="assign-btn-text">分配</text>
        </view>
      </view>
      
      <!-- 没有更多数据 -->
      <view v-if="filteredManagerList.length > 0" class="no-more">
        <text class="no-more-text">没有更多数据了</text>
      </view>
    </scroll-view>

    <!-- 统计信息 -->
    <view v-if="!loading && managerList.length > 0" class="stats-footer">
      <text class="stats-text">
        共 {{ managerList.length }} 名车队长，{{ assignedCount }} 人已分配仓库
      </text>
    </view>

    <!-- 仓库分配弹窗（支持多选） -->
    <view v-if="showAssignModal" class="modal-overlay" @click="closeAssignModal">
      <view class="modal-content" @click.stop>
        <!-- 弹窗标题 -->
        <view class="modal-header">
          <text class="modal-title">为 {{ selectedManager?.name }} 分配仓库</text>
          <text class="modal-close" @click="closeAssignModal">✕</text>
        </view>
        
        <!-- 提示信息 -->
        <view class="modal-tip">
          <text class="tip-text">💡 车队长可以管理多个仓库，请勾选需要分配的仓库</text>
        </view>
        
        <!-- 仓库列表（多选） -->
        <scroll-view class="warehouse-list" scroll-y>
          <view
            v-for="warehouse in warehouseList"
            :key="warehouse.id"
            :class="['warehouse-item', { selected: selectedWarehouseIds.includes(warehouse.id) }]"
            @click="toggleWarehouse(warehouse.id)"
          >
            <view class="warehouse-item-info">
              <text class="warehouse-item-name">{{ warehouse.name }}</text>
              <text class="warehouse-item-desc">{{ warehouse.address || '未设置地址' }}</text>
            </view>
            <view class="checkbox-wrapper">
              <view :class="['checkbox', { checked: selectedWarehouseIds.includes(warehouse.id) }]">
                <text v-if="selectedWarehouseIds.includes(warehouse.id)" class="check-icon">✓</text>
              </view>
            </view>
          </view>
          
          <!-- 空仓库提示 -->
          <view v-if="warehouseList.length === 0" class="empty-warehouse">
            <text class="empty-warehouse-text">暂无可分配的仓库</text>
          </view>
        </scroll-view>
        
        <!-- 已选数量提示 -->
        <view class="selected-count">
          <text class="count-text">已选择 {{ selectedWarehouseIds.length }} 个仓库</text>
        </view>
        
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
 * 车队长仓库分配页面
 * 显示所有车队长列表，支持为车队长分配多个仓库
 * 仅老板角色可访问
 * @requirements 8.1, 8.2, 8.3, 8.4
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUsers, getWarehouses, assignUsersToWarehouse, getWarehouseUsers } from '@/api'
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

/** 车队长列表 */
const managerList = ref<User[]>([])

/** 仓库列表 */
const warehouseList = ref<Warehouse[]>([])

/** 仓库-车队长映射（key: 仓库ID, value: 车队长ID数组） */
const warehouseManagerMap = ref<Map<number, number[]>>(new Map())

/** 搜索关键词 */
const searchKeyword = ref('')

/** 是否显示分配弹窗 */
const showAssignModal = ref(false)

/** 当前选中的车队长 */
const selectedManager = ref<User | null>(null)

/** 当前选中的仓库ID列表（多选） */
const selectedWarehouseIds = ref<number[]>([])

// ==================== 计算属性 ====================

/**
 * 已分配仓库的车队长数量
 */
const assignedCount = computed(() => 
  managerList.value.filter(m => getManagerWarehouses(m.id).length > 0).length
)

/**
 * 筛选后的车队长列表
 * 按关键词搜索（姓名或手机号）
 */
const filteredManagerList = computed(() => {
  if (!searchKeyword.value) {
    return managerList.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return managerList.value.filter(m => 
    m.name.toLowerCase().includes(keyword) ||
    (m.phone && m.phone.includes(keyword))
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
 * 加载数据（车队长列表和仓库列表）
 * @requirements 8.1
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    // 并行加载车队长和仓库数据
    const [usersData, warehousesData] = await Promise.all([
      getUsers({ role: UserRole.MANAGER }),
      getWarehouses({ is_active: true }),
    ])
    
    // 只保留车队长角色
    managerList.value = usersData.filter(u => u.role === UserRole.MANAGER)
    warehouseList.value = warehousesData
    
    // 加载每个仓库的车队长分配情况
    await loadWarehouseManagerMapping()
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
 * 加载仓库-车队长映射关系
 * 遍历所有仓库，获取每个仓库下的车队长
 */
async function loadWarehouseManagerMapping(): Promise<void> {
  const newMap = new Map<number, number[]>()
  
  // 并行获取所有仓库的用户列表
  const promises = warehouseList.value.map(async (warehouse) => {
    try {
      const users = await getWarehouseUsers(warehouse.id)
      // 筛选出车队长
      const managerIds = users
        .filter(u => u.role === UserRole.MANAGER)
        .map(u => u.id)
      return { warehouseId: warehouse.id, managerIds }
    } catch (error) {
      console.error(`获取仓库 ${warehouse.id} 用户失败:`, error)
      return { warehouseId: warehouse.id, managerIds: [] }
    }
  })
  
  const results = await Promise.all(promises)
  
  // 构建映射
  results.forEach(({ warehouseId, managerIds }) => {
    newMap.set(warehouseId, managerIds)
  })
  
  warehouseManagerMap.value = newMap
}

/**
 * 获取车队长管理的仓库ID列表
 * 
 * @param managerId - 车队长ID
 * @returns 仓库ID数组
 */
function getManagerWarehouses(managerId: number): number[] {
  const warehouseIds: number[] = []
  
  warehouseManagerMap.value.forEach((managerIds, warehouseId) => {
    if (managerIds.includes(managerId)) {
      warehouseIds.push(warehouseId)
    }
  })
  
  return warehouseIds
}

/**
 * 获取车队长管理的仓库名称（逗号分隔）
 * 
 * @param managerId - 车队长ID
 * @returns 仓库名称字符串
 */
function getManagerWarehouseNames(managerId: number): string {
  const warehouseIds = getManagerWarehouses(managerId)
  
  if (warehouseIds.length === 0) {
    return '未分配'
  }
  
  const names = warehouseIds
    .map(id => {
      const warehouse = warehouseList.value.find(w => w.id === id)
      return warehouse ? warehouse.name : '未知仓库'
    })
    .filter(name => name !== '未知仓库')
  
  if (names.length === 0) {
    return '未分配'
  }
  
  // 如果仓库太多，显示前2个 + 数量
  if (names.length > 2) {
    return `${names.slice(0, 2).join('、')} 等${names.length}个`
  }
  
  return names.join('、')
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
 * 打开分配弹窗
 * 
 * @param manager - 选中的车队长
 * @requirements 8.2
 */
function openAssignModal(manager: User): void {
  selectedManager.value = manager
  // 初始化选中的仓库为车队长当前管理的仓库
  selectedWarehouseIds.value = [...getManagerWarehouses(manager.id)]
  showAssignModal.value = true
}

/**
 * 关闭分配弹窗
 */
function closeAssignModal(): void {
  showAssignModal.value = false
  selectedManager.value = null
  selectedWarehouseIds.value = []
}

/**
 * 切换仓库选中状态（多选）
 * 
 * @param warehouseId - 仓库ID
 */
function toggleWarehouse(warehouseId: number): void {
  const index = selectedWarehouseIds.value.indexOf(warehouseId)
  if (index === -1) {
    // 添加选中
    selectedWarehouseIds.value.push(warehouseId)
  } else {
    // 取消选中
    selectedWarehouseIds.value.splice(index, 1)
  }
}

/**
 * 确认分配
 * 调用 API 更新车队长的仓库分配
 * @requirements 8.3, 8.4
 */
async function confirmAssign(): Promise<void> {
  if (!selectedManager.value) return
  
  const managerId = selectedManager.value.id
  const currentWarehouses = getManagerWarehouses(managerId)
  
  // 检查是否有变化
  const hasChange = 
    currentWarehouses.length !== selectedWarehouseIds.value.length ||
    !currentWarehouses.every(id => selectedWarehouseIds.value.includes(id))
  
  if (!hasChange) {
    uni.showToast({
      title: '仓库未变更',
      icon: 'none',
    })
    return
  }
  
  submitting.value = true
  try {
    // 计算需要添加和移除的仓库
    const toAdd = selectedWarehouseIds.value.filter(id => !currentWarehouses.includes(id))
    const toRemove = currentWarehouses.filter(id => !selectedWarehouseIds.value.includes(id))
    
    // 处理添加：将车队长添加到新仓库
    for (const warehouseId of toAdd) {
      const currentManagers = warehouseManagerMap.value.get(warehouseId) || []
      await assignUsersToWarehouse(warehouseId, [...currentManagers, managerId])
    }
    
    // 处理移除：从旧仓库中移除车队长
    for (const warehouseId of toRemove) {
      const currentManagers = warehouseManagerMap.value.get(warehouseId) || []
      const newManagers = currentManagers.filter(id => id !== managerId)
      await assignUsersToWarehouse(warehouseId, newManagers)
    }
    
    // 重新加载映射关系
    await loadWarehouseManagerMapping()
    
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

/* 车队长列表 */
.manager-list {
  flex: 1;
  padding: 24rpx;
}

.manager-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 车队长信息 */
.manager-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.manager-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
}

.avatar-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.manager-detail {
  flex: 1;
}

.manager-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
  flex-wrap: wrap;
  gap: 8rpx;
}

.manager-name {
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

.manager-phone {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 8rpx;
  display: block;
}

.warehouse-info {
  display: flex;
  align-items: flex-start;
}

.warehouse-label {
  font-size: 24rpx;
  color: #999999;
  flex-shrink: 0;
}

.warehouse-name {
  font-size: 24rpx;
  color: #52c41a;
  flex: 1;
  
  &.unassigned {
    color: #ff4d4f;
  }
}

/* 分配按钮 */
.assign-btn {
  padding: 12rpx 24rpx;
  background-color: #52c41a;
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

/* 提示信息 */
.modal-tip {
  padding: 16rpx 32rpx;
  background-color: #f6ffed;
  border-bottom: 1rpx solid #f0f0f0;
}

.tip-text {
  font-size: 24rpx;
  color: #52c41a;
}

/* 仓库列表 */
.warehouse-list {
  flex: 1;
  max-height: 50vh;
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
    background-color: #f6ffed;
    border: 2rpx solid #52c41a;
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

/* 复选框 */
.checkbox-wrapper {
  margin-left: 16rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.checked {
    background-color: #52c41a;
    border-color: #52c41a;
  }
}

.check-icon {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: bold;
}

/* 空仓库提示 */
.empty-warehouse {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}

.empty-warehouse-text {
  font-size: 28rpx;
  color: #999999;
}

/* 已选数量提示 */
.selected-count {
  padding: 16rpx 32rpx;
  background-color: #fafafa;
  border-top: 1rpx solid #f0f0f0;
}

.count-text {
  font-size: 26rpx;
  color: #666666;
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
    background-color: #52c41a;
    
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
