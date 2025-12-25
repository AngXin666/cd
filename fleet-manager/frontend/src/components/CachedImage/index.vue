<!--
  缓存图片组件
  提供图片加载状态显示、缓存支持和加载失败重试功能
  @module components/CachedImage
-->
<template>
  <view class="cached-image" :style="containerStyle">
    <!-- 加载中状态 -->
    <view v-if="loading" class="cached-image__loading">
      <view class="cached-image__spinner" />
      <text v-if="showLoadingText" class="cached-image__loading-text">加载中...</text>
    </view>

    <!-- 加载失败状态 -->
    <view v-else-if="error" class="cached-image__error" @tap="handleRetry">
      <text class="cached-image__error-icon">!</text>
      <text class="cached-image__error-text">{{ errorText }}</text>
      <text v-if="showRetryButton" class="cached-image__retry-btn">点击重试</text>
    </view>

    <!-- 图片内容 -->
    <image
      v-else
      class="cached-image__img"
      :src="displaySrc"
      :mode="mode"
      :lazy-load="lazyLoad"
      @load="handleLoad"
      @error="handleError"
    />

    <!-- 预览遮罩 -->
    <view v-if="previewable && !loading && !error" class="cached-image__preview-mask" @tap="handlePreview">
      <text class="cached-image__preview-icon">🔍</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 缓存图片组件
 * 支持图片缓存、加载状态显示和失败重试
 */
import { ref, computed, watch, onMounted } from 'vue'
import { getImageCacheManager } from '@/utils/imageCache'
import { getImagePreloader, PreloadPriority } from '@/utils/imagePreloader'

/**
 * 组件属性定义
 */
