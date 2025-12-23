<template>
  <!-- 
    补录照片页面
    显示车辆的补录照片记录，支持补录新照片
  -->
  <view class="supplement-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 内容区域 -->
    <view v-else class="page-content">
      <!-- 车辆信息卡片 -->
      <view class="vehicle-card">
        <view class="vehicle-icon">🚗</view>
        <view class="vehicle-info">
          <text class="vehicle-plate">{{ vehicle?.license_plate || '-' }}</text>
          <text class="vehicle-brand">{{ vehicle?.brand || '-' }} {{ vehicle?.model || '' }}</text>
        </view>
      </view>

      <!-- 补录照片列表 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">补录照片记录</text>
          <text class="section-count">共 {{ supplementedList.length }} 张</text>
        </view>

        <!-- 空状态 -->
        <view v-if="supplementedList.length === 0" class="empty-state">
          <text class="empty-icon">📷</text>
          <text class="empty-text">暂无补录照片</text>
          <text class="empty-hint">点击下方按钮补录照片</text>
        </view>

        <!-- 补录照片列表 -->
        <view v-else class="photo-list">
          <view 
            v-for="item in supplementedList" 
            :key="item.key"
            class="photo-item"
          >
            <view class="photo-header">
              <text class="photo-field">{{ getFieldDisplayName(item.field) }}</text>
              <text class="photo-index">#{{ item.index + 1 }}</text>
            </view>
            <view class="photo-meta">
              <view class="meta-item">
                <text class="meta-label">补录时间</text>
                <text class="meta-value">{{ formatDateTime(item.supplemented_at) }}</text>
              </view>
              <view class="meta-item">
                <text class="meta-label">补录次数</text>
                <text class="meta-value">{{ item.supplement_count }} 次</text>
              </view>
            </view>
            <!-- 补录标记 -->
            <view class="supplemented-badge">
              <text class="badge-text">已补录</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 补录照片操作 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">补录新照片</text>
        </view>
        
        <view class="form-area">
          <!-- 选择照片字段 -->
          <view class="form-item">
            <text class="form-label">照片类型</text>
            <picker 
              :value="selectedFieldIndex" 
              :range="fieldOptions" 
              range-key="label"
              @change="onFieldChange"
            >
              <view class="picker-value">
                <text>{{ fieldOptions[selectedFieldIndex]?.label || '请选择' }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- 输入索引 -->
          <view class="form-item">
            <text class="form-label">照片序号</text>
            <input 
              class="form-input"
              type="number"
              v-model="photoIndex"
              placeholder="请输入照片序号（从0开始）"
            />
          </view>

          <!-- 输入新照片URL -->
          <view class="form-item">
            <text class="form-label">新照片URL</text>
            <input 
              class="form-input"
              v-model="newPhotoUrl"
              placeholder="请输入新照片的URL"
            />
          </view>
        </view>

        <!-- 提交按钮 -->
        <view 
          class="submit-btn" 
          :class="{ disabled: !canSubmit }"
          @click="handleSubmit"
        >
          <text class="btn-text">{{ submitting ? '提交中...' : '提交补录' }}</text>
        </view>
      </view>

      <!-- 说明 -->
      <view class="tips-section">
        <text class="tips-title">补录说明</text>
        <view class="tips-list">
          <text class="tips-item">• 补录照片用于替换或补充车辆的照片信息</text>
          <text class="tips-item">• 系统会记录每次补录的时间和次数</text>
          <text class="tips-item">• 补录后的照片会显示橙色标记</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 补录照片页面
 * 显示车辆的补录照片记录，支持补录新照片
 */

import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getVehicle, getSupplementedPhotos, supplementVehiclePhoto } from '@/api'
import type { Vehicle, SupplementedPhotoMeta } from '@/api/types'
import { formatDateTime } from '@/utils'

// ==================== 类型定义 ====================

/** 补录照片列表项 */
interface SupplementedItem extends SupplementedPhotoMeta {
  key: string
}

/** 照片字段选项 */
interface FieldOption {
  value: string
  label: string
}

// ==================== 状态 ====================

/** 车辆ID */
const vehicleId = ref(0)

/** 车辆信息 */
const vehicle = ref<Vehicle | null>(null)

/** 加载状态 */
const loading = ref(false)

/** 提交状态 */
const submitting = ref(false)

/** 补录照片列表 */
const supplementedList = ref<SupplementedItem[]>([])

/** 选中的字段索引 */
const selectedFieldIndex = ref(0)

/** 照片索引 */
const photoIndex = ref('')

/** 新照片URL */
const newPhotoUrl = ref('')

