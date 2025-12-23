<template>
  <!-- 
    应用版本编辑页面
    创建或编辑应用版本
    仅管理员角色可访问
  -->
  <view class="version-edit-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 表单 -->
    <view v-else class="form-container">
      <view class="form-section">
        <text class="section-title">基本信息</text>
        
        <view class="form-item">
          <text class="form-label required">版本号</text>
          <input v-model="form.version" class="form-input" type="text" placeholder="如 1.0.0" />
        </view>
        
        <view class="form-item">
          <text class="form-label required">版本代码</text>
          <input v-model.number="form.version_code" class="form-input" type="number" placeholder="整数，用于比较版本大小" />
        </view>
        
        <view class="form-item">
          <text class="form-label required">更新标题</text>
          <input v-model="form.title" class="form-input" type="text" placeholder="如：修复已知问题" />
        </view>
        
        <view class="form-item">
          <text class="form-label">更新说明</text>
          <textarea 
            v-model="form.description" 
            class="form-textarea" 
            placeholder="详细描述本次更新内容"
            :maxlength="2000"
          />
        </view>
      </view>

      <view class="form-section">
        <text class="section-title">更新设置</text>
        
        <view class="form-item">
          <text class="form-label">更新类型</text>
          <picker :value="updateTypeIndex" :range="updateTypeLabels" @change="onUpdateTypeChange">
            <view class="form-picker">
              <text class="picker-text">{{ updateTypeLabels[updateTypeIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        
        <view class="form-item">
          <text class="form-label">目标平台</text>
          <picker :value="platformIndex" :range="platformLabels" @change="onPlatformChange">
            <view class="form-picker">
              <text class="picker-text">{{ platformLabels[platformIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        
        <view class="form-item">
          <text class="form-label">最低支持版本</text>
          <input v-model="form.min_version" class="form-input" type="text" placeholder="低于此版本必须更新（可选）" />
        </view>
      </view>

      <view class="form-section">
        <text class="section-title">下载信息</text>
        
        <view class="form-item">
          <text class="form-label">下载地址</text>
          <input v-model="form.download_url" class="form-input" type="text" placeholder="更新包下载URL" />
        </view>
        
        <view class="form-item">
          <text class="form-label">文件大小（字节）</text>
          <input v-model.number="form.file_size" class="form-input" type="number" placeholder="更新包大小" />
        </view>
        
        <view class="form-item">
          <text class="form-label">文件哈希</text>
          <input v-model="form.file_hash" class="form-input" type="text" placeholder="用于校验文件完整性" />
        </view>
      </view>

      <view class="form-section">
        <text class="section-title">发布设置</text>
        
        <view class="form-item">
          <view class="switch-row">
            <text class="form-label">立即发布</text>
            <switch :checked="form.is_active" @change="onActiveChange" />
          </view>
          <text class="form-hint">关闭后版本不会对用户可见</text>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-section">
        <view class="submit-btn" @click="handleSubmit">
          <text class="btn-text">{{ isEdit ? '保存修改' : '发布版本' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 应用版本编辑页面
 * 创建或编辑应用版本
 */
import { ref, reactive, onMounted, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getAppVersion, createAppVersion, updateAppVersion } from '@/api'
import { UpdateType } from '@/api/types'

// 状态
const loading = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)

// 更新类型选项
const updateTypeOptions = [
  { value: UpdateType.OPTIONAL, label: '可选更新' },
  { value: UpdateType.RECOMMENDED, label: '推荐更新' },
  { value: UpdateType.REQUIRED, label: '强制更新' },
]
const updateTypeLabels = updateTypeOptions.map(o => o.label)
const updateTypeIndex = ref(0)

// 平台选项
const platformOptions = [
  { value: 'all', label: '全部平台' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'h5', label: 'H5' },
]
const platformLabels = platformOptions.map(o => o.label)
const platformIndex = ref(0)

// 表单数据
const form = reactive({
  version: '',
  version_code: 1,
  title: '',
  description: '',
  update_type: UpdateType.OPTIONAL,
  platform: 'all',
  min_version: '',
  download_url: '',
  file_size: undefined as number | undefined,
  file_hash: '',
  is_active: true,
})

onLoad((options) => {
  if (options?.id) {
    isEdit.value = true
    editId.value = parseInt(options.id)
    loadVersion(editId.value)
    uni.setNavigationBarTitle({ title: '编辑版本' })
  } else {
    uni.setNavigationBarTitle({ title: '发布版本' })
  }
})

/**
 * 加载版本详情
 */
async function loadVersion(id: number): Promise<void> {
  loading.value = true
  try {
    const data = await getAppVersion(id)
    form.version = data.version
    form.version_code = data.version_code
    form.title = data.title
    form.description = data.description || ''
    form.update_type = data.update_type as UpdateType
    form.platform = data.platform
    form.min_version = data.min_version || ''
    form.download_url = data.download_url || ''
    form.file_size = data.file_size || undefined
    form.file_hash = data.file_hash || ''
    form.is_active = data.is_active
    
    // 设置选择器索引
    updateTypeIndex.value = updateTypeOptions.findIndex(o => o.value === data.update_type)
    if (updateTypeIndex.value < 0) updateTypeIndex.value = 0
    
    platformIndex.value = platformOptions.findIndex(o => o.value === data.platform)
    if (platformIndex.value < 0) platformIndex.value = 0
  } catch (error) {
    console.error('加载版本详情失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 更新类型变化
 */
function onUpdateTypeChange(e: any): void {
  const index = e.detail.value
  updateTypeIndex.value = index
  form.update_type = updateTypeOptions[index].value
}

/**
 * 平台变化
 */
function onPlatformChange(e: any): void {
  const index = e.detail.value
  platformIndex.value = index
  form.platform = platformOptions[index].value
}

/**
 * 启用状态变化
 */
function onActiveChange(e: any): void {
  form.is_active = e.detail.value
}

/**
 * 提交表单
 */
async function handleSubmit(): Promise<void> {
  // 表单验证
  if (!form.version.trim()) {
    uni.showToast({ title: '请输入版本号', icon: 'none' })
    return
  }
  if (!form.version_code || form.version_code < 1) {
    uni.showToast({ title: '请输入有效的版本代码', icon: 'none' })
    return
  }
  if (!form.title.trim()) {
    uni.showToast({ title: '请输入更新标题', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: isEdit.value ? '保存中...' : '发布中...' })
    
    const data = {
      version: form.version.trim(),
      version_code: form.version_code,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      update_type: form.update_type,
      platform: form.platform,
      min_version: form.min_version.trim() || undefined,
      download_url: form.download_url.trim() || undefined,
      file_size: form.file_size || undefined,
      file_hash: form.file_hash.trim() || undefined,
      is_active: form.is_active,
    }
    
    if (isEdit.value && editId.value) {
      await updateAppVersion(editId.value, data)
    } else {
      await createAppVersion(data)
    }
    
    uni.hideLoading()
    uni.showToast({ title: isEdit.value ? '保存成功' : '发布成功', icon: 'success' })
    
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    console.error('操作失败:', error)
    uni.hideLoading()
    const message = error?.response?.data?.detail || '操作失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.version-edit-page { min-height: 100vh; background-color: #f5f5f5; }

/* 加载状态 */
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }

/* 表单容器 */
.form-container { padding: 24rpx; }

/* 表单分组 */
.form-section { background-color: #ffffff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333333; margin-bottom: 24rpx; display: block; }

/* 表单项 */
.form-item { margin-bottom: 24rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-label { font-size: 28rpx; color: #333333; margin-bottom: 12rpx; display: block; }
.form-label.required::before { content: '*'; color: #ff4d4f; margin-right: 8rpx; }
.form-hint { font-size: 24rpx; color: #999999; margin-top: 8rpx; }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 12rpx; font-size: 28rpx; color: #333333; box-sizing: border-box; }
.form-textarea { width: 100%; height: 200rpx; padding: 20rpx 24rpx; background-color: #f5f5f5; border-radius: 12rpx; font-size: 28rpx; color: #333333; box-sizing: border-box; }
.form-picker { display: flex; justify-content: space-between; align-items: center; height: 80rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 12rpx; }
.picker-text { font-size: 28rpx; color: #333333; }
.picker-arrow { font-size: 24rpx; color: #999999; }
.switch-row { display: flex; justify-content: space-between; align-items: center; }

/* 提交按钮 */
.submit-section { padding: 24rpx 0; }
.submit-btn { height: 88rpx; background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%); border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.submit-btn .btn-text { font-size: 32rpx; color: #ffffff; font-weight: bold; }
</style>
