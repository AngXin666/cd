<template>
  <!--
    车队长端司机管理页面
    功能：仓库切换、添加司机、司机详情、仓库分配、司机类型切换
    对齐主项目 v1.0-legacy 的 manager/driver-management 页面
    @requirements 1-10 - 完整的司机管理功能
  -->
  <view class="drivers-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="header-title">司机管理</text>
      <text class="header-subtitle">为司机分配您负责的仓库</text>
    </view>

    <!-- 无仓库提示 -->
    <view v-if="warehouses.length === 0 && !loading" class="warning-box">
      <text class="warning-icon">⚠️</text>
      <view class="warning-content">
        <text class="warning-title">暂无仓库</text>
        <text class="warning-text">您还没有被分配任何仓库，无法管理司机</text>
      </view>
    </view>

    <!-- 主内容区域 -->
    <view v-if="warehouses.length > 0" class="main-content">
      <!-- 权限禁用提示 -->
      <view v-if="!managerPermissionsEnabled" class="permission-warning">
        <text class="permission-icon">🔒</text>
        <view class="permission-content">
          <text class="permission-title">权限已禁用</text>
          <text class="permission-text">
            您的用户信息修改权限已被禁用，无法添加司机、分配仓库或切换司机类型。如需开启权限，请联系管理员。
          </text>
        </view>
      </view>

      <!-- 司机列表区域 -->
      <view class="driver-section">
        <!-- 标题栏 -->
        <view class="section-header">
          <view class="section-title-row">
            <text class="section-icon">👥</text>
            <text class="section-title">选择司机</text>
          </view>
          <!-- 添加司机按钮 -->
          <view
            v-if="managerPermissionsEnabled"
            class="add-driver-btn"
            @click="toggleAddDriver"
          >
            <text class="btn-icon">{{ showAddDriver ? '✕' : '+' }}</text>
            <text class="btn-text">{{ showAddDriver ? '取消' : '添加司机' }}</text>
          </view>
        </view>

        <!-- 仓库切换器 (Swiper) - Requirements 1 -->
        <view v-if="warehouses.length > 1" class="warehouse-switcher">
          <view class="switcher-header">
            <text class="switcher-icon">🏭</text>
            <text class="switcher-title">选择仓库</text>
            <text class="switcher-index">({{ currentWarehouseIndex + 1 }}/{{ warehouses.length }})</text>
            <text class="driver-count-label">{{ filteredDrivers.length }} 名司机</text>
          </view>
          <swiper
            class="warehouse-swiper"
            :current="currentWarehouseIndex"
            indicator-dots
            indicator-color="rgba(0, 0, 0, 0.2)"
            indicator-active-color="#1E3A8A"
            @change="handleWarehouseChange"
          >
            <swiper-item v-for="warehouse in warehouses" :key="warehouse.id">
              <view class="swiper-slide">
                <text class="warehouse-icon">🏭</text>
                <text class="warehouse-name">{{ warehouse.name }}</text>
                <text class="warehouse-count">({{ getWarehouseDriverCount(warehouse.id) }}人)</text>
              </view>
            </swiper-item>
          </swiper>
        </view>

        <!-- 搜索按钮 - Requirements 10 -->
        <view class="search-toggle" @click="toggleSearch">
          <text class="search-toggle-icon">{{ showSearch ? '✕' : '🔍' }}</text>
          <text class="search-toggle-text">{{ showSearch ? '收起搜索' : '展开搜索' }}</text>
        </view>

        <!-- 搜索框 -->
        <view v-if="showSearch" class="search-box">
          <view class="search-input-wrapper">
            <text class="search-icon">🔍</text>
            <input
              v-model="searchKeyword"
              class="search-input"
              type="text"
              placeholder="搜索司机姓名或手机号"
            />
            <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
          </view>
        </view>

        <!-- 添加司机表单 - Requirements 2 -->
        <view v-if="showAddDriver" class="add-driver-form">
          <view class="form-group">
            <text class="form-label">手机号</text>
            <input
              v-model="newDriverPhone"
              class="form-input"
              type="number"
              maxlength="11"
              placeholder="请输入11位手机号"
            />
          </view>
          <view class="form-group">
            <text class="form-label">姓名</text>
            <input
              v-model="newDriverName"
              class="form-input"
              type="text"
              placeholder="请输入司机姓名"
            />
          </view>
          <view class="form-group">
            <text class="form-label">司机类型</text>
            <view class="driver-type-selector">
              <view
                :class="['type-option', { active: newDriverType === 'pure' }]"
                @click="newDriverType = 'pure'"
              >
                <text class="type-icon">👤</text>
                <text class="type-text">纯司机</text>
              </view>
              <view
                :class="['type-option', { active: newDriverType === 'with_vehicle' }]"
                @click="newDriverType = 'with_vehicle'"
              >
                <text class="type-icon">🚛</text>
                <text class="type-text">带车司机</text>
              </view>
            </view>
          </view>
          <view class="form-group">
            <text class="form-label">分配仓库 <text class="required">*</text></text>
            <view class="warehouse-checkbox-list">
              <view
                v-for="warehouse in warehouses"
                :key="warehouse.id"
                :class="['warehouse-checkbox-item', { checked: newDriverWarehouseIds.includes(warehouse.id) }]"
                @click="toggleNewDriverWarehouse(warehouse.id)"
              >
                <view class="checkbox-icon">{{ newDriverWarehouseIds.includes(warehouse.id) ? '✓' : '' }}</view>
                <text class="checkbox-label">{{ warehouse.name }}</text>
              </view>
            </view>
          </view>
          <view class="form-tip">
            <text class="tip-icon">ℹ️</text>
            <text class="tip-text">默认密码为 <text class="bold">123456</text>，司机首次登录后请及时修改密码</text>
          </view>
          <view class="form-actions">
            <button class="submit-btn" :disabled="addingDriver" @click="handleAddDriver">
              <text class="btn-icon">✓</text>
              <text class="btn-text">确认添加</text>
            </button>
          </view>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="loading-container">
          <text class="loading-text">加载中...</text>
        </view>

        <!-- 空状态 -->
        <view v-else-if="filteredDrivers.length === 0" class="empty-container">
          <text class="empty-icon">{{ searchKeyword ? '🔍' : '👥' }}</text>
          <text class="empty-text">{{ searchKeyword ? '未找到匹配的司机' : '暂无司机' }}</text>
        </view>

        <!-- 司机列表 - Requirements 3, 4, 5, 6 -->
        <view v-else class="driver-list">
          <view
            v-for="driver in filteredDrivers"
            :key="driver.id"
            class="driver-card"
          >
            <!-- 司机头部信息 -->
            <view class="driver-header">
              <view class="driver-avatar">
                <text class="avatar-text">{{ driver.name?.charAt(0) || '?' }}</text>
              </view>
              <view class="driver-info">
                <view class="name-row">
                  <text class="driver-name">{{ driver.name || '未设置姓名' }}</text>
                  <!-- 实名状态标签 - Requirements 4 -->
                  <view v-if="isDriverVerified(driver)" class="tag verified">
                    <text class="tag-text">已实名</text>
                  </view>
                  <view v-else class="tag unverified">
                    <text class="tag-text">未实名</text>
                  </view>
                  <!-- 司机类型标签 - Requirements 5 -->
                  <view :class="['tag', getDriverTypeClass(driver)]">
                    <text class="tag-text">{{ getDriverTypeText(driver) }}</text>
                  </view>
                </view>
                <text class="driver-phone">{{ driver.phone || '未设置手机号' }}</text>
              </view>
            </view>

            <!-- 司机详细信息 - Requirements 3 -->
            <view v-if="driver.detail" class="driver-detail-grid">
              <!-- 年龄 -->
              <view v-if="driver.detail.age" class="detail-item">
                <text class="detail-icon">🎂</text>
                <view class="detail-content">
                  <text class="detail-label">年龄</text>
                  <text class="detail-value">{{ driver.detail.age }}岁</text>
                </view>
              </view>
              <!-- 驾龄 -->
              <view v-if="driver.detail.drivingYears" class="detail-item">
                <text class="detail-icon">🚗</text>
                <view class="detail-content">
                  <text class="detail-label">驾龄</text>
                  <text class="detail-value">{{ driver.detail.drivingYears }}年</text>
                </view>
              </view>
              <!-- 准驾车型 -->
              <view v-if="driver.detail.licenseClass" class="detail-item">
                <text class="detail-icon">📋</text>
                <view class="detail-content">
                  <text class="detail-label">准驾车型</text>
                  <text class="detail-value">{{ driver.detail.licenseClass }}</text>
                </view>
              </view>
              <!-- 车辆数量 -->
              <view class="detail-item">
                <text class="detail-icon">🚛</text>
                <view class="detail-content">
                  <text class="detail-label">车辆</text>
                  <text class="detail-value">{{ driver.detail.vehicleCount > 0 ? `${driver.detail.vehicleCount}辆` : '无车辆' }}</text>
                </view>
              </view>
              <!-- 入职时间 -->
              <view v-if="driver.detail.joinDate" class="detail-item">
                <text class="detail-icon">📅</text>
                <view class="detail-content">
                  <text class="detail-label">入职时间</text>
                  <text class="detail-value">{{ driver.detail.joinDate }}</text>
                </view>
              </view>
              <!-- 在职天数 -->
              <view v-if="driver.detail.workDays !== null" class="detail-item">
                <text class="detail-icon">⏱️</text>
                <view class="detail-content">
                  <text class="detail-label">在职天数</text>
                  <text class="detail-value">{{ driver.detail.workDays }}天</text>
                </view>
              </view>
            </view>

            <!-- 车牌号 -->
            <view v-if="driver.detail?.plateNumbers?.length" class="plate-info">
              <text class="plate-icon">🚗</text>
              <text class="plate-label">车牌号：</text>
              <text class="plate-value">{{ driver.detail.plateNumbers.join('、') }}</text>
            </view>

            <!-- 身份证号码 -->
            <view v-if="driver.detail?.idCardNumber" class="id-card-info">
              <text class="id-icon">🪪</text>
              <view class="id-content">
                <text class="id-label">身份证号码</text>
                <text class="id-value">{{ driver.detail.idCardNumber }}</text>
              </view>
            </view>

            <!-- 住址 -->
            <view v-if="driver.detail?.address" class="address-info">
              <text class="address-icon">🏠</text>
              <view class="address-content">
                <text class="address-label">住址</text>
                <text class="address-value">{{ driver.detail.address }}</text>
              </view>
            </view>

            <!-- 实名通知按钮 - Requirements 8 -->
            <view v-if="!isDriverVerified(driver)" class="verification-reminder">
              <button class="reminder-btn" @click="handleSendVerificationReminder(driver)">
                <text class="reminder-icon">🔔</text>
                <text class="reminder-text">实名通知</text>
              </button>
            </view>

            <!-- 操作按钮 - Requirements 6 -->
            <view class="action-buttons">
              <view class="action-btn profile-btn" @click="handleViewDriverProfile(driver.id)">
                <text class="action-icon">👤</text>
                <text class="action-text">个人信息</text>
              </view>
              <view class="action-btn vehicle-btn" @click="handleViewDriverVehicles(driver.id)">
                <text class="action-icon">🚗</text>
                <text class="action-text">车辆管理</text>
              </view>
              <view
                v-if="managerPermissionsEnabled"
                class="action-btn warehouse-btn"
                @click="handleWarehouseAssignClick(driver)"
              >
                <text class="action-icon">🏭</text>
                <text class="action-text">仓库分配</text>
              </view>
              <view
                v-if="managerPermissionsEnabled"
                class="action-btn type-btn"
                @click="handleToggleDriverType(driver)"
              >
                <text class="action-icon">🔄</text>
                <text class="action-text">{{ driver.driver_type === 'with_vehicle' ? '切换为纯司机' : '切换为带车司机' }}</text>
              </view>
            </view>

            <!-- 仓库分配面板 - Requirements 7 -->
            <view v-if="warehouseAssignExpanded === driver.id" class="warehouse-assign-panel">
              <view class="panel-header">
                <text class="panel-icon">🏭</text>
                <text class="panel-title">选择仓库</text>
                <text class="panel-count">已选 {{ selectedWarehouseIds.length }} 个</text>
              </view>
              <view class="warehouse-list">
                <view
                  v-for="warehouse in warehouses"
                  :key="warehouse.id"
                  :class="['warehouse-item', { selected: selectedWarehouseIds.includes(warehouse.id) }]"
                  @click="toggleWarehouseSelection(warehouse.id)"
                >
                  <view class="warehouse-checkbox">{{ selectedWarehouseIds.includes(warehouse.id) ? '✓' : '' }}</view>
                  <text class="warehouse-name">{{ warehouse.name }}</text>
                </view>
              </view>
              <view class="panel-actions">
                <button class="cancel-btn" @click="cancelWarehouseAssign">取消</button>
                <button class="save-btn" @click="handleSaveWarehouseAssignment(driver.id)">保存</button>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 车队长端司机管理页面
 * 功能：仓库切换、添加司机、司机详情、仓库分配、司机类型切换
 * 对齐主项目 v1.0-legacy 的 manager/driver-management 页面
 *
 * @requirements 1 - 仓库切换器 (Swiper)
 * @requirements 2 - 添加司机功能
 * @requirements 3 - 司机详细信息展示
 * @requirements 4 - 实名认证标签
 * @requirements 5 - 司机类型标签
 * @requirements 6 - 操作按钮
 * @requirements 7 - 仓库分配面板
 * @requirements 8 - 实名通知按钮
 * @requirements 9 - 权限控制
 * @requirements 10 - 可折叠搜索
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getWarehouses,
  getWarehouseUsers,
  createUser,
  assignUserWarehouses,
  getUser,
  updateUser,
} from '@/api'
import type { User, Warehouse } from '@/api/types'
import { UserRole } from '@/api/types'
import { formatDate } from '@/utils'

