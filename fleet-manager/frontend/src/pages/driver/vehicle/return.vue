<template>
  <!--
    还车录入页面
    功能：
    - 显示车辆基本信息
    - 拍摄7个角度的车辆照片
    - 上传车损特写照片（可选）
    - 车损责任提醒弹窗
    - 草稿自动保存/恢复（集成 DraftImageStorage）
    - 调用新的还车 API 更新车辆状态
    参考主项目 src/pages/driver/return-vehicle/index.tsx
    @requirements 10.1, 1.1
  -->
  <view class="return-vehicle-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <view class="header-icon">🚗</view>
      <view class="header-content">
        <text class="page-title">还车录入</text>
        <text class="page-subtitle">请按顺序拍摄车辆照片并上传车损特写</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 车辆不存在 -->
    <view v-else-if="!vehicle" class="empty-container">
      <text class="empty-text">车辆信息不存在</text>
    </view>

    <!-- 主内容区域 -->
    <scroll-view v-else scroll-y class="main-content">
      <!-- 车辆信息卡片 -->
      <view class="section-card vehicle-info-card">
        <view class="section-header">
          <text class="section-icon">ℹ️</text>
          <text class="section-title">车辆信息</text>
        </view>
        <view class="info-list">
          <view class="info-item">
            <text class="info-label">车牌号：</text>
            <view class="plate-number-badge">
              <text class="plate-number-text">{{ vehicle.license_plate }}</text>
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">品牌型号：</text>
            <text class="info-value">{{ vehicle.brand || '-' }} {{ vehicle.model || '' }}</text>
          </view>
          <view v-if="vehicle.pickup_time" class="info-item">
            <text class="info-label">提车时间：</text>
            <text class="info-value">{{ formatDateTime(vehicle.pickup_time) }}</text>
          </view>
          <view v-if="vehicle.color" class="info-item">
            <text class="info-label">车辆颜色：</text>
            <text class="info-value">{{ vehicle.color }}</text>
          </view>
        </view>
      </view>

      <!-- 车辆照片区域 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-icon">📷</text>
          <text class="section-title">车辆照片</text>
          <text class="section-required">*</text>
        </view>
        <text class="section-desc">请按顺序拍摄以下7张车辆照片</text>

        <!-- 7个角度照片 -->
        <PhotoCapture
          v-for="item in vehiclePhotoLabels"
          :key="item.key"
          :title="item.label"
          :description="item.desc"
          v-model="vehiclePhotos[item.key]"
          :required="true"
          @change="(path: string) => handleVehiclePhotoChange(item.key, path)"
        />
      </view>

      <!-- 车损特写照片区域 - 使用 AlbumMultiSelector 组件 -->
      <!-- @requirements 13.3 - 不限制选择数量 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-icon">🔍</text>
          <text class="section-title">车损特写</text>
          <text class="section-optional">（可选）</text>
        </view>
        <text class="section-desc">如有车辆损伤，请拍摄特写照片，支持滑动连续选择</text>

        <!-- 使用 AlbumMultiSelector 组件，maxCount=0 表示无数量限制 -->
        <AlbumMultiSelector
          v-model:selected="damagePhotosForSelector"
          :max-count="0"
          :enable-swipe-select="true"
          :show-preview="true"
          preview-title="车损照片"
          add-button-text="添加车损照片"
          @change="handleDamagePhotosChange"
          @delete="handleDamagePhotoDelete"
        />
      </view>

      <!-- 提交按钮 -->
      <view class="submit-section">
        <view 
          :class="['submit-btn', { disabled: !canSubmit || submitting }]"
          @click="handleSubmit"
        >
          <text v-if="submitting" class="btn-text">上传中...</text>
          <text v-else class="btn-text">✓ 确认还车</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 还车录入页面
 * 功能：
 * - 显示车辆信息
 * - 拍摄还车照片（7张）
 * - 上传车损特写照片（可选）
 * - 集成 DraftImageStorage 保存拍摄的图片到本地
 * - 调用新的还车 API 更新车辆状态
 * 参考主项目 src/pages/driver/return-vehicle/index.tsx
 * @requirements 10.1, 1.1
 */

