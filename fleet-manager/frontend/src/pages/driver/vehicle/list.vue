<template>
  <!-- 
    车辆列表页面 - 提车/还车管理版
    显示司机名下的所有车辆，支持管理员查看指定司机的车辆
    功能：
    - 提车录入：添加新车辆时自动记录提车时间
    - 还车录入：对已提车的车辆进行还车操作
    - 动态按钮：根据车辆状态显示不同的操作按钮
    - 智能控制：有未还车车辆时隐藏"添加新车辆"按钮
    - 图片缓存：使用 ImageCacheManager 缓存缩略图
    - 图片预加载：使用 ImagePreloader 预加载可视区域图片
    
    @requirements 7.1, 9.2, 12.1, 12.2, 12.3, 12.4, 12.5
  -->
  <view class="page">
    <scroll-view 
      scroll-y 
      class="scroll-container"
      @scroll="handleScroll"
    >
      <view class="content">
        <!-- 页面标题卡片 -->
        <view class="header-card">
          <view class="header-content">
            <view class="header-left">
              <view class="header-title-row">
                <text class="header-icon">🚗</text>
                <text class="header-title">{{ isManagerView ? '司机车辆' : '我的车辆' }}</text>
              </view>
              <text class="header-subtitle">
                {{ isManagerView ? `查看 ${targetDriver?.name || '司机'} 的车辆信息` : '管理您的车辆信息' }}
              </text>
            </view>
            <view class="header-right">
              <!-- 刷新按钮 -->
              <view class="refresh-btn" @click="loadVehicles">
                <text :class="['refresh-icon', { spinning: loading }]">🔄</text>
              </view>
              <!-- 车辆数量 -->
              <view class="vehicle-count">
                <text class="count-number">{{ vehicles.length }}</text>
                <text class="count-unit">辆</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 管理员查看提示 -->
        <view v-if="isManagerView && targetDriver" class="manager-tip">
          <text class="tip-icon">ℹ️</text>
          <view class="tip-content">
            <text class="tip-title">管理员查看模式</text>
            <text class="tip-text">司机姓名：{{ targetDriver.name || '未设置' }}</text>
            <text class="tip-text">联系方式：{{ targetDriver.phone || targetDriver.email }}</text>
          </view>
        </view>

        <!-- 添加车辆按钮 - 只在司机自己的视图且满足条件时显示 -->
        <view v-if="!isManagerView && shouldShowAddButton" class="add-btn-container">
          <view class="add-btn" @click="handleAddVehicle">
            <text class="add-icon">➕</text>
            <text class="add-text">添加新车辆（提车录入）</text>
          </view>
        </view>

        <!-- 加载中 -->
        <view v-if="loading" class="loading">
          <text>⏳ 加载中...</text>
        </view>

        <!-- 空状态 -->
        <view v-else-if="vehicles.length === 0" class="empty-state">
          <view class="empty-icon-wrapper">
            <text class="empty-icon">🚗</text>
          </view>
          <text class="empty-title">暂无车辆信息</text>
          <text class="empty-subtitle">
            {{ isManagerView ? '该司机还未添加车辆' : '点击上方按钮添加您的第一辆车' }}
          </text>
        </view>

        <!-- 车辆列表 -->
        <view v-else class="vehicle-list">
          <view 
            v-for="(vehicle, index) in vehicles" 
            :key="vehicle.id" 
            class="vehicle-card"
            :data-index="index"
            @click="handleViewDetail(vehicle.id)"
          >
            <!-- 车辆照片 - 使用 CachedImage 组件 -->
            <view v-if="vehicle.left_front_photo" class="vehicle-photo">
              <CachedImage
                :src="getCachedImageUrl(vehicle.id, vehicle.left_front_photo)"
                mode="aspectFill"
                width="100%"
                height="100%"
                :use-cache="true"
                :lazy-load="true"
                priority="high"
                @error="onPhotoError(vehicle.id)"
              />
              <!-- 状态标签 -->
              <view class="status-badge" :class="getVehicleStatusBadge(vehicle).colorClass">
                <text class="status-icon">{{ getVehicleStatusBadge(vehicle).icon }}</text>
                <text class="status-text">{{ getVehicleStatusBadge(vehicle).text }}</text>
              </view>
            </view>
            <!-- 无照片时显示占位 -->
            <view v-else class="vehicle-photo-placeholder">
              <view class="placeholder-content">
                <text class="placeholder-icon">📷</text>
                <text class="placeholder-text">无照片</text>
              </view>
              <!-- 状态标签 -->
              <view class="status-badge" :class="getVehicleStatusBadge(vehicle).colorClass">
                <text class="status-icon">{{ getVehicleStatusBadge(vehicle).icon }}</text>
                <text class="status-text">{{ getVehicleStatusBadge(vehicle).text }}</text>
              </view>
            </view>

            <!-- 车辆信息 -->
            <view class="vehicle-info">
              <!-- 车牌号和品牌 -->
              <view class="info-header">
                <view class="plate-row">
                  <view class="plate-badge">
                    <text class="plate-text">{{ vehicle.license_plate }}</text>
                  </view>
                  <!-- 综合状态标签 -->
                  <view class="status-tag" :class="getVehicleStatusBadge(vehicle).colorClass">
                    <text class="tag-icon">{{ getVehicleStatusBadge(vehicle).icon }}</text>
                    <text class="tag-text">{{ getVehicleStatusBadge(vehicle).text }}</text>
                  </view>
                </view>
                <text class="brand-model">{{ vehicle.brand || '-' }} {{ vehicle.model || '' }}</text>
              </view>

              <!-- 车辆详细信息标签 -->
              <view class="info-tags">
                <view v-if="vehicle.color" class="info-tag purple">
                  <text class="tag-icon">🎨</text>
                  <text class="tag-label">{{ vehicle.color }}</text>
                </view>
                <view v-if="vehicle.vehicle_type" class="info-tag blue">
                  <text class="tag-icon">🚛</text>
                  <text class="tag-label">{{ vehicle.vehicle_type }}</text>
                </view>
                <view v-if="vehicle.vin" class="info-tag gray">
                  <text class="tag-icon">📋</text>
                  <text class="tag-label">VIN: {{ vehicle.vin.slice(-6) }}</text>
                </view>
              </view>

              <!-- 提车/还车时间 -->
              <view v-if="vehicle.pickup_time || vehicle.return_time" class="time-info">
                <view v-if="vehicle.pickup_time" class="time-item">
                  <text class="time-icon">🕐</text>
                  <text class="time-label">提车时间：{{ formatDateTime(vehicle.pickup_time) }}</text>
                </view>
                <view v-if="vehicle.return_time" class="time-item">
                  <text class="time-icon">🕑</text>
                  <text class="time-label">还车时间：{{ formatDateTime(vehicle.return_time) }}</text>
                </view>
                <!-- 车损责任提醒 -->
                <view v-if="vehicle.return_time && vehicle.review_status !== 'approved'" class="damage-warning">
                  <text class="warning-icon">⚠️</text>
                  <text class="warning-text">如未联系核实车损，一切车损由司机负责</text>
                </view>
              </view>

              <!-- 操作按钮 -->
              <view class="action-buttons">
                <!-- 需补录状态：显示补录按钮和删除按钮 -->
                <template v-if="vehicle.review_status === 'need_supplement' && !isManagerView">
                  <view class="action-btn red" @click.stop="handleSupplementPhotos(vehicle.id)">
                    <text class="btn-icon">📷</text>
                    <text class="btn-text">补录图片</text>
                  </view>
                  <view class="action-btn gray small" @click.stop="handleDeleteVehicle(vehicle.id, vehicle.license_plate)">
                    <text class="btn-icon">🗑️</text>
                  </view>
                </template>
                <!-- 其他状态 -->
                <template v-else>
                  <view class="action-btn blue" @click.stop="handleViewDetail(vehicle.id)">
                    <text class="btn-icon">👁️</text>
                    <text class="btn-text">查看详情</text>
                  </view>
                  <!-- 还车按钮 - 仅在已提车未还车、审核通过且非管理员视图时显示 -->
                  <view 
                    v-if="canReturnVehicle(vehicle) && !isManagerView"
                    class="action-btn orange" 
                    @click.stop="handleReturnVehicle(vehicle.id, vehicle.license_plate)"
                  >
                    <text class="btn-icon">🚗</text>
                    <text class="btn-text">还车</text>
                  </view>
                  <!-- 删除按钮 - 非管理员视图时显示 -->
                  <view 
                    v-if="!isManagerView"
                    class="action-btn gray small" 
                    @click.stop="handleDeleteVehicle(vehicle.id, vehicle.license_plate)"
                  >
                    <text class="btn-icon">🗑️</text>
                  </view>
                </template>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部间距 -->
        <view class="bottom-spacer"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆列表页面 - 提车/还车管理版
 * 显示司机名下的所有车辆，支持管理员查看指定司机的车辆
 * 功能：
 * - 提车录入：添加新车辆时自动记录提车时间
 * - 还车录入：对已提车的车辆进行还车操作
 * - 动态按钮：根据车辆状态显示不同的操作按钮
 * - 智能控制：有未还车车辆时隐藏"添加新车辆"按钮
 * - 图片缓存：使用 ImageCacheManager 缓存缩略图（Requirements 7.1）
 * - 图片预加载：使用 ImagePreloader 预加载可视区域图片（Requirements 9.2）
 * - 实时更新：通过 SSE 接收车辆状态变化事件（Requirements 2.3）
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { getVehicles, deleteVehicle } from '@/api'
import type { Vehicle } from '@/api/types'
import { VehicleStatus } from '@/api/types'
import { navigateTo, formatDateTime } from '@/utils'
import CachedImage from '@/components/CachedImage/index.vue'
import { useImagePreloader } from '@/utils/imagePreloader/useImagePreloader'
import { getImageCacheManager } from '@/utils/imageCache'
import { sseService } from '@/utils/sse'
import type { VehicleUpdateEvent } from '@/types/sse-events'

