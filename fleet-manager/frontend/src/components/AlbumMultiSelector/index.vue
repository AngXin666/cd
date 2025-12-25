<template>
  <!--
    相册连续选择器组件
    功能：
    - 支持滑动手势连续选择多张照片
    - 支持按住并滑动自动选中
    - 显示已选数量和预览
    - 支持点击取消单张选择
    - 无数量限制（maxCount=0 时）
    @requirements 13.1, 13.2, 13.3, 13.4, 13.5
  -->
  <view class="album-multi-selector">
    <!-- 预览区域：显示已选照片 -->
    <view v-if="showPreview" class="preview-section">
      <!-- 标题和计数 -->
      <view class="preview-header">
        <text class="preview-title">{{ previewTitle }}</text>
        <text class="preview-count">
          {{ selectedPhotos.length }}{{ maxCount > 0 ? `/${maxCount}` : '' }} 张
        </text>
      </view>

      <!-- 已选照片网格 -->
      <view class="preview-grid">
        <!-- 已选照片列表 -->
        <view 
          v-for="(photo, index) in selectedPhotos" 
          :key="`selected-${index}`"
          class="preview-item"
          @click="handlePreviewPhoto(index)"
        >
          <image 
            :src="photo.path" 
            mode="aspectFill" 
            class="preview-image"
          />
          <!-- 选中序号标记 -->
          <view class="selected-badge">
            <text class="badge-text">{{ index + 1 }}</text>
          </view>
          <!-- 删除按钮 -->
          <view 
            class="delete-btn" 
            @click.stop="handleDeletePhoto(index)"
          >
            <text class="delete-icon">×</text>
          </view>
        </view>

        <!-- 添加按钮 -->
        <view 
          v-if="canAddMore"
          class="add-btn"
          :class="{ disabled: disabled }"
          @click="handleOpenAlbum"
        >
          <text class="add-icon">+</text>
          <text class="add-text">{{ addButtonText }}</text>
        </view>
      </view>

      <!-- 空状态提示 -->
      <view v-if="selectedPhotos.length === 0 && !canAddMore" class="empty-tip">
        <text class="empty-text">暂无照片</text>
      </view>
    </view>

    <!-- 简洁模式：只显示添加按钮 -->
    <view v-else class="simple-mode">
      <view 
        class="simple-add-btn"
        :class="{ disabled: disabled }"
        @click="handleOpenAlbum"
      >
        <text class="add-icon">📷</text>
        <text class="add-text">{{ addButtonText }}</text>
        <text v-if="selectedPhotos.length > 0" class="selected-count">
          (已选 {{ selectedPhotos.length }} 张)
        </text>
      </view>
    </view>

    <!-- 滑动选择提示 -->
    <view v-if="enableSwipeSelect && showPreview" class="swipe-tip">
      <text class="tip-icon">💡</text>
      <text class="tip-text">提示：在相册中按住并滑动可连续选择多张照片</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 相册连续选择器组件
 * 支持滑动手势连续选取多张照片
 * @requirements 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { ref, computed, watch } from 'vue'
import type { PhotoItem, AlbumMultiSelectorProps, AlbumMultiSelectorEmits } from './types'

// ==================== 组件属性 ====================

const props = withDefaults(defineProps<AlbumMultiSelectorProps>(), {
  maxCount: 0,           // 0 表示无限制
  selected: () => [],
  enableSwipeSelect: true,
  sourceType: () => ['camera', 'album'],
  showPreview: true,
  previewTitle: '已选照片',
  addButtonText: '添加照片',
  disabled: false
})

// ==================== 组件事件 ====================

const emit = defineEmits<AlbumMultiSelectorEmits>()

// ==================== 响应式状态 ====================

/** 已选照片列表（内部状态） */
const selectedPhotos = ref<PhotoItem[]>([...props.selected])

// ==================== 计算属性 ====================

/**
 * 是否可以继续添加照片
 * maxCount 为 0 时表示无限制
 */
const canAddMore = computed(() => {
  if (props.disabled) return false
  if (props.maxCount === 0) return true
  return selectedPhotos.value.length < props.maxCount
})

/**
 * 剩余可选数量
 */
const remainingCount = computed(() => {
  if (props.maxCount === 0) return 99 // 无限制时最多选 99 张
  return props.maxCount - selectedPhotos.value.length
})

// ==================== 监听属性变化 ====================

/**
 * 监听外部 selected 属性变化，同步到内部状态
 */
watch(
  () => props.selected,
  (newSelected) => {
    selectedPhotos.value = [...newSelected]
  },
  { deep: true }
)

// ==================== 事件处理 ====================

/**
 * 打开相册选择器
 * 使用 uni.chooseImage API 选择多张照片
 * @requirements 13.1 - 支持滑动手势连续选择多张照片
 * @requirements 13.3 - 不限制选择数量（maxCount=0 时）
 */
