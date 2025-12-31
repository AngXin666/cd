<template>
  <!--
    老板端 - 车辆管理页面
    功能：
    - 查看所有车辆列表
    - 按状态筛选（全部/使用中/待分配/审核中/已归还）
    - 搜索车牌号
    - 录入新车辆
    - 分配车辆给司机
    - 还车录入
    - 查看车辆历史
    - 租金提醒入口
    @requirements 12.1, 12.2, 12.3, 12.4
  -->
  <view class="vehicles-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input v-model="searchKeyword" class="search-input" type="text" placeholder="搜索车牌号" />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
      </view>
      <!-- 租金提醒入口 -->
      <view class="reminder-btn" @click="goToLeaseReminders">
        <text class="reminder-icon">💰</text>
      </view>
    </view>

    <!-- 状态筛选标签 -->
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

    <!-- 操作按钮 -->
    <view class="action-bar">
      <view class="action-btn primary" @click="handleAddVehicle">
        <text class="btn-icon">➕</text>
        <text class="btn-text">录入车辆</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredVehicles.length === 0" class="empty-container">
      <text class="empty-icon">🚗</text>
      <text class="empty-text">{{ searchKeyword ? '未找到匹配的车辆' : '暂无车辆' }}</text>
      <text class="empty-subtitle">点击上方按钮录入新车辆</text>
    </view>

    <!-- 车辆列表 -->
    <scroll-view v-else class="vehicle-list" scroll-y>
      <view 
        v-for="vehicle in filteredVehicles" 
        :key="vehicle.id" 
        class="vehicle-card"
      >
        <!-- 车辆照片和状态 -->
        <view v-if="vehicle.left_front_photo" class="vehicle-photo" @click="viewVehicleDetail(vehicle.id)">
          <image :src="vehicle.left_front_photo" mode="aspectFill" class="photo-image" />
          <view class="status-badge" :class="getStatusBadgeClass(vehicle)">
            <text class="badge-text">{{ getStatusBadgeText(vehicle) }}</text>
          </view>
        </view>
        <view v-else class="vehicle-photo-placeholder" @click="viewVehicleDetail(vehicle.id)">
          <text class="placeholder-icon">📷</text>
          <view class="status-badge" :class="getStatusBadgeClass(vehicle)">
            <text class="badge-text">{{ getStatusBadgeText(vehicle) }}</text>
          </view>
        </view>

        <!-- 车辆信息 -->
        <view class="vehicle-info">
          <view class="info-header" @click="viewVehicleDetail(vehicle.id)">
            <view class="plate-badge">
              <text class="plate-text">{{ vehicle.license_plate }}</text>
            </view>
            <text class="brand-model">{{ vehicle.brand || '-' }} {{ vehicle.model || '' }}</text>
          </view>

          <!-- 仓库信息 -->
          <view v-if="vehicle.warehouse_id" class="warehouse-info">
            <text class="info-icon">🏭</text>
            <text class="info-text">{{ getWarehouseName(vehicle.warehouse_id) }}</text>
          </view>

          <!-- 司机信息 -->
          <view v-if="vehicle.user_id" class="driver-info">
            <text class="info-icon">👤</text>
            <text class="info-text">{{ vehicle.user_name || '已分配' }}</text>
          </view>
          <view v-else class="driver-info unassigned">
            <text class="info-icon">⚠️</text>
            <text class="info-text">未分配司机</text>
          </view>

          <!-- 操作按钮 -->
          <view class="action-buttons">
            <view class="action-btn blue" @click="viewVehicleDetail(vehicle.id)">
              <text class="btn-icon">👁️</text>
              <text class="btn-text">详情</text>
            </view>
            <view class="action-btn gray" @click="viewVehicleHistory(vehicle.id)">
              <text class="btn-icon">📋</text>
              <text class="btn-text">历史</text>
            </view>
            <!-- 待分配状态：显示分配按钮和还车按钮 -->
            <view 
              v-if="!vehicle.user_id" 
              class="action-btn green" 
              @click="handleAssignVehicle(vehicle)"
            >
              <text class="btn-icon">👤</text>
              <text class="btn-text">分配</text>
            </view>
            <view 
              v-if="!vehicle.user_id && canReturnVehicle(vehicle)" 
              class="action-btn orange" 
              @click="handleReturnVehicle(vehicle.id)"
            >
              <text class="btn-icon">🚗</text>
              <text class="btn-text">还车</text>
            </view>
            <!-- 使用中状态：显示回收按钮（功能同还车录入） -->
            <view 
              v-if="vehicle.user_id && canReturnVehicle(vehicle)" 
              class="action-btn orange" 
              @click="handleReturnVehicle(vehicle.id)"
            >
              <text class="btn-icon">🔄</text>
              <text class="btn-text">回收</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 统计信息 -->
    <view v-if="!loading && vehicles.length > 0" class="stats-footer">
      <text class="stats-text">共 {{ filteredVehicles.length }} 辆车，{{ activeCount }} 辆使用中</text>
    </view>

    <!-- 分配司机弹窗 -->
    <view v-if="showAssignModal" class="modal-overlay" @click="showAssignModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">分配车辆</text>
          <view class="modal-close" @click="showAssignModal = false">×</view>
        </view>
        <view class="modal-body">
          <text class="modal-label">车牌号：{{ selectedVehicle?.license_plate }}</text>
          
          <!-- 选择仓库 -->
          <text class="modal-label">选择仓库：</text>
          <picker 
            mode="selector" 
            :range="warehouses" 
            range-key="name"
            @change="onAssignWarehouseChange"
          >
            <view class="picker-box">
              <text>{{ assignWarehouseName || '请选择仓库' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>

          <!-- 选择司机 -->
          <text class="modal-label">选择司机：</text>
          <scroll-view scroll-y class="driver-list">
            <view 
              v-for="driver in assignableDrivers" 
              :key="driver.id"
              :class="['driver-item', { selected: selectedDriverId === driver.id }]"
              @click="selectedDriverId = driver.id"
            >
              <text class="driver-name">{{ driver.name || driver.phone }}</text>
              <text v-if="selectedDriverId === driver.id" class="check-icon">✓</text>
            </view>
            <view v-if="assignableDrivers.length === 0" class="empty-drivers">
              <text>请先选择仓库</text>
            </view>
          </scroll-view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="showAssignModal = false">取消</view>
          <view class="modal-btn confirm" @click="confirmAssign">确认分配</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 老板端 - 车辆管理页面
 * 功能：查看所有车辆、按状态筛选、录入、分配、还车、查看历史
 * @module pages/boss/vehicles
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAllVehicles, getWarehouses, getWarehouseUsers, assignVehicle } from '@/api'
import type { Vehicle, User, Warehouse } from '@/api/types'
import { VehicleStatus } from '@/api/types'

// ==================== 类型定义 ====================

/** 筛选类型 */
type FilterType = 'all' | 'active' | 'unassigned' | 'reviewing' | 'returned'

// ==================== 状态定义 ====================

/** 车辆列表 */
const vehicles = ref<Vehicle[]>([])

/** 仓库列表（用于分配弹窗和显示仓库名称） */
const warehouses = ref<Warehouse[]>([])

/** 加载状态 */
const loading = ref(false)

/** 搜索关键词 */
const searchKeyword = ref('')

/** 当前状态筛选 */
const activeFilter = ref<FilterType>('all')

/** 分配弹窗相关 */
const showAssignModal = ref(false)
const selectedVehicle = ref<Vehicle | null>(null)
const selectedDriverId = ref<number | null>(null)
const assignWarehouseId = ref<number | null>(null)
const assignableDrivers = ref<User[]>([])

// ==================== 计算属性 ====================

/** 分配弹窗中选择的仓库名称 */
const assignWarehouseName = computed(() => {
  if (!assignWarehouseId.value) return ''
  const w = warehouses.value.find(w => w.id === assignWarehouseId.value)
  return w?.name || ''
})

/** 使用中数量 */
const activeCount = computed(() => 
  vehicles.value.filter(v => 
    (v.status === VehicleStatus.ACTIVE || v.status === VehicleStatus.PICKED_UP) && !v.return_time
  ).length
)

/** 待分配数量 */
const unassignedCount = computed(() => 
  vehicles.value.filter(v => !v.user_id).length
)

/** 审核中数量 */
const reviewingCount = computed(() => 
  vehicles.value.filter(v => v.status === VehicleStatus.REVIEWING).length
)

/** 已归还数量 */
const returnedCount = computed(() => 
  vehicles.value.filter(v => v.status === VehicleStatus.RETURNED || v.return_time).length
)

/** 筛选标签配置 */
const filterTabs = computed(() => [
  { label: '全部', value: 'all' as const, count: vehicles.value.length },
  { label: '使用中', value: 'active' as const, count: activeCount.value },
  { label: '待分配', value: 'unassigned' as const, count: unassignedCount.value },
  { label: '审核中', value: 'reviewing' as const, count: reviewingCount.value },
  { label: '已归还', value: 'returned' as const, count: returnedCount.value },
])

/** 筛选后的车辆列表 */
const filteredVehicles = computed(() => {
  let result = vehicles.value

  // 按状态筛选
  if (activeFilter.value !== 'all') {
    result = result.filter(v => {
      switch (activeFilter.value) {
        case 'active':
          return (v.status === VehicleStatus.ACTIVE || v.status === VehicleStatus.PICKED_UP) && !v.return_time
        case 'unassigned':
          return !v.user_id
        case 'reviewing':
          return v.status === VehicleStatus.REVIEWING
        case 'returned':
          return v.status === VehicleStatus.RETURNED || v.return_time
        default:
          return true
      }
    })
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(v => 
      v.license_plate.toLowerCase().includes(keyword) || 
      (v.brand && v.brand.toLowerCase().includes(keyword))
    )
  }

  return result
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadWarehouses()
  loadVehicles()
})

onShow(() => {
  loadVehicles()
})

// ==================== 数据加载 ====================

/**
 * 加载仓库列表
 */
async function loadWarehouses(): Promise<void> {
  try {
    warehouses.value = await getWarehouses({ is_active: true })
  } catch (error) {
    console.error('加载仓库列表失败:', error)
  }
}

/**
 * 加载车辆列表
 */
async function loadVehicles(): Promise<void> {
  loading.value = true
  try {
    vehicles.value = await getAllVehicles({ limit: 200 })
  } catch (error) {
    console.error('加载车辆列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 加载指定仓库的司机列表
 * @param warehouseId - 仓库ID
 */
async function loadWarehouseDrivers(warehouseId: number): Promise<void> {
  try {
    const users = await getWarehouseUsers(warehouseId)
    assignableDrivers.value = users.filter(u => u.role === 'driver')
  } catch (error) {
    console.error('加载司机列表失败:', error)
    assignableDrivers.value = []
  }
}

// ==================== 事件处理 ====================

/**
 * 清除搜索
 */
function clearSearch(): void {
  searchKeyword.value = ''
}

/**
 * 处理筛选条件变化
 * @param filter - 筛选条件
 */
function handleFilterChange(filter: FilterType): void {
  activeFilter.value = filter
}

/**
 * 分配弹窗中仓库变化
 * @param e - 事件对象
 */
function onAssignWarehouseChange(e: { detail: { value: number } }): void {
  const index = e.detail.value
  const selected = warehouses.value[index]
  if (selected) {
    assignWarehouseId.value = selected.id
    loadWarehouseDrivers(selected.id)
  }
}

// ==================== 工具函数 ====================

/**
 * 获取状态标签样式类
 * @param vehicle - 车辆信息
 * @returns 样式类名
 */
function getStatusBadgeClass(vehicle: Vehicle): string {
  if (vehicle.review_status === 'pending_review') return 'badge-yellow'
  if (vehicle.review_status === 'need_supplement') return 'badge-red'
  if (vehicle.status === VehicleStatus.RETURNED || vehicle.return_time) return 'badge-gray'
  if (!vehicle.user_id) return 'badge-orange'
  return 'badge-green'
}

/**
 * 获取状态标签文本
 * @param vehicle - 车辆信息
 * @returns 状态文本
 */
function getStatusBadgeText(vehicle: Vehicle): string {
  if (vehicle.review_status === 'pending_review') return '待审核'
  if (vehicle.review_status === 'need_supplement') return '需补录'
  if (vehicle.status === VehicleStatus.RETURNED || vehicle.return_time) return '已还车'
  if (!vehicle.user_id) return '待分配'
  return '使用中'
}

/**
 * 获取仓库名称
 * @param warehouseId - 仓库ID
 * @returns 仓库名称
 */
function getWarehouseName(warehouseId: number): string {
  const w = warehouses.value.find(w => w.id === warehouseId)
  return w?.name || '未知仓库'
}

/**
 * 是否可以还车/回收
 * @param vehicle - 车辆信息
 * @returns 是否可以还车/回收
 */
function canReturnVehicle(vehicle: Vehicle): boolean {
  // 车辆状态为使用中或已提车，且未还车，且审核通过
  return (vehicle.status === VehicleStatus.ACTIVE || vehicle.status === VehicleStatus.PICKED_UP) && 
         !vehicle.return_time && 
         vehicle.review_status === 'approved'
}

// ==================== 操作处理 ====================

/**
 * 添加车辆
 */
function handleAddVehicle(): void {
  uni.navigateTo({ url: '/pages/driver/vehicle/add' })
}

/**
 * 查看车辆详情
 * @param vehicleId - 车辆ID
 */
function viewVehicleDetail(vehicleId: number): void {
  uni.navigateTo({ url: `/pages/driver/vehicle/detail?id=${vehicleId}` })
}

/**
 * 查看车辆历史
 * @param vehicleId - 车辆ID
 */
function viewVehicleHistory(vehicleId: number): void {
  uni.navigateTo({ url: `/pages/boss/vehicles/history?id=${vehicleId}` })
}

/**
 * 还车/回收
 * @param vehicleId - 车辆ID
 */
function handleReturnVehicle(vehicleId: number): void {
  uni.navigateTo({ url: `/pages/driver/vehicle/return?id=${vehicleId}` })
}

/**
 * 跳转到租金提醒页面
 */
function goToLeaseReminders(): void {
  uni.navigateTo({ url: '/pages/boss/vehicles/lease-reminders' })
}

/**
 * 打开分配弹窗
 * @param vehicle - 车辆信息
 */
function handleAssignVehicle(vehicle: Vehicle): void {
  selectedVehicle.value = vehicle
  selectedDriverId.value = null
  assignWarehouseId.value = vehicle.warehouse_id || null
  assignableDrivers.value = []
  
  // 如果车辆已有仓库，加载该仓库的司机
  if (vehicle.warehouse_id) {
    loadWarehouseDrivers(vehicle.warehouse_id)
  }
  
  showAssignModal.value = true
}

/**
 * 确认分配
 */
async function confirmAssign(): Promise<void> {
  if (!selectedVehicle.value || !selectedDriverId.value) {
    uni.showToast({ title: '请选择司机', icon: 'none' })
    return
  }

  uni.showLoading({ title: '分配中...' })
  try {
    await assignVehicle(
      selectedVehicle.value.id,
      selectedDriverId.value,
      assignWarehouseId.value || undefined
    )
    uni.hideLoading()
    uni.showToast({ title: '分配成功', icon: 'success' })
    showAssignModal.value = false
    loadVehicles()
  } catch (error) {
    uni.hideLoading()
    console.error('分配失败:', error)
    uni.showToast({ title: '分配失败', icon: 'none' })
  }
}
</script>


<style lang="scss" scoped>
/* 页面容器 */
.vehicles-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
  gap: 16rpx;
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

.search-icon { font-size: 32rpx; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #333333; }
.clear-icon { font-size: 28rpx; color: #999999; padding: 8rpx; }

.reminder-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 36rpx;
}

.reminder-icon { font-size: 32rpx; }

/* 状态筛选标签 */
.filter-tabs {
  display: flex;
  background-color: #ffffff;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  overflow-x: auto;
}

.filter-tab {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  margin-right: 16rpx;
  border-radius: 32rpx;
  background-color: #f5f5f5;
  white-space: nowrap;
  
  &.active {
    background-color: #e6f7ff;
    .tab-text { color: #1890ff; }
    .tab-count { background-color: #1890ff; color: #ffffff; }
  }
}

.tab-text { font-size: 26rpx; color: #666666; }
.tab-count {
  font-size: 22rpx;
  color: #999999;
  background-color: #e0e0e0;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-left: 8rpx;
}

/* 操作栏 */
.action-bar {
  padding: 16rpx 24rpx;
  background-color: #ffffff;
}

.action-bar > .action-btn.primary {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  padding: 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.3);
}

.action-bar .btn-icon { font-size: 28rpx; margin-right: 8rpx; }
.action-bar .btn-text { font-size: 28rpx; font-weight: 500; }

/* 加载和空状态 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.loading-text { font-size: 28rpx; color: #999999; }

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; margin-bottom: 8rpx; }
.empty-subtitle { font-size: 24rpx; color: #cccccc; }

/* 车辆列表 */
.vehicle-list {
  flex: 1;
  padding: 24rpx;
}

.vehicle-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

/* 车辆照片 */
.vehicle-photo {
  position: relative;
  width: 100%;
  height: 240rpx;
  background: #f3f4f6;
}

.photo-image { width: 100%; height: 100%; }

.vehicle-photo-placeholder {
  position: relative;
  width: 100%;
  height: 140rpx;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon { font-size: 64rpx; opacity: 0.3; }

/* 状态标签 */
.status-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
}

.badge-text { font-size: 22rpx; font-weight: 500; color: #fff; }

.badge-green { background: rgba(34, 197, 94, 0.9); }
.badge-red { background: rgba(239, 68, 68, 0.9); }
.badge-yellow { background: rgba(245, 158, 11, 0.9); }
.badge-orange { background: rgba(249, 115, 22, 0.9); }
.badge-gray { background: rgba(156, 163, 175, 0.9); }

/* 车辆信息 */
.vehicle-info { padding: 20rpx; }

.info-header { margin-bottom: 12rpx; }

.plate-badge {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 8rpx;
  padding: 6rpx 12rpx;
  display: inline-block;
  margin-bottom: 8rpx;
}

.plate-text { font-size: 28rpx; font-weight: bold; color: #fff; }
.brand-model { font-size: 24rpx; color: #666; display: block; }

.warehouse-info, .driver-info {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
  padding: 8rpx 12rpx;
  background: #f0f9ff;
  border-radius: 8rpx;
}

.driver-info {
  background: #f0fdf4;
  &.unassigned { background: #fff7ed; }
}

.info-icon { font-size: 24rpx; margin-right: 8rpx; }
.info-text { font-size: 24rpx; color: #333; }

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #f0f0f0;
  flex-wrap: wrap;
}

.action-buttons .action-btn {
  flex: 1;
  min-width: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 8rpx;
  border-radius: 8rpx;
  color: #fff;
  
  &.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
  &.green { background: linear-gradient(135deg, #22c55e, #16a34a); }
  &.orange { background: linear-gradient(135deg, #f97316, #ea580c); }
  &.gray { background: linear-gradient(135deg, #6b7280, #4b5563); }
}

.action-buttons .btn-icon { font-size: 22rpx; margin-right: 4rpx; }
.action-buttons .btn-text { font-size: 22rpx; }

/* 统计信息 */
.stats-footer {
  padding: 16rpx 24rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  text-align: center;
}

.stats-text { font-size: 24rpx; color: #999999; }

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 85%;
  max-width: 640rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 40rpx; color: #999; padding: 8rpx; }

.modal-body { padding: 24rpx; }
.modal-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 16rpx; }

.picker-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx;
  background: #f3f4f6;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.driver-list {
  max-height: 320rpx;
  border: 1rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.driver-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  &:last-child { border-bottom: none; }
  &.selected { background: #e6f7ff; }
}

.driver-name { font-size: 28rpx; color: #333; }
.check-icon { color: #1890ff; font-size: 28rpx; }

.empty-drivers {
  padding: 40rpx;
  text-align: center;
  color: #999;
  font-size: 26rpx;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  text-align: center;
  font-size: 28rpx;
  
  &.cancel { color: #666; }
  &.confirm { color: #1890ff; font-weight: 500; }
}
</style>
