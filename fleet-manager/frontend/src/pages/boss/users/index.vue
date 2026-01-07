<template>
  <!--
    老板端 - 用户管理页面
    功能：管理所有用户（司机、车队长、老板）
    与主项目 v1.0-legacy 完全对齐
    
    功能特性：
    - 标签页切换（司机管理/管理员管理）
    - 仓库切换器（Swiper 滑动切换）
    - 添加用户表单
    - 用户详细信息展示
    - 操作按钮（个人信息、车辆管理、仓库分配、司机类型切换、权限配置）
    - 仓库分配面板
    - 实名认证标签
    - 司机类型标签
    - 拼音首字母搜索
    
    @module pages/boss/users
    @requirements 1.1-1.9
  -->
  <view class="users-page">
    <!-- 页面标题区 -->
    <view class="page-header">
      <text class="header-title">用户管理</text>
      <text class="header-subtitle">管理系统所有用户和角色权限</text>
    </view>

    <!-- 标签页切换 -->
    <view class="tab-switcher">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-item', { active: activeTab === tab.key }]"
        @click="handleTabChange(tab.key)"
      >
        <text class="tab-icon">{{ tab.icon }}</text>
        <text class="tab-label">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 搜索按钮 -->
    <view class="search-toggle" @click="toggleSearch">
      <text class="search-toggle-icon">{{ showSearch ? '✕' : '🔍' }}</text>
      <text class="search-toggle-text">
        {{ showSearch ? '收起搜索' : `搜索${activeTab === 'DRIVER' ? '司机' : '管理员'}` }}
      </text>
    </view>
    <!-- 搜索框（可展开） -->
    <view v-if="showSearch" class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          type="text"
          :placeholder="`输入${activeTab === 'DRIVER' ? '司机' : '管理员'}姓名、手机号（支持拼音首字母）`"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
      </view>
    </view>

    <!-- 仓库切换器（仅司机管理标签页显示，多仓库时显示，包含未分配选项） -->
    <view v-if="activeTab === 'DRIVER' && showWarehouseSwitcher" class="warehouse-switcher">
      <view class="warehouse-header">
        <text class="warehouse-label">🏭 选择仓库</text>
        <text class="warehouse-indicator">({{ currentWarehouseIndex + 1 }}/{{ warehouseOptions.length }})</text>
        <text class="warehouse-count">{{ filteredUsers.length }} 名司机</text>
      </view>
      <swiper
        class="warehouse-swiper"
        :current="currentWarehouseIndex"
        indicator-dots
        indicator-color="rgba(0, 0, 0, 0.2)"
        indicator-active-color="#1890ff"
        @change="handleWarehouseChange"
      >
        <swiper-item v-for="option in warehouseOptions" :key="option.id">
          <view class="warehouse-item">
            <text class="warehouse-icon">{{ option.id === -1 ? '📋' : '🏭' }}</text>
            <text class="warehouse-name">{{ option.name }}</text>
            <text class="warehouse-user-count">({{ getWarehouseUserCount(option.id) }}人)</text>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 添加用户按钮（仅司机管理标签页显示） -->
    <view v-if="activeTab === 'DRIVER'" class="add-user-btn" @click="toggleAddUser">
      <text class="add-user-icon">{{ showAddUser ? '✕' : '+' }}</text>
      <text class="add-user-text">{{ showAddUser ? '取消' : '添加用户' }}</text>
    </view>

    <!-- 添加用户表单 -->
    <view v-if="activeTab === 'DRIVER' && showAddUser" class="add-user-form">
      <!-- 手机号 -->
      <view class="form-item">
        <text class="form-label">手机号</text>
        <input
          v-model="newUserPhone"
          class="form-input"
          type="number"
          maxlength="11"
          placeholder="请输入11位手机号"
        />
      </view>

      <!-- 姓名 -->
      <view class="form-item">
        <text class="form-label">姓名</text>
        <input
          v-model="newUserName"
          class="form-input"
          type="text"
          :placeholder="`请输入${newUserRole === 'driver' ? '司机' : '管理员'}姓名`"
        />
      </view>

      <!-- 用户角色选择 -->
      <view class="form-item">
        <text class="form-label">用户角色</text>
        <view class="role-selector">
          <view
            :class="['role-option', { active: newUserRole === 'driver' }]"
            @click="newUserRole = 'driver'"
          >
            <text class="role-icon">🚗</text>
            <text class="role-name">司机</text>
          </view>
          <view
            :class="['role-option', { active: newUserRole === 'manager' }]"
            @click="newUserRole = 'manager'"
          >
            <text class="role-icon">👔</text>
            <text class="role-name">管理员</text>
          </view>
          <view
            :class="['role-option', { active: newUserRole === 'boss' }]"
            @click="newUserRole = 'boss'"
          >
            <text class="role-icon">⭐</text>
            <text class="role-name">老板</text>
          </view>
        </view>
      </view>

      <!-- 司机类型选择（仅司机角色） -->
      <view v-if="newUserRole === 'driver'" class="form-item">
        <text class="form-label">司机类型</text>
        <view class="driver-type-selector">
          <view
            :class="['type-option', { active: newDriverType === 'pure' }]"
            @click="newDriverType = 'pure'"
          >
            <text class="type-icon">👤</text>
            <text class="type-name">纯司机</text>
          </view>
          <view
            :class="['type-option', { active: newDriverType === 'with_vehicle' }]"
            @click="newDriverType = 'with_vehicle'"
          >
            <text class="type-icon">🚚</text>
            <text class="type-name">带车司机</text>
          </view>
        </view>
      </view>

      <!-- 仓库分配（非老板角色） -->
      <view v-if="newUserRole !== 'boss'" class="form-item">
        <text class="form-label">分配仓库 <text class="required">*</text></text>
        <view v-if="warehouses.length > 0" class="warehouse-checkboxes">
          <view
            v-for="warehouse in warehouses"
            :key="warehouse.id"
            :class="['warehouse-checkbox', { checked: newUserWarehouseIds.includes(warehouse.id) }]"
            @click="toggleNewUserWarehouse(warehouse.id)"
          >
            <view class="checkbox-icon">{{ newUserWarehouseIds.includes(warehouse.id) ? '✓' : '' }}</view>
            <text class="checkbox-label">{{ warehouse.name }}</text>
          </view>
        </view>
        <view v-else class="no-warehouse-tip">
          <text class="tip-text">暂无可分配的仓库</text>
        </view>
      </view>

      <!-- 密码提示 -->
      <view class="password-tip">
        <text class="tip-icon">ℹ️</text>
        <text class="tip-content">
          默认密码为 <text class="tip-bold">123456</text>，用户首次登录后请及时修改密码
        </text>
      </view>

      <!-- 确认添加按钮 -->
      <view class="submit-btn" :class="{ disabled: addingUser }" @click="handleAddUser">
        <text class="submit-icon">✓</text>
        <text class="submit-text">确认添加</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredUsers.length === 0" class="empty-container">
      <text class="empty-icon">👥</text>
      <text class="empty-text">暂无{{ activeTab === 'DRIVER' ? '司机' : '管理员' }}数据</text>
    </view>

    <!-- 用户列表 -->
    <view v-else class="user-list">
      <view
        v-for="user in filteredUsers"
        :key="user.id"
        class="user-card"
      >
        <!-- 用户头部信息 -->
        <view class="user-header">
          <view :class="['user-avatar', getRoleClass(user.role)]">
            <text class="avatar-text">{{ user.name?.charAt(0) || '?' }}</text>
          </view>
          <view class="user-info">
            <view class="user-name-row">
              <text class="user-name">{{ user.name || '未设置姓名' }}</text>
              <!-- 实名认证标签（仅司机显示） -->
              <view v-if="user.role === UserRole.DRIVER && isUserVerified(user)" class="verified-tag">
                <text class="verified-text">已实名</text>
              </view>
              <!-- 司机类型标签 -->
              <view v-if="user.role === UserRole.DRIVER" :class="['driver-type-tag', getDriverTypeClass(user)]">
                <text class="driver-type-text">{{ getDriverTypeText(user) }}</text>
              </view>
              <!-- 角色标签（非司机） -->
              <view v-else :class="['role-tag', getRoleClass(user.role)]">
                <text class="role-text">{{ getRoleName(user.role) }}</text>
              </view>
            </view>
            <text class="user-phone">{{ user.phone || '未设置手机号' }}</text>
          </view>
        </view>

        <!-- 管理员分配的仓库信息（非司机且非老板显示） -->
        <view v-if="user.role !== 'driver' && user.role !== 'boss'" class="admin-warehouse-info">
          <text class="warehouse-icon">🏭</text>
          <text class="warehouse-label">分配仓库：</text>
          <text class="warehouse-names">{{ getUserWarehouseNames(user.id) || '未分配' }}</text>
        </view>

        <!-- 司机详细信息 -->
        <view v-if="user.role === UserRole.DRIVER" class="user-detail">
          <view class="detail-grid">
            <!-- 车辆数量 -->
            <view class="detail-item">
              <text class="detail-icon">🚚</text>
              <view class="detail-content">
                <text class="detail-label">车辆</text>
                <text class="detail-value">{{ getUserDetail(user.id)?.vehicleCount || 0 }}辆</text>
              </view>
            </view>
            <!-- 入职时间 -->
            <view v-if="getUserDetail(user.id)?.joinDate" class="detail-item">
              <text class="detail-icon">📅</text>
              <view class="detail-content">
                <text class="detail-label">入职时间</text>
                <text class="detail-value">{{ getUserDetail(user.id)?.joinDate }}</text>
              </view>
            </view>
            <!-- 在职天数 -->
            <view v-if="getUserDetail(user.id)?.workDays != null" class="detail-item">
              <text class="detail-icon">⏱️</text>
              <view class="detail-content">
                <text class="detail-label">在职天数</text>
                <text class="detail-value">{{ getUserDetail(user.id)?.workDays }}天</text>
              </view>
            </view>
          </view>

          <!-- 车牌号 -->
          <view v-if="getUserDetail(user.id)?.plateNumbers?.length" class="plate-info">
            <text class="plate-icon">🚗</text>
            <text class="plate-label">车牌号：</text>
            <text class="plate-value">{{ getUserDetail(user.id)?.plateNumbers?.join('、') }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="action-buttons">
          <!-- 司机操作按钮 -->
          <template v-if="user.role === 'driver'">
            <view class="action-btn profile-btn" @click="handleViewProfile(user.id)">
              <text class="btn-icon">👤</text>
              <text class="btn-text">个人信息</text>
            </view>
            <view class="action-btn vehicle-btn" @click="handleViewVehicles(user.id)">
              <text class="btn-icon">🚗</text>
              <text class="btn-text">车辆管理</text>
            </view>
            <view class="action-btn warehouse-btn" @click="handleWarehouseAssign(user)">
              <text class="btn-icon">🏭</text>
              <text class="btn-text">仓库分配</text>
            </view>
            <view class="action-btn type-btn" @click="handleToggleDriverType(user)">
              <text class="btn-icon">🔄</text>
              <text class="btn-text">{{ user.driver_type === 'with_vehicle' ? '切换为纯司机' : '切换为带车司机' }}</text>
            </view>
          </template>
          <!-- 管理员操作按钮 -->
          <template v-else>
            <view v-if="user.role === 'manager' || user.role === 'peer_admin'" class="action-btn warehouse-btn" @click="handleWarehouseAssign(user)">
              <text class="btn-icon">🏭</text>
              <text class="btn-text">仓库分配</text>
            </view>
            <view :class="['action-btn', 'permission-btn', { 'full-width': user.role !== 'manager' && user.role !== 'peer_admin' }]" @click="handleConfigPermission(user)">
              <text class="btn-icon">🛡️</text>
              <text class="btn-text">权限</text>
            </view>
          </template>
        </view>

        <!-- 仓库分配面板 -->
        <view v-if="warehouseAssignExpanded === user.id" class="warehouse-assign-panel">
          <text class="panel-title">选择仓库</text>
          <view v-if="warehouses.length === 0" class="no-warehouse">
            <text class="no-warehouse-text">暂无可用仓库</text>
          </view>
          <view v-else class="warehouse-options">
            <view
              v-for="warehouse in warehouses"
              :key="warehouse.id"
              :class="['warehouse-option', { selected: selectedWarehouseIds.includes(warehouse.id) }]"
              @click="toggleWarehouseSelection(warehouse.id)"
            >
              <view class="option-checkbox">
                <text v-if="selectedWarehouseIds.includes(warehouse.id)" class="check-icon">✓</text>
              </view>
              <text class="option-name">{{ warehouse.name }}</text>
            </view>
          </view>
          <view class="panel-actions">
            <view class="panel-btn save-btn" @click="handleSaveWarehouseAssignment(user.id)">
              <text class="btn-icon">💾</text>
              <text class="btn-text">保存</text>
            </view>
            <view class="panel-btn cancel-btn" @click="cancelWarehouseAssign">
              <text class="btn-icon">✕</text>
              <text class="btn-text">取消</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 统计信息 -->
    <view v-if="!loading && users.length > 0" class="stats-footer">
      <text class="stats-text">
        共 {{ filteredUsers.length }} 名{{ activeTab === 'DRIVER' ? '司机' : '管理员' }}
      </text>
    </view>
  </view>
</template>


<script setup lang="ts">
/**
 * 老板端 - 用户管理页面
 * 功能：管理所有用户（司机、车队长、老板）
 * 与主项目 v1.0-legacy 完全对齐
 * 
 * @module pages/boss/users
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUsers, getWarehouses, createUser, updateUser, assignUserWarehouses, getVehicles, getUserWarehouses } from '@/api'
import type { User, Warehouse, Vehicle } from '@/api/types'
import { UserRole } from '@/api/types'
import { getRoleName, getValidVehicles } from '@/utils'
import { matchWithPinyin } from '@/utils/pinyin'
import {
  filterWarehousesWithDrivers,
  shouldShowWarehouseSwitcher,
  getWarehouseDriverCount as getWarehouseDriverCountUtil,
  getUnassignedUserCount as getUnassignedUserCountUtil,
} from '@/utils/warehouse'
import { useWarehouseDataCache } from '@/composables/useWarehouseDataCache'
import { sseService } from '@/utils/sse'
import type { AssignmentUpdateEvent } from '@/types/sse-events'

// ==================== 类型定义 ====================

/** 标签页类型 */
type TabType = 'DRIVER' | 'MANAGER'

/** 司机类型 */
type DriverType = 'pure' | 'with_vehicle'

/** 用户详细信息（仅存储需要额外计算的数据） */
interface UserDetailInfo {
  /** 车辆数量 */
  vehicleCount: number
  /** 入职时间 */
  joinDate?: string | null
  /** 在职天数 */
  workDays?: number | null
  /** 车牌号列表 */
  plateNumbers?: string[]
}

/**
 * 用户管理页面数据类型
 * 包含用户列表、用户详情和仓库分配信息
 */
interface UserManagementData {
  /** 用户列表 */
  users: User[]
  /** 用户详细信息映射 */
  userDetails: Map<number, UserDetailInfo>
  /** 用户仓库ID映射 */
  userWarehouseIdsMap: Map<number, number[]>
}

// ==================== 状态 ====================

/** 加载状态（由 composable 管理） */
// const loading = ref(false) // 已移除，使用 composable 的 isLoading

/** 用户列表（由 composable 管理） */
// const users = ref<User[]>([]) // 已移除，使用 composable 的 currentData

/** 仓库列表 */
const warehouses = ref<Warehouse[]>([])

/** 用户详细信息映射（由 composable 管理） */
// const userDetails = ref<Map<number, UserDetailInfo>>(new Map()) // 已移除，使用 composable 的 currentData

/** 用户仓库ID映射（由 composable 管理） */
// const userWarehouseIdsMap = ref<Map<number, number[]>>(new Map()) // 已移除，使用 composable 的 currentData

// ==================== 筛选状态 ====================

/** 当前标签页 */
const activeTab = ref<TabType>('DRIVER')

/** 当前仓库索引 */
const currentWarehouseIndex = ref(0)

/** 搜索关键词 */
const searchKeyword = ref('')

/** 是否显示搜索框 */
const showSearch = ref(false)

// ==================== 添加用户状态 ====================

/** 是否显示添加用户表单 */
const showAddUser = ref(false)

/** 新用户手机号 */
const newUserPhone = ref('')

/** 新用户姓名 */
const newUserName = ref('')

/** 新用户角色 */
const newUserRole = ref<'driver' | 'manager' | 'boss'>('driver')

/** 新司机类型 */
const newDriverType = ref<DriverType>('pure')

/** 新用户仓库ID列表 */
const newUserWarehouseIds = ref<number[]>([])

/** 是否正在添加用户 */
const addingUser = ref(false)

// ==================== 仓库分配状态 ====================

/** 展开仓库分配的用户ID */
const warehouseAssignExpanded = ref<number | null>(null)

/** 选中的仓库ID列表 */
const selectedWarehouseIds = ref<number[]>([])

// ==================== 常量 ====================

/** 标签页配置 */
const tabs = [
  { key: 'DRIVER' as const, label: '司机管理', icon: '🚗' },
  { key: 'MANAGER' as const, label: '管理员管理', icon: '👔' },
]

// ==================== 数据加载函数 ====================

/**
 * 加载用户管理数据
 * 包括用户列表、用户详情和仓库分配信息
 * @param warehouseId - 仓库ID（用于司机管理标签页的筛选）
 * @returns 用户管理数据
 */
async function loadUserManagementData(warehouseId: number): Promise<UserManagementData> {
  // 加载用户列表
  const usersData = await getUsers()
  
  // 加载用户详细信息
  const detailsMap = new Map<number, UserDetailInfo>()
  const warehouseIdsMap = new Map<number, number[]>()

  // 获取所有车辆信息
  const allVehicles = await getVehicles()

  // 并行获取所有用户的仓库分配
  const warehousePromises = usersData.map(async (user) => {
    try {
      const userWarehouses = await getUserWarehouses(user.id)
      return { userId: user.id, warehouseIds: userWarehouses.map(w => w.id) }
    } catch (error) {
      return { userId: user.id, warehouseIds: [] }
    }
  })
  
  const warehouseResults = await Promise.all(warehousePromises)
  warehouseResults.forEach(({ userId, warehouseIds }) => {
    warehouseIdsMap.set(userId, warehouseIds)
  })

  // 构建用户详情
  for (const user of usersData) {
    const validVehicles = getValidVehicles(allVehicles, user.id)
    
    const detail: UserDetailInfo = {
      vehicleCount: validVehicles.length,
      plateNumbers: validVehicles.map(v => v.license_plate),
      joinDate: user.created_at ? user.created_at.split('T')[0] : null,
      workDays: user.created_at ? calculateWorkDays(user.created_at) : null,
    }
    
    detailsMap.set(user.id, detail)
  }

  return {
    users: usersData,
    userDetails: detailsMap,
    userWarehouseIdsMap: warehouseIdsMap,
  }
}

/**
 * 计算在职天数
 * @param createdAt - 创建时间
 * @returns 在职天数
 */
function calculateWorkDays(createdAt: string): number {
  const startDate = new Date(createdAt)
  const today = new Date()
  const diffTime = today.getTime() - startDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// ==================== 仓库数据缓存 Composable ====================

/**
 * 使用仓库数据缓存 composable
 * 实现无感切换和数据预加载
 */
const {
  currentData,
  isLoading: loading,
  switchWarehouse,
  refreshCurrent,
  refreshAll,
} = useWarehouseDataCache<UserManagementData>({
  loadDataFn: loadUserManagementData,
  warehouses,  // 直接使用 warehouses ref，避免循环依赖
  currentIndex: currentWarehouseIndex,
  enablePreload: true,
})

// ==================== 从缓存数据中提取状态 ====================

/**
 * 用户列表（从缓存数据中提取）
 */
const users = computed<User[]>(() => currentData.value?.users || [])

/**
 * 用户详细信息映射（从缓存数据中提取）
 */
const userDetails = computed<Map<number, UserDetailInfo>>(() => currentData.value?.userDetails || new Map<number, UserDetailInfo>())

/**
 * 用户仓库ID映射（从缓存数据中提取）
 */
const userWarehouseIdsMap = computed<Map<number, number[]>>(() => currentData.value?.userWarehouseIdsMap || new Map<number, number[]>())

// ==================== 计算属性 ====================

/**
 * 当前角色过滤器
 * 根据当前标签页返回对应的角色
 */
const currentRoleFilter = computed(() => {
  return activeTab.value === 'DRIVER' ? UserRole.DRIVER : undefined
})

/**
 * 有司机的仓库列表
 * 使用统一的工具函数过滤
 */
const warehousesWithDrivers = computed<Warehouse[]>(() => {
  return filterWarehousesWithDrivers({
    warehouses: warehouses.value,
    userWarehouseIdsMap: userWarehouseIdsMap.value,
    users: users.value,
    roleFilter: currentRoleFilter.value,
  })
})

/**
 * 仓库选项列表（包含"未分配"选项）
 * 只显示有司机的仓库，并在末尾添加"未分配"选项
 */
const warehouseOptions = computed(() => {
  if (warehouses.value.length === 0) return []
  
  // 使用过滤后的仓库列表
  const validWarehouses = warehousesWithDrivers.value
  
  // 计算未分配仓库的用户数量
  const unassignedCount = getUnassignedUserCount()
  
  // 构建选项列表
  const options = [...validWarehouses]
  
  // 如果有未分配的用户，添加"未分配"选项
  if (unassignedCount > 0) {
    options.push({
      id: -1,
      name: '未分配',
      address: null,
      is_active: true,
      created_at: '',
      warehouse_type: 'piece' as any,
      preset_unit: '件',
    })
  }
  
  return options
})

/**
 * 是否显示仓库切换器
 * 使用统一的工具函数判断
 */
const showWarehouseSwitcher = computed(() => {
  return shouldShowWarehouseSwitcher(warehouseOptions.value)
})

/**
 * 获取未分配仓库的用户数量
 * 使用统一的工具函数
 */
function getUnassignedUserCount(): number {
  return getUnassignedUserCountUtil({
    userWarehouseIdsMap: userWarehouseIdsMap.value,
    users: users.value,
    roleFilter: currentRoleFilter.value,
  })
}

/**
 * 筛选后的用户列表
 * 根据标签页、仓库、搜索关键词进行筛选
 */
const filteredUsers = computed(() => {
  let result = users.value

  // 1. 按标签页筛选角色
  if (activeTab.value === 'DRIVER') {
    result = result.filter(u => u.role === UserRole.DRIVER)
  } else {
    // 管理员标签页只显示车队长和调度，不显示老板（老板是当前登录用户）
    result = result.filter(u => 
      u.role === UserRole.MANAGER || 
      u.role === UserRole.PEER_ADMIN
    )
  }

  // 2. 按仓库筛选（仅司机管理标签页，且显示切换器时）
  // 管理员标签页不按仓库筛选，因为车队长和调度需要全部显示
  if (activeTab.value === 'DRIVER' && showWarehouseSwitcher.value && warehouseOptions.value[currentWarehouseIndex.value]) {
    const currentOption = warehouseOptions.value[currentWarehouseIndex.value]
    const currentWarehouseId = currentOption.id
    
    result = result.filter(u => {
      // 老板和调度不受仓库筛选限制
      if (u.role === UserRole.BOSS || u.role === UserRole.PEER_ADMIN) {
        return true
      }
      
      const userWarehouseIds = userWarehouseIdsMap.value.get(u.id) || []
      
      // 如果选择的是"未分配"（id === -1），只显示未分配仓库的用户
      if (currentWarehouseId === -1) {
        return userWarehouseIds.length === 0
      }
      
      // 否则只显示分配到该仓库的用户
      return userWarehouseIds.includes(currentWarehouseId)
    })
  }

  // 3. 按关键词搜索（支持拼音首字母）
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim()
    result = result.filter(u => {
      const name = u.name || ''
      const phone = u.phone || ''
      // 姓名拼音匹配
      if (matchWithPinyin(name, keyword)) return true
      // 手机号匹配
      if (phone.includes(keyword)) return true
      return false
    })
  }

  return result
})

// ==================== 生命周期 ====================

onMounted(async () => {
  // 加载仓库列表
  try {
    const warehousesData = await getWarehouses({ is_active: true })
    warehouses.value = warehousesData
  } catch (error) {
    console.error('加载仓库列表失败:', error)
    uni.showToast({ title: '加载仓库失败', icon: 'none' })
  }
  
  // composable 会自动加载当前仓库的数据
  
  // 监听仓库分配更新事件
  // Requirements: 3.3 - 仓库分配变更时重新加载数据
  sseService.setCallbacks({
    onAssignmentUpdate: (data: AssignmentUpdateEvent) => {
      console.log('[用户管理页面] 收到仓库分配更新事件，重新加载数据')
      // 使用 composable 的 refreshAll 方法刷新所有仓库数据
      refreshAll()
    },
  })
})

onShow(() => {
  // 每次显示页面时刷新数据
  refreshAll()
})

onUnmounted(() => {
  // 清理 SSE 回调
  sseService.setCallbacks({})
})

// ==================== 数据加载方法（已移除，由 composable 管理） ====================

/**
 * 加载所有数据（已废弃，由 composable 管理）
 * 保留此注释以便理解迁移过程
 */
// async function loadData(): Promise<void> { ... }

/**
 * 加载用户详细信息（已废弃，已整合到 loadUserManagementData）
 * 保留此注释以便理解迁移过程
 */
// async function loadUserDetails(): Promise<void> { ... }

// ==================== 筛选方法 ====================

/**
 * 切换标签页
 * @param tab - 标签页类型
 */
function handleTabChange(tab: TabType): void {
  activeTab.value = tab
  // 收起所有展开的面板
  warehouseAssignExpanded.value = null
  selectedWarehouseIds.value = []
}

/**
 * 切换搜索框显示
 */
function toggleSearch(): void {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchKeyword.value = ''
  }
}

