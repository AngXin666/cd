<template>
  <!-- 
    用户管理页面
    显示所有用户列表，支持搜索筛选和增删改查
    仅老板角色可访问
  -->
  <view class="users-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          type="text"
          placeholder="搜索用户名或姓名"
          @input="handleSearch"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
      </view>
      <!-- 添加用户按钮 -->
      <view class="add-btn" @click="goToCreate">
        <text class="add-icon">+</text>
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
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredUsers.length === 0" class="empty-container">
      <text class="empty-icon">👥</text>
      <text class="empty-text">{{ searchKeyword ? '未找到匹配的用户' : '暂无用户' }}</text>
    </view>

    <!-- 用户列表 -->
    <view v-else class="user-list">
      <view
        v-for="user in filteredUsers"
        :key="user.id"
        class="user-card"
        @click="viewUserDetail(user.id)"
      >
        <!-- 用户头像和基本信息 -->
        <view class="user-info">
          <view :class="['user-avatar', getRoleClass(user.role)]">
            <text class="avatar-text">{{ user.name.charAt(0) }}</text>
          </view>
          <view class="user-detail">
            <view class="user-name-row">
              <text class="user-name">{{ user.name }}</text>
              <view :class="['role-tag', getRoleClass(user.role)]">
                <text class="role-text">{{ getRoleName(user.role) }}</text>
              </view>
              <view v-if="!user.is_active" class="status-tag inactive">
                <text class="status-text">已禁用</text>
              </view>
            </view>
            <text class="user-username">账号：{{ user.username }}</text>
            <text class="user-phone">{{ user.phone || '未设置手机号' }}</text>
          </view>
        </view>
        
        <!-- 右侧箭头 -->
        <view class="user-arrow">
          <text class="arrow-icon">›</text>
        </view>
      </view>
    </view>

    <!-- 统计信息 -->
    <view v-if="!loading && users.length > 0" class="stats-footer">
      <text class="stats-text">
        共 {{ users.length }} 名用户
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 用户管理页面
 * 显示所有用户列表，支持搜索筛选和增删改查
 * 仅老板角色可访问
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUsers } from '@/api'
import type { User } from '@/api/types'
import { UserRole } from '@/api/types'
import { getRoleName } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 用户列表 */
const users = ref<User[]>([])

/** 搜索关键词 */
const searchKeyword = ref('')

/** 当前筛选条件 */
const activeFilter = ref<'all' | 'driver' | 'manager' | 'boss'>('all')

// ==================== 计算属性 ====================

/** 筛选标签配置 */
const filterTabs = computed(() => [
  { label: '全部', value: 'all' as const, count: users.value.length },
  { label: '司机', value: 'driver' as const, count: driverCount.value },
  { label: '车队长', value: 'manager' as const, count: managerCount.value },
  { label: '老板', value: 'boss' as const, count: bossCount.value },
])

/** 司机数量 */
const driverCount = computed(() => 
  users.value.filter(u => u.role === UserRole.DRIVER).length
)

/** 车队长数量 */
const managerCount = computed(() => 
  users.value.filter(u => u.role === UserRole.MANAGER).length
)

/** 老板数量 */
const bossCount = computed(() => 
  users.value.filter(u => u.role === UserRole.BOSS).length
)

/** 筛选后的用户列表 */
const filteredUsers = computed(() => {
  let result = users.value
  
  // 按角色筛选
  if (activeFilter.value !== 'all') {
    result = result.filter(u => u.role === activeFilter.value)
  }
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(u => 
      u.name.toLowerCase().includes(keyword) ||
      u.username.toLowerCase().includes(keyword) ||
      (u.phone && u.phone.includes(keyword))
    )
  }
  
  return result
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadUsers()
})

onShow(() => {
  // 每次显示页面时刷新数据
  loadUsers()
})

// ==================== 方法 ====================

/**
 * 加载用户列表
 */
async function loadUsers(): Promise<void> {
  loading.value = true
  try {
    const data = await getUsers()
    users.value = data
  } catch (error) {
    console.error('加载用户列表失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 处理搜索输入
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
function handleFilterChange(filter: 'all' | 'driver' | 'manager' | 'boss'): void {
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
 * 跳转到创建用户页面
 */
function goToCreate(): void {
  uni.navigateTo({
    url: '/pages/boss/users/create',
  })
}

/**
 * 查看用户详情
 * 
 * @param userId - 用户ID
 */
function viewUserDetail(userId: number): void {
  uni.navigateTo({
    url: `/pages/boss/users/detail?id=${userId}`,
  })
}
</script>