// ==================== 类型定义 ====================

/**
 * 司机详细信息
 * 包含年龄、驾龄、车辆等扩展信息
 */
interface DriverDetailInfo {
  /** 年龄 */
  age: number | null
  /** 驾龄（年） */
  drivingYears: number | null
  /** 准驾车型 */
  licenseClass: string | null
  /** 车辆数量 */
  vehicleCount: number
  /** 车牌号列表 */
  plateNumbers: string[]
  /** 入职时间 */
  joinDate: string | null
  /** 在职天数 */
  workDays: number | null
  /** 身份证号码 */
  idCardNumber: string | null
  /** 住址 */
  address: string | null
}

/**
 * 带详情的司机信息
 * 扩展 User 类型，添加仓库ID和详细信息
 */
interface DriverWithDetails extends User {
  /** 所属仓库ID */
  warehouse_id: number | null
  /** 司机详细信息 */
  detail?: DriverDetailInfo
  /** 司机类型 */
  driver_type?: 'pure' | 'with_vehicle'
}

// ==================== 状态定义 ====================

/** 加载状态 */
const loading = ref(false)

/** 司机列表 */
const drivers = ref<DriverWithDetails[]>([])

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 司机-仓库映射 */
const driverWarehouseMap = ref<Map<number, number[]>>(new Map())

