<template>
  <!-- 
    车辆管理页面
    显示全局车辆列表，支持筛选搜索
    仅老板角色可访问
  -->
  <view class="vehicles-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input v-model="searchKeyword" class="search-input" type="text" placeholder="搜索车牌号" @input="handleSearch" />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
      </view>
      <!-- 租金提醒入口 -->
      <view class="reminder-btn" @click="goToLeaseReminders">
        <text class="reminder-icon">💰</text>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view v-for="tab in filterTabs" :key="tab.value" :class="['filter-tab', { active: activeFilter === tab.value }]" @click="handleFilterChange(tab.value)">
        <text class="tab-text">{{ tab.label }}</text>
        <text v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</text>
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
    </view>

    <!-- 车辆列表 -->
    <view v-else class="vehicle-list">
      <view v-for="vehicle in filteredVehicles" :key="vehicle.id" class="vehicle-card" @click="viewVehicleDetail(vehicle.id)">
        <view class="vehicle-info">
          <view :class="['vehicle-icon', getStatusClass(vehicle.status)]">
            <text class="icon-text">🚗</text>
          </view>
          <view class="vehicle-detail">
            <view class="vehicle-plate-row">
              <text class="vehicle-plate">{{ vehicle.license_plate }}</text>
              <view :class="['status-tag', getStatusClass(vehicle.status)]">
                <text class="status-text">{{ getStatusName(vehicle.status) }}</text>
              </view>
            </view>
            <text class="vehicle-brand">{{ vehicle.brand || '未知品牌' }} {{ vehicle.model || '' }}</text>
            <text class="vehicle-owner">所属：{{ vehicle.user_name || '未知' }}</text>
          </view>
        </view>
        <view class="vehicle-actions">
          <view class="history-btn" @click.stop="viewVehicleHistory(vehicle.id)">
            <text class="history-icon">📋</text>
          </view>
          <view class="vehicle-arrow">
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 统计信息 -->
    <view v-if="!loading && vehicles.length > 0" class="stats-footer">
      <text class="stats-text">共 {{ vehicles.length }} 辆车，{{ activeCount }} 辆使用中</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆管理页面
 * 显示全局车辆列表，支持筛选搜索
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getVehicles } from '@/api'
import type { Vehicle } from '@/api/types'
import { VehicleStatus } from '@/api/types'

const loading = ref(false)
const vehicles = ref<Vehicle[]>([])
const searchKeyword = ref('')
const activeFilter = ref<'all' | 'active' | 'reviewing' | 'returned'>('all')

/** 使用中数量 */
const activeCount = computed(() => vehicles.value.filter(v => v.status === VehicleStatus.ACTIVE).length)
/** 审核中数量 */
const reviewingCount = computed(() => vehicles.value.filter(v => v.status === VehicleStatus.REVIEWING).length)
/** 已归还数量 */
const returnedCount = computed(() => vehicles.value.filter(v => v.status === VehicleStatus.RETURNED).length)

/** 筛选标签配置 */
const filterTabs = computed(() => [
  { label: '全部', value: 'all' as const, count: vehicles.value.length },
  { label: '使用中', value: 'active' as const, count: activeCount.value },
  { label: '审核中', value: 'reviewing' as const, count: reviewingCount.value },
  { label: '已归还', value: 'returned' as const, count: returnedCount.value },
])

/** 筛选后的车辆列表 */
const filteredVehicles = computed(() => {
  let result = vehicles.value
  if (activeFilter.value !== 'all') {
    const statusMap: Record<string, VehicleStatus> = {
      active: VehicleStatus.ACTIVE,
      reviewing: VehicleStatus.REVIEWING,
      returned: VehicleStatus.RETURNED,
    }
    result = result.filter(v => v.status === statusMap[activeFilter.value])
  }
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(v => v.license_plate.toLowerCase().includes(keyword) || (v.brand && v.brand.toLowerCase().includes(keyword)))
  }
  return result
})

onMounted(() => { loadVehicles() })
onShow(() => { loadVehicles() })

