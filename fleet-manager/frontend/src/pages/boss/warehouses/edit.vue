<template>
  <!-- 
    仓库编辑页面
    支持创建新仓库和编辑现有仓库信息
    Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
  -->
  <view class="warehouse-edit-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="handleBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">{{ isEditing ? '编辑仓库' : '新建仓库' }}</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 表单区域 -->
      <view class="form-section">
        <!-- 仓库名称 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">仓库名称</text>
            <text class="required">*</text>
          </view>
          <input
            v-model="formData.name"
            type="text"
            :class="['form-input', { 'input-error': errors.name }]"
            placeholder="请输入仓库名称（最多50字符）"
            maxlength="50"
            @input="clearError('name')"
          />
          <text v-if="errors.name" class="error-text">{{ errors.name }}</text>
          <text class="char-count">{{ formData.name.length }}/50</text>
        </view>

        <!-- 仓库地址 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">仓库地址</text>
          </view>
          <textarea
            v-model="formData.address"
            :class="['form-textarea', { 'input-error': errors.address }]"
            placeholder="请输入仓库地址（选填，最多200字符）"
            maxlength="200"
            @input="clearError('address')"
          />
          <text v-if="errors.address" class="error-text">{{ errors.address }}</text>
          <text class="char-count">{{ formData.address.length }}/200</text>
        </view>

        <!-- 仓库状态（仅编辑模式显示） -->
        <view v-if="isEditing" class="form-item">
          <view class="form-label">
            <text class="label-text">仓库状态</text>
          </view>
          <view class="status-switch">
            <view
              :class="['switch-option', { active: formData.is_active }]"
              @click="formData.is_active = true"
            >
              <text class="option-icon">✓</text>
              <text class="option-text">启用</text>
            </view>
            <view
              :class="['switch-option', { active: !formData.is_active }]"
              @click="formData.is_active = false"
            >
              <text class="option-icon">✕</text>
              <text class="option-text">停用</text>
            </view>
          </view>
          <text class="form-hint">停用后，该仓库将不会出现在选择列表中</text>
        </view>
      </view>

      <!-- 仓库信息（仅编辑模式显示） -->
      <view v-if="isEditing && warehouse" class="info-section">
        <view class="section-title">
          <text class="title-text">仓库信息</text>
        </view>
        <view class="info-list">
          <view class="info-item">
            <text class="info-label">仓库ID</text>
            <text class="info-value">{{ warehouse.id }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatDateTime(warehouse.created_at) }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-section">
        <view 
          :class="['btn', 'primary-btn', { 'btn-disabled': submitting }]" 
          @click="handleSubmit"
        >
          <text class="btn-text">{{ submitting ? '保存中...' : (isEditing ? '保存修改' : '创建仓库') }}</text>
        </view>
        
        <view v-if="isEditing" class="btn danger-btn" @click="handleDelete">
          <text class="btn-text">删除仓库</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 仓库编辑页面
 * 支持创建新仓库和编辑现有仓库信息
 * 
 * @requirements 1.1 - 从仓库详情页点击编辑按钮跳转到编辑页面并显示当前仓库信息
 * @requirements 1.2 - 验证名称不为空且长度不超过50字符
 * @requirements 1.3 - 验证地址格式正确
 * @requirements 1.4 - 点击保存按钮提交修改并返回仓库详情页
 * @requirements 1.5 - 保存失败时显示错误提示并保留用户输入
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { 
  getWarehouse, 
  createWarehouse, 
  updateWarehouse, 
  deleteWarehouse 
} from '@/api'
import type { Warehouse, WarehouseCreate, WarehouseUpdate } from '@/api/types'
import { formatDateTime } from '@/utils'

// ==================== 常量定义 ====================

/** 仓库名称最大长度 */
const MAX_NAME_LENGTH = 50

/** 仓库地址最大长度 */
const MAX_ADDRESS_LENGTH = 200

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 提交状态 */
const submitting = ref(false)

/** 仓库ID（编辑模式） */
const warehouseId = ref<number | null>(null)

/** 仓库信息（编辑模式） */
const warehouse = ref<Warehouse | null>(null)

