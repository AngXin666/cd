<!--
  登录页面
  提供账号密码登录功能，登录成功后跳转到首页
  
  @requirements 2.1 - 用户登录验证
-->
<template>
  <view class="login-page">
    <!-- Logo 区域 -->
    <view class="logo-section">
      <view class="logo-icon">
        <text class="logo-text">🚛</text>
      </view>
      <text class="app-name">车队管家</text>
      <text class="app-desc">高效管理，轻松出行</text>
    </view>

    <!-- 登录表单 -->
    <view class="form-section">
      <!-- 用户名输入 -->
      <view class="form-item">
        <view class="input-wrapper">
          <text class="input-icon">👤</text>
          <input
            v-model="formData.username"
            class="form-input"
            type="text"
            placeholder="请输入用户名"
            :maxlength="50"
            @confirm="handleLogin"
          />
        </view>
      </view>

      <!-- 密码输入 -->
      <view class="form-item">
        <view class="input-wrapper">
          <text class="input-icon">🔒</text>
          <input
            v-model="formData.password"
            class="form-input"
            :password="!showPassword"
            placeholder="请输入密码"
            :maxlength="50"
            @confirm="handleLogin"
          />
          <text 
            class="toggle-password" 
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? '🙈' : '👁️' }}
          </text>
        </view>
      </view>

      <!-- 登录按钮 -->
      <button
        class="login-btn"
        :class="{ disabled: !canSubmit }"
        :disabled="!canSubmit || loading"
        @click="handleLogin"
      >
        <text v-if="loading" class="loading-icon">⏳</text>
        <text>{{ loading ? '登录中...' : '登录' }}</text>
      </button>

      <!-- 提示信息 -->
      <view class="tips-section">
        <text class="tips-text">默认账号：admin / admin123</text>
      </view>
    </view>

    <!-- 版权信息 -->
    <view class="footer-section">
      <text class="copyright">© 2024 车队管家</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 登录页面组件
 * 
 * @description 提供用户登录功能，支持账号密码登录
 * 登录成功后自动跳转到首页
 */

import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user'

// ==================== 状态 ====================

/** 表单数据 */
const formData = ref({
  username: '',
  password: '',
})

/** 是否显示密码 */
const showPassword = ref(false)

/** 加载状态 */
const loading = ref(false)

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 计算属性 ====================

/**
 * 是否可以提交表单
 * 用户名和密码都不为空时才能提交
 */
const canSubmit = computed(() => {
  return formData.value.username.trim() !== '' && 
         formData.value.password.trim() !== ''
})

// ==================== 方法 ====================

/**
 * 处理登录
 * 验证表单并调用登录 API
 */
async function handleLogin() {
  // 检查表单是否可提交
  if (!canSubmit.value || loading.value) {
    return
  }

  // 获取表单数据
  const { username, password } = formData.value

  // 验证用户名
  if (username.trim().length < 2) {
    uni.showToast({
      title: '用户名至少2个字符',
      icon: 'none',
    })
    return
  }

  // 验证密码
  if (password.length < 4) {
    uni.showToast({
      title: '密码至少4个字符',
      icon: 'none',
    })
    return
  }

  // 开始登录
  loading.value = true

  try {
    // 调用登录方法
    await userStore.login(username.trim(), password)

    // 登录成功提示
    uni.showToast({
      title: '登录成功',
      icon: 'success',
    })

    // 延迟跳转，让用户看到成功提示
    setTimeout(() => {
      // 跳转到首页
      uni.switchTab({
        url: '/pages/index/index',
      })
    }, 500)
  } catch (error) {
    // 登录失败
    console.error('登录失败:', error)
    
    // 显示错误提示
    const errorMessage = error instanceof Error ? error.message : '登录失败，请重试'
    uni.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 2000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
/* 登录页面容器 */
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #4a90e2 0%, #357abd 100%);
  padding: 0 48rpx;
  box-sizing: border-box;
}

/* Logo 区域 */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
  padding-bottom: 80rpx;
}

.logo-icon {
  width: 160rpx;
  height: 160rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}

.logo-text {
  font-size: 80rpx;
}

.app-name {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 16rpx;
}

.app-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 表单区域 */
.form-section {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.form-item {
  margin-bottom: 32rpx;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 16rpx;
  padding: 0 24rpx;
  height: 96rpx;
}

.input-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.form-input {
  flex: 1;
  height: 100%;
  font-size: 30rpx;
  color: #333333;
  background: transparent;
}

.toggle-password {
  font-size: 36rpx;
  padding: 8rpx;
}

/* 登录按钮 */
.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
  border: none;
  margin-top: 16rpx;
}

.login-btn.disabled {
  background: #cccccc;
}

.login-btn:active:not(.disabled) {
  opacity: 0.9;
}

.loading-icon {
  margin-right: 8rpx;
}

/* 提示信息 */
.tips-section {
  margin-top: 32rpx;
  text-align: center;
}

.tips-text {
  font-size: 24rpx;
  color: #999999;
}

/* 版权信息 */
.footer-section {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 48rpx;
}

.copyright {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}
</style>
