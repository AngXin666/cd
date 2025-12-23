<template>
  <!-- 
    添加车辆页面
    录入车辆信息，上传证件照片
    支持 OCR 驾驶证识别自动填充
  -->
  <view class="add-page">
    <!-- OCR 识别区域 -->
    <view class="form-section ocr-section">
      <view class="form-title">智能识别</view>
      <view class="ocr-content">
        <view class="ocr-btn" @click="handleOCRRecognize">
          <text class="ocr-icon">📷</text>
          <text class="ocr-text">拍照识别驾驶证</text>
        </view>
        <text class="ocr-tips">拍摄驾驶证可自动识别信息</text>
        <view v-if="!ocrConfigured" class="ocr-warning">
          <text class="warning-text">⚠️ OCR 服务未配置，请联系管理员</text>
        </view>
      </view>
    </view>

    <!-- 车牌号 -->
    <view class="form-section">
      <view class="form-title required">车牌号</view>
      <input 
        class="form-input"
        v-model="formData.license_plate"
        placeholder="请输入车牌号，如：京A12345"
        maxlength="10"
      />
      <view v-if="plateError" class="form-error">
        <text class="error-text">{{ plateError }}</text>
      </view>
    </view>

    <!-- 品牌 -->
    <view class="form-section">
      <view class="form-title">品牌</view>
      <input 
        class="form-input"
        v-model="formData.brand"
        placeholder="请输入车辆品牌，如：大众"
        maxlength="20"
      />
    </view>

    <!-- 型号 -->
    <view class="form-section">
      <view class="form-title">型号</view>
      <input 
        class="form-input"
        v-model="formData.model"
        placeholder="请输入车辆型号，如：朗逸"
        maxlength="30"
      />
    </view>

    <!-- 颜色 -->
    <view class="form-section">
      <view class="form-title">颜色</view>
      <view class="color-list">
        <view 
          v-for="color in colorOptions" 
          :key="color.value"
          :class="['color-item', { active: formData.color === color.value }]"
          @click="formData.color = color.value"
        >
          <view class="color-dot" :style="{ backgroundColor: color.hex }"></view>
          <text class="color-name">{{ color.label }}</text>
        </view>
      </view>
    </view>

    <!-- OCR 识别结果（驾驶证信息） -->
    <view v-if="ocrResult" class="form-section ocr-result-section">
      <view class="form-title">驾驶证信息（OCR 识别）</view>
      <view class="ocr-result-list">
        <view v-if="ocrResult.name" class="ocr-result-item">
          <text class="result-label">姓名：</text>
          <text class="result-value">{{ ocrResult.name }}</text>
        </view>
        <view v-if="ocrResult.license_number" class="ocr-result-item">
          <text class="result-label">证号：</text>
          <text class="result-value">{{ ocrResult.license_number }}</text>
        </view>
        <view v-if="ocrResult.vehicle_type" class="ocr-result-item">
          <text class="result-label">准驾车型：</text>
          <text class="result-value">{{ ocrResult.vehicle_type }}</text>
        </view>
        <view v-if="ocrResult.valid_to" class="ocr-result-item">
          <text class="result-label">有效期至：</text>
          <text class="result-value">{{ ocrResult.valid_to }}</text>
        </view>
      </view>
    </view>

    <!-- 证件照片（预留） -->
    <view class="form-section">
      <view class="form-title">证件照片（选填）</view>
      <view class="upload-tips">
        <text class="tips-text">证件照片功能开发中，添加车辆后可在详情页补充</text>
      </view>
    </view>

    <!-- 提示信息 -->
    <view class="tips-section">
      <text class="tips-title">温馨提示</text>
      <view class="tips-list">
        <text class="tips-item">• 车牌号必须真实有效</text>
        <text class="tips-item">• 添加后需等待管理员审核</text>
        <text class="tips-item">• 审核通过后方可正常使用</text>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-section">
      <view 
        :class="['submit-btn', { disabled: !canSubmit }]"
        @click="handleSubmit"
      >
        <text class="submit-text">{{ submitting ? '提交中...' : '添加车辆' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 添加车辆页面
 * 录入车辆信息，上传证件照片
 * 支持 OCR 驾驶证识别自动填充
 */

import { ref, computed, reactive, watch, onMounted } from 'vue'
import { createVehicle, recognizeDrivingLicense, getOCRStatus } from '@/api'
import type { OCRDrivingLicenseData } from '@/api/types'
import { isValidLicensePlate, navigateBack } from '@/utils'

// ==================== 常量 ====================

/** 颜色选项 */
const colorOptions = [
  { label: '白色', value: '白色', hex: '#ffffff' },
  { label: '黑色', value: '黑色', hex: '#333333' },
  { label: '银色', value: '银色', hex: '#c0c0c0' },
  { label: '灰色', value: '灰色', hex: '#808080' },
  { label: '红色', value: '红色', hex: '#ff4d4f' },
  { label: '蓝色', value: '蓝色', hex: '#1890ff' },
  { label: '其他', value: '其他', hex: '#d9d9d9' },
]

// ==================== 状态 ====================

/** 提交状态 */
const submitting = ref(false)

/** 车牌号错误 */
const plateError = ref('')

/** OCR 是否已配置 */
const ocrConfigured = ref(true)

/** OCR 识别结果 */
const ocrResult = ref<OCRDrivingLicenseData | null>(null)

/** 表单数据 */
const formData = reactive({
  license_plate: '',
  brand: '',
  model: '',
  color: '',
})

// ==================== 计算属性 ====================

/** 是否可以提交 */
const canSubmit = computed(() => {
  return formData.license_plate && 
         !plateError.value &&
         !submitting.value
})

// ==================== 生命周期 ====================

onMounted(() => {
  // 检查 OCR 服务状态
  checkOCRStatus()
})

// ==================== 监听器 ====================

watch(() => formData.license_plate, (val) => {
  // 验证车牌号格式
  if (val && !isValidLicensePlate(val)) {
    plateError.value = '车牌号格式不正确'
  } else {
    plateError.value = ''
  }
})

// ==================== 方法 ====================

/**
 * 检查 OCR 服务状态
 */
async function checkOCRStatus(): Promise<void> {
  try {
    const status = await getOCRStatus()
    ocrConfigured.value = status.configured
  } catch (error) {
    console.error('检查 OCR 状态失败:', error)
    ocrConfigured.value = false
  }
}

/**
 * OCR 识别驾驶证
 */
async function handleOCRRecognize(): Promise<void> {
  // 检查 OCR 是否配置
  if (!ocrConfigured.value) {
    uni.showToast({
      title: 'OCR 服务未配置',
      icon: 'none',
    })
    return
  }
  
  // 选择图片
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      
      // 显示加载
      uni.showLoading({ title: '识别中...' })
      
      try {
        // 读取图片为 Base64
        const base64 = await readFileAsBase64(tempFilePath)
        
        // 调用 OCR 识别
        const result = await recognizeDrivingLicense(base64)
        
        uni.hideLoading()
        
        if (result.success && result.data) {
          // 保存识别结果
          ocrResult.value = result.data
          
          uni.showToast({
            title: '识别成功',
            icon: 'success',
          })
        } else {
          uni.showToast({
            title: result.error || '识别失败',
            icon: 'none',
          })
        }
      } catch (error: any) {
        uni.hideLoading()
        console.error('OCR 识别失败:', error)
        uni.showToast({
          title: error.message || '识别失败',
          icon: 'none',
        })
      }
    },
    fail: (error) => {
      console.error('选择图片失败:', error)
    },
  })
}