interface Props {
  /** 图片 URL */
  src: string
  /** 图片显示模式 */
  mode?: 'scaleToFill' | 'aspectFit' | 'aspectFill' | 'widthFix' | 'heightFix'
  /** 容器宽度 */
  width?: string | number
  /** 容器高度 */
  height?: string | number
  /** 是否启用缓存 */
  useCache?: boolean
  /** 是否启用懒加载 */
  lazyLoad?: boolean
  /** 是否可预览 */
  previewable?: boolean
  /** 预览图片列表（用于多图预览） */
  previewList?: string[]
  /** 当前图片在预览列表中的索引 */
  previewIndex?: number
  /** 是否显示加载文字 */
  showLoadingText?: boolean
  /** 是否显示重试按钮 */
  showRetryButton?: boolean
  /** 加载失败时的错误文字 */
  errorText?: string
  /** 占位图 URL */
  placeholder?: string
  /** 最大重试次数 */
  maxRetries?: number
  /** 预加载优先级 */
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

// 定义属性默认值
const props = withDefaults(defineProps<Props>(), {
  mode: 'aspectFill',
  width: '100%',
  height: '100%',
  useCache: true,
  lazyLoad: true,
  previewable: false,
  previewList: () => [],
  previewIndex: 0,
  showLoadingText: false,
  showRetryButton: true,
  errorText: '加载失败',
  placeholder: '',
  maxRetries: 2,
  priority: 'normal'
})

// 定义事件
const emit = defineEmits<{
  /** 图片加载完成 */
  (e: 'load'): void
  /** 图片加载失败 */
  (e: 'error', error: Error): void
  /** 点击重试 */
  (e: 'retry'): void
}>()

// 响应式状态
/** 是否正在加载 */
const loading = ref(true)
/** 是否加载失败 */
const error = ref(false)
/** 实际显示的图片 URL（可能是缓存的 base64） */
const displaySrc = ref('')
/** 重试次数 */
const retryCount = ref(0)

// 获取缓存管理器和预加载器
const cacheManager = getImageCacheManager()
const preloader = getImagePreloader()

/**
 * 容器样式计算
 */
const containerStyle = computed(() => {
  const width = typeof props.width === 'number' ? `${props.width}px` : props.width
  const height = typeof props.height === 'number' ? `${props.height}px` : props.height
  return {
    width,
    height
  }
})

/**
 * 将优先级字符串转换为枚举值
 * @param priority - 优先级字符串
 * @returns 优先级枚举值
 */
const getPriorityValue = (priority: string): PreloadPriority => {
  const map: Record<string, PreloadPriority> = {
    low: PreloadPriority.LOW,
    normal: PreloadPriority.NORMAL,
    high: PreloadPriority.HIGH,
    urgent: PreloadPriority.URGENT
  }
  return map[priority] || PreloadPriority.NORMAL
}

/**
 * 加载图片
 * 优先从缓存读取，缓存未命中则从网络加载
 */
const loadImage = async (): Promise<void> => {
  // 如果没有 src，直接返回
  if (!props.src) {
    loading.value = false
    error.value = true
    return
  }

  loading.value = true
  error.value = false

  try {
    // 如果启用缓存，尝试从缓存获取
    if (props.useCache) {
      // 初始化缓存管理器
      await cacheManager.initialize()
      
      // 检查缓存是否存在
      const hasCache = await cacheManager.hasCache(props.src)
      
      if (hasCache) {
        // 从缓存获取图片
        const cachedImage = await cacheManager.getImage(props.src)
        displaySrc.value = cachedImage
        loading.value = false
        emit('load')
        return
      }
    }

    // 缓存未命中，使用预加载器加载
    // 先设置原始 URL，让 image 组件开始加载
    displaySrc.value = props.src

    // 同时触发预加载（会自动缓存）
    if (props.useCache) {
      preloader.preload(props.src, {
        priority: getPriorityValue(props.priority)
      })
    }
  } catch (err) {
    console.error('[CachedImage] 加载图片失败:', err)
    handleLoadError(err as Error)
  }
}

/**
 * 处理图片加载完成
 */
const handleLoad = (): void => {
  loading.value = false
  error.value = false
  emit('load')
}

/**
 * 处理图片加载失败
 */
const handleError = (): void => {
  handleLoadError(new Error('图片加载失败'))
}

/**
 * 处理加载错误
 * @param err - 错误对象
 */
const handleLoadError = (err: Error): void => {
  // 检查是否可以重试
  if (retryCount.value < props.maxRetries) {
    retryCount.value++
    // 延迟重试
    setTimeout(() => {
      loadImage()
    }, 1000 * retryCount.value) // 递增延迟
    return
  }

  // 超过重试次数，显示错误状态
  loading.value = false
  error.value = true
  
  // 如果有占位图，显示占位图
  if (props.placeholder) {
    displaySrc.value = props.placeholder
    error.value = false
  }
  
  emit('error', err)
}

/**
 * 处理重试点击
 */
const handleRetry = (): void => {
  retryCount.value = 0
  emit('retry')
  loadImage()
}

/**
 * 处理图片预览
 */
const handlePreview = (): void => {
  // 构建预览列表
  const urls = props.previewList.length > 0 
    ? props.previewList 
    : [props.src]
  
  // 调用 UniApp 预览图片 API
  uni.previewImage({
    current: props.src,
    urls
  })
}

// 监听 src 变化，重新加载图片
watch(() => props.src, () => {
  retryCount.value = 0
  loadImage()
})

// 组件挂载时加载图片
onMounted(() => {
  loadImage()
})
</script>

<style lang="scss">
/**
 * 缓存图片组件样式
 */
.cached-image {
  position: relative;
  overflow: hidden;
  background-color: #f5f5f5;

  /* 加载中状态 */
  &__loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
  }

  /* 加载动画 */
  &__spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e0e0e0;
    border-top-color: #1890ff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* 加载文字 */
  &__loading-text {
    margin-top: 8px;
    font-size: 12px;
    color: #999;
  }

  /* 错误状态 */
  &__error {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
  }

  /* 错误图标 */
  &__error-icon {
    width: 40px;
    height: 40px;
    line-height: 40px;
    text-align: center;
    font-size: 24px;
    font-weight: bold;
    color: #fff;
    background-color: #ff4d4f;
    border-radius: 50%;
  }

  /* 错误文字 */
  &__error-text {
    margin-top: 8px;
    font-size: 12px;
    color: #999;
  }

  /* 重试按钮 */
  &__retry-btn {
    margin-top: 8px;
    padding: 4px 12px;
    font-size: 12px;
    color: #1890ff;
    background-color: #e6f7ff;
    border-radius: 4px;
  }

  /* 图片 */
  &__img {
    width: 100%;
    height: 100%;
  }

  /* 预览遮罩 */
  &__preview-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    opacity: 0;
    transition: opacity 0.2s;

    &:active {
      opacity: 1;
      background-color: rgba(0, 0, 0, 0.3);
    }
  }

  /* 预览图标 */
  &__preview-icon {
    font-size: 24px;
  }
}

/* 加载动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
