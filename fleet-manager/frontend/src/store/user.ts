/**
 * 用户状态管理模块
 * 管理用户登录状态、Token、用户信息、权限状态
 * 
 * 支持实时权限更新：
 * - 通过 SSE 接收权限变更事件
 * - 自动更新本地权限状态
 * - 权限被撤销时提示用户并跳转
 * 
 * 支持实时用户状态更新：
 * - 通过 SSE 接收用户状态变更事件
 * - 账号被禁用时强制登出
 * - 角色变更时刷新权限
 * 
 * Requirements: 6.3, 6.4 - 权限状态集成实时更新
 * Requirements: 7.3, 7.4 - 用户状态集成实时更新
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, TokenResponse } from '@/api/types';
import { UserRole } from '@/api/types';
import { post, get } from '@/api/request';
import type { PermissionUpdateEvent } from '@/types/sse-events';

/** Token 存储键名 */
const TOKEN_KEY = 'fleet_manager_token';

/** 用户信息存储键名 */
const USER_KEY = 'fleet_manager_user';

/** 用户权限存储键名 */
const PERMISSIONS_KEY = 'fleet_manager_permissions';

/**
 * 用户状态 Store
 * 使用 Composition API 风格定义
 * 
 * 支持功能：
 * - 用户登录/登出状态管理
 * - 用户角色和权限检查
 * - 实时权限更新（通过 SSE）
 * - 实时用户状态更新（通过 SSE）
 * 
 * Requirements: 6.3, 6.4 - 权限状态集成实时更新
 * Requirements: 7.3, 7.4 - 用户状态集成实时更新
 */
