<!--
  FormItem 表单项组件
  提供统一的表单项布局
-->
<template>
  <view class="form-item" :class="{ required }">
    <!-- 标签 -->
    <view v-if="label" class="form-label">
      <text class="label-text">{{ label }}</text>
    </view>
    
    <!-- 内容 -->
    <view class="form-content">
      <slot></slot>
    </view>
    
    <!-- 错误提示 -->
    <view v-if="error" class="form-error">
      <text class="error-text">{{ error }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * FormItem 表单项组件
 * 
 * @description 提供统一的表单项布局，支持标签、必填标记、错误提示
 * 
 * @example
 * <FormItem label="用户名" required>
 *   <input v-model="username" placeholder="请输入用户名" />
 * </FormItem>
 * 
 * @example
 * <FormItem label="密码" :error="passwordError">
 *   <input v-model="password" type="password" />
 * </FormItem>
 */

// ==================== Props ====================

interface Props {
  /** 标签文字 */
  label?: string
  /** 是否必填 */
  required?: boolean
  /** 错误提示 */
  error?: string
}

withDefaults(defineProps<Props>(), {
  label: '',
  required: false,
  error: '',
})
</script>

<style lang="scss" scoped>
.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  margin-bottom: 12rpx;
}

.label-text {
  font-size: 28rpx;
  color: #333333;
}

.form-item.required .label-text::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 8rpx;
}

.form-content {
  /* 内容区域样式由插槽内容决定 */
}

.form-error {
  margin-top: 8rpx;
}

.error-text {
  font-size: 24rpx;
  color: #ff4d4f;
}
</style>
