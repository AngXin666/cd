<!--
  登录页面
  提供密码登录和验证码登录两种方式
  支持记住账号密码功能
  UI 风格与主项目保持一致：背景图片轮换、半透明卡片设计
  
  @requirements 2.1 - 用户登录验证
-->
<template>
  <view 
    class="login-page"
    :class="{ 'login-page--fallback': bgImageFailed }"
    :style="bgImageFailed ? {} : { backgroundImage: `url(${currentBgImage})` }"
    @error="handleBgError"
  >
    <!-- 顶部安全区域 -->
    <view class="safe-area-top"></view>
    
    <!-- 登录内容区域 - 从顶部15%开始 -->
    <view class="login-content">
      <!-- 页面标题 -->
      <view class="title-section">
        <text class="app-title">车队管家</text>
        <text class="app-subtitle">专业的车队管理系统</text>
      </view>

      <!-- 登录表单卡片 - 50% 透明度 -->
      <view class="form-card">
        <!-- 账号输入 -->
        <view class="input-group">
          <view class="input-wrapper">
            <text class="input-icon">👤</text>
            <input
              v-model="formData.account"
              class="form-input"
              :type="loginType === 'otp' ? 'number' : 'text'"
              :maxlength="loginType === 'otp' ? 11 : 50"
              :placeholder="loginType === 'otp' ? '请输入手机号' : '请输入账号'"
              @confirm="handleLogin"
            />
            <text 
              v-if="formData.account" 
              class="clear-icon"
              @click="formData.account = ''"
            >✕</text>
          </view>
        </view>

        <!-- 密码登录模式 -->
        <template v-if="loginType === 'password'">
          <!-- 密码输入 -->
          <view class="input-group">
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
              >{{ showPassword ? '👁️' : '🙈' }}</text>
              <text 
                v-if="formData.password" 
                class="clear-icon"
                @click="formData.password = ''"
              >✕</text>
            </view>
          </view>

          <!-- 记住密码 -->
          <view class="remember-section">
            <checkbox-group @change="handleRememberChange">
              <label class="remember-label">
                <checkbox 
                  :checked="rememberMe" 
                  color="#1E3A8A"
                />
                <text class="remember-text">记住账号密码</text>
              </label>
            </checkbox-group>
          </view>
        </template>

        <!-- 验证码登录模式 -->
        <template v-if="loginType === 'otp'">
          <!-- 验证码输入 -->
          <view class="input-group">
            <view class="input-wrapper">
              <text class="input-icon">💬</text>
              <input
                v-model="formData.otp"
                class="form-input"
                type="number"
                :maxlength="6"
                placeholder="请输入6位验证码"
                @confirm="handleLogin"
              />
              <text 
                v-if="formData.otp" 
                class="clear-icon"
                @click="formData.otp = ''"
              >✕</text>
            </view>
          </view>

          <!-- 发送验证码按钮 -->
          <button
            class="otp-btn"
            :class="{ disabled: countdown > 0 || loading }"
            :disabled="countdown > 0 || loading"
            @click="handleSendOtp"
          >
            {{ countdown > 0 ? `${countdown}秒后重试` : '发送验证码' }}
          </button>
        </template>

        <!-- 登录按钮组 -->
        <view class="btn-group">
          <!-- 密码登录按钮 -->
          <button
            class="login-btn"
            :class="{ 
              active: loginType === 'password',
              disabled: loading 
            }"
            :disabled="loading"
            @click="handlePasswordBtnClick"
          >
            {{ loginType === 'password' ? (loading ? '登录中...' : '密码登录') : '密码登录' }}
          </button>

          <!-- 验证码登录按钮 -->
          <button
            class="login-btn"
            :class="{ 
              active: loginType === 'otp',
              disabled: loading 
            }"
            :disabled="loading"
            @click="handleOtpBtnClick"
          >
            {{ loginType === 'otp' ? (loading ? '登录中...' : '验证码登录') : '验证码登录' }}
          </button>
        </view>
      </view>

      <!-- 快捷登录区域（测试用） -->
      <view class="quick-login-section">
        <view class="quick-login-title">
          <text class="title-text">🚀 快捷登录</text>
        </view>
        <view class="quick-login-grid">
          <button
            v-for="account in quickLoginAccounts"
            :key="account.username"
            class="quick-login-btn"
            :class="account.roleClass"
            :disabled="loading"
            @click="handleQuickLogin(account.username, account.password)"
          >
            <text class="role-icon">{{ account.icon }}</text>
            <text class="role-name">{{ account.label }}</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 登录页面组件
 * 
 * @description 提供密码登录和验证码登录两种方式
 * 支持记住账号密码功能，UI 风格与主项目保持一致
 */

