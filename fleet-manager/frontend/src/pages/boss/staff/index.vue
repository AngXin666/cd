<template>
  <!-- 
    员工管理页面
    显示所有员工列表，支持搜索筛选和详情查看
    仅老板角色可访问
    @requirements 5.1, 5.2, 5.3
  -->
  <view class="staff-page">
    <!-- 顶部导航栏 -->
    <TopNavBar title="员工管理" :show-back="true" />
    
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          type="text"
          placeholder="搜索姓名或手机号"
          @input="handleSearch"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
      </view>
    </view>

    <!-- 角色筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in filterTabs"
        :key="tab.value"
        :class="['filter-tab', { active: activeFilter === tab.value }]"
        @click="handleFilterChange(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <text v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && !refreshing" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredStaffList.length === 0" class="empty-container">
      <text class="empty-icon">👥</text>
      <text class="empty-text">{{ searchKeyword ? '未找到匹配的员工' : '暂无员工' }}</text>
    </view>

    <!-- 员工列表 -->
    <scroll-view
      v-else
      class="staff-list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="handleRefresh"
      @scrolltolower="handleLoadMore"
    >
      <view
        v-for="staff in filteredStaffList"
        :key="staff.id"
        class="staff-card"
        @click="viewStaffDetail(staff.id)"
      >
        <!-- 员工头像和基本信息 -->
        <view class="staff-info">
          <view :class="['staff-avatar', getRoleClass(staff.role)]">
            <text class="avatar-text">{{ staff.name.charAt(0) }}</text>
          </view>
          <view class="staff-detail">
            <view class="staff-name-row">
              <text class="staff-name">{{ staff.name }}</text>
              <view :class="['role-tag', getRoleClass(staff.role)]">
                <text class="role-text">{{ getRoleName(staff.role) }}</text>
              </view>
              <view v-if="!staff.is_active" class="status-tag inactive">
                <text class="status-text">已禁用</text>
              </view>
            </view>
            <text class="staff-phone">{{ staff.phone || '未设置手机号' }}</text>
            <text class="staff-warehouse">{{ getWarehouseName(staff.warehouse_id) }}</text>
          </view>
        </view>
        
        <!-- 右侧箭头 -->
        <view class="staff-arrow">
          <text class="arrow-icon">›</text>
        </view>
      </view>
      
      <!-- 加载更多状态 -->
      <view v-if="hasMore" class="load-more">
        <text class="load-more-text">{{ loadingMore ? '加载中...' : '上拉加载更多' }}</text>
      </view>
      
      <!-- 没有更多数据 -->
      <view v-else-if="filteredStaffList.length > 0" class="no-more">
        <text class="no-more-text">没有更多数据了</text>
      </view>
    </scroll-view>

    <!-- 统计信息 -->
    <view v-if="!loading && staffList.length > 0" class="stats-footer">
      <text class="stats-text">
        共 {{ staffList.length }} 名员工
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 员工管理页面
 * 显示所有员工列表，支持搜索筛选和详情查看
 * 仅老板角色可访问
 * @requirements 5.1, 5.2, 5.3
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUsers, getWarehouses, getWarehouseUsers } from '@/api'
import type { User, Warehouse } from '@/api/types'
import { UserRole } from '@/api/types'
import { getRoleName } from '@/utils'
import TopNavBar from '@/components/TopNavBar/index.vue'

// ==================== 类型定义 ====================

/** 筛选类型 */
type FilterType = 'all' | 'driver' | 'manager'

/** 扩展的用户信息（包含仓库ID） */
interface UserWithWarehouse extends User {
  /** 所属仓库ID（从仓库分配关系获取） */
  warehouse_id: number | null
}

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 下拉刷新状态 */
const refreshing = ref(false)

/** 加载更多状态 */
const loadingMore = ref(false)

/** 是否还有更多数据 */
const hasMore = ref(true)

/** 员工列表（包含仓库分配信息） */
const staffList = ref<UserWithWarehouse[]>([])