/** 表单数据 */
const formData = reactive({
  name: '',
  address: '',
  is_active: true,
})

/** 表单验证错误 */
const errors = reactive({
  name: '',
  address: '',
})

// ==================== 计算属性 ====================

/**
 * 是否为编辑模式
 */
const isEditing = computed(() => warehouseId.value !== null)

// ==================== 生命周期 ====================

onLoad((options) => {
  // 获取页面参数
  if (options?.id) {
    warehouseId.value = parseInt(options.id as string, 10)
  }
  
  // 设置页面标题
  uni.setNavigationBarTitle({
    title: warehouseId.value ? '编辑仓库' : '新建仓库',
  })
})

onMounted(() => {
  if (warehouseId.value) {
    loadWarehouse()
  }
})

// ==================== 方法 ====================

/**
 * 返回上一页
 */
function handleBack(): void {
  uni.navigateBack()
}

/**
 * 加载仓库信息
 * 从API获取仓库详情并填充表单
 */
async function loadWarehouse(): Promise<void> {
  if (!warehouseId.value) return
  
  loading.value = true
  try {
    const data = await getWarehouse(warehouseId.value)
    warehouse.value = data
    
    // 填充表单数据
    formData.name = data.name
    formData.address = data.address || ''
    formData.is_active = data.is_active
  } catch (error) {
    console.error('加载仓库信息失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 清除指定字段的错误信息
 * @param field - 字段名称
 */
function clearError(field: 'name' | 'address'): void {
  errors[field] = ''
}

/**
 * 验证仓库名称
 * @returns 是否验证通过
 */
function validateName(): boolean {
  const name = formData.name.trim()
  
  // 检查是否为空
  if (!name) {
    errors.name = '请输入仓库名称'
    return false
  }
  
  // 检查长度限制
  if (name.length > MAX_NAME_LENGTH) {
    errors.name = `仓库名称不能超过${MAX_NAME_LENGTH}个字符`
    return false
  }
  
  // 检查是否包含特殊字符（只允许中文、英文、数字、空格、括号、横线）
  const validNamePattern = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-()（）]+$/
  if (!validNamePattern.test(name)) {
    errors.name = '仓库名称只能包含中文、英文、数字、空格、括号和横线'
    return false
  }
  
  errors.name = ''
  return true
}

/**
 * 验证仓库地址
 * @returns 是否验证通过
 */
function validateAddress(): boolean {
  const address = formData.address.trim()
  
  // 地址是可选的，如果为空则跳过验证
  if (!address) {
    errors.address = ''
    return true
  }
  
  // 检查长度限制
  if (address.length > MAX_ADDRESS_LENGTH) {
    errors.address = `仓库地址不能超过${MAX_ADDRESS_LENGTH}个字符`
    return false
  }
  
  // 检查地址格式（至少包含2个字符，不能只有特殊字符）
  const validAddressPattern = /[\u4e00-\u9fa5a-zA-Z0-9]{2,}/
  if (!validAddressPattern.test(address)) {
    errors.address = '请输入有效的仓库地址'
    return false
  }
  
  errors.address = ''
  return true
}

/**
 * 验证表单
 * @returns 是否验证通过
 */
function validateForm(): boolean {
  // 验证所有字段
  const nameValid = validateName()
  const addressValid = validateAddress()
  
  return nameValid && addressValid
}

/**
 * 提交表单
 * 创建或更新仓库信息
 */
async function handleSubmit(): Promise<void> {
  // 防止重复提交
  if (submitting.value) return
  
  // 验证表单
  if (!validateForm()) {
    // 显示第一个错误
    const firstError = errors.name || errors.address
    if (firstError) {
      uni.showToast({
        title: firstError,
        icon: 'none',
      })
    }
    return
  }
  
  submitting.value = true
  
  try {
    uni.showLoading({ title: isEditing.value ? '保存中...' : '创建中...' })
    
    if (isEditing.value && warehouseId.value) {
      // 编辑模式：更新仓库信息
      const updateData: WarehouseUpdate = {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        is_active: formData.is_active,
      }
      
      await updateWarehouse(warehouseId.value, updateData)
      
      uni.hideLoading()
      uni.showToast({
        title: '保存成功',
        icon: 'success',
      })
      
      // 返回仓库详情页（Requirements 1.4）
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    } else {
      // 创建模式：创建新仓库
      const createData: WarehouseCreate = {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
      }
      
      await createWarehouse(createData)
      
      uni.hideLoading()
      uni.showToast({
        title: '创建成功',
        icon: 'success',
      })
      
      // 返回上一页
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  } catch (error) {
    // 保存失败时显示错误提示并保留用户输入（Requirements 1.5）
    console.error('操作失败:', error)
    uni.hideLoading()
    
    // 解析错误信息
    let errorMessage = '操作失败，请重试'
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage
    }
    
    uni.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 2000,
    })
  } finally {
    submitting.value = false
  }
}

