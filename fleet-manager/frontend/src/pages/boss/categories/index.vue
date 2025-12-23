<template>
  <!-- 
    分类管理页面
    管理计件分类，设置单价
    仅老板角色可访问
  -->
  <view class="categories-page">
    <!-- 添加按钮 -->
    <view class="header-section">
      <text class="header-title">计件分类管理</text>
      <view class="add-btn" @click="showCreateModal">
        <text class="add-icon">+</text>
        <text class="add-text">添加分类</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="categories.length === 0" class="empty-container">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无计件分类</text>
      <view class="empty-action" @click="showCreateModal">
        <text class="action-text">+ 添加分类</text>
      </view>
    </view>

    <!-- 分类列表 -->
    <view v-else class="category-list">
      <view v-for="category in categories" :key="category.id" class="category-card">
        <view class="category-info">
          <view class="category-icon">
            <text class="icon-text">📦</text>
          </view>
          <view class="category-detail">
            <view class="category-name-row">
              <text class="category-name">{{ category.name }}</text>
              <view v-if="!category.is_active" class="status-tag inactive">
                <text class="status-text">已停用</text>
              </view>
            </view>
            <text class="category-price">单价：¥{{ category.unit_price.toFixed(2) }}/{{ category.unit || '件' }}</text>
          </view>
        </view>
        <view class="category-actions">
          <view class="action-btn edit" @click="showEditModal(category)">
            <text class="btn-text">编辑</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 创建/编辑弹窗 -->
    <view v-if="showModal" class="modal-overlay" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEdit ? '编辑分类' : '添加分类' }}</text>
          <text class="modal-close" @click="closeModal">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label required">分类名称</text>
            <input v-model="form.name" class="form-input" type="text" placeholder="请输入分类名称" />
          </view>
          <view class="form-item">
            <text class="form-label required">单价</text>
            <input v-model="form.unit_price" class="form-input" type="digit" placeholder="请输入单价" />
          </view>
          <view class="form-item">
            <text class="form-label">单位</text>
            <input v-model="form.unit" class="form-input" type="text" placeholder="请输入单位（默认：件）" />
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @click="handleSubmit">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 分类管理页面
 * 管理计件分类，设置单价
 */
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPieceWorkCategories, createPieceWorkCategory } from '@/api'
import type { PieceWorkCategory } from '@/api/types'

const loading = ref(false)
const categories = ref<PieceWorkCategory[]>([])
const showModal = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)

// 表单数据
const form = reactive({ name: '', unit_price: '', unit: '' })

onMounted(() => { loadCategories() })
onShow(() => { loadCategories() })

/**
 * 加载分类列表
 */
async function loadCategories(): Promise<void> {
  loading.value = true
  try {
    const data = await getPieceWorkCategories()
    categories.value = data
  } catch (error) {
    console.error('加载分类列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 显示创建弹窗
 */
function showCreateModal(): void {
  isEdit.value = false
  editId.value = null
  form.name = ''
  form.unit_price = ''
  form.unit = ''
  showModal.value = true
}

/**
 * 显示编辑弹窗
 * @param category - 分类信息
 */
function showEditModal(category: PieceWorkCategory): void {
  isEdit.value = true
  editId.value = category.id
  form.name = category.name
  form.unit_price = String(category.unit_price)
  form.unit = category.unit || ''
  showModal.value = true
}

/**
 * 关闭弹窗
 */
function closeModal(): void {
  showModal.value = false
}

/**
 * 提交表单
 */
async function handleSubmit(): Promise<void> {
  // 表单验证
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入分类名称', icon: 'none' })
    return
  }
  
  const unitPrice = parseFloat(form.unit_price)
  if (isNaN(unitPrice) || unitPrice <= 0) {
    uni.showToast({ title: '请输入有效的单价', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: isEdit.value ? '保存中...' : '创建中...' })
    
    // 目前只支持创建，编辑需要后端支持 PUT 接口
    if (!isEdit.value) {
      await createPieceWorkCategory({
        name: form.name.trim(),
        unit_price: unitPrice,
        unit: form.unit.trim() || undefined,
      })
    }
    
    uni.hideLoading()
    uni.showToast({ title: isEdit.value ? '保存成功' : '创建成功', icon: 'success' })
    closeModal()
    await loadCategories()
  } catch (error) {
    console.error('操作失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.categories-page { min-height: 100vh; background-color: #f5f5f5; }
.header-section { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; background-color: #ffffff; }
.header-title { font-size: 32rpx; font-weight: bold; color: #333333; }
.add-btn { display: flex; align-items: center; padding: 12rpx 24rpx; background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%); border-radius: 8rpx; }
.add-icon { font-size: 28rpx; color: #ffffff; margin-right: 8rpx; }
.add-text { font-size: 26rpx; color: #ffffff; }
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }
.empty-container { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; margin-bottom: 32rpx; }
.empty-action { padding: 16rpx 48rpx; background-color: #1890ff; border-radius: 8rpx; }
.action-text { font-size: 28rpx; color: #ffffff; }
.category-list { padding: 24rpx; }
.category-card { display: flex; align-items: center; justify-content: space-between; background-color: #ffffff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
.category-info { display: flex; align-items: center; flex: 1; }
.category-icon { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; margin-right: 20rpx; }
.icon-text { font-size: 36rpx; }
.category-detail { flex: 1; }
.category-name-row { display: flex; align-items: center; margin-bottom: 8rpx; }
.category-name { font-size: 30rpx; font-weight: bold; color: #333333; margin-right: 12rpx; }
.status-tag.inactive { padding: 4rpx 12rpx; background-color: #fff1f0; border-radius: 8rpx; .status-text { font-size: 22rpx; color: #ff4d4f; } }
.category-price { font-size: 26rpx; color: #52c41a; }
.category-actions { margin-left: 16rpx; }
.action-btn.edit { padding: 12rpx 24rpx; background-color: #e6f7ff; border-radius: 8rpx; .btn-text { font-size: 26rpx; color: #1890ff; } }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 600rpx; background-color: #ffffff; border-radius: 16rpx; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 32rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333333; }
.modal-close { font-size: 36rpx; color: #999999; padding: 8rpx; }
.modal-body { padding: 32rpx; }
.form-item { margin-bottom: 24rpx; &:last-child { margin-bottom: 0; } }
.form-label { font-size: 28rpx; color: #333333; margin-bottom: 12rpx; display: block; &.required::before { content: '*'; color: #ff4d4f; margin-right: 8rpx; } }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 12rpx; font-size: 28rpx; color: #333333; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f0f0; }
.modal-btn { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; &.cancel { border-right: 1rpx solid #f0f0f0; .btn-text { color: #666666; } } &.confirm { .btn-text { color: #1890ff; font-weight: bold; } } }
.btn-text { font-size: 30rpx; }
</style>
