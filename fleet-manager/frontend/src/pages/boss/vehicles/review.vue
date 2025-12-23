<template>
  <!-- 
    车辆审核页面
    显示待审核车辆列表，支持审核操作
    仅老板角色可访问
  -->
  <view class="review-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="vehicles.length === 0" class="empty-container">
      <text class="empty-icon">✅</text>
      <text class="empty-text">暂无待审核的车辆</text>
    </view>

    <!-- 车辆列表 -->
    <view v-else class="vehicle-list">
      <view v-for="vehicle in vehicles" :key="vehicle.id" class="vehicle-card">
        <view class="vehicle-header">
          <view class="vehicle-icon">
            <text class="icon-text">🚗</text>
          </view>
          <view class="vehicle-info">
            <text class="vehicle-plate">{{ vehicle.license_plate }}</text>
            <text class="vehicle-brand">{{ vehicle.brand || '未知品牌' }} {{ vehicle.model || '' }}</text>
            <text class="vehicle-owner">申请人：{{ vehicle.user_name || '未知' }}</text>
          </view>
        </view>
        
        <view class="vehicle-details">
          <view class="detail-item">
            <text class="detail-label">车牌号</text>
            <text class="detail-value">{{ vehicle.license_plate }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">品牌</text>
            <text class="detail-value">{{ vehicle.brand || '未填写' }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">型号</text>
            <text class="detail-value">{{ vehicle.model || '未填写' }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">颜色</text>
            <text class="detail-value">{{ vehicle.color || '未填写' }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">申请时间</text>
            <text class="detail-value">{{ formatDateTime(vehicle.created_at) }}</text>
          </view>
        </view>

        <view class="action-buttons">
          <view class="action-btn reject" @click="handleReject(vehicle)">
            <text class="btn-text">拒绝</text>
          </view>
          <view class="action-btn approve" @click="handleApprove(vehicle)">
            <text class="btn-text">通过</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 统计信息 -->
    <view v-if="!loading && vehicles.length > 0" class="stats-footer">
      <text class="stats-text">共 {{ vehicles.length }} 辆待审核</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆审核页面
 * 显示待审核车辆列表，支持审核操作
 */
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getVehicles, reviewVehicle } from '@/api'
import type { Vehicle } from '@/api/types'
import { VehicleStatus } from '@/api/types'
import { formatDateTime } from '@/utils'

const loading = ref(false)
const vehicles = ref<Vehicle[]>([])

onMounted(() => { loadVehicles() })
onShow(() => { loadVehicles() })

/**
 * 加载待审核车辆列表
 */
async function loadVehicles(): Promise<void> {
  loading.value = true
  try {
    // 只获取审核中的车辆
    const data = await getVehicles({ status: VehicleStatus.REVIEWING })
    vehicles.value = data
  } catch (error) {
    console.error('加载车辆列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 通过审核
 * @param vehicle - 车辆信息
 */
function handleApprove(vehicle: Vehicle): void {
  uni.showModal({
    title: '确认通过',
    content: `确定通过车辆"${vehicle.license_plate}"的审核吗？`,
    success: async (res) => {
      if (res.confirm) {
        await doReview(vehicle.id, VehicleStatus.ACTIVE)
      }
    },
  })
}

/**
 * 拒绝审核
 * @param vehicle - 车辆信息
 */
function handleReject(vehicle: Vehicle): void {
  uni.showModal({
    title: '确认拒绝',
    content: `确定拒绝车辆"${vehicle.license_plate}"的审核吗？`,
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        await doReview(vehicle.id, VehicleStatus.RETURNED)
      }
    },
  })
}

/**
 * 执行审核操作
 * @param vehicleId - 车辆ID
 * @param status - 审核状态
 */
async function doReview(vehicleId: number, status: VehicleStatus): Promise<void> {
  try {
    uni.showLoading({ title: '处理中...' })
    await reviewVehicle(vehicleId, status)
    uni.hideLoading()
    uni.showToast({ title: status === VehicleStatus.ACTIVE ? '已通过' : '已拒绝', icon: 'success' })
    await loadVehicles()
  } catch (error) {
    console.error('审核失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.review-page { min-height: 100vh; background-color: #f5f5f5; }
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }
.empty-container { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; }
.vehicle-list { padding: 24rpx; }
.vehicle-card { background-color: #ffffff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
.vehicle-header { display: flex; align-items: center; padding-bottom: 20rpx; border-bottom: 1rpx solid #f0f0f0; }
.vehicle-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%); display: flex; align-items: center; justify-content: center; margin-right: 20rpx; }
.icon-text { font-size: 40rpx; }
.vehicle-info { flex: 1; }
.vehicle-plate { font-size: 32rpx; font-weight: bold; color: #333333; display: block; margin-bottom: 8rpx; }
.vehicle-brand { font-size: 26rpx; color: #666666; display: block; margin-bottom: 4rpx; }
.vehicle-owner { font-size: 24rpx; color: #999999; }
.vehicle-details { padding: 20rpx 0; }
.detail-item { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5; &:last-child { border-bottom: none; } }
.detail-label { font-size: 26rpx; color: #666666; }
.detail-value { font-size: 26rpx; color: #333333; }
.action-buttons { display: flex; gap: 16rpx; padding-top: 20rpx; border-top: 1rpx solid #f0f0f0; }
.action-btn { flex: 1; height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; &.reject { background-color: #fff1f0; border: 1rpx solid #ffccc7; .btn-text { color: #ff4d4f; } } &.approve { background-color: #e6f7e6; border: 1rpx solid #b7eb8f; .btn-text { color: #52c41a; } } }
.btn-text { font-size: 28rpx; font-weight: bold; }
.stats-footer { padding: 24rpx; text-align: center; }
.stats-text { font-size: 26rpx; color: #999999; }
</style>
