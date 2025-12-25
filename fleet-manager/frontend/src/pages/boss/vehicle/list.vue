<template>
  <!--
    老板端 - 车辆管理列表页面
    功能：
    - 查看所有仓库的车辆
    - 按仓库筛选
    - 录入新车辆
    - 分配车辆给司机
    - 还车录入
    @requirements 12.1, 12.2, 12.3, 12.4
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
              <text class="header-subtitle">管理所有仓库的车辆</text>
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

        <!-- 仓库筛选 -->
        <view class="warehouse-filter">
          <text class="filter-label">仓库：</text>
          <picker 
            mode="selector" 
            :range="warehouseOptions" 
            range-key="name"
            @change="onWarehouseChange"
          >
            <view class="picker-value">
              <text>{{ currentWarehouseName }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <!-- 状态筛选栏 -->
        <view class="filter-bar">
          <view 
            v-for="filter in filterOptions" 
            :key="filter.value"
            :class="['filter-item', { active: currentFilter === filter.value }]"
            @click="currentFilter = filter.value"
          >
            <text class="filter-text">{{ filter.label }}</text>
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
            <!-- 车辆照片和状态 -->
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

              <!-- 仓库信息 -->
              <view v-if="vehicle.warehouse_id" class="warehouse-info">
                <text class="warehouse-icon">🏭</text>
                <text class="warehouse-name">{{ getWarehouseName(vehicle.warehouse_id) }}</text>
              </view>

              <!-- 司机信息 -->
              <view v-if="vehicle.user_id" class="driver-info">
                <text class="driver-icon">👤</text>
                <text class="driver-name">{{ vehicle.user_name || '已分配' }}</text>
              </view>
              <view v-else class="driver-info unassigned">
                <text class="driver-icon">⚠️</text>
                <text class="driver-name">未分配司机</text>
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
 * 老板端 - 车辆管理列表页面
 * 功能：查看所有仓库车辆、按仓库筛选、录入、分配、还车
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAllVehicles, getWarehouses, getWarehouseUsers, assignVehicle } from '@/api'
import type { Vehicle, User, Warehouse } from '@/api/types'
import { navigateTo } from '@/utils'

// ==================== 常量定义 ====================

/** 状态筛选选项 */
const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '使用中', value: 'active' },
  { label: '待分配', value: 'unassigned' },
  { label: '已还车', value: 'returned' }
]

// ==================== 状态定义 ====================

/** 车辆列表 */
const vehicles = ref<Vehicle[]>([])

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 加载状态 */
const loading = ref(false)

/** 当前仓库筛选 */
const currentWarehouseId = ref<number | null>(null)

/** 当前状态筛选 */
const currentFilter = ref('all')

/** 分配弹窗相关 */
const showAssignModal = ref(false)
const selectedVehicle = ref<Vehicle | null>(null)
const selectedDriverId = ref<number | null>(null)
const assignWarehouseId = ref<number | null>(null)
const assignableDrivers = ref<User[]>([])

// ==================== 计算属性 ====================

/** 仓库选项（包含"全部"） */
const warehouseOptions = computed(() => {
  return [{ id: null, name: '全部仓库' }, ...warehouses.value]
})

/** 当前仓库名称 */
const currentWarehouseName = computed(() => {
  if (!currentWarehouseId.value) return '全部仓库'
  const w = warehouses.value.find(w => w.id === currentWarehouseId.value)
  return w?.name || '全部仓库'
})

/** 分配弹窗中选择的仓库名称 */
const assignWarehouseName = computed(() => {
  if (!assignWarehouseId.value) return ''
  const w = warehouses.value.find(w => w.id === assignWarehouseId.value)
  return w?.name || ''
})

