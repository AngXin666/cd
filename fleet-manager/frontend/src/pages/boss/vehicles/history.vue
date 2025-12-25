<!--
  车辆历史对比页面
  显示车辆的提车/还车照片时间线，支持照片对比功能
  仅老板角色可访问
  @module pages/boss/vehicles/history
  @requirements 14.1, 14.2
-->
<template>
  <view class="vehicle-history-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="handleBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">车辆历史</text>
      <view class="nav-right" />
    </view>

    <!-- 车辆信息卡片 -->
    <view v-if="vehicle" class="vehicle-info-card">
      <view class="vehicle-plate">{{ vehicle.license_plate }}</view>
      <view class="vehicle-meta">
        <text class="vehicle-brand">{{ vehicle.brand || '未知品牌' }} {{ vehicle.model || '' }}</text>
        <text class="vehicle-owner">当前司机：{{ vehicle.user_name || '未分配' }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner" />
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="historyList.length === 0" class="empty-container">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无使用历史</text>
    </view>

    <!-- 历史时间线 -->
    <view v-else class="history-timeline">
      <view 
        v-for="(record, index) in historyList" 
        :key="record.id"
        class="timeline-item"
      >
        <!-- 时间线节点 -->
        <view class="timeline-node">
          <view 
            class="timeline-dot"
            :class="{ 
              'timeline-dot--pickup': record.action_type === 'pickup',
              'timeline-dot--return': record.action_type === 'return'
            }"
          />
          <view v-if="index < historyList.length - 1" class="timeline-line" />
        </view>

        <!-- 记录内容 -->
        <view class="timeline-content">
          <!-- 记录头部 -->
          <view class="record-header">
            <view class="record-type-tag" :class="getTypeClass(record.action_type)">
              <text>{{ getTypeLabel(record.action_type) }}</text>
            </view>
            <text class="record-time">{{ formatTime(record.action_time) }}</text>
          </view>

          <!-- 司机信息 -->
          <view class="record-driver">
            <text class="driver-label">司机：</text>
            <text class="driver-name">{{ record.user_name || '未知' }}</text>
          </view>

          <!-- 照片预览 -->
          <view v-if="record.photos" class="record-photos">
            <text class="photos-title">车辆照片（7张）</text>
            <view class="photos-grid">
              <view 
                v-for="(photo, photoIndex) in getPhotoList(record.photos)"
                :key="photoIndex"
                class="photo-item"
                @tap="handlePhotoPreview(record, photoIndex)"
              >
                <image :src="photo.url" mode="aspectFill" />
                <text class="photo-label">{{ photo.label }}</text>
              </view>
            </view>
          </view>

          <!-- 车损照片 -->
          <view v-if="record.damage_photos && record.damage_photos.length > 0" class="record-damage">
            <text class="damage-title">车损照片（{{ record.damage_photos.length }}张）</text>
            <view class="damage-grid">
              <view 
                v-for="(photo, photoIndex) in record.damage_photos"
                :key="photoIndex"
                class="damage-item"
                @tap="handleDamagePreview(record.damage_photos, photoIndex)"
              >
                <image :src="photo" mode="aspectFill" />
              </view>
            </view>
          </view>

          <!-- 备注 -->
          <view v-if="record.remark" class="record-remark">
            <text class="remark-label">备注：</text>
            <text class="remark-text">{{ record.remark }}</text>
          </view>

          <!-- 对比按钮 -->
          <view 
            v-if="canCompare(record)"
            class="compare-btn"
            @tap="handleCompare(record)"
          >
            <text>📷 照片对比</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading" class="load-more" @tap="loadMore">
      <text>加载更多</text>
    </view>

    <!-- 照片对比弹窗 -->
    <view v-if="showCompareModal" class="compare-modal">
      <view class="compare-modal-mask" @tap="closeCompareModal" />
      <view class="compare-modal-content">
        <view class="compare-modal-header">
          <text class="compare-modal-title">照片对比</text>
          <view class="compare-modal-close" @tap="closeCompareModal">
            <text>✕</text>
          </view>
        </view>
        <view class="compare-modal-body">
          <PhotoCompare
            :photos="comparePhotos"
            :type="compareType"
            :show-time-label="true"
            :show-source-label="true"
            @selection-change="handleSelectionChange"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆历史对比页面
 * 显示车辆使用历史时间线，支持照片对比
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getVehicle, getVehicleHistory } from '@/api'
import type { Vehicle, VehicleHistory, VehicleHistoryPhotos } from '@/api/types'
import { VehicleHistoryActionType } from '@/api/types'
import PhotoCompare from '@/components/PhotoCompare/index.vue'
import type { PhotoItem, CompareSelection, PhotoType } from '@/components/PhotoCompare/types'