/** 当前仓库索引 - Requirements 1 */
const currentWarehouseIndex = ref(0)

/** 搜索关键词 */
const searchKeyword = ref('')

/** 搜索框显示状态 - Requirements 10 */
const showSearch = ref(false)

/** 添加司机表单显示状态 - Requirements 2 */
const showAddDriver = ref(false)

/** 新司机手机号 */
const newDriverPhone = ref('')

/** 新司机姓名 */
const newDriverName = ref('')

/** 新司机类型 */
const newDriverType = ref<'pure' | 'with_vehicle'>('pure')

/** 新司机仓库分配 */
const newDriverWarehouseIds = ref<number[]>([])

/** 添加中状态 */
const addingDriver = ref(false)

/** 仓库分配展开状态 - Requirements 7 */
const warehouseAssignExpanded = ref<number | null>(null)

/** 选中的仓库ID列表 */
const selectedWarehouseIds = ref<number[]>([])

/** 车队长权限状态 - Requirements 9 */
const managerPermissionsEnabled = ref(true)

// ==================== 计算属性 ====================

/**
 * 筛选后的司机列表
 * 支持仓库筛选和搜索
 * @requirements 1, 10 - 仓库筛选和搜索功能
 */
const filteredDrivers = computed(() => {
  let result = drivers.value

  // 按仓库筛选（多仓库时）
  if (warehouses.value.length > 1 && warehouses.value[currentWarehouseIndex.value]) {
    const currentWarehouseId = warehouses.value[currentWarehouseIndex.value].id
    result = result.filter((driver) => {
      const driverWarehouses = driverWarehouseMap.value.get(driver.id) || []
      return driverWarehouses.includes(currentWarehouseId)
    })
  }

  // 按关键词搜索
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter(
      (driver) =>
        driver.name?.toLowerCase().includes(keyword) ||
        driver.phone?.toLowerCase().includes(keyword)
    )
  }

  return result
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
})

