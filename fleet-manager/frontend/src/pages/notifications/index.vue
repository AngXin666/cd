<!--
  通知中心页面
  显示通知列表，支持标记已读功能
  
  @requirements 7.1 - 统一的页面布局和用户体验
-->
<template>
  <view class="notifications-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <view class="header-left">
        <text class="header-title">通知中心</text>
        <text v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</text>
        <!-- SSE 连接状态指示器 -->
        <view 
          class="sse-indicator" 
          :class="sseState"
          :title="isPollingMode ? '轮询模式' : 'SSE 实时连接'"
        >
          <text class="sse-dot"></text>
        </view>
      </view>
      <view class="header-right">
        <text 
          v-if="notifications.length > 0" 
          class="mark-all-btn"
          @click="handleMarkAllRead"
        >
          全部已读
        </text>
      </view>
    </view>

    <!-- 加载状态 -->
    <Loading v-if="loading && notifications.length === 0" :visible="true" fullscreen />

    <!-- 通知列表 -->
    <scroll-view
      v-else
      class="notification-list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="handleRefresh"
      @scrolltolower="handleLoadMore"
    >
      <!-- 空状态 -->
      <Empty 
        v-if="notifications.length === 0" 
        text="暂无通知"
        icon="📭"
      />

      <!-- 通知项 -->
      <view
        v-for="item in notifications"
        :key="item.id"
        class="notification-item"
        :class="{ unread: !item.is_read }"
        @click="handleItemClick(item)"
      >
        <!-- 未读标记 -->
        <view v-if="!item.is_read" class="unread-dot"></view>

        <!-- 通知内容 -->
        <view class="notification-content">
          <view class="notification-header">
            <text class="notification-title">{{ item.title }}</text>
            <text class="notification-time">{{ formatRelativeTime(item.created_at) }}</text>
          </view>
          <text v-if="item.content" class="notification-body">{{ item.content }}</text>
        </view>

        <!-- 操作按钮 -->
        <view class="notification-action">
          <text class="action-arrow">›</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore && notifications.length > 0" class="load-more">
        <text v-if="loadingMore" class="load-more-text">加载中...</text>
        <text v-else class="load-more-text">上拉加载更多</text>
      </view>

      <!-- 没有更多 -->
      <view v-if="!hasMore && notifications.length > 0" class="no-more">
        <text class="no-more-text">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 通知中心页面组件
 * 
 * @description 显示通知列表，支持下拉刷新、上拉加载、标记已读
 * 集成 SSE 实时通知，支持降级轮询
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/store/app'
import { 
  getNotifications, 
  markNotificationAsRead, 
  getUnreadCount,
  sseService,
  SSEConnectionState
} from '@/api'
import type { Notification } from '@/api/types'
import type { SSENotification, SSEHeartbeat } from '@/utils/sse'
import { formatRelativeTime } from '@/utils/dateFormat'
import Loading from '@/components/Loading/index.vue'
import Empty from '@/components/Empty/index.vue'

// ==================== Store ====================

const appStore = useAppStore()

// ==================== 状态 ====================

/** 通知列表 */
const notifications = ref<Notification[]>([])

/** 加载状态 */
const loading = ref(false)

/** 刷新状态 */
const refreshing = ref(false)

/** 加载更多状态 */
const loadingMore = ref(false)

/** 是否有更多数据 */
const hasMore = ref(true)

/** 未读数量 */
const unreadCount = ref(0)

/** SSE 连接状态 */
const sseState = ref<SSEConnectionState>(SSEConnectionState.DISCONNECTED)

/** 是否使用轮询模式 */
const isPollingMode = ref(false)

/** 分页参数 */
const pageSize = 20
let currentPage = 0

// ==================== 生命周期 ====================

onMounted(() => {
  loadNotifications()
  loadUnreadCount()
  
  // 初始化 SSE 连接
  initSSE()
})

onUnmounted(() => {
  // 页面卸载时断开 SSE 连接
  // 注意：如果需要全局保持连接，可以不断开
  // sseService.disconnect()
})