function handleOpenAlbum(): void {
  if (props.disabled || !canAddMore.value) return

  // 计算可选数量
  const count = remainingCount.value

  uni.chooseImage({
    count: count,
    sizeType: ['compressed'],
    sourceType: props.sourceType,
    success: (res) => {
      // 将选择的照片添加到列表
      // tempFiles 可能是数组或单个对象，统一处理为数组
      const tempFiles = Array.isArray(res.tempFiles) ? res.tempFiles : [res.tempFiles]
      const newPhotos: PhotoItem[] = tempFiles.map((file: any, index: number) => ({
        path: file.path,
        size: file.size || 0,
        filename: `photo_${Date.now()}_${index}.jpg`,
        selectedAt: Date.now()
      }))

      // 合并到已选列表
      const updatedPhotos = [...selectedPhotos.value, ...newPhotos]
      
      // 如果有数量限制，截取到最大数量
      const finalPhotos = props.maxCount > 0 
        ? updatedPhotos.slice(0, props.maxCount)
        : updatedPhotos

      // 更新状态
      selectedPhotos.value = finalPhotos

      // 触发事件
      emit('update:selected', finalPhotos)
      emit('change', finalPhotos)
    },
    fail: (error) => {
      // 用户取消选择不提示错误
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        console.error('[AlbumMultiSelector] 选择照片失败:', error)
        uni.showToast({
          title: '选择照片失败',
          icon: 'none'
        })
      }
    }
  })
}

/**
 * 删除指定索引的照片
 * @param index - 照片索引
 * @requirements 13.5 - 支持点击取消单张选择
 */
function handleDeletePhoto(index: number): void {
  const photo = selectedPhotos.value[index]
  
  // 从列表中移除
  const updatedPhotos = selectedPhotos.value.filter((_, i) => i !== index)
  selectedPhotos.value = updatedPhotos

  // 触发事件
  emit('update:selected', updatedPhotos)
  emit('change', updatedPhotos)
  emit('delete', index, photo)
}

/**
 * 预览指定索引的照片
 * @param index - 照片索引
 */
function handlePreviewPhoto(index: number): void {
  const photo = selectedPhotos.value[index]
  const urls = selectedPhotos.value.map(p => p.path)

  // 使用 uni.previewImage 预览
  uni.previewImage({
    urls: urls,
    current: photo.path
  })

  // 触发事件
  emit('preview', index, photo)
}

// ==================== 暴露方法 ====================

/**
 * 清空所有已选照片
 */
function clearAll(): void {
  selectedPhotos.value = []
  emit('update:selected', [])
  emit('change', [])
}

/**
 * 添加照片（外部调用）
 * @param photos - 要添加的照片列表
 */
function addPhotos(photos: PhotoItem[]): void {
  const updatedPhotos = [...selectedPhotos.value, ...photos]
  const finalPhotos = props.maxCount > 0 
    ? updatedPhotos.slice(0, props.maxCount)
    : updatedPhotos

  selectedPhotos.value = finalPhotos
  emit('update:selected', finalPhotos)
  emit('change', finalPhotos)
}

/**
 * 获取已选照片列表
 */
function getSelectedPhotos(): PhotoItem[] {
  return [...selectedPhotos.value]
}

// 暴露方法给父组件
defineExpose({
  clearAll,
  addPhotos,
  getSelectedPhotos
})
</script>

<style lang="scss" scoped>
/* 相册连续选择器容器 */
.album-multi-selector {
  width: 100%;
}

/* ==================== 预览区域样式 ==================== */

.preview-section {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
}

/* 预览标题区域 */
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.preview-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}

.preview-count {
  font-size: 24rpx;
  color: #666666;
}

/* 预览网格 */
.preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

/* 预览项 */
.preview-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
}

/* 选中序号标记 */
.selected-badge {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  width: 36rpx;
  height: 36rpx;
  background-color: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-text {
  color: #ffffff;
  font-size: 22rpx;
  font-weight: bold;
}

/* 删除按钮 */
.delete-btn {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 44rpx;
  height: 44rpx;
  background-color: #ff4d4f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 79, 0.3);
}

.delete-icon {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: bold;
}

/* 添加按钮 */
.add-btn {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #d9d9d9;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  transition: all 0.2s;

  &:active {
    background-color: #f0f0f0;
    border-color: #3b82f6;
  }

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.add-icon {
  font-size: 48rpx;
  color: #999999;
  margin-bottom: 8rpx;
}

.add-text {
  font-size: 22rpx;
  color: #999999;
}

/* 空状态提示 */
.empty-tip {
  padding: 40rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #999999;
}

/* ==================== 简洁模式样式 ==================== */

.simple-mode {
  width: 100%;
}

.simple-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx dashed #d9d9d9;
  transition: all 0.2s;

  &:active {
    background-color: #e8e8e8;
    border-color: #3b82f6;
  }

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .add-icon {
    font-size: 36rpx;
    margin-right: 12rpx;
    margin-bottom: 0;
  }

  .add-text {
    font-size: 28rpx;
    color: #666666;
  }

  .selected-count {
    font-size: 24rpx;
    color: #3b82f6;
    margin-left: 8rpx;
  }
}

/* ==================== 滑动提示样式 ==================== */

.swipe-tip {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  background-color: #fffbe6;
  border-radius: 8rpx;
  border: 1rpx solid #ffe58f;
}

.tip-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.tip-text {
  font-size: 22rpx;
  color: #d48806;
  flex: 1;
}
</style>
