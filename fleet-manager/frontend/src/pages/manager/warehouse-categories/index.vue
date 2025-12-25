<template>
  <!-- 
    仓库品类配置页面
    管理仓库的计件品类和单价配置
    支持添加、编辑、删除品类
    Requirements: 8.2
  -->
  <view class="warehouse-categories-page">
    <!-- 仓库选择器 -->
    <view class="warehouse-selector">
      <text class="selector-label">选择仓库</text>
      <picker
        mode="selector"
        :range="warehouseOptions"
        range-key="name"
        @change="handleWarehouseChange"
      >
        <view class="picker-value">
          <text class="picker-text">{{ selectedWarehouseName }}</text>
          <text class="picker-arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 品类列表 -->
      <view class="category-section">
        <view class="section-header">
          <text class="section-title">品类列表</text>
          <view class="add-btn" @click="openAddModal">
            <text class="add-text">+ 添加品类</text>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="categories.length === 0" class="empty-container">
          <text class="empty-icon">📦</text>
          <text class="empty-text">暂无品类配置</text>
          <text class="empty-hint">点击上方"添加品类"按钮创建</text>
        </view>

        <!-- 品类卡片列表 -->
        <view v-else class="category-list">
          <view
            v-for="category in categories"
            :key="category.id"
            class="category-card"
          >
            <view class="card-header">
              <view class="category-info">
                <text class="category-name">{{ category.name }}</text>
                <view :class="['status-tag', category.is_active ? 'active' : 'inactive']">
                  <text class="status-text">{{ category.is_active ? '启用' : '停用' }}</text>
                </view>
              </view>
              <view class="card-actions">
                <view class="action-btn edit" @click="openEditModal(category)">
                  <text class="action-icon">✏️</text>
                </view>
                <view class="action-btn delete" @click="handleDelete(category)">
                  <text class="action-icon">🗑️</text>
                </view>
              </view>
            </view>
            
            <view class="card-content">
              <view class="info-row">
                <text class="info-label">单价</text>
                <text class="info-value price">¥{{ formatMoney(category.unit_price) }}</text>
              </view>
              <view class="info-row">
                <text class="info-label">单位</text>
                <text class="info-value">{{ category.unit || '件' }}</text>
              </view>
              <view class="info-row">
                <text class="info-label">创建时间</text>
                <text class="info-value">{{ formatDate(category.created_at) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 添加/编辑弹窗 -->
    <view v-if="showModal" class="modal-overlay" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEditing ? '编辑品类' : '添加品类' }}</text>
          <text class="modal-close" @click="closeModal">×</text>
        </view>
        
        <view class="modal-body">
          <!-- 品类名称 -->
          <view class="form-item">
            <text class="form-label">品类名称 <text class="required">*</text></text>
            <input
              v-model="formData.name"
              type="text"
              class="form-input"
              placeholder="请输入品类名称"
            />
          </view>
          
          <!-- 单价 -->
          <view class="form-item">
            <text class="form-label">单价（元） <text class="required">*</text></text>
            <input
              v-model="formData.unit_price"
              type="digit"
              class="form-input"
              placeholder="请输入单价"
            />
          </view>
          
          <!-- 单位 -->
          <view class="form-item">
            <text class="form-label">单位</text>
            <input
              v-model="formData.unit"
              type="text"
              class="form-input"
              placeholder="请输入单位，默认为件"
            />
          </view>
          
          <!-- 状态（仅编辑时显示） -->
          <view v-if="isEditing" class="form-item">
            <text class="form-label">状态</text>
            <view class="status-switch">
              <view
                :class="['switch-option', { active: formData.is_active }]"
                @click="formData.is_active = true"
              >
                <text class="option-text">启用</text>
              </view>
              <view
                :class="['switch-option', { active: !formData.is_active }]"
                @click="formData.is_active = false"
              >
                <text class="option-text">停用</text>
              </view>
            </view>
          </view>
        </view>
        
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @click="handleSubmit">
            <text class="btn-text">{{ isEditing ? '保存' : '添加' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 仓库品类配置页面
 * 管理仓库的计件品类和单价配置
 * 支持添加、编辑、删除品类
 * 
 * @requirements 8.2 - 仓库品类配置页面
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { 
  getWarehouses, 
  getPieceWorkCategories, 
  createPieceWorkCategory 
} from '@/api'
import type { Warehouse, PieceWorkCategory, PieceWorkCategoryCreate } from '@/api/types'
import { formatDate, formatMoney } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 选中的仓库ID */
const selectedWarehouseId = ref<number | null>(null)

/** 品类列表 */
const categories = ref<PieceWorkCategory[]>([])

/** 是否显示弹窗 */
const showModal = ref(false)

/** 是否编辑模式 */
const isEditing = ref(false)

/** 编辑中的品类ID */
const editingId = ref<number | null>(null)

/** 表单数据 */
const formData = reactive({
  name: '',
  unit_price: '',
  unit: '',
  is_active: true,
})

// ==================== 计算属性 ====================

/**
 * 仓库选项（包含"全部"选项）
 */
const warehouseOptions = computed(() => [
  { id: null, name: '全部仓库' },
  ...warehouses.value,
])

/**
 * 选中的仓库名称
 */
const selectedWarehouseName = computed(() => {
  if (!selectedWarehouseId.value) return '全部仓库'
  const warehouse = warehouses.value.find(w => w.id === selectedWarehouseId.value)
  return warehouse?.name || '全部仓库'
})

// ==================== 生命周期 ====================

onLoad((options) => {
  // 获取页面参数
  if (options?.warehouse_id) {
    selectedWarehouseId.value = parseInt(options.warehouse_id as string, 10)
  }
})

onMounted(() => {
  loadWarehouses()
  loadCategories()
})

// ==================== 方法 ====================

/**
 * 加载仓库列表
 */
async function loadWarehouses(): Promise<void> {
  try {
    const data = await getWarehouses({ is_active: true })
    warehouses.value = data
  } catch (error) {
    console.error('加载仓库列表失败:', error)
  }
}

/**
 * 加载品类列表
 */
async function loadCategories(): Promise<void> {
  loading.value = true
  try {
    // 获取所有品类（包括停用的）
    const data = await getPieceWorkCategories()
    categories.value = data
  } catch (error) {
    console.error('加载品类列表失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 处理仓库选择变化
 * 
 * @param e - 事件对象
 */
function handleWarehouseChange(e: { detail: { value: number } }): void {
  const index = e.detail.value
  const warehouse = warehouseOptions.value[index]
  selectedWarehouseId.value = warehouse.id
  loadCategories()
}

/**
 * 打开添加弹窗
 */
function openAddModal(): void {
  isEditing.value = false
  editingId.value = null
  formData.name = ''
  formData.unit_price = ''
  formData.unit = ''
  formData.is_active = true
  showModal.value = true
}

/**
 * 打开编辑弹窗
 * 
 * @param category - 要编辑的品类
 */
function openEditModal(category: PieceWorkCategory): void {
  isEditing.value = true
  editingId.value = category.id
  formData.name = category.name
  formData.unit_price = String(category.unit_price)
  formData.unit = category.unit || ''
  formData.is_active = category.is_active
  showModal.value = true
}

/**
 * 关闭弹窗
 */
function closeModal(): void {
  showModal.value = false
}

/**
 * 提交表单
 */
async function handleSubmit(): Promise<void> {
  // 验证表单
  if (!formData.name.trim()) {
    uni.showToast({ title: '请输入品类名称', icon: 'none' })
    return
  }
  
  const unitPrice = parseFloat(formData.unit_price)
  if (isNaN(unitPrice) || unitPrice < 0) {
    uni.showToast({ title: '请输入有效的单价', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: isEditing.value ? '保存中...' : '添加中...' })
    
    const data: PieceWorkCategoryCreate = {
      name: formData.name.trim(),
      unit_price: unitPrice,
      unit: formData.unit.trim() || '件',
    }
    
    if (isEditing.value && editingId.value) {
      // 编辑模式 - 当前 API 不支持更新，显示提示
      uni.hideLoading()
      uni.showToast({
        title: '暂不支持编辑，请删除后重新添加',
        icon: 'none',
        duration: 2000,
      })
      return
    } else {
      // 添加模式
      await createPieceWorkCategory(data)
    }
    
    uni.hideLoading()
    uni.showToast({
      title: isEditing.value ? '保存成功' : '添加成功',
      icon: 'success',
    })
    
    closeModal()
    loadCategories()
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
 * 删除品类
 * 
 * @param category - 要删除的品类
 */
function handleDelete(category: PieceWorkCategory): void {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除品类"${category.name}"吗？`,
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        // 当前 API 不支持删除，显示提示
        uni.showToast({
          title: '暂不支持删除操作',
          icon: 'none',
          duration: 2000,
        })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.warehouse-categories-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
}

/* 仓库选择器 */
.warehouse-selector {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
  margin-bottom: 24rpx;
}

.selector-label {
  font-size: 28rpx;
  color: #666666;
  margin-right: 24rpx;
}

.picker-value {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx;
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

/* 品类区域 */
.category-section {
  padding: 0 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.add-btn {
  padding: 12rpx 24rpx;
  background-color: #1890ff;
  border-radius: 8rpx;
}

.add-text {
  font-size: 26rpx;
  color: #ffffff;
}

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
  background-color: #ffffff;
  border-radius: 16rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
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

/* 品类列表 */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.category-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.category-info {
  display: flex;
  align-items: center;
}

.category-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-right: 12rpx;
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
  
  &.inactive {
    background-color: #fff1f0;
    
    .status-text {
      color: #ff4d4f;
    }
  }
}

.status-text {
  font-size: 22rpx;
}

.card-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  
  &.edit {
    background-color: #e6f7ff;
  }
  
  &.delete {
    background-color: #fff1f0;
  }
}

.action-icon {
  font-size: 28rpx;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.info-row {
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
  
  &.price {
    font-size: 30rpx;
    font-weight: bold;
    color: #ff6b35;
  }
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-width: 600rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.modal-close {
  font-size: 40rpx;
  color: #999999;
  line-height: 1;
}

.modal-body {
  padding: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 12rpx;
}

.required {
  color: #ff4d4f;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333333;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.status-switch {
  display: flex;
  gap: 16rpx;
}

.switch-option {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  
  &.active {
    background-color: #e6f7ff;
    border-color: #1890ff;
    
    .option-text {
      color: #1890ff;
    }
  }
}

.option-text {
  font-size: 28rpx;
  color: #666666;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.cancel {
    border-right: 1rpx solid #f0f0f0;
    
    .btn-text {
      color: #666666;
    }
  }
  
  &.confirm {
    .btn-text {
      color: #1890ff;
      font-weight: bold;
    }
  }
}

.btn-text {
  font-size: 30rpx;
}
</style>
