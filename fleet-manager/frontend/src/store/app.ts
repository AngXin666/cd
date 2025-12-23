/**
 * 应用状态管理模块
 * 管理应用级别的状态，如加载状态、通知数量等
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 应用状态 Store
 * 使用 Composition API 风格定义
 */
export const useAppStore = defineStore('app', () => {
  // ==================== 状态 ====================
  
  /** 全局加载状态 */
  const loading = ref(false);
  
  /** 未读通知数量 */
  const unreadCount = ref(0);
  
  /** 网络状态 */
  const isOnline = ref(true);
  
  /** 系统信息 */
  const systemInfo = ref<UniApp.GetSystemInfoResult | null>(null);
  
  // ==================== 计算属性 ====================
  
  /**
   * 是否有未读通知
   */
  const hasUnread = computed(() => unreadCount.value > 0);
  
  /**
   * 未读通知显示文本
   * 超过 99 显示 99+
   */
  const unreadText = computed(() => {
    if (unreadCount.value <= 0) return '';
    if (unreadCount.value > 99) return '99+';
    return String(unreadCount.value);
  });
  
  /**
   * 是否是 iOS 系统
   */
  const isIOS = computed(() => {
    return systemInfo.value?.platform === 'ios';
  });
  
  /**
   * 是否是 Android 系统
   */
  const isAndroid = computed(() => {
    return systemInfo.value?.platform === 'android';
  });
  
  /**
   * 状态栏高度
   */
  const statusBarHeight = computed(() => {
    return systemInfo.value?.statusBarHeight || 0;
  });
  
  // ==================== 方法 ====================
  
  /**
   * 初始化应用状态
   * 获取系统信息等
   */
  function init(): void {
    // 获取系统信息
    try {
      systemInfo.value = uni.getSystemInfoSync();
    } catch (error) {
      console.error('获取系统信息失败:', error);
    }
    
    // 监听网络状态
    uni.onNetworkStatusChange((res) => {
      isOnline.value = res.isConnected;
      
      if (!res.isConnected) {
        uni.showToast({
          title: '网络已断开',
          icon: 'none',
        });
      }
    });
  }
  
  /**
   * 设置加载状态
   * 
   * @param value - 是否加载中
   */
  function setLoading(value: boolean): void {
    loading.value = value;
    
    if (value) {
      uni.showLoading({ title: '加载中...', mask: true });
    } else {
      uni.hideLoading();
    }
  }
  
  /**
   * 设置未读通知数量
   * 
   * @param count - 未读数量
   */
  function setUnreadCount(count: number): void {
    unreadCount.value = count;
    
    // 更新 TabBar 角标
    if (count > 0) {
      uni.setTabBarBadge({
        index: 1, // 通知 Tab 的索引
        text: count > 99 ? '99+' : String(count),
      });
    } else {
      uni.removeTabBarBadge({ index: 1 });
    }
  }
  
  /**
   * 增加未读数量
   * 
   * @param delta - 增加的数量，默认 1
   */
  function incrementUnread(delta = 1): void {
    setUnreadCount(unreadCount.value + delta);
  }
  
  /**
   * 减少未读数量
   * 
   * @param delta - 减少的数量，默认 1
   */
  function decrementUnread(delta = 1): void {
    const newCount = Math.max(0, unreadCount.value - delta);
    setUnreadCount(newCount);
  }
  
  /**
   * 显示成功提示
   * 
   * @param message - 提示消息
   */
  function showSuccess(message: string): void {
    uni.showToast({
      title: message,
      icon: 'success',
      duration: 2000,
    });
  }
  
  /**
   * 显示错误提示
   * 
   * @param message - 错误消息
   */
  function showError(message: string): void {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000,
    });
  }
  
  /**
   * 显示确认对话框
   * 
   * @param options - 对话框选项
   * @returns Promise<boolean> - 用户是否确认
   */
  function showConfirm(options: {
    title?: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      uni.showModal({
        title: options.title || '提示',
        content: options.content,
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        },
      });
    });
  }
  
  return {
    // 状态
    loading,
    unreadCount,
    isOnline,
    systemInfo,
    
    // 计算属性
    hasUnread,
    unreadText,
    isIOS,
    isAndroid,
    statusBarHeight,
    
    // 方法
    init,
    setLoading,
    setUnreadCount,
    incrementUnread,
    decrementUnread,
    showSuccess,
    showError,
    showConfirm,
  };
});
