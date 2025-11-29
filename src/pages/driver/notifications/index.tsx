/**
 * 通知列表页面 - 网格布局版本
 *
 * 布局结构：
 * - 顶部横列：信息分类导航（请假/离职、车辆审批、权限变更）
 * - 左侧竖列：状态筛选区（未读、已读、全部、清空）
 * - 右侧主内容区：通知列表
 *
 * 优化功能：
 * 1. 网格布局，清晰的信息层次
 * 2. 分类导航和状态筛选独立
 * 3. 选中状态高亮显示
 * 4. 清空操作需要二次确认
 * 5. 显示通知的标题、时间等关键信息
 */

import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useMemo, useState} from 'react'
import {supabase} from '@/client/supabase'
import ApplicationDetailDialog from '@/components/application/ApplicationDetailDialog'
import * as UsersAPI from '@/db/api/users'

import {
  deleteNotification,
  deleteReadNotifications,
  getNotificationProcessStatus,
  getNotificationStatusColor,
  getNotificationStatusLabel,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
  type NotificationCategory,
  subscribeToNotifications
} from '@/db/notificationApi'
import {createLogger} from '@/utils/logger'

const logger = createLogger('NotificationsPage')

// 通知分组类型
interface NotificationGroup {
  title: string
  notifications: Notification[]
}

// 筛选类型
type FilterType = 'all' | 'unread' | 'read'

// 分类配置
const CATEGORY_CONFIG = [
  {value: 'leave_resignation' as const, label: '请假/离职', icon: 'i-mdi-calendar-clock'},
  {value: 'vehicle_approval' as const, label: '车辆审批', icon: 'i-mdi-car-clock'},
  {value: 'permission' as const, label: '权限变更', icon: 'i-mdi-shield-account'}
]

// 状态筛选配置
const FILTER_CONFIG = [
  {value: 'unread' as const, label: '未读', icon: 'i-mdi-email-mark-as-unread'},
  {value: 'read' as const, label: '已读', icon: 'i-mdi-email-open'},
  {value: 'all' as const, label: '全部', icon: 'i-mdi-email-multiple'}
]

