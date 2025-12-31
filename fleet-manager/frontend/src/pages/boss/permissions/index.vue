<template>
  <!-- 
    权限配置页面
    显示角色列表和对应权限，支持权限的查看和配置
    仅老板角色可访问
    @requirements 6.1, 6.2, 6.3, 6.4
  -->
  <view class="permissions-page">
    <!-- 顶部导航栏 -->
    <TopNavBar title="权限配置" :show-back="true" />
    
    <!-- 页面说明 -->
    <view class="page-header">
      <text class="header-title">角色权限管理</text>
      <text class="header-desc">查看和配置不同角色的系统权限</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 角色列表 -->
    <view v-else class="role-list">
      <view
        v-for="role in roleList"
        :key="role.value"
        :class="['role-card', { active: selectedRole === role.value }]"
        @click="selectRole(role.value)"
      >
        <!-- 角色信息 -->
        <view class="role-info">
          <view :class="['role-icon', role.value]">
            <text class="icon-text">{{ role.icon }}</text>
          </view>
          <view class="role-detail">
            <text class="role-name">{{ role.label }}</text>
            <text class="role-desc">{{ role.description }}</text>
            <text class="role-count">{{ getRoleUserCount(role.value) }} 名用户</text>
          </view>
        </view>
        
        <!-- 展开箭头 -->
        <view class="role-arrow">
          <text :class="['arrow-icon', { expanded: selectedRole === role.value }]">›</text>
        </view>
      </view>

      <!-- 权限详情面板 -->
      <view v-if="selectedRole" class="permission-panel">
        <view class="panel-header">
          <text class="panel-title">{{ getSelectedRoleName() }} 权限列表</text>
        </view>
        
        <!-- 权限分组 -->
        <view
          v-for="group in permissionGroups"
          :key="group.key"
          class="permission-group"
        >
          <view class="group-header">
            <text class="group-icon">{{ group.icon }}</text>
            <text class="group-name">{{ group.name }}</text>
          </view>
          
          <view class="permission-items">
            <view
              v-for="permission in group.permissions"
              :key="permission.key"
              class="permission-item"
            >
              <view class="permission-info">
                <text class="permission-name">{{ permission.name }}</text>
                <text class="permission-desc">{{ permission.description }}</text>
              </view>
              
              <!-- 权限状态 -->
              <view class="permission-status">
                <switch
                  :checked="hasPermission(selectedRole, permission.key)"
                  :disabled="!canEditPermission(selectedRole, permission.key)"
                  @change="togglePermission(permission.key, $event)"
                />
              </view>
            </view>
          </view>
        </view>

        <!-- 保存按钮 -->
        <view v-if="hasChanges" class="save-section">
          <button
            class="save-btn"
            :loading="saving"
            @click="savePermissions"
          >
            保存权限配置
          </button>
          <button class="cancel-btn" @click="cancelChanges">
            取消修改
          </button>
        </view>
      </view>
    </view>

    <!-- 底部提示 -->
    <view class="footer-tips">
      <text class="tips-icon">💡</text>
      <text class="tips-text">提示：老板拥有所有权限，无法修改</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 权限配置页面
 * 显示角色列表和对应权限，支持权限的查看和配置
 * 仅老板角色可访问
 * @requirements 6.1, 6.2, 6.3, 6.4
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUsers, getAllPermissions, updateRolePermissions, resetRolePermissions } from '@/api'
import type { User, PermissionGroup, AllPermissionsResponse } from '@/api/types'
import { UserRole } from '@/api/types'
import TopNavBar from '@/components/TopNavBar/index.vue'

// ==================== 类型定义 ====================

/** 角色配置 */
interface RoleConfig {
  /** 角色值 */
  value: UserRole
  /** 角色显示名称 */
  label: string
  /** 角色描述 */
  description: string
  /** 角色图标 */
  icon: string
}

/** 权限项 */
interface Permission {
  /** 权限键 */
  key: string
  /** 权限名称 */
  name: string
  /** 权限描述 */
  description: string
}

/** 权限分组 */
interface PermissionGroupConfig {
  /** 分组键 */
  key: string
  /** 分组名称 */
  name: string
  /** 分组图标 */
  icon: string
  /** 权限列表 */
  permissions: Permission[]
}

/** 角色权限映射 */
type RolePermissions = Record<UserRole, string[]>

// ==================== 常量定义 ====================

