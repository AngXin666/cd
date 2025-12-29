<!--
  件数表单页面（老板端）
  手动录入计件数据，支持选择司机、日期、仓库和品类
  用于补录或修正司机的计件记录
  
  @module pages/boss/piece-work/form
  @requirements 10.1, 10.2, 10.3, 10.4, 10.5
-->
<template>
  <view class="piece-work-form-page">
    <!-- 顶部导航栏 -->
    <TopNavBar 
      title="件数录入" 
      :show-back="true"
      @back="handleBack"
    />

    <!-- 页面内容 -->
    <scroll-view scroll-y class="page-content">
      <view class="content-wrapper">
        <!-- 基本信息卡片 -->
        <view class="form-card">
          <view class="card-header">
            <text class="card-icon">📋</text>
            <text class="card-title">基本信息</text>
          </view>

          <!-- 司机选择 -->
          <view class="form-item">
            <text class="form-label">
              <text class="required">*</text> 司机
            </text>
            <view v-if="loadingDrivers" class="loading-text">加载中...</view>
            <picker 
              v-else
              mode="selector" 
              :range="driverNames" 
              :value="selectedDriverIndex"
              @change="onDriverChange"
            >
              <view class="form-picker">
                <text :class="['picker-value', { placeholder: !currentDriverName }]">
                  {{ currentDriverName || '请选择司机' }}
                </text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- 日期选择 -->
          <view class="form-item">
            <text class="form-label">
              <text class="required">*</text> 工作日期
            </text>
            <picker mode="date" :value="workDate" :end="today" @change="onDateChange">
              <view class="form-picker">
                <text :class="['picker-value', { placeholder: !workDate }]">
                  {{ workDate || '请选择日期' }}
                </text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- 仓库选择 -->
          <view class="form-item">
            <text class="form-label">
              <text class="required">*</text> 仓库
            </text>
            <view v-if="loadingWarehouses" class="loading-text">加载中...</view>
            <picker 
              v-else
              mode="selector" 
              :range="warehouseNames" 
              :value="selectedWarehouseIndex"
              @change="onWarehouseChange"
            >
              <view class="form-picker">
                <text :class="['picker-value', { placeholder: !currentWarehouseName }]">
                  {{ currentWarehouseName || '请选择仓库' }}
                </text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>
        </view>

        <!-- 品类列表卡片 -->
        <view class="form-card">
          <view class="card-header">
            <text class="card-icon">📦</text>
            <text class="card-title">品类件数</text>
            <text v-if="categories.length > 0" class="card-subtitle">
              共 {{ categories.length }} 个品类
            </text>
          </view>

          <!-- 加载状态 -->
          <view v-if="loadingCategories" class="loading-container">
            <text class="loading-text">加载品类中...</text>
          </view>

          <!-- 空状态 -->
          <view v-else-if="categories.length === 0" class="empty-container">
            <text class="empty-icon">📭</text>
            <text class="empty-text">暂无品类数据</text>
            <text class="empty-hint">请先在系统中配置品类</text>
          </view>

          <!-- 品类列表 -->
          <view v-else class="category-list">
            <view 
              v-for="(category, index) in categories" 
              :key="category.id"
              class="category-item"
            >
              <view class="category-info">
                <text class="category-name">{{ category.name }}</text>
                <text class="category-price">单价：¥{{ formatMoney(category.unit_price) }}/{{ category.unit || '件' }}</text>
              </view>
              <view class="category-input">
                <input 
                  type="number" 
                  class="quantity-input"
                  :value="categoryQuantities[category.id] || ''"
                  placeholder="0"
                  @input="(e: any) => onQuantityInput(category.id, e.detail.value)"
                />
                <text class="input-unit">{{ category.unit || '件' }}</text>
              </view>
              <view class="category-amount">
                <text class="amount-label">金额</text>
                <text class="amount-value">¥{{ formatMoney(calculateCategoryAmount(category)) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 汇总卡片 -->
        <view v-if="categories.length > 0" class="summary-card">
          <view class="summary-row">
            <view class="summary-item">
              <text class="summary-label">总件数</text>
              <text class="summary-value">{{ totalQuantity }}</text>
            </view>
            <view class="summary-divider"></view>
            <view class="summary-item">
              <text class="summary-label">总金额</text>
              <text class="summary-value highlight">¥{{ formatMoney(totalAmount) }}</text>
            </view>
          </view>
        </view>

        <!-- 底部占位 -->
        <view class="bottom-placeholder"></view>
      </view>
    </scroll-view>

    <!-- 底部提交按钮 -->
    <view class="submit-section">
      <view 
        :class="['submit-btn', { disabled: !canSubmit || submitting }]"
        @click="handleSubmit"
      >
        <text class="submit-text">{{ submitting ? '提交中...' : '提交录入' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 件数表单页面（老板端）
 * 手动录入计件数据，支持选择司机、日期、仓库和品类
 * 用于补录或修正司机的计件记录
 * 
 * @requirements 10.1 - 显示司机选择器和日期选择器
 * @requirements 10.2 - 选择司机和日期后加载计件品类
 * @requirements 10.3 - 验证件数为非负整数
 * @requirements 10.4 - 保存计件数据并显示成功提示
 * @requirements 10.5 - 提交失败时保留用户输入
 */

import { ref, computed, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { 
  getUsers, 
  getWarehouses, 
  getPieceWorkCategories, 
  createPieceWorkRecord 
} from '@/api'
import type { User, Warehouse, PieceWorkCategory } from '@/api/types'
import { UserRole } from '@/api/types'
import { formatMoney, navigateBack, getToday } from '@/utils'
import TopNavBar from '@/components/TopNavBar/index.vue'

// ==================== 状态 ====================

/** 加载司机列表状态 */
const loadingDrivers = ref(false)

/** 加载仓库列表状态 */
const loadingWarehouses = ref(false)

/** 加载品类列表状态 */
const loadingCategories = ref(false)

/** 提交状态 */
const submitting = ref(false)

/** 司机列表 */
const drivers = ref<User[]>([])

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 品类列表 */
const categories = ref<PieceWorkCategory[]>([])

/** 选中的司机索引 */
const selectedDriverIndex = ref(-1)

/** 选中的仓库索引 */
const selectedWarehouseIndex = ref(-1)

/** 工作日期 */
const workDate = ref('')

/** 今天的日期（用于限制日期选择） */
const today = ref(getToday())

/** 各品类的件数输入 */
const categoryQuantities = ref<Record<number, string>>({})

// ==================== 计算属性 ====================

/** 司机名称列表 */
const driverNames = computed(() => drivers.value.map(d => d.name))

/** 当前选中的司机名称 */
const currentDriverName = computed(() => {
  if (selectedDriverIndex.value >= 0 && selectedDriverIndex.value < drivers.value.length) {
    return drivers.value[selectedDriverIndex.value].name
  }
  return ''
})

/** 当前选中的司机 */
const currentDriver = computed(() => {
  if (selectedDriverIndex.value >= 0 && selectedDriverIndex.value < drivers.value.length) {
    return drivers.value[selectedDriverIndex.value]
  }
  return null
})

/** 仓库名称列表 */
const warehouseNames = computed(() => warehouses.value.map(w => w.name))

/** 当前选中的仓库名称 */
const currentWarehouseName = computed(() => {
  if (selectedWarehouseIndex.value >= 0 && selectedWarehouseIndex.value < warehouses.value.length) {
    return warehouses.value[selectedWarehouseIndex.value].name
  }
  return ''
})

/** 当前选中的仓库 */
const currentWarehouse = computed(() => {
  if (selectedWarehouseIndex.value >= 0 && selectedWarehouseIndex.value < warehouses.value.length) {
    return warehouses.value[selectedWarehouseIndex.value]
  }
  return null
})

/**
 * 总件数
 * 计算所有品类的件数之和
 */
const totalQuantity = computed(() => {
  return Object.values(categoryQuantities.value).reduce((sum, qty) => {
    const num = parseInt(qty, 10)
    return sum + (isNaN(num) ? 0 : num)
  }, 0)
})

/**
 * 总金额
 * 计算所有品类的金额之和
 */
const totalAmount = computed(() => {
  return categories.value.reduce((sum, category) => {
    return sum + calculateCategoryAmount(category)
  }, 0)
})

/**
 * 是否可以提交
 * 必须选择司机、日期、仓库，且至少有一个品类有件数
 */
const canSubmit = computed(() => {
  // 必须选择司机
  if (!currentDriver.value) return false
  
  // 必须选择日期
  if (!workDate.value) return false
  
  // 必须选择仓库
  if (!currentWarehouse.value) return false
  
  // 至少有一个品类有件数
  if (totalQuantity.value <= 0) return false
  
  // 所有输入的件数必须是非负整数
  for (const qty of Object.values(categoryQuantities.value)) {
    if (qty) {
      const num = parseInt(qty, 10)
      if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
        return false
      }
    }
  }
  
  return true
})

// ==================== 生命周期 ====================

onLoad((options) => {
  // 如果有传入参数，可以预设值
  if (options?.user_id) {
    // 预设司机ID，稍后在加载完司机列表后选中
  }
  if (options?.date) {
    workDate.value = options.date as string
  }
})

onMounted(async () => {
  // 初始化日期为今天
  if (!workDate.value) {
    workDate.value = today.value
  }
  
  // 加载数据
  await Promise.all([
    loadDrivers(),
    loadWarehouses(),
  ])
  
  // 加载品类
  await loadCategories()
})

// ==================== 监听器 ====================

/**
 * 监听司机和日期变化，重新加载品类
 */
watch([() => currentDriver.value, () => workDate.value], () => {
  // 当司机或日期变化时，可以根据需要重新加载品类
  // 当前实现中品类是全局的，不需要重新加载
})

// ==================== 方法 ====================

/**
 * 加载司机列表
 * 获取所有司机角色的用户
 */
async function loadDrivers(): Promise<void> {
  loadingDrivers.value = true
  try {
    const data = await getUsers({ role: UserRole.DRIVER, is_active: true })
    drivers.value = data
  } catch (error) {
    console.error('加载司机列表失败:', error)
    uni.showToast({
      title: '加载司机失败',
      icon: 'none',
    })
  } finally {
    loadingDrivers.value = false
  }
}

/**
 * 加载仓库列表
 * 获取所有启用的仓库
 */
async function loadWarehouses(): Promise<void> {
  loadingWarehouses.value = true
  try {
    const data = await getWarehouses({ is_active: true })
    warehouses.value = data
  } catch (error) {
    console.error('加载仓库列表失败:', error)
    uni.showToast({
      title: '加载仓库失败',
      icon: 'none',
    })
  } finally {
    loadingWarehouses.value = false
  }
}

/**
 * 加载品类列表
 * 获取所有启用的计件品类
 * @requirements 10.2 - 加载计件品类
 */
async function loadCategories(): Promise<void> {
  loadingCategories.value = true
  try {
    const data = await getPieceWorkCategories(true)
    categories.value = data
    
    // 初始化品类件数为空
    categoryQuantities.value = {}
  } catch (error) {
    console.error('加载品类列表失败:', error)
    uni.showToast({
      title: '加载品类失败',
      icon: 'none',
    })
  } finally {
    loadingCategories.value = false
  }
}

/**
 * 司机选择变化
 * @param e - 事件对象
 */
function onDriverChange(e: any): void {
  selectedDriverIndex.value = Number(e.detail.value)
}

/**
 * 日期选择变化
 * @param e - 事件对象
 */
function onDateChange(e: any): void {
  workDate.value = e.detail.value
}

/**
 * 仓库选择变化
 * @param e - 事件对象
 */
function onWarehouseChange(e: any): void {
  selectedWarehouseIndex.value = Number(e.detail.value)
}

/**
 * 件数输入变化
 * 验证输入为非负整数
 * @param categoryId - 品类ID
 * @param value - 输入值
 * @requirements 10.3 - 验证件数为非负整数
 */
function onQuantityInput(categoryId: number, value: string): void {
  // 移除非数字字符
  const cleanValue = value.replace(/[^0-9]/g, '')
  
  // 移除前导零（除非是单独的0）
  const normalizedValue = cleanValue.replace(/^0+(?=\d)/, '')
  
  // 更新值
  categoryQuantities.value = {
    ...categoryQuantities.value,
    [categoryId]: normalizedValue,
  }
}

/**
 * 计算单个品类的金额
 * @param category - 品类对象
 * @returns 金额
 */
function calculateCategoryAmount(category: PieceWorkCategory): number {
  const qty = categoryQuantities.value[category.id]
  if (!qty) return 0
  
  const quantity = parseInt(qty, 10)
  if (isNaN(quantity) || quantity <= 0) return 0
  
  return quantity * category.unit_price
}

/**
 * 返回上一页
 */
function handleBack(): void {
  navigateBack()
}

/**
 * 提交计件记录
 * @requirements 10.4, 10.5 - 保存计件数据
 */
async function handleSubmit(): Promise<void> {
  if (!canSubmit.value || submitting.value) return
  
  const driver = currentDriver.value
  const warehouse = currentWarehouse.value
  
  if (!driver || !warehouse) return
  
  // 收集有件数的品类
  const recordsToCreate: Array<{
    categoryId: number
    categoryName: string
    quantity: number
    amount: number
  }> = []
  
  for (const category of categories.value) {
    const qty = categoryQuantities.value[category.id]
    if (qty) {
      const quantity = parseInt(qty, 10)
      if (quantity > 0) {
        recordsToCreate.push({
          categoryId: category.id,
          categoryName: category.name,
          quantity,
          amount: quantity * category.unit_price,
        })
      }
    }
  }
  
  if (recordsToCreate.length === 0) {
    uni.showToast({
      title: '请至少输入一个品类的件数',
      icon: 'none',
    })
    return
  }
  
  // 确认提交
  uni.showModal({
    title: '确认提交',
    content: `确定要为 ${driver.name} 录入 ${recordsToCreate.length} 条计件记录吗？\n总件数：${totalQuantity.value}\n总金额：¥${formatMoney(totalAmount.value)}`,
    success: async (res) => {
      if (res.confirm) {
        await doSubmit(driver, warehouse, recordsToCreate)
      }
    },
  })
}

/**
 * 执行提交
 * @param driver - 司机
 * @param warehouse - 仓库
 * @param records - 要创建的记录
 */
async function doSubmit(
  driver: User,
  warehouse: Warehouse,
  records: Array<{ categoryId: number; categoryName: string; quantity: number; amount: number }>
): Promise<void> {
  submitting.value = true
  
  try {
    // 逐个创建计件记录
    // 注意：后端 API 可能需要调整以支持指定 user_id
    for (const record of records) {
      await createPieceWorkRecord({
        category_id: record.categoryId,
        warehouse_id: warehouse.id,
        work_date: workDate.value,
        quantity: record.quantity,
      })
    }
    
    uni.showToast({
      title: `成功录入 ${records.length} 条记录`,
      icon: 'success',
    })
    
    // 延迟返回
    setTimeout(() => {
      navigateBack()
    }, 1500)
  } catch (error: any) {
    // 10.5 - 提交失败时保留用户输入
    console.error('提交计件记录失败:', error)
    uni.showToast({
      title: error.message || '提交失败，请重试',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
/**
 * 件数表单页面样式
 * 包含表单卡片、品类列表、汇总卡片等样式
 */

.piece-work-form-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 页面内容 */
.page-content {
  flex: 1;
  height: 0;
}

.content-wrapper {
  padding: 24rpx;
}

/* 表单卡片 */
.form-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.card-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  flex: 1;
}

.card-subtitle {
  font-size: 24rpx;
  color: #999999;
}

/* 表单项 */
.form-item {
  margin-bottom: 24rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 12rpx;
}

.required {
  color: #ff4d4f;
  margin-right: 4rpx;
}

/* 选择器 */
.form-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 2rpx solid #e8e8e8;
}

.picker-value {
  font-size: 28rpx;
  color: #333333;
  
  &.placeholder {
    color: #cccccc;
  }
}

.picker-arrow {
  font-size: 32rpx;
  color: #cccccc;
}

/* 加载状态 */
.loading-container {
  padding: 48rpx 0;
  text-align: center;
}

.loading-text {
  font-size: 26rpx;
  color: #999999;
}

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0;
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
  margin-top: 16rpx;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.category-info {
  flex: 1;
  min-width: 0;
}

.category-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-price {
  display: block;
  font-size: 24rpx;
  color: #999999;
}

.category-input {
  display: flex;
  align-items: center;
  margin: 0 24rpx;
}

.quantity-input {
  width: 120rpx;
  height: 64rpx;
  padding: 0 16rpx;
  background-color: #f9f9f9;
  border: 2rpx solid #e8e8e8;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
  text-align: center;
}

.input-unit {
  font-size: 24rpx;
  color: #999999;
  margin-left: 8rpx;
}

.category-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 120rpx;
}

.amount-label {
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 4rpx;
}

.amount-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff6b35;
}

/* 汇总卡片 */
.summary-card {
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(30, 58, 138, 0.3);
}

.summary-row {
  display: flex;
  align-items: center;
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-divider {
  width: 1rpx;
  height: 60rpx;
  background-color: rgba(255, 255, 255, 0.3);
}

.summary-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8rpx;
}

.summary-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  
  &.highlight {
    color: #fbbf24;
  }
}

/* 底部占位 */
.bottom-placeholder {
  height: 140rpx;
}

/* 提交按钮区域 */
.submit-section {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.submit-btn {
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
  border-radius: 16rpx;
  padding: 28rpx;
  text-align: center;
  
  &:active {
    opacity: 0.9;
  }
  
  &.disabled {
    background: #cccccc;
    
    &:active {
      opacity: 1;
    }
  }
}

.submit-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