async function loadVehicles(): Promise<void> {
  loading.value = true
  try {
    const data = await getVehicles()
    vehicles.value = data
  } catch (error) {
    console.error('加载车辆列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {}
function clearSearch(): void { searchKeyword.value = '' }
function handleFilterChange(filter: 'all' | 'active' | 'reviewing' | 'returned'): void { activeFilter.value = filter }

function getStatusClass(status: VehicleStatus): string {
  switch (status) {
    case VehicleStatus.ACTIVE: return 'active'
    case VehicleStatus.REVIEWING: return 'reviewing'
    case VehicleStatus.RETURNED: return 'returned'
    default: return ''
  }
}

function getStatusName(status: VehicleStatus): string {
  const statusMap: Record<VehicleStatus, string> = {
    [VehicleStatus.ACTIVE]: '使用中',
    [VehicleStatus.PICKED_UP]: '已提车',
    [VehicleStatus.REVIEWING]: '审核中',
    [VehicleStatus.RETURNED]: '已归还',
  }
  return statusMap[status] || '未知'
}

function viewVehicleDetail(vehicleId: number): void {
  uni.navigateTo({ url: `/pages/driver/vehicle/detail?id=${vehicleId}` })
}

/**
 * 跳转到车辆历史页面
 * @param vehicleId - 车辆ID
 */
function viewVehicleHistory(vehicleId: number): void {
  uni.navigateTo({ url: `/pages/boss/vehicles/history?id=${vehicleId}` })
}

/**
 * 跳转到租金提醒页面
 */
function goToLeaseReminders(): void {
  uni.navigateTo({ url: '/pages/boss/vehicles/lease-reminders' })
}
</script>

<style lang="scss" scoped>
.vehicles-page { min-height: 100vh; background-color: #f5f5f5; }
.search-bar { display: flex; align-items: center; padding: 24rpx; background-color: #ffffff; gap: 16rpx; }
.search-input-wrapper { flex: 1; display: flex; align-items: center; height: 72rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 36rpx; }
.search-icon { font-size: 32rpx; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #333333; }
.clear-icon { font-size: 28rpx; color: #999999; padding: 8rpx; }
.reminder-btn { width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 36rpx; }
.reminder-icon { font-size: 32rpx; }
.filter-tabs { display: flex; background-color: #ffffff; padding: 16rpx 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.filter-tab { display: flex; align-items: center; padding: 12rpx 20rpx; margin-right: 16rpx; border-radius: 32rpx; background-color: #f5f5f5; &.active { background-color: #e6f7ff; .tab-text { color: #1890ff; } .tab-count { background-color: #1890ff; color: #ffffff; } } }
.tab-text { font-size: 26rpx; color: #666666; }
.tab-count { font-size: 22rpx; color: #999999; background-color: #e0e0e0; padding: 4rpx 12rpx; border-radius: 20rpx; margin-left: 8rpx; }
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }
.empty-container { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; }
.vehicle-list { padding: 24rpx; }
.vehicle-card { display: flex; align-items: center; background-color: #ffffff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
.vehicle-info { flex: 1; display: flex; align-items: center; }
.vehicle-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; margin-right: 20rpx; &.active { background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%); } &.reviewing { background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%); } &.returned { background: linear-gradient(135deg, #999999 0%, #bfbfbf 100%); } }
.icon-text { font-size: 40rpx; }
.vehicle-detail { flex: 1; }
.vehicle-plate-row { display: flex; align-items: center; margin-bottom: 8rpx; }
.vehicle-plate { font-size: 30rpx; font-weight: bold; color: #333333; margin-right: 12rpx; }
.status-tag { padding: 4rpx 12rpx; border-radius: 8rpx; &.active { background-color: #e6f7e6; .status-text { color: #52c41a; } } &.reviewing { background-color: #fff7e6; .status-text { color: #faad14; } } &.returned { background-color: #f5f5f5; .status-text { color: #999999; } } }
.status-text { font-size: 22rpx; }
.vehicle-brand { font-size: 26rpx; color: #666666; margin-bottom: 4rpx; display: block; }
.vehicle-owner { font-size: 24rpx; color: #999999; }
.vehicle-actions { display: flex; align-items: center; gap: 16rpx; }
.history-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; background-color: #f0f0f0; border-radius: 28rpx; }
.history-icon { font-size: 28rpx; }
.vehicle-arrow { padding-left: 16rpx; }
.arrow-icon { font-size: 36rpx; color: #cccccc; }
.stats-footer { padding: 24rpx; text-align: center; }
.stats-text { font-size: 26rpx; color: #999999; }
</style>