/** 角色列表配置 */
const ROLE_LIST: RoleConfig[] = [
  {
    value: UserRole.DRIVER,
    label: '司机',
    description: '负责车辆驾驶和计件录入',
    icon: '🚗',
  },
  {
    value: UserRole.MANAGER,
    label: '车队长',
    description: '管理司机和审批请假',
    icon: '👨‍💼',
  },
  {
    value: UserRole.PEER_ADMIN,
    label: '调度',
    description: '负责车辆调度和仓库管理',
    icon: '📋',
  },
  {
    value: UserRole.BOSS,
    label: '老板',
    description: '系统最高权限，拥有所有管理权限',
    icon: '👔',
  },
]

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 保存状态 */
const saving = ref(false)

/** 用户列表（用于统计各角色人数） */
const userList = ref<User[]>([])

/** 当前选中的角色 */
const selectedRole = ref<UserRole | null>(null)

/** 权限分组配置（从后端加载） */
const permissionGroupsData = ref<PermissionGroupConfig[]>([])

/** 角色权限配置（可编辑） */
const rolePermissions = ref<RolePermissions>({} as RolePermissions)

/** 原始权限配置（用于检测变更） */
const originalPermissions = ref<RolePermissions>({} as RolePermissions)

// ==================== 计算属性 ====================

/** 角色列表 */
const roleList = computed(() => ROLE_LIST)

/** 权限分组 */
const permissionGroups = computed(() => permissionGroupsData.value)

/** 是否有未保存的变更 */
const hasChanges = computed(() => {
  if (!selectedRole.value) return false
  
  const current = rolePermissions.value[selectedRole.value]
  const original = originalPermissions.value[selectedRole.value]
  
  if (current.length !== original.length) return true
  
  return !current.every(p => original.includes(p))
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
})

onShow(() => {
  loadData()
})

// ==================== 方法 ====================

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    // 并行加载用户列表和权限配置
    const [users, permissionsData] = await Promise.all([
      getUsers(),
      getAllPermissions(),
    ])
    
    userList.value = users
    
    // 设置权限分组
    permissionGroupsData.value = permissionsData.groups.map(g => ({
      key: g.key,
      name: g.name,
      icon: g.icon,
      permissions: g.permissions.map(p => ({
        key: p.key,
        name: p.name,
        description: p.description,
      })),
    }))
    
    // 设置角色权限
    const perms: RolePermissions = {} as RolePermissions
    for (const role of Object.values(UserRole)) {
      perms[role] = permissionsData.role_permissions[role] || []
    }
    rolePermissions.value = perms
    originalPermissions.value = JSON.parse(JSON.stringify(perms))
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
 * 获取角色用户数量
 * 
 * @param role - 角色值
 * @returns 用户数量
 */
function getRoleUserCount(role: UserRole): number {
  return userList.value.filter(u => u.role === role).length
}

/**
 * 选择角色
 * 
 * @param role - 角色值
 */
function selectRole(role: UserRole): void {
  if (selectedRole.value === role) {
    // 再次点击则收起
    selectedRole.value = null
  } else {
    selectedRole.value = role
  }
}

/**
 * 获取选中角色的名称
 * 
 * @returns 角色名称
 */
function getSelectedRoleName(): string {
  if (!selectedRole.value) return ''
  
  const role = ROLE_LIST.find(r => r.value === selectedRole.value)
  return role ? role.label : ''
}

/**
 * 检查角色是否拥有某权限
 * 
 * @param role - 角色值
 * @param permissionKey - 权限键
 * @returns 是否拥有权限
 */
function hasPermission(role: UserRole, permissionKey: string): boolean {
  return rolePermissions.value[role]?.includes(permissionKey) ?? false
}

/**
 * 检查是否可以编辑权限
 * 老板的权限不可编辑（老板是系统最高权限角色）
 * 
 * @param role - 角色值
 * @param permissionKey - 权限键
 * @returns 是否可编辑
 */
function canEditPermission(role: UserRole, permissionKey: string): boolean {
  // 老板拥有所有权限，不可编辑
  if (role === UserRole.BOSS) {
    return false
  }
  return true
}

/**
 * 切换权限状态
 * 
 * @param permissionKey - 权限键
 * @param event - 事件对象
 */