/**
 * 读取文件为 Base64
 * @param filePath - 文件路径
 * @returns Base64 字符串
 */
function readFileAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // H5 环境
    // @ts-ignore
    if (typeof plus === 'undefined') {
      // 使用 canvas 转换
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0)
        const base64 = canvas.toDataURL('image/jpeg', 0.8)
        // 移除 data:image/jpeg;base64, 前缀
        resolve(base64.split(',')[1])
      }
      img.onerror = reject
      img.src = filePath
    } else {
      // App 环境使用 plus API
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(filePath, (entry: any) => {
        entry.file((file: any) => {
          const reader = new plus.io.FileReader()
          reader.onloadend = (e: any) => {
            const base64 = e.target.result.split(',')[1]
            resolve(base64)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        }, reject)
      }, reject)
    }
  })
}

/**
 * 提交车辆
 */
async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  
  // 再次验证车牌号
  if (!isValidLicensePlate(formData.license_plate)) {
    plateError.value = '车牌号格式不正确'
    return
  }
  
  // 确认提交
  uni.showModal({
    title: '确认添加',
    content: `确定要添加车牌号为 ${formData.license_plate} 的车辆吗？`,
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
    await createVehicle({
      license_plate: formData.license_plate.toUpperCase(),
      brand: formData.brand || undefined,
      model: formData.model || undefined,
      color: formData.color || undefined,
    })
    
    uni.showToast({
      title: '添加成功',
      icon: 'success',
    })
    
    // 延迟返回
    setTimeout(() => {
      navigateBack()
    }, 1500)
  } catch (error: any) {
    console.error('添加车辆失败:', error)
    uni.showToast({
      title: error.message || '添加失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.add-page {
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
  
  &.required::before {
    content: '*';
    color: #ff4d4f;
    margin-right: 8rpx;
  }
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.form-error {
  margin-top: 8rpx;
}

.error-text {
  font-size: 24rpx;
  color: #ff4d4f;
}

/* OCR 识别区域 */
.ocr-section {
  background: linear-gradient(135deg, #e6f0ff 0%, #f0f7ff 100%);
  border: 2rpx dashed #4a90e2;
}

.ocr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;
}

.ocr-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 48rpx;
  background-color: #4a90e2;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.ocr-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.ocr-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
}

.ocr-tips {
  font-size: 24rpx;
  color: #666666;
}

.ocr-warning {
  margin-top: 12rpx;
  padding: 12rpx 24rpx;
  background-color: #fff7e6;
  border-radius: 8rpx;
}

.warning-text {
  font-size: 24rpx;
  color: #faad14;
}

/* OCR 识别结果 */
.ocr-result-section {
  background-color: #f6ffed;
  border: 2rpx solid #b7eb8f;
}

.ocr-result-list {
  display: flex;
  flex-direction: column;
}

.ocr-result-item {
  display: flex;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e8e8e8;
  
  &:last-child {
    border-bottom: none;
  }
}

.result-label {
  font-size: 26rpx;
  color: #666666;
  width: 160rpx;
  flex-shrink: 0;
}

.result-value {
  font-size: 26rpx;
  color: #333333;
  flex: 1;
}

/* 颜色选择 */
.color-list {
  display: flex;
  flex-wrap: wrap;
  margin: -8rpx;
}

.color-item {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  margin: 8rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
  
  &.active {
    background-color: #e6f0ff;
    border-color: #4a90e2;
  }
}

.color-dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  border: 1rpx solid #e0e0e0;
}

.color-name {
  font-size: 26rpx;
  color: #333333;
}

/* 上传提示 */
.upload-tips {
  padding: 32rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  text-align: center;
}

.tips-text {
  font-size: 26rpx;
  color: #999999;
}

/* 提示区域 */
.tips-section {
  background-color: #fff9e6;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.tips-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #faad14;
  margin-bottom: 12rpx;
  display: block;
}

.tips-list {
  display: flex;
  flex-direction: column;
}

.tips-item {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.8;
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