/**
 * 清除搜索
 */
function clearSearch(): void {
  searchKeyword.value = ''
}

/**
 * 处理仓库切换
 * 使用 composable 的 switchWarehouse 方法实现无感切换
 * @param e - 事件对象
 */
async function handleWarehouseChange(e: { detail: { current: number } }): Promise<void> {
  await switchWarehouse(e.detail.current)
}

/**
 * 获取仓库的用户数量
 * 使用统一的工具函数
 * @param warehouseId - 仓库ID（-1 表示未分配）
 * @returns 用户数量
 */
function getWarehouseUserCount(warehouseId: number): number {
  // 如果是"未分配"选项
  if (warehouseId === -1) {
    return getUnassignedUserCount()
  }
  
  return getWarehouseDriverCountUtil(warehouseId, {
    userWarehouseIdsMap: userWarehouseIdsMap.value,
    users: users.value,
    roleFilter: currentRoleFilter.value,
  })
}

// ==================== 用户信息方法 ====================

/**
 * 获取用户详细信息
 * @param userId - 用户ID
 * @returns 用户详细信息
 */
function getUserDetail(userId: number): UserDetailInfo | undefined {
  return userDetails.value.get(userId)
}

/**
 * 获取用户分配的仓库名称
 * @param userId - 用户ID
 * @returns 仓库名称，多个用顿号分隔
 */