function togglePermission(permissionKey: string, event: any): void {
  if (!selectedRole.value) return
  
  const role = selectedRole.value
  const checked = event.detail.value
  
  // 不允许编辑老板的权限
  if (!canEditPermission(role, permissionKey)) {
    uni.showToast({
      title: '该角色权限不可修改',
      icon: 'none',
    })
    return
  }
  
  const permissions = [...rolePermissions.value[role]]
  
  if (checked) {
    // 添加权限
    if (!permissions.includes(permissionKey)) {
      permissions.push(permissionKey)
    }
  } else {
    // 移除权限
    const index = permissions.indexOf(permissionKey)
    if (index > -1) {
      permissions.splice(index, 1)
    }
  }
  
  rolePermissions.value[role] = permissions
}

/**
 * 保存权限配置
 * @requirements 6.3, 6.4
 */
async function savePermissions(): Promise<void> {
  if (!selectedRole.value) return
  
  const role = selectedRole.value
  const permissions = rolePermissions.value[role]
  
  saving.value = true
  try {
    // 调用后端 API 保存权限配置
    await updateRolePermissions(role, { permissions })
    
    // 更新原始配置
    originalPermissions.value[role] = [...permissions]
    
    uni.showToast({
      title: '保存成功',
      icon: 'success',
    })
  } catch (error: any) {
    console.error('保存权限配置失败:', error)
    uni.showToast({
      title: error?.message || '保存失败',
      icon: 'none',
    })
  } finally {
    saving.value = false
  }
}

/**
 * 取消修改
 */
function cancelChanges(): void {
  if (!selectedRole.value) return
  
  // 恢复原始配置
  rolePermissions.value[selectedRole.value] = [...originalPermissions.value[selectedRole.value]]
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.permissions-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  padding-bottom: 120rpx;
}

/* 页面头部 */
.page-header {
  padding: 32rpx 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.header-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 8rpx;
}

.header-desc {
  font-size: 26rpx;
  color: #999999;
  display: block;
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

/* 角色列表 */
.role-list {
  padding: 24rpx;
}

.role-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  
  &.active {
    border: 2rpx solid #1890ff;
    background-color: #f0f9ff;
  }
}

/* 角色信息 */
.role-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.role-icon {
  width: 80rpx;
  height: 80rpx;
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
  
  &.peer_admin {
    background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
  }
  
  &.boss {
    background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  }
}

.icon-text {
  font-size: 36rpx;
}

.role-detail {
  flex: 1;
}

.role-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 4rpx;
}

.role-desc {
  font-size: 24rpx;
  color: #666666;
  display: block;
  margin-bottom: 4rpx;
}

.role-count {
  font-size: 22rpx;
  color: #999999;
  display: block;
}

/* 展开箭头 */
.role-arrow {
  padding-left: 16rpx;
}

.arrow-icon {
  font-size: 36rpx;
  color: #cccccc;
  transition: transform 0.3s ease;
  display: inline-block;
  
  &.expanded {
    transform: rotate(90deg);
  }
}

/* 权限面板 */
.permission-panel {
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-top: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.panel-header {
  padding: 24rpx;
  background-color: #fafafa;
  border-bottom: 1rpx solid #f0f0f0;
}

.panel-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
}

/* 权限分组 */
.permission-group {
  border-bottom: 1rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.group-header {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background-color: #fafafa;
}

.group-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.group-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #333333;
}

/* 权限项 */
.permission-items {
  padding: 0 24rpx;
}

.permission-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.permission-info {
  flex: 1;
}

.permission-name {
  font-size: 28rpx;
  color: #333333;
  display: block;
  margin-bottom: 4rpx;
}

.permission-desc {
  font-size: 24rpx;
  color: #999999;
  display: block;
}

.permission-status {
  padding-left: 16rpx;
}

/* 保存区域 */
.save-section {
  padding: 24rpx;
  display: flex;
  gap: 16rpx;
}

.save-btn {
  flex: 1;
  height: 80rpx;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: #ffffff;
  font-size: 28rpx;
  border-radius: 12rpx;
  border: none;
  
  &::after {
    border: none;
  }
}

.cancel-btn {
  flex: 1;
  height: 80rpx;
  background-color: #f5f5f5;
  color: #666666;
  font-size: 28rpx;
  border-radius: 12rpx;
  border: none;
  
  &::after {
    border: none;
  }
}

/* 底部提示 */
.footer-tips {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background-color: #fffbe6;
  border-top: 1rpx solid #ffe58f;
}

.tips-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.tips-text {
  font-size: 24rpx;
  color: #d48806;
}
</style>
