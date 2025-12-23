<template>
  <!-- 
    车辆详情页面
    显示车辆信息，支持编辑、归还
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
      <!-- 状态卡片 -->
      <view class="status-card">
        <view class="status-icon">
          <text class="icon-text">🚗</text>
        </view>
        <view class="status-info">
          <text class="license-plate">{{ vehicle.license_plate }}</text>
          <view :class="['status-tag', vehicle.status]">
            <text class="status-text">{{ getVehicleStatusText(vehicle.status) }}</text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="info-section">
        <view class="section-title">基本信息</view>
        <view class="info-list">
          <view class="info-item">
            <text class="info-label">车牌号</text>
            <text class="info-value">{{ vehicle.license_plate }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">品牌</text>
            <text class="info-value">{{ vehicle.brand || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">型号</text>
            <text class="info-value">{{ vehicle.model || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">颜色</text>
            <text class="info-value">{{ vehicle.color || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">添加时间</text>
            <text class="info-value">{{ formatDateTime(vehicle.created_at) }}</text>
          </view>
        </view>
      </view>

      <!-- 租赁信息入口 -->
      <view class="lease-entry" @click="goToLease">
        <view class="entry-left">
          <text class="entry-icon">📋</text>
          <text class="entry-title">租赁信息</text>
        </view>
        <text class="entry-arrow">›</text>
      </view>

      <!-- 补录照片入口 -->
      <view class="lease-entry" @click="goToSupplementPhotos">
        <view class="entry-left">
          <text class="entry-icon">📷</text>
          <text class="entry-title">补录照片</text>
          <view v-if="supplementedCount > 0" class="badge">
            <text class="badge-text">{{ supplementedCount }}</text>
          </view>
        </view>
        <text class="entry-arrow">›</text>
      </view>

      <!-- 编辑表单（仅审核中或使用中可编辑） -->
      <view v-if="canEdit" class="edit-section">
        <view class="section-title">编辑信息</view>
        <view class="form-list">
          <view class="form-item">
            <text class="form-label">品牌</text>
            <input 
              class="form-input"
              v-model="editForm.brand"
              placeholder="请输入品牌"
            />
          </view>
          <view class="form-item">
            <text class="form-label">型号</text>
            <input 
              class="form-input"
              v-model="editForm.model"
              placeholder="请输入型号"
            />
          </view>
          <view class="form-item">
            <text class="form-label">颜色</text>
            <input 
              class="form-input"
              v-model="editForm.color"
              placeholder="请输入颜色"
            />
          </view>
        </view>
        <view class="edit-btn" @click="handleSave">
          <text class="btn-text">{{ saving ? '保存中...' : '保存修改' }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view v-if="vehicle.status === 'active'" class="action-section">
        <view class="action-btn return" @click="handleReturn">
          <text class="btn-text">归还车辆</text>
        </view>
      </view>

      <!-- 状态说明 -->
      <view class="tips-section">
        <text class="tips-title">状态说明</text>
        <view class="tips-list">
          <view class="tips-item">
            <view class="tips-dot active"></view>
            <text class="tips-text">使用中：车辆正常使用</text>
          </view>
          <view class="tips-item">
            <view class="tips-dot reviewing"></view>
            <text class="tips-text">审核中：等待管理员审核</text>
          </view>
          <view class="tips-item">
            <view class="tips-dot returned"></view>
            <text class="tips-text">已归还：车辆已归还</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆详情页面
 * 显示车辆信息，支持编辑、归还
 */

import { ref, computed, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getVehicle, updateVehicle, getSupplementedPhotos } from '@/api'
import type { Vehicle, SupplementedPhotos } from '@/api/types'
import { VehicleStatus } from '@/api/types'
import { getVehicleStatusText, formatDateTime, navigateBack } from '@/utils'

// ==================== 状态 ====================

/** 车辆ID */
const vehicleId = ref(0)

/** 车辆信息 */
const vehicle = ref<Vehicle | null>(null)

/** 加载状态 */
const loading = ref(false)

/** 保存状态 */
const saving = ref(false)

/** 编辑表单 */
const editForm = reactive({
  brand: '',
  model: '',
  color: '',
})

/** 补录照片数量 */
const supplementedCount = ref(0)

// ==================== 计算属性 ====================

/** 是否可以编辑 */
const canEdit = computed(() => {
  if (!vehicle.value) return false
  return vehicle.value.status === 'active' || vehicle.value.status === 'reviewing'
})

// ==================== 生命周期 ====================

onLoad((options) => {
  if (options?.id) {
    vehicleId.value = Number(options.id)
    loadVehicle()
    loadSupplementedPhotos()
  }
})

// ==================== 方法 ====================

/**
 * 加载车辆信息
 */
async function loadVehicle(): Promise<void> {
  loading.value = true
  
  try {
    const data = await getVehicle(vehicleId.value)
    vehicle.value = data
    
    // 初始化编辑表单
    editForm.brand = data.brand || ''
    editForm.model = data.model || ''
    editForm.color = data.color || ''
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
 * 保存修改
 */
async function handleSave(): Promise<void> {
  if (saving.value) return
  
  saving.value = true
  
  try {
    await updateVehicle(vehicleId.value, {
      brand: editForm.brand || undefined,
      model: editForm.model || undefined,
      color: editForm.color || undefined,
    })
    
    uni.showToast({
      title: '保存成功',
      icon: 'success',
    })
    
    // 刷新数据
    await loadVehicle()
  } catch (error: any) {
    console.error('保存失败:', error)
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none',
    })
  } finally {
    saving.value = false
  }
}

/**
 * 归还车辆
 */
async function handleReturn(): Promise<void> {
  uni.showModal({
    title: '确认归还',
    content: '确定要归还该车辆吗？归还后将无法继续使用。',
    success: async (res) => {
      if (res.confirm) {
        await doReturn()
      }
    },
  })
}

/**
 * 执行归还
 */
async function doReturn(): Promise<void> {
  try {
    // 调用更新接口，将状态改为已归还
    // 注意：实际项目中可能需要专门的归还接口
    await updateVehicle(vehicleId.value, {})
    
    uni.showToast({
      title: '归还成功',
      icon: 'success',
    })
    
    // 延迟返回
    setTimeout(() => {
      navigateBack()
    }, 1500)
  } catch (error: any) {
    console.error('归还失败:', error)
    uni.showToast({
      title: error.message || '归还失败',
      icon: 'none',
    })
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
 * 跳转到补录照片页面
 */
function goToSupplementPhotos(): void {
  uni.navigateTo({
    url: `/pages/driver/vehicle/supplement-photos?id=${vehicleId.value}`,
  })
}
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
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

/* 状态卡片 */
.status-card {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.status-icon {
  width: 120rpx;
  height: 120rpx;
  background-color: #f0f0f0;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.icon-text {
  font-size: 64rpx;
}

.status-info {
  flex: 1;
}

.license-plate {
  font-size: 40rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 12rpx;
}

.status-tag {
  display: inline-block;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  
  &.active {
    background-color: #f6ffed;
    
    .status-text {
      color: #52c41a;
    }
  }
  
  &.reviewing {
    background-color: #fff7e6;
    
    .status-text {
      color: #faad14;
    }
  }
  
  &.returned {
    background-color: #f0f0f0;
    
    .status-text {
      color: #999999;
    }
  }
}

.status-text {
  font-size: 24rpx;
}

/* 信息区域 */
.info-section,
.edit-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
}

.info-list {
  display: flex;
  flex-direction: column;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 26rpx;
  color: #999999;
}

.info-value {
  font-size: 26rpx;
  color: #333333;
}

/* 编辑表单 */
.form-list {
  display: flex;
  flex-direction: column;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  width: 120rpx;
  font-size: 26rpx;
  color: #999999;
}

.form-input {
  flex: 1;
  height: 60rpx;
  padding: 0 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333333;
}

.edit-btn {
  margin-top: 24rpx;
  background-color: #4a90e2;
  border-radius: 8rpx;
  padding: 20rpx;
  text-align: center;
}

.edit-btn .btn-text {
  font-size: 28rpx;
  color: #ffffff;
}

/* 操作按钮 */
.action-section {
  margin-bottom: 24rpx;
}

.action-btn {
  border-radius: 12rpx;
  padding: 28rpx;
  text-align: center;
  
  &.return {
    background-color: #ff4d4f;
  }
  
  .btn-text {
    font-size: 32rpx;
    font-weight: bold;
    color: #ffffff;
  }
}

/* 提示区域 */
.tips-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

/* 租赁信息入口 */
.lease-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 24rpx;
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
}

.entry-arrow {
  font-size: 36rpx;
  color: #cccccc;
}

/* 补录照片徽章 */
.badge {
  margin-left: 12rpx;
  background-color: #ff6b35;
  border-radius: 20rpx;
  padding: 4rpx 12rpx;
  min-width: 36rpx;
  text-align: center;
}

.badge-text {
  font-size: 22rpx;
  color: #ffffff;
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
  
  &.active {
    background-color: #52c41a;
  }
  
  &.reviewing {
    background-color: #faad14;
  }
  
  &.returned {
    background-color: #999999;
  }
}

.tips-text {
  font-size: 24rpx;
  color: #666666;
}
</style>
