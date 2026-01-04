<template>
  <!-- 
    仓库品类配置页面（车队长端）
    按仓库卡片方式展示品类配置
    支持添加、编辑、删除品类
    采用用户管理页面的卡片样式
    Requirements: 3.1, 3.2, 3.3, 3.4
  -->
  <view class="categories-page">
    <!-- 页面标题区 -->
    <view class="page-header">
      <text class="header-title">品类配置</text>
      <text class="header-subtitle">管理计件品类和单价配置</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 空状态 - 无仓库 -->
      <view v-if="warehouses.length === 0" class="empty-container">
        <text class="empty-icon">🏭</text>
        <text class="empty-text">暂无可管理的仓库</text>
        <text class="empty-hint">请联系管理员分配仓库</text>
      </view>

      <!-- 仓库卡片列表 -->
      <view v-else class="warehouse-list">
        <view
          v-for="warehouse in warehouses"
          :key="warehouse.id"
          class="warehouse-card"
        >
          <!-- 仓库头部 -->
          <view class="warehouse-header">
            <view class="warehouse-info">
              <text class="warehouse-icon">🏭</text>
              <text class="warehouse-name">{{ warehouse.name }}</text>
            </view>
          </view>

          <!-- 品类列表 -->
          <view class="category-list">
            <view
              v-for="category in getCategoriesByWarehouse(warehouse.id)"
              :key="category.id"
              class="category-card"
            >
              <!-- 品类头部 -->
              <view class="category-header">
                <view class="category-name-row">
                  <text class="category-name">{{ category.name }}</text>
                  <view :class="['status-tag', category.is_active ? 'active' : 'inactive']">
                    <text class="status-text">{{ category.is_active ? '启用' : '停用' }}</text>
                  </view>
                </view>
                <view class="category-actions">
                  <view class="action-btn edit-btn" @click="startEdit(category, warehouse)">
                    <text class="btn-icon">✏️</text>
                    <text class="btn-text">编辑</text>
                  </view>
                  <view class="action-btn delete-btn" @click="handleDelete(category)">
                    <text class="btn-icon">🗑️</text>
                    <text class="btn-text">删除</text>
                  </view>
                </view>
              </view>

              <!-- 编辑表单（内联） -->
              <view v-if="editingId === category.id" class="edit-form">
                <view class="form-row">
                  <view class="form-item">
                    <text class="form-label">品类名称</text>
                    <input
                      v-model="formData.name"
                      type="text"
                      class="form-input"
                      placeholder="请输入品类名称"
                    />
                  </view>
                </view>
                <view class="form-row two-col">
                  <view class="form-item">
                    <text class="form-label">基础单价（元）</text>
                    <input
                      v-model="formData.unit_price"
                      type="text"
                      inputmode="decimal"
                      class="form-input"
                      placeholder="请输入单价"
                    />
                  </view>
                  <view class="form-item">
                    <text class="form-label">单位</text>
                    <input
                      v-model="formData.unit"
                      type="text"
                      class="form-input"
                      placeholder="默认为件"
                    />
                  </view>
                </view>
                <view class="form-row two-col">
                  <view class="form-item">
                    <text class="form-label">上楼单价（元）</text>
                    <input
                      v-model="formData.upstairs_price"
                      type="text"
                      inputmode="decimal"
                      class="form-input"
                      placeholder="可选"
                    />
                  </view>
                  <view class="form-item">
                    <text class="form-label">分拣单价（元）</text>
                    <input
                      v-model="formData.sorting_price"
                      type="text"
                      inputmode="decimal"
                      class="form-input"
                      placeholder="可选"
                    />
                  </view>
                </view>
                <view class="form-row">
                  <view class="form-item">
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
                <view class="form-actions">
                  <view class="form-btn save-btn" @click="handleUpdate">
                    <text class="btn-text">保存</text>
                  </view>
                  <view class="form-btn cancel-btn" @click="cancelEdit">
                    <text class="btn-text">取消</text>
                  </view>
                </view>
              </view>

              <!-- 价格信息（非编辑状态） -->
              <view v-else class="price-grid">
                <view class="price-item main">
                  <text class="price-label">基础单价</text>
                  <text class="price-value">¥{{ formatMoney(category.unit_price) }}/{{ category.unit || '件' }}</text>
                </view>
                <view v-if="category.upstairs_price != null" class="price-item">
                  <text class="price-label">上楼单价</text>
                  <text class="price-value secondary">¥{{ formatMoney(category.upstairs_price) }}</text>
                </view>
                <view v-if="category.sorting_price != null" class="price-item">
                  <text class="price-label">分拣单价</text>
                  <text class="price-value secondary">¥{{ formatMoney(category.sorting_price) }}</text>
                </view>
              </view>
            </view>

            <!-- 空品类提示 -->
            <view v-if="getCategoriesByWarehouse(warehouse.id).length === 0 && addingWarehouseId !== warehouse.id" class="empty-categories">
              <text class="empty-hint">暂无品类，点击下方添加</text>
            </view>

            <!-- 添加品类表单（内联在品类列表下方） -->
            <view v-if="addingWarehouseId === warehouse.id" class="add-form">
              <view class="form-title">添加新品类</view>
              <view class="form-row">
                <view class="form-item">
                  <text class="form-label">品类名称 <text class="required">*</text></text>
                  <input
                    v-model="formData.name"
                    type="text"
                    class="form-input"
                    placeholder="请输入品类名称"
                  />
                </view>
              </view>
              <view class="form-row two-col">
                <view class="form-item">
                  <text class="form-label">基础单价（元） <text class="required">*</text></text>
                  <input
                    v-model="formData.unit_price"
                    type="text"
                    inputmode="decimal"
                    class="form-input"
                    placeholder="请输入单价"
                  />
                </view>
                <view class="form-item">
                  <text class="form-label">单位</text>
                  <input
                    v-model="formData.unit"
                    type="text"
                    class="form-input"
                    placeholder="默认为件"
                  />
                </view>
              </view>
              <view class="form-row two-col">
                <view class="form-item">
                  <text class="form-label">上楼单价（元）</text>
                  <input
                    v-model="formData.upstairs_price"
                    type="text"
                    inputmode="decimal"
                    class="form-input"
                    placeholder="可选"
                  />
                </view>
                <view class="form-item">
                  <text class="form-label">分拣单价（元）</text>
                  <input
                    v-model="formData.sorting_price"
                    type="text"
                    inputmode="decimal"
                    class="form-input"
                    placeholder="可选"
                  />
                </view>
              </view>
              <view class="form-actions">
                <view class="form-btn save-btn" @click="handleAdd">
                  <text class="btn-text">添加</text>
                </view>
                <view class="form-btn cancel-btn" @click="cancelAdd">
                  <text class="btn-text">取消</text>
                </view>
              </view>
            </view>

            <!-- 添加品类按钮 -->
            <view 
              v-if="addingWarehouseId !== warehouse.id" 
              class="add-category-btn" 
              @click="startAdd(warehouse)"
            >
              <text class="add-icon">+</text>
              <text class="add-text">添加品类</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 仓库品类配置页面（车队长端）
 * 按仓库卡片方式展示品类配置
 * 支持添加、编辑、删除品类
 * 采用用户管理页面的卡片样式
 * 
 * @requirements 3.1 - 支持多种单价配置
 * @requirements 3.2 - 支持编辑品类配置
 * @requirements 3.3 - 支持删除品类
 * @requirements 3.4 - 删除约束检查（有计件记录不可删除）
 */

