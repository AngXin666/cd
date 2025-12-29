<template>
  <!-- 
    仓库品类配置页面
    管理仓库的计件品类和单价配置
    支持添加、编辑、删除品类
    支持基础单价、上楼单价、分拣单价配置
    Requirements: 3.1, 3.2, 3.3, 3.4
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
              <!-- 基础单价 -->
              <view class="info-row">
                <text class="info-label">基础单价</text>
                <text class="info-value price">¥{{ formatMoney(category.unit_price) }}</text>
              </view>
              <!-- 上楼单价（如果有） -->
              <view v-if="category.upstairs_price != null" class="info-row">
                <text class="info-label">上楼单价</text>
                <text class="info-value price-secondary">¥{{ formatMoney(category.upstairs_price) }}</text>
              </view>
              <!-- 分拣单价（如果有） -->
              <view v-if="category.sorting_price != null" class="info-row">
                <text class="info-label">分拣单价</text>
                <text class="info-value price-secondary">¥{{ formatMoney(category.sorting_price) }}</text>
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
          
          <!-- 基础单价 -->
          <view class="form-item">
            <text class="form-label">基础单价（元） <text class="required">*</text></text>
            <input
              v-model="formData.unit_price"
              type="digit"
              class="form-input"
              placeholder="请输入基础单价"
            />
          </view>
          
          <!-- 上楼单价 -->
          <view class="form-item">
            <text class="form-label">上楼单价（元）</text>
            <input
              v-model="formData.upstairs_price"
              type="digit"
              class="form-input"
              placeholder="请输入上楼单价（可选）"
            />
          </view>
          
          <!-- 分拣单价 -->
          <view class="form-item">
            <text class="form-label">分拣单价（元）</text>
            <input
              v-model="formData.sorting_price"
              type="digit"
              class="form-input"
              placeholder="请输入分拣单价（可选）"
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
 * 支持基础单价、上楼单价、分拣单价配置
 * 
 * @requirements 3.1 - 支持多种单价配置
 * @requirements 3.2 - 支持编辑品类配置
 * @requirements 3.3 - 支持删除品类
 * @requirements 3.4 - 删除约束检查（有计件记录不可删除）
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { 
  getWarehouses, 
  getPieceWorkCategories, 
  createPieceWorkCategory,
  updatePieceWorkCategory,
  deletePieceWorkCategory
} from '@/api'
import type { Warehouse, PieceWorkCategory, PieceWorkCategoryCreate, PieceWorkCategoryUpdate } from '@/api/types'
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

/** 
 * 表单数据
 * 支持基础单价、上楼单价、分拣单价
 */
const formData = reactive({
  name: '',
  unit_price: '',
  upstairs_price: '',
  sorting_price: '',
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
 * 重置表单数据
 */
function openAddModal(): void {
  isEditing.value = false
  editingId.value = null
  formData.name = ''
  formData.unit_price = ''
  formData.upstairs_price = ''
  formData.sorting_price = ''
  formData.unit = ''
  formData.is_active = true
  showModal.value = true
}

/**
 * 打开编辑弹窗
 * 填充现有品类数据
 * 
 * @param category - 要编辑的品类
 */
function openEditModal(category: PieceWorkCategory): void {
  isEditing.value = true
  editingId.value = category.id
  formData.name = category.name
  formData.unit_price = String(category.unit_price)
  // 处理可选的上楼单价和分拣单价
  formData.upstairs_price = category.upstairs_price != null ? String(category.upstairs_price) : ''
  formData.sorting_price = category.sorting_price != null ? String(category.sorting_price) : ''
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
 * 验证表单数据
 * @returns 是否验证通过
 */
function validateForm(): boolean {
  // 验证品类名称
  if (!formData.name.trim()) {
    uni.showToast({ title: '请输入品类名称', icon: 'none' })
    return false
  }
  
  // 验证基础单价
  const unitPrice = parseFloat(formData.unit_price)
  if (isNaN(unitPrice) || unitPrice < 0) {
    uni.showToast({ title: '请输入有效的基础单价', icon: 'none' })
    return false
  }
  
  // 验证上楼单价（如果填写了）
  if (formData.upstairs_price.trim()) {
    const upstairsPrice = parseFloat(formData.upstairs_price)
    if (isNaN(upstairsPrice) || upstairsPrice < 0) {
      uni.showToast({ title: '请输入有效的上楼单价', icon: 'none' })
      return false
    }
  }
  
  // 验证分拣单价（如果填写了）
  if (formData.sorting_price.trim()) {
    const sortingPrice = parseFloat(formData.sorting_price)
    if (isNaN(sortingPrice) || sortingPrice < 0) {
      uni.showToast({ title: '请输入有效的分拣单价', icon: 'none' })
      return false
    }
  }
  
  return true
}

/**
 * 提交表单
 * 支持添加和编辑模式
 * Requirements: 3.1, 3.2
 */
async function handleSubmit(): Promise<void> {
  // 验证表单
  if (!validateForm()) {
    return
  }
  
  try {
    uni.showLoading({ title: isEditing.value ? '保存中...' : '添加中...' })
    
    // 解析单价数据
    const unitPrice = parseFloat(formData.unit_price)
    const upstairsPrice = formData.upstairs_price.trim() ? parseFloat(formData.upstairs_price) : undefined
    const sortingPrice = formData.sorting_price.trim() ? parseFloat(formData.sorting_price) : undefined
    
    if (isEditing.value && editingId.value) {
      // 编辑模式 - 调用更新 API
      const updateData: PieceWorkCategoryUpdate = {
        name: formData.name.trim(),
        unit_price: unitPrice,
        upstairs_price: upstairsPrice,
        sorting_price: sortingPrice,
        unit: formData.unit.trim() || '件',
        is_active: formData.is_active,
      }
      await updatePieceWorkCategory(editingId.value, updateData)
    } else {
      // 添加模式 - 调用创建 API
      const createData: PieceWorkCategoryCreate = {
        name: formData.name.trim(),
        unit_price: unitPrice,
        upstairs_price: upstairsPrice,
        sorting_price: sortingPrice,
        unit: formData.unit.trim() || '件',
      }
      await createPieceWorkCategory(createData)
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
 * 如果品类已有计件记录，则不允许删除
 * 
 * @param category - 要删除的品类
 * Requirements: 3.3, 3.4
 */
function handleDelete(category: PieceWorkCategory): void {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除品类"${category.name}"吗？\n\n注意：如果该品类已有计件记录，将无法删除。`,
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })
          await deletePieceWorkCategory(category.id)
          uni.hideLoading()
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          })
          // 重新加载品类列表
          loadCategories()
        } catch (error: any) {
          uni.hideLoading()
          // 处理删除约束错误
          const errorMessage = error?.response?.data?.detail || error?.message || '删除失败'
          uni.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 2500,
          })
        }
      }
    },
  })
}
</script>


<style lang="scss" scoped>
/**
 * 仓库品类配置页面样式
 * 支持品类列表展示、添加/编辑弹窗
 */

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
  
  /* 基础单价样式 - 主要颜色 */
  &.price {
    font-size: 30rpx;
    font-weight: bold;
    color: #ff6b35;
  }
  
  /* 上楼/分拣单价样式 - 次要颜色 */
  &.price-secondary {
    font-size: 28rpx;
    font-weight: 500;
    color: #1890ff;
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
  max-height: 80vh;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
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
  overflow-y: auto;
  flex: 1;
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
  flex-shrink: 0;
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
