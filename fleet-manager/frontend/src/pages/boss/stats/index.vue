<template>
  <!-- 
    全局统计报表页面
    显示全局考勤统计和计件统计
    仅老板角色可访问
  -->
  <view class="stats-page">
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

    <view v-else class="stats-content">
      <!-- 计件统计卡片 -->
      <!-- Requirements: 6.1 - 数据统计单位显示 -->
      <view class="stats-card piece-work">
        <view class="card-header">
          <text class="card-title">📊 计件统计</text>
        </view>
        <view class="card-body">
          <view class="stat-row">
            <view class="stat-item">
              <text class="stat-value">{{ pieceWorkStats.record_count }}</text>
              <text class="stat-label">总记录数</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ pieceWorkStats.total_quantity }}</text>
              <text class="stat-label">总数量（{{ pieceWorkStats.unit || '件' }}）</text>
            </view>
            <view class="stat-item">
              <text class="stat-value highlight">¥{{ pieceWorkStats.total_amount.toFixed(2) }}</text>
              <text class="stat-label">总金额</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 考勤统计卡片 -->
      <view class="stats-card attendance">
        <view class="card-header">
          <text class="card-title">📋 考勤统计</text>
        </view>
        <view class="card-body">
          <view class="stat-row">
            <view class="stat-item">
              <text class="stat-value">{{ attendanceStats.total_records }}</text>
              <text class="stat-label">打卡记录</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ attendanceStats.total_hours.toFixed(1) }}</text>
              <text class="stat-label">总工时(h)</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ attendanceStats.avg_hours.toFixed(1) }}</text>
              <text class="stat-label">平均工时(h)</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 请假统计卡片 -->
      <view class="stats-card leave">
        <view class="card-header">
          <text class="card-title">🏖️ 请假统计</text>
        </view>
        <view class="card-body">
          <view class="stat-row">
            <view class="stat-item">
              <text class="stat-value">{{ leaveStats.total }}</text>
              <text class="stat-label">总申请</text>
            </view>
            <view class="stat-item">
              <text class="stat-value pending">{{ leaveStats.pending }}</text>
              <text class="stat-label">待审批</text>
            </view>
            <view class="stat-item">
              <text class="stat-value approved">{{ leaveStats.approved }}</text>
              <text class="stat-label">已批准</text>
            </view>
            <view class="stat-item">
              <text class="stat-value rejected">{{ leaveStats.rejected }}</text>
              <text class="stat-label">已拒绝</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 用户统计卡片 -->
      <view class="stats-card users">
        <view class="card-header">
          <text class="card-title">👥 用户统计</text>
        </view>
        <view class="card-body">
          <view class="stat-row">
            <view class="stat-item">
              <text class="stat-value">{{ userStats.total }}</text>
              <text class="stat-label">总用户</text>
            </view>
            <view class="stat-item">
              <text class="stat-value driver">{{ userStats.drivers }}</text>
              <text class="stat-label">司机</text>
            </view>
            <view class="stat-item">
              <text class="stat-value manager">{{ userStats.managers }}</text>
              <text class="stat-label">车队长</text>
            </view>
            <view class="stat-item">
              <text class="stat-value boss">{{ userStats.bosses }}</text>
              <text class="stat-label">老板</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 全局统计报表页面
 * 显示全局考勤统计和计件统计
 */
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPieceWorkStats, getAttendanceRecords, getLeaveApplications, getUsers } from '@/api'
import { LeaveStatus, UserRole } from '@/api/types'

const loading = ref(false)
const startDate = ref('')
const endDate = ref('')

// 计件统计
// Requirements: 6.1 - 数据统计单位显示
const pieceWorkStats = reactive({ total_quantity: 0, total_amount: 0, record_count: 0, unit: '件' })
// 考勤统计
const attendanceStats = reactive({ total_records: 0, total_hours: 0, avg_hours: 0 })
// 请假统计
const leaveStats = reactive({ total: 0, pending: 0, approved: 0, rejected: 0 })
// 用户统计
const userStats = reactive({ total: 0, drivers: 0, managers: 0, bosses: 0 })

onMounted(() => {
  // 默认显示本月数据
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  startDate.value = formatDateStr(firstDay)
  endDate.value = formatDateStr(now)
  loadData()
})

onShow(() => { loadData() })

/**
 * 格式化日期为字符串
 */
function formatDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 加载所有统计数据
 */
async function loadData(): Promise<void> {
  loading.value = true
  try {
    const params = { start_date: startDate.value || undefined, end_date: endDate.value || undefined }
    
    // 并行加载所有数据
    const [pieceWork, attendance, leave, users] = await Promise.all([
      getPieceWorkStats(params),
      getAttendanceRecords(params),
      getLeaveApplications(),
      getUsers(),
    ])
    
    // 计件统计
    Object.assign(pieceWorkStats, pieceWork)
    
    // 考勤统计
    attendanceStats.total_records = attendance.length
    attendanceStats.total_hours = attendance.reduce((sum, a) => sum + (a.work_hours || 0), 0)
    attendanceStats.avg_hours = attendance.length > 0 ? attendanceStats.total_hours / attendance.length : 0
    
    // 请假统计
    leaveStats.total = leave.length
    leaveStats.pending = leave.filter(l => l.status === LeaveStatus.PENDING).length
    leaveStats.approved = leave.filter(l => l.status === LeaveStatus.APPROVED).length
    leaveStats.rejected = leave.filter(l => l.status === LeaveStatus.REJECTED).length
    
    // 用户统计
    userStats.total = users.length
    userStats.drivers = users.filter(u => u.role === UserRole.DRIVER).length
    userStats.managers = users.filter(u => u.role === UserRole.MANAGER).length
    userStats.bosses = users.filter(u => u.role === UserRole.BOSS).length
  } catch (error) {
    console.error('加载统计数据失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleStartDateChange(e: any): void { startDate.value = e.detail.value; loadData() }
function handleEndDateChange(e: any): void { endDate.value = e.detail.value; loadData() }
</script>

<style lang="scss" scoped>
.stats-page { min-height: 100vh; background-color: #f5f5f5; padding-bottom: 24rpx; }
.filter-section { padding: 24rpx; }
.date-filter { display: flex; align-items: center; background-color: #ffffff; padding: 16rpx 24rpx; border-radius: 12rpx; }
.date-picker { display: flex; align-items: center; flex: 1; }
.date-text { font-size: 28rpx; color: #333333; flex: 1; }
.date-icon { font-size: 32rpx; }
.date-separator { font-size: 28rpx; color: #999999; margin: 0 16rpx; }
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }
.stats-content { padding: 0 24rpx; }
.stats-card { background-color: #ffffff; border-radius: 16rpx; margin-bottom: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
.card-header { padding: 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333333; }
.card-body { padding: 24rpx; }
.stat-row { display: flex; }
.stat-item { flex: 1; text-align: center; }
.stat-value { font-size: 36rpx; font-weight: bold; color: #333333; display: block; margin-bottom: 8rpx; &.highlight { color: #52c41a; } &.pending { color: #faad14; } &.approved { color: #52c41a; } &.rejected { color: #ff4d4f; } &.driver { color: #4a90e2; } &.manager { color: #52c41a; } &.boss { color: #faad14; } }
.stat-label { font-size: 24rpx; color: #666666; }
</style>