/** 仓库列表（用于显示仓库名称） */
const warehouseList = ref<Warehouse[]>([])

/** 用户-仓库映射（用于快速查找用户所属仓库） */
const userWarehouseMap = ref<Map<number, number>>(new Map())

/** 搜索关键词 */
const searchKeyword = ref('')

/** 当前筛选条件 */
const activeFilter = ref<FilterType>('all')

/** 分页参数 */
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
})

// ==================== 计算属性 ====================

/** 筛选标签配置 */
const filterTabs = computed(() => [
  { label: '全部', value: 'all' as const, count: staffList.value.length },
  { label: '司机', value: 'driver' as const, count: driverCount.value },
  { label: '车队长', value: 'manager' as const, count: managerCount.value },
])

/** 司机数量 */
const driverCount = computed(() => 
  staffList.value.filter(u => u.role === UserRole.DRIVER).length
)

/** 车队长数量 */
const managerCount = computed(() => 
  staffList.value.filter(u => u.role === UserRole.MANAGER).length
)

/** 筛选后的员工列表 */
const filteredStaffList = computed(() => {
  let result = staffList.value
  
  // 按角色筛选（只显示司机和车队长，不显示老板）
  if (activeFilter.value === 'driver') {
    result = result.filter(u => u.role === UserRole.DRIVER)
  } else if (activeFilter.value === 'manager') {
    result = result.filter(u => u.role === UserRole.MANAGER)
  } else {
    // 全部：只显示司机和车队长
    result = result.filter(u => 
      u.role === UserRole.DRIVER || u.role === UserRole.MANAGER
    )
  }
  
  // 按关键词搜索（姓名或手机号）
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(u => 
      u.name.toLowerCase().includes(keyword) ||
      (u.phone && u.phone.includes(keyword))
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

// ==================== 方法 ====================

/**
 * 加载数据（员工列表和仓库列表）
 * 通过遍历仓库获取用户，建立用户-仓库映射关系
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    // 1. 并行加载员工和仓库数据
    const [usersData, warehousesData] = await Promise.all([
      getUsers(),
      getWarehouses(),
    ])
    
    warehouseList.value = warehousesData
    
    // 2. 为每个仓库获取用户列表，建立用户-仓库映射
    const newUserWarehouseMap = new Map<number, number>()
    
    // 并行获取所有仓库的用户
    const warehouseUsersPromises = warehousesData.map(async (warehouse) => {
      try {
        const users = await getWarehouseUsers(warehouse.id)
        // 建立用户-仓库映射
        users.forEach(user => {
          newUserWarehouseMap.set(user.id, warehouse.id)
        })
        return users
      } catch (error) {
        console.error(`获取仓库 ${warehouse.name} 的用户失败:`, error)
        return []
      }
    })
    
    await Promise.all(warehouseUsersPromises)
    
    // 3. 更新用户-仓库映射
    userWarehouseMap.value = newUserWarehouseMap
    
    // 4. 只保留司机和车队长，并添加仓库ID
    const staffWithWarehouse: UserWithWarehouse[] = usersData
      .filter(u => u.role === UserRole.DRIVER || u.role === UserRole.MANAGER)
      .map(user => ({
        ...user,
        warehouse_id: newUserWarehouseMap.get(user.id) ?? null,
      }))
    
    staffList.value = staffWithWarehouse
    
    // 更新分页信息
    pagination.value.total = staffList.value.length
    hasMore.value = false // 当前 API 不支持分页，一次性加载全部
  } catch (error) {
    console.error('加载员工列表失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

/**
 * 处理下拉刷新
 */
async function handleRefresh(): Promise<void> {
  refreshing.value = true
  await loadData()
}

/**
 * 处理加载更多
 * 当前 API 不支持分页，此函数预留
 */
async function handleLoadMore(): Promise<void> {
  if (loadingMore.value || !hasMore.value) return
  
  // 当前 API 不支持分页，暂不实现
  // 未来如果后端支持分页，可以在这里实现
}

/**
 * 处理搜索输入
 * 搜索是实时的，通过计算属性自动过滤
 */
function handleSearch(): void {
  // 搜索是实时的，通过计算属性自动过滤
}

/**
 * 清除搜索
 */
function clearSearch(): void {
  searchKeyword.value = ''
}

/**
 * 处理筛选条件变化
 * 
 * @param filter - 筛选条件
 */
function handleFilterChange(filter: FilterType): void {
  activeFilter.value = filter
}

/**
 * 获取角色对应的样式类
 * 
 * @param role - 用户角色
 * @returns 样式类名
 */
function getRoleClass(role: string): string {
  switch (role) {
    case UserRole.BOSS:
      return 'boss'
    case UserRole.MANAGER:
      return 'manager'
    case UserRole.DRIVER:
    default:
      return 'driver'
  }
}

/**
 * 获取仓库名称
 * 
 * @param warehouseId - 仓库ID
 * @returns 仓库名称
 */
function getWarehouseName(warehouseId: number | null | undefined): string {
  if (!warehouseId) return '未分配仓库'
  
  const warehouse = warehouseList.value.find(w => w.id === warehouseId)
  return warehouse ? warehouse.name : '未知仓库'
}

/**
 * 查看员工详情
 * 跳转到用户详情页面
 * 
 * @param staffId - 员工ID
 * @requirements 5.3
 */
function viewStaffDetail(staffId: number): void {
  uni.navigateTo({
    url: `/pages/boss/users/detail?id=${staffId}`,
  })
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.staff-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 搜索栏 */
.search-bar {
  padding: 24rpx;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.search-input-wrapper {
  flex: 1;
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

/* 筛选标签 */
.filter-tabs {
  display: flex;
  padding: 16rpx 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
  gap: 16rpx;
}

.filter-tab {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  
  &.active {
    background-color: #e6f7ff;
    
    .tab-text {
      color: #1890ff;
    }
    
    .tab-count {
      background-color: #1890ff;
      color: #ffffff;
    }
  }
}

.tab-text {
  font-size: 26rpx;
  color: #666666;
}

.tab-count {
  margin-left: 8rpx;
  padding: 2rpx 12rpx;
  background-color: #e0e0e0;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #666666;
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
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 员工列表 */
.staff-list {
  flex: 1;
  padding: 24rpx;
}

.staff-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 员工信息 */
.staff-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.staff-avatar {
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
  
  &.boss {
    background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  }
}

.avatar-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.staff-detail {
  flex: 1;
}

.staff-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
  flex-wrap: wrap;
  gap: 8rpx;
}

.staff-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.role-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  
  &.driver {
    background-color: #e6f7ff;
  }
  
  &.manager {
    background-color: #f6ffed;
  }
  
  &.boss {
    background-color: #fffbe6;
  }
}

.role-text {
  font-size: 22rpx;
  
  .driver & {
    color: #1890ff;
  }
  
  .manager & {
    color: #52c41a;
  }
  
  .boss & {
    color: #faad14;
  }
}

.status-tag.inactive {
  background-color: #fff1f0;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.status-text {
  font-size: 22rpx;
  color: #ff4d4f;
}

.staff-phone {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 4rpx;
  display: block;
}

.staff-warehouse {
  font-size: 24rpx;
  color: #999999;
  display: block;
}

/* 右侧箭头 */
.staff-arrow {
  padding-left: 16rpx;
}

.arrow-icon {
  font-size: 36rpx;
  color: #cccccc;
}

/* 加载更多 */
.load-more,
.no-more {
  display: flex;
  justify-content: center;
  padding: 24rpx 0;
}

.load-more-text,
.no-more-text {
  font-size: 24rpx;
  color: #999999;
}

/* 统计信息 */
.stats-footer {
  padding: 16rpx 24rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  text-align: center;
}

.stats-text {
  font-size: 24rpx;
  color: #999999;
}
</style>