function getUserWarehouseNames(userId: number): string {
  const warehouseIds = userWarehouseIdsMap.value.get(userId) || []
  if (warehouseIds.length === 0) return ''
  
  const names = warehouseIds
    .map(id => warehouses.value.find(w => w.id === id)?.name)
    .filter(Boolean)
  
  return names.join('、')
}

/**
 * 获取角色样式类
 * @param role - 用户角色
 * @returns 样式类名
 */
function getRoleClass(role: string): string {
  switch (role) {
    case UserRole.BOSS:
      return 'boss'
    case UserRole.MANAGER:
      return 'manager'
    case UserRole.PEER_ADMIN:
      return 'peer-admin'
    case UserRole.DRIVER:
    default:
      return 'driver'
  }
}

/**
 * 判断用户是否已实名
 * 直接使用后端返回的 is_verified 字段
 * @param user - 用户信息
 * @returns 是否已实名
 */
function isUserVerified(user: User): boolean {
  return user.is_verified === true
}

/**
 * 获取司机类型文本
 * @param user - 用户信息
 * @returns 司机类型文本
 */
function getDriverTypeText(user: User): string {
  if (user.role !== UserRole.DRIVER) return ''
  
  const detail = getUserDetail(user.id)
  // 判断是否为新司机（在职天数 <= 7）
  const isNewDriver = detail?.workDays != null && detail.workDays <= 7
  const isWithVehicle = user.driver_type === 'with_vehicle'
  
  if (isNewDriver) {
    return isWithVehicle ? '新带车司机' : '新纯司机'
  }
  return isWithVehicle ? '带车司机' : '纯司机'
}

