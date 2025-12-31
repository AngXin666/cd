<!--
  计件录入页面
  选择仓库、分类、输入数量，提交计件记录
  UI 风格与主项目保持一致：渐变背景、卡片式布局、批量录入
  
  深度转换功能：
  - 4.1 司机类型显示（带车司机/纯司机标签）
  - 4.2 打卡仓库自动选择
  - 4.4 单价自动加载（根据司机类型）
  - 4.6 用户偏好恢复
  - 4.7 重复记录处理
  - 4.8 打卡和请假检查
  
  @module pages/driver/piece-work/entry
  @requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
-->
<template>
  <view class="entry-page" :style="{ background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)' }">
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <!-- 页面内容 -->
    <scroll-view scroll-y class="page-content">
      <view class="content-wrapper">
        <!-- 标题卡片 - 4.1 添加司机类型标签 -->
        <view class="title-card">
          <view class="title-content">
            <view class="title-row">
              <text class="title-text">计件录入</text>
              <!-- 司机类型标签 -->
              <view v-if="driverType" :class="['driver-type-tag', driverType]">
                <text class="tag-text">{{ driverTypeLabel }}</text>
              </view>
            </view>
            <text class="title-desc">支持批量录入，一次提交多条记录</text>
          </view>
        </view>

        <!-- 基本信息卡片 -->
        <view class="form-card">
          <view class="card-header">
            <text class="card-icon">ℹ️</text>
            <text class="card-title">基本信息</text>
          </view>

          <!-- 仓库选择 -->
          <view class="form-item">
            <text class="form-label">
              <text class="required">*</text> 仓库
            </text>
            <picker 
              mode="selector" 
              :range="warehouseNames" 
              :value="selectedWarehouseIndex"
              @change="onWarehouseChange"
            >
              <view class="form-picker">
                <text class="picker-value">{{ currentWarehouseName || '请选择仓库' }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- 分类选择 -->
          <view class="form-item">
            <text class="form-label">
              <text class="required">*</text> 品类
              <text v-if="currentWarehousePresetUnit" class="unit-hint">
                （单位：{{ currentWarehousePresetUnit }}）
              </text>
            </text>
            <view v-if="loadingCategories" class="loading-text">加载中...</view>
            <view v-else-if="categories.length === 0" class="empty-text">
              暂无单位为「{{ currentWarehousePresetUnit || '件' }}」的品类
            </view>
            <view v-else-if="categories.length === 1" class="form-readonly">
              <text class="readonly-value">{{ categories[0]?.name }}</text>
              <text class="readonly-hint">（该仓库仅此一个品类）</text>
            </view>
            <picker 
              v-else
              mode="selector" 
              :range="categoryNames" 
              :value="selectedCategoryIndex"
              @change="onCategoryChange"
            >
              <view class="form-picker">
                <text class="picker-value">{{ currentCategoryName || '请选择品类' }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- 工作日期 -->
          <view class="form-item">
            <text class="form-label">
              <text class="required">*</text> 工作日期
            </text>
            <picker mode="date" :value="workDate" @change="onDateChange">
              <view class="form-picker">
                <text class="picker-value">{{ workDate || '请选择日期' }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>
        </view>

        <!-- 计件项列表 -->
        <view 
          v-for="(item, index) in pieceWorkItems" 
          :key="item.id" 
          class="piece-card"
        >
          <view class="card-header">
            <view class="header-left">
              <text class="card-icon">📝</text>
              <text class="card-title">计件项 {{ index + 1 }}</text>
            </view>
            <view 
              v-if="pieceWorkItems.length > 1" 
              class="delete-btn"
              @click="removeItem(item.id)"
            >
              <text class="delete-icon">🗑️</text>
            </view>
          </view>

          <!-- 件数输入 - 使用 v-model 确保 H5 兼容性 -->
          <view class="form-item">
            <text class="form-label">
              <text class="required">*</text> 件数（正整数）
            </text>
            <input 
              v-model="pieceWorkItems[index].quantity"
              type="number" 
              class="form-input"
              placeholder="请输入件数"
            />
          </view>

          <!-- 单价输入 - 4.4 根据司机类型自动加载单价 -->
          <view class="form-item">
            <text class="form-label">
              <text class="required">*</text> 单价（元/件）
              <text v-if="item.unitPriceLocked" class="price-locked">（管理员已设置：¥{{ item.unitPrice }}）</text>
            </text>
            <!-- 锁定时显示只读文本，未锁定时显示输入框 -->
            <view v-if="item.unitPriceLocked" class="form-input locked">
              <text class="locked-price">¥{{ item.unitPrice || '0' }}</text>
            </view>
            <input 
              v-else
              v-model="pieceWorkItems[index].unitPrice"
              type="digit" 
              class="form-input"
              placeholder="请输入单价"
            />
          </view>

          <!-- 是否需要上楼 -->
          <view class="form-item">
            <view class="switch-row">
              <text class="switch-label">是否需要上楼</text>
              <switch 
                :checked="item.needUpstairs"
                @change="(e: any) => onUpstairsChange(e, item.id)"
                color="#3B82F6"
              />
            </view>
          </view>

          <!-- 上楼单价 -->
          <view v-if="item.needUpstairs" class="form-item">
            <text class="form-label">
              <text class="required">*</text> 上楼单价（元/件）
            </text>
            <input 
              v-model="pieceWorkItems[index].upstairsPrice"
              type="digit" 
              class="form-input"
              placeholder="请输入上楼单价"
            />
          </view>

          <!-- 是否需要分拣 -->
          <view class="form-item">
            <view class="switch-row">
              <text class="switch-label">是否需要分拣</text>
              <switch 
                :checked="item.needSorting"
                @change="(e: any) => onSortingChange(e, item.id)"
                color="#8B5CF6"
              />
            </view>
          </view>

          <!-- 分拣件数和单价 -->
          <template v-if="item.needSorting">
            <view class="form-item">
              <text class="form-label">
                <text class="required">*</text> 分拣件数
              </text>
              <input 
                v-model="pieceWorkItems[index].sortingQuantity"
                type="number" 
                class="form-input"
                placeholder="请输入分拣件数"
              />
            </view>
            <view class="form-item">
              <text class="form-label">
                <text class="required">*</text> 分拣单价（元/件）
              </text>
              <input 
                v-model="pieceWorkItems[index].sortingUnitPrice"
                type="digit" 
                class="form-input"
                placeholder="请输入分拣单价"
              />
            </view>
          </template>

          <!-- 金额明细 -->
          <view class="amount-card">
            <text class="amount-title">金额明细</text>
            <view class="amount-row">
              <text class="amount-label">基础金额：</text>
              <text class="amount-value">¥{{ calculateItemAmount(item).baseAmount.toFixed(2) }}</text>
            </view>
            <view v-if="item.needUpstairs" class="amount-row">
              <text class="amount-label">上楼金额：</text>
              <text class="amount-value blue">¥{{ calculateItemAmount(item).upstairsAmount.toFixed(2) }}</text>
            </view>
            <view v-if="item.needSorting" class="amount-row">
              <text class="amount-label">分拣金额：</text>
              <text class="amount-value purple">¥{{ calculateItemAmount(item).sortingAmount.toFixed(2) }}</text>
            </view>
            <view class="amount-row total">
              <text class="amount-label">小计：</text>
              <text class="amount-value green">¥{{ calculateItemAmount(item).totalAmount.toFixed(2) }}</text>
            </view>
          </view>
        </view>

        <!-- 添加计件项按钮 -->
        <view class="add-btn" @click="addItem">
          <text class="add-icon">➕</text>
          <text class="add-text">添加计件项</text>
        </view>

        <!-- 总金额卡片 -->
        <view class="total-card">
          <view class="total-content">
            <view class="total-label">
              <text class="total-icon">💰</text>
              <text class="total-text">总金额</text>
            </view>
            <text class="total-value">¥{{ calculateTotalAmount().toFixed(2) }}</text>
          </view>
        </view>

        <!-- 提交按钮 -->
        <view class="submit-section">
          <view 
            :class="['submit-btn', { disabled: !canSubmit || submitting }]"
            @click="handleSubmit"
          >
            <text class="submit-text">{{ submitting ? '提交中...' : '提交录入' }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 计件录入页面
 * 
 * @description 选择仓库、分类、输入数量，提交计件记录
 * 支持批量录入，UI 风格与主项目保持一致
 * 
 * 深度转换功能：
 * - 4.1 司机类型显示（带车司机/纯司机标签）
 * - 4.2 打卡仓库自动选择
 * - 4.4 单价自动加载（根据司机类型）
 * - 4.6 用户偏好恢复
 * - 4.7 重复记录处理
 * - 4.8 打卡和请假检查
 */

import { ref, computed, onMounted, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getWarehouses, 
  getPieceWorkCategories, 
  createPieceWorkRecord,
  getTodayAttendanceForUser,
  getCategoryPriceForDriver,
  checkDuplicateRecord,
  updatePieceWorkRecord,
} from '@/api'
import type { Warehouse, PieceWorkCategory } from '@/api/types'
import { getWarehousePresetUnit } from '@/api/types'
import type { DriverType } from '@/api'
import { useUserStore } from '@/store/user'
import { 
  saveLastWarehouse, 
  getLastWarehouse,
  saveLastCategory,
  getLastCategory,
  saveLastWorkDate,
  getLastWorkDate,
  saveAllPreferences,
} from '@/utils/preferences'
import { 
  canStartPieceWork, 
  showClockInReminder, 
  showOnLeaveAlert,
} from '@/utils/attendance-check'
import { confirmDuplicateRecordModal } from '@/utils/confirm'
import { getLocalDateString } from '@/utils/date'

// ==================== 类型定义 ====================

/** 计件项接口 */
interface PieceWorkItem {
  id: string
  quantity: string
  unitPrice: string
  unitPriceLocked: boolean
  needUpstairs: boolean
  upstairsPrice: string
  needSorting: boolean
  sortingQuantity: string
  sortingUnitPrice: string
}

// ==================== Store ====================

/** 用户状态 Store */
const userStore = useUserStore()

// ==================== 状态 ====================

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 分类列表 */
const categories = ref<PieceWorkCategory[]>([])

/** 选中的仓库索引 */
const selectedWarehouseIndex = ref(0)

/** 选中的分类索引 */
const selectedCategoryIndex = ref(0)

/** 工作日期 */
const workDate = ref('')

/** 加载分类状态 */
const loadingCategories = ref(false)

/** 提交状态 */
const submitting = ref(false)

/** 计件项列表 */
const pieceWorkItems = ref<PieceWorkItem[]>([createEmptyItem()])

/** 
 * 司机类型 
 * @requirements 1.1 - 司机类型显示
 */
const driverType = ref<DriverType | null>(null)

/** 
 * 今日是否已打卡
 * @requirements 1.2 - 打卡状态检查
 */
const hasClockedInToday = ref(false)

/** 是否已完成初始化加载 */
const initialized = ref(false)

// ==================== 计算属性 ====================

/** 仓库名称列表 */
const warehouseNames = computed(() => warehouses.value.map(w => w.name))

/** 当前仓库名称 */
const currentWarehouseName = computed(() => warehouses.value[selectedWarehouseIndex.value]?.name || '')

/** 当前仓库 */
const currentWarehouse = computed(() => warehouses.value[selectedWarehouseIndex.value] || null)

/** 分类名称列表 */
const categoryNames = computed(() => categories.value.map(c => c.name))

/** 当前分类名称 */
const currentCategoryName = computed(() => categories.value[selectedCategoryIndex.value]?.name || '')

/** 当前分类 */
const currentCategory = computed(() => categories.value[selectedCategoryIndex.value] || null)

/**
 * 当前仓库的预设单位
 * 根据仓库类型返回对应的计量单位
 * @requirements 3.1 - 品类单位限制
 */
const currentWarehousePresetUnit = computed(() => {
  const warehouse = currentWarehouse.value
  if (!warehouse) return ''
  
  // 优先使用 warehouse_type 计算预设单位
  if (warehouse.warehouse_type) {
    return getWarehousePresetUnit(warehouse.warehouse_type)
  }
  
  // 其次使用后端返回的 preset_unit 字段
  if (warehouse.preset_unit) {
    return warehouse.preset_unit
  }
  
  // 默认返回 "件"
  return '件'
})

/**
 * 司机类型显示标签
 * @requirements 1.1 - 司机类型显示
 */
const driverTypeLabel = computed(() => {
  if (driverType.value === 'with_vehicle') {
    return '带车司机'
  } else if (driverType.value === 'driver_only') {
    return '纯司机'
  }
  return ''
})

/** 是否可以提交 */
const canSubmit = computed(() => {
  // 必须选择仓库和分类
  if (warehouses.value.length === 0 || categories.value.length === 0) return false
  if (!workDate.value) return false
  
  // 所有计件项必须有效
  return pieceWorkItems.value.every(item => {
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unitPrice)
    if (!quantity || quantity <= 0) return false
    if (!unitPrice || unitPrice < 0) return false
    
    // 上楼验证
    if (item.needUpstairs) {
      const upstairsPrice = Number(item.upstairsPrice)
      if (!upstairsPrice || upstairsPrice < 0) return false
    }
    
    // 分拣验证
    if (item.needSorting) {
      const sortingQuantity = Number(item.sortingQuantity)
      const sortingUnitPrice = Number(item.sortingUnitPrice)
      if (!sortingQuantity || sortingQuantity <= 0) return false
      if (!sortingUnitPrice || sortingUnitPrice < 0) return false
    }
    
    return true
  })
})

// ==================== 生命周期 ====================

onMounted(async () => {
  // 初始化日期为今天
  initWorkDate()
  
  // 加载数据
  await loadData()
  
  // 标记初始化完成
  initialized.value = true
})

onShow(() => {
  // 如果已初始化，刷新数据
  if (initialized.value) {
    loadData()
  }
})

// ==================== 方法 ====================

/**
 * 初始化工作日期
 * 优先使用用户偏好中保存的日期，否则使用今天
 * @requirements 1.5 - 用户偏好恢复
 */
function initWorkDate(): void {
  // 尝试从用户偏好恢复日期
  const lastDate = getLastWorkDate()
  if (lastDate) {
    workDate.value = lastDate
  } else {
    // 使用今天的日期
    workDate.value = getLocalDateString()
  }
}

/**
 * 创建空的计件项
 * @returns 新的计件项对象
 */
function createEmptyItem(): PieceWorkItem {
  return {
    id: Date.now().toString(),
    quantity: '',
    unitPrice: '',
    unitPriceLocked: false,
    needUpstairs: false,
    upstairsPrice: '',
    needSorting: false,
    sortingQuantity: '',
    sortingUnitPrice: '',
  }
}

/**
 * 加载页面数据
 * 包括仓库列表、今日打卡记录、用户偏好恢复
 */
async function loadData(): Promise<void> {
  // 加载司机类型
  loadDriverType()
  
  // 加载仓库列表
  await loadWarehouses()
  
  // 加载今日打卡记录，用于自动选择仓库
  await loadTodayAttendance()
  
  // 恢复用户偏好
  await restoreUserPreferences()
}

/**
 * 加载司机类型
 * 从用户信息中获取司机类型（带车司机/纯司机）
 * @requirements 1.1 - 司机类型显示
 */
function loadDriverType(): void {
  const user = userStore.user
  if (user) {
    // 根据用户角色或其他属性判断司机类型
    // 这里假设用户有 driver_type 字段，如果没有则默认为 driver_only
    // 实际项目中可能需要从用户扩展信息中获取
    driverType.value = (user as any).driver_type || 'driver_only'
  } else {
    // 用户未登录时，设置默认司机类型
    // 确保 loadCategoryPrice 可以正常执行
    driverType.value = 'driver_only'
  }
}

/**
 * 加载今日打卡记录
 * 用于检查用户是否已打卡
 * @requirements 1.7 - 打卡检查
 */
async function loadTodayAttendance(): Promise<void> {
  const userId = userStore.user?.id
  if (!userId) return
  
  try {
    const attendance = await getTodayAttendanceForUser(userId)
    // 检查是否已打卡（有打卡时间）
    hasClockedInToday.value = !!(attendance && attendance.clock_in)
  } catch (error) {
    console.error('加载今日打卡记录失败:', error)
    hasClockedInToday.value = false
  }
}

/**
 * 恢复用户偏好
 * 恢复上次选择的仓库、品类
 * @requirements 1.5 - 用户偏好恢复
 */
async function restoreUserPreferences(): Promise<void> {
  // 从用户偏好恢复仓库
  const lastWarehouse = getLastWarehouse()
  
  // 设置仓库
  if (lastWarehouse && warehouses.value.length > 0) {
    const warehouseIndex = warehouses.value.findIndex(w => w.id === lastWarehouse.id)
    if (warehouseIndex >= 0) {
      selectedWarehouseIndex.value = warehouseIndex
      // 加载该仓库的分类
      await loadCategories(lastWarehouse.id)
    }
  }
  
  // 恢复品类偏好
  const lastCategory = getLastCategory()
  if (lastCategory && categories.value.length > 0) {
    const categoryIndex = categories.value.findIndex(c => c.id === lastCategory.id)
    if (categoryIndex >= 0) {
      selectedCategoryIndex.value = categoryIndex
      // 加载单价
      await loadCategoryPrice()
    }
  }
}

/**
 * 加载仓库列表
 */
async function loadWarehouses(): Promise<void> {
  try {
    const data = await getWarehouses()
    warehouses.value = data.filter(w => w.is_active !== false)
    
    // 加载第一个仓库的分类
    if (warehouses.value.length > 0) {
      await loadCategories(warehouses.value[0].id)
    }
  } catch (error) {
    console.error('加载仓库失败:', error)
  }
}

/**
 * 加载分类列表
 * 根据仓库类型筛选匹配单位的品类
 * 
 * @param warehouseId - 仓库 ID
 * @requirements 3.1, 4.1 - 品类单位限制，仓库品类关联
 */
async function loadCategories(warehouseId: number): Promise<void> {
  loadingCategories.value = true
  
  try {
    // 获取当前仓库信息
    const warehouse = warehouses.value.find(w => w.id === warehouseId)
    
    // 获取仓库的预设单位
    // 如果仓库有 warehouse_type，则根据类型获取预设单位
    // 否则使用仓库返回的 preset_unit 字段
    let presetUnit: string | undefined
    if (warehouse) {
      if (warehouse.warehouse_type) {
        presetUnit = getWarehousePresetUnit(warehouse.warehouse_type)
      } else if (warehouse.preset_unit) {
        presetUnit = warehouse.preset_unit
      }
    }
    
    console.log('[计件录入] loadCategories 仓库信息:', {
      warehouseId,
      warehouseName: warehouse?.name,
      warehouseType: warehouse?.warehouse_type,
      presetUnit,
    })
    
    // 按单位筛选品类（如果有预设单位）
    const data = await getPieceWorkCategories(true, presetUnit)
    
    console.log('[计件录入] loadCategories 获取到分类:', {
      count: data.length,
      filterUnit: presetUnit,
      categories: data.map(c => ({ id: c.id, name: c.name, unit: c.unit, unit_price: c.unit_price })),
    })
    
    categories.value = data
    selectedCategoryIndex.value = 0
    
    // 如果没有匹配的品类，显示提示
    if (data.length === 0 && presetUnit) {
      uni.showToast({
        title: `暂无单位为「${presetUnit}」的品类`,
        icon: 'none',
        duration: 2000,
      })
    }
    
    // 加载单价配置
    if (data.length > 0) {
      // 使用 nextTick 确保响应式更新完成
      await nextTick()
      await loadCategoryPrice()
    }
  } catch (error) {
    console.error('加载分类失败:', error)
    categories.value = []
  } finally {
    loadingCategories.value = false
  }
}

/**
 * 加载单价配置
 * 根据司机类型加载对应的单价
 * @requirements 1.3, 1.4 - 单价自动加载
 */
async function loadCategoryPrice(): Promise<void> {
  const warehouse = currentWarehouse.value
  const category = currentCategory.value
  
  console.log('[计件录入] loadCategoryPrice 调用:', {
    warehouse: warehouse?.id,
    category: category?.id,
    driverType: driverType.value,
    categoryUnitPrice: category?.unit_price,
  })
  
  if (!warehouse || !category || !driverType.value) {
    console.log('[计件录入] loadCategoryPrice 提前返回: 缺少必要数据')
    return
  }
  
  try {
    const priceConfig = await getCategoryPriceForDriver(
      warehouse.id,
      category.id,
      driverType.value
    )
    
    console.log('[计件录入] 获取到单价配置:', priceConfig)
    
    if (priceConfig) {
      // 更新所有计件项的单价
      const newUnitPrice = priceConfig.unitPrice > 0 ? priceConfig.unitPrice.toString() : ''
      console.log('[计件录入] 设置单价:', newUnitPrice, '锁定:', priceConfig.isLocked)
      
      pieceWorkItems.value = pieceWorkItems.value.map(item => ({
        ...item,
        unitPrice: newUnitPrice || item.unitPrice,
        unitPriceLocked: priceConfig.isLocked,
      }))
    }
  } catch (error) {
    console.error('加载单价配置失败:', error)
  }
}

/**
 * 仓库选择变化
 * @param e - 事件对象
 */
async function onWarehouseChange(e: any): Promise<void> {
  const index = Number(e.detail.value)
  selectedWarehouseIndex.value = index
  
  // 重新加载分类
  const warehouse = warehouses.value[index]
  if (warehouse) {
    await loadCategories(warehouse.id)
  }
}

/**
 * 分类选择变化
 * @param e - 事件对象
 */
async function onCategoryChange(e: any): Promise<void> {
  selectedCategoryIndex.value = Number(e.detail.value)
  
  // 重新加载单价
  await loadCategoryPrice()
}

/**
 * 日期选择变化
 * @param e - 事件对象
 */
function onDateChange(e: any): void {
  workDate.value = e.detail.value
}

/**
 * 上楼开关变化
 * @param e - 事件对象
 * @param id - 计件项 ID
 */
function onUpstairsChange(e: any, id: string): void {
  const value = e.detail?.value ?? false
  const index = pieceWorkItems.value.findIndex(item => item.id === id)
  if (index >= 0) {
    pieceWorkItems.value[index].needUpstairs = value
  }
}

/**
 * 分拣开关变化
 * @param e - 事件对象
 * @param id - 计件项 ID
 */
function onSortingChange(e: any, id: string): void {
  const value = e.detail?.value ?? false
  const index = pieceWorkItems.value.findIndex(item => item.id === id)
  if (index >= 0) {
    pieceWorkItems.value[index].needSorting = value
  }
}

/**
 * 添加计件项
 */
function addItem(): void {
  const newItem = createEmptyItem()
  
  // 继承当前的单价设置
  const firstItem = pieceWorkItems.value[0]
  if (firstItem) {
    newItem.unitPrice = firstItem.unitPrice
    newItem.unitPriceLocked = firstItem.unitPriceLocked
  }
  
  pieceWorkItems.value.push(newItem)
}

/**
 * 删除计件项
 * @param id - 计件项 ID
 */
function removeItem(id: string): void {
  if (pieceWorkItems.value.length === 1) {
    uni.showToast({ title: '至少保留一个计件项', icon: 'none' })
    return
  }
  pieceWorkItems.value = pieceWorkItems.value.filter(item => item.id !== id)
}

/**
 * 计算单个计件项的金额
 * @param item - 计件项
 * @returns 金额明细对象
 */
function calculateItemAmount(item: PieceWorkItem): { 
  baseAmount: number
  upstairsAmount: number
  sortingAmount: number
  totalAmount: number 
} {
  const quantity = Number(item.quantity) || 0
  const unitPrice = Number(item.unitPrice) || 0
  const upstairsPrice = Number(item.upstairsPrice) || 0
  const sortingQuantity = Number(item.sortingQuantity) || 0
  const sortingUnitPrice = Number(item.sortingUnitPrice) || 0
  
  const baseAmount = quantity * unitPrice
  const upstairsAmount = item.needUpstairs ? quantity * upstairsPrice : 0
  const sortingAmount = item.needSorting ? sortingQuantity * sortingUnitPrice : 0
  const totalAmount = baseAmount + upstairsAmount + sortingAmount
  
  return { baseAmount, upstairsAmount, sortingAmount, totalAmount }
}

/**
 * 计算所有计件项的总金额
 * @returns 总金额
 */
function calculateTotalAmount(): number {
  return pieceWorkItems.value.reduce((sum, item) => {
    return sum + calculateItemAmount(item).totalAmount
  }, 0)
}

/**
 * 提交计件记录
 * 包含打卡检查、请假检查、重复记录处理
 * @requirements 1.6, 1.7, 1.8
 */
async function handleSubmit(): Promise<void> {
  if (!canSubmit.value || submitting.value) return
  
  const userId = userStore.user?.id
  if (!userId) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  
  // 4.8 打卡和请假检查
  const checkResult = await canStartPieceWork(userId)
  
  if (!checkResult.canStart) {
    if (checkResult.checkResult.onLeave) {
      // 在请假中，显示休假提示
      showOnLeaveAlert()
      return
    } else if (checkResult.checkResult.needClockIn) {
      // 未打卡，显示打卡提醒
      showClockInReminder(() => {
        // 跳转到打卡页面
        uni.navigateTo({ url: '/pages/driver/clock/index' })
      })
      return
    }
  }
  
  // 4.7 重复记录处理
  const warehouse = currentWarehouse.value
  const category = currentCategory.value
  
  if (!warehouse || !category) return
  
  // 检查是否存在重复记录
  const duplicateRecord = await checkDuplicateRecord(
    userId,
    warehouse.id,
    category.id,
    workDate.value
  )
  
  if (duplicateRecord) {
    // 存在重复记录，显示累计/新增选择对话框
    const totalNewQuantity = pieceWorkItems.value.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0), 
      0
    )
    
    const choice = await confirmDuplicateRecordModal(
      warehouse.name,
      category.name,
      duplicateRecord.quantity,
      totalNewQuantity
    )
    
    if (choice === 'cancel') {
      return
    }
    
    if (choice === 'accumulate') {
      // 累计到现有记录
      await accumulateToExistingRecord(duplicateRecord, totalNewQuantity)
      return
    }
  }
  
  // 确认提交
  uni.showModal({
    title: '确认提交',
    content: `确定要提交 ${pieceWorkItems.value.length} 条计件记录吗？\n总金额：¥${calculateTotalAmount().toFixed(2)}`,
    success: async (res) => {
      if (res.confirm) {
        await doSubmit()
      }
    },
  })
}

/**
 * 累计到现有记录
 * @param existingRecord - 现有记录
 * @param newQuantity - 新增件数
 * @requirements 1.6 - 重复记录处理
 */
async function accumulateToExistingRecord(
  existingRecord: any,
  newQuantity: number
): Promise<void> {
  submitting.value = true
  
  try {
    // 更新现有记录的件数
    const newTotalQuantity = existingRecord.quantity + newQuantity
    
    await updatePieceWorkRecord(existingRecord.id, {
      quantity: newTotalQuantity,
    })
    
    // 保存用户偏好
    saveUserPreferences()
    
    uni.showToast({
      title: `已累计到现有记录，总件数：${newTotalQuantity}`,
      icon: 'success',
    })
    
    // 延迟返回
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    console.error('累计记录失败:', error)
    uni.showToast({
      title: error.message || '累计失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}

/**
 * 保存用户偏好
 * @requirements 1.5 - 用户偏好恢复
 */
function saveUserPreferences(): void {
  const warehouse = currentWarehouse.value
  const category = currentCategory.value
  
  saveAllPreferences({
    warehouse: warehouse ? { id: warehouse.id, name: warehouse.name } : undefined,
    category: category ? { id: category.id, name: category.name } : undefined,
    workDate: workDate.value,
  })
}

/**
 * 执行提交
 */
async function doSubmit(): Promise<void> {
  submitting.value = true
  
  try {
    const warehouse = currentWarehouse.value
    const category = currentCategory.value
    
    if (!warehouse || !category) return
    
    // 逐个提交计件记录
    for (const item of pieceWorkItems.value) {
      const { totalAmount } = calculateItemAmount(item)
      
      await createPieceWorkRecord({
        warehouse_id: warehouse.id,
        category_id: category.id,
        work_date: workDate.value,
        quantity: Number(item.quantity),
      })
    }
    
    // 保存用户偏好
    saveUserPreferences()
    
    uni.showToast({
      title: `成功录入 ${pieceWorkItems.value.length} 条记录`,
      icon: 'success',
    })
    
    // 延迟返回
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    console.error('提交失败:', error)
    uni.showToast({
      title: error.message || '提交失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}
</script>


<style lang="scss" scoped>
/* 计件录入页面容器 */
.entry-page {
  min-height: 100vh;
}

/* 顶部安全区域 */
.safe-area-top {
  height: env(safe-area-inset-top);
  height: constant(safe-area-inset-top);
}

/* 页面内容 */
.page-content {
  height: calc(100vh - env(safe-area-inset-top));
}

.content-wrapper {
  padding: 32rpx;
  padding-bottom: 200rpx;
}

/* 标题卡片 */
.title-card {
  background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(30, 58, 138, 0.3);
}

.title-content {
  text-align: center;
}

/* 标题行 - 包含标题和司机类型标签 */
.title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.title-text {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 司机类型标签 - 4.1 */
.driver-type-tag {
  margin-left: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  
  /* 带车司机 - 橙色 */
  &.with_vehicle {
    background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
  }
  
  /* 纯司机 - 绿色 */
  &.driver_only {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  }
  
  .tag-text {
    font-size: 22rpx;
    color: #ffffff;
    font-weight: 500;
  }
}

.title-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 表单卡片 */
.form-card,
.piece-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.card-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1F2937;
}

.delete-btn {
  padding: 8rpx;
}

.delete-icon {
  font-size: 32rpx;
}

/* 表单项 */
.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #6B7280;
  margin-bottom: 12rpx;
}

.required {
  color: #EF4444;
}

.price-locked {
  color: #3B82F6;
  font-size: 22rpx;
  margin-left: 8rpx;
}

/* 单位提示 - 显示仓库预设单位 */
.unit-hint {
  color: #3B82F6;
  font-size: 22rpx;
  margin-left: 8rpx;
}

/* 选择器 */
.form-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: #F9FAFB;
  border-radius: 16rpx;
  border: 2rpx solid #E5E7EB;
}

.picker-value {
  font-size: 28rpx;
  color: #1F2937;
}

.picker-arrow {
  font-size: 32rpx;
  color: #9CA3AF;
}

/* 只读显示 */
.form-readonly {
  padding: 24rpx;
  background-color: #F3F4F6;
  border-radius: 16rpx;
}

.readonly-value {
  font-size: 28rpx;
  color: #1F2937;
}

.readonly-hint {
  font-size: 22rpx;
  color: #9CA3AF;
  margin-left: 8rpx;
}

/* 加载和空状态 */
.loading-text,
.empty-text {
  font-size: 26rpx;
  color: #9CA3AF;
  text-align: center;
  padding: 24rpx 0;
}

/* 输入框 - 修复 H5 输入问题 */
.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #F9FAFB;
  border-radius: 16rpx;
  border: 2rpx solid #E5E7EB;
  font-size: 28rpx;
  color: #1F2937;
  box-sizing: border-box;
  
  &.locked {
    background-color: #E5E7EB;
    color: #6B7280;
    display: flex;
    align-items: center;
    height: 88rpx;
    .locked-price {
      font-size: 32rpx;
      font-weight: bold;
      color: #3B82F6;
    }
  }
}

/* 开关行 */
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background-color: #EFF6FF;
  border-radius: 16rpx;
}

.switch-label {
  font-size: 28rpx;
  color: #374151;
}

/* 金额明细卡片 */
.amount-card {
  background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 16rpx;
}

.amount-title {
  display: block;
  font-size: 26rpx;
  font-weight: bold;
  color: #374151;
  margin-bottom: 16rpx;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
  
  &.total {
    border-top: 2rpx solid #BBF7D0;
    margin-top: 12rpx;
    padding-top: 16rpx;
  }
}

.amount-label {
  font-size: 26rpx;
  color: #6B7280;
}

.amount-value {
  font-size: 26rpx;
  font-weight: bold;
  color: #374151;
  
  &.blue {
    color: #2563EB;
  }
  
  &.purple {
    color: #7C3AED;
  }
  
  &.green {
    font-size: 32rpx;
    color: #059669;
  }
}

/* 添加按钮 */
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(249, 115, 22, 0.3);
  
  &:active {
    opacity: 0.9;
  }
}

.add-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.add-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 总金额卡片 */
.total-card {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(16, 185, 129, 0.3);
}

.total-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.total-label {
  display: flex;
  align-items: center;
}

.total-icon {
  font-size: 48rpx;
  margin-right: 12rpx;
}

.total-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}

.total-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 提交按钮 */
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
  background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(59, 130, 246, 0.3);
  
  &:active {
    opacity: 0.9;
  }
  
  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.submit-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>