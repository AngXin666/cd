<template>
  <!-- 
    仓库编辑页面
    支持创建新仓库和编辑现有仓库信息
    Requirements: 8.3
  -->
  <view class="warehouse-edit-page">
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
            class="form-input"
            placeholder="请输入仓库名称"
            maxlength="50"
          />
        </view>

        <!-- 仓库地址 -->
        <view class="form-item">
          <view class="form-label">
            <text class="label-text">仓库地址</text>
          </view>
          <textarea
            v-model="formData.address"
            class="form-textarea"
            placeholder="请输入仓库地址（选填）"
            maxlength="200"
          />
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
        <view class="btn primary-btn" @click="handleSubmit">
          <text class="btn-text">{{ isEditing ? '保存修改' : '创建仓库' }}</text>
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
 * @requirements 8.3 - 仓库编辑页面
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

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

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
 * 加载仓库信息
 */
async function loadWarehouse(): Promise<void> {
  if (!warehouseId.value) return
  
  loading.value = true
  try {
    const data = await getWarehouse(warehouseId.value)
    warehouse.value = data
    
    // 填充表单
    formData.name = data.name
    formData.address = data.address || ''
    formData.is_active = data.is_active
  } catch (error) {
    console.error('加载仓库信息失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 验证表单
 * 
 * @returns 是否验证通过
 */
function validateForm(): boolean {
  if (!formData.name.trim()) {
    uni.showToast({
      title: '请输入仓库名称',
      icon: 'none',
    })
    return false
  }
  
  return true
}

/**
 * 提交表单
 */
async function handleSubmit(): Promise<void> {
  if (!validateForm()) return
  
  try {
    uni.showLoading({ title: isEditing.value ? '保存中...' : '创建中...' })
    
    if (isEditing.value && warehouseId.value) {
      // 编辑模式
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
      
      // 刷新数据
      await loadWarehouse()
    } else {
      // 创建模式
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
    console.error('操作失败:', error)
    uni.hideLoading()
    uni.showToast({
      title: '操作失败',
      icon: 'none',
    })
  }
}

/**
 * 删除仓库
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
          
          // 返回上一页
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } catch (error) {
          console.error('删除失败:', error)
          uni.hideLoading()
          uni.showToast({
            title: '删除失败',
            icon: 'none',
          })
        }
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.warehouse-edit-page {
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