/**
 * 获取司机类型样式类
 * @param user - 用户信息
 * @returns 样式类名
 */
function getDriverTypeClass(user: User): string {
  const typeText = getDriverTypeText(user)
  switch (typeText) {
    case '新带车司机':
      return 'new-with-vehicle'
    case '带车司机':
      return 'with-vehicle'
    case '新纯司机':
      return 'new-pure'
    case '纯司机':
    default:
      return 'pure'
  }
}

// ==================== 添加用户方法 ====================

/**
 * 切换添加用户表单显示
 */
function toggleAddUser(): void {
  showAddUser.value = !showAddUser.value
  if (!showAddUser.value) {
    // 重置表单
    resetAddUserForm()
  }
}

/**
 * 重置添加用户表单
 */
function resetAddUserForm(): void {
  newUserPhone.value = ''
  newUserName.value = ''
  newUserRole.value = 'driver'
  newDriverType.value = 'pure'
  newUserWarehouseIds.value = []
}

/**
 * 切换新用户仓库选择
 * @param warehouseId - 仓库ID
 */
function toggleNewUserWarehouse(warehouseId: number): void {
  const index = newUserWarehouseIds.value.indexOf(warehouseId)
  if (index === -1) {
    newUserWarehouseIds.value.push(warehouseId)
  } else {
    newUserWarehouseIds.value.splice(index, 1)
  }
}

