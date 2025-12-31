<template>
  <!--
    车队长/调度端 - 车辆管理列表页面
    功能：
    - 查看本仓库所有车辆
    - 录入新车辆
    - 分配车辆给司机
    - 还车录入
    - 按状态筛选
    @requirements 11.1, 11.2, 11.3, 11.4
  -->
  <view class="page">
    <scroll-view scroll-y class="scroll-container">
      <view class="content">
        <!-- 页面标题卡片 -->
        <view class="header-card">
          <view class="header-content">
            <view class="header-left">
              <view class="header-title-row">
                <text class="header-icon">🚗</text>
                <text class="header-title">车辆管理</text>
              </view>
              <text class="header-subtitle">管理本仓库的所有车辆</text>
            </view>
            <view class="header-right">
              <view class="refresh-btn" @click="loadVehicles">
                <text :class="['refresh-icon', { spinning: loading }]">🔄</text>
              </view>
              <view class="vehicle-count">
                <text class="count-number">{{ filteredVehicles.length }}</text>
                <text class="count-unit">辆</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 筛选栏 -->
        <view class="filter-bar">
          <view 
            v-for="filter in filterOptions" 
            :key="filter.value"
            :class="['filter-item', { active: currentFilter === filter.value }]"
            @click="currentFilter = filter.value"
          >
            <text class="filter-text">{{ filter.label }}</text>
            <text class="filter-count">{{ getFilterCount(filter.value) }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="action-bar">
          <view class="action-btn primary" @click="handleAddVehicle">
            <text class="btn-icon">➕</text>
            <text class="btn-text">录入车辆</text>
          </view>
        </view>

        <!-- 加载中 -->
        <view v-if="loading" class="loading">
          <text>⏳ 加载中...</text>
        </view>

        <!-- 空状态 -->
        <view v-else-if="filteredVehicles.length === 0" class="empty-state">
          <view class="empty-icon-wrapper">
            <text class="empty-icon">🚗</text>
          </view>
          <text class="empty-title">暂无车辆</text>
          <text class="empty-subtitle">点击上方按钮录入新车辆</text>
        </view>

        <!-- 车辆列表 -->
        <view v-else class="vehicle-list">
          <view 
            v-for="vehicle in filteredVehicles" 
            :key="vehicle.id" 
            class="vehicle-card"
          >
            <!-- 车辆照片 -->
            <view v-if="vehicle.left_front_photo" class="vehicle-photo">
              <image :src="vehicle.left_front_photo" mode="aspectFill" class="photo-image" />
              <view class="status-badge" :class="getStatusBadge(vehicle).colorClass">
                <text class="status-text">{{ getStatusBadge(vehicle).text }}</text>
              </view>
            </view>
            <view v-else class="vehicle-photo-placeholder">
              <text class="placeholder-icon">📷</text>
              <view class="status-badge" :class="getStatusBadge(vehicle).colorClass">
                <text class="status-text">{{ getStatusBadge(vehicle).text }}</text>
              </view>
            </view>

            <!-- 车辆信息 -->
            <view class="vehicle-info">
              <view class="info-header">
                <view class="plate-badge">
                  <text class="plate-text">{{ vehicle.license_plate }}</text>
                </view>
                <text class="brand-model">{{ vehicle.brand || '-' }} {{ vehicle.model || '' }}</text>
              </view>

              <!-- 司机信息 -->
              <view v-if="vehicle.user_id" class="driver-info">
                <text class="driver-icon">👤</text>
                <text class="driver-name">{{ getDriverName(vehicle.user_id) }}</text>
              </view>
              <view v-else class="driver-info unassigned">
                <text class="driver-icon">⚠️</text>
                <text class="driver-name">未分配司机</text>
              </view>

              <!-- 时间信息 -->
              <view v-if="vehicle.pickup_time" class="time-info">
                <text class="time-label">提车：{{ formatDateTime(vehicle.pickup_time) }}</text>
              </view>

              <!-- 操作按钮 -->
              <view class="action-buttons">
                <view class="action-btn blue" @click="handleViewDetail(vehicle.id)">
                  <text class="btn-icon">👁️</text>
                  <text class="btn-text">详情</text>
                </view>
                <view 
                  v-if="!vehicle.user_id" 
                  class="action-btn green" 
                  @click="handleAssignVehicle(vehicle)"
                >
                  <text class="btn-icon">👤</text>
                  <text class="btn-text">分配</text>
                </view>
                <view 
                  v-if="canReturnVehicle(vehicle)" 
                  class="action-btn orange" 
                  @click="handleReturnVehicle(vehicle.id)"
                >
                  <text class="btn-icon">🚗</text>
                  <text class="btn-text">还车</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="bottom-spacer"></view>
      </view>
    </scroll-view>

    <!-- 分配司机弹窗 -->
    <view v-if="showAssignModal" class="modal-overlay" @click="showAssignModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">分配车辆</text>
          <view class="modal-close" @click="showAssignModal = false">×</view>
        </view>
        <view class="modal-body">
          <text class="modal-label">车牌号：{{ selectedVehicle?.license_plate }}</text>
          <text class="modal-label">选择司机：</text>
          <scroll-view scroll-y class="driver-list">
            <view 
              v-for="driver in availableDrivers" 
              :key="driver.id"
              :class="['driver-item', { selected: selectedDriverId === driver.id }]"
              @click="selectedDriverId = driver.id"
            >
              <text class="driver-name">{{ driver.name || driver.phone }}</text>
              <text v-if="selectedDriverId === driver.id" class="check-icon">✓</text>
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
 * 车队长/调度端 - 车辆管理列表页面
 * 功能：查看本仓库车辆、录入、分配、还车
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAllVehicles, getWarehouseUsers, assignVehicle } from '@/api'
import type { Vehicle, User } from '@/api/types'
import { VehicleStatus } from '@/api/types'
import { useUserStore } from '@/store/user'
import { navigateTo, formatDateTime } from '@/utils'

