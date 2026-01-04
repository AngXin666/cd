<template>
  <!-- 
    老板端 - 待审批页面
    功能：整合请假、离职、车辆审批功能
    3个标签页：请假、离职、车辆审批
  -->
  <view class="approval-page">
    <!-- 标签页切换 -->
    <view class="tab-switcher">
      <view
        :class="['tab-item', { active: activeTab === 'LEAVE' }]"
        @click="handleTabChange('LEAVE')"
      >
        <text class="tab-icon">🏖️</text>
        <text class="tab-label">请假</text>
        <view v-if="leaveCount > 0" class="badge">{{ leaveCount }}</view>
      </view>
      <view
        :class="['tab-item', { active: activeTab === 'RESIGN' }]"
        @click="handleTabChange('RESIGN')"
      >
        <text class="tab-icon">👋</text>
        <text class="tab-label">离职</text>
        <view v-if="resignCount > 0" class="badge">{{ resignCount }}</view>
      </view>
      <view
        :class="['tab-item', { active: activeTab === 'VEHICLE' }]"
        @click="handleTabChange('VEHICLE')"
      >
        <text class="tab-icon">🚗</text>
        <text class="tab-label">车辆审批</text>
        <view v-if="vehicleCount > 0" class="badge">{{ vehicleCount }}</view>
      </view>
    </view>

    <!-- 请假标签页 -->
    <view v-if="activeTab === 'LEAVE'" class="leave-tab">
      <!-- 筛选标签 -->
      <view class="filter-tabs">
        <view
          v-for="tab in leaveFilterTabs"
          :key="tab.value"
          :class="['filter-tab', { active: leaveFilter === tab.value }]"
          @click="leaveFilter = tab.value"
        >
          <text class="tab-text">{{ tab.label }}</text>
          <text v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="filteredLeaveApplications.length === 0" class="empty-container">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无请假申请</text>
      </view>

      <!-- 申请列表 -->
      <view v-else class="application-list">
        <view
          v-for="application in filteredLeaveApplications"
          :key="application.id"
          class="application-card"
          @click="handleCardClick(application)"
        >
          <!-- 申请人信息 -->
          <view class="applicant-info">
            <view class="applicant-avatar">
              <text class="avatar-text">{{ (application.user_name || '用户').charAt(0) }}</text>
            </view>
            <view class="applicant-detail">
              <view class="applicant-name-row">
                <text class="applicant-name">{{ application.user_name || '未知用户' }}</text>
                <view class="type-tag leave">
                  <text class="type-text">请假</text>
                </view>
              </view>
              <text class="warehouse-name" v-if="application.warehouse_name">{{ application.warehouse_name }}</text>
              <text class="apply-time">申请时间：{{ formatDateTime(application.created_at) }}</text>
            </view>
          </view>

          <!-- 请假信息 -->
          <view class="leave-info">
            <view class="date-range">
              <text class="date-label">请假时间</text>
              <text class="date-value">{{ formatDate(application.start_date) }} 至 {{ formatDate(application.end_date) }}</text>
            </view>
            <view v-if="application.reason" class="reason">
              <text class="reason-label">请假原因</text>
              <text class="reason-value">{{ application.reason }}</text>
            </view>
          </view>

          <!-- 状态和操作 -->
          <view class="card-footer">
            <view :class="['status-tag', application.status]">
              <text class="status-text">{{ getStatusName(application.status) }}</text>
            </view>
            <view v-if="application.status === 'pending'" class="quick-actions">
              <view class="action-btn reject" @click.stop="handleQuickReject(application)">
                <text class="btn-text">拒绝</text>
              </view>
              <view class="action-btn approve" @click.stop="handleQuickApprove(application)">
                <text class="btn-text">同意</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 离职标签页 -->
    <view v-if="activeTab === 'RESIGN'" class="resign-tab">
      <!-- 筛选标签 -->
      <view class="filter-tabs">
        <view
          v-for="tab in resignFilterTabs"
          :key="tab.value"
          :class="['filter-tab', { active: resignFilter === tab.value }]"
          @click="resignFilter = tab.value"
        >
          <text class="tab-text">{{ tab.label }}</text>
          <text v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="filteredResignApplications.length === 0" class="empty-container">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无离职申请</text>
      </view>

      <!-- 申请列表 -->
      <view v-else class="application-list">
        <view
          v-for="application in filteredResignApplications"
          :key="application.id"
          class="application-card"
          @click="handleCardClick(application)"
        >
          <!-- 申请人信息 -->
          <view class="applicant-info">
            <view class="applicant-avatar resign">
              <text class="avatar-text">{{ (application.user_name || '用户').charAt(0) }}</text>
            </view>
            <view class="applicant-detail">
              <view class="applicant-name-row">
                <text class="applicant-name">{{ application.user_name || '未知用户' }}</text>
                <view class="type-tag resign">
                  <text class="type-text">离职</text>
                </view>
              </view>
              <text class="warehouse-name" v-if="application.warehouse_name">{{ application.warehouse_name }}</text>
              <text class="apply-time">申请时间：{{ formatDateTime(application.created_at) }}</text>
            </view>
          </view>

          <!-- 离职信息 -->
          <view class="leave-info">
            <view class="date-range">
              <text class="date-label">离职日期</text>
              <text class="date-value">{{ formatDate(application.start_date) }}</text>
            </view>
            <view v-if="application.reason" class="reason">
              <text class="reason-label">离职原因</text>
              <text class="reason-value">{{ application.reason }}</text>
            </view>
          </view>

          <!-- 状态和操作 -->
          <view class="card-footer">
            <view :class="['status-tag', application.status]">
              <text class="status-text">{{ getStatusName(application.status) }}</text>
            </view>
            <view v-if="application.status === 'pending'" class="quick-actions">
              <view class="action-btn reject" @click.stop="handleQuickReject(application)">
                <text class="btn-text">拒绝</text>
              </view>
              <view class="action-btn approve" @click.stop="handleQuickApprove(application)">
                <text class="btn-text">同意</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 车辆审批标签页 -->
    <view v-if="activeTab === 'VEHICLE'" class="vehicle-tab">
      <!-- 筛选标签 -->
      <view class="filter-tabs">
        <view
          v-for="tab in vehicleFilterTabs"
          :key="tab.value"
          :class="['filter-tab', { active: vehicleFilter === tab.value }]"
          @click="vehicleFilter = tab.value"
        >
          <text class="tab-text">{{ tab.label }}</text>
          <text v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loadingVehicles" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="filteredVehicles.length === 0" class="empty-container">
        <text class="empty-icon">🚗</text>
        <text class="empty-text">暂无车辆审批</text>
      </view>

      <!-- 车辆列表 -->
      <view v-else class="vehicle-list">
        <view
          v-for="vehicle in filteredVehicles"
          :key="vehicle.id"
          class="vehicle-card"
          @click="handleVehicleClick(vehicle)"
        >
          <!-- 车辆信息 -->
          <view class="vehicle-info">
            <view class="vehicle-avatar">
              <text class="avatar-text">🚗</text>
            </view>
            <view class="vehicle-detail">
              <view class="vehicle-plate-row">
                <text class="vehicle-plate">{{ vehicle.license_plate }}</text>
                <view :class="['review-tag', vehicle.review_status]">
                  <text class="review-text">{{ getReviewStatusName(vehicle.review_status) }}</text>
                </view>
              </view>
              <text class="vehicle-brand">{{ vehicle.brand || '' }} {{ vehicle.model || '' }}</text>
              <text class="vehicle-driver">司机：{{ vehicle.user_name || '未分配' }}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view v-if="vehicle.review_status === 'pending_review'" class="card-footer">
            <view class="quick-actions">
              <view class="action-btn supplement" @click.stop="handleVehicleSupplement(vehicle)">
                <text class="btn-text">需补充</text>
              </view>
              <view class="action-btn approve" @click.stop="handleVehicleApprove(vehicle)">
                <text class="btn-text">通过</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 老板端 - 待审批页面
 * 功能：整合请假、离职、车辆审批功能
 * 3个标签页：请假、离职、车辆审批
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getLeaveApplications, approveLeaveApplication, getVehicles, updateVehicle } from '@/api'
import type { LeaveApplication, Vehicle } from '@/api/types'
import { LeaveStatus, LeaveType, VehicleStatus } from '@/api/types'
import { formatDate, formatDateTime } from '@/utils'
import { sseService } from '@/utils/sse'
import type { LeaveUpdateEvent, LeaveData } from '@/types/sse-events'