/** 车辆列表 */
const vehicles = ref<Vehicle[]>([])

/** 加载状态 */
const loading = ref(false)

/** 目标司机ID（管理员查看模式） */
const targetDriverId = ref<string>('')

/** 目标司机信息 */
const targetDriver = ref<{ name?: string; phone?: string; email?: string } | null>(null)

/** 是否为管理员查看模式 */
const isManagerView = ref(false)

/** 当前滚动位置 */
const scrollTop = ref(0)

/** 可视区域高度（估算值，单位 rpx） */
const VISIBLE_HEIGHT = 1200

/** 每个卡片高度（估算值，单位 rpx） */
const CARD_HEIGHT = 500

/** 预加载缓冲区（向下多预加载几个） */
const PRELOAD_BUFFER = 3

/** 图片缓存管理器实例 */
const cacheManager = getImageCacheManager()

/** 图片预加载器 Hook */
const {
  preloadVisible,
  preloadBackground,
  cancelGroup,
  stats: preloaderStats,
  isLoading: isPreloading
} = useImagePreloader()

/** 已缓存的图片 URL 映射（vehicleId -> cachedUrl） */
const cachedImageUrls = ref<Map<number, string>>(new Map())

/** 是否显示添加按钮 */
const shouldShowAddButton = computed(() => {
  // 如果没有车辆，显示按钮
  if (vehicles.value.length === 0) return true
  // 如果有任何车辆处于"已提车未还车"状态，隐藏按钮
  const hasPickedUpVehicle = vehicles.value.some(
    v => (v.status === VehicleStatus.ACTIVE || v.status === VehicleStatus.PICKED_UP) && 
         v.review_status === 'approved' && 
         !v.return_time
  )
  return !hasPickedUpVehicle
})