const NotificationsPage: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('all') // 筛选类型：全部、未读、已读
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all') // 选中的分类
  // 详情弹窗状态
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailApplicationId, setDetailApplicationId] = useState('')
  const [detailApplicationType, setDetailApplicationType] = useState<'leave' | 'resignation'>('leave')

  // 加载通知列表
  const loadNotifications = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await getUserNotifications(user.id)
      // 排序：未读优先，然后按时间倒序
      const sorted = data.sort((a, b) => {
        // 未读优先
        if (a.is_read !== b.is_read) {
          return a.is_read ? 1 : -1
        }
        // 时间倒序
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setNotifications(sorted)
    } catch (error) {
      logger.error('加载通知列表失败', error)
      Taro.showToast({title: '加载失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [user])

  // 页面显示时加载数据
  useDidShow(() => {
    loadNotifications()

    // 订阅实时通知更新
    if (user) {
      const unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
        // 只添加新通知，不重新加载所有通知
        setNotifications((prev) => {
          // 检查是否已存在该通知
          const exists = prev.some((n) => n.id === newNotification.id)
          if (exists) {
            return prev
          }
          // 添加到列表开头
          return [newNotification, ...prev]
        })
      })

      return () => {
        unsubscribe()
      }
    }
  })

  // 标记单个通知为已读
  const handleMarkAsRead = async (notificationId: string) => {
    const success = await markNotificationAsRead(notificationId)
    if (success) {
      setNotifications((prev) =>
        prev
          .map((n) => (n.id === notificationId ? {...n, is_read: true} : n))
          .sort((a, b) => {
            // 未读优先
            if (a.is_read !== b.is_read) {
              return a.is_read ? 1 : -1
            }
            // 时间倒序
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
      )
    }
  }

  // 标记所有通知为已读
  const _handleMarkAllAsRead = async () => {
    if (!user) return

    const success = await markAllNotificationsAsRead(user.id)
    if (success) {
      setNotifications((prev) =>
        prev
          .map((n) => ({...n, is_read: true}))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      )
      Taro.showToast({title: '已全部标记为已读', icon: 'success'})
    }
  }

  // 删除单个通知
  const handleDelete = async (notificationId: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: async (res) => {
        if (res.confirm) {
          const success = await deleteNotification(notificationId)
          if (success) {
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
            Taro.showToast({title: '删除成功', icon: 'success'})
          }
        }
      }
    })
  }

  // 删除所有已读通知
  const _handleDeleteRead = async () => {
    if (!user) return

    Taro.showModal({
      title: '确认清空',
      content: '确认要清空所有已读通知吗？此操作不可恢复。',
      confirmText: '确认清空',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          const success = await deleteReadNotifications(user.id)
          if (success) {
            setNotifications((prev) => prev.filter((n) => !n.is_read))
            Taro.showToast({title: '清空成功', icon: 'success'})
          } else {
            Taro.showToast({title: '清空失败', icon: 'error'})
          }
        }
      }
    })
  }

  // 清空所有通知（需要二次确认）
  // 只清除"已读"且"已处理"或"仅通知"类型的通知
  // 保留所有"未读"或"待处理"的通知
  const handleClearAll = async () => {
    if (!user) return

    // 计算可清除的通知数量（已读且非待处理）
    const clearableNotifications = notifications.filter((n) => {
      const status = getNotificationProcessStatus(n.type)
      return n.is_read && status !== 'pending'
    })

    const clearableCount = clearableNotifications.length

    if (clearableCount === 0) {
      Taro.showToast({title: '暂无可清空的通知', icon: 'none'})
      return
    }

    Taro.showModal({
      title: '确认清空',
      content: `确认要清空所有已读且已处理的通知吗？共 ${clearableCount} 条通知，此操作不可恢复。\n\n注意：未读或待处理的通知将被保留。`,
      confirmText: '确认清空',
      cancelText: '取消',
      confirmColor: '#f97316',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 逐个删除可清除的通知
            const deletePromises = clearableNotifications.map((n) => deleteNotification(n.id))
            await Promise.all(deletePromises)

            // 更新本地状态
            setNotifications((prev) => prev.filter((n) => !clearableNotifications.some((cn) => cn.id === n.id)))
            Taro.showToast({title: '清空成功', icon: 'success'})
          } catch (error) {
            logger.error('清空通知失败', error)
            Taro.showToast({title: '清空失败', icon: 'error'})
          }
        }
      }
    })
  }

  // 点击通知项
  const handleNotificationClick = async (notification: Notification) => {
    // 标记为已读
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id)
    }

    // 获取通知的处理状态
    const processStatus = getNotificationProcessStatus(notification.type)

    // 如果是已处理的申请，显示详情弹窗
    if (processStatus === 'processed' && notification.related_id) {
      // 判断申请类型
      if (
        notification.type === 'leave_approved' ||
        notification.type === 'leave_rejected' ||
        notification.type === 'leave_application_submitted'
      ) {
        setDetailApplicationType('leave')
        setDetailApplicationId(notification.related_id)
        setDetailVisible(true)
        return
      } else if (
        notification.type === 'resignation_approved' ||
        notification.type === 'resignation_rejected' ||
        notification.type === 'resignation_application_submitted'
      ) {
        setDetailApplicationType('resignation')
        setDetailApplicationId(notification.related_id)
        setDetailVisible(true)
        return
      }
    }

    // 如果是待处理的申请，跳转到相应页面
    if (notification.related_id) {
      switch (notification.type) {
        case 'vehicle_review_pending':
          // 跳转到车辆详情页
          Taro.navigateTo({
            url: `/pages/super-admin/vehicle-review-detail/index?vehicleId=${notification.related_id}`
          })
          break
        case 'leave_application_submitted':
        case 'resignation_application_submitted': {
          // 获取用户角色，根据角色跳转到不同的审批页面
          const userRole = await UsersAPI.getCurrentUserRole()
          const pathPrefix = userRole === 'BOSS' ? '/pages/super-admin' : '/pages/manager'

          // 根据通知类型确定要查询的表
          const isLeaveNotification = notification.type === 'leave_application_submitted'
          const tableName = isLeaveNotification ? 'leave_applications' : 'resignation_applications'

          try {
            // 获取申请的仓库ID和状态
            const {data: application} = await supabase
              .from(tableName)
              .select('warehouse_id, status')
              .eq('id', notification.related_id)
              .maybeSingle()

            if (application?.warehouse_id) {
              // 根据申请状态确定要跳转的标签
              let tab = 'pending' // 默认待审核
              if (application.status === 'approved') {
                tab = 'approved' // 已批准
              } else if (application.status === 'rejected') {
                tab = 'rejected' // 已拒绝
              }

              // 跳转到考勤管理页面，并切换到对应标签和仓库
              Taro.navigateTo({
                url: `${pathPrefix}/leave-approval/index?tab=${tab}&warehouseId=${application.warehouse_id}`
              })
              return
            }
          } catch (error) {
            logger.error('获取申请信息失败', error)
          }

          // 如果获取失败，跳转到考勤管理页面（不指定仓库）
          Taro.navigateTo({
            url: `${pathPrefix}/leave-approval/index?tab=pending`
          })
          break
        }
        default:
          break
      }
    }
  }

  // 获取通知图标
  const _getNotificationIcon = (type: string) => {
    switch (type) {
      case 'vehicle_review_pending':
        return 'i-mdi-clock-alert text-orange-500'
      case 'vehicle_review_approved':
        return 'i-mdi-check-circle text-green-500'
      case 'vehicle_review_need_supplement':
        return 'i-mdi-alert-circle text-red-500'
      case 'warehouse_assigned':
        return 'i-mdi-warehouse text-blue-500'
      case 'warehouse_unassigned':
        return 'i-mdi-warehouse-off text-gray-500'
      case 'driver_type_changed':
        return 'i-mdi-account-switch text-purple-500'
      case 'permission_change':
        return 'i-mdi-shield-account text-orange-500'
      case 'driver_info_update':
        return 'i-mdi-account-edit text-blue-500'
      case 'driver_created':
        return 'i-mdi-account-plus text-green-500'
      case 'leave_application_submitted':
        return 'i-mdi-file-document-edit text-orange-500'
      case 'leave_approved':
        return 'i-mdi-check-circle text-green-500'
      case 'leave_rejected':
        return 'i-mdi-close-circle text-red-500'
      case 'resignation_application_submitted':
        return 'i-mdi-account-remove text-orange-500'
      case 'resignation_approved':
        return 'i-mdi-check-circle text-green-500'
      case 'resignation_rejected':
        return 'i-mdi-close-circle text-red-500'
      case 'system_notice':
        return 'i-mdi-information text-blue-500'
      default:
        return 'i-mdi-bell text-primary'
    }
  }

  // 判断日期分类
  const getDateCategory = useCallback((dateString: string): 'today' | 'yesterday' | 'history' => {
    const date = new Date(dateString)
    const now = new Date()

    // 重置时间到当天0点
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const notificationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffDays = Math.floor((today.getTime() - notificationDate.getTime()) / 86400000)

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    return 'history'
  }, [])

  // 格式化时间
  const _formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }, [])

  // 格式化历史日期
  const _formatHistoryDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month}月${day}日 ${hours}:${minutes}`
  }, [])

  // 格式化通知时间（根据日期分类显示不同格式）
  const formatNotificationTime = useCallback(
    (dateString: string) => {
      const category = getDateCategory(dateString)
      if (category === 'today' || category === 'yesterday') {
        return _formatTime(dateString)
      }
      return _formatHistoryDate(dateString)
    },
    [getDateCategory, _formatHistoryDate, _formatTime]
  )

  // 按日期分组通知
  const _groupedNotifications = useMemo(() => {
    const groups: NotificationGroup[] = []

    // 分类通知
    const todayNotifications = notifications.filter((n) => getDateCategory(n.created_at) === 'today')
    const yesterdayNotifications = notifications.filter((n) => getDateCategory(n.created_at) === 'yesterday')
    const historyNotifications = notifications.filter((n) => getDateCategory(n.created_at) === 'history')

    // 添加今天的通知
    if (todayNotifications.length > 0) {
      groups.push({
        title: '今天',
        notifications: todayNotifications
      })
    }

    // 添加昨天的通知
    if (yesterdayNotifications.length > 0) {
      groups.push({
        title: '昨天',
        notifications: yesterdayNotifications
      })
    }

    // 添加历史通知
    if (historyNotifications.length > 0) {
      groups.push({
        title: '更早',
        notifications: historyNotifications
      })
    }

    return groups
  }, [notifications, getDateCategory])

  // 统计未读数量
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length
  }, [notifications])

  // 统计已读数量
  const readCount = useMemo(() => {
    return notifications.filter((n) => n.is_read).length
  }, [notifications])

  // 根据筛选条件过滤通知
  const filteredNotifications = useMemo(() => {
    let result = notifications

    // 按已读/未读筛选
    if (filterType === 'unread') {
      result = result.filter((n) => !n.is_read)
    } else if (filterType === 'read') {
      result = result.filter((n) => n.is_read)
    }

    // 按分类筛选
    if (selectedCategory !== 'all') {
      result = result.filter((n) => n.category === selectedCategory)
    }

    return result
  }, [notifications, filterType, selectedCategory])

  // 根据筛选后的通知进行分组
  const groupedFilteredNotifications = useMemo(() => {
    const groups: NotificationGroup[] = []
    const groupMap = new Map<string, Notification[]>()

    filteredNotifications.forEach((notification) => {
      const category = getDateCategory(notification.created_at)
      if (!groupMap.has(category)) {
        groupMap.set(category, [])
      }
      groupMap.get(category)?.push(notification)
    })

    // 按照今天、昨天、历史的顺序排列
    const order: Array<'today' | 'yesterday' | 'history'> = ['today', 'yesterday', 'history']
    const titleMap = {
      today: '今天',
      yesterday: '昨天',
      history: '更早'
    }

    order.forEach((key) => {
      const notifs = groupMap.get(key)
      if (notifs && notifs.length > 0) {
        groups.push({title: titleMap[key], notifications: notifs})
      }
    })

    return groups
  }, [filteredNotifications, getDateCategory])

  return (
    <View className="min-h-screen bg-background flex flex-col">
      {/* 顶部标题栏 */}
      <View className="bg-card px-4 py-3 border-b border-border flex items-center justify-between">
        <Text className="text-xl font-bold text-foreground">通知中心</Text>
        {unreadCount > 0 && (
          <View className="bg-destructive px-3 py-1 rounded-full">
            <Text className="text-xs text-white font-medium">{unreadCount} 条未读</Text>
          </View>
        )}
      </View>

      {/* 顶部横列：信息分类导航 */}
      <View className="bg-card border-b border-border">
        <ScrollView scrollX className="box-border">
          <View className="flex flex-row px-4 py-3 gap-2">
            {/* 全部分类 */}
            <View
              className={`flex items-center justify-center px-6 py-3 rounded-lg cursor-pointer transition-all ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              onClick={() => setSelectedCategory('all')}>
              <View className="i-mdi-view-grid text-xl mb-1"></View>
              <Text className={`text-sm font-medium ${selectedCategory === 'all' ? 'text-white' : ''}`}>全部</Text>
            </View>

            {/* 分类按钮 */}
            {CATEGORY_CONFIG.map((category) => (
              <View
                key={category.value}
                className={`flex items-center justify-center px-6 py-3 rounded-lg cursor-pointer transition-all ${
                  selectedCategory === category.value
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                onClick={() => setSelectedCategory(category.value)}>
                <View className={`${category.icon} text-xl mb-1`}></View>
                <Text
                  className={`text-sm font-medium whitespace-nowrap ${selectedCategory === category.value ? 'text-white' : ''}`}>
                  {category.label}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 主体区域：左侧竖列 + 右侧内容区 */}
      <View className="flex-1 flex flex-row">
        {/* 左侧竖列：状态筛选区 */}
        <View className="w-24 bg-card border-r border-border flex flex-col py-2">
          {/* 状态筛选按钮 */}
          {FILTER_CONFIG.map((filter) => {
            const count =
              filter.value === 'unread' ? unreadCount : filter.value === 'read' ? readCount : notifications.length
            return (
              <View
                key={filter.value}
                className={`flex flex-col items-center justify-center py-4 px-2 cursor-pointer transition-all ${
                  filterType === filter.value
                    ? 'bg-primary/10 border-l-4 border-primary'
                    : 'hover:bg-muted/50 border-l-4 border-transparent'
                }`}
                onClick={() => setFilterType(filter.value)}>
                <View
                  className={`${filter.icon} text-2xl mb-1 ${filterType === filter.value ? 'text-primary' : 'text-muted-foreground'}`}></View>
                <Text
                  className={`text-xs font-medium ${filterType === filter.value ? 'text-primary' : 'text-muted-foreground'}`}>
                  {filter.label}
                </Text>
                <Text
                  className={`text-xs mt-1 ${filterType === filter.value ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {count}
                </Text>
              </View>
            )
          })}

          {/* 分隔线 */}
          <View className="h-px bg-border my-2 mx-2"></View>

          {/* 清空按钮 */}
          <View
            className="flex flex-col items-center justify-center py-4 px-2 cursor-pointer hover:bg-destructive/10 transition-all"
            onClick={handleClearAll}>
            <View className="i-mdi-delete-sweep text-2xl mb-1 text-destructive"></View>
            <Text className="text-xs font-medium text-destructive">清空</Text>
          </View>
        </View>

        {/* 右侧主内容区：通知列表 */}
        <View className="flex-1 bg-background">
          <ScrollView scrollY className="h-screen box-border">
            {loading ? (
              <View className="flex items-center justify-center py-20">
                <View className="i-mdi-loading animate-spin text-4xl text-primary mb-2"></View>
                <Text className="text-muted-foreground">加载中...</Text>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <View className="flex flex-col items-center justify-center py-20">
                <View className="i-mdi-bell-off text-6xl text-muted-foreground mb-4"></View>
                <Text className="text-muted-foreground text-base">
                  {filterType === 'unread' ? '暂无未读通知' : filterType === 'read' ? '暂无已读通知' : '暂无通知'}
                </Text>
              </View>
            ) : (
              <View className="pb-4">
                {groupedFilteredNotifications.map((group) => (
                  <View key={group.title} className="mb-4">
                    {/* 日期分组标题 */}
                    <View className="px-4 py-2 bg-muted/30 sticky top-0">
                      <Text className="text-sm font-bold text-muted-foreground">{group.title}</Text>
                    </View>

                    {/* 该分组的通知列表 */}
                    <View className="px-4 pt-3 space-y-3">
                      {group.notifications.map((notification) => {
                        const processStatus = getNotificationProcessStatus(notification.type)
                        const statusLabel = getNotificationStatusLabel(notification.type)
                        const statusColor = getNotificationStatusColor(notification.type)
                        const isPending = processStatus === 'pending'
                        const isProcessed = processStatus === 'processed'

                        return (
                          <View
                            key={notification.id}
                            className={`bg-white rounded-xl p-4 border-2 transition-all ${
                              isPending
                                ? 'border-orange-300 shadow-md hover:shadow-lg hover:border-orange-500'
                                : notification.is_read
                                  ? 'border-gray-200 hover:border-gray-300'
                                  : 'border-blue-300 shadow-sm hover:shadow-md hover:border-blue-500'
                            } ${isProcessed ? 'opacity-75' : ''}`}
                            onClick={() => handleNotificationClick(notification)}>
                            {/* 通知头部：状态指示器 + 标题 + 状态标签 */}
                            <View className="flex items-start gap-3 mb-3">
                              {/* 状态指示器 */}
                              <View
                                className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                                  isPending
                                    ? 'bg-orange-500 animate-pulse'
                                    : notification.is_read
                                      ? 'bg-green-500'
                                      : 'bg-red-500 animate-pulse'
                                }`}></View>

                              {/* 标题和状态标签 */}
                              <View className="flex-1 min-w-0">
                                <View className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Text
                                    className={`text-base font-semibold ${
                                      notification.is_read ? 'text-gray-500' : 'text-gray-900'
                                    }`}>
                                    {notification.title}
                                  </Text>
                                  {/* 状态标签 */}
                                  <View
                                    className={`px-2 py-0.5 rounded-full ${
                                      isPending
                                        ? 'bg-orange-100'
                                        : isProcessed
                                          ? statusColor.includes('success')
                                            ? 'bg-green-100'
                                            : statusColor.includes('destructive')
                                              ? 'bg-red-100'
                                              : 'bg-gray-100'
                                          : 'bg-gray-100'
                                    }`}>
                                    <Text
                                      className={`text-xs font-medium ${
                                        isPending
                                          ? 'text-orange-600'
                                          : isProcessed
                                            ? statusColor.includes('success')
                                              ? 'text-green-600'
                                              : statusColor.includes('destructive')
                                                ? 'text-red-600'
                                                : 'text-gray-600'
                                            : 'text-gray-600'
                                      }`}>
                                      {statusLabel}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              {/* 删除按钮 */}
                              <View
                                className="i-mdi-delete text-xl text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(notification.id)
                                }}></View>
                            </View>

                            {/* 通知内容 */}
                            <View className="ml-6">
                              <Text className="text-sm text-gray-600 mb-3 leading-relaxed">{notification.content}</Text>

                              {/* 通知底部：时间和操作提示 */}
                              <View className="flex items-center justify-between">
                                <View className="flex items-center gap-2">
                                  <View className="i-mdi-clock-outline text-sm text-gray-400"></View>
                                  <Text className="text-xs text-gray-500">
                                    {formatNotificationTime(notification.created_at)}
                                  </Text>
                                </View>

                                {/* 操作提示 */}
                                {isPending && (
                                  <View className="flex items-center gap-1">
                                    <View className="i-mdi-hand-pointing-right text-sm text-orange-500"></View>
                                    <Text className="text-xs text-orange-600 font-medium">点击处理</Text>
                                  </View>
                                )}
                                {isProcessed && (
                                  <View className="flex items-center gap-1">
                                    <View className="i-mdi-check-circle text-sm text-green-500"></View>
                                    <Text className="text-xs text-gray-500">已处理</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* 申请详情弹窗 */}
      <ApplicationDetailDialog
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        applicationId={detailApplicationId}
        applicationType={detailApplicationType}
      />
    </View>
  )
}

export default NotificationsPage