// ==================== SSE 相关方法 ====================

/**
 * 初始化 SSE 实时通知
 */
function initSSE() {
  // 设置 SSE 回调
  sseService.setCallbacks({
    // 收到新通知
    onNotification: handleNewNotifications,
    // 收到心跳（包含未读数量）
    onHeartbeat: handleHeartbeat,
    // 连接状态变化
    onStateChange: handleSSEStateChange,
    // 发生错误
    onError: handleSSEError,
  })
  
  // 连接 SSE
  sseService.connect()
}

/**
 * 处理新通知
 * @param newNotifications - 新通知列表
 */
function handleNewNotifications(newNotifications: SSENotification[]) {
  console.log('[通知页面] 收到新通知:', newNotifications.length, '条')
  
  // 将新通知添加到列表顶部
  const newItems: Notification[] = newNotifications.map(n => ({
    id: n.id,
    user_id: 0, // SSE 不返回 user_id
    title: n.title,
    content: n.content,
    is_read: n.is_read,
    sender_id: null,
    template_id: null,
    created_at: n.created_at || new Date().toISOString(),
  }))
  
  // 去重并添加到列表顶部
  const existingIds = new Set(notifications.value.map(n => n.id))
  const uniqueNewItems = newItems.filter(n => !existingIds.has(n.id))
  
  if (uniqueNewItems.length > 0) {
    notifications.value = [...uniqueNewItems, ...notifications.value]
    
    // 更新未读数量
    const newUnreadCount = uniqueNewItems.filter(n => !n.is_read).length
    if (newUnreadCount > 0) {
      unreadCount.value += newUnreadCount
      appStore.setUnreadCount(unreadCount.value)
    }
    
    // 显示提示
    uni.showToast({
      title: `收到 ${uniqueNewItems.length} 条新通知`,
      icon: 'none',
      duration: 2000,
    })
  }
}

/**
 * 处理心跳数据
 * @param data - 心跳数据
 */
function handleHeartbeat(data: SSEHeartbeat) {
  // 更新未读数量
  if (data.unread_count !== unreadCount.value) {
    unreadCount.value = data.unread_count
    appStore.setUnreadCount(data.unread_count)
  }
}

/**
 * 处理 SSE 连接状态变化
 * @param state - 新状态
 */
function handleSSEStateChange(state: SSEConnectionState) {
  sseState.value = state
  isPollingMode.value = sseService.isPollingMode()
  
  console.log('[通知页面] SSE 状态变化:', state, '轮询模式:', isPollingMode.value)
}

/**
 * 处理 SSE 错误
 * @param error - 错误对象
 */
function handleSSEError(error: Error) {
  console.error('[通知页面] SSE 错误:', error)
}

// ==================== 方法 ====================

/**
 * 加载通知列表
 * @param isRefresh - 是否是刷新操作
 */
async function loadNotifications(isRefresh = false) {
  if (loading.value || loadingMore.value) return

  if (isRefresh) {
    currentPage = 0
    hasMore.value = true
  }

  const isFirstLoad = currentPage === 0
  
  if (isFirstLoad) {
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const data = await getNotifications({
      skip: currentPage * pageSize,
      limit: pageSize,
    })

    if (isRefresh || isFirstLoad) {
      notifications.value = data
    } else {
      notifications.value = [...notifications.value, ...data]
    }

    // 判断是否还有更多数据
    hasMore.value = data.length >= pageSize
    currentPage++
  } catch (error) {
    console.error('加载通知失败:', error)
    appStore.showError('加载失败')
  } finally {
    loading.value = false
    loadingMore.value = false
    refreshing.value = false
  }
}

/**
 * 加载未读数量
 */
async function loadUnreadCount() {
  try {
    const data = await getUnreadCount()
    unreadCount.value = data.count
    // 同步到全局状态
    appStore.setUnreadCount(data.count)
  } catch (error) {
    console.error('加载未读数量失败:', error)
  }
}

/**
 * 下拉刷新
 */