/**
 * 处理添加用户
 */
async function handleAddUser(): Promise<void> {
  // 验证手机号
  if (!newUserPhone.value.trim()) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  
  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(newUserPhone.value.trim())) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  
  // 验证姓名
  if (!newUserName.value.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  
  // 验证仓库选择（非老板角色）
  if (newUserRole.value !== 'boss' && newUserWarehouseIds.value.length === 0) {
    const roleText = newUserRole.value === 'driver' ? '司机' : '管理员'
    uni.showToast({ title: `请为${roleText}至少选择一个仓库`, icon: 'none' })
    return
  }

  addingUser.value = true
  uni.showLoading({ title: '添加中...' })

  try {
    // 创建用户
    const newUser = await createUser({
      username: `${newUserPhone.value.trim()}@fleet.com`,
      password: '123456',
      name: newUserName.value.trim(),
      phone: newUserPhone.value.trim(),
      role: newUserRole.value as UserRole,
    })

    // 分配仓库（非老板角色）
    if (newUserRole.value !== 'boss' && newUserWarehouseIds.value.length > 0) {
      await assignUserWarehouses(newUser.id, newUserWarehouseIds.value)
    }

    uni.hideLoading()
    addingUser.value = false

    // 显示成功信息
    const loginAccount = `${newUserPhone.value.trim()}@fleet.com`
    const roleText = newUserRole.value === 'driver' ? '司机' : newUserRole.value === 'manager' ? '管理员' : '老板'
    
    let content = `姓名：${newUserName.value.trim()}\n手机号码：${newUserPhone.value.trim()}\n用户角色：${roleText}\n`
    
    if (newUserRole.value === 'driver') {
      const driverTypeText = newDriverType.value === 'with_vehicle' ? '带车司机' : '纯司机'
      content += `司机类型：${driverTypeText}\n`
    }
    
    if (newUserRole.value !== 'boss') {
      const warehouseNames = warehouses.value
        .filter(w => newUserWarehouseIds.value.includes(w.id))
        .map(w => w.name)
        .join('、')
      content += `分配仓库：${warehouseNames}\n`
    }
    
    content += `登录账号：${loginAccount}\n默认密码：123456`

    uni.showModal({
      title: '用户创建成功',
      content,
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        resetAddUserForm()
        showAddUser.value = false
        // 使用 composable 的 refreshAll 方法刷新数据
        refreshAll()
      },
    })
  } catch (error: any) {
    uni.hideLoading()
    addingUser.value = false
    console.error('添加用户失败:', error)
    
    const errorMsg = error?.message || String(error)
    if (errorMsg.includes('已被注册') || errorMsg.includes('already registered')) {
      uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 })
    } else {
      uni.showToast({ title: errorMsg || '添加失败，请重试', icon: 'none' })
    }
  }
}