/**
 * 计算当前可视区域内的车辆索引范围
 * @returns 可视区域内的起始和结束索引
 */
const visibleRange = computed(() => {
  // 将 scrollTop 从 px 转换为 rpx（假设 1px = 2rpx）
  const scrollTopRpx = scrollTop.value * 2
  
  // 计算可视区域内的第一个卡片索引
  const startIndex = Math.max(0, Math.floor(scrollTopRpx / CARD_HEIGHT) - 1)
  
  // 计算可视区域内的最后一个卡片索引（加上缓冲区）
  const endIndex = Math.min(
    vehicles.value.length - 1,
    Math.ceil((scrollTopRpx + VISIBLE_HEIGHT) / CARD_HEIGHT) + PRELOAD_BUFFER
  )
  
  return { startIndex, endIndex }
})

/**
 * 获取可视区域内的车辆图片 URL 列表
 * @returns 可视区域内的图片 URL 数组
 */
const visibleImageUrls = computed(() => {
  const { startIndex, endIndex } = visibleRange.value
  const urls: string[] = []
  
  for (let i = startIndex; i <= endIndex; i++) {
    const vehicle = vehicles.value[i]
    if (vehicle?.left_front_photo) {
      urls.push(vehicle.left_front_photo)
    }
  }
  
  return urls
})

