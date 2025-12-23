<!--
  App.vue - 应用根组件
  配置应用生命周期和全局样式
-->
<script setup lang="ts">
/**
 * 应用根组件
 * 处理应用级别的生命周期事件
 */
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';

// 应用启动时执行
onLaunch(() => {
  console.log('🚀 车队管家启动');
  
  // 初始化用户状态
  const userStore = useUserStore();
  userStore.initFromStorage();
});

// 应用显示时执行
onShow(() => {
  console.log('📱 应用进入前台');
});

// 应用隐藏时执行
onHide(() => {
  console.log('📱 应用进入后台');
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
