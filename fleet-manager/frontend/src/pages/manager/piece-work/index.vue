<template>
  <!-- 
    计件管理页面
    查看司机计件记录
    支持编辑修正
  -->
  <view class="piece-work-page">
    <!-- 搜索和筛选 -->
    <view class="filter-section">
      <!-- 司机选择 -->
      <view class="filter-row">
        <text class="filter-label">司机</text>
        <picker
          mode="selector"
          :range="driverOptions"
          range-key="name"
          @change="handleDriverChange"
        >
          <view class="picker-value">
            <text class="picker-text">{{ selectedDriverName }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <!-- 日期选择 -->
      <view class="filter-row">
        <text class="filter-label">日期</text>
        <picker mode="date" :value="selectedDate" @change="handleDateChange">
          <view class="picker-value">
            <text class="picker-text">{{ selectedDate }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-card">
      <view class="stats-item">
        <text class="stats-value">{{ stats.record_count }}</text>
        <text class="stats-label">记录数</text>
      </view>
      <view class="stats-item">
        <text class="stats-value">{{ stats.total_quantity }}</text>
        <text class="stats-label">总数量</text>
      </view>
      <view class="stats-item">
        <text class="stats-value highlight">¥{{ formatMoney(stats.total_amount) }}</text>
        <text class="stats-label">总金额</text>
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
      <view
        v-for="record in records"
        :key="record.id"
        class="record-card"
      >
        <view class="record-header">
          <view class="driver-info">
            <text class="driver-name">{{ record.user_name || '未知司机' }}</text>
            <text class="record-date">{{ formatDate(record.work_date) }}</text>
          </view>
          <view class="header-right">
            <view class="category-tag">
              <text class="category-text">{{ record.category_name || '未知分类' }}</text>
            </view>
            <!-- 编辑按钮 -->
            <view class="edit-btn" @click="openEditModal(record)">
              <text class="edit-icon">✏️</text>
            </view>
          </view>
        </view>
        
        <view class="record-content">
          <view class="record-item">
            <text class="item-label">数量</text>
            <text class="item-value">{{ record.quantity }}</text>
          </view>
          <view class="record-item">
            <text class="item-label">单价</text>
            <text class="item-value">¥{{ formatMoney(getUnitPrice(record)) }}</text>
          </view>
          <view class="record-item">
            <text class="item-label">金额</text>
            <text class="item-value highlight">¥{{ formatMoney(record.amount) }}</text>
          </view>
        </view>
        
        <view v-if="record.remark" class="record-remark">
          <text class="remark-text">备注：{{ record.remark }}</text>
        </view>
        
        <view class="record-footer">
          <text class="create-time">录入时间：{{ formatDateTime(record.created_at) }}</text>
        </view>
      </view>
    </view>

    <!-- 编辑弹窗 -->
    <view v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">编辑计件记录</text>
          <text class="modal-close" @click="closeEditModal">×</text>
        </view>
        
        <view class="modal-body">
          <!-- 司机信息（只读） -->
          <view class="form-item">
            <text class="form-label">司机</text>
            <text class="form-value readonly">{{ editingRecord?.user_name || '未知' }}</text>
          </view>
          
          <!-- 分类信息（只读） -->
          <view class="form-item">
            <text class="form-label">分类</text>
            <text class="form-value readonly">{{ editingRecord?.category_name || '未知' }}</text>
          </view>
          
          <!-- 日期（只读） -->
          <view class="form-item">
            <text class="form-label">日期</text>
            <text class="form-value readonly">{{ formatDate(editingRecord?.work_date || '') }}</text>
          </view>
          
          <!-- 数量（可编辑） -->
          <view class="form-item">
            <text class="form-label">数量</text>
            <input
              v-model="editForm.quantity"
              type="number"
              class="form-input"
              placeholder="请输入数量"
            />
          </view>
          
          <!-- 备注（可编辑） -->
          <view class="form-item">
            <text class="form-label">备注</text>
            <textarea
              v-model="editForm.remark"
              class="form-textarea"
              placeholder="请输入备注（选填）"
            />
          </view>
        </view>
        
        <view class="modal-footer">
          <view class="btn btn-delete" @click="handleDelete">
            <text class="btn-text">删除</text>
          </view>
          <view class="btn btn-cancel" @click="closeEditModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="btn btn-confirm" @click="handleSave">
            <text class="btn-text">保存</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 计件管理页面
 * 查看司机计件记录
 * 支持编辑修正
 */

import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getUsers, 
  getPieceWorkRecords, 
  getPieceWorkStats,
  updatePieceWorkRecord,
  deletePieceWorkRecord
} from '@/api'
import type { User, PieceWorkRecord, PieceWorkStats } from '@/api/types'
import { UserRole } from '@/api/types'
import { formatDate, formatDateTime, formatMoney, getToday } from '@/utils'

// ==================== 状态 ====================

/** 加载状态 */
const loading = ref(false)

/** 司机列表 */
const drivers = ref<User[]>([])

/** 选中的司机ID */
const selectedDriverId = ref<number | null>(null)

/** 选中的日期 */
const selectedDate = ref(getToday())

/** 计件记录 */
const records = ref<PieceWorkRecord[]>([])

/** 统计数据 */
const stats = ref<PieceWorkStats>({
  total_quantity: 0,
  total_amount: 0,
  record_count: 0,
})

/** 是否显示编辑弹窗 */
const showEditModal = ref(false)

/** 正在编辑的记录 */
const editingRecord = ref<PieceWorkRecord | null>(null)

/** 编辑表单数据 */
const editForm = ref({
  quantity: '',
  remark: '',
})

// ==================== 计算属性 ====================

/** 司机选项（包含"全部"选项） */
const driverOptions = computed(() => [
  { id: null, name: '全部司机' },
  ...drivers.value,
])

/** 选中的司机名称 */
const selectedDriverName = computed(() => {
  if (!selectedDriverId.value) return '全部司机'
  const driver = drivers.value.find(d => d.id === selectedDriverId.value)
  return driver?.name || '全部司机'
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadDrivers()
  loadRecords()
})

onShow(() => {
  // 每次显示页面时刷新数据
  loadRecords()
})

// ==================== 方法 ====================

/**
 * 加载司机列表
 */
async function loadDrivers(): Promise<void> {
  try {
    const data = await getUsers({ role: UserRole.DRIVER })
    drivers.value = data
  } catch (error) {
    console.error('加载司机列表失败:', error)
  }
}

/**
 * 加载计件记录
 */
async function loadRecords(): Promise<void> {
  loading.value = true
  try {
    // 构建查询参数
    const params: {
      user_id?: number
      start_date?: string
      end_date?: string
    } = {
      start_date: selectedDate.value,
      end_date: selectedDate.value,
    }
    
    if (selectedDriverId.value) {
      params.user_id = selectedDriverId.value
    }
    
    // 并行加载记录和统计
    const [recordsData, statsData] = await Promise.all([
      getPieceWorkRecords(params),
      getPieceWorkStats(params),
    ])
    
    records.value = recordsData
    stats.value = statsData
  } catch (error) {
    console.error('加载计件记录失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

/**
 * 处理司机选择变化
 * 
 * @param e - 事件对象
 */
function handleDriverChange(e: { detail: { value: number } }): void {
  const index = e.detail.value
  const driver = driverOptions.value[index]
  selectedDriverId.value = driver.id
  loadRecords()
}

/**
 * 处理日期选择变化
 * 
 * @param e - 事件对象
 */
function handleDateChange(e: { detail: { value: string } }): void {
  selectedDate.value = e.detail.value
  loadRecords()
}

/**
 * 计算单价
 * 根据金额和数量计算单价
 * 
 * @param record - 计件记录
 * @returns 单价
 */
function getUnitPrice(record: PieceWorkRecord): number {
  if (record.quantity === 0) return 0
  return record.amount / record.quantity
}

/**
 * 打开编辑弹窗
 * 
 * @param record - 要编辑的记录
 */
function openEditModal(record: PieceWorkRecord): void {
  editingRecord.value = record
  editForm.value = {
    quantity: String(record.quantity),
    remark: record.remark || '',
  }
  showEditModal.value = true
}

/**
 * 关闭编辑弹窗
 */
function closeEditModal(): void {
  showEditModal.value = false
  editingRecord.value = null
  editForm.value = {
    quantity: '',
    remark: '',
  }
}

/**
 * 保存编辑
 */
async function handleSave(): Promise<void> {
  if (!editingRecord.value) return
  
  // 验证数量
  const quantity = parseInt(editForm.value.quantity, 10)
  if (isNaN(quantity) || quantity < 1) {
    uni.showToast({
      title: '请输入有效的数量',
      icon: 'none',
    })
    return
  }
  
  try {
    uni.showLoading({ title: '保存中...' })
    
    await updatePieceWorkRecord(editingRecord.value.id, {
      quantity,
      remark: editForm.value.remark || undefined,
    })
    
    uni.hideLoading()
    uni.showToast({
      title: '保存成功',
      icon: 'success',
    })
    
    // 关闭弹窗并刷新数据
    closeEditModal()
    loadRecords()
  } catch (error) {
    uni.hideLoading()
    console.error('保存失败:', error)
    uni.showToast({
      title: '保存失败',
      icon: 'none',
    })
  }
}

/**
 * 删除记录
 */
async function handleDelete(): Promise<void> {
  if (!editingRecord.value) return
  
  // 确认删除
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条计件记录吗？删除后无法恢复。',
    success: async (res) => {
      if (res.confirm && editingRecord.value) {
        try {
          uni.showLoading({ title: '删除中...' })
          
          await deletePieceWorkRecord(editingRecord.value.id)
          
          uni.hideLoading()
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          })
          
          // 关闭弹窗并刷新数据
          closeEditModal()
          loadRecords()
        } catch (error) {
          uni.hideLoading()
          console.error('删除失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'none',
          })
        }
      }
    },
  })
}
</script>