/**
 * 删除仓库
 * 显示确认对话框后执行删除操作
 */
function handleDelete(): void {
  if (!warehouseId.value || !warehouse.value) return
  
  uni.showModal({
    title: '确认删除',
    content: `确定要删除仓库"${warehouse.value.name}"吗？删除后无法恢复。`,
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm && warehouseId.value) {
        try {
          uni.showLoading({ title: '删除中...' })
          
          await deleteWarehouse(warehouseId.value)
          
          uni.hideLoading()
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          })
          
          // 返回仓库列表页
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } catch (error) {
          console.error('删除失败:', error)
          uni.hideLoading()
          uni.showToast({
            title: '删除失败，请重试',
            icon: 'none',
          })
        }
      }
    },
  })
}
</script>

<style lang="scss" scoped>
/**
 * 仓库编辑页面样式
 * 包含导航栏、表单、信息展示和操作按钮样式
 */

.warehouse-edit-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
}

/* 导航栏样式 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: env(safe-area-inset-top);
  background-color: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 36rpx;
  color: #333333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.nav-placeholder {
  width: 60rpx;
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

/* 表单区域 */
.form-section {
  background-color: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.form-item {
  margin-bottom: 32rpx;
  position: relative;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.label-text {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
}

.required {
  color: #ff4d4f;
  margin-left: 4rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333333;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  box-sizing: border-box;
  border: 2rpx solid transparent;
  transition: border-color 0.3s;
  
  &.input-error {
    border-color: #ff4d4f;
    background-color: #fff2f0;
  }
}

.form-textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333333;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  box-sizing: border-box;
  border: 2rpx solid transparent;
  transition: border-color 0.3s;
  
  &.input-error {
    border-color: #ff4d4f;
    background-color: #fff2f0;
  }
}

.error-text {
  font-size: 24rpx;
  color: #ff4d4f;
  margin-top: 8rpx;
  display: block;
}

.char-count {
  font-size: 22rpx;
  color: #999999;
  position: absolute;
  right: 0;
  bottom: -24rpx;
}

.form-hint {
  font-size: 24rpx;
  color: #999999;
  margin-top: 12rpx;
  display: block;
}

/* 状态切换 */
.status-switch {
  display: flex;
  gap: 24rpx;
}

.switch-option {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
  
  &.active {
    border-color: #1890ff;
    background-color: #e6f7ff;
    
    .option-icon {
      color: #1890ff;
    }
    
    .option-text {
      color: #1890ff;
    }
  }
}

.option-icon {
  font-size: 28rpx;
  color: #999999;
  margin-right: 8rpx;
}

.option-text {
  font-size: 28rpx;
  color: #666666;
}

/* 信息区域 */
.info-section {
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.section-title {
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 16rpx;
}

.title-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
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
}

/* 操作按钮 */
.action-section {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.btn {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  transition: opacity 0.3s;
  
  &.btn-disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.primary-btn {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  
  .btn-text {
    color: #ffffff;
    font-weight: bold;
  }
}

.danger-btn {
  background-color: #fff1f0;
  border: 1rpx solid #ffccc7;
  
  .btn-text {
    color: #ff4d4f;
  }
}

.btn-text {
  font-size: 32rpx;
}
</style>