import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { checkUpdateOnLaunch } from '@/utils/update'

// ==================== 背景图片配置 ====================

/**
 * 背景图片列表
 * 使用在线图片，如果加载失败则使用渐变背景
 * 注意：APK 离线模式下可能无法加载网络图片
 */
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
]

/** 背景图片是否加载失败 */
const bgImageFailed = ref(false)

// ==================== 状态 ====================

/** 当前背景图片索引 */
const bgIndex = ref(0)

/** 登录类型：password-密码登录，otp-验证码登录 */
const loginType = ref<'password' | 'otp'>('password')

/** 表单数据 */
const formData = ref({
  account: '',
  password: '',
  otp: '',
})

/** 是否显示密码 */
const showPassword = ref(false)

/** 是否记住密码 */
const rememberMe = ref(true)

/** 加载状态 */
const loading = ref(false)

/** 验证码倒计时 */
const countdown = ref(0)

// ==================== Store ====================

const userStore = useUserStore()

// ==================== 计算属性 ====================

/**
 * 当前背景图片
 */
const currentBgImage = computed(() => BG_IMAGES[bgIndex.value])

// ==================== 快捷登录配置 ====================

/**
 * 快捷登录账号列表
 * 包含老板、调度、车队长和3个司机账号
 * 密码来自 crud.py init_default_data 函数
 */
const quickLoginAccounts = [
  { username: 'admin', password: 'admin123', label: '老板', icon: '👔', roleClass: 'role-boss' },
  { username: 'dispatcher', password: 'dispatch123', label: '调度', icon: '📋', roleClass: 'role-dispatcher' },
  { username: 'manager', password: 'manager123', label: '车队长', icon: '🚛', roleClass: 'role-manager' },
  { username: 'driver', password: 'driver123', label: '司机1', icon: '🚗', roleClass: 'role-driver' },
  { username: 'driver2', password: 'driver123', label: '司机2', icon: '🚙', roleClass: 'role-driver' },
  { username: 'driver3', password: 'driver123', label: '司机3', icon: '🚕', roleClass: 'role-driver' },
]

// ==================== 生命周期 ====================

onMounted(() => {
  // 读取保存的账号密码
  loadSavedCredentials()
  
  // 随机选择背景图片
  randomizeBgImage()
  
  // 检查应用更新（登录页面也检查一次，确保用户能看到更新提示）
  // Requirements: 1.1 - 应用启动时自动检查更新
  checkUpdateOnLaunch()
})

// ==================== 方法 ====================

/**
 * 加载保存的账号密码
 */
function loadSavedCredentials(): void {
  try {
    const savedAccount = uni.getStorageSync('saved_account')
    const savedPassword = uni.getStorageSync('saved_password')
    const savedRemember = uni.getStorageSync('remember_me')
    
    if (savedAccount) {
      formData.value.account = savedAccount
      formData.value.password = savedPassword || ''
    }
    if (savedRemember !== undefined && savedRemember !== '') {
      rememberMe.value = savedRemember
    }
  } catch (error) {
    console.error('读取保存的账号密码失败:', error)
  }
}

/**
 * 随机选择背景图片（不重复上一次）
 */
function randomizeBgImage(): void {
  try {
    // 获取上次的背景图索引
    const lastIndex = uni.getStorageSync('login_bg_index') || 0
    
    // 随机选择一张不同的背景图
    const availableIndexes = BG_IMAGES.map((_, i) => i).filter(i => i !== lastIndex)
    const newIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)]
    
    bgIndex.value = newIndex
    
    // 保存新的索引
    uni.setStorageSync('login_bg_index', newIndex)
    
    // 预加载图片，检测是否能加载成功
    preloadBgImage(BG_IMAGES[newIndex])
  } catch (error) {
    console.error('设置背景图片失败:', error)
    bgImageFailed.value = true
  }
}

