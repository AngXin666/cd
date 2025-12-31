<template>
  <!--
    司机个人档案页面
    显示司机的详细个人信息
    
    功能特性：
    - 显示司机头像和姓名
    - 显示入职时间和在职天数
    - 显示手机号
    - 显示身份证号（部分隐藏）
    - 显示驾驶证类型和有效期
    - 显示司机类型和所属仓库
    - 不显示考勤记录和计件记录标签页
    
    @module pages/manager/drivers/detail
    @requirements 4.1-4.11
  -->
  <view class="driver-profile-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="driver">
      <!-- 司机头部信息卡片 Requirements: 4.2, 4.3 -->
      <view class="profile-header">
        <view class="driver-avatar">
          <text class="avatar-text">{{ driver.name?.charAt(0) || '?' }}</text>
        </view>
        <view class="driver-basic">
          <view class="name-row">
            <text class="driver-name">{{ driver.name || '未设置姓名' }}</text>
            <view :class="['status-tag', driver.is_active ? 'active' : 'inactive']">
              <text class="status-text">{{ driver.is_active ? '在职' : '离职' }}</text>
            </view>
          </view>
          <!-- 入职时间和在职天数 Requirements: 4.3 -->
          <view class="tenure-info">
            <text class="tenure-text">入职：{{ formatHireDate(driver.created_at) }}</text>
            <text class="tenure-divider">|</text>
            <text class="tenure-text">在职：{{ getTenureDays(driver) }}天</text>
          </view>
        </view>
      </view>

      <!-- 个人信息列表 Requirements: 4.4-4.9 -->
      <view class="info-section">
        <view class="section-title">
          <text class="title-icon">📋</text>
          <text class="title-text">个人信息</text>
        </view>
        
        <view class="info-list">
          <!-- 手机号 Requirements: 4.4 -->
          <view class="info-item">
            <text class="info-label">手机号</text>
            <text class="info-value">{{ driver.phone || '未设置' }}</text>
          </view>
          
          <!-- 用户名 -->
          <view class="info-item">
            <text class="info-label">用户名</text>
            <text class="info-value">{{ driver.username }}</text>
          </view>
          
          <!-- 身份证号（部分隐藏）Requirements: 4.5 -->
          <view class="info-item">
            <text class="info-label">身份证号</text>
            <text class="info-value">{{ getDisplayIdCard() }}</text>
          </view>
          
          <!-- 驾驶证类型 Requirements: 4.6 -->
          <view class="info-item">
            <text class="info-label">驾驶证类型</text>
            <text class="info-value">{{ driverLicense?.license_class || '未录入' }}</text>
          </view>
          
          <!-- 驾驶证有效期 Requirements: 4.7 -->
          <view class="info-item">
            <text class="info-label">驾驶证有效期</text>
            <text :class="['info-value', isLicenseExpiringSoon ? 'warning' : '']">
              {{ formatLicenseValidity() }}
            </text>
          </view>
          
          <!-- 司机类型 Requirements: 4.8 -->
          <view class="info-item">
            <text class="info-label">司机类型</text>
            <view :class="['driver-type-tag', getDriverTypeClass()]">
              <text class="type-text">{{ getDriverTypeText() }}</text>
            </view>
          </view>
          
          <!-- 所属仓库 Requirements: 4.9 -->
          <view class="info-item">
            <text class="info-label">所属仓库</text>
            <text class="info-value">{{ warehouseName || '未分配' }}</text>
          </view>
        </view>
      </view>

      <!-- 证件照片区域（如果有） -->
      <view v-if="hasLicensePhotos" class="photo-section">
        <view class="section-title">
          <text class="title-icon">📷</text>
          <text class="title-text">证件照片</text>
        </view>
        
        <view class="photo-grid">
          <!-- 身份证正面 -->
          <view v-if="driverLicense?.id_card_photo_front" class="photo-item" @click="previewPhoto(driverLicense.id_card_photo_front)">
            <image class="photo-image" :src="getFullImageUrl(driverLicense.id_card_photo_front)" mode="aspectFill" />
            <text class="photo-label">身份证正面</text>
          </view>
          
          <!-- 身份证背面 -->
          <view v-if="driverLicense?.id_card_photo_back" class="photo-item" @click="previewPhoto(driverLicense.id_card_photo_back)">
            <image class="photo-image" :src="getFullImageUrl(driverLicense.id_card_photo_back)" mode="aspectFill" />
            <text class="photo-label">身份证背面</text>
          </view>
          
          <!-- 驾驶证照片 -->
          <view v-if="driverLicense?.driving_license_photo" class="photo-item" @click="previewPhoto(driverLicense.driving_license_photo)">
            <image class="photo-image" :src="getFullImageUrl(driverLicense.driving_license_photo)" mode="aspectFill" />
            <text class="photo-label">驾驶证</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text class="error-icon">😕</text>
      <text class="error-text">加载司机信息失败</text>
      <view class="retry-btn" @click="loadDriverDetail">
        <text class="retry-text">重试</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 司机个人档案页面
 * 显示司机的详细个人信息
 * 
 * 修改说明：
 * - 移除考勤记录标签页 (Requirements: 4.10)
 * - 移除计件记录标签页 (Requirements: 4.11)
 * - 添加个人档案信息显示 (Requirements: 4.2-4.9)
 * 
 * @module pages/manager/drivers/detail
 * @requirements 4.1-4.11
 */