// ==================== 类型定义 ====================

type TabType = 'LEAVE' | 'RESIGN' | 'VEHICLE'
type FilterType = 'all' | 'pending' | 'approved' | 'rejected'
type VehicleFilterType = 'all' | 'pending_review' | 'need_supplement' | 'approved'

// ==================== 状态 ====================

const loading = ref(false)
const loadingVehicles = ref(false)
const applications = ref<LeaveApplication[]>([])
const vehicles = ref<Vehicle[]>([])
const activeTab = ref<TabType>('LEAVE')
const leaveFilter = ref<FilterType>('pending')
const resignFilter = ref<FilterType>('pending')
const vehicleFilter = ref<VehicleFilterType>('pending_review')

// ==================== 计算属性 ====================

/** 请假申请（类型为 leave） */
const leaveApplications = computed(() => 
  applications.value.filter(a => a.leave_type === LeaveType.LEAVE)
)

/** 离职申请（类型为 resign） */
const resignApplications = computed(() => 
  applications.value.filter(a => a.leave_type === LeaveType.RESIGN)
)

/** 待审批请假数量 */
const leaveCount = computed(() => 
  leaveApplications.value.filter(a => a.status === LeaveStatus.PENDING).length
)

/** 待审批离职数量 */
const resignCount = computed(() => 
  resignApplications.value.filter(a => a.status === LeaveStatus.PENDING).length
)

