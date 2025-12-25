<template>
  <!-- 
    车辆租金编辑页面
    编辑车辆的租赁信息，包括出租方、承租方、租金等
    Requirements: 8.4
  -->
  <view class="rental-edit-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 车辆信息卡片 -->
      <view v-if="vehicle" class="vehicle-card">
        <view class="vehicle-icon">
          <text class="icon-text">🚗</text>
        </view>
        <view class="vehicle-info">
          <text class="license-plate">{{ vehicle.license_plate }}</text>
          <text class="vehicle-model">{{ vehicle.brand }} {{ vehicle.model }}</text>
        </view>
      </view>

      <!-- 租赁信息表单 -->
      <view class="form-section">
        <view class="section-title">
          <text class="title-text">出租方信息</text>
        </view>
        
        <!-- 出租方名称 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">出租方名称</text>
          </view>
          <input
            v-model="formData.lessor_name"
            type="text"
            class="form-input"
            placeholder="请输入出租方名称"
          />
        </view>
        
        <!-- 出租方联系方式 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">联系方式</text>
          </view>
          <input
            v-model="formData.lessor_contact"
            type="text"
            class="form-input"
            placeholder="请输入出租方联系方式"
          />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">
          <text class="title-text">承租方信息</text>
        </view>
        
        <!-- 承租方名称 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">承租方名称</text>
          </view>
          <input
            v-model="formData.lessee_name"
            type="text"
            class="form-input"
            placeholder="请输入承租方名称"
          />
        </view>
        
        <!-- 承租方联系方式 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">联系方式</text>
          </view>
          <input
            v-model="formData.lessee_contact"
            type="text"
            class="form-input"
            placeholder="请输入承租方联系方式"
          />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">
          <text class="title-text">租金信息</text>
        </view>
        
        <!-- 月租金 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">月租金（元）</text>
          </view>
          <input
            v-model="formData.monthly_rent"
            type="digit"
            class="form-input"
            placeholder="请输入月租金"
          />
        </view>
        
        <!-- 租金支付日 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">每月支付日</text>
          </view>
          <picker
            mode="selector"
            :range="dayOptions"
            @change="handleDayChange"
          >
            <view class="picker-value">
              <text class="picker-text">
                {{ formData.rent_payment_day ? `每月${formData.rent_payment_day}日` : '请选择支付日' }}
              </text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">
          <text class="title-text">租期信息</text>
        </view>
        
        <!-- 租期开始日期 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">租期开始</text>
          </view>
          <picker
            mode="date"
            :value="formData.lease_start_date"
            @change="handleStartDateChange"
          >
            <view class="picker-value">
              <text class="picker-text">
                {{ formData.lease_start_date || '请选择开始日期' }}
              </text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        
        <!-- 租期结束日期 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">租期结束</text>
          </view>
          <picker
            mode="date"
            :value="formData.lease_end_date"
            :start="formData.lease_start_date"
            @change="handleEndDateChange"
          >
            <view class="picker-value">
              <text class="picker-text">
                {{ formData.lease_end_date || '请选择结束日期' }}
              </text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 租赁状态信息（只读） -->
      <view v-if="leaseInfo" class="info-section">
        <view class="section-title">
          <text class="title-text">租赁状态</text>
        </view>
        <view class="info-list">
          <view class="info-item">
            <text class="info-label">下次付款日</text>
            <text class="info-value">{{ leaseInfo.next_payment_date || '未设置' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">距付款日</text>
            <text :class="['info-value', getDaysClass(leaseInfo.days_until_payment)]">
              {{ formatDaysUntilPayment(leaseInfo.days_until_payment) }}
            </text>
          </view>
          <view class="info-item">
            <text class="info-label">租赁状态</text>
            <view :class="['status-tag', getLeaseStatusClass(leaseInfo.lease_status)]">
              <text class="status-text">{{ getLeaseStatusText(leaseInfo.lease_status) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-section">
        <view class="btn primary-btn" @click="handleSubmit">
          <text class="btn-text">保存租赁信息</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆租金编辑页面
 * 编辑车辆的租赁信息，包括出租方、承租方、租金等
 * 
 * @requirements 8.4 - 车辆租金编辑页面
 */

import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getVehicle, getVehicleLease, updateVehicleLease } from '@/api'
import type { Vehicle, VehicleLease, VehicleLeaseUpdate } from '@/api/types'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 车辆ID */
const vehicleId = ref<number>(0)

/** 车辆信息 */
const vehicle = ref<Vehicle | null>(null)

/** 租赁信息 */
const leaseInfo = ref<VehicleLease | null>(null)

/** 表单数据 */
const formData = reactive({
  lessor_name: '',
  lessor_contact: '',
  lessee_name: '',
  lessee_contact: '',
  monthly_rent: '',
  rent_payment_day: 0,
  lease_start_date: '',
  lease_end_date: '',
})

/** 日期选项（1-28日） */
const dayOptions = Array.from({ length: 28 }, (_, i) => `每月${i + 1}日`)

// ==================== 生命周期 ====================

onLoad((options) => {
  // 获取页面参数
  if (options?.id) {
    vehicleId.value = parseInt(options.id as string, 10)
  }
})

onMounted(() => {
  if (vehicleId.value) {
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
    // 并行加载车辆信息和租赁信息
    const [vehicleData, leaseData] = await Promise.all([
      getVehicle(vehicleId.value),
      getVehicleLease(vehicleId.value).catch(() => null),
    ])
    
    vehicle.value = vehicleData
    leaseInfo.value = leaseData
    
    // 填充表单
    if (leaseData) {
      formData.lessor_name = leaseData.lessor_name || ''
      formData.lessor_contact = leaseData.lessor_contact || ''
      formData.lessee_name = leaseData.lessee_name || ''
      formData.lessee_contact = leaseData.lessee_contact || ''
      formData.monthly_rent = leaseData.monthly_rent ? String(leaseData.monthly_rent) : ''
      formData.rent_payment_day = leaseData.rent_payment_day || 0
      formData.lease_start_date = leaseData.lease_start_date || ''
      formData.lease_end_date = leaseData.lease_end_date || ''
    }
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
 * 处理支付日选择
 * 
 * @param e - 事件对象
 */
function handleDayChange(e: { detail: { value: number } }): void {
  formData.rent_payment_day = e.detail.value + 1
}

/**
 * 处理开始日期选择
 * 
 * @param e - 事件对象
 */
function handleStartDateChange(e: { detail: { value: string } }): void {
  formData.lease_start_date = e.detail.value
}

/**
 * 处理结束日期选择
 * 
 * @param e - 事件对象
 */
function handleEndDateChange(e: { detail: { value: string } }): void {
  formData.lease_end_date = e.detail.value
}

/**
 * 提交表单
 */
async function handleSubmit(): Promise<void> {
  try {
    uni.showLoading({ title: '保存中...' })
    
    const updateData: VehicleLeaseUpdate = {}
    
    // 只提交有值的字段
    if (formData.lessor_name.trim()) {
      updateData.lessor_name = formData.lessor_name.trim()
    }
    if (formData.lessor_contact.trim()) {
      updateData.lessor_contact = formData.lessor_contact.trim()
    }
    if (formData.lessee_name.trim()) {
      updateData.lessee_name = formData.lessee_name.trim()
    }
    if (formData.lessee_contact.trim()) {
      updateData.lessee_contact = formData.lessee_contact.trim()
    }
    if (formData.monthly_rent) {
      const rent = parseFloat(formData.monthly_rent)
      if (!isNaN(rent) && rent >= 0) {
        updateData.monthly_rent = rent
      }
    }
    if (formData.rent_payment_day > 0) {
      updateData.rent_payment_day = formData.rent_payment_day
    }
    if (formData.lease_start_date) {
      updateData.lease_start_date = formData.lease_start_date
    }
    if (formData.lease_end_date) {
      updateData.lease_end_date = formData.lease_end_date
    }
    
    await updateVehicleLease(vehicleId.value, updateData)
    
    uni.hideLoading()
    uni.showToast({
      title: '保存成功',
      icon: 'success',
    })
    
    // 刷新数据
    await loadData()
  } catch (error) {
    console.error('保存失败:', error)
    uni.hideLoading()
    uni.showToast({
      title: '保存失败',
      icon: 'none',
    })
  }
}

/**
 * 格式化距付款日天数
 * 
 * @param days - 天数
 * @returns 格式化后的文本
 */
function formatDaysUntilPayment(days: number | null): string {
  if (days === null || days === undefined) return '未设置'
  if (days < 0) return `已逾期${Math.abs(days)}天`
  if (days === 0) return '今天'
  return `${days}天后`
}

/**
 * 获取天数样式类
 * 
 * @param days - 天数
 * @returns 样式类名
 */
function getDaysClass(days: number | null): string {
  if (days === null || days === undefined) return ''
  if (days < 0) return 'danger'
  if (days <= 7) return 'warning'
  return ''
}

/**
 * 获取租赁状态文本
 * 
 * @param status - 状态值
 * @returns 状态文本
 */
function getLeaseStatusText(status: string | null): string {
  const map: Record<string, string> = {
    active: '租赁中',
    expired: '已到期',
    pending: '待生效',
  }
  return status ? (map[status] || status) : '未设置'
}

/**
 * 获取租赁状态样式类
 * 
 * @param status - 状态值
 * @returns 样式类名
 */
function getLeaseStatusClass(status: string | null): string {
  const map: Record<string, string> = {
    active: 'active',
    expired: 'expired',
    pending: 'pending',
  }
  return status ? (map[status] || '') : ''
}
</script>

<style lang="scss" scoped>
.rental-edit-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
}

/* 加载状态 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* 车辆信息卡片 */
.vehicle-card {
  display: flex;
  align-items: center;
  padding: 32rpx 24rpx;
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
}

.vehicle-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 16rpx;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.icon-text {
  font-size: 48rpx;
}

.vehicle-info {
  flex: 1;
}

.license-plate {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  display: block;
  margin-bottom: 8rpx;
}

.vehicle-model {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 表单区域 */
.form-section {
  background-color: #ffffff;
  margin: 24rpx 24rpx 0;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.section-title {
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 20rpx;
}

.title-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
}

.form-item {
  margin-bottom: 24rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  margin-bottom: 12rpx;
}

.label-text {
  font-size: 26rpx;
  color: #666666;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333333;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
}

.picker-text {
  font-size: 28rpx;
  color: #333333;
}

.picker-arrow {
  font-size: 20rpx;
  color: #999999;
}

/* 信息区域 */
.info-section {
  background-color: #ffffff;
  margin: 24rpx 24rpx 0;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 26rpx;
  color: #999999;
}

.info-value {
  font-size: 26rpx;
  color: #333333;
  
  &.danger {
    color: #ff4d4f;
    font-weight: bold;
  }
  
  &.warning {
    color: #faad14;
    font-weight: bold;
  }
}

.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  
  &.active {
    background-color: #e6f7e6;
    
    .status-text {
      color: #52c41a;
    }
  }
  
  &.expired {
    background-color: #fff1f0;
    
    .status-text {
      color: #ff4d4f;
    }
  }
  
  &.pending {
    background-color: #fff7e6;
    
    .status-text {
      color: #faad14;
    }
  }
}

.status-text {
  font-size: 22rpx;
}

/* 操作按钮 */
.action-section {
  padding: 24rpx;
  margin-top: 24rpx;
}

.btn {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}

.primary-btn {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  
  .btn-text {
    color: #ffffff;
    font-weight: bold;
  }
}

.btn-text {
  font-size: 32rpx;
}
</style>
