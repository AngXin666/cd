<template>
  <!--
    添加车辆页面 - 完整版
    三步骤流程：行驶证识别 -> 车辆照片 -> 驾驶员证件
    参考主项目 src/pages/driver/add-vehicle/index.tsx
    @requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
  -->
  <view class="add-vehicle-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">添加车辆</text>
      <text class="page-subtitle">请按步骤完成车辆信息录入</text>
    </view>

    <!-- 步骤指示器 -->
    <StepIndicator :steps="steps" :current-step="currentStep" />

    <!-- 步骤内容区域 -->
    <scroll-view scroll-y class="step-content">
      <!-- 步骤1：行驶证识别 -->
      <view v-if="currentStep === 0" class="step-panel">
        <view class="section-card">
          <view class="section-header">
            <text class="section-icon">📄</text>
            <text class="section-title">行驶证照片</text>
            <text class="section-required">*</text>
          </view>
          <text class="section-desc">请拍摄行驶证的主页、副页和副页背页</text>

          <!-- 行驶证主页 -->
          <PhotoCapture
            title="行驶证主页"
            description="拍摄行驶证正面"
            :tips="['确保照片清晰', '避免反光遮挡']"
            v-model="photos.driving_license_main"
            :required="true"
            @change="handleDrivingLicenseMainChange"
          />

          <!-- 行驶证副页 -->
          <PhotoCapture
            title="行驶证副页"
            description="拍摄行驶证副页正面"
            :tips="['包含检验有效期信息']"
            v-model="photos.driving_license_sub"
            :required="true"
            @change="handleDrivingLicenseSubChange"
          />

          <!-- 行驶证副页背页 -->
          <PhotoCapture
            title="行驶证副页背页"
            description="拍摄行驶证副页背面"
            :tips="['包含强制报废日期']"
            v-model="photos.driving_license_sub_back"
            :required="true"
            @change="handleDrivingLicenseSubBackChange"
          />
        </view>

        <!-- OCR 识别结果 -->
        <view v-if="hasOCRResult" class="section-card ocr-result-card">
          <view class="section-header">
            <text class="section-icon">✅</text>
            <text class="section-title">识别结果</text>
          </view>
          <view class="ocr-result-list">
            <view v-if="formData.license_plate" class="result-item">
              <text class="result-label">车牌号：</text>
              <text class="result-value">{{ formData.license_plate }}</text>
            </view>
            <view v-if="formData.brand" class="result-item">
              <text class="result-label">品牌：</text>
              <text class="result-value">{{ formData.brand }}</text>
            </view>
            <view v-if="formData.model" class="result-item">
              <text class="result-label">型号：</text>
              <text class="result-value">{{ formData.model }}</text>
            </view>
            <view v-if="formData.vin" class="result-item">
              <text class="result-label">车架号：</text>
              <text class="result-value">{{ formData.vin }}</text>
            </view>
            <view v-if="formData.owner_name" class="result-item">
              <text class="result-label">所有人：</text>
              <text class="result-value">{{ formData.owner_name }}</text>
            </view>
            <view v-if="formData.vehicle_type" class="result-item">
              <text class="result-label">车辆类型：</text>
              <text class="result-value">{{ formData.vehicle_type }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 步骤2：车辆照片 -->
      <view v-if="currentStep === 1" class="step-panel">
        <view class="section-card">
          <view class="section-header">
            <text class="section-icon">📷</text>
            <text class="section-title">车辆照片</text>
            <text class="section-required">*</text>
          </view>
          <text class="section-desc">请按顺序拍摄7个角度的车辆照片</text>

          <!-- 7个角度照片 -->
          <PhotoCapture
            v-for="item in vehiclePhotoLabels"
            :key="item.key"
            :title="item.label"
            :description="item.desc"
            v-model="photos[item.key]"
            :required="true"
          />
        </view>

        <!-- 车损特写照片（可选） -->
        <view class="section-card">
          <view class="section-header">
            <text class="section-icon">🔍</text>
            <text class="section-title">车损特写</text>
            <text class="section-optional">（可选）</text>
          </view>
          <text class="section-desc">如有车辆损伤，请拍摄特写照片，最多9张</text>

          <view class="damage-photos-grid">
            <view 
              v-for="(photo, index) in damagePhotos" 
              :key="index"
              class="damage-photo-item"
            >
              <image :src="photo.path" mode="aspectFill" class="damage-image" />
              <view class="delete-btn" @click="handleDeleteDamagePhoto(index)">
                <text class="delete-icon">×</text>
              </view>
            </view>

            <view 
              v-if="damagePhotos.length < 9"
              class="add-damage-btn"
              @click="handleAddDamagePhoto"
            >
              <text class="add-icon">+</text>
              <text class="add-text">添加照片</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 步骤3：驾驶员证件 -->
      <view v-if="currentStep === 2" class="step-panel">
        <view class="section-card">
          <view class="section-header">
            <text class="section-icon">🪪</text>
            <text class="section-title">驾驶员证件</text>
            <text class="section-required">*</text>
          </view>
          <text class="section-desc">请拍摄身份证和驾驶证</text>

          <!-- 身份证正面 -->
          <PhotoCapture
            title="身份证正面"
            description="拍摄身份证人像面"
            :tips="['确保四角完整', '信息清晰可见']"
            v-model="driverPhotos.id_card_front"
            :required="true"
            @change="handleIdCardFrontChange"
          />

          <!-- 驾驶证主页 -->
          <PhotoCapture
            title="驾驶证主页"
            description="拍摄驾驶证正面"
            :tips="['包含准驾车型信息']"
            v-model="driverPhotos.driver_license"
            :required="true"
            @change="handleDriverLicenseChange"
          />
        </view>

        <!-- 驾驶员信息识别结果 -->
        <view v-if="hasDriverOCRResult" class="section-card ocr-result-card">
          <view class="section-header">
            <text class="section-icon">✅</text>
            <text class="section-title">证件识别结果</text>
          </view>
          <view class="ocr-result-list">
            <view v-if="driverLicenseData.id_card_name" class="result-item">
              <text class="result-label">姓名：</text>
              <text class="result-value">{{ driverLicenseData.id_card_name }}</text>
            </view>
            <view v-if="driverLicenseData.id_card_number" class="result-item">
              <text class="result-label">身份证号：</text>
              <text class="result-value">{{ maskIdCard(driverLicenseData.id_card_number) }}</text>
            </view>
            <view v-if="driverLicenseData.license_class" class="result-item">
              <text class="result-label">准驾车型：</text>
              <text class="result-value">{{ driverLicenseData.license_class }}</text>
            </view>
            <view v-if="driverLicenseData.valid_to" class="result-item">
              <text class="result-label">有效期至：</text>
              <text class="result-value">{{ driverLicenseData.valid_to }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view v-if="currentStep > 0" class="action-btn prev-btn" @click="handlePrev">
        <text class="btn-text">上一步</text>
      </view>
      <view 
        v-if="currentStep < steps.length - 1" 
        :class="['action-btn', 'next-btn', { disabled: !canGoNext }]"
        @click="handleNext"
      >
        <text class="btn-text">下一步</text>
      </view>
      <view 
        v-if="currentStep === steps.length - 1"
        :class="['action-btn', 'submit-btn', { disabled: !canSubmit || submitting }]"
        @click="handleSubmit"
      >
        <text class="btn-text">{{ submitting ? '提交中...' : '提交' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 添加车辆页面 - 完整版
 * 三步骤流程：行驶证识别 -> 车辆照片 -> 驾驶员证件
 * 参考主项目 src/pages/driver/add-vehicle/index.tsx
 */

import { ref, reactive, computed, watch, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StepIndicator from '@/components/StepIndicator.vue'
import PhotoCapture from '@/components/PhotoCapture.vue'
import { createVehicle, recognizeDrivingLicense, getOCRStatus } from '@/api'
import type { VehicleCreate } from '@/api/types'
import { useUserStore } from '@/store/user'
import { saveDraft, getDraft, deleteDraft, type VehicleDraft } from '@/utils/draftUtils'
import { uploadImage, readImageAsBase64 } from '@/utils/imageUpload'
import { navigateBack } from '@/utils'
// 集成草稿图片存储和提交失败恢复
import { useDraftImage, generateDraftId } from '@/utils/draftImage'
import { useSubmitRecovery, showSubmitFailedTip } from '@/utils/submitRecovery/useSubmitRecovery'

// ==================== 常量定义 ====================

/** 步骤定义 */
const steps = [
  { title: '行驶证', description: 'OCR识别' },
  { title: '车辆照片', description: '7个角度' },
  { title: '驾驶员证件', description: '身份证+驾驶证' }
]

/** 车辆照片标签 */
const vehiclePhotoLabels = [
  { key: 'left_front', label: '左前45°', desc: '从左前方拍摄' },
  { key: 'right_front', label: '右前45°', desc: '从右前方拍摄' },
  { key: 'left_rear', label: '左后45°', desc: '从左后方拍摄' },
  { key: 'right_rear', label: '右后45°', desc: '从右后方拍摄' },
  { key: 'dashboard', label: '仪表盘', desc: '拍摄仪表盘里程' },
  { key: 'rear_door', label: '后门', desc: '拍摄后门内部' },
  { key: 'cargo_box', label: '货箱', desc: '拍摄货箱内部' }
]

// ==================== 状态定义 ====================

const userStore = useUserStore()

// ==================== 草稿图片存储集成 ====================

/** 草稿 ID（用于图片本地持久化） */
const draftId = computed(() => {
  if (!userStore.user?.id) return ''
  return generateDraftId(userStore.user.id, 'add')
})

/** 草稿图片存储 Hook（延迟初始化） */
let draftImageHook: ReturnType<typeof useDraftImage> | null = null

/** 提交恢复 Hook（延迟初始化） */
let submitRecoveryHook: ReturnType<typeof useSubmitRecovery> | null = null

/** 初始化草稿图片存储 */
function initDraftImageStorage(): void {
  if (draftId.value && !draftImageHook) {
    draftImageHook = useDraftImage(draftId.value)
  }
}

/** 初始化提交恢复 */
function initSubmitRecovery(): void {
  if (userStore.user?.id && !submitRecoveryHook) {
    submitRecoveryHook = useSubmitRecovery(userStore.user.id)
  }
}

/** 当前步骤 */
const currentStep = ref(0)

/** 提交状态 */
const submitting = ref(false)

/** OCR 是否已配置 */
const ocrConfigured = ref(true)

/** 表单数据（从行驶证OCR填充） */
const formData = reactive<Partial<VehicleCreate>>({
  license_plate: '',
  brand: '',
  model: '',
  color: '',
  vehicle_type: '',
  owner_name: '',
  use_character: '',
  vin: '',
  engine_number: '',
  register_date: '',
  issue_date: '',
  archive_number: '',
  inspection_valid_until: '',
  mandatory_scrap_date: ''
})

/** 行驶证和车辆照片 */
const photos = reactive<Record<string, string>>({
  driving_license_main: '',
  driving_license_sub: '',
  driving_license_sub_back: '',
  left_front: '',
  right_front: '',
  left_rear: '',
  right_rear: '',
  dashboard: '',
  rear_door: '',
  cargo_box: ''
})

/** 驾驶员证件照片 */
const driverPhotos = reactive({
  id_card_front: '',
  id_card_back: '',
  driver_license: ''
})

/** 驾驶员证件数据 */
const driverLicenseData = reactive({
  id_card_number: '',
  id_card_name: '',
  id_card_address: '',
  id_card_birth_date: '',
  license_number: '',
  license_class: '',
  valid_from: '',
  valid_to: '',
  issue_authority: ''
})

/** 车损照片 */
const damagePhotos = ref<{ path: string; size: number }[]>([])

// ==================== 计算属性 ====================

/** 是否有 OCR 识别结果 */
const hasOCRResult = computed(() => {
  return !!(formData.license_plate || formData.brand || formData.model)
})

/** 是否有驾驶员 OCR 识别结果 */
const hasDriverOCRResult = computed(() => {
  return !!(driverLicenseData.id_card_name || driverLicenseData.license_class)
})

/** 是否可以进入下一步 */
const canGoNext = computed(() => {
  switch (currentStep.value) {
    case 0: // 行驶证
      return photos.driving_license_main && 
             photos.driving_license_sub && 
             photos.driving_license_sub_back &&
             formData.license_plate &&
             formData.brand
    case 1: // 车辆照片
      return photos.left_front && 
             photos.right_front && 
             photos.left_rear && 
             photos.right_rear &&
             photos.dashboard &&
             photos.rear_door &&
             photos.cargo_box
    default:
      return true
  }
})

/** 是否可以提交 */
const canSubmit = computed(() => {
  return driverPhotos.id_card_front && 
         driverPhotos.driver_license &&
         driverLicenseData.id_card_name &&
         !submitting.value
})

// ==================== 生命周期 ====================

onMounted(async () => {
  // 初始化草稿图片存储和提交恢复
  initDraftImageStorage()
  initSubmitRecovery()

  // 检查 OCR 服务状态
  try {
    const status = await getOCRStatus()
    ocrConfigured.value = status.configured
  } catch (error) {
    console.error('检查 OCR 状态失败:', error)
    ocrConfigured.value = false
  }

  // 检查是否有失败的提交任务
  await checkFailedTasks()

  // 恢复草稿
  await loadDraft()
})

// ==================== 提交失败恢复 ====================

/**
 * 检查是否有失败的提交任务
 * 如果有，提示用户是否重试
 */
async function checkFailedTasks(): Promise<void> {
  if (!submitRecoveryHook) return

  const failedTasks = submitRecoveryHook.failedTasks.value
  if (failedTasks.length > 0) {
    // 找到添加车辆类型的失败任务
    const addTask = failedTasks.find(t => t.type === 'add')
    if (addTask) {
      uni.showModal({
        title: '发现未完成的提交',
        content: `上次提交失败，已上传 ${addTask.images.filter(i => i.status === 'success').length}/${addTask.images.length} 张图片。\n是否继续提交？`,
        confirmText: '继续提交',
        cancelText: '放弃',
        success: async (res) => {
          if (res.confirm) {
            // 恢复任务数据并重试
            await retryFailedTask(addTask.id)
          } else {
            // 删除失败任务
            await submitRecoveryHook?.deleteTask(addTask.id)
          }
        }
      })
    }
  }
}

/**
 * 重试失败的提交任务
 * @param taskId - 任务 ID
 */
async function retryFailedTask(taskId: string): Promise<void> {
  if (!submitRecoveryHook) return

  uni.showLoading({ title: '重新提交中...', mask: true })

  try {
    const result = await submitRecoveryHook.retryTask(
      taskId,
      async (formData, imageUrls) => {
        // 构建车辆数据并提交（使用 unknown 中间转换确保类型安全）
        const vehicleData = formData as unknown as VehicleCreate
        return createVehicle(vehicleData)
      },
      {
        onImageProgress: (uploaded, total) => {
          uni.showLoading({ title: `上传图片 ${uploaded}/${total}`, mask: true })
        },
        onStatusChange: (status, message) => {
          if (status === 'submitting') {
            uni.showLoading({ title: '提交数据中...', mask: true })
          }
        }
      }
    )

    uni.hideLoading()

    if (result.success) {
      uni.showToast({ title: '提交成功', icon: 'success' })
      // 清理草稿
      if (userStore.user?.id) {
        await deleteDraft('add', userStore.user.id)
        draftImageHook?.onSubmitSuccess()
      }
      setTimeout(() => navigateBack(), 1500)
    } else if (result.canRetry) {
      showSubmitFailedTip(
        result.error || '提交失败',
        true,
        () => retryFailedTask(taskId)
      )
    } else {
      uni.showToast({ title: result.error || '提交失败', icon: 'none' })
    }
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '重试失败', icon: 'none' })
  }
}

// ==================== 草稿相关 ====================

/** 加载草稿 */
async function loadDraft(): Promise<void> {
  if (!userStore.user?.id) return

  try {
    const draft = await getDraft('add', userStore.user.id)
    if (draft) {
      uni.showModal({
        title: '发现未完成的录入',
        content: `上次保存时间：${draft.saved_at ? new Date(draft.saved_at).toLocaleString('zh-CN') : '未知'}\n是否继续录入？`,
        confirmText: '继续录入',
        cancelText: '重新开始',
        success: (res) => {
          if (res.confirm) {
            restoreDraft(draft)
            uni.showToast({ title: '草稿已恢复', icon: 'success' })
          } else {
            deleteDraft('add', userStore.user!.id)
          }
        }
      })
    }
  } catch (error) {
    console.error('加载草稿失败:', error)
  }
}

/** 恢复草稿数据 */
function restoreDraft(draft: VehicleDraft): void {
  // 恢复表单数据
  if (draft.plate_number) formData.license_plate = draft.plate_number
  if (draft.brand) formData.brand = draft.brand
  if (draft.model) formData.model = draft.model
  if (draft.color) formData.color = draft.color
  if (draft.vin) formData.vin = draft.vin
  if (draft.engine_number) formData.engine_number = draft.engine_number
  if (draft.register_date) formData.register_date = draft.register_date

  // 恢复行驶证照片
  if (draft.registration_front_photo) photos.driving_license_main = draft.registration_front_photo
  if (draft.registration_back_photo) photos.driving_license_sub = draft.registration_back_photo
  if (draft.registration_sub_back_photo) photos.driving_license_sub_back = draft.registration_sub_back_photo

  // 恢复车辆照片
  if (draft.vehicle_photos && draft.vehicle_photos.length > 0) {
    const keys = ['left_front', 'right_front', 'left_rear', 'right_rear', 'dashboard', 'rear_door', 'cargo_box']
    keys.forEach((key, index) => {
      if (draft.vehicle_photos![index]) {
        photos[key] = draft.vehicle_photos![index]
      }
    })
  }

  // 恢复车损照片
  if (draft.damage_photos && draft.damage_photos.length > 0) {
    damagePhotos.value = draft.damage_photos.filter(p => p).map(path => ({ path, size: 0 }))
  }

  // 恢复驾驶员信息
  if (draft.driver_name) driverLicenseData.id_card_name = draft.driver_name
  if (draft.driver_id_number) driverLicenseData.id_card_number = draft.driver_id_number
  if (draft.driver_license_number) driverLicenseData.license_number = draft.driver_license_number
  if (draft.driver_license_class) driverLicenseData.license_class = draft.driver_license_class
  if (draft.driver_license_valid_from) driverLicenseData.valid_from = draft.driver_license_valid_from
  if (draft.driver_license_valid_until) driverLicenseData.valid_to = draft.driver_license_valid_until

  // 恢复驾驶员证件照片
  if (draft.id_card_front_photo) driverPhotos.id_card_front = draft.id_card_front_photo
  if (draft.driver_license_photo) driverPhotos.driver_license = draft.driver_license_photo
}

/** 保存草稿 */
async function saveCurrentDraft(): Promise<void> {
  if (!userStore.user?.id) return

  const draft: VehicleDraft = {
    plate_number: formData.license_plate,
    brand: formData.brand,
    model: formData.model,
    color: formData.color,
    vin: formData.vin,
    engine_number: formData.engine_number,
    register_date: formData.register_date,
    registration_front_photo: photos.driving_license_main,
    registration_back_photo: photos.driving_license_sub,
    registration_sub_back_photo: photos.driving_license_sub_back,
    vehicle_photos: [
      photos.left_front,
      photos.right_front,
      photos.left_rear,
      photos.right_rear,
      photos.dashboard,
      photos.rear_door,
      photos.cargo_box
    ],
    damage_photos: damagePhotos.value.map(p => p.path),
    driver_name: driverLicenseData.id_card_name,
    driver_id_number: driverLicenseData.id_card_number,
    driver_license_number: driverLicenseData.license_number,
    driver_license_class: driverLicenseData.license_class,
    driver_license_valid_from: driverLicenseData.valid_from,
    driver_license_valid_until: driverLicenseData.valid_to,
    id_card_front_photo: driverPhotos.id_card_front,
    driver_license_photo: driverPhotos.driver_license,
    current_step: currentStep.value
  }

  await saveDraft('add', userStore.user.id, draft)
}

// 监听数据变化，自动保存草稿（防抖）
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  [() => formData, () => photos, () => driverPhotos, () => driverLicenseData, () => damagePhotos.value],
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveCurrentDraft()
    }, 1000)
  },
  { deep: true }
)