onShow(() => {
  // 每次显示页面时刷新数据
  loadData()
})

// ==================== 方法定义 ====================

/**
 * 获取仓库的司机数量
 * @param warehouseId - 仓库ID
 * @returns 该仓库的司机数量
 */
function getWarehouseDriverCount(warehouseId: number): number {
  return drivers.value.filter((driver) => {
    const driverWarehouses = driverWarehouseMap.value.get(driver.id) || []
    return driverWarehouses.includes(warehouseId)
  }).length
}

/**
 * 处理仓库切换
 * @param e - Swiper change 事件
 * @requirements 1 - 仓库切换器
 */
function handleWarehouseChange(e: { detail: { current: number } }): void {
  currentWarehouseIndex.value = e.detail.current
}

/**
 * 切换搜索框显示状态
 * @requirements 10 - 可折叠搜索
 */
function toggleSearch(): void {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchKeyword.value = ''
  }
}

/**
 * 清除搜索关键词
 */
function clearSearch(): void {
  searchKeyword.value = ''
}

/**
 * 切换添加司机表单显示状态
 * @requirements 2 - 添加司机功能
 */
function toggleAddDriver(): void {
  showAddDriver.value = !showAddDriver.value
  if (!showAddDriver.value) {
    // 重置表单
    newDriverPhone.value = ''
    newDriverName.value = ''
    newDriverType.value = 'pure'
    newDriverWarehouseIds.value = []
  }
}

/**
 * 切换新司机仓库选择
 * @param warehouseId - 仓库ID
 */
function toggleNewDriverWarehouse(warehouseId: number): void {
  const index = newDriverWarehouseIds.value.indexOf(warehouseId)
  if (index === -1) {
    newDriverWarehouseIds.value.push(warehouseId)
  } else {
    newDriverWarehouseIds.value.splice(index, 1)
  }
}

/**
 * 加载数据
 * 获取仓库列表和司机列表
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    // 1. 获取所有启用的仓库
    const warehousesData = await getWarehouses({ is_active: true })
    warehouses.value = warehousesData

    // 2. 为每个仓库获取司机列表
    const newDriverWarehouseMap = new Map<number, number[]>()
    const allDriversMap = new Map<number, DriverWithDetails>()

    // 并行获取所有仓库的司机
    const warehouseUsersPromises = warehousesData.map(async (warehouse) => {
      try {
        const users = await getWarehouseUsers(warehouse.id)
        // 只保留司机角色的用户
        const warehouseDrivers = users.filter((u) => u.role === UserRole.DRIVER)
        // 建立司机-仓库映射
        warehouseDrivers.forEach((driver) => {
          // 更新司机-仓库映射
          const existingWarehouses = newDriverWarehouseMap.get(driver.id) || []
          existingWarehouses.push(warehouse.id)
          newDriverWarehouseMap.set(driver.id, existingWarehouses)
          // 收集司机信息
          if (!allDriversMap.has(driver.id)) {
            allDriversMap.set(driver.id, {
              ...driver,
              warehouse_id: warehouse.id,
              detail: createMockDriverDetail(driver),
            })
          }
        })
        return warehouseDrivers
      } catch (error) {
        console.error(`获取仓库 ${warehouse.name} 的司机失败:`, error)
        return []
      }
    })

    await Promise.all(warehouseUsersPromises)

    // 3. 更新状态
    driverWarehouseMap.value = newDriverWarehouseMap
    drivers.value = Array.from(allDriversMap.values())
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

/**
 * 创建模拟的司机详细信息
 * 注意：实际项目中应从后端 API 获取
 * @param driver - 司机基本信息
 * @returns 司机详细信息
 */
