<template>
  <!--
    照片拍摄组件
    支持拍照/相册选择、预览、删除
    @props title - 照片标题
    @props description - 照片描述
    @props tips - 拍摄提示数组
    @props value - 照片路径
    @props required - 是否必填
    @emits update:value - 照片路径变化
  -->
  <view class="photo-capture">
    <!-- 标题区域 -->
    <view class="capture-header">
      <text class="capture-title">
        {{ title }}
        <text v-if="required" class="required-mark">*</text>
      </text>
      <text v-if="description" class="capture-desc">{{ description }}</text>
    </view>

    <!-- 照片区域 -->
    <view class="capture-content">
      <!-- 已有照片 - 显示预览 -->
      <view v-if="modelValue" class="photo-preview" @click="handlePreview">
        <image 
          class="preview-image" 
          :src="modelValue" 
          mode="aspectFill"
        />
        <!-- 删除按钮 -->
        <view class="delete-btn" @click.stop="handleDelete">
          <text class="delete-icon">×</text>
        </view>
        <!-- 重拍按钮 -->
        <view class="retake-btn" @click.stop="handleChoose">
          <text class="retake-text">重拍</text>
        </view>
      </view>

      <!-- 无照片 - 显示拍照按钮 -->
      <view v-else class="capture-placeholder" @click="handleChoose">
        <view class="placeholder-icon">📷</view>
        <text class="placeholder-text">点击拍照</text>
      </view>
    </view>

    <!-- 拍摄提示 -->
    <view v-if="tips && tips.length > 0" class="capture-tips">
      <text v-for="(tip, index) in tips" :key="index" class="tip-item">
        • {{ tip }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 照片拍摄组件
 * 用于拍摄或选择照片，支持预览和删除
 * 参考主项目 src/components/PhotoCapture/index.tsx
 */

import { ref } from 'vue'

/**
 * 组件属性
 */
interface Props {
  /** 照片标题 */
  title: string
  /** 照片描述（可选） */
  description?: string
  /** 拍摄提示数组（可选） */
  tips?: string[]
  /** 照片路径（v-model） */
  modelValue?: string
  /** 是否必填 */
  required?: boolean
  /** 图片来源类型 */
  sourceType?: ('camera' | 'album')[]
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  tips: () => [],
  modelValue: '',
  required: false,
  sourceType: () => ['camera', 'album']
})

/**
 * 组件事件
 */
const emit = defineEmits<{
  /** 照片路径变化 */
  (e: 'update:modelValue', value: string): void
  /** 照片变化回调 */
  (e: 'change', value: string): void
}>()

/**
 * 选择/拍摄照片
 */
function handleChoose(): void {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: props.sourceType,
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      emit('update:modelValue', tempFilePath)
      emit('change', tempFilePath)
    },
    fail: (error) => {
      // 用户取消选择不提示错误
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        console.error('选择照片失败:', error)
        uni.showToast({
          title: '选择照片失败',
          icon: 'none'
        })
      }
    }
  })
}

/**
 * 预览照片
 */
function handlePreview(): void {
  if (!props.modelValue) return
  
  uni.previewImage({
    urls: [props.modelValue],
    current: props.modelValue
  })
}

/**
 * 删除照片
 */
function handleDelete(): void {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这张照片吗？',
    success: (res) => {
      if (res.confirm) {
        emit('update:modelValue', '')
        emit('change', '')
      }
    }
  })
}
</script>

<style lang="scss" scoped>
/* 照片拍摄组件容器 */
.photo-capture {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

/* 标题区域 */
.capture-header {
  margin-bottom: 16rpx;
}

.capture-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}

.required-mark {
  color: #ff4d4f;
  margin-left: 4rpx;
}

.capture-desc {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 照片内容区域 */
.capture-content {
  width: 100%;
}

/* 照片预览 */
.photo-preview {
  position: relative;
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
}

/* 删除按钮 */
.delete-btn {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 48rpx;
  height: 48rpx;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-icon {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
}

/* 重拍按钮 */
.retake-btn {
  position: absolute;
  bottom: 12rpx;
  right: 12rpx;
  padding: 8rpx 20rpx;
  background-color: rgba(59, 130, 246, 0.9);
  border-radius: 8rpx;
}

.retake-text {
  color: #ffffff;
  font-size: 24rpx;
}

/* 拍照占位区域 */
.capture-placeholder {
  width: 100%;
  height: 200rpx;
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
}

.placeholder-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.placeholder-text {
  font-size: 26rpx;
  color: #999999;
}

/* 拍摄提示 */
.capture-tips {
  margin-top: 12rpx;
  padding: 12rpx;
  background-color: #fffbe6;
  border-radius: 8rpx;
  border: 1rpx solid #ffe58f;
}

.tip-item {
  display: block;
  font-size: 22rpx;
  color: #d48806;
  line-height: 1.6;
}
</style>
