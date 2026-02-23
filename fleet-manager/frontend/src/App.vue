<!--
  App.vue - 应用根组件
  配置应用生命周期和全局样式
  集成临时文件清理功能、SSE 实时更新服务和热更新检查
  
  Requirements: 
  - 6.3, 6.4 - 权限状态集成实时更新
  - 1.1 - 应用启动时自动检查热更新
-->
<script setup lang="ts">
/**
 * 应用根组件
 * 处理应用级别的生命周期事件
 * 包括用户状态初始化、临时文件清理、SSE 实时更新和热更新检查
 * 
 * SSE 实时更新功能：
 * - 权限更新：当用户权限变化时自动更新本地状态
 * - 用户状态更新：当用户被禁用时强制登出
 * 
 * 热更新功能：
 * - 应用启动时延迟 2 秒自动检查更新
 * - 支持 wgt 热更新和 APK 整包更新
 * 
 * Requirements: 
 * - 6.3, 6.4, 7.3, 7.4 - 权限和用户状态实时更新
 * - 1.1 - 应用启动时自动检查热更新
 */
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { sseService } from '@/utils/sse';
import type { PermissionUpdateEvent, UserUpdateEvent } from '@/types/sse-events';
import {
  initAppCleanup,
  performLaunchCleanup,
  performForegroundCleanup
} from '@/utils/cleanup';
// #ifndef MP-WEIXIN
import { checkUpdateOnLaunch } from '@/utils/update';
// #endif

/**
 * 初始化 SSE 服务并注册回调
 * 在用户登录后调用，用于接收实时更新事件
 * 
 * Requirements: 6.3, 6.4 - 权限状态集成实时更新
 */
function initSSEService(): void {
  const userStore = useUserStore();
  
  // 如果用户未登录，不初始化 SSE
  if (!userStore.isLoggedIn) {
    console.log('[App] 用户未登录，跳过 SSE 初始化');
    return;
  }
  
  console.log('[App] 初始化 SSE 服务');
  
  // 设置 SSE 回调
  sseService.setCallbacks({
    /**
     * 处理权限更新事件
     * Requirements: 6.3, 6.4 - 权限变化时更新本地权限状态，权限被撤销时提示和跳转
     */
    onPermissionUpdate: (event: PermissionUpdateEvent) => {
      console.log('[App] 收到权限更新事件:', event);
      
      // 调用 store 处理权限更新
      const result = userStore.handlePermissionUpdate(event);
      
      // 如果需要跳转（权限被撤销）
      if (result.needRedirect && result.message) {
        // 显示提示
        uni.showModal({
          title: '权限变更',
          content: result.message,
          showCancel: false,
          confirmText: '我知道了',
          success: () => {
            // 跳转到首页
            // Requirements: 6.4 - 权限被撤销时引导用户返回
            uni.reLaunch({
              url: '/pages/index/index',
            });
          },
        });
      }
    },
    
    /**
     * 处理用户状态更新事件
     * Requirements: 7.3, 7.4 - 用户状态集成实时更新
     */
    onUserUpdate: (event: UserUpdateEvent) => {
      console.log('[App] 收到用户状态更新事件:', event);
      
      // 调用 store 处理用户状态更新
      const result = userStore.handleUserUpdate(event);
      
      // 如果需要强制登出
      if (result.needLogout) {
        // 根据原因显示不同的提示
        const title = result.reason === 'disabled' ? '账号已禁用' : '角色变更';
        const confirmText = result.reason === 'disabled' ? '确定' : '重新登录';
        
        uni.showModal({
          title,
          content: result.message || '您的账号状态已变更，请重新登录。',
          showCancel: false,
          confirmText,
          success: () => {
            // 强制登出
            // Requirements: 7.3 - 账号被禁用时强制登出
            userStore.forceLogout(result.reason);
            // 跳转到登录页
            uni.reLaunch({
              url: '/pages/login/index',
            });
          },
        });
      }
    },
    
    /**
     * SSE 连接状态变化回调
     */
    onStateChange: (state) => {
      console.log('[App] SSE 连接状态:', state);
    },
    
    /**
     * SSE 错误回调
     */
    onError: (error) => {
      console.error('[App] SSE 错误:', error);
    },
  });
  
  // 连接 SSE 服务
  sseService.connect();
}