function handleRefresh() {
  refreshing.value = true
  loadNotifications(true)
  loadUnreadCount()
}

/**
 * 上拉加载更多
 */
function handleLoadMore() {
  if (hasMore.value && !loadingMore.value) {
    loadNotifications()
  }
}

/**
 * 点击通知项
 * @param item - 通知项
 */
async function handleItemClick(item: Notification) {
  // 如果未读，标记为已读
  if (!item.is_read) {
    try {
      await markNotificationAsRead(item.id)
      
      // 更新本地状态
      item.is_read = true
      
      // 更新未读数量
      if (unreadCount.value > 0) {
        unreadCount.value--
        appStore.decrementUnread()
      }
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  // 显示通知详情
  uni.showModal({
    title: item.title,
    content: item.content || '无详细内容',
    showCancel: false,
    confirmText: '知道了',
  })
}

/**
 * 标记全部已读
 */
async function handleMarkAllRead() {
  // 获取所有未读通知
  const unreadItems = notifications.value.filter(item => !item.is_read)
  
  if (unreadItems.length === 0) {
    appStore.showSuccess('没有未读通知')
    return
  }

  // 确认操作
  const confirmed = await appStore.showConfirm({
    content: `确定将 ${unreadItems.length} 条通知标记为已读？`,
  })

  if (!confirmed) return

  uni.showLoading({ title: '处理中...' })

  try {
    // 逐个标记已读
    for (const item of unreadItems) {
      await markNotificationAsRead(item.id)
      item.is_read = true
    }

    // 更新未读数量
    unreadCount.value = 0
    appStore.setUnreadCount(0)

    uni.hideLoading()
    appStore.showSuccess('已全部标记为已读')
  } catch (error) {
    uni.hideLoading()
    console.error('标记已读失败:', error)
    appStore.showError('操作失败')
  }
}

</script>

<style lang="scss" scoped>
/* 页面容器 */
.notifications-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 顶部操作栏 */
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333333;
}

.unread-badge {
  margin-left: 12rpx;
  padding: 4rpx 12rpx;
  background-color: #f5222d;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #ffffff;
}

/* SSE 连接状态指示器 */
.sse-indicator {
  margin-left: 12rpx;
  display: flex;
  align-items: center;
}

.sse-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #999999;
}

/* SSE 状态颜色 */
.sse-indicator.connected .sse-dot {
  background-color: #52c41a;
  animation: pulse 2s infinite;
}

.sse-indicator.connecting .sse-dot {
  background-color: #faad14;
  animation: blink 1s infinite;
}

.sse-indicator.error .sse-dot {
  background-color: #ff4d4f;
}

.sse-indicator.disconnected .sse-dot {
  background-color: #999999;
}

/* 脉冲动画 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4);
  }
  70% {
    box-shadow: 0 0 0 8rpx rgba(82, 196, 26, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0);
  }
}

/* 闪烁动画 */
@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.header-right {
  display: flex;
  align-items: center;
}

.mark-all-btn {
  font-size: 28rpx;
  color: #4a90e2;
}

/* 通知列表 */
.notification-list {
  flex: 1;
  height: calc(100vh - 100rpx);
}

/* 通知项 */
.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 32rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
  position: relative;
}

.notification-item:active {
  background-color: #f5f5f5;
}

.notification-item.unread {
  background-color: #f0f7ff;
}

/* 未读标记 */
.unread-dot {
  position: absolute;
  left: 16rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 12rpx;
  height: 12rpx;
  background-color: #f5222d;
  border-radius: 50%;
}

/* 通知内容 */
.notification-content {
  flex: 1;
  padding-left: 16rpx;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.notification-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 24rpx;
  color: #999999;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.notification-body {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 操作按钮 */
.notification-action {
  display: flex;
  align-items: center;
  padding-left: 16rpx;
}

.action-arrow {
  font-size: 32rpx;
  color: #cccccc;
}

/* 加载更多 */
.load-more,
.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.load-more-text,
.no-more-text {
  font-size: 26rpx;
  color: #999999;
}
</style>
