<template>
  <!-- 
    通知模板管理页面
    管理通知模板，支持创建、编辑、删除、预览
    仅管理员角色可访问
  -->
  <view class="templates-page">
    <!-- 头部区域 -->
    <view class="header-section">
      <text class="header-title">通知模板管理</text>
      <view class="add-btn" @click="showCreateModal">
        <text class="add-icon">+</text>
        <text class="add-text">添加模板</text>
      </view>
    </view>

    <!-- 分类筛选 -->
    <view class="filter-section">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-list">
          <view 
            v-for="cat in categoryOptions" 
            :key="cat.value" 
            :class="['filter-item', { active: selectedCategory === cat.value }]"
            @click="selectCategory(cat.value)"
          >
            <text class="filter-text">{{ cat.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredTemplates.length === 0" class="empty-container">
      <text class="empty-icon">📝</text>
      <text class="empty-text">暂无通知模板</text>
      <view class="empty-action" @click="showCreateModal">
        <text class="action-text">+ 添加模板</text>
      </view>
    </view>

    <!-- 模板列表 -->
    <view v-else class="template-list">
      <view v-for="template in filteredTemplates" :key="template.id" class="template-card">
        <view class="template-header">
          <view class="template-info">
            <text class="template-name">{{ template.name }}</text>
            <view v-if="template.category" class="category-tag">
              <text class="tag-text">{{ getCategoryLabel(template.category) }}</text>
            </view>
          </view>
          <view :class="['status-badge', template.is_active ? 'active' : 'inactive']">
            <text class="status-text">{{ template.is_active ? '启用' : '停用' }}</text>
          </view>
        </view>
        
        <view class="template-content">
          <view class="content-row">
            <text class="content-label">标题：</text>
            <text class="content-value">{{ template.title }}</text>
          </view>
          <view class="content-row">
            <text class="content-label">内容：</text>
            <text class="content-value content-preview">{{ template.content }}</text>
          </view>
          <view v-if="template.variables" class="content-row">
            <text class="content-label">变量：</text>
            <text class="content-value variables-text">{{ formatVariables(template.variables) }}</text>
          </view>
        </view>

        <view class="template-actions">
          <view class="action-btn preview" @click="showPreviewModal(template)">
            <text class="btn-text">预览</text>
          </view>
          <view class="action-btn edit" @click="showEditModal(template)">
            <text class="btn-text">编辑</text>
          </view>
          <view class="action-btn delete" @click="confirmDelete(template)">
            <text class="btn-text">删除</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 创建/编辑弹窗 -->
    <view v-if="showModal" class="modal-overlay" @click="closeModal">
      <view class="modal-content modal-large" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEdit ? '编辑模板' : '添加模板' }}</text>
          <text class="modal-close" @click="closeModal">✕</text>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view class="form-item">
            <text class="form-label required">模板名称</text>
            <input v-model="form.name" class="form-input" type="text" placeholder="请输入模板名称（唯一标识）" />
          </view>
          <view class="form-item">
            <text class="form-label required">通知标题</text>
            <input v-model="form.title" class="form-input" type="text" placeholder="支持变量如 {user_name}" />
          </view>
          <view class="form-item">
            <text class="form-label required">通知内容</text>
            <textarea 
              v-model="form.content" 
              class="form-textarea" 
              placeholder="支持变量如 {date}、{amount}"
              :maxlength="2000"
            />
          </view>
          <view class="form-item">
            <text class="form-label">模板分类</text>
            <picker :value="categoryIndex" :range="categoryPickerOptions" @change="onCategoryChange">
              <view class="form-picker">
                <text class="picker-text">{{ form.category ? getCategoryLabel(form.category) : '请选择分类' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">变量说明</text>
            <text class="form-hint">格式：变量名=说明，多个用逗号分隔</text>
            <input v-model="variablesInput" class="form-input" type="text" placeholder="如：user_name=用户姓名,date=日期" />
          </view>
          <view class="form-item">
            <view class="switch-row">
              <text class="form-label">启用状态</text>
              <switch :checked="form.is_active" @change="onActiveChange" />
            </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @click="handleSubmit">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 预览弹窗 -->
    <view v-if="showPreview" class="modal-overlay" @click="closePreview">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">模板预览</text>
          <text class="modal-close" @click="closePreview">✕</text>
        </view>
        <view class="modal-body">
          <!-- 变量输入 -->
          <view v-if="previewTemplate?.variables" class="preview-variables">
            <text class="section-title">填写变量值：</text>
            <view v-for="(desc, key) in previewTemplate.variables" :key="key" class="variable-item">
              <text class="variable-label">{{ key }}（{{ desc }}）</text>
              <input v-model="previewVariables[key]" class="form-input" type="text" :placeholder="desc" />
            </view>
          </view>
          
          <!-- 预览结果 -->
          <view class="preview-result">
            <text class="section-title">预览效果：</text>
            <view class="preview-card">
              <text class="preview-title">{{ renderedTitle }}</text>
              <text class="preview-content">{{ renderedContent }}</text>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn confirm" @click="closePreview">
            <text class="btn-text">关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 通知模板管理页面
 * 管理通知模板，支持创建、编辑、删除、预览
 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  getNotificationTemplates, 
  createNotificationTemplate, 
  updateNotificationTemplate,
  deleteNotificationTemplate 
} from '@/api'
import type { NotificationTemplate } from '@/api/types'

// 状态
const loading = ref(false)
const templates = ref<NotificationTemplate[]>([])
const showModal = ref(false)
const showPreview = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const selectedCategory = ref<string>('')

// 分类选项
const categoryOptions = [
  { value: '', label: '全部' },
  { value: 'attendance', label: '考勤' },
  { value: 'leave', label: '请假' },
  { value: 'vehicle', label: '车辆' },
  { value: 'piece_work', label: '计件' },
  { value: 'system', label: '系统' },
]

// 分类选择器选项（不含"全部"）
const categoryPickerOptions = categoryOptions.slice(1).map(c => c.label)
const categoryIndex = ref(0)

// 表单数据
const form = reactive({
  name: '',
  title: '',
  content: '',
  category: '',
  is_active: true,
})
const variablesInput = ref('')

// 预览相关
const previewTemplate = ref<NotificationTemplate | null>(null)
const previewVariables = reactive<Record<string, string>>({})

// 计算属性：筛选后的模板列表
const filteredTemplates = computed(() => {
  if (!selectedCategory.value) return templates.value
  return templates.value.filter(t => t.category === selectedCategory.value)
})

// 计算属性：渲染后的标题
const renderedTitle = computed(() => {
  if (!previewTemplate.value) return ''
  let title = previewTemplate.value.title
  for (const [key, value] of Object.entries(previewVariables)) {
    title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`)
  }
  return title
})

// 计算属性：渲染后的内容
const renderedContent = computed(() => {
  if (!previewTemplate.value) return ''
  let content = previewTemplate.value.content
  for (const [key, value] of Object.entries(previewVariables)) {
    content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`)
  }
  return content
})