import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getUser, getWarehouses, getDriverLicense, getVehicles } from '@/api'
import type { User, Warehouse, DriverLicenseResponse, Vehicle } from '@/api/types'
import { maskIdCard, getFullImageUrl, previewPhoto, formatHireDate } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 司机ID */
const driverId = ref<number>(0)

/** 司机信息 */
const driver = ref<User | null>(null)

/** 司机证件信息 */
const driverLicense = ref<DriverLicenseResponse | null>(null)

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 司机车辆列表 */
const driverVehicles = ref<Vehicle[]>([])

// ==================== 计算属性 ====================

/**
 * 获取司机所属仓库名称
 * Requirements: 4.9 - 显示所属仓库名称
 */
const warehouseName = computed(() => {
  if (!driver.value?.warehouse_id) return null
  const warehouse = warehouses.value.find(w => w.id === driver.value?.warehouse_id)
  return warehouse?.name || null
})

/**
 * 判断驾驶证是否即将过期（30天内）
 */
const isLicenseExpiringSoon = computed(() => {
  if (!driverLicense.value?.valid_to) return false
  const validTo = new Date(driverLicense.value.valid_to)
  const today = new Date()
  const diffDays = Math.ceil((validTo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 30 && diffDays > 0
})

/**
 * 判断是否有证件照片
 */
const hasLicensePhotos = computed(() => {
  if (!driverLicense.value) return false
  return !!(
    driverLicense.value.id_card_photo_front ||
    driverLicense.value.id_card_photo_back ||
    driverLicense.value.driving_license_photo
  )
})

// ==================== 生命周期 ====================

onLoad((options) => {
  // 获取司机ID
  if (options?.id) {
    driverId.value = parseInt(options.id as string, 10)
  }
})

onMounted(() => {
  if (driverId.value) {
    loadDriverDetail()
  }
})

// ==================== 方法 ====================

/**
 * 加载司机详情
 * Requirements: 4.1 - 跳转到司机个人档案页面
 */
async function loadDriverDetail(): Promise<void> {
  loading.value = true
  try {
    // 并行加载司机信息和仓库列表
    const [driverData, warehousesData] = await Promise.all([
      getUser(driverId.value),
      getWarehouses({ is_active: true }),
    ])
    
    driver.value = driverData
    warehouses.value = warehousesData
    
    // 尝试加载司机证件信息（如果有对应的 API）
    await loadDriverLicense()
    
    // 加载司机车辆信息，用于判断司机类型
    await loadDriverVehicles()
  } catch (error) {
    console.error('加载司机详情失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 加载司机证件信息
 * 调用 getDriverLicense API 获取司机的身份证和驾驶证信息
 * Requirements: 4.5, 4.6, 4.7 - 显示身份证号、驾驶证类型、有效期
 */
async function loadDriverLicense(): Promise<void> {
  try {
    // 调用 API 获取司机证件信息
    const licenseData = await getDriverLicense(driverId.value)
    driverLicense.value = licenseData
    console.log('[loadDriverLicense] 成功加载司机证件信息:', licenseData)
  } catch (error: any) {
    // 404 错误表示证件信息不存在，这是正常情况
    if (error?.response?.status === 404 || error?.statusCode === 404) {
      console.log('[loadDriverLicense] 司机证件信息不存在')
      driverLicense.value = null
    } else {
      console.error('[loadDriverLicense] 加载司机证件信息失败:', error)
    }
    // 证件信息加载失败不影响页面显示
  }
}

/**
 * 加载司机车辆信息
 * 用于判断司机类型（纯司机/带车司机）
 * Requirements: 4.8 - 显示司机类型
 */
async function loadDriverVehicles(): Promise<void> {
  try {
    // 调用 API 获取司机的车辆列表
    const vehiclesData = await getVehicles({ user_id: driverId.value })
    driverVehicles.value = vehiclesData || []
    console.log('[loadDriverVehicles] 成功加载司机车辆信息:', vehiclesData?.length || 0, '辆')
  } catch (error: any) {
    console.error('[loadDriverVehicles] 加载司机车辆信息失败:', error)
    driverVehicles.value = []
    // 车辆信息加载失败不影响页面显示
  }
}

/**
 * 获取司机在职天数
 * Requirements: 4.3 - 显示在职天数
 * @param driverData - 司机信息
 * @returns 在职天数
 */
function getTenureDays(driverData: User): number {
  if (!driverData.created_at) return 0
  const startDate = new Date(driverData.created_at)
  const today = new Date()
  const diffTime = today.getTime() - startDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * 获取显示用的身份证号
 * 优先使用后端返回的已隐藏身份证号，否则前端处理隐藏
 * Requirements: 4.5 - 显示身份证号（部分隐藏）
 * @returns 部分隐藏的身份证号
 */
function getDisplayIdCard(): string {
  // 优先使用后端返回的已隐藏身份证号
  if (driverLicense.value?.id_card_number_masked) {
    return driverLicense.value.id_card_number_masked
  }
  // 否则使用工具函数处理隐藏
  return maskIdCard(driverLicense.value?.id_card_number)
}

/**
 * 格式化驾驶证有效期
 * Requirements: 4.7 - 显示驾驶证有效期
 * @returns 格式化后的有效期
 */
function formatLicenseValidity(): string {
  if (!driverLicense.value?.valid_to) return '未录入'
  const validTo = new Date(driverLicense.value.valid_to)
  const today = new Date()
  
  // 检查是否已过期
  if (validTo < today) {
    return `已过期（${formatHireDate(driverLicense.value.valid_to)}）`
  }
  
  // 计算剩余天数
  const diffDays = Math.ceil((validTo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 30) {
    return `${formatHireDate(driverLicense.value.valid_to)}（${diffDays}天后到期）`
  }
  
  return formatHireDate(driverLicense.value.valid_to)
}

/**
 * 获取司机类型文本
 * 根据司机是否有关联车辆来判断类型
 * Requirements: 4.8 - 显示司机类型
 * @returns 司机类型文本（纯司机/带车司机）
 */
function getDriverTypeText(): string {
  // 如果司机有关联的车辆，则为带车司机
  return driverVehicles.value.length > 0 ? '带车司机' : '纯司机'
}

/**
 * 获取司机类型样式类
 * @returns 样式类名
 */
function getDriverTypeClass(): string {
  // 如果司机有关联的车辆，则为带车司机
  return driverVehicles.value.length > 0 ? 'with-vehicle' : 'pure'
}
</script>


<style lang="scss" scoped>
/**
 * 司机个人档案页面样式
 * Requirements: 4.2-4.9 - 个人档案信息显示
 */

/* 页面容器 */
.driver-profile-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #eff6ff, #dbeafe);
  padding: 24rpx;
}

/* 加载状态 */
.loading-container {
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

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.error-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.error-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 24rpx;
}

.retry-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  padding: 16rpx 48rpx;
  border-radius: 12rpx;
}

.retry-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;
}

/* 头部信息卡片 */
.profile-header {
  background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.3);
  display: flex;
  align-items: center;
}

.driver-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
}

.driver-basic {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.driver-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  margin-right: 16rpx;
}

.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
}

.status-tag.active {
  background-color: rgba(34, 197, 94, 0.2);
}

.status-tag.inactive {
  background-color: rgba(239, 68, 68, 0.2);
}

.status-text {
  font-size: 22rpx;
  font-weight: 500;
}

.status-tag.active .status-text {
  color: #22c55e;
}

.status-tag.inactive .status-text {
  color: #ef4444;
}

.tenure-info {
  display: flex;
  align-items: center;
}

.tenure-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.tenure-divider {
  margin: 0 12rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* 信息区块 */
.info-section {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.title-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: #666666;
}

.info-value {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
}

.info-value.warning {
  color: #f59e0b;
}

/* 司机类型标签 */
.driver-type-tag {
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
}

.driver-type-tag.with-vehicle {
  background-color: #dbeafe;
}

.driver-type-tag.pure {
  background-color: #dcfce7;
}

.type-text {
  font-size: 24rpx;
  font-weight: 500;
}

.driver-type-tag.with-vehicle .type-text {
  color: #2563eb;
}

.driver-type-tag.pure .type-text {
  color: #16a34a;
}

/* 照片区域 */
.photo-section {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

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
}

.photo-label {
  font-size: 22rpx;
  color: #666666;
  margin-top: 8rpx;
  text-align: center;
}
</style>
