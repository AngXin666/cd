<!--
  调试日志查看页面
  显示应用运行日志,支持导出和清空
-->
<template>
  <view class="logs-page">
    <view class="header">
      <text class="title">调试日志</text>
      <view class="actions">
        <button class="btn" size="mini" @click="refresh">刷新</button>
        <button class="btn" size="mini" @click="exportLogs">导出</button>
        <button class="btn" size="mini" @click="downloadLogs">下载</button>
        <button class="btn danger" size="mini" @click="clearLogs">清空</button>
      </view>
    </view>

    <view class="stats">
      <text class="stat-item">总计: {{ logs.length }} 条</text>
      <text class="stat-item">错误: {{ errorCount }} 条</text>
      <text class="stat-item">警告: {{ warnCount }} 条</text>
    </view>

    <scroll-view scroll-y class="logs-container">
      <view 
        v-for="(log, index) in logs" 
        :key="index"
        :class="['log-item', log.level]"
      >
        <view class="log-header">
          <text class="log-time">{{ formatTime(log.timestamp) }}</text>
          <text :class="['log-level', log.level]">{{ log.level.toUpperCase() }}</text>
        </view>
        <text class="log-message">{{ log.message }}</text>
        <text v-if="log.data" class="log-data">{{ formatData(log.data) }}</text>
      </view>

      <view v-if="logs.length === 0" class="empty">
        <text class="empty-text">暂无日志</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { logger, type LogEntry } from '@/utils/logger'

const logs = ref<LogEntry[]>([])

// 统计
const errorCount = computed(() => logs.value.filter(l => l.level === 'error').length)
const warnCount = computed(() => logs.value.filter(l => l.level === 'warn').length)

onMounted(() => {
  loadLogs()
})

function loadLogs() {
  logs.value = logger.getLogs()
}

function refresh() {
  loadLogs()
  uni.showToast({
    title: '已刷新',
    icon: 'success'
  })
}

function exportLogs() {
  logger.exportToClipboard()
}

function downloadLogs() {
  logger.downloadLogs()
}

function clearLogs() {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有日志吗?',
    success: (res) => {
      if (res.confirm) {
        logger.clearLogs()
        loadLogs()
        uni.showToast({
          title: '已清空',
          icon: 'success'
        })
      }
    }
  })
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

function formatData(data: any): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}
</script>

<style lang="scss" scoped>
.logs-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
}

.header {
  padding: 20rpx;
  background-color: #252526;
  border-bottom: 2rpx solid #3e3e42;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

.actions {
  display: flex;
  gap: 10rpx;
}

.btn {
  background-color: #0e639c;
  color: #ffffff;
  border: none;
  
  &.danger {
    background-color: #f14c4c;
  }
}

.stats {
  padding: 20rpx;
  background-color: #252526;
  border-bottom: 2rpx solid #3e3e42;
  display: flex;
  gap: 30rpx;
}

.stat-item {
  font-size: 24rpx;
  color: #cccccc;
}

.logs-container {
  flex: 1;
  padding: 20rpx;
}

.log-item {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background-color: #252526;
  border-radius: 8rpx;
  border-left: 6rpx solid #3e3e42;
  
  &.error {
    border-left-color: #f14c4c;
  }
  
  &.warn {
    border-left-color: #cca700;
  }
  
  &.info {
    border-left-color: #0e639c;
  }
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.log-time {
  font-size: 22rpx;
  color: #858585;
  font-family: 'Courier New', monospace;
}

.log-level {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-weight: bold;
  
  &.error {
    background-color: #f14c4c;
    color: #ffffff;
  }
  
  &.warn {
    background-color: #cca700;
    color: #000000;
  }
  
  &.info {
    background-color: #0e639c;
    color: #ffffff;
  }
  
  &.log {
    background-color: #3e3e42;
    color: #cccccc;
  }
}

.log-message {
  display: block;
  font-size: 26rpx;
  color: #d4d4d4;
  line-height: 1.5;
  word-break: break-all;
  font-family: 'Courier New', monospace;
}

.log-data {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #9cdcfe;
  line-height: 1.5;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #858585;
}
</style>