onMounted(() => { loadTemplates() })
onShow(() => { loadTemplates() })

/**
 * 加载模板列表
 */
async function loadTemplates(): Promise<void> {
  loading.value = true
  try {
    const data = await getNotificationTemplates()
    templates.value = data
  } catch (error) {
    console.error('加载模板列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 选择分类
 */
function selectCategory(category: string): void {
  selectedCategory.value = category
}

/**
 * 获取分类显示名称
 */
function getCategoryLabel(category: string): string {
  const found = categoryOptions.find(c => c.value === category)
  return found ? found.label : category
}

/**
 * 格式化变量显示
 */
function formatVariables(variables: Record<string, string> | null): string {
  if (!variables) return ''
  return Object.entries(variables).map(([k, v]) => `${k}: ${v}`).join(', ')
}

/**
 * 显示创建弹窗
 */
function showCreateModal(): void {
  isEdit.value = false
  editId.value = null
  form.name = ''
  form.title = ''
  form.content = ''
  form.category = ''
  form.is_active = true
  variablesInput.value = ''
  categoryIndex.value = 0
  showModal.value = true
}

/**
 * 显示编辑弹窗
 */
function showEditModal(template: NotificationTemplate): void {
  isEdit.value = true
  editId.value = template.id
  form.name = template.name
  form.title = template.title
  form.content = template.content
  form.category = template.category || ''
  form.is_active = template.is_active
  
  // 转换变量为输入格式
  if (template.variables) {
    variablesInput.value = Object.entries(template.variables)
      .map(([k, v]) => `${k}=${v}`)
      .join(',')
  } else {
    variablesInput.value = ''
  }
  
  // 设置分类选择器索引
  const catIndex = categoryOptions.slice(1).findIndex(c => c.value === template.category)
  categoryIndex.value = catIndex >= 0 ? catIndex : 0
  
  showModal.value = true
}

/**
 * 显示预览弹窗
 */
function showPreviewModal(template: NotificationTemplate): void {
  previewTemplate.value = template
  // 清空预览变量
  Object.keys(previewVariables).forEach(key => delete previewVariables[key])
  // 初始化变量
  if (template.variables) {
    Object.keys(template.variables).forEach(key => {
      previewVariables[key] = ''
    })
  }
  showPreview.value = true
}

/**
 * 关闭弹窗
 */
function closeModal(): void {
  showModal.value = false
}

/**
 * 关闭预览弹窗
 */
function closePreview(): void {
  showPreview.value = false
  previewTemplate.value = null
}

/**
 * 分类选择变化
 */
function onCategoryChange(e: any): void {
  const index = e.detail.value
  categoryIndex.value = index
  form.category = categoryOptions[index + 1]?.value || ''
}

/**
 * 启用状态变化
 */
function onActiveChange(e: any): void {
  form.is_active = e.detail.value
}

/**
 * 解析变量输入
 */
function parseVariables(): Record<string, string> | undefined {
  if (!variablesInput.value.trim()) return undefined
  
  const result: Record<string, string> = {}
  const pairs = variablesInput.value.split(',')
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(s => s.trim())
    if (key && value) {
      result[key] = value
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * 提交表单
 */
async function handleSubmit(): Promise<void> {
  // 表单验证
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入模板名称', icon: 'none' })
    return
  }
  if (!form.title.trim()) {
    uni.showToast({ title: '请输入通知标题', icon: 'none' })
    return
  }
  if (!form.content.trim()) {
    uni.showToast({ title: '请输入通知内容', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: isEdit.value ? '保存中...' : '创建中...' })
    
    const variables = parseVariables()
    
    if (isEdit.value && editId.value) {
      await updateNotificationTemplate(editId.value, {
        name: form.name.trim(),
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category || undefined,
        variables,
        is_active: form.is_active,
      })
    } else {
      await createNotificationTemplate({
        name: form.name.trim(),
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category || undefined,
        variables,
        is_active: form.is_active,
      })
    }
    
    uni.hideLoading()
    uni.showToast({ title: isEdit.value ? '保存成功' : '创建成功', icon: 'success' })
    closeModal()
    await loadTemplates()
  } catch (error: any) {
    console.error('操作失败:', error)
    uni.hideLoading()
    const message = error?.response?.data?.detail || '操作失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

/**
 * 确认删除
 */
function confirmDelete(template: NotificationTemplate): void {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除模板"${template.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })
          await deleteNotificationTemplate(template.id)
          uni.hideLoading()
          uni.showToast({ title: '删除成功', icon: 'success' })
          await loadTemplates()
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
.templates-page { min-height: 100vh; background-color: #f5f5f5; }

/* 头部区域 */
.header-section { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; background-color: #ffffff; }
.header-title { font-size: 32rpx; font-weight: bold; color: #333333; }
.add-btn { display: flex; align-items: center; padding: 12rpx 24rpx; background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%); border-radius: 8rpx; }
.add-icon { font-size: 28rpx; color: #ffffff; margin-right: 8rpx; }
.add-text { font-size: 26rpx; color: #ffffff; }

/* 分类筛选 */
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

/* 模板列表 */
.template-list { padding: 24rpx; }
.template-card { background-color: #ffffff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }

/* 模板头部 */
.template-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.template-info { display: flex; align-items: center; flex: 1; }
.template-name { font-size: 30rpx; font-weight: bold; color: #333333; margin-right: 12rpx; }
.category-tag { padding: 4rpx 12rpx; background-color: #e6f7ff; border-radius: 8rpx; }
.tag-text { font-size: 22rpx; color: #1890ff; }
.status-badge { padding: 4rpx 12rpx; border-radius: 8rpx; }
.status-badge.active { background-color: #f6ffed; }
.status-badge.inactive { background-color: #fff1f0; }
.status-badge.active .status-text { color: #52c41a; font-size: 22rpx; }
.status-badge.inactive .status-text { color: #ff4d4f; font-size: 22rpx; }

/* 模板内容 */
.template-content { padding: 16rpx 0; border-top: 1rpx solid #f0f0f0; border-bottom: 1rpx solid #f0f0f0; }
.content-row { display: flex; margin-bottom: 8rpx; }
.content-row:last-child { margin-bottom: 0; }
.content-label { font-size: 26rpx; color: #999999; width: 100rpx; flex-shrink: 0; }
.content-value { font-size: 26rpx; color: #333333; flex: 1; }
.content-preview { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.variables-text { color: #1890ff; font-size: 24rpx; }

/* 模板操作 */
.template-actions { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 16rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; }
.action-btn.preview { background-color: #f0f5ff; }
.action-btn.preview .btn-text { color: #2f54eb; font-size: 26rpx; }
.action-btn.edit { background-color: #e6f7ff; }
.action-btn.edit .btn-text { color: #1890ff; font-size: 26rpx; }
.action-btn.delete { background-color: #fff1f0; }
.action-btn.delete .btn-text { color: #ff4d4f; font-size: 26rpx; }

/* 弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 600rpx; background-color: #ffffff; border-radius: 16rpx; overflow: hidden; max-height: 80vh; }
.modal-content.modal-large { width: 680rpx; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 32rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333333; }
.modal-close { font-size: 36rpx; color: #999999; padding: 8rpx; }
.modal-body { padding: 32rpx; max-height: 60vh; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f0f0; }
.modal-btn { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.modal-btn.cancel { border-right: 1rpx solid #f0f0f0; }
.modal-btn.cancel .btn-text { color: #666666; font-size: 30rpx; }
.modal-btn.confirm .btn-text { color: #1890ff; font-weight: bold; font-size: 30rpx; }

/* 表单 */
.form-item { margin-bottom: 24rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-label { font-size: 28rpx; color: #333333; margin-bottom: 12rpx; display: block; }
.form-label.required::before { content: '*'; color: #ff4d4f; margin-right: 8rpx; }
.form-hint { font-size: 24rpx; color: #999999; margin-bottom: 8rpx; display: block; }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 12rpx; font-size: 28rpx; color: #333333; box-sizing: border-box; }
.form-textarea { width: 100%; height: 200rpx; padding: 20rpx 24rpx; background-color: #f5f5f5; border-radius: 12rpx; font-size: 28rpx; color: #333333; box-sizing: border-box; }
.form-picker { display: flex; justify-content: space-between; align-items: center; height: 80rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 12rpx; }
.picker-text { font-size: 28rpx; color: #333333; }
.picker-arrow { font-size: 24rpx; color: #999999; }
.switch-row { display: flex; justify-content: space-between; align-items: center; }

/* 预览 */
.preview-variables { margin-bottom: 24rpx; }
.section-title { font-size: 28rpx; font-weight: bold; color: #333333; margin-bottom: 16rpx; display: block; }
.variable-item { margin-bottom: 16rpx; }
.variable-label { font-size: 26rpx; color: #666666; margin-bottom: 8rpx; display: block; }
.preview-result { margin-top: 24rpx; }
.preview-card { background-color: #f5f5f5; border-radius: 12rpx; padding: 24rpx; }
.preview-title { font-size: 30rpx; font-weight: bold; color: #333333; margin-bottom: 12rpx; display: block; }
.preview-content { font-size: 28rpx; color: #666666; line-height: 1.6; }
</style>