/** 待审批车辆数量 */
const vehicleCount = computed(() => 
  vehicles.value.filter(v => v.review_status === 'pending_review').length
)

/** 请假筛选标签 */
const leaveFilterTabs = computed(() => [
  { label: '待审批', value: 'pending' as const, count: leaveApplications.value.filter(a => a.status === LeaveStatus.PENDING).length },
  { label: '已批准', value: 'approved' as const, count: leaveApplications.value.filter(a => a.status === LeaveStatus.APPROVED).length },
  { label: '已拒绝', value: 'rejected' as const, count: leaveApplications.value.filter(a => a.status === LeaveStatus.REJECTED).length },
  { label: '全部', value: 'all' as const, count: leaveApplications.value.length },
])

/** 离职筛选标签 */
const resignFilterTabs = computed(() => [
  { label: '待审批', value: 'pending' as const, count: resignApplications.value.filter(a => a.status === LeaveStatus.PENDING).length },
  { label: '已批准', value: 'approved' as const, count: resignApplications.value.filter(a => a.status === LeaveStatus.APPROVED).length },
  { label: '已拒绝', value: 'rejected' as const, count: resignApplications.value.filter(a => a.status === LeaveStatus.REJECTED).length },
  { label: '全部', value: 'all' as const, count: resignApplications.value.length },
])

/** 车辆筛选标签 */
const vehicleFilterTabs = computed(() => [
  { label: '待审核', value: 'pending_review' as const, count: vehicles.value.filter(v => v.review_status === 'pending_review').length },
  { label: '需补充', value: 'need_supplement' as const, count: vehicles.value.filter(v => v.review_status === 'need_supplement').length },
  { label: '已通过', value: 'approved' as const, count: vehicles.value.filter(v => v.review_status === 'approved').length },
  { label: '全部', value: 'all' as const, count: vehicles.value.length },
])

