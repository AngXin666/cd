<template>
  <!-- 
    应用版本管理页面
    管理应用版本，支持创建、编辑、删除
    仅管理员角色可访问
  -->
  <view class="versions-page">
    <!-- 头部区域 -->
    <view class="header-section">
      <text class="header-title">版本管理</text>
      <view class="add-btn" @click="goToCreate">
        <text class="add-icon">+</text>
        <text class="add-text">发布版本</text>
      </view>
    </view>

    <!-- 平台筛选 -->
    <view class="filter-section">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-list">
          <view 
            v-for="plat in platformOptions" 
            :key="plat.value" 
            :class="['filter-item', { active: selectedPlatform === plat.value }]"
            @click="selectPlatform(plat.value)"
          >
            <text class="filter-text">{{ plat.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredVersions.length === 0" class="empty-container">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无版本记录</text>
      <view class="empty-action" @click="goToCreate">
        <text class="action-text">+ 发布版本</text>
      </view>
    </view>

    <!-- 版本列表 -->
    <view v-else class="version-list">
      <view v-for="version in filteredVersions" :key="version.id" class="version-card">
        <view class="version-header">
          <view class="version-info">
            <text class="version-number">v{{ version.version }}</text>
            <view :class="['update-type-tag', version.update_type]">
              <text class="tag-text">{{ getUpdateTypeLabel(version.update_type) }}</text>
            </view>
            <view v-if="version.platform !== 'all'" class="platform-tag">
              <text class="tag-text">{{ getPlatformLabel(version.platform) }}</text>
            </view>
          </view>
          <view :class="['status-badge', version.is_active ? 'active' : 'inactive']">
            <text class="status-text">{{ version.is_active ? '已发布' : '未发布' }}</text>
          </view>
        </view>
        
        <view class="version-content">
          <view class="content-row">
            <text class="content-label">更新标题：</text>
            <text class="content-value">{{ version.title }}</text>
          </view>
          <view v-if="version.description" class="content-row">
            <text class="content-label">更新说明：</text>
            <text class="content-value content-preview">{{ version.description }}</text>
          </view>
          <view class="content-row">
            <text class="content-label">版本代码：</text>
            <text class="content-value">{{ version.version_code }}</text>
          </view>
          <view v-if="version.file_size" class="content-row">
            <text class="content-label">文件大小：</text>
            <text class="content-value">{{ formatFileSize(version.file_size) }}</text>
          </view>
          <view class="content-row">
            <text class="content-label">发布时间：</text>
            <text class="content-value">{{ formatTime(version.publish_time) }}</text>
          </view>
        </view>

        <view class="version-actions">
          <view class="action-btn edit" @click="goToEdit(version.id)">
            <text class="btn-text">编辑</text>
          </view>
          <view class="action-btn delete" @click="confirmDelete(version)">
            <text class="btn-text">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 应用版本管理页面
 * 管理应用版本，支持创建、编辑、删除
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAppVersions, deleteAppVersion } from '@/api'
import type { AppVersion } from '@/api/types'

// 状态
const loading = ref(false)
const versions = ref<AppVersion[]>([])
const selectedPlatform = ref<string>('')

// 平台选项
const platformOptions = [
  { value: '', label: '全部' },
  { value: 'all', label: '通用' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'h5', label: 'H5' },
]

// 更新类型选项
const updateTypeOptions: Record<string, string> = {
  optional: '可选更新',
  recommended: '推荐更新',
  required: '强制更新',
}

// 计算属性：筛选后的版本列表
const filteredVersions = computed(() => {
  if (!selectedPlatform.value) return versions.value
  return versions.value.filter(v => v.platform === selectedPlatform.value || v.platform === 'all')
})

onMounted(() => { loadVersions() })
onShow(() => { loadVersions() })

/**
 * 加载版本列表
 */
async function loadVersions(): Promise<void> {
  loading.value = true
  try {
    const data = await getAppVersions()
    versions.value = data
  } catch (error) {
    console.error('加载版本列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 选择平台
 */
function selectPlatform(platform: string): void {
  selectedPlatform.value = platform
}

/**
 * 获取更新类型显示名称
 */
function getUpdateTypeLabel(type: string): string {
  return updateTypeOptions[type] || type
}

/**
 * 获取平台显示名称
 */
function getPlatformLabel(platform: string): string {
  const found = platformOptions.find(p => p.value === platform)
  return found ? found.label : platform
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

/**
 * 格式化时间
 */
function formatTime(time: string | null): string {
  if (!time) return '-'
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * 跳转到创建页面
 */
function goToCreate(): void {
  uni.navigateTo({ url: '/pages/boss/versions/edit' })
}

/**
 * 跳转到编辑页面
 */
function goToEdit(id: number): void {
  uni.navigateTo({ url: `/pages/boss/versions/edit?id=${id}` })
}

/**
 * 确认删除
 */
function confirmDelete(version: AppVersion): void {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除版本 v${version.version} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })
          await deleteAppVersion(version.id)
          uni.hideLoading()
          uni.showToast({ title: '删除成功', icon: 'success' })
          await loadVersions()
        } catch (error) {
          console.error('删除失败:', error)
          uni.hideLoading()
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
/* 页面容器 */
.versions-page { min-height: 100vh; background-color: #f5f5f5; }

/* 头部区域 */
.header-section { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; background-color: #ffffff; }
.header-title { font-size: 32rpx; font-weight: bold; color: #333333; }
.add-btn { display: flex; align-items: center; padding: 12rpx 24rpx; background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%); border-radius: 8rpx; }
.add-icon { font-size: 28rpx; color: #ffffff; margin-right: 8rpx; }
.add-text { font-size: 26rpx; color: #ffffff; }

/* 平台筛选 */
.filter-section { background-color: #ffffff; padding: 16rpx 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.filter-scroll { white-space: nowrap; }
.filter-list { display: inline-flex; gap: 16rpx; }
.filter-item { padding: 12rpx 24rpx; background-color: #f5f5f5; border-radius: 32rpx; transition: all 0.3s; }
.filter-item.active { background-color: #1890ff; }
.filter-text { font-size: 26rpx; color: #666666; }
.filter-item.active .filter-text { color: #ffffff; }

/* 加载和空状态 */
.loading-container { display: flex; justify-content: center; align-items: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999999; }
.empty-container { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; margin-bottom: 32rpx; }
.empty-action { padding: 16rpx 48rpx; background-color: #1890ff; border-radius: 8rpx; }
.action-text { font-size: 28rpx; color: #ffffff; }

/* 版本列表 */
.version-list { padding: 24rpx; }
.version-card { background-color: #ffffff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }

/* 版本头部 */
.version-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.version-info { display: flex; align-items: center; flex: 1; flex-wrap: wrap; gap: 8rpx; }
.version-number { font-size: 32rpx; font-weight: bold; color: #333333; margin-right: 12rpx; }
.update-type-tag { padding: 4rpx 12rpx; border-radius: 8rpx; }
.update-type-tag.optional { background-color: #e6f7ff; }
.update-type-tag.optional .tag-text { color: #1890ff; }
.update-type-tag.recommended { background-color: #fff7e6; }
.update-type-tag.recommended .tag-text { color: #fa8c16; }
.update-type-tag.required { background-color: #fff1f0; }
.update-type-tag.required .tag-text { color: #ff4d4f; }
.tag-text { font-size: 22rpx; }
.platform-tag { padding: 4rpx 12rpx; background-color: #f0f5ff; border-radius: 8rpx; }
.platform-tag .tag-text { color: #2f54eb; }
.status-badge { padding: 4rpx 12rpx; border-radius: 8rpx; }
.status-badge.active { background-color: #f6ffed; }
.status-badge.inactive { background-color: #fff1f0; }
.status-badge.active .status-text { color: #52c41a; font-size: 22rpx; }
.status-badge.inactive .status-text { color: #ff4d4f; font-size: 22rpx; }

/* 版本内容 */
.version-content { padding: 16rpx 0; border-top: 1rpx solid #f0f0f0; border-bottom: 1rpx solid #f0f0f0; }
.content-row { display: flex; margin-bottom: 8rpx; }
.content-row:last-child { margin-bottom: 0; }
.content-label { font-size: 26rpx; color: #999999; width: 140rpx; flex-shrink: 0; }
.content-value { font-size: 26rpx; color: #333333; flex: 1; }
.content-preview { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

/* 版本操作 */
.version-actions { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 16rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; }
.action-btn.edit { background-color: #e6f7ff; }
.action-btn.edit .btn-text { color: #1890ff; font-size: 26rpx; }
.action-btn.delete { background-color: #fff1f0; }
.action-btn.delete .btn-text { color: #ff4d4f; font-size: 26rpx; }
</style>