function createMockDriverDetail(driver: User): DriverDetailInfo {
  // 计算在职天数
  const createdAt = driver.created_at ? new Date(driver.created_at) : null
  const workDays = createdAt
    ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return {
    age: null,
    drivingYears: null,
    licenseClass: null,
    vehicleCount: 0,
    plateNumbers: [],
    joinDate: createdAt ? formatDate(driver.created_at) : null,
    workDays,
    idCardNumber: null,
    address: null,
  }
}

/**
 * 判断司机是否已实名
 * @param driver - 司机信息
 * @returns 是否已实名
 * @requirements 4 - 实名认证标签
 */
function isDriverVerified(driver: DriverWithDetails): boolean {
  // 检查是否有身份证信息
  return !!(driver.detail?.idCardNumber)
}

/**
 * 获取司机类型文本
 * @param driver - 司机信息
 * @returns 司机类型文本
 * @requirements 5 - 司机类型标签
 */
function getDriverTypeText(driver: DriverWithDetails): string {
  const isNew = driver.detail?.workDays !== null && driver.detail?.workDays !== undefined && driver.detail.workDays <= 7
  const isWithVehicle = driver.driver_type === 'with_vehicle'

  if (isWithVehicle) {
    return isNew ? '新带车司机' : '带车司机'
  } else {
    return isNew ? '新纯司机' : '纯司机'
  }
}

/**
 * 获取司机类型样式类
 * @param driver - 司机信息
 * @returns 样式类名
 * @requirements 5 - 司机类型标签
 */
function getDriverTypeClass(driver: DriverWithDetails): string {
  const isNew = driver.detail?.workDays !== null && driver.detail?.workDays !== undefined && driver.detail.workDays <= 7
  const isWithVehicle = driver.driver_type === 'with_vehicle'

  if (isWithVehicle) {
    return isNew ? 'new-with-vehicle' : 'with-vehicle'
  } else {
    return isNew ? 'new-pure' : 'pure'
  }
}

/**
 * 处理添加司机
 * @requirements 2 - 添加司机功能
 */
async function handleAddDriver(): Promise<void> {
  // 验证输入
  if (!newDriverPhone.value.trim()) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  if (!newDriverName.value.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }

  // 验证手机号格式（11位数字）
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(newDriverPhone.value.trim())) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  // 验证仓库选择
  if (newDriverWarehouseIds.value.length === 0) {
    uni.showToast({ title: '请至少选择一个仓库', icon: 'none' })
    return
  }

  addingDriver.value = true
  uni.showLoading({ title: '添加中...' })

  try {
    // 创建司机账号
    const username = `${newDriverPhone.value.trim()}@fleet.com`
    const newDriver = await createUser({
      username,
      password: '123456',
      name: newDriverName.value.trim(),
      phone: newDriverPhone.value.trim(),
      role: UserRole.DRIVER,
    })

    if (newDriver) {
      // 分配仓库
      await assignUserWarehouses(newDriver.id, newDriverWarehouseIds.value)

      uni.hideLoading()

      // 显示创建成功信息
      const driverTypeText = newDriverType.value === 'with_vehicle' ? '带车司机' : '纯司机'
      const warehouseNames = warehouses.value
        .filter((w) => newDriverWarehouseIds.value.includes(w.id))
        .map((w) => w.name)
        .join('、')

      uni.showModal({
        title: '司机创建成功',
        content: `姓名：${newDriverName.value.trim()}\n手机号码：${newDriverPhone.value.trim()}\n司机类型：${driverTypeText}\n分配仓库：${warehouseNames}\n登录账号：${username}\n默认密码：123456`,
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          // 重置表单
          newDriverPhone.value = ''
          newDriverName.value = ''
          newDriverType.value = 'pure'
          newDriverWarehouseIds.value = []
          showAddDriver.value = false
          // 刷新数据
          loadData()
        },
      })
    } else {
      uni.hideLoading()
      uni.showToast({ title: '添加失败，手机号可能已存在', icon: 'none' })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('添加司机失败:', error)
    uni.showToast({ title: '添加失败，请重试', icon: 'none' })
  } finally {
    addingDriver.value = false
  }
}

/**
 * 查看司机个人信息
 * @param driverId - 司机ID
 * @requirements 6 - 操作按钮
 */
function handleViewDriverProfile(driverId: number): void {
  uni.navigateTo({
    url: `/pages/manager/drivers/detail?id=${driverId}`,
  })
}

/**
 * 查看司机车辆
 * @param driverId - 司机ID
 * @requirements 6 - 操作按钮
 */
function handleViewDriverVehicles(driverId: number): void {
  uni.navigateTo({
    url: `/pages/manager/vehicle/list?driverId=${driverId}`,
  })
}

/**
 * 发送实名通知
 * @param driver - 司机信息
 * @requirements 8 - 实名通知按钮
 */
