/**
 * 用户状态管理模块
 * 管理用户登录状态、Token、用户信息
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, TokenResponse } from '@/api/types';
import { UserRole } from '@/api/types';
import { post, get } from '@/api/request';

/** Token 存储键名 */
const TOKEN_KEY = 'fleet_manager_token';

/** 用户信息存储键名 */
const USER_KEY = 'fleet_manager_user';

/**
 * 用户状态 Store
 * 使用 Composition API 风格定义
 */
export const useUserStore = defineStore('user', () => {
  // ==================== 状态 ====================
  
  /** JWT Token */
  const token = ref<string | null>(null);
  
  /** 当前用户信息 */
  const user = ref<User | null>(null);
  
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
   */
  const isBoss = computed(() => role.value === UserRole.BOSS);
  
  /**
   * 是否是超级管理员
   */
  const isSuperAdmin = computed(() => role.value === UserRole.SUPER_ADMIN);
  
  /**
   * 是否是管理员角色（调度、老板、超级管理员）
   */
  const isAdmin = computed(() => 
    isPeerAdmin.value || isBoss.value || isSuperAdmin.value
  );
  
  /**
   * 是否有管理权限（车队长、调度、老板、超级管理员）
   */
  const hasManagerAccess = computed(() => 
    isManager.value || isPeerAdmin.value || isBoss.value || isSuperAdmin.value
  );
  
  /**
   * 用户显示名称
   */
  const displayName = computed(() => user.value?.name || '未登录');
  
  /**
   * 用户名称（别名）
   */
  const userName = computed(() => user.value?.name || '');
  
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
   */
  function clearStorage(): void {
    try {
      uni.removeStorageSync(TOKEN_KEY);
      uni.removeStorageSync(USER_KEY);
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
  
  return {
    // 状态
    token,
    user,
    
    // 计算属性
    isLoggedIn,
    role,
    isDriver,
    isManager,
    isPeerAdmin,
    isBoss,
    isSuperAdmin,
    isAdmin,
    hasManagerAccess,
    displayName,
    userName,
    
    // 方法
    initFromStorage,
    setLogin,
    updateUser,
    logout,
    hasRole,
    login,
    refreshUser,
  };
});