import { ref, reactive, computed, watch, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PhotoCapture from '@/components/PhotoCapture.vue'
import AlbumMultiSelector from '@/components/AlbumMultiSelector/index.vue'
import type { PhotoItem } from '@/components/AlbumMultiSelector/types'
import { getVehicle, returnVehicle, updateVehicle } from '@/api'
import type { Vehicle } from '@/api/types'
import { useUserStore } from '@/store/user'
import { saveDraft, getDraft, deleteDraft, type VehicleDraft } from '@/utils/draftUtils'
import { uploadImage } from '@/utils/imageUpload'
import { navigateBack, formatDateTime } from '@/utils'
// 集成草稿图片存储和提交失败恢复
import { useDraftImage, generateDraftId } from '@/utils/draftImage'
import { useSubmitRecovery, showSubmitFailedTip } from '@/utils/submitRecovery/useSubmitRecovery'

// ==================== 常量定义 ====================

/** 车辆照片标签（与提车相同的7张照片） */
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
const draftIdComputed = computed(() => {
  if (!userStore.user?.id || !vehicleId.value) return ''
  return generateDraftId(userStore.user.id, 'return', vehicleId.value)
})

/** 草稿图片存储 Hook（延迟初始化） */
let draftImageHook: ReturnType<typeof useDraftImage> | null = null

/** 提交恢复 Hook（延迟初始化） */
let submitRecoveryHook: ReturnType<typeof useSubmitRecovery> | null = null

/** 初始化草稿图片存储 */
function initDraftImageStorage(): void {
  if (draftIdComputed.value && !draftImageHook) {
    draftImageHook = useDraftImage(draftIdComputed.value)
  }
}

/** 初始化提交恢复 */
function initSubmitRecovery(): void {
  if (userStore.user?.id && !submitRecoveryHook) {
    submitRecoveryHook = useSubmitRecovery(userStore.user.id)
  }
}

/** 车辆ID */
const vehicleId = ref<number | null>(null)

/** 车辆信息 */
const vehicle = ref<Vehicle | null>(null)

/** 加载状态 */
const loading = ref(false)

/** 提交状态 */
const submitting = ref(false)

/** 7张车辆照片 */
const vehiclePhotos = reactive<Record<string, string>>({
  left_front: '',
  right_front: '',
  left_rear: '',
  right_rear: '',
  dashboard: '',
  rear_door: '',
  cargo_box: ''
})

/** 车损特写照片（内部存储格式） */
const damagePhotos = ref<{ path: string; size: number; localPath?: string }[]>([])

/** 车损照片（用于 AlbumMultiSelector 组件的格式） */
const damagePhotosForSelector = computed({
  get: () => damagePhotos.value.map(p => ({
    path: p.path,
    size: p.size,
    filename: p.localPath
  } as PhotoItem)),
  set: (newPhotos: PhotoItem[]) => {
    damagePhotos.value = newPhotos.map(p => ({
      path: p.path,
      size: p.size || 0,
      localPath: p.filename
    }))
  }
})

// ==================== 计算属性 ====================

/** 是否可以提交 */
const canSubmit = computed(() => {
  // 检查所有7张照片是否都已拍摄
  return vehiclePhotos.left_front &&
         vehiclePhotos.right_front &&
         vehiclePhotos.left_rear &&
         vehiclePhotos.right_rear &&
         vehiclePhotos.dashboard &&
         vehiclePhotos.rear_door &&
         vehiclePhotos.cargo_box &&
         !submitting.value
})

// ==================== 生命周期 ====================

onLoad((options) => {
  const id = options?.id
  if (id) {
    vehicleId.value = Number(id)
    loadVehicleInfo(Number(id))
  } else {
    uni.showToast({ title: '缺少车辆ID', icon: 'error' })
    setTimeout(() => {
      navigateBack()
    }, 1500)
  }
})

onMounted(async () => {
  // 恢复草稿（在车辆信息加载后执行）
})

// ==================== 数据加载 ====================

/**
 * 加载车辆信息
 * @param id - 车辆ID
 */
async function loadVehicleInfo(id: number): Promise<void> {
  loading.value = true
  uni.showLoading({ title: '加载中...' })
  
  try {
    const data = await getVehicle(id)
    if (data) {
      vehicle.value = data
      
      // 初始化草稿图片存储和提交恢复
      initDraftImageStorage()
      initSubmitRecovery()
      
      // 加载草稿
      await loadDraft()
      
      // 检查是否有失败的提交任务
      await checkFailedTasks()
    } else {
      uni.showToast({ title: '车辆不存在', icon: 'error' })
      setTimeout(() => {
        navigateBack()
      }, 1500)
    }
  } catch (error) {
    console.error('加载车辆信息失败:', error)
    uni.showToast({ title: '加载失败', icon: 'error' })
  } finally {
    loading.value = false
    uni.hideLoading()
  }
}

// ==================== 照片变化处理（集成 DraftImageStorage） ====================

/**
 * 处理车辆照片变化
 * 拍摄照片后立即保存到本地存储（DraftImageStorage）
 * @param key - 照片类型键（如 left_front）
 * @param path - 临时文件路径
 * @requirements 10.1 - 拍摄图片后立即保存到本地存储
 */
async function handleVehiclePhotoChange(key: string, path: string): Promise<void> {
  if (!path) return

  // 如果草稿图片存储已初始化，保存图片到本地
  if (draftImageHook) {
    try {
      // 生成文件名
      const filename = `return_${key}_${Date.now()}.jpg`
      
      // 保存图片到本地存储
      const localPath = await draftImageHook.saveImage(path, filename, {
        imageType: 'vehicle'
      })
      
      console.log(`[还车] 照片 ${key} 已保存到本地:`, localPath)
    } catch (error) {
      console.error(`[还车] 保存照片 ${key} 失败:`, error)
      // 保存失败不影响正常流程，图片仍然使用临时路径
    }
  }
}

// ==================== 提交失败恢复 ====================

/**
 * 检查是否有失败的提交任务
 */
async function checkFailedTasks(): Promise<void> {
  if (!submitRecoveryHook || !vehicleId.value) return

  const failedTasks = submitRecoveryHook.failedTasks.value
  // 找到当前车辆的还车失败任务
  const returnTask = failedTasks.find(
    t => t.type === 'return' && t.vehicleId === vehicleId.value
  )
  
  if (returnTask) {
    uni.showModal({
      title: '发现未完成的提交',
      content: `上次还车提交失败，已上传 ${returnTask.images.filter(i => i.status === 'success').length}/${returnTask.images.length} 张图片。\n是否继续提交？`,
      confirmText: '继续提交',
      cancelText: '放弃',
      success: async (res) => {
        if (res.confirm) {
          await retryFailedTask(returnTask.id)
        } else {
          await submitRecoveryHook?.deleteTask(returnTask.id)
        }
      }
    })
  }
}

/**
 * 重试失败的提交任务
 * @param taskId - 任务 ID
 */
async function retryFailedTask(taskId: string): Promise<void> {
  if (!submitRecoveryHook || !vehicle.value) return

  uni.showLoading({ title: '重新提交中...', mask: true })

  try {
    const result = await submitRecoveryHook.retryTask(
      taskId,
      async (formData, imageUrls) => {
        // 分离还车照片和车损照片
        const returnPhotoUrls = imageUrls.slice(0, 7)
        const damagePhotoUrls = imageUrls.slice(7)
        
        // 调用还车 API
        return returnVehicle(
          vehicle.value!.id,
          returnPhotoUrls,
          damagePhotoUrls.length > 0 ? damagePhotoUrls : undefined
        )
      },
      {
        onImageProgress: (uploaded, total) => {
          uni.showLoading({ title: `上传图片 ${uploaded}/${total}`, mask: true })
        }
      }
    )

    uni.hideLoading()

    if (result.success) {
      uni.showToast({ title: '还车成功', icon: 'success' })
      // 清理草稿
      if (userStore.user?.id && vehicleId.value) {
        const draftKey = `${userStore.user.id}_${vehicleId.value}`
        await deleteDraft('return', draftKey)
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

/**
 * 加载草稿
 */
async function loadDraft(): Promise<void> {
  if (!userStore.user?.id || !vehicleId.value) return

  try {
    // 使用 userId_vehicleId 作为草稿键
    const draftKey = `${userStore.user.id}_${vehicleId.value}`
    const draft = await getDraft('return', draftKey)
    
    if (draft) {
      uni.showModal({
        title: '发现未完成的还车录入',
        content: `上次保存时间：${draft.saved_at ? new Date(draft.saved_at).toLocaleString('zh-CN') : '未知'}\n是否继续录入？`,
        confirmText: '继续录入',
        cancelText: '重新开始',
        success: (res) => {
          if (res.confirm) {
            restoreDraft(draft)
            uni.showToast({ title: '草稿已恢复', icon: 'success' })
          } else {
            deleteDraft('return', draftKey)
          }
        }
      })
    }
  } catch (error) {
    console.error('加载草稿失败:', error)
  }
}

/**
 * 恢复草稿数据
 * @param draft - 草稿数据
 */
function restoreDraft(draft: VehicleDraft): void {
  // 恢复车辆照片
  if (draft.vehicle_photos && draft.vehicle_photos.length > 0) {
    const keys = ['left_front', 'right_front', 'left_rear', 'right_rear', 'dashboard', 'rear_door', 'cargo_box']
    keys.forEach((key, index) => {
      if (draft.vehicle_photos![index]) {
        vehiclePhotos[key] = draft.vehicle_photos![index]
      }
    })
  }

  // 恢复车损照片
  if (draft.damage_photos && draft.damage_photos.length > 0) {
    damagePhotos.value = draft.damage_photos.filter(p => p).map(path => ({ path, size: 0 }))
  }
}

/**
 * 保存当前草稿
 */
async function saveCurrentDraft(): Promise<void> {
  if (!userStore.user?.id || !vehicleId.value) return

  const draftKey = `${userStore.user.id}_${vehicleId.value}`
  const draft: VehicleDraft = {
    vehicle_photos: [
      vehiclePhotos.left_front,
      vehiclePhotos.right_front,
      vehiclePhotos.left_rear,
      vehiclePhotos.right_rear,
      vehiclePhotos.dashboard,
      vehiclePhotos.rear_door,
      vehiclePhotos.cargo_box
    ],
    damage_photos: damagePhotos.value.map(p => p.path)
  }

  await saveDraft('return', draftKey, draft)
}

// 监听数据变化，自动保存草稿（防抖）
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  [() => vehiclePhotos, () => damagePhotos.value],
  () => {
    // 只有当有数据时才保存
    const hasData = vehiclePhotos.left_front || damagePhotos.value.length > 0
    if (!hasData) return

    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveCurrentDraft()
    }, 1000)
  },
  { deep: true }
)

// ==================== 车损照片操作（使用 AlbumMultiSelector） ====================

/**
 * 处理车损照片变化
 * 当 AlbumMultiSelector 组件选择变化时调用
 * @param photos - 新的照片列表
 * @requirements 13.3 - 不限制选择数量
 * @requirements 10.1 - 拍摄图片后立即保存到本地存储
 */
async function handleDamagePhotosChange(photos: PhotoItem[]): Promise<void> {
  // 找出新增的照片（需要保存到本地存储）
  const existingPaths = new Set(damagePhotos.value.map(p => p.path))
  const newPhotos = photos.filter(p => !existingPaths.has(p.path))

  // 保存新增照片到本地存储
  if (draftImageHook && newPhotos.length > 0) {
    for (let i = 0; i < newPhotos.length; i++) {
      const photo = newPhotos[i]
      try {
        const filename = `return_damage_${Date.now()}_${i}.jpg`
        const localPath = await draftImageHook.saveImage(photo.path, filename, {
          imageType: 'damage'
        })
        // 更新照片的本地路径
        photo.filename = localPath
        console.log(`[还车] 车损照片已保存到本地:`, localPath)
      } catch (error) {
        console.error(`[还车] 保存车损照片失败:`, error)
      }
    }
  }

  // 更新内部状态
  damagePhotos.value = photos.map(p => ({
    path: p.path,
    size: p.size || 0,
    localPath: p.filename
  }))
}

/**
 * 处理车损照片删除
 * 当 AlbumMultiSelector 组件删除照片时调用
 * @param index - 照片索引
 * @param photo - 被删除的照片
 * @requirements 13.5 - 支持点击取消单张选择
 */
async function handleDamagePhotoDelete(index: number, photo: PhotoItem): Promise<void> {
  // 如果有本地路径，尝试删除本地文件
  if (photo.filename && draftImageHook) {
    try {
      await draftImageHook.deleteImage(photo.filename)
      console.log(`[还车] 已删除本地车损照片:`, photo.filename)
    } catch (error) {
      console.error(`[还车] 删除本地车损照片失败:`, error)
    }
  }
}

// ==================== 提交相关 ====================

/**
 * 显示车损责任提醒弹窗
 * @returns 用户是否确认
 */
function showDamageWarningModal(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '⚠️ 重要提醒',
      content: '还车前请务必联系车队长或调度核实车损情况！\n\n如未联系核实，一切车损由司机本人负责。\n\n请确认您已联系车队长或调度核实车损。',
      confirmText: '已联系确认',
      cancelText: '返回检查',
      confirmColor: '#f97316',
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 检查必填照片
 * @returns 是否通过检查
 */
function checkRequiredPhotos(): boolean {
  const missingPhotos: string[] = []
  
  vehiclePhotoLabels.forEach(({ key, label }) => {
    if (!vehiclePhotos[key]) {
      missingPhotos.push(label)
    }
  })

  if (missingPhotos.length > 0) {
    uni.showToast({
      title: `请拍摄：${missingPhotos[0]}`,
      icon: 'none',
      duration: 2000
    })
    return false
  }
  
  return true
}

/**
 * 提交还车
 * 调用新的还车 API（PUT /api/vehicles/{id}/return）
 * @requirements 1.1 - 调用还车 API 更新车辆状态
 */
async function handleSubmit(): Promise<void> {
  if (!vehicle.value) {
    uni.showToast({ title: '车辆信息不存在', icon: 'error' })
    return
  }

  // 检查必填照片
  if (!checkRequiredPhotos()) {
    return
  }

  // 显示车损责任提醒弹窗
  const confirmed = await showDamageWarningModal()
  if (!confirmed) {
    return
  }

  try {
    submitting.value = true
    uni.showLoading({ title: '上传中...', mask: true })

    // 收集所有需要上传的图片路径
    const allImagePaths: string[] = []
    
    // 7张车辆照片
    for (const [key, path] of Object.entries(vehiclePhotos)) {
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
      taskId = await submitRecoveryHook.createTask(
        'return',
        { vehicleId: vehicle.value.id },
        allImagePaths,
        { vehicleId: vehicle.value.id, draftId: draftIdComputed.value }
      )
    }

    // 1. 上传7张车辆照片
    const uploadedVehiclePhotos: Record<string, string> = {}
    const uploadErrors: string[] = []
    let uploadedCount = 0
    const totalCount = allImagePaths.length

    for (const [key, path] of Object.entries(vehiclePhotos)) {
      if (path) {
        try {
          const url = await uploadImage(path, `return_${key}`)
          uploadedVehiclePhotos[key] = url
          uploadedCount++
          uni.showLoading({ title: `上传图片 ${uploadedCount}/${totalCount}`, mask: true })
        } catch (error) {
          console.error(`上传 ${key} 照片失败:`, error)
          uploadErrors.push(key)
        }
      }
    }

    // 2. 上传车损特写照片
    const uploadedDamagePhotos: string[] = []
    for (let i = 0; i < damagePhotos.value.length; i++) {
      try {
        const url = await uploadImage(damagePhotos.value[i].path, `return_damage_${i}`)
        uploadedDamagePhotos.push(url)
        uploadedCount++
        uni.showLoading({ title: `上传图片 ${uploadedCount}/${totalCount}`, mask: true })
      } catch (error) {
        console.error(`上传车损照片 ${i} 失败:`, error)
      }
    }

    // 如果有上传失败的照片，保存草稿并提示重试
    if (uploadErrors.length > 0) {
      await saveCurrentDraft()
      
      const errorMsg = `以下照片上传失败：${uploadErrors.join('、')}`
      showSubmitFailedTip(
        errorMsg,
        true,
        () => handleSubmit(),
        () => {
          submitting.value = false
          uni.hideLoading()
        }
      )
      return
    }

    uni.showLoading({ title: '提交数据中...', mask: true })

    // 3. 构建还车照片数组（按顺序：7张基本照片）
    const returnPhotoUrls = [
      uploadedVehiclePhotos.left_front,
      uploadedVehiclePhotos.right_front,
      uploadedVehiclePhotos.left_rear,
      uploadedVehiclePhotos.right_rear,
      uploadedVehiclePhotos.dashboard,
      uploadedVehiclePhotos.rear_door,
      uploadedVehiclePhotos.cargo_box
    ].filter(Boolean)

    // 4. 调用新的还车 API（PUT /api/vehicles/{id}/return）
    // API 要求：return_photos 数组包含 7 张照片 URL
    // API 要求：damage_photos 数组（可选）
    const result = await returnVehicle(
      vehicle.value.id,
      returnPhotoUrls,
      uploadedDamagePhotos.length > 0 ? uploadedDamagePhotos : undefined
    )

    uni.hideLoading()
    uni.showToast({ title: '还车成功', icon: 'success' })

    // 删除草稿和清理本地图片
    if (userStore.user?.id && vehicleId.value) {
      const draftKey = `${userStore.user.id}_${vehicleId.value}`
      await deleteDraft('return', draftKey)
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
    console.error('还车失败:', error)
    
    // 自动保存草稿
    await saveCurrentDraft()
    
    // 使用提交失败恢复提示
    showSubmitFailedTip(
      error.message || '还车失败，请重试',
      true,
      () => handleSubmit(),
      () => {
        submitting.value = false
      }
    )
  } finally {
    submitting.value = false
  }
}

// ==================== 工具函数 ====================
</script>

<style lang="scss" scoped>
/* 页面容器 */
.return-vehicle-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #fff7ed, #ffedd5);
  display: flex;
  flex-direction: column;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.header-icon {
  font-size: 48rpx;
  margin-right: 16rpx;
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #ea580c;
  display: block;
  margin-bottom: 8rpx;
}

.page-subtitle {
  font-size: 26rpx;
  color: #666666;
}

/* 加载和空状态 */
.loading-container,
.empty-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text,
.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  padding: 0 24rpx;
  padding-bottom: 40rpx;
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

.section-header-right {
  margin-left: auto;
}

.photo-count {
  font-size: 24rpx;
  color: #999999;
}

.section-desc {
  font-size: 24rpx;
  color: #666666;
  margin-bottom: 20rpx;
  display: block;
}

/* 车辆信息卡片 */
.vehicle-info-card {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 2rpx solid #fed7aa;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-label {
  font-size: 26rpx;
  color: #666666;
  width: 140rpx;
  flex-shrink: 0;
}

.info-value {
  font-size: 26rpx;
  color: #333333;
  font-weight: 500;
}

.plate-number-badge {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.plate-number-text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: bold;
}

/* 提交区域 */
.submit-section {
  margin-top: 24rpx;
  margin-bottom: 48rpx;
}

.submit-btn {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  padding: 28rpx;
  border-radius: 12rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(249, 115, 22, 0.3);
  
  &.disabled {
    opacity: 0.5;
  }
}

.btn-text {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
}
</style>