/**
 * 获取后台预加载的图片 URL 列表（可视区域之外的）
 * @returns 后台预加载的图片 URL 数组
 */
const backgroundImageUrls = computed(() => {
  const { startIndex, endIndex } = visibleRange.value
  const urls: string[] = []
  
  // 预加载可视区域之后的图片
  const backgroundEndIndex = Math.min(vehicles.value.length - 1, endIndex + 5)
  
  for (let i = endIndex + 1; i <= backgroundEndIndex; i++) {
    const vehicle = vehicles.value[i]
    if (vehicle?.left_front_photo) {
      urls.push(vehicle.left_front_photo)
    }
  }
  
  return urls
})

/** 页面加载时获取参数 */
onLoad((options) => {
  if (options?.driverId) {
    targetDriverId.value = options.driverId
    isManagerView.value = true
    // TODO: 加载司机信息
  }
})

onMounted(async () => {
  // 初始化图片缓存管理器
  await cacheManager.initialize()
  // 加载车辆列表
  await loadVehicles()
  // 注册 SSE 车辆更新事件回调
  // Requirements: 2.3 - 车辆列表页集成实时更新
  registerSSECallbacks()
})

/**
 * 页面卸载时取消 SSE 回调注册
 * Requirements: 2.3 - 页面卸载时取消回调注册
 */
onUnmounted(() => {
  unregisterSSECallbacks()
})

/**
 * 注册 SSE 车辆更新事件回调
 * 当收到车辆更新事件时，直接更新本地车辆列表数据
 * Requirements: 2.3 - 车辆列表页集成实时更新
 */
function registerSSECallbacks(): void {
  const currentCallbacks = sseService.getState() ? {} : {}
  sseService.setCallbacks({
    ...currentCallbacks,
    onVehicleUpdate: handleVehicleUpdate,
  })
  console.log('[车辆列表] 已注册 SSE 车辆更新回调')
}

/**
 * 取消 SSE 回调注册
 * 清除车辆更新事件的回调处理器
 */
function unregisterSSECallbacks(): void {
  // 获取当前回调并移除 onVehicleUpdate
  sseService.setCallbacks({
    onVehicleUpdate: undefined,
  })
  console.log('[车辆列表] 已取消 SSE 车辆更新回调')
}

/**
 * 处理车辆更新事件
 * 根据事件动作类型更新本地车辆列表
 * Requirements: 2.3 - 收到事件后直接更新本地车辆列表数据
 * @param event - 车辆更新事件数据
 */
function handleVehicleUpdate(event: VehicleUpdateEvent): void {
  console.log('[车辆列表] 收到车辆更新事件:', event.action, event.vehicle.license_plate)
  
  const { action, vehicle: vehicleData } = event
  
  // 根据事件动作类型处理
  switch (action) {
    case 'create':
      // 新增车辆：添加到列表开头
      handleVehicleCreate(vehicleData)
      break
    case 'update':
      // 更新车辆：更新列表中对应的车辆数据
      handleVehicleUpdateData(vehicleData)
      break
    case 'delete':
      // 删除车辆：从列表中移除
      handleVehicleDelete(vehicleData.id)
      break
    default:
      console.warn('[车辆列表] 未知的事件动作类型:', action)
  }
}

/**
 * 处理车辆创建事件
 * 将新车辆添加到列表开头
 * @param vehicleData - 车辆数据
 */