/** 筛选后的请假申请（按仓库排序） */
const filteredLeaveApplications = computed(() => {
  let filtered = leaveApplications.value
  if (leaveFilter.value !== 'all') {
    const statusMap: Record<string, LeaveStatus> = { pending: LeaveStatus.PENDING, approved: LeaveStatus.APPROVED, rejected: LeaveStatus.REJECTED }
    filtered = filtered.filter(a => a.status === statusMap[leaveFilter.value])
  }
  // 按仓库名称排序（无仓库的排在最后）
  return [...filtered].sort((a, b) => {
    const warehouseA = a.warehouse_name || 'zzz'
    const warehouseB = b.warehouse_name || 'zzz'
    return warehouseA.localeCompare(warehouseB, 'zh-CN')
  })
})

/** 筛选后的离职申请（按仓库排序） */
const filteredResignApplications = computed(() => {
  let filtered = resignApplications.value
  if (resignFilter.value !== 'all') {
    const statusMap: Record<string, LeaveStatus> = { pending: LeaveStatus.PENDING, approved: LeaveStatus.APPROVED, rejected: LeaveStatus.REJECTED }
    filtered = filtered.filter(a => a.status === statusMap[resignFilter.value])
  }
  // 按仓库名称排序（无仓库的排在最后）
  return [...filtered].sort((a, b) => {
    const warehouseA = a.warehouse_name || 'zzz'
    const warehouseB = b.warehouse_name || 'zzz'
    return warehouseA.localeCompare(warehouseB, 'zh-CN')
  })
})

/** 筛选后的车辆 */
const filteredVehicles = computed(() => {
  if (vehicleFilter.value === 'all') return vehicles.value
  return vehicles.value.filter(v => v.review_status === vehicleFilter.value)
})

// ==================== 生命周期 ====================

onMounted(() => { 
  loadData()
  registerSSECallbacks()
})

onUnmounted(() => {
  unregisterSSECallbacks()
})

onShow(() => { loadData() })

// ==================== SSE 实时更新 ====================

function registerSSECallbacks(): void {
  sseService.setCallbacks({ onLeaveUpdate: handleLeaveUpdate })
}

function unregisterSSECallbacks(): void {
  sseService.setCallbacks({ onLeaveUpdate: undefined })
}

function handleLeaveUpdate(event: LeaveUpdateEvent): void {
  const { action, leave: leaveData } = event
  const newApplication = convertLeaveDataToApplication(leaveData)
  
  const existingIndex = applications.value.findIndex(a => a.id === leaveData.id)
  if (existingIndex >= 0) {
    applications.value[existingIndex] = newApplication
  } else if (action === 'create') {
    applications.value.unshift(newApplication)
    uni.showToast({ title: '收到新的审批申请', icon: 'none', duration: 2000 })
  }
}

function convertLeaveDataToApplication(leaveData: LeaveData): LeaveApplication {
  return {
    id: leaveData.id,
    user_id: leaveData.user_id,
    leave_type: leaveData.leave_type as LeaveType,
    start_date: leaveData.start_date,
    end_date: leaveData.end_date,
    status: leaveData.status as LeaveStatus,
    reason: leaveData.reason,
    approver_id: leaveData.approver_id,
    approve_remark: leaveData.approve_remark,
    created_at: leaveData.created_at,
    updated_at: leaveData.updated_at,
  }
}

// ==================== 方法 ====================

async function loadData(): Promise<void> {
  await Promise.all([loadApplications(), loadVehicles()])
}

