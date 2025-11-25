import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import {showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {
  createNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationTemplates,
  updateNotificationTemplate
} from '@/db/api'
import type {NotificationTemplate} from '@/db/types'

/**
 * 通知模板管理页面
 */
const NotificationTemplates: React.FC = () => {
  const {user} = useAuth({guard: true})

  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)

  // 表单数据
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<'general' | 'attendance' | 'piece_work' | 'vehicle' | 'leave'>('general')
  const [isFavorite, setIsFavorite] = useState(false)

  const categories = [
    {value: 'general', label: '通用'},
    {value: 'attendance', label: '考勤'},
    {value: 'piece_work', label: '计件'},
    {value: 'vehicle', label: '车辆'},
    {value: 'leave', label: '请假'}
  ]

  // 加载模板
  const loadTemplates = useCallback(async () => {
    const data = await getNotificationTemplates()
    setTemplates(data)
  }, [])

  useDidShow(() => {
    loadTemplates()
  })

  // 打开新建表单
  const handleCreate = () => {
    setEditingTemplate(null)
    setTitle('')
    setContent('')
    setCategory('general')
    setIsFavorite(false)
    setShowForm(true)
  }

  // 打开编辑表单
  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template)
    setTitle(template.title)
    setContent(template.content)
    setCategory(template.category)
    setIsFavorite(template.is_favorite)
    setShowForm(true)
  }

  // 保存模板
  const handleSave = async () => {
    if (!title.trim()) {
      showToast({title: '请输入模板标题', icon: 'none'})
      return
    }
    if (!content.trim()) {
      showToast({title: '请输入模板内容', icon: 'none'})
      return
    }

    try {
      if (editingTemplate) {
        // 更新
        const success = await updateNotificationTemplate(editingTemplate.id, {
          title,
          content,
          category,
          is_favorite: isFavorite
        })

        if (success) {
          showToast({title: '更新成功', icon: 'success'})
          setShowForm(false)
          loadTemplates()
        } else {
          showToast({title: '更新失败', icon: 'error'})
        }
      } else {
        // 创建
        const result = await createNotificationTemplate({
          title,
          content,
          category,
          is_favorite: isFavorite,
          created_by: user?.id
        })

        if (result) {
          showToast({title: '创建成功', icon: 'success'})
          setShowForm(false)
          loadTemplates()
        } else {
          showToast({title: '创建失败', icon: 'error'})
        }
      }
    } catch (error) {
      console.error('保存模板失败:', error)
      showToast({title: '操作失败', icon: 'error'})
    }
  }

  // 删除模板
  const handleDelete = async (template: NotificationTemplate) => {
    const res = await showModal({
      title: '确认删除',
      content: `确定要删除模板"${template.title}"吗？`
    })

    if (res.confirm) {
      const success = await deleteNotificationTemplate(template.id)
      if (success) {
        showToast({title: '删除成功', icon: 'success'})
        loadTemplates()
      } else {
        showToast({title: '删除失败', icon: 'error'})
      }
    }
  }

  // 切换收藏
  const handleToggleFavorite = async (template: NotificationTemplate) => {
    const success = await updateNotificationTemplate(template.id, {
      is_favorite: !template.is_favorite
    })

    if (success) {
      showToast({
        title: template.is_favorite ? '已取消收藏' : '已收藏',
        icon: 'success'
      })
      loadTemplates()
    }
  }

  const getCategoryLabel = (cat: string) => {
    return categories.find((c) => c.value === cat)?.label || '通用'
  }

  if (showForm) {
    return (
      <View style={{background: 'linear-gradient(to bottom, #fef3c7, #fde68a)', minHeight: '100vh'}}>
        <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
          <View className="p-4">
            {/* 表单标题 */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">{editingTemplate ? '编辑模板' : '新建模板'}</Text>

              <View className="mb-3">
                <Text className="text-sm text-gray-700 mb-2">模板标题</Text>
                <View style={{overflow: 'hidden'}}>
                  <Textarea
                    value={title}
                    onInput={(e) => setTitle(e.detail.value)}
                    placeholder="请输入模板标题"
                    maxlength={50}
                    className="bg-gray-50 text-foreground px-3 py-2 rounded border border-border w-full"
                    style={{height: '60px'}}
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-sm text-gray-700 mb-2">模板内容</Text>
                <View style={{overflow: 'hidden'}}>
                  <Textarea
                    value={content}
                    onInput={(e) => setContent(e.detail.value)}
                    placeholder="请输入模板内容"
                    maxlength={500}
                    className="bg-gray-50 text-foreground px-3 py-2 rounded border border-border w-full"
                    style={{height: '150px'}}
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-sm text-gray-700 mb-2">模板分类</Text>
                <Picker
                  mode="selector"
                  range={categories}
                  rangeKey="label"
                  value={categories.findIndex((c) => c.value === category)}
                  onChange={(e) => {
                    const index = e.detail.value
                    setCategory(categories[index].value as any)
                  }}>
                  <View className="bg-gray-50 px-3 py-3 rounded border border-border flex items-center justify-between">
                    <Text className="text-sm text-gray-700">{getCategoryLabel(category)}</Text>
                    <View className="i-mdi-chevron-down text-lg text-gray-500" />
                  </View>
                </Picker>
              </View>

              <View
                onClick={() => setIsFavorite(!isFavorite)}
                className="flex items-center justify-between bg-gray-50 px-3 py-3 rounded active:bg-gray-100">
                <Text className="text-sm text-gray-700">设为常用模板</Text>
                <View className={`w-12 h-6 rounded-full transition-all ${isFavorite ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <View
                    className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-all ${isFavorite ? 'ml-6' : 'ml-0.5'}`}
                  />
                </View>
              </View>
            </View>

            {/* 操作按钮 */}
            <View className="flex gap-3">
              <View className="flex-1">
                <Button
                  onClick={() => setShowForm(false)}
                  className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl break-keep text-base"
                  size="default">
                  取消
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  onClick={handleSave}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl break-keep text-base font-bold"
                  size="default">
                  保存
                </Button>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #fef3c7, #fde68a)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 新建按钮 */}
          <View className="mb-4">
            <Button
              onClick={handleCreate}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-4 rounded-xl break-keep text-base font-bold"
              size="default">
              <View className="flex items-center justify-center">
                <View className="i-mdi-plus text-xl mr-2" />
                <Text>新建模板</Text>
              </View>
            </Button>
          </View>

          {/* 模板列表 */}
          {templates.length === 0 ? (
            <View className="bg-white rounded-xl p-8 text-center shadow-sm">
              <View className="i-mdi-file-document-outline text-6xl text-gray-300 mb-4 mx-auto" />
              <Text className="text-gray-500">暂无模板</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {templates.map((template) => (
                <View key={template.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex items-start justify-between mb-2">
                    <View className="flex-1">
                      <View className="flex items-center mb-1">
                        <Text className="text-base font-bold text-gray-800 mr-2">{template.title}</Text>
                        {template.is_favorite && <View className="i-mdi-star text-lg text-yellow-500" />}
                      </View>
                      <View className="inline-block bg-blue-100 px-2 py-1 rounded">
                        <Text className="text-xs text-blue-700">{getCategoryLabel(template.category)}</Text>
                      </View>
                    </View>

                    <View onClick={() => handleToggleFavorite(template)} className="p-2 active:bg-gray-100 rounded">
                      <View
                        className={`text-xl ${template.is_favorite ? 'i-mdi-star text-yellow-500' : 'i-mdi-star-outline text-gray-400'}`}
                      />
                    </View>
                  </View>

                  <Text className="text-sm text-gray-600 mb-3 line-clamp-2">{template.content}</Text>

                  <View className="flex gap-2">
                    <View className="flex-1">
                      <Button
                        onClick={() => handleEdit(template)}
                        className="w-full bg-blue-50 text-blue-600 py-2 rounded-lg break-keep text-sm"
                        size="default">
                        编辑
                      </Button>
                    </View>
                    <View className="flex-1">
                      <Button
                        onClick={() => handleDelete(template)}
                        className="w-full bg-red-50 text-red-600 py-2 rounded-lg break-keep text-sm"
                        size="default">
                        删除
                      </Button>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default NotificationTemplates