import { ref, reactive, onMounted } from 'vue'
import { 
  getWarehouses, 
  getPieceWorkCategories, 
  createPieceWorkCategory,
  updatePieceWorkCategory,
  deletePieceWorkCategory
} from '@/api'
import type { Warehouse, PieceWorkCategory, PieceWorkCategoryCreate, PieceWorkCategoryUpdate } from '@/api/types'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 品类列表 */
const categories = ref<PieceWorkCategory[]>([])

/** 正在添加品类的仓库ID */
const addingWarehouseId = ref<number | null>(null)

/** 正在编辑的品类ID */
const editingId = ref<number | null>(null)

/** 当前操作的仓库 */
const currentWarehouse = ref<Warehouse | null>(null)

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

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
})

// ==================== 方法 ====================

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    const [warehouseData, categoryData] = await Promise.all([
      getWarehouses({ is_active: true }),
      getPieceWorkCategories()
    ])
    warehouses.value = warehouseData
    categories.value = categoryData
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 根据仓库ID获取品类列表
 */
function getCategoriesByWarehouse(warehouseId: number): PieceWorkCategory[] {
  return categories.value.filter(c => c.warehouse_id === warehouseId)
}

/**
 * 格式化金额
 */
function formatMoney(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0.00'
  return value.toFixed(2)
}