/**
 * 断开 SSE 服务
 * 在用户登出或应用进入后台时调用
 */
function disconnectSSEService(): void {
  console.log('[App] 断开 SSE 服务');
  sseService.disconnect();
}

// 应用启动时执行
onLaunch(async () => {
  console.log('🚀 车队管家启动');
  
  // 初始化用户状态（仅从本地存储读取，不做网络请求）
  const userStore = useUserStore();
  userStore.initFromStorage();
  
  // 注意：SSE 和权限加载移到登录成功后执行
  // 这样可以避免启动时的网络请求导致 "连接服务器超时" 错误
  
  // 热更新检查（延迟 2 秒后执行，不影响启动速度）
  // Requirements: 1.1 - 应用启动时延迟 2 秒后自动检查更新
  // #ifndef MP-WEIXIN
  checkUpdateOnLaunch();
  // #endif
  
  // 初始化清理管理器（延迟执行，不影响启动）
  setTimeout(async () => {
    try {
      await initAppCleanup({ debug: false });
      await performLaunchCleanup();
    } catch (error) {
      console.warn('[App] 启动清理失败:', error);
    }
  }, 3000);
});

// 应用显示时执行（进入前台）
onShow(async () => {
  console.log('📱 应用进入前台');
  
  // 重新连接 SSE 服务（如果用户已登录）
  const userStore = useUserStore();
  if (userStore.isLoggedIn) {
    initSSEService();
  }
  
  // 执行前台清理：清理过期的缓存和草稿（Requirements 7.4, 12.5）
  // 使用 setTimeout 延迟执行，避免影响页面渲染
  setTimeout(async () => {
    try {
      await performForegroundCleanup();
    } catch (error) {
      // 清理失败不影响应用使用
      console.warn('[App] 前台清理失败:', error);
    }
  }, 1000); // 延迟 1 秒执行，让页面先渲染
});

// 应用隐藏时执行（进入后台）
onHide(() => {
  console.log('📱 应用进入后台');
  
  // 断开 SSE 服务以节省资源
  disconnectSSEService();
});
</script>

<style lang="scss">
/**
 * 全局样式
 * 定义应用级别的通用样式
 */

/* 页面基础样式 */
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

/* 通用容器 */
.container {
  padding: 20rpx;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 卡片样式 */
.card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

/* 标题样式 */
.title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 16rpx;
}

/* 副标题样式 */
.subtitle {
  font-size: 26rpx;
  color: #666666;
}

/* 主按钮样式 */
.btn-primary {
  background-color: #007AFF;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx 0;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
}

.btn-primary:active {
  background-color: #0056b3;
}

/* 次要按钮样式 */
.btn-secondary {
  background-color: #f5f5f5;
  color: #333333;
  border-radius: 12rpx;
  padding: 24rpx 0;
  text-align: center;
  font-size: 32rpx;
}

/* 危险按钮样式 */
.btn-danger {
  background-color: #ff4d4f;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx 0;
  text-align: center;
  font-size: 32rpx;
}

/* 禁用状态 */
.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* 文本省略 */
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Flex 布局工具类 */
.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

.flex-1 {
  flex: 1;
}

/* 间距工具类 */
.mt-10 { margin-top: 10rpx; }
.mt-20 { margin-top: 20rpx; }
.mt-30 { margin-top: 30rpx; }
.mb-10 { margin-bottom: 10rpx; }
.mb-20 { margin-bottom: 20rpx; }
.mb-30 { margin-bottom: 30rpx; }
.ml-10 { margin-left: 10rpx; }
.mr-10 { margin-right: 10rpx; }
.p-20 { padding: 20rpx; }
.p-30 { padding: 30rpx; }

/* 文本颜色 */
.text-primary { color: #007AFF; }
.text-success { color: #52c41a; }
.text-warning { color: #faad14; }
.text-danger { color: #ff4d4f; }
.text-gray { color: #999999; }

/* 文本大小 */
.text-sm { font-size: 24rpx; }
.text-base { font-size: 28rpx; }
.text-lg { font-size: 32rpx; }
.text-xl { font-size: 36rpx; }
</style>