// ==================== 常量定义 ====================

/** 筛选选项 */
const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '使用中', value: 'active' },
  { label: '待分配', value: 'unassigned' },
  { label: '已还车', value: 'returned' },
  { label: '待审核', value: 'pending' }
]

// ==================== 状态定义 ====================

const userStore = useUserStore()

/** 车辆列表 */
const vehicles = ref<Vehicle[]>([])

/** 司机列表 */
const drivers = ref<User[]>([])

/** 加载状态 */
const loading = ref(false)

/** 当前筛选 */
const currentFilter = ref('all')

/** 分配弹窗 */
const showAssignModal = ref(false)
const selectedVehicle = ref<Vehicle | null>(null)
const selectedDriverId = ref<number | null>(null)

// ==================== 计算属性 ====================

/** 筛选后的车辆列表 */
const filteredVehicles = computed(() => {
  if (currentFilter.value === 'all') return vehicles.value
  
  return vehicles.value.filter(v => {
    switch (currentFilter.value) {
      case 'active':
        // 使用枚举值比较，包括 ACTIVE 和 PICKED_UP 状态
        return (v.status === VehicleStatus.ACTIVE || v.status === VehicleStatus.PICKED_UP) && !v.return_time
      case 'unassigned':
        return !v.user_id
      case 'returned':
        return v.status === VehicleStatus.RETURNED || v.return_time
      case 'pending':
        return v.review_status === 'pending_review'
      default:
        return true
    }
  })
})

/** 可分配的司机列表 */
const availableDrivers = computed(() => {
  return drivers.value.filter(d => d.role === 'driver')
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadVehicles()
  loadDrivers()
})

onShow(() => {
  loadVehicles()
})

// ==================== 数据加载 ====================

/**
 * 加载车辆列表
 */