/**
 * 重置表单
 */
function resetForm(): void {
  formData.name = ''
  formData.unit_price = ''
  formData.upstairs_price = ''
  formData.sorting_price = ''
  formData.unit = ''
  formData.is_active = true
}

/**
 * 开始添加品类
 */
function startAdd(warehouse: Warehouse): void {
  // 取消其他编辑状态
  editingId.value = null
  addingWarehouseId.value = warehouse.id
  currentWarehouse.value = warehouse
  resetForm()
}

/**
 * 取消添加
 */
function cancelAdd(): void {
  addingWarehouseId.value = null
  currentWarehouse.value = null
  resetForm()
}

/**
 * 开始编辑品类
 */
function startEdit(category: PieceWorkCategory, warehouse: Warehouse): void {
  // 取消添加状态
  addingWarehouseId.value = null
  editingId.value = category.id
  currentWarehouse.value = warehouse
  formData.name = category.name
  formData.unit_price = String(category.unit_price)
  formData.upstairs_price = category.upstairs_price != null ? String(category.upstairs_price) : ''
  formData.sorting_price = category.sorting_price != null ? String(category.sorting_price) : ''
  formData.unit = category.unit || ''
  formData.is_active = category.is_active
}

/**
 * 取消编辑
 */
function cancelEdit(): void {
  editingId.value = null
  currentWarehouse.value = null
  resetForm()
}

/**
 * 验证表单
 */
function validateForm(): boolean {
  if (!formData.name.trim()) {
    uni.showToast({ title: '请输入品类名称', icon: 'none' })
    return false
  }
  
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
 * 添加品类
 */
async function handleAdd(): Promise<void> {
  if (!validateForm() || !currentWarehouse.value) return
  
  try {
    uni.showLoading({ title: '添加中...' })
    
    const unitPrice = parseFloat(formData.unit_price)
    const upstairsPrice = formData.upstairs_price.trim() ? parseFloat(formData.upstairs_price) : undefined
    const sortingPrice = formData.sorting_price.trim() ? parseFloat(formData.sorting_price) : undefined
    
    const createData: PieceWorkCategoryCreate = {
      name: formData.name.trim(),
      warehouse_id: currentWarehouse.value.id,
      unit_price: unitPrice,
      upstairs_price: upstairsPrice,
      sorting_price: sortingPrice,
      unit: formData.unit.trim() || '件',
    }
    await createPieceWorkCategory(createData)
    
    uni.hideLoading()
    uni.showToast({ title: '添加成功', icon: 'success' })
    
    cancelAdd()
    // 重新加载品类数据
    const categoryData = await getPieceWorkCategories()
    categories.value = categoryData
  } catch (error) {
    console.error('添加失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

/**
 * 更新品类
 */
async function handleUpdate(): Promise<void> {
  if (!validateForm() || !editingId.value) return
  
  try {
    uni.showLoading({ title: '保存中...' })
    
    const unitPrice = parseFloat(formData.unit_price)
    const upstairsPrice = formData.upstairs_price.trim() ? parseFloat(formData.upstairs_price) : undefined
    const sortingPrice = formData.sorting_price.trim() ? parseFloat(formData.sorting_price) : undefined
    
    const updateData: PieceWorkCategoryUpdate = {
      name: formData.name.trim(),
      unit_price: unitPrice,
      upstairs_price: upstairsPrice,
      sorting_price: sortingPrice,
      unit: formData.unit.trim() || '件',
      is_active: formData.is_active,
    }
    await updatePieceWorkCategory(editingId.value, updateData)
    
    uni.hideLoading()
    uni.showToast({ title: '保存成功', icon: 'success' })
    
    cancelEdit()
    // 重新加载品类数据
    const categoryData = await getPieceWorkCategories()
    categories.value = categoryData
  } catch (error) {
    console.error('保存失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

/**
 * 删除品类
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
          uni.showToast({ title: '删除成功', icon: 'success' })
          // 重新加载品类数据
          const categoryData = await getPieceWorkCategories()
          categories.value = categoryData
        } catch (error: any) {
          uni.hideLoading()
          const errorMessage = error?.response?.data?.detail || '删除失败'
          uni.showToast({ title: errorMessage, icon: 'none', duration: 2500 })
        }
      }
    },
  })
}
</script>


<style lang="scss" scoped>
/**
 * 仓库品类配置页面样式（车队长端）
 * 采用用户管理页面的卡片样式
 */

/* 页面容器 */
.categories-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8fafc, #e2e8f0);
  padding: 24rpx;
  box-sizing: border-box;
}

/* 页面标题区 */
.page-header {
  background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
  border-radius: 16rpx;
  padding: 48rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(30, 58, 138, 0.3);
}

.header-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 12rpx;
}

.header-subtitle {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
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

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.empty-icon {
  font-size: 96rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #9ca3af;
}

/* 仓库列表 */
.warehouse-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 仓库卡片 */
.warehouse-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  border: 2rpx solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 仓库头部 */
.warehouse-header {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.warehouse-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.warehouse-icon {
  font-size: 36rpx;
}

.warehouse-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 品类列表 */
.category-list {
  padding: 16rpx;
}

/* 品类卡片 */
.category-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  border: 2rpx solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 12rpx;
}

/* 品类头部 */
.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background-color: #f9fafb;
  border-bottom: 1rpx solid #f3f4f6;
}

.category-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.category-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #1f2937;
}

.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  
  &.active {
    background-color: #dcfce7;
    
    .status-text {
      color: #16a34a;
    }
  }
  
  &.inactive {
    background-color: #fee2e2;
    
    .status-text {
      color: #dc2626;
    }
  }
}

.status-text {
  font-size: 22rpx;
  font-weight: 500;
}

.category-actions {
  display: flex;
  gap: 12rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  border: 1rpx solid;
  
  &.edit-btn {
    background-color: #eff6ff;
    border-color: #bfdbfe;
    
    .btn-text {
      color: #2563eb;
    }
  }
  
  &.delete-btn {
    background-color: #fff1f2;
    border-color: #fecdd3;
    
    .btn-text {
      color: #e11d48;
    }
  }
}

.btn-icon {
  font-size: 24rpx;
  margin-right: 4rpx;
}

.btn-text {
  font-size: 24rpx;
  font-weight: 500;
}

/* 价格网格 */
.price-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 20rpx 24rpx;
}

.price-item {
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
  border-radius: 8rpx;
  padding: 12rpx 16rpx;
  
  &.main {
    grid-column: span 2;
    background-color: #fff7ed;
    border: 1rpx solid #fed7aa;
  }
}

.price-label {
  font-size: 22rpx;
  color: #6b7280;
  margin-bottom: 4rpx;
}

.price-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff6b35;
  
  &.secondary {
    font-size: 26rpx;
    color: #1890ff;
  }
}

/* 空品类提示 */
.empty-categories {
  padding: 32rpx;
  text-align: center;
  background-color: #f9fafb;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

/* 添加品类按钮 */
.add-category-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3);
}

