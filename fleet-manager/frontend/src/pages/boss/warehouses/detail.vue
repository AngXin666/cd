<template>
  <view class="warehouse-detail-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 创建模式 -->
    <view v-else-if="isCreateMode" class="warehouse-content">
      <!-- 创建模式头部 -->
      <view class="warehouse-header create-header">
        <view class="warehouse-icon">
          <text class="icon-text">🏭</text>
        </view>
        <view class="warehouse-basic">
          <text class="warehouse-name">新建仓库</text>
          <view class="warehouse-tags">
            <view class="status-tag active">
              <text class="tag-text">创建中</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 基本信息表单 -->
      <view class="edit-card">
        <view class="card-title">
          <text class="title-text">基本信息</text>
        </view>
        <view class="form-item">
          <text class="form-label required">仓库名称</text>
          <input v-model="createForm.name" class="form-input" type="text" placeholder="请输入仓库名称" />
        </view>
        <view class="form-item">
          <text class="form-label">仓库地址</text>
          <input v-model="createForm.address" class="form-input" type="text" placeholder="请输入仓库地址（选填）" />
        </view>
        <!-- 仓库类型选择器 -->
        <view class="form-item">
          <text class="form-label required">仓库类型</text>
          <view class="type-selector">
            <view
              v-for="option in WAREHOUSE_TYPE_OPTIONS"
              :key="option.value"
              :class="['type-option', { active: createForm.warehouse_type === option.value }]"
              @click="createForm.warehouse_type = option.value"
            >
              <text class="type-label">{{ option.label }}</text>
            </view>
          </view>
          <!-- 自定义单位输入框（仅 custom 类型显示） -->
          <view v-if="isCustomType" class="custom-unit-input">
            <text class="form-label required">自定义单位名称</text>
            <input 
              v-model="createForm.custom_unit" 
              class="form-input" 
              type="text" 
              placeholder="请输入单位名称（如：箱、桶、趟）" 
              maxlength="20"
            />
          </view>
          <view class="preset-unit-hint">
            <text class="hint-label">{{ isCustomType ? '当前单位：' : '预设单位：' }}</text>
            <text class="hint-value">{{ currentPresetUnit }}</text>
          </view>
        </view>
      </view>

      <!-- 品类和价格设置 -->
      <view class="edit-card">
        <view class="card-title">
          <text class="title-text">品类与价格</text>
        </view>
        <view class="form-item">
          <text class="form-label required">品类名称</text>
          <input v-model="createForm.category_name" class="form-input" type="text" placeholder="请输入品类名称" />
        </view>
        <view class="form-item">
          <text class="form-label required">纯司机单价（元/{{ currentPresetUnit }}）</text>
          <input v-model="createForm.driver_only_price" class="form-input" type="digit" placeholder="请输入纯司机单价" />
        </view>
        <view class="form-item">
          <text class="form-label required">带车司机单价（元/{{ currentPresetUnit }}）</text>
          <input v-model="createForm.with_vehicle_price" class="form-input" type="digit" placeholder="请输入带车司机单价" />
        </view>
      </view>

      <!-- 考勤时间设置 -->
      <view class="edit-card">
        <view class="card-title">
          <text class="title-text">考勤时间</text>
        </view>
        <view class="form-item">
          <text class="form-label">上班时间</text>
          <picker mode="time" :value="createForm.work_start_time" @change="onWorkStartTimeChange">
            <view class="form-input picker-input">
              <text>{{ createForm.work_start_time || '请选择上班时间' }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">下班时间</text>
          <picker mode="time" :value="createForm.work_end_time" @change="onWorkEndTimeChange">
            <view class="form-input picker-input">
              <text>{{ createForm.work_end_time || '请选择下班时间' }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 司机每日目标设置 -->
      <view class="edit-card">
        <view class="card-title">
          <text class="title-text">司机每日目标</text>
        </view>
        <view class="form-item">
          <text class="form-label">每日目标数量（{{ currentPresetUnit }}）</text>
          <input v-model="createForm.daily_target" class="form-input" type="number" placeholder="请输入每日目标数量" />
        </view>
      </view>

      <!-- 创建按钮 -->
      <view class="action-buttons">
        <view class="btn save-btn" @click="handleCreate">
          <text class="btn-text">创建仓库</text>
        </view>
        <view class="btn cancel-btn" @click="goBack">
          <text class="btn-text">取消</text>
        </view>
      </view>
    </view>

    <!-- 编辑模式：仓库信息 -->
    <view v-else-if="warehouse" class="warehouse-content">
      <!-- 仓库头部 -->
      <view class="warehouse-header">
        <view class="warehouse-icon">
          <text class="icon-text">🏭</text>
        </view>
        <view class="warehouse-basic">
          <text class="warehouse-name">{{ warehouse.name }}</text>
          <view class="warehouse-tags">
            <view :class="['status-tag', warehouse.is_active ? 'active' : 'inactive']">
              <text class="tag-text">{{ warehouse.is_active ? '启用中' : '已停用' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 详细信息卡片 -->
      <view class="info-card">
        <view class="card-title">
          <text class="title-text">基本信息</text>
        </view>
        <view class="info-item">
          <text class="item-label">仓库名称</text>
          <text class="item-value">{{ warehouse.name }}</text>
        </view>
        <view class="info-item">
          <text class="item-label">仓库地址</text>
          <text class="item-value">{{ warehouse.address || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="item-label">仓库类型</text>
          <view class="type-display">
            <text class="item-value type-value">{{ getWarehouseTypeName(warehouse.warehouse_type) }}</text>
            <text class="type-unit">（预设单位：{{ getWarehousePresetUnit(warehouse.warehouse_type) }}）</text>
            <text class="type-locked">🔒</text>
          </view>
        </view>
        <view class="info-item">
          <text class="item-label">状态</text>
          <text :class="['item-value', warehouse.is_active ? 'active' : 'inactive']">
            {{ warehouse.is_active ? '启用中' : '已停用' }}
          </text>
        </view>
        <view class="info-item">
          <text class="item-label">创建时间</text>
          <text class="item-value">{{ formatDateTime(warehouse.created_at) }}</text>
        </view>
      </view>

      <!-- 编辑表单 -->
      <view class="edit-card">
        <view class="card-title">
          <text class="title-text">编辑信息</text>
        </view>
        <view class="form-item">
          <text class="form-label">仓库名称</text>
          <input v-model="editForm.name" class="form-input" type="text" placeholder="请输入仓库名称" />
        </view>
        <view class="form-item">
          <text class="form-label">仓库地址</text>
          <input v-model="editForm.address" class="form-input" type="text" placeholder="请输入仓库地址" />
        </view>
        <view class="form-item">
          <text class="form-label">仓库状态</text>
          <view class="status-switch">
            <view :class="['switch-option', { active: editForm.is_active }]" @click="editForm.is_active = true">
              <text class="option-text">启用</text>
            </view>
            <view :class="['switch-option', { active: !editForm.is_active }]" @click="editForm.is_active = false">
              <text class="option-text">停用</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 分配用户 -->
      <view class="assign-card">
        <view class="card-title">
          <text class="title-text">分配用户</text>
          <text class="title-count">{{ assignedUsers.length }} 人</text>
        </view>
        <view v-if="assignedUsers.length > 0" class="assigned-list">
          <view v-for="user in assignedUsers" :key="user.id" class="assigned-item">
            <view :class="['user-avatar', getRoleClass(user.role)]">
              <text class="avatar-text">{{ user.name.charAt(0) }}</text>
            </view>
            <view class="user-info">
              <text class="user-name">{{ user.name }}</text>
              <text class="user-role">{{ getRoleName(user.role) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-assign">
          <text class="empty-text">暂无分配用户</text>
        </view>
        <view class="assign-btn" @click="showAssignModal">
          <text class="btn-text">+ 分配用户</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <view class="btn save-btn" @click="handleSave">
          <text class="btn-text">保存修改</text>
        </view>
        <view class="btn delete-btn" @click="handleDelete">
          <text class="btn-text">删除仓库</text>
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text class="error-icon">😕</text>
      <text class="error-text">仓库不存在或加载失败</text>
      <view class="retry-btn" @click="loadWarehouse">
        <text class="retry-text">重新加载</text>
      </view>
    </view>

    <!-- 分配用户弹窗 -->
    <view v-if="showModal" class="modal-overlay" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">分配用户</text>
          <text class="modal-close" @click="closeModal">✕</text>
        </view>
        <view class="modal-body">
          <view v-if="availableUsers.length === 0" class="empty-users">
            <text class="empty-text">暂无可分配的用户</text>
          </view>
          <view v-else class="user-select-list">
            <view v-for="user in availableUsers" :key="user.id" 
              :class="['user-select-item', { selected: selectedUserIds.includes(user.id) }]"
              @click="toggleUserSelection(user.id)">
              <view :class="['user-avatar', getRoleClass(user.role)]">
                <text class="avatar-text">{{ user.name.charAt(0) }}</text>
              </view>
              <view class="user-info">
                <text class="user-name">{{ user.name }}</text>
                <text class="user-role">{{ getRoleName(user.role) }}</text>
              </view>
              <view v-if="selectedUserIds.includes(user.id)" class="check-icon">
                <text class="check-text">✓</text>
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @click="handleAssign">
            <text class="btn-text">确定分配</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 仓库详情/创建页面
 * 支持创建新仓库和编辑现有仓库
 * 创建模式：无id参数时，显示完整创建表单（包含品类、价格、考勤时间、每日目标）
 * 编辑模式：有id参数时，显示仓库信息和编辑表单
 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getWarehouse, updateWarehouse, deleteWarehouse, createWarehouse, getWarehouseUsers, assignUsersToWarehouse, getUsers } from '@/api'
import type { Warehouse, User } from '@/api/types'
import { UserRole, WAREHOUSE_TYPE_DISPLAY_NAMES, getWarehousePresetUnit, WarehouseType } from '@/api/types'
import { formatDateTime, getRoleName } from '@/utils'

// ==================== 常量定义 ====================

/** 仓库类型选项列表（包含自定义类型） */
const WAREHOUSE_TYPE_OPTIONS = [
  { value: WarehouseType.PIECE, label: WAREHOUSE_TYPE_DISPLAY_NAMES[WarehouseType.PIECE] },
  { value: WarehouseType.POINT, label: WAREHOUSE_TYPE_DISPLAY_NAMES[WarehouseType.POINT] },
  { value: WarehouseType.WHOLE, label: WAREHOUSE_TYPE_DISPLAY_NAMES[WarehouseType.WHOLE] },
  { value: WarehouseType.DISTANCE, label: WAREHOUSE_TYPE_DISPLAY_NAMES[WarehouseType.DISTANCE] },
  { value: WarehouseType.CUSTOM, label: WAREHOUSE_TYPE_DISPLAY_NAMES[WarehouseType.CUSTOM] },
]

// ==================== 状态 ====================

const loading = ref(false)
const warehouseId = ref<number>(0)
const warehouse = ref<Warehouse | null>(null)
const assignedUsers = ref<User[]>([])
const allUsers = ref<User[]>([])
const availableUsers = ref<User[]>([])
const selectedUserIds = ref<number[]>([])
const showModal = ref(false)

/** 是否为创建模式 */
const isCreateMode = ref(false)

/** 编辑表单（编辑模式使用） */
const editForm = reactive({ name: '', address: '', is_active: true })

/** 创建表单（创建模式使用） */
const createForm = reactive({
  name: '',
  address: '',
  warehouse_type: WarehouseType.PIECE as WarehouseType,
  custom_unit: '',  // 自定义单位（仅 custom 类型使用）
  category_name: '',
  driver_only_price: '',
  with_vehicle_price: '',
  work_start_time: '08:00',
  work_end_time: '18:00',
  daily_target: '100',
})

// ==================== 计算属性 ====================

/** 是否为自定义类型 */
const isCustomType = computed(() => {
  return createForm.warehouse_type === WarehouseType.CUSTOM
})

/** 当前选中仓库类型的预设单位 */
const currentPresetUnit = computed(() => {
  // 自定义类型使用用户输入的单位
  if (isCustomType.value) {
    return createForm.custom_unit || '(请输入)'
  }
  return getWarehousePresetUnit(createForm.warehouse_type)
})

// ==================== 方法 ====================

/**
 * 获取仓库类型的显示名称
 */
function getWarehouseTypeName(type: string | undefined): string {
  if (!type) return '计件'
  return WAREHOUSE_TYPE_DISPLAY_NAMES[type as WarehouseType] || '计件'
}

/**
 * 上班时间选择器变化
 */
function onWorkStartTimeChange(e: any): void {
  createForm.work_start_time = e.detail.value
}

/**
 * 下班时间选择器变化
 */
function onWorkEndTimeChange(e: any): void {
  createForm.work_end_time = e.detail.value
}

/**
 * 返回上一页
 */
function goBack(): void {
  uni.navigateBack()
}

onLoad((options) => {
  if (options?.id) {
    // 编辑模式
    warehouseId.value = parseInt(options.id as string, 10)
    isCreateMode.value = false
    loadWarehouse()
  } else {
    // 创建模式
    isCreateMode.value = true
  }
})

/**
 * 加载仓库信息（编辑模式）
 */
async function loadWarehouse(): Promise<void> {
  if (!warehouseId.value) return
  loading.value = true
  try {
    const [warehouseData, usersData] = await Promise.all([
      getWarehouse(warehouseId.value),
      getWarehouseUsers(warehouseId.value),
    ])
    warehouse.value = warehouseData
    assignedUsers.value = usersData
    editForm.name = warehouseData.name
    editForm.address = warehouseData.address || ''
    editForm.is_active = warehouseData.is_active
  } catch (error) {
    console.error('加载仓库信息失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 创建仓库（创建模式）
 */
async function handleCreate(): Promise<void> {
  // 表单验证
  if (!createForm.name.trim()) {
    uni.showToast({ title: '请输入仓库名称', icon: 'none' })
    return
  }
  
  // 自定义类型验证：custom_unit 必填
  if (createForm.warehouse_type === WarehouseType.CUSTOM) {
    if (!createForm.custom_unit.trim()) {
      uni.showToast({ title: '请输入单位名称', icon: 'none' })
      return
    }
  }
  
  if (!createForm.category_name.trim()) {
    uni.showToast({ title: '请输入品类名称', icon: 'none' })
    return
  }
  
  const driverOnlyPrice = parseFloat(createForm.driver_only_price)
  const withVehiclePrice = parseFloat(createForm.with_vehicle_price)
  
  if (isNaN(driverOnlyPrice) || driverOnlyPrice < 0) {
    uni.showToast({ title: '请输入有效的纯司机单价', icon: 'none' })
    return
  }
  if (isNaN(withVehiclePrice) || withVehiclePrice < 0) {
    uni.showToast({ title: '请输入有效的带车司机单价', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '创建中...' })
    
    // 构建创建请求参数
    const createParams: any = {
      name: createForm.name.trim(),
      address: createForm.address.trim() || undefined,
      warehouse_type: createForm.warehouse_type,
      category_name: createForm.category_name.trim(),
      driver_only_price: driverOnlyPrice,
      with_vehicle_price: withVehiclePrice,
    }
    
    // 自定义类型添加 custom_unit 参数
    if (createForm.warehouse_type === WarehouseType.CUSTOM) {
      createParams.custom_unit = createForm.custom_unit.trim()
    }
    
    await createWarehouse(createParams)
    
    uni.hideLoading()
    uni.showToast({ title: '创建成功', icon: 'success' })
    
    // 返回列表页
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (error) {
    console.error('创建仓库失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

function getRoleClass(role: string): string {
  switch (role) {
    case UserRole.BOSS: return 'boss'
    case UserRole.MANAGER: return 'manager'
    default: return 'driver'
  }
}

/**
 * 保存仓库修改（编辑模式）
 */
async function handleSave(): Promise<void> {
  if (!editForm.name.trim()) {
    uni.showToast({ title: '请输入仓库名称', icon: 'none' })
    return
  }
  try {
    uni.showLoading({ title: '保存中...' })
    await updateWarehouse(warehouseId.value, {
      name: editForm.name.trim(),
      address: editForm.address.trim() || undefined,
      is_active: editForm.is_active,
    })
    uni.hideLoading()
    uni.showToast({ title: '保存成功', icon: 'success' })
    await loadWarehouse()
  } catch (error) {
    console.error('保存仓库信息失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

/**
 * 删除仓库
 */
function handleDelete(): void {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除仓库"${warehouse.value?.name}"吗？`,
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })
          await deleteWarehouse(warehouseId.value)
          uni.hideLoading()
          uni.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1500)
        } catch (error) {
          console.error('删除仓库失败:', error)
          uni.hideLoading()
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

async function showAssignModal(): Promise<void> {
  try {
    uni.showLoading({ title: '加载中...' })
    const users = await getUsers()
    allUsers.value = users
    const assignedIds = assignedUsers.value.map(u => u.id)
    availableUsers.value = users.filter(u => !assignedIds.includes(u.id))
    selectedUserIds.value = []
    uni.hideLoading()
    showModal.value = true
  } catch (error) {
    console.error('加载用户列表失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function closeModal(): void { showModal.value = false }

function toggleUserSelection(userId: number): void {
  const index = selectedUserIds.value.indexOf(userId)
  if (index > -1) selectedUserIds.value.splice(index, 1)
  else selectedUserIds.value.push(userId)
}

async function handleAssign(): Promise<void> {
  if (selectedUserIds.value.length === 0) {
    uni.showToast({ title: '请选择要分配的用户', icon: 'none' })
    return
  }
  try {
    uni.showLoading({ title: '分配中...' })
    await assignUsersToWarehouse(warehouseId.value, selectedUserIds.value)
    uni.hideLoading()
    uni.showToast({ title: '分配成功', icon: 'success' })
    closeModal()
    await loadWarehouse()
  } catch (error) {
    console.error('分配用户失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '分配失败', icon: 'none' })
  }
}
</script>


<style lang="scss" scoped>
.warehouse-detail-page { min-height: 100vh; background-color: #f5f5f5; padding-bottom: 40rpx; }
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }

/* 头部样式 */
.warehouse-header { display: flex; align-items: center; padding: 40rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.warehouse-header.create-header { background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%); }
.warehouse-icon { width: 120rpx; height: 120rpx; border-radius: 24rpx; background-color: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; margin-right: 24rpx; }
.icon-text { font-size: 60rpx; }
.warehouse-basic { flex: 1; }
.warehouse-name { font-size: 36rpx; font-weight: bold; color: #ffffff; margin-bottom: 12rpx; display: block; }
.warehouse-tags { display: flex; }
.status-tag { padding: 6rpx 16rpx; border-radius: 8rpx; &.active { background-color: rgba(82, 196, 26, 0.3); } &.inactive { background-color: rgba(255, 77, 79, 0.3); } }
.tag-text { font-size: 24rpx; color: #ffffff; }

/* 卡片样式 */
.info-card, .edit-card, .assign-card { margin: 24rpx; background-color: #ffffff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
.card-title { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20rpx; border-bottom: 1rpx solid #f0f0f0; margin-bottom: 20rpx; }
.title-text { font-size: 30rpx; font-weight: bold; color: #333333; }
.title-count { font-size: 26rpx; color: #999999; }

/* 信息项样式 */
.info-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; &:last-child { border-bottom: none; } }
.item-label { font-size: 28rpx; color: #666666; }
.item-value { font-size: 28rpx; color: #333333; &.active { color: #52c41a; } &.inactive { color: #ff4d4f; } }
.type-display { display: flex; align-items: center; gap: 8rpx; }
.type-value { color: #1890ff; font-weight: 500; }
.type-unit { font-size: 24rpx; color: #999999; }
.type-locked { font-size: 24rpx; color: #faad14; }

/* 表单样式 */
.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #666666; margin-bottom: 12rpx; display: block; &.required::before { content: '*'; color: #ff4d4f; margin-right: 8rpx; } }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 12rpx; font-size: 28rpx; color: #333333; display: flex; align-items: center; box-sizing: border-box; }
.picker-input { justify-content: space-between; }
.picker-arrow { font-size: 32rpx; color: #999999; }

/* 类型选择器样式 */
.type-selector { display: flex; flex-wrap: wrap; gap: 12rpx; }
.type-option { flex: 1; min-width: calc(50% - 6rpx); height: 72rpx; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; border-radius: 12rpx; border: 2rpx solid transparent; transition: all 0.3s; &.active { border-color: #1890ff; background-color: #e6f7ff; .type-label { color: #1890ff; font-weight: 500; } } }
.type-label { font-size: 26rpx; color: #666666; }
.preset-unit-hint { display: flex; align-items: center; margin-top: 12rpx; padding: 12rpx 16rpx; background-color: #f0f9ff; border-radius: 8rpx; border-left: 4rpx solid #1890ff; }
.hint-label { font-size: 24rpx; color: #666666; }
.hint-value { font-size: 26rpx; color: #1890ff; font-weight: 500; margin-left: 8rpx; }

/* 自定义单位输入框样式 */
.custom-unit-input { margin-top: 16rpx; padding: 16rpx; background-color: #fffbe6; border-radius: 8rpx; border: 1rpx solid #ffe58f; }

/* 状态切换样式 */
.status-switch { display: flex; gap: 16rpx; }
.switch-option { flex: 1; height: 72rpx; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; border-radius: 12rpx; border: 2rpx solid transparent; &.active { background-color: #e6f7ff; border-color: #1890ff; .option-text { color: #1890ff; } } }
.option-text { font-size: 28rpx; color: #666666; }

/* 分配用户样式 */
.assigned-list { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 20rpx; }
.assigned-item { display: flex; align-items: center; padding: 12rpx 16rpx; background-color: #f5f5f5; border-radius: 12rpx; }
.user-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12rpx; &.driver { background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%); } &.manager { background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%); } &.boss { background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%); } }
.avatar-text { font-size: 24rpx; font-weight: bold; color: #ffffff; }
.user-info { flex: 1; }
.user-name { font-size: 26rpx; color: #333333; display: block; }
.user-role { font-size: 22rpx; color: #999999; }
.empty-assign { padding: 32rpx 0; text-align: center; }
.empty-text { font-size: 26rpx; color: #999999; }
.assign-btn { height: 72rpx; display: flex; align-items: center; justify-content: center; background-color: #e6f7ff; border-radius: 12rpx; border: 1rpx dashed #1890ff; .btn-text { font-size: 28rpx; color: #1890ff; } }

/* 操作按钮样式 */
.action-buttons { padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.btn { height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; }
.save-btn { background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%); .btn-text { color: #ffffff; } }
.delete-btn { background-color: #fff1f0; border: 1rpx solid #ffccc7; .btn-text { color: #ff4d4f; } }
.cancel-btn { background-color: #f5f5f5; border: 1rpx solid #d9d9d9; .btn-text { color: #666666; } }
.btn-text { font-size: 30rpx; font-weight: bold; }

/* 错误状态样式 */
.error-container { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.error-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.error-text { font-size: 28rpx; color: #999999; margin-bottom: 32rpx; }
.retry-btn { padding: 16rpx 48rpx; background-color: #1890ff; border-radius: 8rpx; }
.retry-text { font-size: 28rpx; color: #ffffff; }

/* 弹窗样式 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 600rpx; max-height: 80vh; background-color: #ffffff; border-radius: 16rpx; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 32rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333333; }
.modal-close { font-size: 36rpx; color: #999999; padding: 8rpx; }
.modal-body { flex: 1; overflow-y: auto; padding: 24rpx; }
.empty-users { padding: 48rpx 0; text-align: center; }
.user-select-list { display: flex; flex-direction: column; gap: 12rpx; }
.user-select-item { display: flex; align-items: center; padding: 16rpx; background-color: #f5f5f5; border-radius: 12rpx; border: 2rpx solid transparent; &.selected { background-color: #e6f7ff; border-color: #1890ff; } }
.check-icon { width: 40rpx; height: 40rpx; border-radius: 50%; background-color: #1890ff; display: flex; align-items: center; justify-content: center; }
.check-text { font-size: 24rpx; color: #ffffff; font-weight: bold; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f0f0; }
.modal-btn { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; &.cancel { border-right: 1rpx solid #f0f0f0; .btn-text { color: #666666; } } &.confirm { .btn-text { color: #1890ff; font-weight: bold; } } }
</style>