async function loadVehicles(): Promise<void> {
  loading.value = true
  try {
    // 获取当前用户的仓库ID
    const warehouseId = userStore.user?.warehouse_id
    const params: any = { limit: 100 }
    if (warehouseId) {
      params.warehouse_id = warehouseId
    }
    vehicles.value = await getAllVehicles(params)
  } catch (error) {
    console.error('加载车辆列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 加载司机列表
 */
async function loadDrivers(): Promise<void> {
  try {
    const warehouseId = userStore.user?.warehouse_id
    if (warehouseId) {
      drivers.value = await getWarehouseUsers(warehouseId)
    }
  } catch (error) {
    console.error('加载司机列表失败:', error)
  }
}

// ==================== 工具函数 ====================

/**
 * 获取筛选数量
 */
function getFilterCount(filter: string): number {
  if (filter === 'all') return vehicles.value.length
  
  return vehicles.value.filter(v => {
    switch (filter) {
      case 'active':
        return (v.status === 'active' || v.status === 'picked_up') && !v.return_time
      case 'unassigned':
        return !v.user_id
      case 'returned':
        return v.status === 'returned' || v.return_time
      case 'pending':
        return v.review_status === 'pending_review'
      default:
        return true
    }
  }).length
}

/**
 * 获取状态标签
 */
function getStatusBadge(vehicle: Vehicle): { text: string; colorClass: string } {
  if (vehicle.review_status === 'pending_review') {
    return { text: '待审核', colorClass: 'badge-yellow' }
  }
  if (vehicle.review_status === 'need_supplement') {
    return { text: '需补录', colorClass: 'badge-red' }
  }
  if (vehicle.status === 'returned' || vehicle.return_time) {
    return { text: '已还车', colorClass: 'badge-gray' }
  }
  if (!vehicle.user_id) {
    return { text: '待分配', colorClass: 'badge-orange' }
  }
  return { text: '使用中', colorClass: 'badge-green' }
}

/**
 * 获取司机名称
 */
function getDriverName(userId: number): string {
  const driver = drivers.value.find(d => d.id === userId)
  return driver?.name || driver?.phone || '未知司机'
}

/**
 * 是否可以还车
 */
function canReturnVehicle(vehicle: Vehicle): boolean {
  // 使用枚举值比较，包括 ACTIVE 和 PICKED_UP 状态
  return (vehicle.status === VehicleStatus.ACTIVE || vehicle.status === VehicleStatus.PICKED_UP) && 
         !vehicle.return_time && 
         vehicle.review_status === 'approved'
}

// ==================== 操作处理 ====================

/** 添加车辆 */
function handleAddVehicle(): void {
  navigateTo('/pages/driver/vehicle/add')
}

/** 查看详情 */
function handleViewDetail(vehicleId: number): void {
  navigateTo('/pages/driver/vehicle/detail', { id: vehicleId })
}

/** 还车 */
function handleReturnVehicle(vehicleId: number): void {
  navigateTo('/pages/driver/vehicle/return', { id: vehicleId })
}

/** 打开分配弹窗 */
function handleAssignVehicle(vehicle: Vehicle): void {
  selectedVehicle.value = vehicle
  selectedDriverId.value = null
  showAssignModal.value = true
}

/** 确认分配 */
async function confirmAssign(): Promise<void> {
  if (!selectedVehicle.value || !selectedDriverId.value) {
    uni.showToast({ title: '请选择司机', icon: 'none' })
    return
  }

  uni.showLoading({ title: '分配中...' })
  try {
    // 获取仓库ID，将 null 转换为 undefined
    const warehouseId = userStore.user?.warehouse_id ?? undefined
    await assignVehicle(
      selectedVehicle.value.id,
      selectedDriverId.value,
      warehouseId
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
.page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #EFF6FF, #DBEAFE);
}

.scroll-container {
  height: 100vh;
}

.content {
  padding: 16rpx;
}

/* 页面标题卡片 */
.header-card {
  background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(30, 58, 138, 0.3);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left { flex: 1; }

.header-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.header-icon {
  font-size: 48rpx;
  margin-right: 16rpx;
}

.header-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
}

.header-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  padding: 16rpx;
}

.refresh-icon { font-size: 32rpx; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vehicle-count {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
  padding: 12rpx 24rpx;
  display: flex;
  align-items: baseline;
}

.count-number {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.count-unit {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-left: 4rpx;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  overflow-x: auto;
  padding: 8rpx 0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  white-space: nowrap;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  
  &.active {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    .filter-text, .filter-count { color: #fff; }
  }
}

.filter-text {
  font-size: 26rpx;
  color: #333;
}

.filter-count {
  font-size: 22rpx;
  color: #999;
  background: #f3f4f6;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
}

.filter-item.active .filter-count {
  background: rgba(255, 255, 255, 0.2);
}

/* 操作栏 */
.action-bar {
  margin-bottom: 16rpx;
}

.action-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
  padding: 24rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.3);
}

.btn-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.btn-text {
  font-size: 28rpx;
  font-weight: 500;
}

/* 加载和空状态 */
.loading {
  text-align: center;
  padding: 60rpx;
  color: #666;
}

.empty-state {
  background: #fff;
  border-radius: 24rpx;
  padding: 80rpx 40rpx;
  text-align: center;
}

.empty-icon-wrapper {
  background: #EFF6FF;
  border-radius: 50%;
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
}

.empty-icon { font-size: 64rpx; opacity: 0.5; }
.empty-title { font-size: 32rpx; font-weight: 500; color: #333; display: block; margin-bottom: 12rpx; }
.empty-subtitle { font-size: 26rpx; color: #999; }

/* 车辆列表 */
.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.vehicle-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.vehicle-photo {
  position: relative;
  width: 100%;
  height: 280rpx;
  background: #f3f4f6;
}

.photo-image {
  width: 100%;
  height: 100%;
}

.vehicle-photo-placeholder {
  position: relative;
  width: 100%;
  height: 160rpx;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon { font-size: 64rpx; opacity: 0.3; }

.status-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
}

.status-text { font-size: 22rpx; font-weight: 500; color: #fff; }

.badge-green { background: rgba(34, 197, 94, 0.9); }
.badge-red { background: rgba(239, 68, 68, 0.9); }
.badge-yellow { background: rgba(245, 158, 11, 0.9); }
.badge-orange { background: rgba(249, 115, 22, 0.9); }
.badge-gray { background: rgba(156, 163, 175, 0.9); }

.vehicle-info { padding: 24rpx; }

.info-header { margin-bottom: 16rpx; }

.plate-badge {
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
  border-radius: 12rpx;
  padding: 8rpx 16rpx;
  display: inline-block;
  margin-bottom: 8rpx;
}

.plate-text { font-size: 32rpx; font-weight: bold; color: #fff; }
.brand-model { font-size: 26rpx; color: #666; display: block; }

.driver-info {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
  padding: 12rpx;
  background: #f0fdf4;
  border-radius: 12rpx;
  
  &.unassigned {
    background: #fff7ed;
  }
}

.driver-icon { font-size: 28rpx; margin-right: 8rpx; }
.driver-name { font-size: 26rpx; color: #333; }

.time-info { margin-bottom: 16rpx; }
.time-label { font-size: 24rpx; color: #666; }

.action-buttons {
  display: flex;
  gap: 12rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #f3f4f6;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  border-radius: 12rpx;
  color: #fff;
  
  &.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
  &.green { background: linear-gradient(135deg, #22c55e, #16a34a); }
  &.orange { background: linear-gradient(135deg, #f97316, #ea580c); }
}

.action-btn .btn-icon { font-size: 24rpx; margin-right: 6rpx; }
.action-btn .btn-text { font-size: 24rpx; }

.bottom-spacer { height: 32rpx; }

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 2rpx solid #f3f4f6;
}

.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 40rpx; color: #999; padding: 8rpx; }

.modal-body { padding: 24rpx; }
.modal-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 16rpx; }

.driver-list {
  max-height: 400rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.driver-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  border-bottom: 2rpx solid #f3f4f6;
  
  &:last-child { border-bottom: none; }
  &.selected { background: #eff6ff; }
}

.check-icon { color: #3b82f6; font-size: 28rpx; }

.modal-footer {
  display: flex;
  border-top: 2rpx solid #f3f4f6;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  text-align: center;
  font-size: 28rpx;
  
  &.cancel { color: #666; }
  &.confirm { color: #3b82f6; font-weight: 500; }
}
</style>
