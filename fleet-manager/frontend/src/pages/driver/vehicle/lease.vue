<template>
  <!-- 
    车辆租赁信息页面
    显示和编辑车辆的租赁信息
  -->
  <view class="lease-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 租赁信息不存在 -->
    <view v-else-if="!leaseInfo" class="empty-container">
      <text class="empty-icon">📋</text>
      <text class="empty-text">无法获取租赁信息</text>
    </view>

    <!-- 租赁信息 -->
    <view v-else class="lease-content">
      <!-- 状态卡片 -->
      <view class="status-card">
        <view class="status-icon">
          <text class="icon-text">🚗</text>
        </view>
        <view class="status-info">
          <text class="license-plate">{{ leaseInfo.license_plate }}</text>
          <view :class="['status-tag', leaseInfo.lease_status || 'none']">
            <text class="status-text">{{ getLeaseStatusText(leaseInfo.lease_status) }}</text>
          </view>
        </view>
      </view>

      <!-- 租金提醒 -->
      <view v-if="leaseInfo.next_payment_date" class="reminder-card">
        <view class="reminder-icon">💰</view>
        <view class="reminder-content">
          <text class="reminder-title">下次缴租日期</text>
          <text class="reminder-date">{{ leaseInfo.next_payment_date }}</text>
          <text v-if="leaseInfo.days_until_payment !== null" class="reminder-days">
            {{ leaseInfo.days_until_payment <= 0 ? '已到期' : `还有 ${leaseInfo.days_until_payment} 天` }}
          </text>
        </view>
        <view v-if="leaseInfo.monthly_rent" class="reminder-amount">
          <text class="amount-label">月租金</text>
          <text class="amount-value">¥{{ leaseInfo.monthly_rent }}</text>
        </view>
      </view>

      <!-- 租赁信息表单 -->
      <view class="form-section">
        <view class="section-title">租赁信息</view>
        
        <!-- 出租方信息 -->
        <view class="form-group">
          <text class="group-title">出租方</text>
          <view class="form-item">
            <text class="form-label">名称</text>
            <input 
              class="form-input"
              v-model="editForm.lessor_name"
              placeholder="请输入出租方名称"
            />
          </view>
          <view class="form-item">
            <text class="form-label">联系方式</text>
            <input 
              class="form-input"
              v-model="editForm.lessor_contact"
              placeholder="请输入联系方式"
            />
          </view>
        </view>

        <!-- 承租方信息 -->
        <view class="form-group">
          <text class="group-title">承租方</text>
          <view class="form-item">
            <text class="form-label">名称</text>
            <input 
              class="form-input"
              v-model="editForm.lessee_name"
              placeholder="请输入承租方名称"
            />
          </view>
          <view class="form-item">
            <text class="form-label">联系方式</text>
            <input 
              class="form-input"
              v-model="editForm.lessee_contact"
              placeholder="请输入联系方式"
            />
          </view>
        </view>

        <!-- 租金信息 -->
        <view class="form-group">
          <text class="group-title">租金信息</text>
          <view class="form-item">
            <text class="form-label">月租金(元)</text>
            <input 
              class="form-input"
              type="digit"
              v-model="editForm.monthly_rent"
              placeholder="请输入月租金"
            />
          </view>
          <view class="form-item">
            <text class="form-label">缴纳日</text>
            <input 
              class="form-input"
              type="number"
              v-model="editForm.rent_payment_day"
              placeholder="每月几号缴纳(1-31)"
            />
          </view>
        </view>

        <!-- 租期信息 -->
        <view class="form-group">
          <text class="group-title">租期</text>
          <view class="form-item">
            <text class="form-label">开始日期</text>
            <picker 
              mode="date" 
              :value="editForm.lease_start_date"
              @change="onStartDateChange"
            >
              <view class="form-picker">
                <text :class="editForm.lease_start_date ? 'picker-value' : 'picker-placeholder'">
                  {{ editForm.lease_start_date || '请选择开始日期' }}
                </text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">结束日期</text>
            <picker 
              mode="date" 
              :value="editForm.lease_end_date"
              @change="onEndDateChange"
            >
              <view class="form-picker">
                <text :class="editForm.lease_end_date ? 'picker-value' : 'picker-placeholder'">
                  {{ editForm.lease_end_date || '请选择结束日期' }}
                </text>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <!-- 保存按钮 -->
      <view class="save-btn" @click="handleSave">
        <text class="btn-text">{{ saving ? '保存中...' : '保存修改' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆租赁信息页面
 * 显示和编辑车辆的租赁信息
 */

import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getVehicleLease, updateVehicleLease } from '@/api'
import type { VehicleLease } from '@/api/types'

// ==================== 状态 ====================

/** 车辆ID */
const vehicleId = ref(0)

/** 租赁信息 */
const leaseInfo = ref<VehicleLease | null>(null)

/** 加载状态 */
const loading = ref(false)

/** 保存状态 */
const saving = ref(false)

/** 编辑表单 */
const editForm = reactive({
  lessor_name: '',
  lessor_contact: '',
  lessee_name: '',
  lessee_contact: '',
  monthly_rent: '',
  rent_payment_day: '',
  lease_start_date: '',
  lease_end_date: '',
})

// ==================== 生命周期 ====================

onLoad((options) => {
  if (options?.id) {
    vehicleId.value = Number(options.id)
    loadLeaseInfo()
  }
})

// ==================== 方法 ====================

/**
 * 获取租赁状态文本
 * @param status - 租赁状态
 * @returns 状态文本
 */
function getLeaseStatusText(status: string | null): string {
  switch (status) {
    case 'active':
      return '租赁中'
    case 'expired':
      return '已到期'
    case 'not_started':
      return '未开始'
    default:
      return '未设置'
  }
}

/**
 * 加载租赁信息
 */
async function loadLeaseInfo(): Promise<void> {
  loading.value = true
  
  try {
    const data = await getVehicleLease(vehicleId.value)
    leaseInfo.value = data
    
    // 初始化编辑表单
    editForm.lessor_name = data.lessor_name || ''
    editForm.lessor_contact = data.lessor_contact || ''
    editForm.lessee_name = data.lessee_name || ''
    editForm.lessee_contact = data.lessee_contact || ''
    editForm.monthly_rent = data.monthly_rent?.toString() || ''
    editForm.rent_payment_day = data.rent_payment_day?.toString() || ''
    editForm.lease_start_date = data.lease_start_date || ''
    editForm.lease_end_date = data.lease_end_date || ''
  } catch (error) {
    console.error('加载租赁信息失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 开始日期变更
 */
function onStartDateChange(e: any): void {
  editForm.lease_start_date = e.detail.value
}

/**
 * 结束日期变更
 */
function onEndDateChange(e: any): void {
  editForm.lease_end_date = e.detail.value
}

/**
 * 保存修改
 */
async function handleSave(): Promise<void> {
  if (saving.value) return
  
  // 验证缴纳日
  const paymentDay = editForm.rent_payment_day ? Number(editForm.rent_payment_day) : undefined
  if (paymentDay !== undefined && (paymentDay < 1 || paymentDay > 31)) {
    uni.showToast({
      title: '缴纳日应在1-31之间',
      icon: 'none',
    })
    return
  }
  
  saving.value = true
  
  try {
    await updateVehicleLease(vehicleId.value, {
      lessor_name: editForm.lessor_name || undefined,
      lessor_contact: editForm.lessor_contact || undefined,
      lessee_name: editForm.lessee_name || undefined,
      lessee_contact: editForm.lessee_contact || undefined,
      monthly_rent: editForm.monthly_rent ? Number(editForm.monthly_rent) : undefined,
      rent_payment_day: paymentDay,
      lease_start_date: editForm.lease_start_date || undefined,
      lease_end_date: editForm.lease_end_date || undefined,
    })
    
    uni.showToast({
      title: '保存成功',
      icon: 'success',
    })
    
    // 刷新数据
    await loadLeaseInfo()
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
</script>

<style lang="scss" scoped>
.lease-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 120rpx;
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
  width: 100rpx;
  height: 100rpx;
  background-color: #f0f0f0;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.icon-text {
  font-size: 48rpx;
}

.status-info {
  flex: 1;
}

.license-plate {
  font-size: 36rpx;
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
    .status-text { color: #52c41a; }
  }
  
  &.expired {
    background-color: #fff2f0;
    .status-text { color: #ff4d4f; }
  }
  
  &.not_started {
    background-color: #fff7e6;
    .status-text { color: #faad14; }
  }
  
  &.none {
    background-color: #f0f0f0;
    .status-text { color: #999999; }
  }
}

.status-text {
  font-size: 24rpx;
}

/* 租金提醒卡片 */
.reminder-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  color: #ffffff;
}

.reminder-icon {
  font-size: 48rpx;
  margin-right: 20rpx;
}

.reminder-content {
  flex: 1;
}

.reminder-title {
  font-size: 24rpx;
  opacity: 0.8;
  display: block;
}

.reminder-date {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin: 8rpx 0;
}

.reminder-days {
  font-size: 24rpx;
  opacity: 0.9;
}

.reminder-amount {
  text-align: right;
}

.amount-label {
  font-size: 24rpx;
  opacity: 0.8;
  display: block;
}

.amount-value {
  font-size: 36rpx;
  font-weight: bold;
}

/* 表单区域 */
.form-section {
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

.form-group {
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-group:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.group-title {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 16rpx;
  display: block;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}

.form-label {
  width: 140rpx;
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

.form-picker {
  flex: 1;
  height: 60rpx;
  padding: 0 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
}

.picker-value {
  font-size: 26rpx;
  color: #333333;
}

.picker-placeholder {
  font-size: 26rpx;
  color: #999999;
}

/* 保存按钮 */
.save-btn {
  position: fixed;
  bottom: 24rpx;
  left: 24rpx;
  right: 24rpx;
  background-color: #4a90e2;
  border-radius: 12rpx;
  padding: 28rpx;
  text-align: center;
}

.save-btn .btn-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