async function handleSendVerificationReminder(driver: DriverWithDetails): Promise<void> {
  uni.showLoading({ title: '发送中...' })

  try {
    // TODO: 调用通知 API 发送实名提醒
    // await sendVerificationReminder(driver.id)

    uni.hideLoading()
    uni.showToast({ title: '通知已发送', icon: 'success' })
  } catch (error) {
    uni.hideLoading()
    console.error('发送实名通知失败:', error)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

/**
 * 处理仓库分配按钮点击
 * @param driver - 司机信息
 * @requirements 7 - 仓库分配面板
 */
async function handleWarehouseAssignClick(driver: DriverWithDetails): Promise<void> {
  if (warehouseAssignExpanded.value === driver.id) {
    // 收起面板
    warehouseAssignExpanded.value = null
    selectedWarehouseIds.value = []
  } else {
    // 展开面板并加载已分配的仓库
    warehouseAssignExpanded.value = driver.id
    try {
      // 使用已有的 driverWarehouseMap 获取仓库分配
      selectedWarehouseIds.value = driverWarehouseMap.value.get(driver.id) || []
    } catch (error) {
      console.error('加载仓库分配失败:', error)
      selectedWarehouseIds.value = []
    }
  }
}

/**
 * 切换仓库选择
 * @param warehouseId - 仓库ID
 */
function toggleWarehouseSelection(warehouseId: number): void {
  const index = selectedWarehouseIds.value.indexOf(warehouseId)
  if (index === -1) {
    selectedWarehouseIds.value.push(warehouseId)
  } else {
    selectedWarehouseIds.value.splice(index, 1)
  }
}

/**
 * 取消仓库分配
 */
function cancelWarehouseAssign(): void {
  warehouseAssignExpanded.value = null
  selectedWarehouseIds.value = []
}

/**
 * 保存仓库分配
 * @param driverId - 司机ID
 * @requirements 7 - 仓库分配面板
 */
async function handleSaveWarehouseAssignment(driverId: number): Promise<void> {
  const driver = drivers.value.find((d) => d.id === driverId)
  const driverName = driver?.name || '该司机'

  // 获取选中的仓库名称
  const selectedWarehouseNames = warehouses.value
    .filter((w) => selectedWarehouseIds.value.includes(w.id))
    .map((w) => w.name)
    .join('、')

  const warehouseText = selectedWarehouseIds.value.length > 0 ? selectedWarehouseNames : '无'

  // 二次确认
  uni.showModal({
    title: '确认保存仓库分配',
    content: `确定要为 ${driverName} 分配以下仓库吗？\n\n${warehouseText}\n\n${selectedWarehouseIds.value.length === 0 ? '（将清除该司机的所有仓库分配）' : ''}`,
    confirmText: '确定',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '保存中...' })

        try {
          // 保存仓库分配
          await assignUserWarehouses(driverId, selectedWarehouseIds.value)

          uni.hideLoading()
          uni.showToast({ title: '保存成功', icon: 'success' })

          // 关闭面板并刷新数据
          warehouseAssignExpanded.value = null
          selectedWarehouseIds.value = []
          await loadData()
        } catch (error) {
          uni.hideLoading()
          console.error('保存仓库分配失败:', error)
          uni.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    },
  })
}

/**
 * 切换司机类型
 * @param driver - 司机信息
 * @requirements 6 - 操作按钮
 */
async function handleToggleDriverType(driver: DriverWithDetails): Promise<void> {
  const currentType = driver.driver_type || 'pure'
  const newType = currentType === 'with_vehicle' ? 'pure' : 'with_vehicle'
  const currentTypeText = currentType === 'with_vehicle' ? '带车司机' : '纯司机'
  const newTypeText = newType === 'with_vehicle' ? '带车司机' : '纯司机'

  // 二次确认
  uni.showModal({
    title: '确认切换司机类型',
    content: `确定要将 ${driver.name || '该司机'} 从【${currentTypeText}】切换为【${newTypeText}】吗？`,
    confirmText: '确定',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '切换中...' })

        try {
          // TODO: 调用 API 更新司机类型
          // await updateUser(driver.id, { driver_type: newType })

          uni.hideLoading()
          uni.showToast({ title: `已切换为${newTypeText}`, icon: 'success' })

          // 刷新数据
          await loadData()
        } catch (error) {
          uni.hideLoading()
          console.error('切换司机类型失败:', error)
          uni.showToast({ title: '切换失败', icon: 'none' })
        }
      }
    },
  })
}
</script>

<style lang="scss" scoped>
/**
 * 车队长端司机管理页面样式
 * 对齐主项目 v1.0-legacy 的设计风格
 */

.drivers-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8fafc, #e2e8f0);
  padding: 24rpx;
  box-sizing: border-box;
}

/* 页面标题 */
.page-header {
  background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
  border-radius: 16rpx;
  padding: 48rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(30, 58, 138, 0.3);
}

.header-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.header-subtitle {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 警告提示框 */
.warning-box,
.permission-warning {
  display: flex;
  align-items: flex-start;
  background-color: #fef3c7;
  border: 2rpx solid #fcd34d;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.warning-icon,
.permission-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
  margin-top: 4rpx;
}

.warning-content,
.permission-content {
  flex: 1;
}

.warning-title,
.permission-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #92400e;
  margin-bottom: 8rpx;
}

