<template>
  <!-- 
    全局计件管理页面
    显示所有计件记录，支持筛选统计
    仅老板角色可访问
  -->
  <view class="piece-work-page">
    <!-- 统计卡片 -->
    <!-- Requirements: 6.1 - 数据统计单位显示 -->
    <view class="stats-card">
      <view class="stats-item">
        <text class="stats-value">{{ stats.record_count }}</text>
        <text class="stats-label">总记录数</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item">
        <text class="stats-value">{{ stats.total_quantity }}</text>
        <text class="stats-label">总数量（{{ stats.unit || '件' }}）</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item">
        <text class="stats-value">¥{{ stats.total_amount.toFixed(2) }}</text>
        <text class="stats-label">总金额</text>
      </view>
    </view>

    <!-- 日期筛选 -->
    <view class="filter-section">
      <view class="date-filter">
        <picker mode="date" :value="startDate" @change="handleStartDateChange">
          <view class="date-picker">
            <text class="date-text">{{ startDate || '开始日期' }}</text>
            <text class="date-icon">📅</text>
          </view>
        </picker>
        <text class="date-separator">至</text>
        <picker mode="date" :value="endDate" @change="handleEndDateChange">
          <view class="date-picker">
            <text class="date-text">{{ endDate || '结束日期' }}</text>
            <text class="date-icon">📅</text>
          </view>
        </picker>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="records.length === 0" class="empty-container">
      <text class="empty-icon">📊</text>
      <text class="empty-text">暂无计件记录</text>
    </view>

    <!-- 记录列表 -->
    <view v-else class="record-list">
      <view v-for="record in records" :key="record.id" class="record-card" @click="handleRecordClick(record)">
        <view class="record-header">
          <view class="user-info">
            <view class="user-avatar">
              <text class="avatar-text">{{ (record.user_name || '用户').charAt(0) }}</text>
            </view>
            <view class="user-detail">
              <text class="user-name">{{ record.user_name || '未知用户' }}</text>
              <text class="record-date">{{ formatDate(record.work_date) }}</text>
            </view>
          </view>
          <view class="record-amount">
            <text class="amount-value">¥{{ record.amount.toFixed(2) }}</text>
          </view>
        </view>
        <view class="record-content">
          <view class="content-item">
            <text class="content-label">分类</text>
            <text class="content-value">{{ record.category_name || '未知分类' }}</text>
          </view>
          <view class="content-item">
            <text class="content-label">数量</text>
            <text class="content-value">{{ record.quantity }}</text>
          </view>
          <view v-if="record.warehouse_name" class="content-item">
            <text class="content-label">仓库</text>
            <text class="content-value">{{ record.warehouse_name }}</text>
          </view>
          <view v-if="record.remark" class="content-item">
            <text class="content-label">备注</text>
            <text class="content-value">{{ record.remark }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 全局计件管理页面
 * 显示所有计件记录，支持筛选统计
 * 
 * 支持 SSE 实时更新：
 * - 当有新的计件记录提交时，自动添加到列表
 * - 当计件记录状态变化时，自动更新对应记录
 * 
 * Requirements: 4.4 - 计件列表页集成实时更新
 */
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { getPieceWorkRecords, getPieceWorkStats } from '@/api'
import type { PieceWorkRecord, PieceWorkStats } from '@/api/types'
import { formatDate, navigateTo } from '@/utils'
import { sseService } from '@/utils/sse'
import type { PieceWorkUpdateEvent, PieceWorkRecordData } from '@/types/sse-events'

/** 加载状态 */
const loading = ref(false)
/** 计件记录列表 */
const records = ref<PieceWorkRecord[]>([])
/** 统计数据（包含单位信息） - Requirements: 6.1 数据统计单位显示 */
const stats = reactive<PieceWorkStats>({ total_quantity: 0, total_amount: 0, record_count: 0, unit: '件' })

// 日期筛选
const startDate = ref('')
const endDate = ref('')

onMounted(() => {
  // 默认显示本月数据
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  startDate.value = formatDateStr(firstDay)
  endDate.value = formatDateStr(now)
  loadData()
  // 注册 SSE 回调
  registerSSECallbacks()
})

onShow(() => { 
  loadData()
  // 重新注册 SSE 回调（页面可能从后台恢复）
  registerSSECallbacks()
})

/**
 * 页面隐藏时取消 SSE 回调
 */
onHide(() => {
  unregisterSSECallbacks()
})

/**
 * 组件卸载时取消 SSE 回调
 */
onUnmounted(() => {
  unregisterSSECallbacks()
})

/**
 * 格式化日期为字符串
 * @param date - 日期对象
 * @returns 格式化后的日期字符串
 */
function formatDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    const params = { start_date: startDate.value || undefined, end_date: endDate.value || undefined }
    const [recordsData, statsData] = await Promise.all([
      getPieceWorkRecords(params),
      getPieceWorkStats(params),
    ])
    records.value = recordsData
    Object.assign(stats, statsData)
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 处理开始日期变化
 */
function handleStartDateChange(e: any): void {
  startDate.value = e.detail.value
  loadData()
}

/**
 * 处理结束日期变化
 */
function handleEndDateChange(e: any): void {
  endDate.value = e.detail.value
  loadData()
}

/**
 * 处理记录点击
 * 跳转到件数报表详情页面
 * 
 * @param record - 计件记录
 */
function handleRecordClick(record: PieceWorkRecord): void {
  // 构建跳转参数
  const params: Record<string, string | number> = {
    user_id: record.user_id,
    date: record.work_date,
  }
  
  // 添加司机名称（如果有）
  if (record.user_name) {
    params.name = record.user_name
  }
  
  // 添加仓库名称（如果有）
  if (record.warehouse_name) {
    params.warehouse_name = record.warehouse_name
  }
  
  navigateTo('/pages/boss/piece-work/detail', params)
}

// ==================== SSE 实时更新 ====================
// Requirements: 4.4 - 计件列表页集成实时更新

/**
 * 注册 SSE 回调
 * 监听计件记录更新事件
 */
function registerSSECallbacks(): void {
  sseService.setCallbacks({
    onPieceWorkUpdate: handlePieceWorkUpdate,
  })
  console.log('[老板计件管理] 已注册 SSE 计件更新回调')
}

/**
 * 取消 SSE 回调注册
 */
function unregisterSSECallbacks(): void {
  sseService.setCallbacks({
    onPieceWorkUpdate: undefined,
  })
  console.log('[老板计件管理] 已取消 SSE 计件更新回调')
}

/**
 * 处理计件更新事件
 * 当收到 SSE piece_work_update 事件时调用
 * 
 * @param event - 计件更新事件数据
 * Requirements: 4.4 - 新记录到达时自动添加到列表，审批状态变化时更新对应记录
 */
function handlePieceWorkUpdate(event: PieceWorkUpdateEvent): void {
  console.log('[老板计件管理] 收到计件更新事件:', event.action, event.record.id)
  
  const eventRecord = event.record
  
  // 检查记录日期是否在当前筛选范围内
  const recordDate = eventRecord.work_date.split('T')[0]
  const inDateRange = (!startDate.value || recordDate >= startDate.value) && 
                      (!endDate.value || recordDate <= endDate.value)
  
  if (!inDateRange) {
    console.log('[老板计件管理] 记录日期不在筛选范围内，忽略')
    return
  }
  
  // 将事件数据转换为 PieceWorkRecord 格式
  const newRecord: PieceWorkRecord = {
    id: eventRecord.id,
    user_id: eventRecord.user_id,
    user_name: eventRecord.user_name,
    warehouse_id: eventRecord.warehouse_id ?? undefined,
    warehouse_name: eventRecord.warehouse_name ?? undefined,
    category_id: eventRecord.category_id,
    category_name: eventRecord.category_name,
    quantity: eventRecord.quantity,
    amount: eventRecord.amount,
    work_date: eventRecord.work_date,
    remark: eventRecord.remark ?? undefined,
    status: eventRecord.status,
    created_at: eventRecord.created_at,
  }
  
  if (event.action === 'create') {
    // 新记录：添加到列表开头
    records.value.unshift(newRecord)
    // 更新统计数据
    stats.record_count += 1
    stats.total_quantity += newRecord.quantity
    stats.total_amount += newRecord.amount
    
    // 显示提示
    uni.showToast({
      title: '收到新计件记录',
      icon: 'none',
      duration: 2000,
    })
    console.log('[老板计件管理] 已添加新记录:', newRecord.id)
  } else if (event.action === 'update') {
    // 更新记录：查找并更新
    const index = records.value.findIndex(r => r.id === newRecord.id)
    if (index !== -1) {
      const oldRecord = records.value[index]
      // 更新统计数据（先减去旧值，再加上新值）
      stats.total_quantity = stats.total_quantity - oldRecord.quantity + newRecord.quantity
      stats.total_amount = stats.total_amount - oldRecord.amount + newRecord.amount
      // 更新记录
      records.value[index] = newRecord
      console.log('[老板计件管理] 已更新记录:', newRecord.id)
    } else {
      // 如果找不到记录，可能是新进入筛选范围的，添加到列表
      records.value.unshift(newRecord)
      stats.record_count += 1
      stats.total_quantity += newRecord.quantity
      stats.total_amount += newRecord.amount
      console.log('[老板计件管理] 记录不在列表中，已添加:', newRecord.id)
    }
  }
}
</script>

<style lang="scss" scoped>
.piece-work-page { min-height: 100vh; background-color: #f5f5f5; }
.stats-card { display: flex; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32rpx; margin: 24rpx; border-radius: 16rpx; }
.stats-item { flex: 1; text-align: center; }
.stats-value { font-size: 40rpx; font-weight: bold; color: #ffffff; display: block; margin-bottom: 8rpx; }
.stats-label { font-size: 24rpx; color: rgba(255, 255, 255, 0.8); }
.stats-divider { width: 1rpx; background-color: rgba(255, 255, 255, 0.3); margin: 0 16rpx; }
.filter-section { padding: 0 24rpx 24rpx; }
.date-filter { display: flex; align-items: center; background-color: #ffffff; padding: 16rpx 24rpx; border-radius: 12rpx; }
.date-picker { display: flex; align-items: center; flex: 1; }
.date-text { font-size: 28rpx; color: #333333; flex: 1; }
.date-icon { font-size: 32rpx; }
.date-separator { font-size: 28rpx; color: #999999; margin: 0 16rpx; }
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }
.empty-container { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; }
.record-list { padding: 0 24rpx 24rpx; }
.record-card { background-color: #ffffff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
.record-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16rpx; border-bottom: 1rpx solid #f0f0f0; }
.user-info { display: flex; align-items: center; }
.user-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%); display: flex; align-items: center; justify-content: center; margin-right: 16rpx; }
.avatar-text { font-size: 28rpx; font-weight: bold; color: #ffffff; }
.user-detail { flex: 1; }
.user-name { font-size: 28rpx; font-weight: bold; color: #333333; display: block; }
.record-date { font-size: 24rpx; color: #999999; }
.record-amount { text-align: right; }
.amount-value { font-size: 32rpx; font-weight: bold; color: #52c41a; }
.record-content { padding-top: 16rpx; }
.content-item { display: flex; justify-content: space-between; padding: 8rpx 0; }
.content-label { font-size: 26rpx; color: #666666; }
.content-value { font-size: 26rpx; color: #333333; }
</style>