function handleVehicleCreate(vehicleData: VehicleUpdateEvent['vehicle']): void {
  // 检查是否已存在（避免重复添加）
  const existingIndex = vehicles.value.findIndex(v => v.id === vehicleData.id)
  if (existingIndex >= 0) {
    // 已存在，更新数据
    handleVehicleUpdateData(vehicleData)
    return
  }
  
  // 转换为 Vehicle 类型并添加到列表开头
  const newVehicle: Vehicle = {
    id: vehicleData.id,
    license_plate: vehicleData.license_plate,
    brand: vehicleData.brand,
    model: vehicleData.model,
    color: vehicleData.color,
    status: vehicleData.status as VehicleStatus,
    user_id: vehicleData.user_id,
    warehouse_id: vehicleData.warehouse_id,
    ownership_type: vehicleData.ownership_type,
    created_at: vehicleData.created_at,
    updated_at: vehicleData.updated_at,
  }
  
  vehicles.value.unshift(newVehicle)
  
  // 显示提示
  uni.showToast({
    title: `新车辆 ${vehicleData.license_plate} 已添加`,
    icon: 'none',
    duration: 2000,
  })
}

/**
 * 处理车辆更新事件
 * 更新列表中对应的车辆数据
 * @param vehicleData - 车辆数据
 */
function handleVehicleUpdateData(vehicleData: VehicleUpdateEvent['vehicle']): void {
  const index = vehicles.value.findIndex(v => v.id === vehicleData.id)
  if (index < 0) {
    console.log('[车辆列表] 车辆不在列表中，忽略更新:', vehicleData.id)
    return
  }
  
  // 更新车辆数据（保留原有的其他字段）
  vehicles.value[index] = {
    ...vehicles.value[index],
    license_plate: vehicleData.license_plate,
    brand: vehicleData.brand,
    model: vehicleData.model,
    color: vehicleData.color,
    status: vehicleData.status as VehicleStatus,
    user_id: vehicleData.user_id,
    warehouse_id: vehicleData.warehouse_id,
    ownership_type: vehicleData.ownership_type,
    updated_at: vehicleData.updated_at,
  }
  
  // 显示提示
  uni.showToast({
    title: `车辆 ${vehicleData.license_plate} 已更新`,
    icon: 'none',
    duration: 2000,
  })
}

/**
 * 处理车辆删除事件
 * 从列表中移除对应的车辆
 * @param vehicleId - 车辆ID
 */
function handleVehicleDelete(vehicleId: number): void {
  const index = vehicles.value.findIndex(v => v.id === vehicleId)
  if (index < 0) {
    console.log('[车辆列表] 车辆不在列表中，忽略删除:', vehicleId)
    return
  }
  
  const deletedVehicle = vehicles.value[index]
  vehicles.value.splice(index, 1)
  
  // 显示提示
  uni.showToast({
    title: `车辆 ${deletedVehicle.license_plate} 已删除`,
    icon: 'none',
    duration: 2000,
  })
}

onShow(() => loadVehicles())

/**
 * 监听可视区域变化，触发预加载
 */
watch(visibleImageUrls, (newUrls) => {
  if (newUrls.length > 0) {
    // 取消之前的可视区域预加载任务
    cancelGroup('visible')
    // 预加载当前可视区域的图片（高优先级）
    preloadVisible(newUrls)
  }
}, { immediate: true })

/**
 * 监听后台预加载区域变化
 */
watch(backgroundImageUrls, (newUrls) => {
  if (newUrls.length > 0) {
    // 取消之前的后台预加载任务
    cancelGroup('background')
    // 后台预加载即将显示的图片（低优先级）
    preloadBackground(newUrls)
  }
})

/**
 * 处理滚动事件
 * 更新当前滚动位置，用于计算可视区域
 * @param event - 滚动事件对象
 */
function handleScroll(event: { detail: { scrollTop: number } }): void {
  scrollTop.value = event.detail.scrollTop
}