// ==================== OCR 识别 ====================

/** 处理行驶证主页变化 */
async function handleDrivingLicenseMainChange(path: string): Promise<void> {
  if (!path || !ocrConfigured.value) return

  uni.showLoading({ title: '识别中...' })
  try {
    const base64 = await readImageAsBase64(path)
    const result = await recognizeDrivingLicense(base64)

    if (result.success && result.data) {
      // 填充表单（行驶证主页字段）
      // 注意：后端 OCR 可能返回的是驾驶证字段，需要适配
      if (result.data.license_number) formData.license_plate = result.data.license_number
      if (result.data.name) formData.owner_name = result.data.name
      if (result.data.vehicle_type) formData.vehicle_type = result.data.vehicle_type
      
      uni.showToast({ title: '识别成功', icon: 'success' })
    } else {
      uni.showToast({ title: result.error || '识别失败', icon: 'none' })
    }
  } catch (error: any) {
    console.error('OCR 识别失败:', error)
    uni.showToast({ title: error.message || '识别失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

/** 处理行驶证副页变化 */
async function handleDrivingLicenseSubChange(path: string): Promise<void> {
  // 副页 OCR 识别（如果后端支持）
  console.log('行驶证副页已拍摄:', path)
}

/** 处理行驶证副页背页变化 */
async function handleDrivingLicenseSubBackChange(path: string): Promise<void> {
  // 副页背页 OCR 识别（如果后端支持）
  console.log('行驶证副页背页已拍摄:', path)
}

/** 处理身份证正面变化 */
async function handleIdCardFrontChange(path: string): Promise<void> {
  if (!path || !ocrConfigured.value) return

  uni.showLoading({ title: '识别中...' })
  try {
    const base64 = await readImageAsBase64(path)
    const result = await recognizeDrivingLicense(base64) // 复用 OCR 接口

    if (result.success && result.data) {
      if (result.data.name) driverLicenseData.id_card_name = result.data.name
      if (result.data.license_number) driverLicenseData.id_card_number = result.data.license_number
      if (result.data.address) driverLicenseData.id_card_address = result.data.address
      
      uni.showToast({ title: '识别成功', icon: 'success' })
    }
  } catch (error: any) {
    console.error('身份证识别失败:', error)
    uni.showToast({ title: '识别失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

/** 处理驾驶证变化 */
async function handleDriverLicenseChange(path: string): Promise<void> {
  if (!path || !ocrConfigured.value) return

  uni.showLoading({ title: '识别中...' })
  try {
    const base64 = await readImageAsBase64(path)
    const result = await recognizeDrivingLicense(base64)

    if (result.success && result.data) {
      if (result.data.name) driverLicenseData.id_card_name = result.data.name
      if (result.data.license_number) driverLicenseData.license_number = result.data.license_number
      if (result.data.vehicle_type) driverLicenseData.license_class = result.data.vehicle_type
      if (result.data.valid_from) driverLicenseData.valid_from = result.data.valid_from
      if (result.data.valid_to) driverLicenseData.valid_to = result.data.valid_to
      
      uni.showToast({ title: '识别成功', icon: 'success' })
    }
  } catch (error: any) {
    console.error('驾驶证识别失败:', error)
    uni.showToast({ title: '识别失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// ==================== 车损照片 ====================

/** 添加车损照片 */
function handleAddDamagePhoto(): void {
  uni.chooseImage({
    count: 9 - damagePhotos.value.length,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: (res) => {
      // 确保 tempFiles 是数组类型，使用类型断言处理 UniApp 类型兼容性
      const tempFiles = (Array.isArray(res.tempFiles) ? res.tempFiles : [res.tempFiles]) as Array<{ path: string; size?: number }>
      const newPhotos = tempFiles.map((file) => ({
        path: file.path,
        size: file.size || 0
      }))
      damagePhotos.value = [...damagePhotos.value, ...newPhotos]
    }
  })
}

/** 删除车损照片 */
function handleDeleteDamagePhoto(index: number): void {
  damagePhotos.value = damagePhotos.value.filter((_, i) => i !== index)
}

// ==================== 步骤导航 ====================

/** 上一步 */
function handlePrev(): void {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

/** 下一步 */
function handleNext(): void {
  if (!canGoNext.value) {
    showStepError()
    return
  }
  
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    uni.showToast({ title: '进入下一步', icon: 'success' })
  }
}

/** 显示步骤错误提示 */
function showStepError(): void {
  switch (currentStep.value) {
    case 0:
      if (!photos.driving_license_main) {
        uni.showToast({ title: '请拍摄行驶证主页', icon: 'none' })
      } else if (!photos.driving_license_sub) {
        uni.showToast({ title: '请拍摄行驶证副页', icon: 'none' })
      } else if (!photos.driving_license_sub_back) {
        uni.showToast({ title: '请拍摄行驶证副页背页', icon: 'none' })
      } else if (!formData.license_plate) {
        uni.showToast({ title: '请先识别行驶证获取车牌号', icon: 'none' })
      }
      break
    case 1:
      uni.showToast({ title: '请拍摄所有角度的车辆照片', icon: 'none' })
      break
  }
}

// ==================== 提交 ====================

/** 提交表单 */
async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) {
    if (!driverPhotos.id_card_front) {
      uni.showToast({ title: '请拍摄身份证正面', icon: 'none' })
    } else if (!driverPhotos.driver_license) {
      uni.showToast({ title: '请拍摄驾驶证', icon: 'none' })
    } else if (!driverLicenseData.id_card_name) {
      uni.showToast({ title: '请先识别证件获取姓名', icon: 'none' })
    }
    return
  }

  uni.showModal({
    title: '确认提交',
    content: `确定要提交车牌号为 ${formData.license_plate} 的车辆信息吗？`,
    success: async (res) => {
      if (res.confirm) {
        await doSubmit()
      }
    }
  })
}

/** 执行提交 */
async function doSubmit(): Promise<void> {
  submitting.value = true
  uni.showLoading({ title: '上传中...', mask: true })

  try {
    // 收集所有需要上传的图片路径
    const allImagePaths: string[] = []
    
    // 行驶证和车辆照片
    for (const [key, path] of Object.entries(photos)) {
      if (path) {
        allImagePaths.push(path)
      }
    }
    
    // 驾驶员证件照片
    for (const [key, path] of Object.entries(driverPhotos)) {
      if (path) {
        allImagePaths.push(path)
      }
    }
    
    // 车损照片
    for (const photo of damagePhotos.value) {
      allImagePaths.push(photo.path)
    }

    // 如果有提交恢复管理器，创建提交任务
    let taskId: string | null = null
    if (submitRecoveryHook && userStore.user?.id) {
      // 构建表单数据
      const submitFormData = {
        license_plate: formData.license_plate,
        brand: formData.brand,
        model: formData.model,
        color: formData.color,
        vehicle_type: formData.vehicle_type,
        owner_name: formData.owner_name,
        vin: formData.vin,
        engine_number: formData.engine_number,
        register_date: formData.register_date,
        issue_date: formData.issue_date,
        archive_number: formData.archive_number,
        inspection_valid_until: formData.inspection_valid_until,
        mandatory_scrap_date: formData.mandatory_scrap_date
      }
      
      taskId = await submitRecoveryHook.createTask(
        'add',
        submitFormData,
        allImagePaths,
        { draftId: draftId.value }
      )
    }

    // 上传所有照片
    const uploadedPhotos: Record<string, string> = {}
    const uploadErrors: string[] = []
    let uploadedCount = 0
    const totalCount = allImagePaths.length

    // 上传行驶证和车辆照片
    for (const [key, path] of Object.entries(photos)) {
      if (path) {
        try {
          const url = await uploadImage(path, `vehicle_${key}`)
          uploadedPhotos[key] = url
          uploadedCount++
          uni.showLoading({ title: `上传图片 ${uploadedCount}/${totalCount}`, mask: true })
          
          // 标记图片已上传（用于断点续传）
          if (taskId && submitRecoveryHook) {
            await submitRecoveryHook.getUploadedUrls(taskId)
          }
        } catch (error) {
          console.error(`上传 ${key} 失败:`, error)
          uploadErrors.push(key)
        }
      }
    }

    // 上传驾驶员证件照片
    for (const [key, path] of Object.entries(driverPhotos)) {
      if (path) {
        try {
          const url = await uploadImage(path, `driver_${key}`)
          uploadedPhotos[`driver_${key}`] = url
          uploadedCount++
          uni.showLoading({ title: `上传图片 ${uploadedCount}/${totalCount}`, mask: true })
        } catch (error) {
          console.error(`上传 ${key} 失败:`, error)
          uploadErrors.push(key)
        }
      }
    }

    // 上传车损照片
    const uploadedDamagePhotos: string[] = []
    for (let i = 0; i < damagePhotos.value.length; i++) {
      try {
        const url = await uploadImage(damagePhotos.value[i].path, `damage_${i}`)
        uploadedDamagePhotos.push(url)
        uploadedCount++
        uni.showLoading({ title: `上传图片 ${uploadedCount}/${totalCount}`, mask: true })
      } catch (error) {
        console.error(`上传车损照片 ${i} 失败:`, error)
      }
    }

    // 如果有上传失败的照片，保存草稿并提示重试
    if (uploadErrors.length > 0) {
      // 自动保存草稿
      await saveCurrentDraft()
      
      const errorMsg = `以下照片上传失败：${uploadErrors.join('、')}`
      
      // 使用提交失败恢复提示
      showSubmitFailedTip(
        errorMsg,
        true,
        () => doSubmit(), // 重试
        () => {
          submitting.value = false
          uni.hideLoading()
        }
      )
      return
    }

    uni.showLoading({ title: '提交数据中...', mask: true })

    // 构建车辆数据
    const vehicleData: VehicleCreate = {
      license_plate: formData.license_plate!,
      brand: formData.brand || undefined,
      model: formData.model || undefined,
      color: formData.color || undefined,
      vehicle_type: formData.vehicle_type || undefined,
      owner_name: formData.owner_name || undefined,
      vin: formData.vin || undefined,
      engine_number: formData.engine_number || undefined,
      register_date: formData.register_date || undefined,
      issue_date: formData.issue_date || undefined,
      archive_number: formData.archive_number || undefined,
      inspection_valid_until: formData.inspection_valid_until || undefined,
      mandatory_scrap_date: formData.mandatory_scrap_date || undefined,
      // 车辆照片
      left_front_photo: uploadedPhotos.left_front,
      right_front_photo: uploadedPhotos.right_front,
      left_rear_photo: uploadedPhotos.left_rear,
      right_rear_photo: uploadedPhotos.right_rear,
      dashboard_photo: uploadedPhotos.dashboard,
      rear_door_photo: uploadedPhotos.rear_door,
      cargo_box_photo: uploadedPhotos.cargo_box,
      // 行驶证照片
      driving_license_main_photo: uploadedPhotos.driving_license_main,
      driving_license_sub_photo: uploadedPhotos.driving_license_sub,
      driving_license_sub_back_photo: uploadedPhotos.driving_license_sub_back,
      // 提车照片数组
      pickup_photos: [
        uploadedPhotos.left_front,
        uploadedPhotos.right_front,
        uploadedPhotos.left_rear,
        uploadedPhotos.right_rear,
        uploadedPhotos.dashboard,
        uploadedPhotos.rear_door,
        uploadedPhotos.cargo_box
      ].filter(Boolean),
      // 行驶证照片数组
      registration_photos: [
        uploadedPhotos.driving_license_main,
        uploadedPhotos.driving_license_sub,
        uploadedPhotos.driving_license_sub_back
      ].filter(Boolean),
      // 车损照片
      damage_photos: uploadedDamagePhotos.length > 0 ? uploadedDamagePhotos : undefined,
      // 状态
      status: 'picked_up',
      pickup_time: new Date().toISOString(),
      review_status: 'pending_review'
    }

    // 创建车辆
    await createVehicle(vehicleData)

    uni.hideLoading()
    uni.showToast({ title: '提交成功', icon: 'success' })

    // 删除草稿和清理本地图片
    if (userStore.user?.id) {
      await deleteDraft('add', userStore.user.id)
      // 清理草稿图片存储
      if (draftImageHook) {
        await draftImageHook.onSubmitSuccess()
      }
      // 删除提交任务
      if (taskId && submitRecoveryHook) {
        await submitRecoveryHook.deleteTask(taskId)
      }
    }

    // 延迟返回
    setTimeout(() => {
      navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.hideLoading()
    console.error('提交失败:', error)
    
    // 自动保存草稿
    await saveCurrentDraft()
    
    // 使用提交失败恢复提示
    showSubmitFailedTip(
      error.message || '提交失败',
      true,
      () => doSubmit(), // 重试
      () => {
        submitting.value = false
      }
    )
  } finally {
    submitting.value = false
  }
}

// ==================== 工具函数 ====================

/** 脱敏身份证号 */
function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 10) return idCard
  return idCard.substring(0, 6) + '****' + idCard.substring(idCard.length - 4)
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.add-vehicle-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #eff6ff, #dbeafe);
  display: flex;
  flex-direction: column;
}

/* 页面标题 */
.page-header {
  padding: 24rpx;
  background-color: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #1e3a8a;
  display: block;
  margin-bottom: 8rpx;
}

.page-subtitle {
  font-size: 26rpx;
  color: #666666;
}

/* 步骤内容区域 */
.step-content {
  flex: 1;
  padding: 0 24rpx;
  padding-bottom: 160rpx;
}

.step-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20rpx); }
  to { opacity: 1; transform: translateY(0); }
}

/* 区块卡片 */
.section-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.section-required {
  color: #ff4d4f;
  margin-left: 8rpx;
}

.section-optional {
  font-size: 24rpx;
  color: #999999;
  margin-left: 8rpx;
}

.section-desc {
  font-size: 24rpx;
  color: #666666;
  margin-bottom: 20rpx;
  display: block;
}

/* OCR 识别结果卡片 */
.ocr-result-card {
  background-color: #f6ffed;
  border: 2rpx solid #b7eb8f;
}

.ocr-result-list {
  display: flex;
  flex-direction: column;
}

.result-item {
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

/* 车损照片网格 */
.damage-photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}

.damage-photo-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}

.damage-image {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
  border: 2rpx solid #e0e0e0;
}

.delete-btn {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: #ff4d4f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-icon {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: bold;
}

.add-damage-btn {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #d9d9d9;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.add-icon {
  font-size: 48rpx;
  color: #999999;
}

.add-text {
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 底部操作栏 */
.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.action-btn {
  flex: 1;
  padding: 28rpx;
  border-radius: 12rpx;
  text-align: center;
  
  &.disabled {
    opacity: 0.5;
  }
}

.prev-btn {
  background-color: #f5f5f5;
  
  .btn-text {
    color: #666666;
  }
}

.next-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3);
  
  .btn-text {
    color: #ffffff;
  }
}

.submit-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4rpx 12rpx rgba(16, 185, 129, 0.3);
  
  .btn-text {
    color: #ffffff;
  }
}

.btn-text {
  font-size: 32rpx;
  font-weight: bold;
}
</style>