/**
 * 预加载背景图片
 * @param url - 图片 URL
 */
function preloadBgImage(url: string): void {
  // 使用 Image 对象预加载
  const img = new Image()
  img.onload = () => {
    bgImageFailed.value = false
  }
  img.onerror = () => {
    console.warn('背景图片加载失败，使用渐变背景')
    bgImageFailed.value = true
  }
  // 设置超时，3秒内未加载成功则使用 fallback
  setTimeout(() => {
    if (!img.complete) {
      bgImageFailed.value = true
    }
  }, 3000)
  img.src = url
}

/**
 * 处理背景图片加载错误
 */
function handleBgError(): void {
  bgImageFailed.value = true
}

/**
 * 处理记住密码复选框变化
 */
function handleRememberChange(): void {
  rememberMe.value = !rememberMe.value
}

/**
 * 验证手机号格式
 * @param phone - 手机号
 * @returns 是否有效
 */
function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 发送验证码
 */
async function handleSendOtp(): Promise<void> {
  const { account } = formData.value
  
  if (!account) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  
  if (!validatePhone(account)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  
  if (countdown.value > 0) return
  
  loading.value = true
  
  try {
    // TODO: 调用发送验证码 API
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    
    // 开始倒计时
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error) {
    console.error('发送验证码失败:', error)
    uni.showToast({ title: '发送验证码失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 密码登录按钮点击
 */
function handlePasswordBtnClick(): void {
  if (loginType.value === 'password') {
    handlePasswordLogin()
  } else {
    loginType.value = 'password'
  }
}

/**
 * 验证码登录按钮点击
 */
function handleOtpBtnClick(): void {
  if (loginType.value === 'otp') {
    handleOtpLogin()
  } else {
    loginType.value = 'otp'
  }
}

/**
 * 处理登录（根据当前登录类型）
 */
function handleLogin(): void {
  if (loginType.value === 'password') {
    handlePasswordLogin()
  } else {
    handleOtpLogin()
  }
}

/**
 * 密码登录
 */
async function handlePasswordLogin(): Promise<void> {
  const { account, password } = formData.value
  
  if (!account || !password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }
  
  loading.value = true
  
  try {
    // 调用登录方法
    await userStore.login(account.trim(), password)
    
    // 保存或清除记住的账号密码
    if (rememberMe.value) {
      uni.setStorageSync('saved_account', account)
      uni.setStorageSync('saved_password', password)
      uni.setStorageSync('remember_me', true)
    } else {
      uni.removeStorageSync('saved_account')
      uni.removeStorageSync('saved_password')
      uni.removeStorageSync('remember_me')
    }
    
    // 登录成功提示
    uni.showToast({ title: '登录成功', icon: 'success' })
    
    // 延迟跳转，让用户看到成功提示
    setTimeout(() => {
      // 跳转到首页
      uni.reLaunch({ url: '/pages/index/index' })
    }, 500)
  } catch (error) {
    console.error('登录失败:', error)
    const errorMessage = error instanceof Error ? error.message : '账号或密码错误'
    uni.showToast({ title: errorMessage, icon: 'none', duration: 2000 })
  } finally {
    loading.value = false
  }
}

/**
 * 验证码登录
 */
async function handleOtpLogin(): Promise<void> {
  const { account, otp } = formData.value
  
  if (!account || !otp) {
    uni.showToast({ title: '请输入手机号和验证码', icon: 'none' })
    return
  }
  
  if (!validatePhone(account)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  
  loading.value = true
  
  try {
    // TODO: 调用验证码登录 API
    uni.showToast({ title: '验证码登录暂未实现', icon: 'none' })
  } catch (error) {
    console.error('验证码登录失败:', error)
    uni.showToast({ title: '验证码错误或已过期', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 快捷登录
 * @param username - 账号
 * @param password - 密码
 */
async function handleQuickLogin(username: string, password: string): Promise<void> {
  // 填充表单
  formData.value.account = username
  formData.value.password = password
  loginType.value = 'password'
  
  // 执行登录
  await handlePasswordLogin()
}
</script>

<style lang="scss" scoped>
/* 登录页面容器 - 全屏背景图 */
.login-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  /* 默认渐变背景，作为图片加载前的占位 */
  background-color: #1E3A8A;
}

/* 背景图片加载失败时的渐变背景 */
.login-page--fallback {
  background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #60A5FA 100%);
}

/* 顶部安全区域 */
.safe-area-top {
  height: env(safe-area-inset-top);
  height: constant(safe-area-inset-top);
}

/* 登录内容区域 */
.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48rpx;
  padding-top: 15vh;
}

/* 标题区域 */
.title-section {
  text-align: center;
  margin-bottom: 48rpx;
}

.app-title {
  display: block;
  font-size: 60rpx;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.3);
  margin-bottom: 16rpx;
}

.app-subtitle {
  display: block;
  font-size: 28rpx;
  color: #ffffff;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
}

/* 表单卡片 - 50% 透明度 */
.form-card {
  width: 100%;
  max-width: 800rpx;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 32rpx;
  padding: 48rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

/* 输入框组 */
.input-group {
  margin-bottom: 32rpx;
}

/* 输入框容器 - 45% 透明度 */
.input-wrapper {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.45);
  border-radius: 24rpx;
  padding: 0 24rpx;
  height: 96rpx;
  border: 4rpx solid transparent;
}

.input-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.form-input {
  flex: 1;
  height: 100%;
  font-size: 32rpx;
  color: #333333;
  background: transparent;
}

.toggle-password {
  font-size: 36rpx;
  padding: 8rpx;
  margin-left: 8rpx;
}

.clear-icon {
  font-size: 28rpx;
  color: #999999;
  padding: 8rpx;
  margin-left: 8rpx;
}

/* 记住密码 */
.remember-section {
  margin-bottom: 48rpx;
  padding-left: 8rpx;
}

.remember-label {
  display: flex;
  align-items: center;
}

.remember-text {
  font-size: 28rpx;
  color: #333333;
  margin-left: 8rpx;
}

/* 发送验证码按钮 */
.otp-btn {
  width: 100%;
  height: 88rpx;
  background-color: rgba(249, 115, 22, 0.9);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 24rpx;
  border: none;
  margin-bottom: 32rpx;
  
  &.disabled {
    background-color: rgba(229, 231, 235, 0.8);
  }
}

/* 登录按钮组 */
.btn-group {
  display: flex;
  gap: 24rpx;
}

/* 登录按钮 */
.login-btn {
  flex: 1;
  height: 96rpx;
  font-size: 30rpx;
  font-weight: bold;
  border-radius: 24rpx;
  border: 4rpx solid rgba(229, 231, 235, 0.5);
  background-color: rgba(243, 244, 246, 0.8);
  color: #1E3A8A;
  
  /* 激活状态 - 深蓝色背景 */
  &.active {
    background-color: rgba(30, 58, 138, 0.9);
    color: #ffffff;
    border: none;
  }
  
  &.disabled {
    opacity: 0.7;
  }
  
  &.active.disabled {
    background-color: rgba(147, 197, 253, 0.8);
  }
}

/* 快捷登录区域 */
.quick-login-section {
  width: 100%;
  max-width: 800rpx;
  margin-top: 32rpx;
}

.quick-login-title {
  text-align: center;
  margin-bottom: 24rpx;
}

.title-text {
  font-size: 28rpx;
  color: #ffffff;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
}

/* 快捷登录按钮网格 - 3列布局 */
.quick-login-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

/* 快捷登录按钮 */
.quick-login-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120rpx;
  border-radius: 16rpx;
  border: none;
  padding: 12rpx 8rpx;
  
  /* 老板 - 金色 */
  &.role-boss {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.85), rgba(217, 119, 6, 0.85));
    color: #ffffff;
  }
  
  /* 调度 - 紫色 */
  &.role-dispatcher {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.85), rgba(109, 40, 217, 0.85));
    color: #ffffff;
  }
  
  /* 车队长 - 蓝色 */
  &.role-manager {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.85), rgba(37, 99, 235, 0.85));
    color: #ffffff;
  }
  
  /* 司机 - 绿色 */
  &.role-driver {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.85), rgba(22, 163, 74, 0.85));
    color: #ffffff;
  }
  
  &:active {
    opacity: 0.8;
    transform: scale(0.98);
  }
}

.role-icon {
  font-size: 36rpx;
  margin-bottom: 4rpx;
}

.role-name {
  font-size: 24rpx;
  font-weight: 500;
}
</style>