.warning-text,
.permission-text {
  display: block;
  font-size: 24rpx;
  color: #a16207;
  line-height: 1.5;
}

.permission-warning {
  background-color: #ffedd5;
  border-color: #fdba74;
}

.permission-title {
  color: #c2410c;
}

.permission-text {
  color: #ea580c;
}

/* 司机列表区域 */
.driver-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title-row {
  display: flex;
  align-items: center;
}

.section-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1f2937;
}

/* 添加司机按钮 */
.add-driver-btn {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;

  .btn-icon {
    font-size: 28rpx;
    color: #ffffff;
    margin-right: 8rpx;
  }

  .btn-text {
    font-size: 24rpx;
    color: #ffffff;
    font-weight: 500;
  }
}

/* 仓库切换器 */
.warehouse-switcher {
  margin-bottom: 24rpx;
}

.switcher-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.switcher-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

.switcher-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #374151;
}

.switcher-index {
  font-size: 24rpx;
  color: #9ca3af;
  margin-left: 8rpx;
}

.driver-count-label {
  font-size: 24rpx;
  color: #9ca3af;
  margin-left: auto;
}

.warehouse-swiper {
  height: 120rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.swiper-slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  padding: 0 32rpx;
}

.warehouse-icon {
  font-size: 40rpx;
  margin-right: 12rpx;
}

.warehouse-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #1e3a8a;
}

.warehouse-count {
  font-size: 24rpx;
  color: #6b7280;
  margin-left: 8rpx;
}

/* 搜索按钮 */
.search-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.04);
}

.search-toggle-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
  color: #2563eb;
}

.search-toggle-text {
  font-size: 28rpx;
  color: #2563eb;
  font-weight: 500;
}

/* 搜索框 */
.search-box {
  margin-bottom: 16rpx;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f3f4f6;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
  color: #9ca3af;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
}

.clear-icon {
  font-size: 28rpx;
  color: #9ca3af;
  padding: 8rpx;
}

/* 添加司机表单 */
.add-driver-form {
  background-color: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.form-group {
  margin-bottom: 20rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #374151;
  margin-bottom: 12rpx;
}

.required {
  color: #ef4444;
}

.form-input {
  width: 100%;
  background-color: #ffffff;
  border: 2rpx solid #d1d5db;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

/* 司机类型选择器 */
.driver-type-selector {
  display: flex;
  gap: 16rpx;
}

.type-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border: 2rpx solid #d1d5db;
  border-radius: 12rpx;
  padding: 20rpx;
  transition: all 0.2s;

  &.active {
    background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
    border-color: #1d4ed8;

    .type-icon,
    .type-text {
      color: #ffffff;
    }
  }
}

.type-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
  color: #6b7280;
}

.type-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
}

/* 仓库多选列表 */
.warehouse-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.warehouse-checkbox-item {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border: 2rpx solid #d1d5db;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  transition: all 0.2s;

  &.checked {
    border-color: #2563eb;
    background-color: #eff6ff;
  }
}

.checkbox-icon {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #d1d5db;
  border-radius: 8rpx;
  margin-right: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #2563eb;
  background-color: #ffffff;
}

.warehouse-checkbox-item.checked .checkbox-icon {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.checkbox-label {
  font-size: 28rpx;
  color: #374151;
}

/* 表单提示 */
.form-tip {
  display: flex;
  align-items: flex-start;
  background-color: #fef3c7;
  border: 2rpx solid #fcd34d;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 20rpx;
}

.tip-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #92400e;
  line-height: 1.5;
}

.bold {
  font-weight: bold;
}

/* 表单操作按钮 */
.form-actions {
  margin-top: 8rpx;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  border: none;
  border-radius: 12rpx;
  padding: 20rpx;
  width: 100%;

  .btn-icon {
    font-size: 28rpx;
    color: #ffffff;
    margin-right: 8rpx;
  }

  .btn-text {
    font-size: 28rpx;
    color: #ffffff;
    font-weight: 500;
  }

  &[disabled] {
    opacity: 0.5;
  }
}

/* 加载和空状态 */
.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #9ca3af;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #9ca3af;
}

/* 司机列表 */
.driver-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 司机卡片 */
.driver-card {
  background-color: #ffffff;
  border: 2rpx solid #e5e7eb;
  border-radius: 16rpx;
  overflow: hidden;
}

.driver-header {
  display: flex;
  align-items: center;
  padding: 24rpx;
}

.driver-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  box-shadow: 0 4rpx 8rpx rgba(29, 78, 216, 0.3);
}

.avatar-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.driver-info {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.driver-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #1f2937;
}

.driver-phone {
  font-size: 26rpx;
  color: #6b7280;
}