// ==================== 操作方法 ====================

/**
 * 查看用户个人信息
 * @param userId - 用户ID
 */
function handleViewProfile(userId: number): void {
  uni.navigateTo({
    url: `/pages/manager/drivers/detail?id=${userId}`,
  })
}

/**
 * 查看用户车辆管理
 * @param userId - 用户ID
 */
function handleViewVehicles(userId: number): void {
  uni.navigateTo({
    url: `/pages/driver/vehicle/list?driverId=${userId}`,
  })
}

/**
 * 配置权限
 * @param user - 用户信息
 */
function handleConfigPermission(user: User): void {
  uni.navigateTo({
    url: `/pages/boss/permissions/index?userId=${user.id}&userName=${encodeURIComponent(user.name || '')}&userRole=${user.role}`,
  })
}

/**
 * 切换司机类型
 * @param user - 用户信息
 */
async function handleToggleDriverType(user: User): Promise<void> {
  if (user.role !== UserRole.DRIVER) {
    uni.showToast({ title: '只能切换司机类型', icon: 'none' })
    return
  }

  const currentType = user.driver_type || 'pure'
  const newType = currentType === 'with_vehicle' ? 'pure' : 'with_vehicle'
  const currentTypeText = currentType === 'with_vehicle' ? '带车司机' : '纯司机'
  const newTypeText = newType === 'with_vehicle' ? '带车司机' : '纯司机'

  // 二次确认
  const result = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认切换司机类型',
      content: `确定要将 ${user.name || '该司机'} 从【${currentTypeText}】切换为【${newTypeText}】吗？`,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => resolve(res.confirm),
    })
  })

  if (!result) return

  uni.showLoading({ title: '切换中...' })

  try {
    await updateUser(user.id, { driver_type: newType })
    uni.hideLoading()
    uni.showToast({ title: `已切换为${newTypeText}`, icon: 'success' })
    // 使用 composable 的 refreshAll 方法刷新数据
    await refreshAll()
  } catch (error) {
    uni.hideLoading()
    console.error('切换司机类型失败:', error)
    uni.showToast({ title: '切换失败', icon: 'none' })
  }
}

// ==================== 仓库分配方法 ====================

/**
 * 处理仓库分配按钮点击
 * @param user - 用户信息
 */