<style lang="scss" scoped>
.piece-work-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 48rpx;
}

/* 筛选区域 */
.filter-section {
  background-color: #ffffff;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.filter-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  
  &:not(:last-child) {
    border-bottom: 1rpx solid #f0f0f0;
  }
}

.filter-label {
  font-size: 28rpx;
  color: #666666;
  width: 100rpx;
}

.picker-value {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.picker-text {
  font-size: 28rpx;
  color: #333333;
}

.picker-arrow {
  font-size: 20rpx;
  color: #999999;
}

/* 统计卡片 */
.stats-card {
  display: flex;
  background-color: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
  
  &.highlight {
    color: #ff6b35;
  }
}

.stats-label {
  font-size: 24rpx;
  color: #999999;
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

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 记录列表 */
.record-list {
  padding: 0 24rpx;
}

.record-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.driver-info {
  display: flex;
  flex-direction: column;
}

.driver-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 4rpx;
}

.record-date {
  font-size: 24rpx;
  color: #999999;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.category-tag {
  padding: 6rpx 16rpx;
  background-color: #e6f7ff;
  border-radius: 8rpx;
}

.category-text {
  font-size: 24rpx;
  color: #1890ff;
}

.edit-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.edit-icon {
  font-size: 24rpx;
}

.record-content {
  display: flex;
  padding: 16rpx 0;
  border-top: 1rpx solid #f0f0f0;
  border-bottom: 1rpx solid #f0f0f0;
}

.record-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.item-label {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 4rpx;
}

.item-value {
  font-size: 28rpx;
  color: #333333;
  
  &.highlight {
    color: #ff6b35;
    font-weight: bold;
  }
}

.record-remark {
  padding: 12rpx 0;
}

.remark-text {
  font-size: 24rpx;
  color: #999999;
}

.record-footer {
  padding-top: 12rpx;
}

.create-time {
  font-size: 22rpx;
  color: #cccccc;
}

/* 编辑弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-width: 600rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.modal-close {
  font-size: 40rpx;
  color: #999999;
  line-height: 1;
}

.modal-body {
  padding: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 12rpx;
}

.form-value {
  font-size: 28rpx;
  color: #333333;
  
  &.readonly {
    color: #999999;
  }
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333333;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333333;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.modal-footer {
  display: flex;
  padding: 24rpx;
  border-top: 1rpx solid #f0f0f0;
  gap: 16rpx;
}

.btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
}

.btn-text {
  font-size: 28rpx;
}

.btn-delete {
  background-color: #fff1f0;
  
  .btn-text {
    color: #ff4d4f;
  }
}

.btn-cancel {
  background-color: #f5f5f5;
  
  .btn-text {
    color: #666666;
  }
}

.btn-confirm {
  background-color: #1890ff;
  
  .btn-text {
    color: #ffffff;
  }
}
</style>