// ==================== 响应式状态 ====================

/** 车辆ID */
const vehicleId = ref<number>(0)

/** 车辆信息 */
const vehicle = ref<Vehicle | null>(null)

/** 历史记录列表 */
const historyList = ref<VehicleHistory[]>([])

/** 加载状态 */
const loading = ref(false)

/** 是否有更多数据 */
const hasMore = ref(true)

/** 当前页码 */
const currentPage = ref(0)

/** 每页数量 */
const pageSize = 10

/** 是否显示对比弹窗 */
const showCompareModal = ref(false)

/** 对比照片列表 */
const comparePhotos = ref<PhotoItem[]>([])

/** 对比类型 */
const compareType = ref<PhotoType>('basic')

// ==================== 生命周期 ====================

onLoad((options) => {
  if (options?.id) {
    vehicleId.value = parseInt(options.id, 10)
    loadVehicleInfo()
    loadHistory()
  }
})

// ==================== 方法 ====================

/**
 * 加载车辆信息
 */
async function loadVehicleInfo(): Promise<void> {
  try {
    vehicle.value = await getVehicle(vehicleId.value)
  } catch (error) {
    console.error('加载车辆信息失败:', error)
  }
}

/**
 * 加载历史记录
 */
async function loadHistory(): Promise<void> {
  if (loading.value) return
  
  loading.value = true
  try {
    const response = await getVehicleHistory(vehicleId.value, {
      skip: currentPage.value * pageSize,
      limit: pageSize
    })
    
    if (currentPage.value === 0) {
      historyList.value = response.items
    } else {
      historyList.value = [...historyList.value, ...response.items]
    }
    
    hasMore.value = historyList.value.length < response.total
  } catch (error) {
    console.error('加载历史记录失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
function loadMore(): void {
  currentPage.value++
  loadHistory()
}

/**
 * 返回上一页
 */
function handleBack(): void {
  uni.navigateBack()
}

/**
 * 获取操作类型标签
 * @param type - 操作类型
 * @returns 中文标签
 */
function getTypeLabel(type: VehicleHistoryActionType): string {
  return type === VehicleHistoryActionType.PICKUP ? '提车' : '还车'
}

/**
 * 获取操作类型样式类
 * @param type - 操作类型
 * @returns 样式类名
 */
function getTypeClass(type: VehicleHistoryActionType): string {
  return type === VehicleHistoryActionType.PICKUP ? 'type-pickup' : 'type-return'
}

/**
 * 格式化时间
 * @param timeStr - 时间字符串
 * @returns 格式化后的时间
 */
function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 照片角度标签映射
 */
const PHOTO_LABELS: Record<string, string> = {
  left_front: '左前',
  right_front: '右前',
  left_rear: '左后',
  right_rear: '右后',
  dashboard: '仪表盘',
  rear_door: '后门',
  cargo_box: '货箱'
}

/**
 * 获取照片列表
 * @param photos - 照片对象
 * @returns 照片列表
 */
function getPhotoList(photos: VehicleHistoryPhotos): Array<{ url: string; label: string; angle: string }> {
  const list: Array<{ url: string; label: string; angle: string }> = []
  const angles = ['left_front', 'right_front', 'left_rear', 'right_rear', 'dashboard', 'rear_door', 'cargo_box']
  
  angles.forEach(angle => {
    const url = photos[angle as keyof VehicleHistoryPhotos]
    if (url) {
      list.push({
        url,
        label: PHOTO_LABELS[angle] || angle,
        angle
      })
    }
  })
  
  return list
}

/**
 * 处理照片预览
 * @param record - 历史记录
 * @param index - 照片索引
 */
function handlePhotoPreview(record: VehicleHistory, index: number): void {
  if (!record.photos) return
  
  const photoList = getPhotoList(record.photos)
  const urls = photoList.map(p => p.url)
  
  uni.previewImage({
    current: urls[index],
    urls
  })
}

/**
 * 处理车损照片预览
 * @param photos - 车损照片列表
 * @param index - 照片索引
 */
function handleDamagePreview(photos: string[], index: number): void {
  uni.previewImage({
    current: photos[index],
    urls: photos
  })
}

/**
 * 检查是否可以对比
 * @param record - 历史记录
 * @returns 是否可以对比
 */
function canCompare(record: VehicleHistory): boolean {
  // 查找是否有配对的记录（提车找还车，还车找提车）
  const targetType = record.action_type === VehicleHistoryActionType.PICKUP 
    ? VehicleHistoryActionType.RETURN 
    : VehicleHistoryActionType.PICKUP
  
  return historyList.value.some(r => 
    r.action_type === targetType && 
    r.photos !== null
  )
}

/**
 * 处理照片对比
 * @param record - 当前记录
 */
function handleCompare(record: VehicleHistory): void {
  // 收集所有可对比的照片
  const photos: PhotoItem[] = []
  
  historyList.value.forEach(r => {
    if (r.photos) {
      const photoList = getPhotoList(r.photos)
      photoList.forEach(p => {
        photos.push({
          url: p.url,
          angle: p.angle as any,
          takenAt: r.action_time,
          source: r.action_type as any
        })
      })
    }
  })
  
  comparePhotos.value = photos
  compareType.value = 'basic'
  showCompareModal.value = true
}

/**
 * 关闭对比弹窗
 */
function closeCompareModal(): void {
  showCompareModal.value = false
  comparePhotos.value = []
}

/**
 * 处理选择变化
 * @param selection - 选择状态
 */
function handleSelectionChange(selection: CompareSelection): void {
  console.log('选择变化:', selection)
}
</script>

<style lang="scss">
/**
 * 车辆历史对比页面样式
 */
.vehicle-history-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 32px;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88px;
  padding: 0 24px;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.nav-back {
  width: 60px;
  display: flex;
  align-items: center;
}

.nav-back-icon {
  font-size: 48px;
  color: #333;
}

.nav-title {
  font-size: 34px;
  font-weight: 500;
  color: #333;
}

.nav-right {
  width: 60px;
}

/* 车辆信息卡片 */
.vehicle-info-card {
  margin: 24px;
  padding: 24px;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.vehicle-plate {
  font-size: 36px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
}

.vehicle-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vehicle-brand,
.vehicle-owner {
  font-size: 26px;
  color: #666;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e0e0e0;
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin-top: 16px;
  font-size: 28px;
  color: #999;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100px 0;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
}

.empty-text {
  font-size: 28px;
  color: #999;
}

/* 历史时间线 */
.history-timeline {
  padding: 0 24px;
}

.timeline-item {
  display: flex;
  gap: 16px;
}

.timeline-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 32px;
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #999;
  flex-shrink: 0;

  &--pickup {
    background-color: #52c41a;
  }

  &--return {
    background-color: #1890ff;
  }
}

.timeline-line {
  width: 2px;
  flex: 1;
  background-color: #e0e0e0;
  margin: 8px 0;
}

.timeline-content {
  flex: 1;
  background-color: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 记录头部 */
.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.record-type-tag {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 24px;

  &.type-pickup {
    background-color: #e6f7e6;
    color: #52c41a;
  }

  &.type-return {
    background-color: #e6f7ff;
    color: #1890ff;
  }
}

.record-time {
  font-size: 24px;
  color: #999;
}

/* 司机信息 */
.record-driver {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.driver-label {
  font-size: 26px;
  color: #666;
}

.driver-name {
  font-size: 26px;
  color: #333;
}

/* 照片预览 */
.record-photos {
  margin-bottom: 16px;
}

.photos-title {
  font-size: 26px;
  color: #666;
  margin-bottom: 12px;
  display: block;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;

  image {
    width: 100%;
    height: 100%;
  }
}

.photo-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 20px;
  text-align: center;
}

/* 车损照片 */
.record-damage {
  margin-bottom: 16px;
}

.damage-title {
  font-size: 26px;
  color: #666;
  margin-bottom: 12px;
  display: block;
}

.damage-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.damage-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;

  image {
    width: 100%;
    height: 100%;
  }
}

/* 备注 */
.record-remark {
  display: flex;
  margin-bottom: 16px;
}

.remark-label {
  font-size: 26px;
  color: #666;
  flex-shrink: 0;
}

.remark-text {
  font-size: 26px;
  color: #333;
}

/* 对比按钮 */
.compare-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  font-size: 28px;
  color: #1890ff;
}

/* 加载更多 */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-size: 28px;
  color: #1890ff;
}

/* 对比弹窗 */
.compare-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

.compare-modal-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.compare-modal-content {
  position: absolute;
  top: 10%;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #fff;
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
}

.compare-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.compare-modal-title {
  font-size: 32px;
  font-weight: 500;
  color: #333;
}

.compare-modal-close {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #999;
}

.compare-modal-body {
  flex: 1;
  overflow-y: auto;
}
</style>
