<template>
  <!-- 
    计件录入页面
    选择分类、输入数量，提交计件记录
  -->
  <view class="entry-page">
    <!-- 日期选择 -->
    <view class="form-section">
      <view class="form-title">工作日期</view>
      <picker mode="date" :value="formData.work_date" @change="onDateChange">
        <view class="form-picker">
          <text class="picker-value">{{ formData.work_date }}</text>
          <text class="picker-arrow">›</text>
        </view>
      </picker>
    </view>

    <!-- 分类选择 -->
    <view class="form-section">
      <view class="form-title">计件分类</view>
      <view v-if="loadingCategories" class="loading-text">加载中...</view>
      <view v-else-if="categories.length === 0" class="empty-text">暂无分类</view>
      <view v-else class="category-list">
        <view 
          v-for="category in categories" 
          :key="category.id"
          :class="['category-item', { active: formData.category_id === category.id }]"
          @click="selectCategory(category)"
        >
          <text class="category-name">{{ category.name }}</text>
          <text class="category-price">¥{{ category.unit_price }}/{{ category.unit }}</text>
        </view>
      </view>
    </view>

    <!-- 数量输入 -->
    <view class="form-section">
      <view class="form-title">数量</view>
      <view class="quantity-input">
        <view class="quantity-btn" @click="decreaseQuantity">
          <text class="btn-text">-</text>
        </view>
        <input 
          type="number" 
          class="quantity-value"
          v-model="formData.quantity"
          placeholder="请输入数量"
        />
        <view class="quantity-btn" @click="increaseQuantity">
          <text class="btn-text">+</text>
        </view>
      </view>
    </view>

    <!-- 金额预览 -->
    <view v-if="selectedCategory && formData.quantity > 0" class="preview-section">
      <view class="preview-row">
        <text class="preview-label">单价</text>
        <text class="preview-value">¥{{ selectedCategory.unit_price }}/{{ selectedCategory.unit }}</text>
      </view>
      <view class="preview-row">
        <text class="preview-label">数量</text>
        <text class="preview-value">{{ formData.quantity }} {{ selectedCategory.unit }}</text>
      </view>
      <view class="preview-row total">
        <text class="preview-label">预计金额</text>
        <text class="preview-value highlight">¥{{ calculateAmount.toFixed(2) }}</text>
      </view>
    </view>

    <!-- 备注 -->
    <view class="form-section">
      <view class="form-title">备注（选填）</view>
      <textarea 
        class="remark-input"
        v-model="formData.remark"
        placeholder="请输入备注信息"
        maxlength="200"
      />
    </view>

    <!-- 提交按钮 -->
    <view class="submit-section">
      <view 
        :class="['submit-btn', { disabled: !canSubmit }]"
        @click="handleSubmit"
      >
        <text class="submit-text">{{ submitting ? '提交中...' : '提交记录' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 计件录入页面
 * 选择分类、输入数量，提交计件记录
 */

import { ref, computed, onMounted, reactive } from 'vue'
import { getPieceWorkCategories, createPieceWorkRecord } from '@/api'
import type { PieceWorkCategory, PieceWorkRecordCreate } from '@/api/types'
import { getToday, navigateBack } from '@/utils'

// ==================== 状态 ====================

/** 分类列表 */
const categories = ref<PieceWorkCategory[]>([])

/** 加载分类状态 */
const loadingCategories = ref(false)

/** 提交状态 */
const submitting = ref(false)

/** 选中的分类 */
const selectedCategory = ref<PieceWorkCategory | null>(null)

/** 表单数据 */
const formData = reactive<PieceWorkRecordCreate & { quantity: number; remark: string }>({
  category_id: 0,
  work_date: getToday(),
  quantity: 0,
  remark: '',
})

// ==================== 计算属性 ====================

/** 计算金额 */
const calculateAmount = computed(() => {
  if (!selectedCategory.value || !formData.quantity) return 0
  return selectedCategory.value.unit_price * formData.quantity
})

/** 是否可以提交 */
const canSubmit = computed(() => {
  return formData.category_id > 0 && 
         formData.quantity > 0 && 
         formData.work_date && 
         !submitting.value
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadCategories()
})

// ==================== 方法 ====================

/**
 * 加载分类列表
 */
async function loadCategories(): Promise<void> {
  loadingCategories.value = true
  
  try {
    const data = await getPieceWorkCategories(true)
    categories.value = data
  } catch (error) {
    console.error('加载分类失败:', error)
    uni.showToast({
      title: '加载分类失败',
      icon: 'none',
    })
  } finally {
    loadingCategories.value = false
  }
}

/**
 * 日期变化
 */
function onDateChange(e: any): void {
  formData.work_date = e.detail.value
}

/**
 * 选择分类
 * 
 * @param category - 分类对象
 */
function selectCategory(category: PieceWorkCategory): void {
  selectedCategory.value = category
  formData.category_id = category.id
}

/**
 * 减少数量
 */
function decreaseQuantity(): void {
  if (formData.quantity > 0) {
    formData.quantity--
  }
}

/**
 * 增加数量
 */
function increaseQuantity(): void {
  formData.quantity++
}

/**
 * 提交记录
 */
async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  
  // 确认提交
  uni.showModal({
    title: '确认提交',
    content: `确定要提交 ${selectedCategory.value?.name} ${formData.quantity} ${selectedCategory.value?.unit} 的计件记录吗？`,
    success: async (res) => {
      if (res.confirm) {
        await doSubmit()
      }
    },
  })
}

/**
 * 执行提交
 */
async function doSubmit(): Promise<void> {
  submitting.value = true
  
  try {
    await createPieceWorkRecord({
      category_id: formData.category_id,
      work_date: formData.work_date,
      quantity: formData.quantity,
      remark: formData.remark || undefined,
    })
    
    uni.showToast({
      title: '提交成功',
      icon: 'success',
    })
    
    // 延迟返回
    setTimeout(() => {
      navigateBack()
    }, 1500)
  } catch (error: any) {
    console.error('提交失败:', error)
    uni.showToast({
      title: error.message || '提交失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.entry-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 160rpx;
}

/* 表单区域 */
.form-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.form-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
}

/* 日期选择器 */
.form-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.picker-value {
  font-size: 28rpx;
  color: #333333;
}

.picker-arrow {
  font-size: 28rpx;
  color: #999999;
}

/* 加载和空状态 */
.loading-text,
.empty-text {
  font-size: 26rpx;
  color: #999999;
  text-align: center;
  padding: 32rpx 0;
}

/* 分类列表 */
.category-list {
  display: flex;
  flex-wrap: wrap;
  margin: -8rpx;
}

.category-item {
  width: calc(50% - 16rpx);
  margin: 8rpx;
  padding: 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
  
  &.active {
    background-color: #e6f0ff;
    border-color: #4a90e2;
  }
}

.category-name {
  font-size: 28rpx;
  color: #333333;
  display: block;
  margin-bottom: 8rpx;
}

.category-price {
  font-size: 24rpx;
  color: #ff6b35;
}

/* 数量输入 */
.quantity-input {
  display: flex;
  align-items: center;
  justify-content: center;
}

.quantity-btn {
  width: 80rpx;
  height: 80rpx;
  background-color: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-text {
  font-size: 48rpx;
  color: #333333;
  font-weight: bold;
}

.quantity-value {
  width: 200rpx;
  height: 80rpx;
  text-align: center;
  font-size: 48rpx;
  font-weight: bold;
  color: #333333;
  margin: 0 24rpx;
}

/* 金额预览 */
.preview-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  
  &.total {
    border-top: 1rpx solid #f0f0f0;
    margin-top: 12rpx;
    padding-top: 24rpx;
  }
}

.preview-label {
  font-size: 26rpx;
  color: #666666;
}

.preview-value {
  font-size: 26rpx;
  color: #333333;
  
  &.highlight {
    font-size: 36rpx;
    font-weight: bold;
    color: #ff6b35;
  }
}

/* 备注输入 */
.remark-input {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

/* 提交按钮 */
.submit-section {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.submit-btn {
  background: linear-gradient(135deg, #4a90e2 0%, #6ba3e8 100%);
  border-radius: 12rpx;
  padding: 28rpx;
  text-align: center;
  
  &.disabled {
    opacity: 0.5;
  }
}

.submit-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