function handleWarehouseAssign(user: User): void {
  if (warehouseAssignExpanded.value === user.id) {
    // 收起
    warehouseAssignExpanded.value = null
    selectedWarehouseIds.value = []
  } else {
    // 展开
    warehouseAssignExpanded.value = user.id
    // 加载用户已分配的仓库
    const userWarehouseIds = userWarehouseIdsMap.value.get(user.id) || []
    selectedWarehouseIds.value = [...userWarehouseIds]
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
 * @param userId - 用户ID
 */
async function handleSaveWarehouseAssignment(userId: number): Promise<void> {
  const user = users.value.find(u => u.id === userId)
  const userName = user?.name || '该用户'

  // 获取选中的仓库名称
  const selectedWarehouseNames = warehouses.value
    .filter(w => selectedWarehouseIds.value.includes(w.id))
    .map(w => w.name)
    .join('、')

  const warehouseText = selectedWarehouseIds.value.length > 0 ? selectedWarehouseNames : '无'

  // 二次确认
  const result = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认保存仓库分配',
      content: `确定要为 ${userName} 分配以下仓库吗？\n\n${warehouseText}\n\n${selectedWarehouseIds.value.length === 0 ? '（将清除该用户的所有仓库分配）' : ''}`,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => resolve(res.confirm),
    })
  })

  if (!result) return

  uni.showLoading({ title: '保存中...' })

  try {
    await assignUserWarehouses(userId, selectedWarehouseIds.value)
    uni.hideLoading()
    uni.showToast({ title: '保存成功', icon: 'success' })
    warehouseAssignExpanded.value = null
    selectedWarehouseIds.value = []
    // 使用 composable 的 refreshAll 方法刷新数据
    await refreshAll()
  } catch (error) {
    uni.hideLoading()
    console.error('保存仓库分配失败:', error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
</script>


<style lang="scss" scoped>
/**
 * 老板端用户管理页面样式
 * 与主项目 v1.0-legacy 完全对齐
 */

/* 页面容器 */
.users-page {
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

/* 标签页切换 */
.tab-switcher {
  display: flex;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 12rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
  border-radius: 12rpx;
  transition: all 0.3s;
  
  &.active {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3);
    
    .tab-icon, .tab-label {
      color: #ffffff;
    }
  }
}

.tab-icon {
  font-size: 36rpx;
  margin-bottom: 8rpx;
  color: #6b7280;
}

.tab-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #6b7280;
}

/* 搜索按钮 */
.search-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  border: 2rpx solid #e5e7eb;
}

.search-toggle-icon {
  font-size: 28rpx;
  color: #3b82f6;
  margin-right: 12rpx;
}

.search-toggle-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #3b82f6;
}

/* 搜索栏 */
.search-bar {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 24rpx;
  height: 72rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}

.clear-icon {
  font-size: 28rpx;
  color: #999999;
  padding: 8rpx;
}

/* 仓库切换器 */
.warehouse-switcher {
  margin-bottom: 24rpx;
}

.warehouse-header {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.warehouse-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #1e3a8a;
}

.warehouse-indicator {
  font-size: 24rpx;
  color: #9ca3af;
  margin-left: 12rpx;
}

.warehouse-count {
  font-size: 24rpx;
  color: #9ca3af;
  margin-left: auto;
}

.warehouse-swiper {
  height: 120rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.warehouse-item {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  padding: 0 24rpx;
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

.warehouse-user-count {
  font-size: 24rpx;
  color: #6b7280;
  margin-left: 12rpx;
}

/* 添加用户按钮 */
.add-user-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3);
}

.add-user-icon {
  font-size: 28rpx;
  color: #ffffff;
  margin-right: 8rpx;
}

.add-user-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 添加用户表单 */
.add-user-form {
  background-color: #eff6ff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid #bfdbfe;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #374151;
  margin-bottom: 12rpx;
}

.required {
  color: #ef4444;
}

.form-input {
  width: 100%;
  height: 80rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  border: 2rpx solid #d1d5db;
  box-sizing: border-box;
}

/* 角色选择器 */
.role-selector, .driver-type-selector {
  display: flex;
  gap: 16rpx;
}

.role-option, .type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  border: 2rpx solid #d1d5db;
  transition: all 0.3s;
  
  &.active {
    background-color: #2563eb;
    border-color: #2563eb;
    
    .role-icon, .type-icon, .role-name, .type-name {
      color: #ffffff;
    }
  }
}

.role-icon, .type-icon {
  font-size: 32rpx;
  margin-bottom: 8rpx;
  color: #6b7280;
}

.role-name, .type-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #374151;
}

/* 仓库复选框 */
.warehouse-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.warehouse-checkbox {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  border: 2rpx solid #d1d5db;
  transition: all 0.3s;
  
  &.checked {
    background-color: #eff6ff;
    border-color: #2563eb;
  }
}

.checkbox-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  font-size: 24rpx;
  color: #2563eb;
  
  .warehouse-checkbox.checked & {
    background-color: #2563eb;
    border-color: #2563eb;
    color: #ffffff;
  }
}

.checkbox-label {
  font-size: 28rpx;
  color: #374151;
}

.no-warehouse-tip {
  background-color: #fef3c7;
  border: 2rpx solid #fcd34d;
  border-radius: 12rpx;
  padding: 20rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #92400e;
}

/* 密码提示 */
.password-tip {
  display: flex;
  align-items: flex-start;
  background-color: #fef3c7;
  border: 2rpx solid #fcd34d;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.tip-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.tip-content {
  flex: 1;
  font-size: 24rpx;
  color: #92400e;
  line-height: 1.5;
}

.tip-bold {
  font-weight: bold;
}

/* 提交按钮 */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2563eb;
  border-radius: 12rpx;
  padding: 20rpx;
  
  &.disabled {
    opacity: 0.5;
  }
}

.submit-icon {
  font-size: 28rpx;
  color: #ffffff;
  margin-right: 8rpx;
}

.submit-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
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
}

/* 用户列表 */
.user-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 用户卡片 */
.user-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  border: 2rpx solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 用户头部 */
.user-header {
  display: flex;
  align-items: center;
  padding: 24rpx;
}