async function loadApplications(): Promise<void> {
  loading.value = true
  try {
    const data = await getLeaveApplications()
    applications.value = data
  } catch (error) {
    console.error('加载申请列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadVehicles(): Promise<void> {
  loadingVehicles.value = true
  try {
    const data = await getVehicles()
    // 只显示有审核状态的车辆
    vehicles.value = data.filter(v => v.review_status)
  } catch (error) {
    console.error('加载车辆列表失败:', error)
  } finally {
    loadingVehicles.value = false
  }
}

function handleTabChange(tab: TabType): void {
  activeTab.value = tab
}

function handleCardClick(application: LeaveApplication): void {
  uni.navigateTo({ url: `/pages/boss/approval/leave-detail?id=${application.id}` })
}

function handleVehicleClick(vehicle: Vehicle): void {
  uni.navigateTo({ url: `/pages/boss/vehicles/detail?id=${vehicle.id}` })
}

function getStatusName(status: LeaveStatus): string {
  const statusMap: Record<LeaveStatus, string> = { 
    [LeaveStatus.PENDING]: '待审批', 
    [LeaveStatus.APPROVED]: '已批准', 
    [LeaveStatus.REJECTED]: '已拒绝' 
  }
  return statusMap[status] || '未知'
}

function getReviewStatusName(status: string | undefined): string {
  const statusMap: Record<string, string> = {
    'drafting': '草稿',
    'pending_review': '待审核',
    'need_supplement': '需补充',
    'approved': '已通过',
  }
  return statusMap[status || ''] || '未知'
}

function handleQuickApprove(application: LeaveApplication): void {
  const typeName = application.leave_type === LeaveType.LEAVE ? '请假' : '离职'
  uni.showModal({
    title: '确认批准',
    content: `确定批准 ${application.user_name || '该用户'} 的${typeName}申请吗？`,
    success: async (res) => { if (res.confirm) await doApprove(application.id, LeaveStatus.APPROVED) },
  })
}

function handleQuickReject(application: LeaveApplication): void {
  const typeName = application.leave_type === LeaveType.LEAVE ? '请假' : '离职'
  uni.showModal({
    title: '确认拒绝',
    content: `确定拒绝 ${application.user_name || '该用户'} 的${typeName}申请吗？`,
    confirmColor: '#ff4d4f',
    success: async (res) => { if (res.confirm) await doApprove(application.id, LeaveStatus.REJECTED) },
  })
}

async function doApprove(id: number, status: LeaveStatus): Promise<void> {
  try {
    uni.showLoading({ title: '处理中...' })
    await approveLeaveApplication(id, { status })
    uni.hideLoading()
    uni.showToast({ title: status === LeaveStatus.APPROVED ? '已批准' : '已拒绝', icon: 'success' })
    await loadApplications()
  } catch (error) {
    console.error('审批失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function handleVehicleApprove(vehicle: Vehicle): Promise<void> {
  uni.showModal({
    title: '确认通过',
    content: `确定通过车辆 ${vehicle.license_plate} 的审核吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })
          await updateVehicle(vehicle.id, { review_status: 'approved' } as any)
          uni.hideLoading()
          uni.showToast({ title: '已通过', icon: 'success' })
          await loadVehicles()
        } catch (error) {
          console.error('审核失败:', error)
          uni.hideLoading()
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleVehicleSupplement(vehicle: Vehicle): Promise<void> {
  uni.showModal({
    title: '需要补充资料',
    content: `确定将车辆 ${vehicle.license_plate} 标记为需补充资料吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })
          await updateVehicle(vehicle.id, { review_status: 'need_supplement' } as any)
          uni.hideLoading()
          uni.showToast({ title: '已标记', icon: 'success' })
          await loadVehicles()
        } catch (error) {
          console.error('操作失败:', error)
          uni.hideLoading()
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.approval-page { min-height: 100vh; background-color: #f5f5f5; }

/* 标签页切换 */
.tab-switcher {
  display: flex;
  background-color: #ffffff;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 16rpx;
  border-radius: 12rpx;
  margin: 0 8rpx;
  background-color: #f5f5f5;
  position: relative;
  
  &.active {
    background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
    .tab-icon, .tab-label { color: #ffffff; }
  }
}

.tab-icon { font-size: 32rpx; margin-right: 8rpx; color: #666666; }
.tab-label { font-size: 28rpx; color: #666666; }

.badge {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: #EF4444;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  font-size: 20rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  background-color: #ffffff;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-tab {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  margin-right: 16rpx;
  border-radius: 32rpx;
  background-color: #f5f5f5;
  
  &.active {
    background-color: #e6f7ff;
    .tab-text { color: #1890ff; }
    .tab-count { background-color: #1890ff; color: #ffffff; }
  }
}

.tab-text { font-size: 26rpx; color: #666666; }
.tab-count {
  font-size: 22rpx;
  color: #999999;
  background-color: #e0e0e0;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-left: 8rpx;
}

/* 加载和空状态 */
.loading-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text { font-size: 28rpx; color: #999999; }
.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; }

/* 申请列表 */
.application-list, .vehicle-list { padding: 24rpx; }

.application-card, .vehicle-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

/* 申请人信息 */
.applicant-info, .vehicle-info {
  display: flex;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.applicant-avatar, .vehicle-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  
  &.resign {
    background: linear-gradient(135deg, #fa8c16 0%, #ffa940 100%);
  }
}

.avatar-text { font-size: 32rpx; font-weight: bold; color: #ffffff; }

.applicant-detail, .vehicle-detail { flex: 1; }

.applicant-name-row, .vehicle-plate-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.applicant-name, .vehicle-plate {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  margin-right: 12rpx;
}

.vehicle-brand, .vehicle-driver {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 4rpx;
}

/* 类型标签 */
.type-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  
  &.leave {
    background-color: #e6f7ff;
    .type-text { color: #1890ff; }
  }
  
  &.resign {
    background-color: #fff2e8;
    .type-text { color: #fa8c16; }
  }
}

.type-text { font-size: 22rpx; }

/* 审核状态标签 */
.review-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  
  &.pending_review {
    background-color: #fff7e6;
    .review-text { color: #faad14; }
  }
  
  &.need_supplement {
    background-color: #fff1f0;
    .review-text { color: #ff4d4f; }
  }
  
  &.approved {
    background-color: #e6f7e6;
    .review-text { color: #52c41a; }
  }
}

.review-text { font-size: 22rpx; }

.apply-time { font-size: 24rpx; color: #999999; }

.warehouse-name { 
  font-size: 24rpx; 
  color: #1890ff; 
  margin-bottom: 4rpx;
  display: block;
}

/* 请假信息 */
.leave-info { padding: 20rpx 0; }

.date-range { margin-bottom: 12rpx; }
.date-label { font-size: 24rpx; color: #999999; margin-right: 12rpx; }
.date-value { font-size: 26rpx; color: #333333; }

.reason { display: flex; flex-wrap: wrap; }
.reason-label { font-size: 24rpx; color: #999999; margin-right: 12rpx; }
.reason-value { font-size: 26rpx; color: #666666; flex: 1; }

/* 卡片底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

/* 状态标签 */
.status-tag {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  
  &.pending {
    background-color: #fff7e6;
    .status-text { color: #faad14; }
  }
  
  &.approved {
    background-color: #e6f7e6;
    .status-text { color: #52c41a; }
  }
  
  &.rejected {
    background-color: #fff1f0;
    .status-text { color: #ff4d4f; }
  }
}

.status-text { font-size: 24rpx; }

/* 快捷操作 */
.quick-actions { display: flex; }

.action-btn {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;
  
  &.reject {
    background-color: #fff1f0;
    .btn-text { color: #ff4d4f; }
  }
  
  &.approve {
    background-color: #e6f7e6;
    .btn-text { color: #52c41a; }
  }
  
  &.supplement {
    background-color: #fff7e6;
    .btn-text { color: #faad14; }
  }
}

.btn-text { font-size: 26rpx; }
</style>