export const useUserStore = defineStore('user', () => {
  // ==================== 状态 ====================
  
  /** JWT Token */
  const token = ref<string | null>(null);
  
  /** 当前用户信息 */
  const user = ref<User | null>(null);
  
  /** 
   * 用户权限列表
   * 存储用户拥有的所有权限键
   * Requirements: 6.3 - 权限变化时更新本地权限状态
   */
  const permissions = ref<string[]>([]);
  
  // ==================== 计算属性 ====================
  
  /**
   * 是否已登录
   */
  const isLoggedIn = computed(() => !!token.value && !!user.value);
  
  /**
   * 用户角色
   */
  const role = computed(() => user.value?.role || null);
  
  /**
   * 是否是司机
   */
  const isDriver = computed(() => role.value === UserRole.DRIVER);
  
  /**
   * 是否是车队长
   */
  const isManager = computed(() => role.value === UserRole.MANAGER);
  
  /**
   * 是否是调度
   */
  const isPeerAdmin = computed(() => role.value === UserRole.PEER_ADMIN);
  
  /**
   * 是否是老板
   * 注意：SUPER_ADMIN 角色已被移除，BOSS 现在是系统最高权限角色
   */
  const isBoss = computed(() => role.value === UserRole.BOSS);
  
  /**
   * 是否是管理员角色（调度、老板）
   * 注意：SUPER_ADMIN 角色已被移除
   */
  const isAdmin = computed(() => 
    isPeerAdmin.value || isBoss.value
  );
  
  /**
   * 是否有管理权限（车队长、调度、老板）
   * 注意：SUPER_ADMIN 角色已被移除
   */
  const hasManagerAccess = computed(() => 
    isManager.value || isPeerAdmin.value || isBoss.value
  );
  
  /**
   * 用户显示名称
   */
  const displayName = computed(() => user.value?.name || '未登录');
  
  /**
   * 用户名称（别名）
   */
  const userName = computed(() => user.value?.name || '');
  
  // ==================== 权限相关计算属性 ====================
  // Requirements: 6.3 - 权限变化时更新本地权限状态
  
  /**
   * 检查用户是否拥有指定权限
   * 
   * @param permissionKey - 权限键，如 "attendance.clock"
   * @returns 是否拥有该权限
   */
  const hasPermission = computed(() => (permissionKey: string): boolean => {
    // 老板拥有所有权限（老板是系统最高权限角色）
    if (isBoss.value) {
      return true;
    }
    return permissions.value.includes(permissionKey);
  });
  
  /**
   * 检查用户是否拥有多个权限中的任意一个
   * 
   * @param permissionKeys - 权限键列表
   * @returns 是否拥有任意一个权限
   */
  const hasAnyPermission = computed(() => (permissionKeys: string[]): boolean => {
    // 老板拥有所有权限（老板是系统最高权限角色）
    if (isBoss.value) {
      return true;
    }
    return permissionKeys.some(key => permissions.value.includes(key));
  });
  
  /**
   * 检查用户是否拥有所有指定权限
   * 
   * @param permissionKeys - 权限键列表
   * @returns 是否拥有所有权限
   */
  const hasAllPermissions = computed(() => (permissionKeys: string[]): boolean => {
    // 老板拥有所有权限（老板是系统最高权限角色）
    if (isBoss.value) {
      return true;
    }
    return permissionKeys.every(key => permissions.value.includes(key));
  });
  
  // ==================== 方法 ====================
  
  /**
   * 从本地存储初始化状态
   * 应用启动时调用
   */
  function initFromStorage(): void {
    try {
      // 读取 Token
      const storedToken = uni.getStorageSync(TOKEN_KEY);
      if (storedToken) {
        token.value = storedToken;
      }
      
      // 读取用户信息
      const storedUser = uni.getStorageSync(USER_KEY);
      if (storedUser) {
        user.value = JSON.parse(storedUser);
      }
      
      // 读取用户权限
      // Requirements: 6.3 - 从本地存储恢复权限状态
      const storedPermissions = uni.getStorageSync(PERMISSIONS_KEY);
      if (storedPermissions) {
        permissions.value = JSON.parse(storedPermissions);
      }
    } catch (error) {
      console.error('初始化用户状态失败:', error);
      // 清除可能损坏的数据
      clearStorage();
    }
  }
  
  /**
   * 设置登录信息
   * 登录成功后调用
   * 
   * @param newToken - JWT Token
   * @param newUser - 用户信息
   */
  function setLogin(newToken: string, newUser: User): void {
    // 更新状态
    token.value = newToken;
    user.value = newUser;
    
    // 持久化存储
    try {
      uni.setStorageSync(TOKEN_KEY, newToken);
      uni.setStorageSync(USER_KEY, JSON.stringify(newUser));
    } catch (error) {
      console.error('保存登录信息失败:', error);
    }
  }
  
  /**
   * 更新用户信息
   * 
   * @param newUser - 新的用户信息
   */
  function updateUser(newUser: User): void {
    user.value = newUser;
    
    try {
      uni.setStorageSync(USER_KEY, JSON.stringify(newUser));
    } catch (error) {
      console.error('更新用户信息失败:', error);
    }
  }
  
  /**
   * 清除本地存储
   * 清除 Token、用户信息和权限数据
   */
  function clearStorage(): void {
    try {
      uni.removeStorageSync(TOKEN_KEY);
      uni.removeStorageSync(USER_KEY);
      uni.removeStorageSync(PERMISSIONS_KEY);
    } catch (error) {
      console.error('清除存储失败:', error);
    }
  }
  
  /**
   * 退出登录
   * 清除所有登录状态
   */
  function logout(): void {
    // 清除状态
    token.value = null;
    user.value = null;
    permissions.value = [];
    
    // 清除存储
    clearStorage();
  }
  
  /**
   * 检查是否有指定角色的权限
   * 
   * @param allowedRoles - 允许的角色列表
   * @returns 是否有权限
   */
  function hasRole(allowedRoles: UserRole[]): boolean {
    if (!role.value) return false;
    return allowedRoles.includes(role.value);
  }
  
  /**
   * 用户登录
   * 
   * @param username - 用户名
   * @param password - 密码
   */
  async function login(username: string, password: string): Promise<void> {
    // 调用登录 API
    const tokenData = await post<TokenResponse>(
      '/auth/login',
      { username, password },
      false // 登录不需要认证
    );
    
    // 保存 Token
    token.value = tokenData.access_token;
    
    try {
      uni.setStorageSync(TOKEN_KEY, tokenData.access_token);
    } catch (error) {
      console.error('保存 Token 失败:', error);
    }
    
    // 获取用户信息
    const userData = await get<User>('/auth/me');
    user.value = userData;
    
    try {
      uni.setStorageSync(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('保存用户信息失败:', error);
    }
  }
  
  /**
   * 刷新用户信息
   */
  async function refreshUser(): Promise<void> {
    if (!token.value) return;
    
    try {
      const userData = await get<User>('/auth/me');
      user.value = userData;
      
      uni.setStorageSync(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  }
  
  // ==================== 权限更新方法 ====================
  // Requirements: 6.3, 6.4 - 权限状态集成实时更新
  
  /**
   * 更新用户权限
   * 当收到 SSE 权限更新事件时调用
   * 
   * @param newPermissions - 新的权限键列表
   * Requirements: 6.3 - 权限变化时更新本地权限状态
   */
  function updatePermissions(newPermissions: string[]): void {
    // 记录旧权限用于比较
    const oldPermissions = [...permissions.value];
    
    // 更新权限状态
    permissions.value = newPermissions;
    
    // 持久化存储
    try {
      uni.setStorageSync(PERMISSIONS_KEY, JSON.stringify(newPermissions));
    } catch (error) {
      console.error('保存权限信息失败:', error);
    }
    
    console.log('[UserStore] 权限已更新:', {
      old: oldPermissions.length,
      new: newPermissions.length,
      added: newPermissions.filter(p => !oldPermissions.includes(p)),
      removed: oldPermissions.filter(p => !newPermissions.includes(p)),
    });
  }
  
  /**
   * 处理权限更新事件
   * 当收到 SSE permission_update 事件时调用
   * 
   * @param event - 权限更新事件数据
   * @param _currentPath - 当前页面路径（保留参数，用于未来扩展检查是否需要跳转）
   * @returns 是否需要跳转到其他页面
   * 
   * Requirements: 6.3, 6.4 - 权限变化时更新本地权限状态，权限被撤销时提示和跳转
   */
  function handlePermissionUpdate(
    event: PermissionUpdateEvent,
    _currentPath?: string
  ): { needRedirect: boolean; message?: string } {
    // 检查事件是否针对当前用户
    if (!user.value || event.user_id !== user.value.id) {
      return { needRedirect: false };
    }
    
    // 记录旧权限
    const oldPermissions = [...permissions.value];
    
    // 更新权限
    updatePermissions(event.permissions);
    
    // 检查是否有权限被撤销
    const revokedPermissions = oldPermissions.filter(
      p => !event.permissions.includes(p)
    );
    
    // 如果没有权限被撤销，只是新增权限，不需要特殊处理
    if (revokedPermissions.length === 0) {
      // 显示权限新增提示
      const addedPermissions = event.permissions.filter(
        p => !oldPermissions.includes(p)
      );
      if (addedPermissions.length > 0) {
        uni.showToast({
          title: '您的权限已更新',
          icon: 'none',
          duration: 2000,
        });
      }
      return { needRedirect: false };
    }
    
    // 有权限被撤销，显示提示
    // Requirements: 6.4 - 权限被撤销时的提示
    console.log('[UserStore] 权限被撤销:', revokedPermissions);
    
    // 检查当前页面是否需要被撤销的权限
    // 这里返回需要跳转的标志，具体的跳转逻辑由调用方处理
    return {
      needRedirect: true,
      message: '您的部分权限已被修改，请重新操作',
    };
  }
  
  /**
   * 加载用户权限
   * 从后端获取当前用户的权限列表
   * 
   * @returns 权限键列表
   */
  async function loadPermissions(): Promise<string[]> {
    if (!token.value || !user.value) {
      return [];
    }
    
    try {
      // 获取当前用户角色的权限配置
      const response = await get<{ permissions: string[] }>(
        `/permissions/${user.value.role}`
      );
      
      // 更新本地权限状态
      updatePermissions(response.permissions);
      
      return response.permissions;
    } catch (error) {
      console.error('加载权限失败:', error);
      return [];
    }
  }
  
  // ==================== 用户状态更新方法 ====================
  // Requirements: 7.3, 7.4 - 用户状态集成实时更新
  
  /**
   * 用户状态更新结果接口
   * 用于返回处理用户状态更新事件的结果
   */
  interface UserUpdateResult {
    /** 是否需要强制登出 */
    needLogout: boolean;
    /** 登出原因类型 */
    reason?: 'disabled' | 'role_changed';
    /** 提示消息 */
    message?: string;
    /** 新角色（如果角色变更） */
    newRole?: string;
  }
  
  /**
   * 处理用户状态更新事件
   * 当收到 SSE user_update 事件时调用
   * 
   * @param event - 用户状态更新事件数据
   * @returns 处理结果，包含是否需要登出和原因
   * 
   * Requirements: 7.3, 7.4 - 账号被禁用时强制登出，角色变更时刷新权限
   */
  function handleUserUpdate(
    event: import('@/types/sse-events').UserUpdateEvent
  ): UserUpdateResult {
    // 检查事件是否针对当前用户
    if (!user.value || event.user.id !== user.value.id) {
      return { needLogout: false };
    }
    
    console.log('[UserStore] 处理用户状态更新事件:', {
      action: event.action,
      userId: event.user.id,
      isActive: event.user.is_active,
      newRole: event.user.role,
      currentRole: user.value.role,
    });
    
    // 情况1：用户被禁用
    // Requirements: 7.3 - 账号被禁用时强制登出
    if (event.action === 'disable' || !event.user.is_active) {
      console.log('[UserStore] 用户账号被禁用，需要强制登出');
      return {
        needLogout: true,
        reason: 'disabled',
        message: '您的账号已被管理员禁用，请联系管理员了解详情。',
      };
    }
    
    // 情况2：角色变更
    // Requirements: 7.4 - 角色变更时刷新权限
    if (event.user.role !== user.value.role) {
      console.log('[UserStore] 用户角色变更:', {
        from: user.value.role,
        to: event.user.role,
      });
      return {
        needLogout: true,
        reason: 'role_changed',
        message: '您的角色已被修改，需要重新登录以获取新的权限。',
        newRole: event.user.role,
      };
    }
    
    // 情况3：其他更新（如用户信息更新），更新本地状态
    if (event.action === 'update') {
      // 更新用户的 is_active 状态
      if (user.value) {
        const updatedUser = {
          ...user.value,
          role: event.user.role as typeof user.value.role,
        };
        updateUser(updatedUser);
      }
    }
    
    return { needLogout: false };
  }
  
  /**
   * 强制登出用户
   * 清除所有状态并返回登录页
   * 
   * @param reason - 登出原因
   * Requirements: 7.3 - 账号被禁用时强制登出
   */
  function forceLogout(reason: 'disabled' | 'role_changed' | 'other' = 'other'): void {
    console.log('[UserStore] 强制登出，原因:', reason);
    
    // 清除所有状态
    logout();
    
    // 注意：页面跳转由调用方处理，因为 store 不应该直接操作路由
  }
  
  return {
    // 状态
    token,
    user,
    permissions,
    
    // 计算属性
    isLoggedIn,
    role,
    isDriver,
    isManager,
    isPeerAdmin,
    isBoss,
    isAdmin,
    hasManagerAccess,
    displayName,
    userName,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // 方法
    initFromStorage,
    setLogin,
    updateUser,
    logout,
    hasRole,
    login,
    refreshUser,
    updatePermissions,
    handlePermissionUpdate,
    loadPermissions,
    
    // 用户状态更新方法
    // Requirements: 7.3, 7.4 - 用户状态集成实时更新
    handleUserUpdate,
    forceLogout,
  };
});
