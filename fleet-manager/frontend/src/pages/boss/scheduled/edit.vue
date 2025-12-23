<template>
  <!-- 
    定时通知编辑页面
    创建或编辑定时通知任务
  -->
  <view class="edit-page">
    <!-- 头部 -->
    <view class="header-section">
      <text class="header-title">{{ isEdit ? '编辑定时通知' : '创建定时通知' }}</text>
    </view>

    <!-- 表单 -->
    <scroll-view scroll-y class="form-container">
      <!-- 基本信息 -->
      <view class="form-section">
        <text class="section-title">基本信息</text>
        
        <view class="form-item">
          <text class="form-label required">任务名称</text>
          <input v-model="form.name" class="form-input" type="text" placeholder="请输入任务名称" />
        </view>
      </view>

      <!-- 通知内容 -->
      <view class="form-section">
        <text class="section-title">通知内容</text>
        
        <view class="form-item">
          <text class="form-label">使用模板</text>
          <picker :value="templateIndex" :range="templatePickerOptions" @change="onTemplateChange">
            <view class="form-picker">
              <text class="picker-text">{{ form.template_id ? getTemplateName(form.template_id) : '不使用模板' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view v-if="!form.template_id" class="form-item">
          <text class="form-label required">通知标题</text>
          <input v-model="form.title" class="form-input" type="text" placeholder="请输入通知标题" />
        </view>

        <view v-if="!form.template_id" class="form-item">
          <text class="form-label">通知内容</text>
          <textarea v-model="form.content" class="form-textarea" placeholder="请输入通知内容" :maxlength="2000" />
        </view>
      </view>

      <!-- 目标用户 -->
      <view class="form-section">
        <text class="section-title">目标用户</text>
        
        <view class="form-item">
          <text class="form-label">按角色发送</text>
          <view class="checkbox-group">
            <view 
              v-for="role in roleOptions" 
              :key="role.value" 
              :class="['checkbox-item', { checked: form.target_roles.includes(role.value) }]"
              @click="toggleRole(role.value)"
            >
              <text class="checkbox-text">{{ role.label }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">指定用户</text>
          <view class="user-select" @click="showUserPicker = true">
            <text class="select-text">{{ form.target_user_ids.length > 0 ? `已选择 ${form.target_user_ids.length} 人` : '点击选择用户' }}</text>
            <text class="select-arrow">▶</text>
          </view>
        </view>
      </view>

      <!-- 定时规则 -->
      <view class="form-section">
        <text class="section-title">定时规则</text>
        
        <view class="form-item">
          <text class="form-label required">计划时间</text>
          <picker mode="date" :value="scheduledDate" @change="onDateChange">
            <view class="form-picker">
              <text class="picker-text">{{ scheduledDate || '选择日期' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label required">计划时间</text>
          <picker mode="time" :value="scheduledTime" @change="onTimeChange">
            <view class="form-picker">
              <text class="picker-text">{{ scheduledTime || '选择时间' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">重复类型</text>
          <picker :value="repeatIndex" :range="repeatPickerOptions" @change="onRepeatChange">
            <view class="form-picker">
              <text class="picker-text">{{ getRepeatLabel(form.repeat_type) }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view v-if="form.repeat_type !== 'once'" class="form-item">
          <text class="form-label">重复间隔</text>
          <view class="interval-input">
            <text class="interval-prefix">每</text>
            <input v-model.number="form.repeat_interval" class="form-input interval" type="number" />
            <text class="interval-suffix">{{ getIntervalUnit(form.repeat_type) }}</text>
          </view>
        </view>

        <view v-if="form.repeat_type === 'weekly'" class="form-item">
          <text class="form-label">重复星期</text>
          <view class="weekday-group">
            <view 
              v-for="day in weekdayOptions" 
              :key="day.value" 
              :class="['weekday-item', { checked: form.weekdays.includes(day.value) }]"
              @click="toggleWeekday(day.value)"
            >
              <text class="weekday-text">{{ day.label }}</text>
            </view>
          </view>
        </view>

        <view v-if="form.repeat_type === 'monthly'" class="form-item">
          <text class="form-label">每月日期</text>
          <picker :value="form.monthly_day - 1" :range="monthDayOptions" @change="onMonthDayChange">
            <view class="form-picker">
              <text class="picker-text">{{ form.monthly_day ? `每月 ${form.monthly_day} 日` : '选择日期' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view v-if="form.repeat_type !== 'once'" class="form-item">
          <text class="form-label">结束日期</text>
          <picker mode="date" :value="form.repeat_end_date || ''" @change="onEndDateChange">
            <view class="form-picker">
              <text class="picker-text">{{ form.repeat_end_date || '不设置（无限重复）' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="footer-section">
      <view class="footer-btn cancel" @click="handleCancel">
        <text class="btn-text">取消</text>
      </view>
      <view class="footer-btn confirm" @click="handleSubmit">
        <text class="btn-text">{{ isEdit ? '保存' : '创建' }}</text>
      </view>
    </view>

    <!-- 用户选择弹窗 -->
    <view v-if="showUserPicker" class="modal-overlay" @click="showUserPicker = false">
      <view class="modal-content modal-large" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择用户</text>
          <text class="modal-close" @click="showUserPicker = false">✕</text>
        </view>
        <scroll-view scroll-y class="modal-body user-list">
          <view 
            v-for="user in users" 
            :key="user.id" 
            :class="['user-item', { selected: form.target_user_ids.includes(user.id) }]"
            @click="toggleUser(user.id)"
          >
            <view class="user-info">
              <text class="user-name">{{ user.name }}</text>
              <text class="user-role">{{ getRoleLabel(user.role) }}</text>
            </view>
            <view class="user-check">
              <text v-if="form.target_user_ids.includes(user.id)" class="check-icon">✓</text>
            </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <view class="modal-btn confirm" @click="showUserPicker = false">
            <text class="btn-text">确定（已选 {{ form.target_user_ids.length }} 人）</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 定时通知编辑页面
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { 
  createScheduledNotification, 
  updateScheduledNotification,
  getScheduledNotification,
  getNotificationTemplates,
  getUsers,
} from '@/api'
import type { 
  NotificationTemplate,
  User,
  ScheduledNotification,
} from '@/api/types'
import { RepeatType, UserRole, ROLE_DISPLAY_NAMES } from '@/api/types'

// 页面参数
const isEdit = ref(false)
const editId = ref<number | null>(null)

// 数据
const templates = ref<NotificationTemplate[]>([])
const users = ref<User[]>([])
const showUserPicker = ref(false)

// 表单数据
const form = reactive({
  name: '',
  template_id: null as number | null,
  title: '',
  content: '',
  target_user_ids: [] as number[],
  target_roles: [] as string[],
  repeat_type: RepeatType.ONCE,
  repeat_interval: 1,
  repeat_end_date: '',
  weekdays: [] as number[],
  monthly_day: 1,
})

// 日期时间
const scheduledDate = ref('')
const scheduledTime = ref('')

// 选项
const roleOptions = [
  { value: UserRole.DRIVER, label: '司机' },
  { value: UserRole.MANAGER, label: '车队长' },
  { value: UserRole.PEER_ADMIN, label: '调度' },
  { value: UserRole.BOSS, label: '老板' },
]

const repeatOptions = [
  { value: RepeatType.ONCE, label: '仅一次' },
  { value: RepeatType.DAILY, label: '每天' },
  { value: RepeatType.WEEKLY, label: '每周' },
  { value: RepeatType.MONTHLY, label: '每月' },
]

const weekdayOptions = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 7, label: '日' },
]

const monthDayOptions = Array.from({ length: 31 }, (_, i) => `${i + 1} 日`)

// 计算属性
const templatePickerOptions = computed(() => ['不使用模板', ...templates.value.map(t => t.name)])
const templateIndex = computed(() => {
  if (!form.template_id) return 0
  const idx = templates.value.findIndex(t => t.id === form.template_id)
  return idx >= 0 ? idx + 1 : 0
})

const repeatPickerOptions = repeatOptions.map(r => r.label)
const repeatIndex = computed(() => {
  const idx = repeatOptions.findIndex(r => r.value === form.repeat_type)
  return idx >= 0 ? idx : 0
})

onLoad((options) => {
  if (options?.mode === 'edit' && options?.id) {
    isEdit.value = true
    editId.value = parseInt(options.id)
  }
  loadData()
})

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  try {
    uni.showLoading({ title: '加载中...' })
    
    const [templatesData, usersData] = await Promise.all([
      getNotificationTemplates({ is_active: true }),
      getUsers({ is_active: true }),
    ])
    templates.value = templatesData
    users.value = usersData
    
    // 如果是编辑模式，加载任务数据
    if (isEdit.value && editId.value) {
      const task = await getScheduledNotification(editId.value)
      fillForm(task)
    } else {
      // 设置默认时间为当前时间后1小时
      const now = new Date()
      now.setHours(now.getHours() + 1)
      scheduledDate.value = formatDate(now)
      scheduledTime.value = formatTime(now)
    }
    
    uni.hideLoading()
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

/**
 * 填充表单数据
 */
function fillForm(task: ScheduledNotification): void {
  form.name = task.name
  form.template_id = task.template_id
  form.title = task.title || ''
  form.content = task.content || ''
  form.target_user_ids = task.target_user_ids || []
  form.target_roles = task.target_roles || []
  form.repeat_type = task.repeat_type
  form.repeat_interval = task.repeat_interval
  form.repeat_end_date = task.repeat_end_date || ''
  form.weekdays = task.weekdays || []
  form.monthly_day = task.monthly_day || 1
  
  // 解析日期时间
  const scheduled = new Date(task.scheduled_time)
  scheduledDate.value = formatDate(scheduled)
  scheduledTime.value = formatTime(scheduled)
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 格式化时间
 */
function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * 获取模板名称
 */
function getTemplateName(templateId: number): string {
  const template = templates.value.find(t => t.id === templateId)
  return template ? template.name : '未知模板'
}

/**
 * 获取重复类型标签
 */
function getRepeatLabel(repeatType: RepeatType): string {
  const found = repeatOptions.find(r => r.value === repeatType)
  return found ? found.label : repeatType
}

/**
 * 获取间隔单位
 */
function getIntervalUnit(repeatType: RepeatType): string {
  switch (repeatType) {
    case RepeatType.DAILY: return '天'
    case RepeatType.WEEKLY: return '周'
    case RepeatType.MONTHLY: return '月'
    default: return ''
  }
}

/**
 * 获取角色标签
 */
function getRoleLabel(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role
}

/**
 * 模板选择变化
 */
function onTemplateChange(e: any): void {
  const index = e.detail.value
  if (index === 0) {
    form.template_id = null
  } else {
    form.template_id = templates.value[index - 1]?.id || null
  }
}

/**
 * 日期选择变化
 */
function onDateChange(e: any): void {
  scheduledDate.value = e.detail.value
}

/**
 * 时间选择变化
 */
function onTimeChange(e: any): void {
  scheduledTime.value = e.detail.value
}

/**
 * 重复类型变化
 */
function onRepeatChange(e: any): void {
  const index = e.detail.value
  form.repeat_type = repeatOptions[index]?.value || RepeatType.ONCE
}

/**
 * 每月日期变化
 */
function onMonthDayChange(e: any): void {
  form.monthly_day = parseInt(e.detail.value) + 1
}

/**
 * 结束日期变化
 */
function onEndDateChange(e: any): void {
  form.repeat_end_date = e.detail.value
}

/**
 * 切换角色选择
 */
function toggleRole(role: string): void {
  const index = form.target_roles.indexOf(role)
  if (index >= 0) {
    form.target_roles.splice(index, 1)
  } else {
    form.target_roles.push(role)
  }
}

/**
 * 切换星期选择
 */
function toggleWeekday(day: number): void {
  const index = form.weekdays.indexOf(day)
  if (index >= 0) {
    form.weekdays.splice(index, 1)
  } else {
    form.weekdays.push(day)
  }
}

/**
 * 切换用户选择
 */
function toggleUser(userId: number): void {
  const index = form.target_user_ids.indexOf(userId)
  if (index >= 0) {
    form.target_user_ids.splice(index, 1)
  } else {
    form.target_user_ids.push(userId)
  }
}

/**
 * 取消
 */
function handleCancel(): void {
  uni.navigateBack()
}

/**
 * 提交
 */
async function handleSubmit(): Promise<void> {
  // 表单验证
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入任务名称', icon: 'none' })
    return
  }
  
  if (!form.template_id && !form.title.trim()) {
    uni.showToast({ title: '请选择模板或输入通知标题', icon: 'none' })
    return
  }
  
  if (form.target_user_ids.length === 0 && form.target_roles.length === 0) {
    uni.showToast({ title: '请选择目标用户或角色', icon: 'none' })
    return
  }
  
  if (!scheduledDate.value || !scheduledTime.value) {
    uni.showToast({ title: '请选择计划时间', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: isEdit.value ? '保存中...' : '创建中...' })
    
    // 构建计划时间
    const scheduledDateTime = `${scheduledDate.value}T${scheduledTime.value}:00`
    
    const data = {
      name: form.name.trim(),
      scheduled_time: scheduledDateTime,
      template_id: form.template_id || undefined,
      title: form.template_id ? undefined : form.title.trim() || undefined,
      content: form.template_id ? undefined : form.content.trim() || undefined,
      target_user_ids: form.target_user_ids.length > 0 ? form.target_user_ids : undefined,
      target_roles: form.target_roles.length > 0 ? form.target_roles : undefined,
      repeat_type: form.repeat_type,
      repeat_interval: form.repeat_interval,
      repeat_end_date: form.repeat_end_date || undefined,
      weekdays: form.repeat_type === RepeatType.WEEKLY && form.weekdays.length > 0 ? form.weekdays : undefined,
      monthly_day: form.repeat_type === RepeatType.MONTHLY ? form.monthly_day : undefined,
    }
    
    if (isEdit.value && editId.value) {
      await updateScheduledNotification(editId.value, data)
    } else {
      await createScheduledNotification(data)
    }
    
    uni.hideLoading()
    uni.showToast({ title: isEdit.value ? '保存成功' : '创建成功', icon: 'success' })
    
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
.edit-page { min-height: 100vh; background-color: #f5f5f5; display: flex; flex-direction: column; }

/* 头部 */
.header-section { padding: 24rpx; background-color: #ffffff; border-bottom: 1rpx solid #f0f0f0; }
.header-title { font-size: 32rpx; font-weight: bold; color: #333333; }

/* 表单容器 */
.form-container { flex: 1; padding-bottom: 120rpx; }

/* 表单区块 */
.form-section { margin: 24rpx; padding: 24rpx; background-color: #ffffff; border-radius: 16rpx; }
.section-title { font-size: 28rpx; font-weight: bold; color: #333333; margin-bottom: 24rpx; display: block; }

/* 表单项 */
.form-item { margin-bottom: 24rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-label { font-size: 28rpx; color: #333333; margin-bottom: 12rpx; display: block; }
.form-label.required::before { content: '*'; color: #ff4d4f; margin-right: 8rpx; }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 12rpx; font-size: 28rpx; color: #333333; box-sizing: border-box; }
.form-textarea { width: 100%; height: 200rpx; padding: 20rpx 24rpx; background-color: #f5f5f5; border-radius: 12rpx; font-size: 28rpx; color: #333333; box-sizing: border-box; }
.form-picker { display: flex; justify-content: space-between; align-items: center; height: 80rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 12rpx; }
.picker-text { font-size: 28rpx; color: #333333; }
.picker-arrow { font-size: 24rpx; color: #999999; }

/* 复选框组 */
.checkbox-group { display: flex; flex-wrap: wrap; gap: 16rpx; }
.checkbox-item { padding: 12rpx 24rpx; background-color: #f5f5f5; border-radius: 8rpx; border: 2rpx solid transparent; }
.checkbox-item.checked { background-color: #e6f7ff; border-color: #1890ff; }
.checkbox-text { font-size: 26rpx; color: #666666; }
.checkbox-item.checked .checkbox-text { color: #1890ff; }

/* 星期选择 */
.weekday-group { display: flex; gap: 12rpx; }
.weekday-item { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; border-radius: 50%; border: 2rpx solid transparent; }
.weekday-item.checked { background-color: #1890ff; border-color: #1890ff; }
.weekday-text { font-size: 26rpx; color: #666666; }
.weekday-item.checked .weekday-text { color: #ffffff; }

/* 间隔输入 */
.interval-input { display: flex; align-items: center; gap: 16rpx; }
.interval-prefix, .interval-suffix { font-size: 28rpx; color: #666666; }
.form-input.interval { width: 120rpx; text-align: center; }

/* 用户选择 */
.user-select { display: flex; justify-content: space-between; align-items: center; height: 80rpx; padding: 0 24rpx; background-color: #f5f5f5; border-radius: 12rpx; }
.select-text { font-size: 28rpx; color: #333333; }
.select-arrow { font-size: 24rpx; color: #999999; }

/* 底部按钮 */
.footer-section { position: fixed; bottom: 0; left: 0; right: 0; display: flex; padding: 24rpx; background-color: #ffffff; border-top: 1rpx solid #f0f0f0; }
.footer-btn { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; margin: 0 12rpx; }
.footer-btn.cancel { background-color: #f5f5f5; }
.footer-btn.cancel .btn-text { color: #666666; font-size: 30rpx; }
.footer-btn.confirm { background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%); }
.footer-btn.confirm .btn-text { color: #ffffff; font-size: 30rpx; font-weight: bold; }

/* 弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 600rpx; background-color: #ffffff; border-radius: 16rpx; overflow: hidden; max-height: 80vh; }
.modal-content.modal-large { width: 680rpx; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 32rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333333; }
.modal-close { font-size: 36rpx; color: #999999; padding: 8rpx; }
.modal-body { padding: 0; max-height: 60vh; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f0f0; }
.modal-btn { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.modal-btn.confirm .btn-text { color: #1890ff; font-weight: bold; font-size: 30rpx; }

/* 用户列表 */
.user-list { padding: 0; }
.user-item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 32rpx; border-bottom: 1rpx solid #f0f0f0; }
.user-item.selected { background-color: #e6f7ff; }
.user-info { flex: 1; }
.user-name { font-size: 28rpx; color: #333333; display: block; }
.user-role { font-size: 24rpx; color: #999999; margin-top: 4rpx; display: block; }
.user-check { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.check-icon { font-size: 32rpx; color: #1890ff; font-weight: bold; }
</style>
