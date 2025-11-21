import {Button, Input, Picker, ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {getCurrentInstance, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  deletePieceWorkRecord,
  getActiveCategories,
  getDriverWarehouses,
  getPieceWorkRecordsByUser,
  updatePieceWorkRecord
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, Warehouse} from '@/db/types'
import {confirmDelete} from '@/utils/confirm'
import {getFirstDayOfMonthString, getLocalDateString, getMondayDateString} from '@/utils/date'

const DriverPieceWork: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [records, setRecords] = useState<PieceWorkRecord[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // 排序顺序：asc=升序，desc=降序
  const [activeQuickFilter, setActiveQuickFilter] = useState<'yesterday' | 'week' | 'month' | 'nextday' | 'custom'>(
    'month'
  ) // 当前选中的快捷筛选

  // 获取URL参数
  const instance = getCurrentInstance()
  const rangeParam = instance.router?.params?.range || '' // 'today' 或 'month'

  // 编辑状态
  const [editingRecord, setEditingRecord] = useState<PieceWorkRecord | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    quantity: '',
    unitPrice: '',
    needUpstairs: false,
    upstairsPrice: '',
    needSorting: false,
    sortingQuantity: '',
    sortingUnitPrice: ''
  })

  // 初始化日期范围（根据URL参数或默认当月）
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    if (rangeParam === 'today') {
      // 设置为今天
      setStartDate(todayStr)
      setEndDate(todayStr)
      setActiveQuickFilter('yesterday') // 使用yesterday作为"今天"的标识
    } else if (rangeParam === 'month') {
      // 设置为本月
      const firstDay = `${year}-${month}-01`
      setStartDate(firstDay)
      setEndDate(todayStr)
      setActiveQuickFilter('month')
    } else {
      // 默认当月
      const firstDay = `${year}-${month}-01`
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
      const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
      setStartDate(firstDay)
      setEndDate(lastDayStr)
      setActiveQuickFilter('month')
    }
  }, [rangeParam])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    // 加载司机的仓库
    const driverWarehouses = await getDriverWarehouses(user.id)
    setWarehouses(driverWarehouses)

    // 加载品类
    const categoriesData = await getActiveCategories()
    setCategories(categoriesData)
  }, [user?.id])

  // 加载计件记录
  const loadRecords = useCallback(async () => {
    if (!user?.id || !startDate || !endDate) return

    let data = await getPieceWorkRecordsByUser(user.id, startDate, endDate)

    // 如果选择了仓库，进行筛选
    if (selectedWarehouseIndex > 0) {
      const selectedWarehouse = warehouses[selectedWarehouseIndex - 1]
      if (selectedWarehouse) {
        data = data.filter((r) => r.warehouse_id === selectedWarehouse.id)
      }
    }

    // 按日期排序
    data.sort((a, b) => {
      const dateA = new Date(a.work_date).getTime()
      const dateB = new Date(b.work_date).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })

    setRecords(data)
  }, [user?.id, startDate, endDate, selectedWarehouseIndex, warehouses, sortOrder])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useDidShow(() => {
    loadData()
    loadRecords() // 添加：页面显示时重新加载记录
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadData(), loadRecords()])
    Taro.stopPullDownRefresh()
  })

  // 计算统计数据
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0)
  const totalAmount = records.reduce((sum, r) => sum + Number(r.total_amount), 0)

  // 格式化日期（完整显示年月日）
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}年${month}月${day}日`
  }

  // 格式化日期时间（完整显示年月日时分）
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}年${month}月${day}日 ${hours}:${minutes}`
  }

  // 格式化时间（只显示时分）
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 格式化日期（简短版本）
  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  }

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 获取品类名称
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || '未知品类'
  }

  // 切换排序顺序
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  // 辅助函数：计算指定日期的前一天
  const getPreviousDay = (dateStr: string): string => {
    const date = new Date(dateStr)
    date.setDate(date.getDate() - 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 辅助函数：计算指定日期的后一天
  const getNextDay = (dateStr: string): string => {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 辅助函数：格式化日期显示（年月日）
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}年${month}月${day}日`
  }

  // 计算前一天的日期（用于显示）
  const getPreviousDayDisplay = (): string => {
    const baseDate = startDate || getLocalDateString()
    const dateStr = getPreviousDay(baseDate)
    return formatDateDisplay(dateStr)
  }

  // 计算后一天的日期（用于显示）
  const getNextDayDisplay = (): string => {
    const baseDate = endDate || getLocalDateString()
    const dateStr = getNextDay(baseDate)
    return formatDateDisplay(dateStr)
  }

  // 快捷筛选：前一天（基于当前选中的日期）
  const handleYesterdayFilter = () => {
    // 如果当前有选中的日期，基于它计算前一天；否则使用昨天
    const baseDate = startDate || getLocalDateString()
    const dateStr = getPreviousDay(baseDate)
    setStartDate(dateStr)
    setEndDate(dateStr)
    setActiveQuickFilter('yesterday')
  }

  // 快捷筛选：本周
  const handleWeekFilter = () => {
    const startDateStr = getMondayDateString()
    const endDateStr = getLocalDateString()

    setStartDate(startDateStr)
    setEndDate(endDateStr)
    setActiveQuickFilter('week')
  }

  // 快捷筛选：本月
  const handleMonthFilter = () => {
    const firstDay = getFirstDayOfMonthString()
    const endDateStr = getLocalDateString()

    setStartDate(firstDay)
    setEndDate(endDateStr)
    setActiveQuickFilter('month')
  }

  // 快捷筛选：后一天（基于当前选中的日期）
  const handleNextDayFilter = () => {
    // 如果当前有选中的日期，基于它计算后一天；否则使用明天
    const baseDate = endDate || getLocalDateString()
    const dateStr = getNextDay(baseDate)
    setStartDate(dateStr)
    setEndDate(dateStr)
    setActiveQuickFilter('nextday')
  }

  // 手动修改日期时，将快捷筛选设置为自定义
  const handleStartDateChange = (value: string) => {
    setStartDate(value)
    setActiveQuickFilter('custom')
  }

  const handleEndDateChange = (value: string) => {
    setEndDate(value)
    setActiveQuickFilter('custom')
  }

  // 开始编辑
  const handleEdit = (record: PieceWorkRecord) => {
    setEditingRecord(record)
    setEditForm({
      quantity: record.quantity.toString(),
      unitPrice: record.unit_price.toString(),
      needUpstairs: record.need_upstairs,
      upstairsPrice: record.upstairs_price.toString(),
      needSorting: record.need_sorting,
      sortingQuantity: record.sorting_quantity.toString(),
      sortingUnitPrice: record.sorting_unit_price.toString()
    })
    setIsEditing(true)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingRecord(null)
    setIsEditing(false)
    setEditForm({
      quantity: '',
      unitPrice: '',
      needUpstairs: false,
      upstairsPrice: '',
      needSorting: false,
      sortingQuantity: '',
      sortingUnitPrice: ''
    })
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingRecord) return

    // 验证数据
    const quantity = Number(editForm.quantity)
    const unitPrice = Number(editForm.unitPrice)
    const upstairsPrice = Number(editForm.upstairsPrice) || 0
    const sortingQuantity = Number(editForm.sortingQuantity) || 0
    const sortingUnitPrice = Number(editForm.sortingUnitPrice) || 0

    if (Number.isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      Taro.showToast({
        title: '件数必须是正整数',
        icon: 'none'
      })
      return
    }

    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      Taro.showToast({
        title: '单价必须是非负数',
        icon: 'none'
      })
      return
    }

    if (editForm.needUpstairs && (Number.isNaN(upstairsPrice) || upstairsPrice < 0)) {
      Taro.showToast({
        title: '上楼单价必须是非负数',
        icon: 'none'
      })
      return
    }

    if (editForm.needSorting) {
      if (Number.isNaN(sortingQuantity) || sortingQuantity <= 0 || !Number.isInteger(sortingQuantity)) {
        Taro.showToast({
          title: '分拣件数必须是正整数',
          icon: 'none'
        })
        return
      }
      if (Number.isNaN(sortingUnitPrice) || sortingUnitPrice < 0) {
        Taro.showToast({
          title: '分拣单价必须是非负数',
          icon: 'none'
        })
        return
      }
    }

    // 二次确认
    const confirmResult = await new Promise<boolean>((resolve) => {
      Taro.showModal({
        title: '确认修改',
        content: '确定要保存对此记录的修改吗？',
        success: (res) => {
          resolve(res.confirm)
        }
      })
    })

    if (!confirmResult) return

    // 计算总金额
    const baseAmount = quantity * unitPrice
    const upstairsAmount = editForm.needUpstairs ? quantity * upstairsPrice : 0
    const sortingAmount = editForm.needSorting ? sortingQuantity * sortingUnitPrice : 0
    const totalAmount = baseAmount + upstairsAmount + sortingAmount

    // 更新记录
    const success = await updatePieceWorkRecord(editingRecord.id, {
      user_id: editingRecord.user_id,
      warehouse_id: editingRecord.warehouse_id,
      work_date: editingRecord.work_date,
      category_id: editingRecord.category_id,
      quantity,
      unit_price: unitPrice,
      need_upstairs: editForm.needUpstairs,
      upstairs_price: upstairsPrice,
      need_sorting: editForm.needSorting,
      sorting_quantity: sortingQuantity,
      sorting_unit_price: sortingUnitPrice,
      total_amount: totalAmount
    })

    if (success) {
      Taro.showToast({
        title: '修改成功',
        icon: 'success'
      })
      handleCancelEdit()
      loadRecords()
    } else {
      Taro.showToast({
        title: '修改失败',
        icon: 'error'
      })
    }
  }

  // 删除记录
  const handleDelete = async (record: PieceWorkRecord) => {
    const confirmed = await confirmDelete(
      '确认删除',
      `确定要删除 ${formatDate(record.work_date)} 的计件记录吗？\n\n` +
        `仓库：${getWarehouseName(record.warehouse_id)}\n` +
        `品类：${getCategoryName(record.category_id)}\n` +
        `件数：${record.quantity}\n` +
        `金额：¥${Number(record.total_amount).toFixed(2)}`
    )

    if (confirmed) {
      const success = await deletePieceWorkRecord(record.id)
      if (success) {
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        })
        loadRecords()
      } else {
        Taro.showToast({
          title: '删除失败',
          icon: 'error'
        })
      }
    }
  }

  // 仓库选择器选项（添加"全部仓库"选项）
  const warehouseOptions = ['全部仓库', ...warehouses.map((w) => w.name)]

  // 如果正在编辑，显示编辑界面
  if (isEditing && editingRecord) {
    return (
      <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
        <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
          <View className="p-4">
            {/* 编辑标题 */}
            <View className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 mb-4 shadow-lg">
              <Text className="text-white text-2xl font-bold block mb-2">编辑计件记录</Text>
              <Text className="text-blue-100 text-sm block">{formatDate(editingRecord.work_date)}</Text>
            </View>

            {/* 记录信息 */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
              <View className="flex items-center mb-4">
                <View className="i-mdi-information text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">记录信息</Text>
              </View>
              <View className="space-y-2">
                <View className="flex items-center">
                  <Text className="text-sm text-gray-600 w-20">仓库：</Text>
                  <Text className="text-sm text-gray-800">{getWarehouseName(editingRecord.warehouse_id)}</Text>
                </View>
                <View className="flex items-center">
                  <Text className="text-sm text-gray-600 w-20">品类：</Text>
                  <Text className="text-sm text-gray-800">{getCategoryName(editingRecord.category_id)}</Text>
                </View>
                <View className="flex items-center">
                  <Text className="text-sm text-gray-600 w-20">日期：</Text>
                  <Text className="text-sm text-gray-800">{formatDate(editingRecord.work_date)}</Text>
                </View>
              </View>
            </View>

            {/* 编辑表单 */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
              <View className="flex items-center mb-4">
                <View className="i-mdi-pencil text-xl text-orange-600 mr-2" />
                <Text className="text-lg font-bold text-gray-800">编辑数据</Text>
              </View>

              {/* 件数 */}
              <View className="mb-4">
                <Text className="text-sm text-gray-600 block mb-2">
                  <Text className="text-red-500">* </Text>件数（正整数）
                </Text>
                <Input
                  type="number"
                  className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                  placeholder="请输入件数"
                  value={editForm.quantity}
                  onInput={(e) => setEditForm({...editForm, quantity: e.detail.value})}
                />
              </View>

              {/* 单价 */}
              <View className="mb-4">
                <Text className="text-sm text-gray-600 block mb-2">
                  <Text className="text-red-500">* </Text>单价（元/件，最多两位小数）
                </Text>
                <Input
                  type="digit"
                  className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                  placeholder="请输入单价"
                  value={editForm.unitPrice}
                  onInput={(e) => setEditForm({...editForm, unitPrice: e.detail.value})}
                />
              </View>

              {/* 是否需要上楼 */}
              <View className="mb-4">
                <View className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <Text className="text-sm text-gray-700">是否需要上楼</Text>
                  <Switch
                    checked={editForm.needUpstairs}
                    onChange={(e) => setEditForm({...editForm, needUpstairs: e.detail.value})}
                  />
                </View>
              </View>

              {/* 上楼单价 */}
              {editForm.needUpstairs && (
                <View className="mb-4">
                  <Text className="text-sm text-gray-600 block mb-2">
                    <Text className="text-red-500">* </Text>上楼单价（元/件，最多两位小数）
                  </Text>
                  <Input
                    type="digit"
                    className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                    placeholder="请输入上楼单价"
                    value={editForm.upstairsPrice}
                    onInput={(e) => setEditForm({...editForm, upstairsPrice: e.detail.value})}
                  />
                </View>
              )}

              {/* 是否需要分拣 */}
              <View className="mb-4">
                <View className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <Text className="text-sm text-gray-700">是否需要分拣</Text>
                  <Switch
                    checked={editForm.needSorting}
                    onChange={(e) => setEditForm({...editForm, needSorting: e.detail.value})}
                  />
                </View>
              </View>

              {/* 分拣件数和单价 */}
              {editForm.needSorting && (
                <>
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 block mb-2">
                      <Text className="text-red-500">* </Text>分拣件数（正整数）
                    </Text>
                    <Input
                      type="number"
                      className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                      placeholder="请输入分拣件数"
                      value={editForm.sortingQuantity}
                      onInput={(e) => setEditForm({...editForm, sortingQuantity: e.detail.value})}
                    />
                  </View>
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 block mb-2">
                      <Text className="text-red-500">* </Text>分拣单价（元/件，最多两位小数）
                    </Text>
                    <Input
                      type="digit"
                      className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                      placeholder="请输入分拣单价"
                      value={editForm.sortingUnitPrice}
                      onInput={(e) => setEditForm({...editForm, sortingUnitPrice: e.detail.value})}
                    />
                  </View>
                </>
              )}
            </View>

            {/* 操作按钮 */}
            <View className="grid grid-cols-2 gap-4 mb-4">
              <Button
                className="bg-gray-400 text-white rounded-xl shadow-md active:scale-98 transition-all"
                onClick={handleCancelEdit}>
                <Text className="text-base font-medium">取消</Text>
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg active:scale-98 transition-all"
                onClick={handleSaveEdit}>
                <Text className="text-base font-medium">保存修改</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">我的计件</Text>
            <View className="flex items-center">
              <Text className="text-orange-100 text-sm">查看和管理计件工作记录</Text>
              {rangeParam && (
                <View className="ml-2 bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <Text className="text-white text-xs font-medium">
                    {rangeParam === 'today' ? '📅 今天数据' : '📊 本月数据'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 快捷筛选按钮（移到外面） */}
          <View className="mb-4">
            <View className="grid grid-cols-4 gap-2">
              {/* 前一天 */}
              <View
                className={`flex flex-col items-center justify-center p-2 rounded-lg active:scale-95 transition-all ${
                  activeQuickFilter === 'yesterday'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-md'
                    : 'bg-gradient-to-r from-blue-50 to-blue-100'
                }`}
                onClick={handleYesterdayFilter}>
                <View
                  className={`text-xl mb-1 i-mdi-calendar-minus ${activeQuickFilter === 'yesterday' ? 'text-white' : 'text-blue-600'}`}
                />
                <Text
                  className={`text-xs font-medium mb-0.5 ${activeQuickFilter === 'yesterday' ? 'text-white' : 'text-blue-700'}`}>
                  前一天
                </Text>
                <Text className={`text-xs ${activeQuickFilter === 'yesterday' ? 'text-blue-100' : 'text-blue-500'}`}>
                  {getPreviousDayDisplay()}
                </Text>
              </View>

              {/* 本周 */}
              <View
                className={`flex flex-col items-center justify-center p-2 rounded-lg active:scale-95 transition-all ${
                  activeQuickFilter === 'week'
                    ? 'bg-gradient-to-r from-green-600 to-green-500 shadow-md'
                    : 'bg-gradient-to-r from-green-50 to-green-100'
                }`}
                onClick={handleWeekFilter}>
                <View
                  className={`text-xl mb-1 i-mdi-calendar-week ${activeQuickFilter === 'week' ? 'text-white' : 'text-green-600'}`}
                />
                <Text
                  className={`text-xs font-medium ${activeQuickFilter === 'week' ? 'text-white' : 'text-green-700'}`}>
                  本周
                </Text>
              </View>

              {/* 本月 */}
              <View
                className={`flex flex-col items-center justify-center p-2 rounded-lg active:scale-95 transition-all ${
                  activeQuickFilter === 'month'
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 shadow-md'
                    : 'bg-gradient-to-r from-orange-50 to-orange-100'
                }`}
                onClick={handleMonthFilter}>
                <View
                  className={`text-xl mb-1 i-mdi-calendar-month ${activeQuickFilter === 'month' ? 'text-white' : 'text-orange-600'}`}
                />
                <Text
                  className={`text-xs font-medium ${activeQuickFilter === 'month' ? 'text-white' : 'text-orange-700'}`}>
                  本月
                </Text>
              </View>

              {/* 后一天 */}
              <View
                className={`flex flex-col items-center justify-center p-2 rounded-lg active:scale-95 transition-all ${
                  activeQuickFilter === 'nextday'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 shadow-md'
                    : 'bg-gradient-to-r from-purple-50 to-purple-100'
                }`}
                onClick={handleNextDayFilter}>
                <View
                  className={`text-xl mb-1 i-mdi-calendar-plus ${activeQuickFilter === 'nextday' ? 'text-white' : 'text-purple-600'}`}
                />
                <Text
                  className={`text-xs font-medium mb-0.5 ${activeQuickFilter === 'nextday' ? 'text-white' : 'text-purple-700'}`}>
                  后一天
                </Text>
                <Text className={`text-xs ${activeQuickFilter === 'nextday' ? 'text-purple-100' : 'text-purple-500'}`}>
                  {getNextDayDisplay()}
                </Text>
              </View>
            </View>
          </View>

          {/* 筛选条件（隐藏，保留功能但不显示） */}
          <View style={{display: 'none'}}>
            <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
              <View className="flex items-center mb-4">
                <View className="i-mdi-filter text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">筛选条件</Text>
              </View>

              {/* 仓库选择 */}
              <View className="mb-4">
                <Text className="text-sm text-gray-600 block mb-2">仓库</Text>
                <Picker
                  mode="selector"
                  range={warehouseOptions}
                  value={selectedWarehouseIndex}
                  onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
                  <View className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                    <Text className="text-gray-800">{warehouseOptions[selectedWarehouseIndex]}</Text>
                  </View>
                </Picker>
              </View>

              {/* 日期范围 */}
              <View className="grid grid-cols-2 gap-3 mb-4">
                <View>
                  <Text className="text-sm text-gray-600 block mb-2">开始日期</Text>
                  <Picker mode="date" value={startDate} onChange={(e) => handleStartDateChange(e.detail.value)}>
                    <View className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                      <Text className="text-sm text-gray-800">{startDate}</Text>
                    </View>
                  </Picker>
                </View>
                <View>
                  <Text className="text-sm text-gray-600 block mb-2">结束日期</Text>
                  <Picker mode="date" value={endDate} onChange={(e) => handleEndDateChange(e.detail.value)}>
                    <View className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                      <Text className="text-sm text-gray-800">{endDate}</Text>
                    </View>
                  </Picker>
                </View>
              </View>

              {/* 排序按钮 */}
              <View
                className="flex items-center justify-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg active:scale-98 transition-all"
                onClick={toggleSortOrder}>
                <View
                  className={`text-xl mr-2 ${sortOrder === 'desc' ? 'i-mdi-sort-calendar-descending' : 'i-mdi-sort-calendar-ascending'} text-purple-600`}
                />
                <Text className="text-sm font-medium text-purple-700">
                  {sortOrder === 'desc' ? '按日期降序（最新在前）' : '按日期升序（最早在前）'}
                </Text>
              </View>
            </View>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-2 gap-4 mb-4">
            <View className="bg-white rounded-xl p-4 shadow-md">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">总件数</Text>
                <View className="i-mdi-package-variant text-2xl text-blue-900" />
              </View>
              <Text className="text-3xl font-bold text-blue-900 block">{totalQuantity}</Text>
            </View>
            <View className="bg-white rounded-xl p-4 shadow-md">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">总收入</Text>
                <View className="i-mdi-currency-cny text-2xl text-green-600" />
              </View>
              <Text className="text-3xl font-bold text-green-600 block">¥{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* 计件记录列表 */}
          <View className="bg-white rounded-xl p-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-clipboard-list text-xl text-orange-600 mr-2" />
              <Text className="text-lg font-bold text-gray-800">计件记录</Text>
              <View className="ml-auto">
                <Text className="text-xs text-gray-500">共 {records.length} 条</Text>
              </View>
            </View>

            {records.length > 0 ? (
              <View className="space-y-3">
                {records.map((record) => (
                  <View key={record.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 shadow-sm">
                    {/* 日期标签 - 醒目显示 */}
                    <View className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg p-3 mb-3 shadow-md">
                      <View className="flex items-center justify-between mb-2">
                        <View className="flex items-center">
                          <View className="i-mdi-calendar text-white text-xl mr-2" />
                          <Text className="text-white text-base font-bold">{formatDate(record.work_date)}</Text>
                        </View>
                        <Text className="text-blue-100 text-xs">{formatDateShort(record.work_date)}</Text>
                      </View>
                      <View className="flex items-center justify-between">
                        <View className="flex items-center">
                          <View className="i-mdi-clock-outline text-white text-sm mr-1" />
                          <Text className="text-blue-100 text-xs">创建时间：{formatTime(record.created_at)}</Text>
                        </View>
                        <Text className="text-blue-100 text-xs">{formatDateTime(record.created_at)}</Text>
                      </View>
                    </View>

                    {/* 仓库和品类 */}
                    <View className="mb-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-warehouse text-blue-600 text-lg mr-2" />
                        <Text className="text-sm text-gray-800 font-medium">
                          {getWarehouseName(record.warehouse_id)}
                        </Text>
                      </View>
                      <View className="flex items-center">
                        <View className="i-mdi-tag text-orange-600 text-lg mr-2" />
                        <Text className="text-sm text-gray-700">{getCategoryName(record.category_id)}</Text>
                        {record.need_upstairs && (
                          <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded">
                            <Text className="text-xs text-blue-600">需上楼</Text>
                          </View>
                        )}
                        {record.need_sorting && (
                          <View className="ml-2 px-2 py-0.5 bg-purple-100 rounded">
                            <Text className="text-xs text-purple-600">需分拣</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* 数据明细 */}
                    <View className="bg-white rounded-lg p-3 mb-3">
                      <View className="grid grid-cols-2 gap-2">
                        <View>
                          <Text className="text-xs text-gray-500 block mb-1">件数</Text>
                          <Text className="text-sm font-medium text-gray-800">{record.quantity}</Text>
                        </View>
                        <View>
                          <Text className="text-xs text-gray-500 block mb-1">单价</Text>
                          <Text className="text-sm font-medium text-gray-800">
                            ¥{Number(record.unit_price).toFixed(2)}
                          </Text>
                        </View>
                        {record.need_upstairs && (
                          <>
                            <View>
                              <Text className="text-xs text-gray-500 block mb-1">上楼单价</Text>
                              <Text className="text-sm font-medium text-blue-600">
                                ¥{Number(record.upstairs_price).toFixed(2)}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-xs text-gray-500 block mb-1">上楼金额</Text>
                              <Text className="text-sm font-medium text-blue-600">
                                ¥{(record.quantity * Number(record.upstairs_price)).toFixed(2)}
                              </Text>
                            </View>
                          </>
                        )}
                        {record.need_sorting && (
                          <>
                            <View>
                              <Text className="text-xs text-gray-500 block mb-1">分拣件数</Text>
                              <Text className="text-sm font-medium text-purple-600">{record.sorting_quantity}</Text>
                            </View>
                            <View>
                              <Text className="text-xs text-gray-500 block mb-1">分拣金额</Text>
                              <Text className="text-sm font-medium text-purple-600">
                                ¥{(record.sorting_quantity * Number(record.sorting_unit_price)).toFixed(2)}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    {/* 总金额 */}
                    <View className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 mb-3">
                      <View className="flex items-center justify-between">
                        <Text className="text-sm font-bold text-gray-700">总金额</Text>
                        <Text className="text-xl font-bold text-green-600">
                          ¥{Number(record.total_amount).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* 备注 */}
                    {record.notes && (
                      <View className="bg-yellow-50 rounded-lg p-2 mb-3">
                        <Text className="text-xs text-gray-600">{record.notes}</Text>
                      </View>
                    )}

                    {/* 操作按钮 */}
                    <View className="grid grid-cols-2 gap-2">
                      <View
                        className="flex items-center justify-center p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg active:scale-95 transition-all"
                        onClick={() => handleEdit(record)}>
                        <View className="i-mdi-pencil text-white text-lg mr-1" />
                        <Text className="text-white text-sm font-medium">编辑</Text>
                      </View>
                      <View
                        className="flex items-center justify-center p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-lg active:scale-95 transition-all"
                        onClick={() => handleDelete(record)}>
                        <View className="i-mdi-delete text-white text-lg mr-1" />
                        <Text className="text-white text-sm font-medium">删除</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="text-center py-12">
                <View className="i-mdi-package-variant-closed text-gray-300 text-6xl mb-3" />
                <Text className="text-gray-400 text-base block mb-2">暂无计件记录</Text>
                <Text className="text-gray-400 text-xs block">请先录入计件数据</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverPieceWork
