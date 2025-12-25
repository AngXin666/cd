<template>
  <!--
    步骤指示器组件
    显示多步骤流程的当前进度
    @props steps - 步骤数组，包含 title 和 description
    @props currentStep - 当前步骤索引（从0开始）
  -->
  <view class="step-indicator">
    <view 
      v-for="(step, index) in steps" 
      :key="index"
      :class="['step-item', getStepClass(index)]"
    >
      <!-- 步骤圆点 -->
      <view class="step-circle">
        <view v-if="index < currentStep" class="step-check">✓</view>
        <text v-else class="step-number">{{ index + 1 }}</text>
      </view>
      
      <!-- 步骤内容 -->
      <view class="step-content">
        <text class="step-title">{{ step.title }}</text>
        <text v-if="step.description" class="step-desc">{{ step.description }}</text>
      </view>
      
      <!-- 连接线（最后一个步骤不显示） -->
      <view v-if="index < steps.length - 1" :class="['step-line', { completed: index < currentStep }]"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 步骤指示器组件
 * 用于显示多步骤流程的当前进度
 * 参考主项目 src/components/StepIndicator/index.tsx
 */

import { computed } from 'vue'

/**
 * 步骤定义接口
 */
interface Step {
  /** 步骤标题 */
  title: string
  /** 步骤描述（可选） */
  description?: string
}

/**
 * 组件属性
 */
interface Props {
  /** 步骤数组 */
  steps: Step[]
  /** 当前步骤索引（从0开始） */
  currentStep: number
}

const props = withDefaults(defineProps<Props>(), {
  steps: () => [],
  currentStep: 0
})

/**
 * 获取步骤的样式类
 * @param index - 步骤索引
 * @returns 样式类名
 */
function getStepClass(index: number): string {
  if (index < props.currentStep) {
    return 'completed'
  } else if (index === props.currentStep) {
    return 'active'
  }
  return 'pending'
}
</script>

<style lang="scss" scoped>
/* 步骤指示器容器 */
.step-indicator {
  display: flex;
  justify-content: space-between;
  padding: 24rpx 16rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

/* 单个步骤项 */
.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  
  /* 已完成状态 */
  &.completed {
    .step-circle {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-color: #10b981;
    }
    
    .step-check {
      color: #ffffff;
    }
    
    .step-title {
      color: #10b981;
    }
  }
  
  /* 当前激活状态 */
  &.active {
    .step-circle {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border-color: #3b82f6;
      transform: scale(1.1);
    }
    
    .step-number {
      color: #ffffff;
    }
    
    .step-title {
      color: #3b82f6;
      font-weight: bold;
    }
  }
  
  /* 待处理状态 */
  &.pending {
    .step-circle {
      background-color: #f3f4f6;
      border-color: #d1d5db;
    }
    
    .step-number {
      color: #9ca3af;
    }
    
    .step-title {
      color: #9ca3af;
    }
  }
}

/* 步骤圆点 */
.step-circle {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid;
  transition: all 0.3s ease;
  margin-bottom: 12rpx;
}

/* 完成勾选 */
.step-check {
  font-size: 28rpx;
  font-weight: bold;
}

/* 步骤数字 */
.step-number {
  font-size: 26rpx;
  font-weight: bold;
}

/* 步骤内容 */
.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* 步骤标题 */
.step-title {
  font-size: 24rpx;
  transition: all 0.3s ease;
}

/* 步骤描述 */
.step-desc {
  font-size: 20rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}

/* 连接线 */
.step-line {
  position: absolute;
  top: 28rpx;
  left: calc(50% + 32rpx);
  width: calc(100% - 64rpx);
  height: 4rpx;
  background-color: #e5e7eb;
  transition: background-color 0.3s ease;
  
  &.completed {
    background-color: #10b981;
  }
}
</style>