/** 加载车辆列表 */
async function loadVehicles(): Promise<void> {
  loading.value = true
  try {
    vehicles.value = await getVehicles({ limit: 100 })
    
    // 车辆列表加载完成后，预加载所有车辆的缩略图
    await preloadAllThumbnails()
  } catch (error) {
    console.error('加载车辆列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 预加载所有车辆的缩略图
 * 使用 ImagePreloader 进行批量预加载
 */
async function preloadAllThumbnails(): Promise<void> {
  // 收集所有有照片的车辆的图片 URL
  const allPhotoUrls = vehicles.value
    .filter(v => v.left_front_photo)
    .map(v => v.left_front_photo as string)
  
  if (allPhotoUrls.length === 0) {
    return
  }
  
  // 先预加载可视区域的图片（高优先级）
  const visibleUrls = visibleImageUrls.value
  if (visibleUrls.length > 0) {
    preloadVisible(visibleUrls)
  }
  
  // 后台预加载其他图片（低优先级）
  const otherUrls = allPhotoUrls.filter(url => !visibleUrls.includes(url))
  if (otherUrls.length > 0) {
    preloadBackground(otherUrls)
  }
}

/**
 * 获取缓存的图片 URL
 * 如果图片已缓存，返回缓存的 URL；否则返回原始 URL
 * @param vehicleId - 车辆 ID
 * @param originalUrl - 原始图片 URL
 * @returns 缓存的图片 URL 或原始 URL
 */
function getCachedImageUrl(vehicleId: number, originalUrl: string): string {
  // 直接返回原始 URL，CachedImage 组件会自动处理缓存
  return originalUrl
}

/**
 * 获取车辆综合状态标识
 * 根据review_status和status综合判断显示的状态
 * @param vehicle - 车辆信息对象
 * @returns 状态标识对象，包含文本、颜色类名和图标
 */
function getVehicleStatusBadge(vehicle: Vehicle): { text: string; colorClass: string; icon: string } {
  // 优先判断审核状态
  if (vehicle.review_status === 'need_supplement') {
    return { text: '需补录', colorClass: 'badge-red', icon: '⚠️' }
  }
  if (vehicle.review_status === 'pending_review') {
    return { text: '待审核', colorClass: 'badge-yellow', icon: '⏳' }
  }
  // 审核通过后，根据车辆状态判断
  if (vehicle.review_status === 'approved') {
    // 使用枚举值比较，RETURNED 表示已停用
    if (vehicle.status === VehicleStatus.RETURNED) {
      return { text: '已停用', colorClass: 'badge-gray', icon: '⛔' }
    }
    return { text: '已启用', colorClass: 'badge-green', icon: '✅' }
  }
  // 默认状态（录入中）
  return { text: '录入中', colorClass: 'badge-gray', icon: '📝' }
}

/** 是否可以还车 */
function canReturnVehicle(vehicle: Vehicle): boolean {
  // 使用枚举值比较，包括 ACTIVE 和 PICKED_UP 状态
  return (vehicle.status === VehicleStatus.ACTIVE || vehicle.status === VehicleStatus.PICKED_UP) && 
         !vehicle.return_time && 
         vehicle.review_status === 'approved'
}

/** 照片加载失败处理 */
function onPhotoError(vehicleId: number): void {
  console.error('车辆照片加载失败:', vehicleId)
}

/** 添加车辆 */
function handleAddVehicle(): void {
  navigateTo('/pages/driver/vehicle/add')
}

/** 查看车辆详情 */
function handleViewDetail(vehicleId: number): void {
  navigateTo('/pages/driver/vehicle/detail', { id: vehicleId })
}

/** 还车录入 */
function handleReturnVehicle(vehicleId: number, plateNumber: string): void {
  navigateTo('/pages/driver/vehicle/return', { id: vehicleId, plate: plateNumber })
}

/** 补录图片 */
function handleSupplementPhotos(vehicleId: number): void {
  navigateTo('/pages/driver/vehicle/supplement', { vehicleId })
}

/** 删除车辆 */
async function handleDeleteVehicle(vehicleId: number, plateNumber: string): Promise<void> {
  // 弹出确认对话框
  uni.showModal({
    title: '确认删除',
    content: `确定要删除车牌号为 "${plateNumber}" 的车辆吗？此操作不可恢复！`,
    confirmText: '删除',
    confirmColor: '#EF4444',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' })
        try {
          await deleteVehicle(vehicleId)
          uni.hideLoading()
          uni.showToast({ title: '删除成功', icon: 'success' })
          // 刷新车辆列表
          loadVehicles()
        } catch (error) {
          uni.hideLoading()
          console.error('删除车辆失败:', error)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #EFF6FF, #DBEAFE);
}

.scroll-container {
  height: 100vh;
  box-sizing: border-box;
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

.header-left {
  flex: 1;
}

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

.refresh-icon {
  font-size: 32rpx;
}

.spinning {
  animation: spin 1s linear infinite;
}

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

/* 管理员提示 */
.manager-tip {
  background: #EFF6FF;
  border: 2rpx solid #BFDBFE;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: flex-start;
}

.tip-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1e40af;
  display: block;
  margin-bottom: 8rpx;
}

.tip-text {
  font-size: 22rpx;
  color: #1d4ed8;
  display: block;
  margin-bottom: 4rpx;
}

/* 添加按钮 */
.add-btn-container {
  margin-bottom: 16rpx;
}

.add-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
  padding: 24rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.3);
}

.add-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.add-text {
  font-size: 28rpx;
  font-weight: 500;
}

/* 加载中 */
.loading {
  text-align: center;
  padding: 60rpx;
  color: #666;
}

/* 空状态 */
.empty-state {
  background: #fff;
  border-radius: 24rpx;
  padding: 80rpx 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
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

.empty-icon {
  font-size: 64rpx;
  opacity: 0.5;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.empty-subtitle {
  font-size: 26rpx;
  color: #999;
}

/* 车辆列表 */
.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 车辆卡片 */
.vehicle-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

/* 车辆照片 */
.vehicle-photo {
  position: relative;
  width: 100%;
  height: 320rpx;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  overflow: hidden;
}

.vehicle-photo-placeholder {
  position: relative;
  width: 100%;
  height: 200rpx;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-content {
  text-align: center;
}

.placeholder-icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 8rpx;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 24rpx;
  color: #999;
}

/* 状态标签 */
.status-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  backdrop-filter: blur(8px);
}

.status-icon {
  font-size: 20rpx;
  margin-right: 6rpx;
}

.status-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #fff;
}

.badge-green { background: rgba(34, 197, 94, 0.9); }
.badge-red { background: rgba(239, 68, 68, 0.9); }
.badge-yellow { background: rgba(245, 158, 11, 0.9); }
.badge-gray { background: rgba(156, 163, 175, 0.9); }

/* 车辆信息 */
.vehicle-info {
  padding: 24rpx;
}

.info-header {
  margin-bottom: 16rpx;
}

.plate-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.plate-badge {
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
  border-radius: 12rpx;
  padding: 8rpx 16rpx;
}

.plate-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
}

.status-tag {
  border-radius: 24rpx;
  padding: 6rpx 16rpx;
  display: flex;
  align-items: center;
}

.tag-icon {
  font-size: 18rpx;
  margin-right: 4rpx;
}

.tag-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #fff;
}

.brand-model {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

/* 信息标签 */
.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.info-tag {
  display: flex;
  align-items: center;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  
  &.purple {
    background: linear-gradient(135deg, #faf5ff, #f3e8ff);
    .tag-label { color: #7c3aed; }
  }
  
  &.blue {
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    .tag-label { color: #1d4ed8; }
  }
  
  &.gray {
    background: linear-gradient(135deg, #f9fafb, #f3f4f6);
    .tag-label { color: #4b5563; }
  }
}

.tag-icon {
  font-size: 24rpx;
  margin-right: 6rpx;
}

.tag-label {
  font-size: 22rpx;
  font-weight: 500;
}

/* 时间信息 */
.time-info {
  margin-bottom: 16rpx;
}

.time-item {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.time-icon {
  font-size: 24rpx;
  margin-right: 8rpx;
}

.time-label {
  font-size: 22rpx;
  color: #666;
}

.damage-warning {
  display: flex;
  align-items: center;
  background: #FFF7ED;
  border-radius: 8rpx;
  padding: 8rpx 12rpx;
  margin-top: 8rpx;
}

.warning-icon {
  font-size: 22rpx;
  margin-right: 6rpx;
}

.warning-text {
  font-size: 22rpx;
  color: #c2410c;
}

/* 操作按钮 */
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
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  
  &.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
  &.red { background: linear-gradient(135deg, #ef4444, #dc2626); }
  &.orange { background: linear-gradient(135deg, #f97316, #ea580c); }
  &.gray { background: linear-gradient(135deg, #6b7280, #4b5563); }
  
  &.small {
    flex: none;
    padding: 16rpx 20rpx;
  }
}

.btn-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.btn-text {
  font-size: 26rpx;
  font-weight: 500;
}

.action-btn.small .btn-icon {
  margin-right: 0;
}

/* 底部间距 */
.bottom-spacer {
  height: 32rpx;
}
</style>
