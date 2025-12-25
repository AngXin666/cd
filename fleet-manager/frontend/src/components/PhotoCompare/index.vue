<!--
  照片对比组件
  支持选择 2 张照片进行并排或叠加对比
  支持缩放和平移同步操作
  @module components/PhotoCompare
-->
<template>
  <view class="photo-compare">
    <!-- 对比模式切换 -->
    <view class="photo-compare__mode-switch">
      <view 
        class="photo-compare__mode-btn"
        :class="{ 'photo-compare__mode-btn--active': currentMode === 'side' }"
        @tap="handleModeChange('side')"
      >
        <text>并排对比</text>
      </view>
      <view 
        class="photo-compare__mode-btn"
        :class="{ 'photo-compare__mode-btn--active': currentMode === 'overlay' }"
        @tap="handleModeChange('overlay')"
      >
        <text>叠加对比</text>
      </view>
    </view>

    <!-- 选择提示 -->
    <view v-if="!hasSelection" class="photo-compare__hint">
      <text class="photo-compare__hint-text">
        {{ type === 'basic' ? '请选择同一角度的提车和还车照片进行对比' : '请选择 2 张照片进行对比' }}
      </text>
    </view>

    <!-- 对比视图区域 -->
    <view v-if="hasSelection" class="photo-compare__viewer">
      <!-- 并排对比模式 -->
      <view v-if="currentMode === 'side'" class="photo-compare__side-view">
        <!-- 左侧照片（提车/第一张） -->
        <view 
          class="photo-compare__side-item"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <view class="photo-compare__image-wrapper" :style="transformStyle">
            <image 
              v-if="selection.first"
              class="photo-compare__image"
              :src="selection.first.url"
              mode="aspectFit"
            />
          </view>
          <view v-if="selection.first" class="photo-compare__label">
            <text class="photo-compare__label-source">{{ getSourceLabel(selection.first.source) }}</text>
            <text v-if="showTimeLabel" class="photo-compare__label-time">{{ formatTime(selection.first.takenAt) }}</text>
          </view>
        </view>

        <!-- 分隔线 -->
        <view class="photo-compare__divider" />

        <!-- 右侧照片（还车/第二张） -->
        <view 
          class="photo-compare__side-item"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <view class="photo-compare__image-wrapper" :style="transformStyle">
            <image 
              v-if="selection.second"
              class="photo-compare__image"
              :src="selection.second.url"
              mode="aspectFit"
            />
          </view>
          <view v-if="selection.second" class="photo-compare__label">
            <text class="photo-compare__label-source">{{ getSourceLabel(selection.second.source) }}</text>
            <text v-if="showTimeLabel" class="photo-compare__label-time">{{ formatTime(selection.second.takenAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 叠加对比模式 -->
      <view v-else class="photo-compare__overlay-view">
        <view 
          class="photo-compare__overlay-container"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <!-- 底层照片 -->
          <view class="photo-compare__overlay-bottom" :style="transformStyle">
            <image 
              v-if="selection.first"
              class="photo-compare__image"
              :src="selection.first.url"
              mode="aspectFit"
            />
          </view>
          
          <!-- 顶层照片（可滑动显示） -->
          <view 
            class="photo-compare__overlay-top" 
            :style="[transformStyle, { clipPath: `inset(0 ${100 - overlayPosition}% 0 0)` }]"
          >
            <image 
              v-if="selection.second"
              class="photo-compare__image"
              :src="selection.second.url"
              mode="aspectFit"
            />
          </view>

          <!-- 滑动分隔线 -->
          <view 
            class="photo-compare__overlay-slider"
            :style="{ left: `${overlayPosition}%` }"
          >
            <view class="photo-compare__overlay-handle" />
          </view>
        </view>

        <!-- 叠加模式滑块控制 -->
        <view class="photo-compare__slider-control">
          <slider 
            :value="overlayPosition" 
            :min="0" 
            :max="100"
            activeColor="#1890ff"
            @change="handleSliderChange"
          />
        </view>

        <!-- 标签 -->
        <view class="photo-compare__overlay-labels">
          <view v-if="selection.first" class="photo-compare__overlay-label photo-compare__overlay-label--left">
            <text>{{ getSourceLabel(selection.first.source) }}</text>
          </view>
          <view v-if="selection.second" class="photo-compare__overlay-label photo-compare__overlay-label--right">
            <text>{{ getSourceLabel(selection.second.source) }}</text>
          </view>
        </view>
      </view>

      <!-- 缩放控制 -->
      <view class="photo-compare__zoom-control">
        <view class="photo-compare__zoom-btn" @tap="handleZoomOut">
          <text>-</text>
        </view>
        <text class="photo-compare__zoom-value">{{ Math.round(transform.scale * 100) }}%</text>
        <view class="photo-compare__zoom-btn" @tap="handleZoomIn">
          <text>+</text>
        </view>
        <view class="photo-compare__zoom-btn photo-compare__zoom-btn--reset" @tap="handleResetTransform">
          <text>重置</text>
        </view>
      </view>
    </view>

    <!-- 照片选择列表 -->
    <view class="photo-compare__selection">
      <view class="photo-compare__selection-title">
        <text>{{ type === 'basic' ? '选择对比角度' : '选择对比照片' }}</text>
      </view>

      <!-- 基本照片按角度分组 -->
      <view v-if="type === 'basic'" class="photo-compare__angle-list">
        <view 
          v-for="angle in availableAngles" 
          :key="angle"
          class="photo-compare__angle-item"
          :class="{ 'photo-compare__angle-item--selected': selectedAngle === angle }"
          @tap="handleAngleSelect(angle)"
        >
          <text class="photo-compare__angle-name">{{ getAngleLabel(angle) }}</text>
          <view class="photo-compare__angle-photos">
            <view 
              v-for="photo in getPhotosByAngle(angle)" 
              :key="photo.url"
              class="photo-compare__angle-photo"
            >
              <image :src="photo.url" mode="aspectFill" />
              <text class="photo-compare__angle-photo-label">{{ getSourceLabel(photo.source) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 车损照片任意选择 -->
      <view v-else class="photo-compare__damage-list">
        <view 
          v-for="(photo, index) in photos" 
          :key="photo.url"
          class="photo-compare__damage-item"
          :class="{ 
            'photo-compare__damage-item--selected': isPhotoSelected(photo),
            'photo-compare__damage-item--first': selection.first?.url === photo.url,
            'photo-compare__damage-item--second': selection.second?.url === photo.url
          }"
          @tap="handleDamagePhotoSelect(photo)"
        >
          <image :src="photo.url" mode="aspectFill" />
          <view class="photo-compare__damage-info">
            <text class="photo-compare__damage-source">{{ getSourceLabel(photo.source) }}</text>
            <text v-if="showTimeLabel" class="photo-compare__damage-time">{{ formatTime(photo.takenAt) }}</text>
          </view>
          <view v-if="isPhotoSelected(photo)" class="photo-compare__damage-badge">
            <text>{{ selection.first?.url === photo.url ? '1' : '2' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 清除选择按钮 -->
    <view v-if="hasSelection" class="photo-compare__clear">
      <view class="photo-compare__clear-btn" @tap="handleClearSelection">
        <text>清除选择</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 照片对比组件
 * 支持并排对比和叠加对比两种模式
 * 支持缩放和平移同步操作
 */
import { ref, computed, watch } from 'vue'
import type { 
  PhotoCompareProps, 
  PhotoItem, 
  PhotoAngle, 
  PhotoSource,
  CompareMode,
  CompareSelection,
  TransformState
} from './types'
import { ANGLE_LABELS, SOURCE_LABELS } from './types'

/**
 * 组件属性定义
 */
const props = withDefaults(defineProps<PhotoCompareProps>(), {
  mode: 'side',
  showTimeLabel: true,
  showSourceLabel: true
})

/**
 * 组件事件定义
 */
const emit = defineEmits<{
  /** 选择变化事件 */
  (e: 'selectionChange', selection: CompareSelection): void
  /** 模式变化事件 */
  (e: 'modeChange', mode: CompareMode): void
}>()

// ==================== 响应式状态 ====================

/** 当前对比模式 */
const currentMode = ref<CompareMode>(props.mode)

/** 当前选择的照片 */
const selection = ref<CompareSelection>({
  first: null,
  second: null
})

/** 当前选择的角度（基本照片模式） */
const selectedAngle = ref<PhotoAngle | null>(null)

/** 叠加模式滑块位置（0-100） */
const overlayPosition = ref(50)

/** 缩放平移状态 */
const transform = ref<TransformState>({
  scale: 1,
  translateX: 0,
  translateY: 0
})

/** 触摸状态 */
const touchState = ref({
  startX: 0,
  startY: 0,
  startDistance: 0,
  isPinching: false,
  isDragging: false
})

// ==================== 计算属性 ====================

/**
 * 是否已选择照片
 */
const hasSelection = computed(() => {
  return selection.value.first !== null && selection.value.second !== null
})

/**
 * 可用的角度列表（有提车和还车照片的角度）
 */
const availableAngles = computed(() => {
  const angles = new Set<PhotoAngle>()
  
  // 收集所有有照片的角度
  props.photos.forEach(photo => {
    if (photo.angle) {
      angles.add(photo.angle)
    }
  })
  
  // 过滤出同时有提车和还车照片的角度
  return Array.from(angles).filter(angle => {
    const hasPickup = props.photos.some(p => p.angle === angle && p.source === 'pickup')
    const hasReturn = props.photos.some(p => p.angle === angle && p.source === 'return')
    return hasPickup && hasReturn
  })
})

/**
 * 变换样式
 */
const transformStyle = computed(() => ({
  transform: `scale(${transform.value.scale}) translate(${transform.value.translateX}px, ${transform.value.translateY}px)`
}))

// ==================== 方法 ====================

/**
 * 获取角度标签
 * @param angle - 角度枚举值
 * @returns 中文标签
 */
const getAngleLabel = (angle: PhotoAngle): string => {
  return ANGLE_LABELS[angle] || angle
}

/**
 * 获取来源标签
 * @param source - 来源枚举值
 * @returns 中文标签
 */
const getSourceLabel = (source: PhotoSource): string => {
  return SOURCE_LABELS[source] || source
}

/**
 * 格式化时间
 * @param timeStr - 时间字符串
 * @returns 格式化后的时间
 */
const formatTime = (timeStr: string): string => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * 根据角度获取照片
 * @param angle - 角度
 * @returns 该角度的照片列表
 */
const getPhotosByAngle = (angle: PhotoAngle): PhotoItem[] => {
  return props.photos.filter(p => p.angle === angle)
}

/**
 * 检查照片是否被选中
 * @param photo - 照片项
 * @returns 是否被选中
 */
const isPhotoSelected = (photo: PhotoItem): boolean => {
  return selection.value.first?.url === photo.url || selection.value.second?.url === photo.url
}

/**
 * 处理模式切换
 * @param mode - 新模式
 */
const handleModeChange = (mode: CompareMode): void => {
  currentMode.value = mode
  emit('modeChange', mode)
}

/**
 * 处理角度选择（基本照片模式）
 * @param angle - 选择的角度
 */
const handleAngleSelect = (angle: PhotoAngle): void => {
  selectedAngle.value = angle
  
  // 自动选择该角度的提车和还车照片
  const photos = getPhotosByAngle(angle)
  const pickupPhoto = photos.find(p => p.source === 'pickup')
  const returnPhoto = photos.find(p => p.source === 'return')
  
  selection.value = {
    first: pickupPhoto || null,
    second: returnPhoto || null
  }
  
  // 重置变换状态
  handleResetTransform()
  
  emit('selectionChange', selection.value)
}

/**
 * 处理车损照片选择
 * @param photo - 选择的照片
 */
const handleDamagePhotoSelect = (photo: PhotoItem): void => {
  // 如果已选中，取消选择
  if (selection.value.first?.url === photo.url) {
    selection.value.first = selection.value.second
    selection.value.second = null
  } else if (selection.value.second?.url === photo.url) {
    selection.value.second = null
  } else {
    // 添加选择
    if (!selection.value.first) {
      selection.value.first = photo
    } else if (!selection.value.second) {
      selection.value.second = photo
    } else {
      // 已选择两张，替换第二张
      selection.value.second = photo
    }
  }
  
  // 重置变换状态
  if (hasSelection.value) {
    handleResetTransform()
  }
  
  emit('selectionChange', selection.value)
}

/**
 * 清除选择
 */
const handleClearSelection = (): void => {
  selection.value = {
    first: null,
    second: null
  }
  selectedAngle.value = null
  handleResetTransform()
  emit('selectionChange', selection.value)
}

/**
 * 处理滑块变化（叠加模式）
 * @param e - 滑块事件
 */
const handleSliderChange = (e: any): void => {
  overlayPosition.value = e.detail.value
}

/**
 * 放大
 */
const handleZoomIn = (): void => {
  // 最大放大 3 倍
  if (transform.value.scale < 3) {
    transform.value.scale = Math.min(3, transform.value.scale + 0.25)
  }
}

/**
 * 缩小
 */
const handleZoomOut = (): void => {
  // 最小缩小到 0.5 倍
  if (transform.value.scale > 0.5) {
    transform.value.scale = Math.max(0.5, transform.value.scale - 0.25)
  }
}

/**
 * 重置变换
 */
const handleResetTransform = (): void => {
  transform.value = {
    scale: 1,
    translateX: 0,
    translateY: 0
  }
  overlayPosition.value = 50
}

/**
 * 计算两点之间的距离
 * @param touches - 触摸点列表
 * @returns 距离
 */
const getDistance = (touches: TouchList): number => {
  if (touches.length < 2) return 0
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 处理触摸开始
 * @param e - 触摸事件
 */
const handleTouchStart = (e: TouchEvent): void => {
  const touches = e.touches
  
  if (touches.length === 2) {
    // 双指缩放
    touchState.value.isPinching = true
    touchState.value.startDistance = getDistance(touches)
  } else if (touches.length === 1) {
    // 单指拖动
    touchState.value.isDragging = true
    touchState.value.startX = touches[0].clientX - transform.value.translateX
    touchState.value.startY = touches[0].clientY - transform.value.translateY
  }
}

/**
 * 处理触摸移动
 * @param e - 触摸事件
 */
const handleTouchMove = (e: TouchEvent): void => {
  const touches = e.touches
  
  if (touchState.value.isPinching && touches.length === 2) {
    // 双指缩放
    const currentDistance = getDistance(touches)
    const scale = currentDistance / touchState.value.startDistance
    const newScale = Math.max(0.5, Math.min(3, transform.value.scale * scale))
    transform.value.scale = newScale
    touchState.value.startDistance = currentDistance
  } else if (touchState.value.isDragging && touches.length === 1) {
    // 单指拖动（仅在放大时有效）
    if (transform.value.scale > 1) {
      transform.value.translateX = touches[0].clientX - touchState.value.startX
      transform.value.translateY = touches[0].clientY - touchState.value.startY
    }
  }
}

/**
 * 处理触摸结束
 */
const handleTouchEnd = (): void => {
  touchState.value.isPinching = false
  touchState.value.isDragging = false
}

// ==================== 监听器 ====================

// 监听 mode 属性变化
watch(() => props.mode, (newMode) => {
  currentMode.value = newMode
})

// 监听 photos 变化，重置选择
watch(() => props.photos, () => {
  handleClearSelection()
}, { deep: true })
</script>

<style lang="scss">
/**
 * 照片对比组件样式
 */
.photo-compare {
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  min-height: 100vh;

  /* 模式切换 */
  &__mode-switch {
    display: flex;
    justify-content: center;
    padding: 16px;
    background-color: #fff;
    gap: 16px;
  }

  &__mode-btn {
    padding: 8px 24px;
    border-radius: 20px;
    background-color: #f0f0f0;
    color: #666;
    font-size: 14px;
    transition: all 0.2s;

    &--active {
      background-color: #1890ff;
      color: #fff;
    }
  }

  /* 选择提示 */
  &__hint {
    padding: 32px 16px;
    text-align: center;
    background-color: #fff;
    margin-bottom: 8px;
  }

  &__hint-text {
    color: #999;
    font-size: 14px;
  }

  /* 对比视图区域 */
  &__viewer {
    background-color: #000;
    position: relative;
  }

  /* 并排对比模式 */
  &__side-view {
    display: flex;
    height: 300px;
  }

  &__side-item {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  &__divider {
    width: 2px;
    background-color: #fff;
  }

  &__image-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: center center;
  }

  &__image {
    width: 100%;
    height: 100%;
  }

  &__label {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__label-source {
    display: inline-block;
    padding: 2px 8px;
    background-color: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 12px;
    border-radius: 4px;
    align-self: flex-start;
  }

  &__label-time {
    color: rgba(255, 255, 255, 0.8);
    font-size: 10px;
  }

  /* 叠加对比模式 */
  &__overlay-view {
    position: relative;
  }

  &__overlay-container {
    height: 300px;
    position: relative;
    overflow: hidden;
  }

  &__overlay-bottom,
  &__overlay-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: center center;
  }

  &__overlay-top {
    z-index: 1;
  }

  &__overlay-slider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: #fff;
    z-index: 2;
    transform: translateX(-50%);
  }

  &__overlay-handle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 32px;
    height: 32px;
    background-color: #fff;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

    &::before,
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 8px;
      height: 2px;
      background-color: #666;
      transform: translateY(-50%);
    }

    &::before {
      left: 6px;
    }

    &::after {
      right: 6px;
    }
  }

  &__slider-control {
    padding: 16px;
    background-color: rgba(0, 0, 0, 0.8);
  }

  &__overlay-labels {
    display: flex;
    justify-content: space-between;
    padding: 8px 16px;
    background-color: rgba(0, 0, 0, 0.8);
  }

  &__overlay-label {
    padding: 4px 12px;
    background-color: rgba(255, 255, 255, 0.2);
    color: #fff;
    font-size: 12px;
    border-radius: 4px;
  }

  /* 缩放控制 */
  &__zoom-control {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background-color: rgba(0, 0, 0, 0.8);
    gap: 16px;
  }

  &__zoom-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.2);
    color: #fff;
    font-size: 20px;
    border-radius: 50%;

    &--reset {
      width: auto;
      padding: 0 16px;
      border-radius: 18px;
      font-size: 14px;
    }
  }

  &__zoom-value {
    color: #fff;
    font-size: 14px;
    min-width: 50px;
    text-align: center;
  }

  /* 照片选择列表 */
  &__selection {
    flex: 1;
    background-color: #fff;
    margin-top: 8px;
    padding: 16px;
  }

  &__selection-title {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin-bottom: 16px;
  }

  /* 角度列表（基本照片） */
  &__angle-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__angle-item {
    padding: 12px;
    background-color: #f9f9f9;
    border-radius: 8px;
    border: 2px solid transparent;
    transition: all 0.2s;

    &--selected {
      border-color: #1890ff;
      background-color: #e6f7ff;
    }
  }

  &__angle-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 8px;
    display: block;
  }

  &__angle-photos {
    display: flex;
    gap: 8px;
  }

  &__angle-photo {
    width: 80px;
    height: 60px;
    position: relative;
    border-radius: 4px;
    overflow: hidden;

    image {
      width: 100%;
      height: 100%;
    }
  }

  &__angle-photo-label {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 2px 4px;
    background-color: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 10px;
    text-align: center;
  }

  /* 车损照片列表 */
  &__damage-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  &__damage-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid transparent;
    transition: all 0.2s;

    image {
      width: 100%;
      height: 100%;
    }

    &--selected {
      border-color: #1890ff;
    }

    &--first {
      border-color: #52c41a;
    }

    &--second {
      border-color: #faad14;
    }
  }

  &__damage-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 4px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    display: flex;
    flex-direction: column;
  }

  &__damage-source {
    color: #fff;
    font-size: 10px;
  }

  &__damage-time {
    color: rgba(255, 255, 255, 0.8);
    font-size: 9px;
  }

  &__damage-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    background-color: #1890ff;
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 清除选择按钮 */
  &__clear {
    padding: 16px;
    background-color: #fff;
    margin-top: 8px;
  }

  &__clear-btn {
    padding: 12px;
    text-align: center;
    background-color: #f5f5f5;
    color: #666;
    font-size: 14px;
    border-radius: 8px;
  }
}
</style>