.add-icon {
  font-size: 28rpx;
  color: #ffffff;
  margin-right: 8rpx;
}

.add-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 添加/编辑表单 */
.add-form,
.edit-form {
  padding: 20rpx;
  background-color: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.edit-form {
  margin: 0;
  border-radius: 0;
  border: none;
  border-top: 1rpx solid #bfdbfe;
}

.form-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1e3a8a;
  margin-bottom: 16rpx;
}

.form-row {
  margin-bottom: 16rpx;
  
  &.two-col {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16rpx;
  }
  
  &:last-of-type {
    margin-bottom: 0;
  }
}

.form-item {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 24rpx;
  color: #374151;
  margin-bottom: 8rpx;
}

.required {
  color: #ef4444;
}

.form-input {
  height: 72rpx;
  background-color: #ffffff;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 28rpx;
  border: 2rpx solid #d1d5db;
  box-sizing: border-box;
}

/* 状态切换 */
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
  background-color: #ffffff;
  border-radius: 8rpx;
  border: 2rpx solid #d1d5db;
  
  &.active {
    background-color: #2563eb;
    border-color: #2563eb;
    
    .option-text {
      color: #ffffff;
    }
  }
}

.option-text {
  font-size: 28rpx;
  color: #666666;
}

.form-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.form-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  border-radius: 8rpx;
  
  &.save-btn {
    background-color: #2563eb;
    
    .btn-text {
      color: #ffffff;
    }
  }
  
  &.cancel-btn {
    background-color: #9ca3af;
    
    .btn-text {
      color: #ffffff;
    }
  }
}
</style>