/** 筛选后的车辆列表 */
const filteredVehicles = computed(() => {
  let result = vehicles.value

  // 按仓库筛选
  if (currentWarehouseId.value) {
    result = result.filter(v => v.warehouse_id === currentWarehouseId.value)
  }

  // 按状态筛选
  if (currentFilter.value !== 'all') {
    result = result.filter(v => {
      switch (currentFilter.value) {
        case 'active':
          return (v.status === 'active' || v.status === 'picked_up') && !v.return_time
        case 'unassigned':
          return !v.user_id
        case 'returned':
          return v.status === 'returned' || v.return_time
        default:
          return true
      }
    })
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
    const params: Record<string, unknown> = { limit: 200 }
    if (currentWarehouseId.value) {
      params.warehouse_id = currentWarehouseId.value
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
 * 仓库筛选变化
 */
function onWarehouseChange(e: { detail: { value: number } }): void {
  const index = e.detail.value
  const selected = warehouseOptions.value[index]
  currentWarehouseId.value = selected?.id || null
  loadVehicles()
}

/**
 * 分配弹窗中仓库变化
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
 * 获取仓库名称
 */
function getWarehouseName(warehouseId: number): string {
  const w = warehouses.value.find(w => w.id === warehouseId)
  return w?.name || '未知仓库'
}

/**
 * 是否可以还车
 */
function canReturnVehicle(vehicle: Vehicle): boolean {
  return (vehicle.status === 'active' || vehicle.status === 'picked_up') && 
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
  assignWarehouseId.value = vehicle.warehouse_id || null
  assignableDrivers.value = []
  
  // 如果车辆已有仓库，加载该仓库的司机
  if (vehicle.warehouse_id) {
    loadWarehouseDrivers(vehicle.warehouse_id)
  }
  
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
.page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #fef3c7, #fde68a);
}

.scroll-container { height: 100vh; }
.content { padding: 16rpx; }

/* 页面标题卡片 */
.header-card {
  background: linear-gradient(135deg, #d97706, #b45309);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(217, 119, 6, 0.3);
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

.header-icon { font-size: 48rpx; margin-right: 16rpx; }
.header-title { font-size: 40rpx; font-weight: bold; color: #fff; }
.header-subtitle { font-size: 24rpx; color: rgba(255, 255, 255, 0.8); }

.header-right { display: flex; align-items: center; gap: 16rpx; }

.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  padding: 16rpx;
}

.refresh-icon { font-size: 32rpx; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.vehicle-count {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
  padding: 12rpx 24rpx;
  display: flex;
  align-items: baseline;
}

.count-number { font-size: 36rpx; font-weight: bold; color: #fff; }
.count-unit { font-size: 20rpx; color: rgba(255, 255, 255, 0.8); margin-left: 4rpx; }

/* 仓库筛选 */
.warehouse-filter {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.filter-label { font-size: 26rpx; color: #666; margin-right: 16rpx; }

.picker-value {
  display: flex;
  align-items: center;
  padding: 8rpx 16rpx;
  background: #f3f4f6;
  border-radius: 8rpx;
}

.picker-arrow { font-size: 20rpx; color: #999; margin-left: 8rpx; }

/* 状态筛选栏 */
.filter-bar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  overflow-x: auto;
}

.filter-item {
  padding: 12rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  white-space: nowrap;
  
  &.active {
    background: linear-gradient(135deg, #d97706, #b45309);
    .filter-text { color: #fff; }
  }
}

.filter-text { font-size: 26rpx; color: #333; }

/* 操作栏 */
.action-bar { margin-bottom: 16rpx; }

.action-btn.primary {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  padding: 24rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(217, 119, 6, 0.3);
}

.btn-icon { font-size: 32rpx; margin-right: 12rpx; }
.btn-text { font-size: 28rpx; font-weight: 500; }

/* 加载和空状态 */
.loading { text-align: center; padding: 60rpx; color: #666; }

.empty-state {
  background: #fff;
  border-radius: 24rpx;
  padding: 80rpx 40rpx;
  text-align: center;
}

.empty-icon-wrapper {
  background: #fef3c7;
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
.vehicle-list { display: flex; flex-direction: column; gap: 20rpx; }

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

.photo-image { width: 100%; height: 100%; }

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
  background: linear-gradient(135deg, #d97706, #b45309);
  border-radius: 12rpx;
  padding: 8rpx 16rpx;
  display: inline-block;
  margin-bottom: 8rpx;
}

.plate-text { font-size: 32rpx; font-weight: bold; color: #fff; }
.brand-model { font-size: 26rpx; color: #666; display: block; }

.warehouse-info, .driver-info {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
  padding: 12rpx;
  background: #fef3c7;
  border-radius: 12rpx;
}

.driver-info {
  background: #f0fdf4;
  &.unassigned { background: #fff7ed; }
}

.warehouse-icon, .driver-icon { font-size: 28rpx; margin-right: 8rpx; }
.warehouse-name, .driver-name { font-size: 26rpx; color: #333; }

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
  border-bottom: 2rpx solid #f3f4f6;
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
  &.selected { background: #fef3c7; }
}

.check-icon { color: #d97706; font-size: 28rpx; }

.empty-drivers {
  padding: 40rpx;
  text-align: center;
  color: #999;
  font-size: 26rpx;
}

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
  &.confirm { color: #d97706; font-weight: 500; }
}
</style>
