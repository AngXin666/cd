<template>
  <!-- 
    计件品类管理页面（老板端）
    按仓库卡片方式展示品类配置
    支持添加、编辑、删除品类
    品类仅需配置：名称、纯司机单价、带车司机单价
    采用用户管理页面的卡片样式
    Requirements: 统一老板端和车队长端的品类管理
  -->
  <view class="categories-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="handleBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="nav-title">
        <text class="title-text">计件品类管理</text>
      </view>
      <view class="nav-right" />
    </view>

    <!-- 页面标题区 -->
    <view class="page-header">
      <text class="header-subtitle">管理各仓库的计件品类和单价配置</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 空状态 -->
      <view v-if="warehouses.length === 0" class="empty-container">
        <text class="empty-icon">🏭</text>
        <text class="empty-text">暂无仓库</text>
        <text class="empty-hint">请先创建仓库</text>
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
              <view class="warehouse-type-tag">
                <text class="type-text">{{ getWarehouseTypeDisplay(warehouse.warehouse_type) }}</text>
              </view>
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
                    <text class="form-label">纯司机单价（元）</text>
                    <input
                      v-model="formData.driver_only_price"
                      type="text"
                      inputmode="decimal"
                      class="form-input"
                      placeholder="请输入单价"
                    />
                  </view>
                  <view class="form-item">
                    <text class="form-label">带车司机单价（元）</text>
                    <input
                      v-model="formData.with_vehicle_price"
                      type="text"
                      inputmode="decimal"
                      class="form-input"
                      placeholder="请输入单价"
                    />
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
                <view class="price-item">
                  <text class="price-label">纯司机</text>
                  <text class="price-value">¥{{ formatMoney(category.driver_only_price) }}</text>
                </view>
                <view class="price-item">
                  <text class="price-label">带车司机</text>
                  <text class="price-value">¥{{ formatMoney(category.with_vehicle_price) }}</text>
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
                  <text class="form-label">纯司机单价（元） <text class="required">*</text></text>
                  <input
                    v-model="formData.driver_only_price"
                    type="text"
                    inputmode="decimal"
                    class="form-input"
                    placeholder="请输入单价"
                  />
                </view>
                <view class="form-item">
                  <text class="form-label">带车司机单价（元） <text class="required">*</text></text>
                  <input
                    v-model="formData.with_vehicle_price"
                    type="text"
                    inputmode="decimal"
                    class="form-input"
                    placeholder="请输入单价"
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
 * 计件品类管理页面（老板端）
 * 按仓库卡片方式展示品类配置
 * 支持添加、编辑、删除品类
 * 采用用户管理页面的卡片样式
 */

import { ref, reactive, onMounted } from 'vue'
import { 
  getWarehouses, 
  getPieceWorkCategories, 
  createPieceWorkCategory,
  updatePieceWorkCategory,
  deletePieceWorkCategory
} from '@/api'
import type { 
  Warehouse, 
  PieceWorkCategory, 
  PieceWorkCategoryCreate, 
  PieceWorkCategoryUpdate,
  WarehouseType
} from '@/api/types'
import { getWarehouseTypeDisplayName } from '@/api/types'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 所有品类列表 */
const categories = ref<PieceWorkCategory[]>([])

/** 正在添加品类的仓库ID */
const addingWarehouseId = ref<number | null>(null)

/** 正在编辑的品类ID */
const editingId = ref<number | null>(null)

/** 当前操作的仓库 */
const currentWarehouse = ref<Warehouse | null>(null)

/** 表单数据 */
const formData = reactive({
  name: '',
  driver_only_price: '',
  with_vehicle_price: '',
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
 * 获取仓库类型显示名称
 */
function getWarehouseTypeDisplay(type: WarehouseType | string): string {
  return getWarehouseTypeDisplayName(type)
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
  formData.driver_only_price = ''
  formData.with_vehicle_price = ''
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
  formData.driver_only_price = String(category.driver_only_price || 0)
  formData.with_vehicle_price = String(category.with_vehicle_price || 0)
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
 * 返回上一页
 */
function handleBack(): void {
  uni.navigateBack({
    fail: () => {
      // 如果没有上一页，跳转到首页
      uni.switchTab({ url: '/pages/index/index' })
    }
  })
}

/**
 * 验证表单
 */
function validateForm(): boolean {
  if (!formData.name.trim()) {
    uni.showToast({ title: '请输入品类名称', icon: 'none' })
    return false
  }
  
  const driverPrice = parseFloat(formData.driver_only_price)
  if (isNaN(driverPrice) || driverPrice < 0) {
    uni.showToast({ title: '请输入有效的纯司机单价', icon: 'none' })
    return false
  }
  
  const vehiclePrice = parseFloat(formData.with_vehicle_price)
  if (isNaN(vehiclePrice) || vehiclePrice < 0) {
    uni.showToast({ title: '请输入有效的带车司机单价', icon: 'none' })
    return false
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
    
    const driverPrice = parseFloat(formData.driver_only_price)
    const vehiclePrice = parseFloat(formData.with_vehicle_price)
    
    const createData: PieceWorkCategoryCreate = {
      name: formData.name.trim(),
      warehouse_id: currentWarehouse.value.id,
      driver_only_price: driverPrice,
      with_vehicle_price: vehiclePrice,
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
    
    const driverPrice = parseFloat(formData.driver_only_price)
    const vehiclePrice = parseFloat(formData.with_vehicle_price)
    
    const updateData: PieceWorkCategoryUpdate = {
      name: formData.name.trim(),
      driver_only_price: driverPrice,
      with_vehicle_price: vehiclePrice,
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
 * 计件品类管理页面样式
 * 采用用户管理页面的卡片样式
 */

/* 页面容器 */
.categories-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8fafc, #e2e8f0);
  padding-bottom: 24rpx;
  box-sizing: border-box;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
}

.nav-left {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.back-icon {
  font-size: 48rpx;
  color: #ffffff;
  font-weight: bold;
}

.nav-title {
  flex: 1;
  text-align: center;
}

.title-text {
  font-size: 34rpx;
  font-weight: bold;
  color: #ffffff;
}

.nav-right {
  width: 80rpx;
}

/* 页面标题区 */
.page-header {
  background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
  padding: 24rpx 32rpx 48rpx;
  margin-bottom: 24rpx;
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
  margin: 0 24rpx;
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
  margin: 0 24rpx;
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

.warehouse-type-tag {
  padding: 4rpx 12rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 8rpx;
}

.type-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
}

/* 品类列表 */
.category-list {
  padding: 16rpx;
}

/* 品类卡片 */
.category-card {
  background-color: #f9fafb;
  border-radius: 12rpx;
  border: 2rpx solid #e5e7eb;
  margin-bottom: 12rpx;
  overflow: hidden;
}

/* 品类头部 */
.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f3f4f6;
}

.category-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.category-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #1f2937;
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
  padding: 16rpx 20rpx;
}

.price-item {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 8rpx;
  padding: 12rpx 16rpx;
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

.form-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
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
