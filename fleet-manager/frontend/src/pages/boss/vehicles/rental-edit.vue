<template>
  <!-- 
    车辆租金编辑页面
    编辑车辆的租赁信息，包括月租金、开始日期、结束日期、押金、备注
    Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
  -->
  <view class="rental-edit-page">
    <!-- 顶部导航栏 -->
    <TopNavBar title="车辆租金编辑" :showBack="true" />
    
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

      <!-- 租金信息表单 -->
      <view class="form-section">
        <view class="section-title">
          <text class="title-text">租金信息</text>
        </view>
        
        <!-- 月租金 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">月租金（元）</text>
            <text class="required">*</text>
          </view>
          <input
            v-model="formData.monthly_rent"
            type="digit"
            class="form-input"
            :class="{ 'input-error': errors.monthly_rent }"
            placeholder="请输入月租金（0-100000）"
            @blur="validateMonthlyRent"
          />
          <text v-if="errors.monthly_rent" class="error-text">{{ errors.monthly_rent }}</text>
        </view>

        <!-- 押金 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">押金（元）</text>
          </view>
          <input
            v-model="formData.deposit"
            type="digit"
            class="form-input"
            :class="{ 'input-error': errors.deposit }"
            placeholder="请输入押金金额"
            @blur="validateDeposit"
          />
          <text v-if="errors.deposit" class="error-text">{{ errors.deposit }}</text>
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
            <text class="required">*</text>
          </view>
          <picker
            mode="date"
            :value="formData.start_date"
            @change="handleStartDateChange"
          >
            <view class="picker-value" :class="{ 'input-error': errors.start_date }">
              <text class="picker-text">
                {{ formData.start_date || '请选择开始日期' }}
              </text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
          <text v-if="errors.start_date" class="error-text">{{ errors.start_date }}</text>
        </view>
        
        <!-- 租期结束日期 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">租期结束</text>
            <text class="required">*</text>
          </view>
          <picker
            mode="date"
            :value="formData.end_date"
            :start="formData.start_date"
            @change="handleEndDateChange"
          >
            <view class="picker-value" :class="{ 'input-error': errors.end_date }">
              <text class="picker-text">
                {{ formData.end_date || '请选择结束日期' }}
              </text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
          <text v-if="errors.end_date" class="error-text">{{ errors.end_date }}</text>
        </view>
      </view>

      <!-- 备注信息 -->
      <view class="form-section">
        <view class="section-title">
          <text class="title-text">备注信息</text>
        </view>
        
        <!-- 备注 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">备注</text>
          </view>
          <textarea
            v-model="formData.notes"
            class="form-textarea"
            placeholder="请输入备注信息（选填）"
            :maxlength="500"
          />
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
        <view class="btn primary-btn" :class="{ 'btn-disabled': submitting }" @click="handleSubmit">
          <text class="btn-text">{{ submitting ? '保存中...' : '保存租赁信息' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 车辆租金编辑页面
 * 编辑车辆的租赁信息，包括月租金、开始日期、结束日期、押金、备注
 * 
 * @requirements 2.1 - 从车辆详情页点击编辑租金按钮跳转到租金编辑页面并显示当前租金信息
 * @requirements 2.2 - 验证月租金为正数且不超过 100000
 * @requirements 2.3 - 验证日期格式正确
 * @requirements 2.4 - 验证结束日期晚于开始日期
 * @requirements 2.5 - 点击保存按钮提交修改并返回车辆详情页
 */

import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getVehicle, getVehicleLease, updateVehicleLease } from '@/api'
import type { Vehicle, VehicleLease, VehicleLeaseUpdate } from '@/api/types'
import TopNavBar from '@/components/TopNavBar/index.vue'

// ==================== 常量定义 ====================

/** 月租金最大值：100000元 */
const MAX_MONTHLY_RENT = 100000

/** 押金最大值：100000元 */
const MAX_DEPOSIT = 100000

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 提交状态 */
const submitting = ref(false)

/** 车辆ID */
const vehicleId = ref<number>(0)

/** 车辆信息 */
const vehicle = ref<Vehicle | null>(null)

/** 租赁信息 */
const leaseInfo = ref<VehicleLease | null>(null)

/** 表单数据 */
const formData = reactive({
  monthly_rent: '',
  start_date: '',
  end_date: '',
  deposit: '',
  notes: '',
})

/** 表单错误信息 */
const errors = reactive({
  monthly_rent: '',
  start_date: '',
  end_date: '',
  deposit: '',
})

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

// ==================== 数据加载方法 ====================

/**
 * 加载数据
 * 并行加载车辆信息和租赁信息
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
    
    // 填充表单数据
    if (leaseData) {
      formData.monthly_rent = leaseData.monthly_rent ? String(leaseData.monthly_rent) : ''
      formData.start_date = leaseData.lease_start_date || ''
      formData.end_date = leaseData.lease_end_date || ''
      // 押金和备注字段可能需要从其他地方获取，暂时留空
      formData.deposit = ''
      formData.notes = ''
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

// ==================== 表单验证方法 ====================

/**
 * 验证月租金
 * 必须为正数且不超过 100000
 * @requirements 2.2
 * @returns 是否验证通过
 */
function validateMonthlyRent(): boolean {
  const value = formData.monthly_rent.trim()
  
  if (!value) {
    errors.monthly_rent = '请输入月租金'
    return false
  }
  
  const rent = parseFloat(value)
  
  if (isNaN(rent)) {
    errors.monthly_rent = '请输入有效的数字'
    return false
  }
  
  if (rent <= 0) {
    errors.monthly_rent = '月租金必须为正数'
    return false
  }
  
  if (rent > MAX_MONTHLY_RENT) {
    errors.monthly_rent = `月租金不能超过${MAX_MONTHLY_RENT}元`
    return false
  }
  
  errors.monthly_rent = ''
  return true
}

/**
 * 验证押金
 * 如果填写，必须为非负数且不超过 100000
 * @returns 是否验证通过
 */
function validateDeposit(): boolean {
  const value = formData.deposit.trim()
  
  // 押金为选填项
  if (!value) {
    errors.deposit = ''
    return true
  }
  
  const deposit = parseFloat(value)
  
  if (isNaN(deposit)) {
    errors.deposit = '请输入有效的数字'
    return false
  }
  
  if (deposit < 0) {
    errors.deposit = '押金不能为负数'
    return false
  }
  
  if (deposit > MAX_DEPOSIT) {
    errors.deposit = `押金不能超过${MAX_DEPOSIT}元`
    return false
  }
  
  errors.deposit = ''
  return true
}

/**
 * 验证日期格式
 * 检查日期字符串是否为有效的 YYYY-MM-DD 格式
 * @requirements 2.3
 * @param dateStr - 日期字符串
 * @returns 是否为有效日期格式
 */
function isValidDateFormat(dateStr: string): boolean {
  if (!dateStr) return false
  
  // 检查格式是否为 YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false
  
  // 检查是否为有效日期
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

/**
 * 验证开始日期
 * @requirements 2.3
 * @returns 是否验证通过
 */
function validateStartDate(): boolean {
  if (!formData.start_date) {
    errors.start_date = '请选择租期开始日期'
    return false
  }
  
  if (!isValidDateFormat(formData.start_date)) {
    errors.start_date = '日期格式不正确'
    return false
  }
  
  errors.start_date = ''
  return true
}

/**
 * 验证结束日期
 * 必须晚于开始日期
 * @requirements 2.3, 2.4
 * @returns 是否验证通过
 */
function validateEndDate(): boolean {
  if (!formData.end_date) {
    errors.end_date = '请选择租期结束日期'
    return false
  }
  
  if (!isValidDateFormat(formData.end_date)) {
    errors.end_date = '日期格式不正确'
    return false
  }
  
  // 验证结束日期晚于开始日期
  if (formData.start_date && formData.end_date) {
    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.end_date)
    
    if (endDate <= startDate) {
      errors.end_date = '结束日期必须晚于开始日期'
      return false
    }
  }
  
  errors.end_date = ''
  return true
}

/**
 * 验证所有表单字段
 * @returns 是否所有验证都通过
 */
function validateForm(): boolean {
  const isMonthlyRentValid = validateMonthlyRent()
  const isDepositValid = validateDeposit()
  const isStartDateValid = validateStartDate()
  const isEndDateValid = validateEndDate()
  
  return isMonthlyRentValid && isDepositValid && isStartDateValid && isEndDateValid
}

// ==================== 事件处理方法 ====================

/**
 * 处理开始日期选择
 * @param e - 事件对象
 */
function handleStartDateChange(e: { detail: { value: string } }): void {
  formData.start_date = e.detail.value
  validateStartDate()
  
  // 如果结束日期已选择，重新验证结束日期
  if (formData.end_date) {
    validateEndDate()
  }
}

/**
 * 处理结束日期选择
 * @param e - 事件对象
 */
function handleEndDateChange(e: { detail: { value: string } }): void {
  formData.end_date = e.detail.value
  validateEndDate()
}

/**
 * 提交表单
 * 验证通过后调用 API 更新租金信息
 * @requirements 2.5
 */
async function handleSubmit(): Promise<void> {
  // 防止重复提交
  if (submitting.value) return
  
  // 验证表单
  if (!validateForm()) {
    uni.showToast({
      title: '请检查表单填写',
      icon: 'none',
    })
    return
  }
  
  submitting.value = true
  
  try {
    uni.showLoading({ title: '保存中...' })
    
    // 构建更新数据
    const updateData: VehicleLeaseUpdate = {
      monthly_rent: parseFloat(formData.monthly_rent),
      lease_start_date: formData.start_date,
      lease_end_date: formData.end_date,
    }
    
    // 调用 API 更新租金信息
    await updateVehicleLease(vehicleId.value, updateData)
    
    uni.hideLoading()
    uni.showToast({
      title: '保存成功',
      icon: 'success',
    })
    
    // 成功后返回车辆详情页
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error) {
    console.error('保存失败:', error)
    uni.hideLoading()
    uni.showToast({
      title: '保存失败，请重试',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}

// ==================== 辅助方法 ====================

/**
 * 格式化距付款日天数
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
/**
 * 车辆租金编辑页面样式
 */
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
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.label-text {
  font-size: 26rpx;
  color: #666666;
}

.required {
  color: #ff4d4f;
  margin-left: 4rpx;
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
  border: 2rpx solid transparent;
  
  &.input-error {
    border-color: #ff4d4f;
    background-color: #fff2f0;
  }
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333333;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.error-text {
  font-size: 24rpx;
  color: #ff4d4f;
  margin-top: 8rpx;
  display: block;
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  
  &.input-error {
    border-color: #ff4d4f;
    background-color: #fff2f0;
  }
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
  
  &.btn-disabled {
    opacity: 0.6;
  }
  
  .btn-text {
    color: #ffffff;
    font-weight: bold;
  }
}

.btn-text {
  font-size: 32rpx;
}
</style>