.user-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  
  &.driver {
    background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  }
  
  &.manager {
    background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  }
  
  &.peer-admin {
    background: linear-gradient(135deg, #a855f7 0%, #c084fc 100%);
  }
  
  &.boss {
    background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  }
}

.avatar-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.user-info {
  flex: 1;
}

.user-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.user-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #1f2937;
}

/* 实名认证标签 */
.verified-tag {
  background-color: #dcfce7;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.verified-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #16a34a;
}

/* 司机类型标签 */
.driver-type-tag {
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  
  &.new-with-vehicle {
    background-color: #fef3c7;
  }
  
  &.with-vehicle {
    background-color: #ffedd5;
  }
  
  &.new-pure {
    background-color: #cffafe;
  }
  
  &.pure {
    background-color: #dbeafe;
  }
}

.driver-type-text {
  font-size: 22rpx;
  font-weight: 500;
  
  .new-with-vehicle & {
    color: #b45309;
  }
  
  .with-vehicle & {
    color: #c2410c;
  }
  
  .new-pure & {
    color: #0891b2;
  }
  
  .pure & {
    color: #2563eb;
  }
}

/* 角色标签 */
.role-tag {
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  
  &.manager {
    background-color: #dcfce7;
  }
  
  &.peer-admin {
    background-color: #f3e8ff;
  }
  
  &.boss {
    background-color: #fef3c7;
  }
}

.role-text {
  font-size: 22rpx;
  font-weight: 500;
  
  .manager & {
    color: #16a34a;
  }
  
  .peer-admin & {
    color: #9333ea;
  }
  
  .boss & {
    color: #d97706;
  }
}

.user-phone {
  font-size: 26rpx;
  color: #6b7280;
}

/* 管理员分配的仓库信息 */
.admin-warehouse-info {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background-color: #f0fdf4;
  border-top: 1rpx solid #dcfce7;
  
  .warehouse-icon {
    font-size: 28rpx;
    margin-right: 8rpx;
  }
  
  .warehouse-label {
    font-size: 24rpx;
    color: #6b7280;
    margin-right: 8rpx;
  }
  
  .warehouse-names {
    font-size: 26rpx;
    font-weight: 500;
    color: #16a34a;
    flex: 1;
  }
}

/* 用户详细信息 */
.user-detail {
  padding: 0 24rpx 20rpx;
  border-top: 1rpx solid #f3f4f6;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-top: 20rpx;
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
  color: #6b7280;
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
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border-radius: 12rpx;
  padding: 16rpx;
  margin-top: 16rpx;
  border: 1rpx solid #fed7aa;
}

.plate-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.plate-label {
  font-size: 24rpx;
  color: #6b7280;
}

.plate-value {
  font-size: 26rpx;
  font-weight: bold;
  color: #1f2937;
}

/* 身份证信息 */
.id-card-info {
  display: flex;
  align-items: flex-start;
  background-color: #eef2ff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-top: 16rpx;
  border: 1rpx solid #c7d2fe;
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
  border-radius: 12rpx;
  padding: 16rpx;
  margin-top: 16rpx;
  border: 1rpx solid #bfdbfe;
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

/* 操作按钮 */
.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  padding: 16rpx;
  background-color: #f9fafb;
  border-top: 1rpx solid #f3f4f6;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  border-radius: 12rpx;
  border: 1rpx solid;
  
  &.profile-btn {
    background-color: #eff6ff;
    border-color: #bfdbfe;
  }
  
  &.vehicle-btn {
    background-color: #f0fdf4;
    border-color: #bbf7d0;
  }
  
  &.warehouse-btn {
    background-color: #fff7ed;
    border-color: #fed7aa;
  }
  
  &.type-btn {
    background-color: #faf5ff;
    border-color: #e9d5ff;
  }
  
  &.permission-btn {
    background-color: #fff1f2;
    border-color: #fecdd3;
    
    &.full-width {
      grid-column: span 2;
    }
  }
}

.btn-icon {
  font-size: 24rpx;
  margin-right: 8rpx;
}

.btn-text {
  font-size: 24rpx;
  font-weight: 500;
  
  .profile-btn & {
    color: #2563eb;
  }
  
  .vehicle-btn & {
    color: #16a34a;
  }
  
  .warehouse-btn & {
    color: #ea580c;
  }
  
  .type-btn & {
    color: #9333ea;
  }
  
  .permission-btn & {
    color: #e11d48;
  }
}

/* 仓库分配面板 */
.warehouse-assign-panel {
  padding: 24rpx;
  background-color: #f9fafb;
  border-top: 1rpx solid #e5e7eb;
}

.panel-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
  margin-bottom: 16rpx;
}

.no-warehouse {
  text-align: center;
  padding: 32rpx;
}

.no-warehouse-text {
  font-size: 26rpx;
  color: #6b7280;
}

.warehouse-options {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.warehouse-option {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  border: 2rpx solid #d1d5db;
  transition: all 0.3s;
  
  &.selected {
    background-color: #eff6ff;
    border-color: #3b82f6;
  }
}

.option-checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  transition: all 0.3s;
  
  .warehouse-option.selected & {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }
}

.check-icon {
  font-size: 24rpx;
  color: #ffffff;
}

.option-name {
  font-size: 28rpx;
  color: #374151;
  
  .warehouse-option.selected & {
    color: #1e3a8a;
    font-weight: 500;
  }
}

.panel-actions {
  display: flex;
  gap: 16rpx;
}

.panel-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  border-radius: 12rpx;
  
  &.save-btn {
    background-color: #3b82f6;
  }
  
  &.cancel-btn {
    background-color: #9ca3af;
  }
  
  .btn-icon {
    color: #ffffff;
  }
  
  .btn-text {
    color: #ffffff;
  }
}

/* 统计信息 */
.stats-footer {
  padding: 24rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  margin-top: 24rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.stats-text {
  font-size: 24rpx;
  color: #6b7280;
}
</style>