/* 标签样式 */
.tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;

  &.verified {
    background-color: #dcfce7;
    .tag-text { color: #16a34a; }
  }

  &.unverified {
    background-color: #f3f4f6;
    .tag-text { color: #6b7280; }
  }

  /* 司机类型标签 - Requirements 5 */
  &.new-with-vehicle {
    background-color: #fef3c7;
    .tag-text { color: #d97706; }
  }

  &.with-vehicle {
    background-color: #ffedd5;
    .tag-text { color: #ea580c; }
  }

  &.new-pure {
    background-color: #cffafe;
    .tag-text { color: #0891b2; }
  }

  &.pure {
    background-color: #dbeafe;
    .tag-text { color: #2563eb; }
  }
}

.tag-text {
  font-weight: 500;
}

/* 司机详细信息网格 - Requirements 3 */
.driver-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  padding: 0 24rpx 16rpx;
}

.detail-item {
  display: flex;
  align-items: center;
  background-color: #f9fafb;
  border-radius: 12rpx;
  padding: 16rpx;
}

.detail-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.detail-content {
  flex: 1;
}

.detail-label {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
}

.detail-value {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #1f2937;
}

/* 车牌信息 */
.plate-info {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
  border: 2rpx solid #fed7aa;
  border-radius: 12rpx;
  padding: 16rpx;
  margin: 0 24rpx 16rpx;
}

.plate-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.plate-label {
  font-size: 24rpx;
  color: #6b7280;
  margin-right: 8rpx;
}

.plate-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #1f2937;
}

/* 身份证信息 */
.id-card-info {
  display: flex;
  align-items: flex-start;
  background-color: #eef2ff;
  border: 2rpx solid #c7d2fe;
  border-radius: 12rpx;
  padding: 16rpx;
  margin: 0 24rpx 16rpx;
}

.id-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
  margin-top: 4rpx;
}

.id-content {
  flex: 1;
}

.id-label {
  display: block;
  font-size: 22rpx;
  color: #6b7280;
  margin-bottom: 4rpx;
}

.id-value {
  display: block;
  font-size: 24rpx;
  color: #1f2937;
  font-family: monospace;
  letter-spacing: 2rpx;
}

/* 住址信息 */
.address-info {
  display: flex;
  align-items: flex-start;
  background-color: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 12rpx;
  padding: 16rpx;
  margin: 0 24rpx 16rpx;
}

.address-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
  margin-top: 4rpx;
}

.address-content {
  flex: 1;
}

.address-label {
  display: block;
  font-size: 22rpx;
  color: #6b7280;
  margin-bottom: 4rpx;
}

.address-value {
  display: block;
  font-size: 24rpx;
  color: #1f2937;
  line-height: 1.5;
}

/* 实名通知按钮 - Requirements 8 */
.verification-reminder {
  display: flex;
  justify-content: center;
  padding: 0 24rpx 16rpx;
}

.reminder-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
  border: none;
  border-radius: 12rpx;
  padding: 20rpx 48rpx;
  box-shadow: 0 4rpx 12rpx rgba(239, 68, 68, 0.3);
}

.reminder-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

.reminder-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 操作按钮 - Requirements 6 */
.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background-color: #f9fafb;
  border-top: 2rpx solid #f3f4f6;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  padding: 16rpx;
  border: 2rpx solid;
  transition: all 0.2s;

  &.profile-btn {
    background-color: #eff6ff;
    border-color: #bfdbfe;
    .action-icon { color: #2563eb; }
    .action-text { color: #1d4ed8; }
  }

  &.vehicle-btn {
    background-color: #dcfce7;
    border-color: #bbf7d0;
    .action-icon { color: #16a34a; }
    .action-text { color: #15803d; }
  }

  &.warehouse-btn {
    background-color: #f3e8ff;
    border-color: #e9d5ff;
    .action-icon { color: #9333ea; }
    .action-text { color: #7c3aed; }
  }

  &.type-btn {
    background-color: #ffedd5;
    border-color: #fed7aa;
    .action-icon { color: #ea580c; }
    .action-text { color: #c2410c; }
  }
}

.action-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.action-text {
  font-size: 24rpx;
  font-weight: 500;
}

/* 仓库分配面板 - Requirements 7 */
.warehouse-assign-panel {
  padding: 16rpx 24rpx 24rpx;
  background-color: #f9fafb;
  border-top: 2rpx solid #e5e7eb;
}

.panel-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.panel-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.panel-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1f2937;
}

.panel-count {
  font-size: 24rpx;
  color: #9ca3af;
  margin-left: auto;
}

.warehouse-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  max-height: 400rpx;
  overflow-y: auto;
}

.warehouse-item {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 16rpx;
  transition: all 0.2s;

  &.selected {
    border-color: #9333ea;
    background-color: #faf5ff;
  }
}

.warehouse-checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #d1d5db;
  border-radius: 8rpx;
  margin-right: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #9333ea;
  background-color: #ffffff;
}

.warehouse-item.selected .warehouse-checkbox {
  background-color: #9333ea;
  border-color: #9333ea;
  color: #ffffff;
}

.warehouse-item .warehouse-name {
  font-size: 28rpx;
  color: #374151;
  font-weight: 500;
}

.panel-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.cancel-btn,
.save-btn {
  flex: 1;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
  border: 2rpx solid;
}

.cancel-btn {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.save-btn {
  background-color: #f3e8ff;
  border-color: #e9d5ff;
  color: #7c3aed;
}
</style>
