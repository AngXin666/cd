<template>
  <!-- 
    车辆详情页面
    显示车辆基本信息、证件信息，支持编辑和补充照片
    集成图片缓存和预加载功能，实现图片秒开体验
    @requirements 7.1, 9.1, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
  -->
  <view class="detail-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 车辆不存在 -->
    <view v-else-if="!vehicle" class="empty-container">
      <text class="empty-icon">🚗</text>
      <text class="empty-text">车辆不存在</text>
    </view>

    <!-- 车辆详情 -->
    <view v-else class="detail-content">
      <!-- 图片预加载进度提示（仅在加载中显示） -->
      <view v-if="isPreloading && preloadProgress < 100" class="preload-progress">
        <text class="preload-text">图片加载中 {{ preloadProgress }}%</text>
        <view class="preload-bar">
          <view class="preload-bar-inner" :style="{ width: `${preloadProgress}%` }" />
        </view>
      </view>
      <!-- 车辆头部卡片 - 蓝色渐变背景 -->
      <view class="header-card">
        <view class="header-top">
          <view class="plate-badge">
            <text class="plate-text">{{ vehicle.license_plate }}</text>
          </view>
          <view :class="['status-badge', getStatusClass(vehicle.status)]">
            <text class="status-text">{{ getVehicleStatusText(vehicle.status) }}</text>
          </view>
        </view>
        <view class="header-info">
          <text class="brand-model">{{ vehicle.brand || '未知品牌' }} {{ vehicle.model || '' }}</text>
          <text v-if="vehicle.color" class="color-info">颜色：{{ vehicle.color }}</text>
        </view>
      </view>

      <!-- 基本信息卡片 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-icon">ℹ️</text>
          <text class="card-title">基本信息</text>
        </view>
        <view class="info-list">
          <view class="info-row">
            <text class="info-label">🚗 车牌号</text>
            <text class="info-value">{{ vehicle.license_plate }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">🏷️ 车辆类型</text>
            <text class="info-value">{{ getOwnershipTypeText(vehicle.ownership_type) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">🏭 品牌</text>
            <text class="info-value">{{ vehicle.brand || '未填写' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">📋 型号</text>
            <text class="info-value">{{ vehicle.model || '未填写' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">🎨 颜色</text>
            <text class="info-value">{{ vehicle.color || '未填写' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">📅 添加时间</text>
            <text class="info-value">{{ formatDateTime(vehicle.created_at) }}</text>
          </view>
        </view>
      </view>

      <!-- 证件信息卡片 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-icon">📄</text>
          <text class="card-title">证件信息</text>
        </view>
        <view class="document-list">
          <!-- 行驶证 -->
          <view class="document-item">
            <view class="doc-info">
              <text class="doc-icon">📋</text>
              <view class="doc-detail">
                <text class="doc-name">行驶证</text>
                <text class="doc-date">
                  到期日期：{{ documents.registration?.expiry_date || '未设置' }}
                </text>
              </view>
            </view>
            <view :class="['doc-status', getDocumentStatusClass(documents.registration?.expiry_date)]">
              <text class="doc-status-text">{{ getDocumentStatusText(documents.registration?.expiry_date) }}</text>
            </view>
          </view>
          <!-- 保险 -->
          <view class="document-item">
            <view class="doc-info">
              <text class="doc-icon">🛡️</text>
              <view class="doc-detail">
                <text class="doc-name">保险</text>
                <text class="doc-date">
                  到期日期：{{ documents.insurance?.expiry_date || '未设置' }}
                </text>
              </view>
            </view>
            <view :class="['doc-status', getDocumentStatusClass(documents.insurance?.expiry_date)]">
              <text class="doc-status-text">{{ getDocumentStatusText(documents.insurance?.expiry_date) }}</text>
            </view>
          </view>
          <!-- 驾驶证 -->
          <view class="document-item">
            <view class="doc-info">
              <text class="doc-icon">🪪</text>
              <view class="doc-detail">
                <text class="doc-name">驾驶证</text>
                <text class="doc-date">
                  到期日期：{{ documents.license?.expiry_date || '未设置' }}
                </text>
              </view>
            </view>
            <view :class="['doc-status', getDocumentStatusClass(documents.license?.expiry_date)]">
              <text class="doc-status-text">{{ getDocumentStatusText(documents.license?.expiry_date) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 租赁信息入口 -->
      <view class="entry-card" @click="goToLease">
        <view class="entry-left">
          <text class="entry-icon">📋</text>
          <text class="entry-title">租赁信息</text>
        </view>
        <text class="entry-arrow">›</text>
      </view>

      <!-- 行驶证照片卡片 Requirements: 12.2 -->
      <view v-if="hasRegistrationPhotos" class="info-card">
        <view class="card-header">
          <text class="card-icon">📋</text>
          <text class="card-title">行驶证照片</text>
        </view>
        <view class="photo-grid">
          <!-- 行驶证主页 -->
          <view v-if="vehicle.driving_license_main_photo" class="photo-item" @click="previewPhoto(vehicle.driving_license_main_photo, registrationPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.driving_license_main_photo)" mode="aspectFill" />
            <text class="photo-label">主页</text>
          </view>
          <!-- 行驶证副页 -->
          <view v-if="vehicle.driving_license_sub_photo" class="photo-item" @click="previewPhoto(vehicle.driving_license_sub_photo, registrationPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.driving_license_sub_photo)" mode="aspectFill" />
            <text class="photo-label">副页</text>
          </view>
          <!-- 行驶证副页背页 -->
          <view v-if="vehicle.driving_license_sub_back_photo" class="photo-item" @click="previewPhoto(vehicle.driving_license_sub_back_photo, registrationPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.driving_license_sub_back_photo)" mode="aspectFill" />
            <text class="photo-label">背页</text>
          </view>
        </view>
      </view>

      <!-- 提车照片卡片 Requirements: 12.2 -->
      <view v-if="hasPickupPhotos" class="info-card">
        <view class="card-header">
          <text class="card-icon">📷</text>
          <text class="card-title">提车照片</text>
          <text v-if="vehicle.pickup_time" class="card-subtitle">{{ formatDateTime(vehicle.pickup_time) }}</text>
        </view>
        <view class="photo-grid">
          <!-- 左前45° -->
          <view v-if="vehicle.left_front_photo" class="photo-item" @click="previewPhoto(vehicle.left_front_photo, pickupPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.left_front_photo)" mode="aspectFill" />
            <text class="photo-label">左前45°</text>
          </view>
          <!-- 右前45° -->
          <view v-if="vehicle.right_front_photo" class="photo-item" @click="previewPhoto(vehicle.right_front_photo, pickupPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.right_front_photo)" mode="aspectFill" />
            <text class="photo-label">右前45°</text>
          </view>
          <!-- 左后45° -->
          <view v-if="vehicle.left_rear_photo" class="photo-item" @click="previewPhoto(vehicle.left_rear_photo, pickupPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.left_rear_photo)" mode="aspectFill" />
            <text class="photo-label">左后45°</text>
          </view>
          <!-- 右后45° -->
          <view v-if="vehicle.right_rear_photo" class="photo-item" @click="previewPhoto(vehicle.right_rear_photo, pickupPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.right_rear_photo)" mode="aspectFill" />
            <text class="photo-label">右后45°</text>
          </view>
          <!-- 仪表盘 -->
          <view v-if="vehicle.dashboard_photo" class="photo-item" @click="previewPhoto(vehicle.dashboard_photo, pickupPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.dashboard_photo)" mode="aspectFill" />
            <text class="photo-label">仪表盘</text>
          </view>
          <!-- 后门 -->
          <view v-if="vehicle.rear_door_photo" class="photo-item" @click="previewPhoto(vehicle.rear_door_photo, pickupPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.rear_door_photo)" mode="aspectFill" />
            <text class="photo-label">后门</text>
          </view>
          <!-- 货箱 -->
          <view v-if="vehicle.cargo_box_photo" class="photo-item" @click="previewPhoto(vehicle.cargo_box_photo, pickupPhotoUrls)">
            <image class="photo-image" :src="getFullImageUrl(vehicle.cargo_box_photo)" mode="aspectFill" />
            <text class="photo-label">货箱</text>
          </view>
        </view>
      </view>

      <!-- 车损照片卡片 Requirements: 12.2 -->
      <view v-if="hasDamagePhotos" class="info-card damage-card">
        <view class="card-header">
          <text class="card-icon">⚠️</text>
          <text class="card-title">车损照片</text>
          <text class="card-badge">{{ vehicle.damage_photos?.length || 0 }}张</text>
        </view>
        <view class="photo-grid">
          <view 
            v-for="(photo, index) in vehicle.damage_photos" 
            :key="index" 
            class="photo-item"
            @click="previewPhoto(photo, damagePhotoUrls)"
          >
            <image class="photo-image" :src="getFullImageUrl(photo)" mode="aspectFill" />
            <text class="photo-label">车损{{ index + 1 }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮区域 -->
      <view class="action-section">
        <!-- 编辑车辆按钮 -->
        <view class="action-btn edit-btn" @click="goToEdit">
          <text class="btn-icon">✏️</text>
          <text class="btn-text">编辑车辆</text>
        </view>
        <!-- 补充照片按钮 -->
        <view class="action-btn photo-btn" @click="goToSupplementPhotos">
          <text class="btn-icon">📷</text>
          <text class="btn-text">补充照片</text>
          <view v-if="supplementedCount > 0" class="badge">
            <text class="badge-text">{{ supplementedCount }}</text>
          </view>
        </view>
      </view>

      <!-- 状态说明 -->
      <view class="tips-card">
        <text class="tips-title">📌 证件状态说明</text>
        <view class="tips-list">
          <view class="tips-item">
            <view class="tips-dot normal"></view>
            <text class="tips-text">正常：证件有效期超过30天</text>
          </view>
          <view class="tips-item">
            <view class="tips-dot warning"></view>
            <text class="tips-text">即将到期：证件有效期在30天内</text>
          </view>
          <view class="tips-item">
            <view class="tips-dot expired"></view>
            <text class="tips-text">已过期：证件已过有效期</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆详情页面
 * 显示车辆基本信息、证件信息，支持编辑和补充照片
 * 集成图片缓存和预加载功能，实现图片秒开体验
 * @requirements 7.1, 9.1, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getVehicle, getSupplementedPhotos } from '@/api'
import type { Vehicle, VehicleDocument, SupplementedPhotosResponse } from '@/api/types'
import { getVehicleStatusText, formatDateTime, navigateBack, getFullImageUrl, previewPhoto } from '@/utils'
import { getImageCacheManager } from '@/utils/imageCache'
import { usePagePreloader } from '@/utils/imagePreloader'
import { PreloadPriority } from '@/utils/imagePreloader/types'

// ==================== 类型定义 ====================

/** 证件信息映射 */
interface DocumentMap {
  registration?: { expiry_date: string | null }
  insurance?: { expiry_date: string | null }
  license?: { expiry_date: string | null }
}

// ==================== 状态 ====================

/** 车辆ID */
const vehicleId = ref(0)

/** 车辆信息 */
const vehicle = ref<Vehicle | null>(null)

/** 加载状态 */
const loading = ref(false)

/** 证件信息 */
const documents = ref<DocumentMap>({})

/** 补录照片数量 */
const supplementedCount = ref(0)

/** 图片缓存管理器实例 */
const cacheManager = getImageCacheManager()

/** 是否正在预加载图片 */
const isPreloading = ref(false)

/** 预加载进度 */
const preloadProgress = ref(0)

/** 预加载任务ID列表 */
const preloadTaskIds = ref<string[]>([])

// ==================== 计算属性 ====================

/**
 * 获取车辆所有照片URL列表
 * 用于预加载和缓存
 * @returns 照片URL数组
 */
const vehiclePhotoUrls = computed((): string[] => {
  if (!vehicle.value) return []
  
  const urls: string[] = []
  const v = vehicle.value
  
  // 7个角度的车辆照片
  if (v.left_front_photo) urls.push(v.left_front_photo)
  if (v.right_front_photo) urls.push(v.right_front_photo)
  if (v.left_rear_photo) urls.push(v.left_rear_photo)
  if (v.right_rear_photo) urls.push(v.right_rear_photo)
  if (v.dashboard_photo) urls.push(v.dashboard_photo)
  if (v.rear_door_photo) urls.push(v.rear_door_photo)
  if (v.cargo_box_photo) urls.push(v.cargo_box_photo)
  
  // 行驶证照片
  if (v.driving_license_main_photo) urls.push(v.driving_license_main_photo)
  if (v.driving_license_sub_photo) urls.push(v.driving_license_sub_photo)
  if (v.driving_license_sub_back_photo) urls.push(v.driving_license_sub_back_photo)
  
  // 提车照片数组
  if (v.pickup_photos && Array.isArray(v.pickup_photos)) {
    urls.push(...v.pickup_photos.filter(Boolean))
  }
  
  // 还车照片数组
  if (v.return_photos && Array.isArray(v.return_photos)) {
    urls.push(...v.return_photos.filter(Boolean))
  }
  
  // 行驶证照片数组
  if (v.registration_photos && Array.isArray(v.registration_photos)) {
    urls.push(...v.registration_photos.filter(Boolean))
  }
  
  // 车损照片数组
  if (v.damage_photos && Array.isArray(v.damage_photos)) {
    urls.push(...v.damage_photos.filter(Boolean))
  }
  
  return urls
})

/**
 * 判断是否有行驶证照片
 * Requirements: 12.2 - 显示行驶证照片
 * @returns 是否有行驶证照片
 */
const hasRegistrationPhotos = computed((): boolean => {
  if (!vehicle.value) return false
  const v = vehicle.value
  return !!(
    v.driving_license_main_photo ||
    v.driving_license_sub_photo ||
    v.driving_license_sub_back_photo
  )
})

/**
 * 获取行驶证照片URL列表
 * 用于图片预览时的图片列表
 * @returns 行驶证照片URL数组
 */
const registrationPhotoUrls = computed((): string[] => {
  if (!vehicle.value) return []
  const v = vehicle.value
  const urls: string[] = []
  if (v.driving_license_main_photo) urls.push(getFullImageUrl(v.driving_license_main_photo))
  if (v.driving_license_sub_photo) urls.push(getFullImageUrl(v.driving_license_sub_photo))
  if (v.driving_license_sub_back_photo) urls.push(getFullImageUrl(v.driving_license_sub_back_photo))
  return urls
})

/**
 * 判断是否有提车照片
 * Requirements: 12.2 - 显示提车照片（7张车辆照片）
 * @returns 是否有提车照片
 */
const hasPickupPhotos = computed((): boolean => {
  if (!vehicle.value) return false
  const v = vehicle.value
  return !!(
    v.left_front_photo ||
    v.right_front_photo ||
    v.left_rear_photo ||
    v.right_rear_photo ||
    v.dashboard_photo ||
    v.rear_door_photo ||
    v.cargo_box_photo
  )
})

/**
 * 获取提车照片URL列表
 * 用于图片预览时的图片列表
 * @returns 提车照片URL数组
 */
const pickupPhotoUrls = computed((): string[] => {
  if (!vehicle.value) return []
  const v = vehicle.value
  const urls: string[] = []
  if (v.left_front_photo) urls.push(getFullImageUrl(v.left_front_photo))
  if (v.right_front_photo) urls.push(getFullImageUrl(v.right_front_photo))
  if (v.left_rear_photo) urls.push(getFullImageUrl(v.left_rear_photo))
  if (v.right_rear_photo) urls.push(getFullImageUrl(v.right_rear_photo))
  if (v.dashboard_photo) urls.push(getFullImageUrl(v.dashboard_photo))
  if (v.rear_door_photo) urls.push(getFullImageUrl(v.rear_door_photo))
  if (v.cargo_box_photo) urls.push(getFullImageUrl(v.cargo_box_photo))
  return urls
})

/**
 * 判断是否有车损照片
 * Requirements: 12.2 - 显示车损照片（如有）
 * @returns 是否有车损照片
 */
const hasDamagePhotos = computed((): boolean => {
  if (!vehicle.value) return false
  return !!(vehicle.value.damage_photos && vehicle.value.damage_photos.length > 0)
})

/**
 * 获取车损照片URL列表
 * 用于图片预览时的图片列表
 * @returns 车损照片URL数组
 */
const damagePhotoUrls = computed((): string[] => {
  if (!vehicle.value || !vehicle.value.damage_photos) return []
  return vehicle.value.damage_photos.map(url => getFullImageUrl(url))
})

// ==================== 生命周期 ====================

onLoad((options) => {
  if (options?.id) {
    vehicleId.value = Number(options.id)
    loadVehicle()
    loadSupplementedPhotos()
  }
})

onUnmounted(() => {
  // 组件卸载时清理预加载任务
  // 注意：预加载器会自动处理任务取消
})

// ==================== 方法 ====================

/**
 * 加载车辆信息
 * 加载完成后自动触发图片预加载
 * @requirements 7.1, 9.1
 */
async function loadVehicle(): Promise<void> {
  loading.value = true
  
  try {
    const data = await getVehicle(vehicleId.value)
    vehicle.value = data
    
    // 模拟证件信息（实际项目中应从后端获取）
    // 当前后端没有获取证件列表的 API，使用模拟数据
    documents.value = {
      registration: { expiry_date: null },
      insurance: { expiry_date: null },
      license: { expiry_date: null },
    }
    
    // 车辆数据加载完成后，开始预加载图片
    // @requirements 9.1 - 进入车辆详情页预加载所有照片
    await preloadVehiclePhotos()
  } catch (error) {
    console.error('加载车辆信息失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 预加载车辆所有照片
 * 使用高优先级预加载，确保用户查看时图片已缓存
 * @requirements 7.1, 9.1
 */
async function preloadVehiclePhotos(): Promise<void> {
  const urls = vehiclePhotoUrls.value
  
  if (urls.length === 0) {
    preloadProgress.value = 100
    return
  }
  
  isPreloading.value = true
  preloadProgress.value = 0
  
  try {
    // 初始化缓存管理器
    await cacheManager.initialize()
    
    // 统计需要预加载的图片数量
    let completedCount = 0
    const totalCount = urls.length
    
    // 逐个检查并预加载图片
    for (const url of urls) {
      try {
        // 检查缓存是否存在
        const hasCache = await cacheManager.hasCache(url)
        
        if (!hasCache) {
          // 缓存不存在，从网络获取并缓存
          // getImage 方法会自动下载并缓存图片
          await cacheManager.getImage(url)
        }
        
        completedCount++
        // 更新进度
        preloadProgress.value = Math.round((completedCount / totalCount) * 100)
      } catch (error) {
        // 单张图片加载失败不影响其他图片
        console.warn(`预加载图片失败: ${url}`, error)
        completedCount++
        preloadProgress.value = Math.round((completedCount / totalCount) * 100)
      }
    }
    
    console.log(`[VehicleDetail] 预加载完成: ${completedCount}/${totalCount} 张图片`)
  } catch (error) {
    console.error('预加载图片失败:', error)
  } finally {
    isPreloading.value = false
    preloadProgress.value = 100
  }
}

/**
 * 加载补录照片数量
 */
async function loadSupplementedPhotos(): Promise<void> {
  try {
    const data = await getSupplementedPhotos(vehicleId.value)
    supplementedCount.value = Object.keys(data.supplemented_photos || {}).length
  } catch (error) {
    console.error('加载补录照片信息失败:', error)
  }
}

/**
 * 获取车辆状态样式类
 * @param status - 车辆状态
 * @returns 样式类名
 */
function getStatusClass(status: string): string {
  const classMap: Record<string, string> = {
    active: 'status-active',
    returned: 'status-returned',
    reviewing: 'status-reviewing',
  }
  return classMap[status] || 'status-default'
}

/**
 * 获取所有权类型文本
 * @param type - 所有权类型
 * @returns 类型文本
 */
function getOwnershipTypeText(type: string | null): string {
  if (!type) return '未设置'
  const typeMap: Record<string, string> = {
    company: '公司车辆',
    personal: '个人车辆',
    leased: '租赁车辆',
  }
  return typeMap[type] || type
}

/**
 * 获取证件状态样式类
 * 根据到期日期判断证件状态
 * @param expiryDate - 到期日期
 * @returns 样式类名
 * @requirements 13.3, 13.4
 */
function getDocumentStatusClass(expiryDate: string | null | undefined): string {
  if (!expiryDate) return 'status-unknown'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  
  // 计算距离到期的天数
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    // 已过期
    return 'status-expired'
  } else if (diffDays <= 30) {
    // 即将到期（30天内）
    return 'status-warning'
  } else {
    // 正常
    return 'status-normal'
  }
}

/**
 * 获取证件状态文本
 * 根据到期日期判断证件状态
 * @param expiryDate - 到期日期
 * @returns 状态文本
 * @requirements 13.3, 13.4
 */
function getDocumentStatusText(expiryDate: string | null | undefined): string {
  if (!expiryDate) return '未设置'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  
  // 计算距离到期的天数
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return '已过期'
  } else if (diffDays <= 30) {
    return '即将到期'
  } else {
    return '正常'
  }
}

/**
 * 跳转到租赁信息页面
 */
function goToLease(): void {
  uni.navigateTo({
    url: `/pages/driver/vehicle/lease?id=${vehicleId.value}`,
  })
}

/**
 * 跳转到编辑车辆页面
 * @requirements 13.5
 */
function goToEdit(): void {
  uni.navigateTo({
    url: `/pages/driver/vehicle/add?id=${vehicleId.value}`,
  })
}

/**
 * 跳转到补充照片页面
 * @requirements 13.6
 */
function goToSupplementPhotos(): void {
  uni.navigateTo({
    url: `/pages/driver/vehicle/supplement-photos?id=${vehicleId.value}`,
  })
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.detail-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #eff6ff, #dbeafe);
  padding: 24rpx;
}

/* 预加载进度提示 */
.preload-progress {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.preload-text {
  font-size: 24rpx;
  color: #666666;
  display: block;
  margin-bottom: 8rpx;
}

.preload-bar {
  height: 6rpx;
  background-color: #e0e0e0;
  border-radius: 3rpx;
  overflow: hidden;
}

.preload-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 3rpx;
  transition: width 0.3s ease;
}

/* 加载和空状态 */
.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
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
}

/* 头部卡片 - 蓝色渐变 */
.header-card {
  background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.3);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.plate-badge {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 12rpx 24rpx;
}

.plate-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #1e3a8a;
}

.status-badge {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.status-active {
  background-color: rgba(34, 197, 94, 0.2);
  .status-text { color: #22c55e; }
}

.status-returned {
  background-color: rgba(156, 163, 175, 0.2);
  .status-text { color: #9ca3af; }
}

.status-reviewing {
  background-color: rgba(251, 191, 36, 0.2);
  .status-text { color: #fbbf24; }
}

.status-text {
  font-size: 24rpx;
  font-weight: 500;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.brand-model {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}

.color-info {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 信息卡片 */
.info-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.card-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.info-list {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 26rpx;
  color: #666666;
}

.info-value {
  font-size: 26rpx;
  color: #333333;
  font-weight: 500;
}

/* 证件列表 */
.document-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.document-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background-color: #f8fafc;
  border-radius: 12rpx;
}

.doc-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.doc-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.doc-detail {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.doc-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}

.doc-date {
  font-size: 24rpx;
  color: #999999;
}

.doc-status {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.status-normal {
  background-color: #dcfce7;
  .doc-status-text { color: #16a34a; }
}

.status-warning {
  background-color: #fef3c7;
  .doc-status-text { color: #d97706; }
}

.status-expired {
  background-color: #fee2e2;
  .doc-status-text { color: #dc2626; }
}

.status-unknown {
  background-color: #f3f4f6;
  .doc-status-text { color: #6b7280; }
}

.doc-status-text {
  font-size: 22rpx;
  font-weight: 500;
}

/* 入口卡片 */
.entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.entry-left {
  display: flex;
  align-items: center;
}

.entry-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.entry-title {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
}

.entry-arrow {
  font-size: 36rpx;
  color: #cccccc;
}

/* 操作按钮区域 */
.action-section {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28rpx 20rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.edit-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.photo-btn {
  background: linear-gradient(135deg, #f97316, #ea580c);
  position: relative;
}

.btn-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.btn-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
}

.badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background-color: #ef4444;
  border-radius: 20rpx;
  padding: 4rpx 12rpx;
  min-width: 36rpx;
  text-align: center;
}

.badge-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: bold;
}

/* 提示卡片 */
.tips-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.tips-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
  display: block;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.tips-item {
  display: flex;
  align-items: center;
}

.tips-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 12rpx;
}

.tips-dot.normal {
  background-color: #22c55e;
}

.tips-dot.warning {
  background-color: #f59e0b;
}

.tips-dot.expired {
  background-color: #ef4444;
}

.tips-text {
  font-size: 24rpx;
  color: #666666;
}

/* 照片网格 Requirements: 12.2 */
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.photo-item {
  width: calc(33.33% - 12rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.photo-image {
  width: 100%;
  height: 160rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  object-fit: cover;
}

.photo-label {
  font-size: 22rpx;
  color: #666666;
  margin-top: 8rpx;
  text-align: center;
}

/* 卡片副标题 */
.card-subtitle {
  font-size: 24rpx;
  color: #999999;
  margin-left: auto;
}

/* 卡片徽章 */
.card-badge {
  font-size: 22rpx;
  color: #ffffff;
  background-color: #f59e0b;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-left: auto;
}

/* 车损照片卡片特殊样式 */
.damage-card {
  border: 2rpx solid #fef3c7;
}

.damage-card .card-header {
  border-bottom-color: #fef3c7;
}
</style>