/** 照片字段选项 */
const fieldOptions: FieldOption[] = [
  { value: 'pickup_photos', label: '取车照片' },
  { value: 'return_photos', label: '还车照片' },
  { value: 'registration_photos', label: '登记照片' },
  { value: 'damage_photos', label: '损坏照片' },
  { value: 'left_front_photo', label: '左前方照片' },
  { value: 'right_front_photo', label: '右前方照片' },
  { value: 'left_rear_photo', label: '左后方照片' },
  { value: 'right_rear_photo', label: '右后方照片' },
  { value: 'dashboard_photo', label: '仪表盘照片' },
  { value: 'rear_door_photo', label: '后门照片' },
  { value: 'cargo_box_photo', label: '货箱照片' },
  { value: 'driving_license_main_photo', label: '行驶证主页' },
  { value: 'driving_license_sub_photo', label: '行驶证副页' },
  { value: 'driving_license_back_photo', label: '行驶证背面' },
  { value: 'driving_license_sub_back_photo', label: '行驶证副页背面' },
]

// ==================== 计算属性 ====================

/** 是否可以提交 */
const canSubmit = computed(() => {
  return !submitting.value && 
         photoIndex.value !== '' && 
         newPhotoUrl.value.trim() !== ''
})

// ==================== 生命周期 ====================

onLoad((options) => {
  if (options?.id) {
    vehicleId.value = Number(options.id)
    loadData()
  }
})

// ==================== 方法 ====================

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  
  try {
    // 并行加载车辆信息和补录照片
    const [vehicleData, photosData] = await Promise.all([
      getVehicle(vehicleId.value),
      getSupplementedPhotos(vehicleId.value),
    ])
    
    vehicle.value = vehicleData
    
    // 转换补录照片数据为列表
    const photos = photosData.supplemented_photos || {}
    supplementedList.value = Object.entries(photos).map(([key, meta]) => ({
      key,
      ...meta,
    })).sort((a, b) => {
      // 按补录时间倒序排列
      return new Date(b.supplemented_at).getTime() - new Date(a.supplemented_at).getTime()
    })
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 获取字段显示名称
 */
function getFieldDisplayName(field: string): string {
  const option = fieldOptions.find(opt => opt.value === field)
  return option?.label || field
}

/**
 * 字段选择变化
 */
function onFieldChange(e: any): void {
  selectedFieldIndex.value = e.detail.value
}

/**
 * 提交补录
 */
async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  
  const index = parseInt(photoIndex.value, 10)
  if (isNaN(index) || index < 0) {
    uni.showToast({
      title: '请输入有效的照片序号',
      icon: 'none',
    })
    return
  }
  
  const url = newPhotoUrl.value.trim()
  if (!url) {
    uni.showToast({
      title: '请输入照片URL',
      icon: 'none',
    })
    return
  }
  
  submitting.value = true
  
  try {
    const field = fieldOptions[selectedFieldIndex.value].value
    
    await supplementVehiclePhoto(vehicleId.value, {
      field,
      index,
      new_url: url,
    })
    
    uni.showToast({
      title: '补录成功',
      icon: 'success',
    })
    
    // 清空表单
    photoIndex.value = ''
    newPhotoUrl.value = ''
    
    // 刷新数据
    await loadData()
  } catch (error: any) {
    console.error('补录失败:', error)
    uni.showToast({
      title: error.message || '补录失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}
</script>


<style lang="scss" scoped>
.supplement-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
}

/* 加载状态 */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* 车辆信息卡片 */
.vehicle-card {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.vehicle-icon {
  font-size: 48rpx;
  margin-right: 16rpx;
}

.vehicle-info {
  flex: 1;
}

.vehicle-plate {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  display: block;
}

.vehicle-brand {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* 区域 */
.section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
}

.section-count {
  font-size: 24rpx;
  color: #999999;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
}

.empty-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #cccccc;
}

/* 照片列表 */
.photo-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.photo-item {
  position: relative;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
  border-left: 6rpx solid #ff6b35;
}

.photo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.photo-field {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
}

.photo-index {
  font-size: 24rpx;
  color: #999999;
}

.photo-meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.meta-item {
  display: flex;
  justify-content: space-between;
}

.meta-label {
  font-size: 24rpx;
  color: #999999;
}

.meta-value {
  font-size: 24rpx;
  color: #666666;
}

/* 补录标记 */
.supplemented-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background-color: #ff6b35;
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.badge-text {
  font-size: 20rpx;
  color: #ffffff;
}

/* 表单区域 */
.form-area {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-label {
  width: 160rpx;
  font-size: 26rpx;
  color: #666666;
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

.picker-value {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60rpx;
  padding: 0 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333333;
}

.picker-arrow {
  font-size: 28rpx;
  color: #cccccc;
}

/* 提交按钮 */
.submit-btn {
  margin-top: 24rpx;
  background-color: #ff6b35;
  border-radius: 12rpx;
  padding: 24rpx;
  text-align: center;
  
  &.disabled {
    background-color: #cccccc;
  }
}

.submit-btn .btn-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: bold;
}

/* 提示区域 */
.tips-section {
  background-color: #fff9f5;
  border-radius: 16rpx;
  padding: 24rpx;
  border: 1rpx solid #ffe0d0;
}

.tips-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #ff6b35;
  margin-bottom: 12rpx;
  display: block;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tips-item {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.6;
}
</style>
