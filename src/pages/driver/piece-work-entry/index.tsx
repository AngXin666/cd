import {Button, Input, Picker, ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  createPieceWorkRecord,
  getCategoryPriceForDriver,
  getDriverWarehouses,
  getPieceWorkRecordsByUser,
  getUserById,
  getWarehouseCategoriesWithDetails,
  updatePieceWorkRecord
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, PieceWorkRecordInput, Profile, Warehouse} from '@/db/types'
import {canStartPieceWork} from '@/utils/attendance-check'
import {
  getLastCategory,
  getLastWarehouse,
  getLastWorkDate,
  getPieceWorkFormDefaults,
  saveLastCategory,
  saveLastWarehouse,
  saveLastWorkDate,
  savePieceWorkFormDefaults
} from '@/utils/preferences'

// 单个计件项的接口
interface PieceWorkItem {
  id: string
  quantity: string
  unitPrice: string
  unitPriceLocked: boolean // 单价是否被锁定（管理员已设置）
  needUpstairs: boolean
  upstairsPrice: string
  needSorting: boolean
  sortingQuantity: string
  sortingUnitPrice: string
}

const PieceWorkEntry: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null) // 司机信息

  // 公共表单数据
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0)
  const [workDate, setWorkDate] = useState('')

  // 计件项列表（支持批量录入）
  const [pieceWorkItems, setPieceWorkItems] = useState<PieceWorkItem[]>([
    {
      id: Date.now().toString(),
      quantity: '',
      unitPrice: '',
      unitPriceLocked: false,
      needUpstairs: false,
      upstairsPrice: '',
      needSorting: false,
      sortingQuantity: '',
      sortingUnitPrice: ''
    }
  ])

  // 初始化日期为今天
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setWorkDate(`${year}-${month}-${day}`)
  }, [])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    // 加载司机信息
    const profile = await getUserById(user.id)
    setDriverProfile(profile)

    // 加载司机的仓库（只加载启用的仓库）
    const allWarehouses = await getDriverWarehouses(user.id)
    const activeWarehouses = allWarehouses.filter((w) => w.is_active)
    setWarehouses(activeWarehouses)

    if (activeWarehouses.length === 0) {
      Taro.showToast({
        title: '暂无可用仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 加载本月的计件记录
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const firstDay = `${year}-${month}-01`
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
    const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

    const recordsData = await getPieceWorkRecordsByUser(user.id, firstDay, lastDayStr)
    setRecords(recordsData)

    // 只在首次加载时恢复用户偏好设置
    if (isFirstLoad) {
      const lastWarehouse = getLastWarehouse()
      const lastDate = getLastWorkDate()
      const formDefaults = getPieceWorkFormDefaults()

      let warehouseIndexToLoad = 0
      if (lastWarehouse && activeWarehouses.length > 0) {
        const warehouseIndex = activeWarehouses.findIndex((w) => w.id === lastWarehouse.id)
        if (warehouseIndex !== -1) {
          warehouseIndexToLoad = warehouseIndex
        }
      }
      setSelectedWarehouseIndex(warehouseIndexToLoad)

      // 加载选中仓库的品类
      const warehouseToLoad = activeWarehouses[warehouseIndexToLoad]
      if (warehouseToLoad) {
        const categoriesData = await getWarehouseCategoriesWithDetails(warehouseToLoad.id)
        setCategories(categoriesData)

        // 恢复上次选择的品类（如果存在）
        const lastCategory = getLastCategory()
        if (lastCategory && categoriesData.length > 0) {
          const categoryIndex = categoriesData.findIndex((c) => c.id === lastCategory.id)
          if (categoryIndex !== -1) {
            setSelectedCategoryIndex(categoryIndex)
          } else {
            setSelectedCategoryIndex(0)
          }
        } else if (categoriesData.length > 0) {
          setSelectedCategoryIndex(0)
        }
      }

      if (lastDate) {
        const lastDateObj = new Date(lastDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (lastDateObj >= today) {
          setWorkDate(lastDate)
        }
      }

      if (formDefaults) {
        if (formDefaults.needUpstairs !== undefined) {
          setPieceWorkItems((prev) =>
            prev.map((item, index) =>
              index === 0 ? {...item, needUpstairs: formDefaults.needUpstairs || false} : item
            )
          )
        }
      }

      setIsFirstLoad(false)
    }
  }, [user?.id, isFirstLoad])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  // 当仓库变化时，重新加载该仓库的品类
  useEffect(() => {
    const loadWarehouseCategories = async () => {
      const selectedWarehouse = warehouses[selectedWarehouseIndex]
      if (!selectedWarehouse) {
        setCategories([])
        return
      }

      const categoriesData = await getWarehouseCategoriesWithDetails(selectedWarehouse.id)
      setCategories(categoriesData)

      // 如果只有一个品类，自动选中
      if (categoriesData.length === 1) {
        setSelectedCategoryIndex(0)
      } else if (categoriesData.length > 1) {
        // 如果有多个品类，重置为第一个
        setSelectedCategoryIndex(0)
      } else {
        // 如果没有品类，显示提示
        Taro.showToast({
          title: '该仓库暂无可用品类',
          icon: 'none',
          duration: 2000
        })
      }
    }

    // 只在非首次加载时执行（首次加载在 loadData 中处理）
    if (!isFirstLoad && warehouses.length > 0) {
      loadWarehouseCategories()
    }
  }, [selectedWarehouseIndex, warehouses, isFirstLoad])

  // 当仓库或品类变化时，更新所有计件项的价格
  useEffect(() => {
    const updatePrices = async () => {
      const selectedWarehouse = warehouses[selectedWarehouseIndex]
      const selectedCategory = categories[selectedCategoryIndex]

      if (!selectedWarehouse || !selectedCategory || !driverProfile) {
        return
      }

      const priceConfig = await getCategoryPriceForDriver(selectedWarehouse.id, selectedCategory.id)

      setPieceWorkItems((prev) =>
        prev.map((item) => {
          if (priceConfig) {
            // 根据司机类型选择对应的价格
            // unit_price 对应纯司机价格，upstairs_price 对应带车司机价格
            const price =
              driverProfile.driver_type === 'with_vehicle' ? priceConfig.upstairsPrice : priceConfig.unitPrice

            return {
              ...item,
              unitPrice: price.toString(),
              unitPriceLocked: true
            }
          }
          // 如果没有配置价格，解锁价格输入
          return {
            ...item,
            unitPriceLocked: false
          }
        })
      )
    }

    updatePrices()
  }, [selectedWarehouseIndex, selectedCategoryIndex, warehouses, categories, driverProfile])

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadData()])
    Taro.stopPullDownRefresh()
  })

  // 添加计件项
  const handleAddItem = async () => {
    const selectedWarehouse = warehouses[selectedWarehouseIndex]
    const selectedCategory = categories[selectedCategoryIndex]

    // 加载价格配置
    let unitPrice = ''
    let unitPriceLocked = false

    if (selectedWarehouse && selectedCategory && driverProfile) {
      const priceConfig = await getCategoryPriceForDriver(selectedWarehouse.id, selectedCategory.id)
      if (priceConfig) {
        // 根据司机类型选择对应的价格
        // unit_price 对应纯司机价格，upstairs_price 对应带车司机价格
        const price = driverProfile.driver_type === 'with_vehicle' ? priceConfig.upstairsPrice : priceConfig.unitPrice

        unitPrice = price.toString()
        unitPriceLocked = true
      }
    }

    setPieceWorkItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        quantity: '',
        unitPrice,
        unitPriceLocked,
        needUpstairs: false,
        upstairsPrice: '',
        needSorting: false,
        sortingQuantity: '',
        sortingUnitPrice: ''
      }
    ])
  }

  // 删除计件项
  const handleRemoveItem = (id: string) => {
    if (pieceWorkItems.length === 1) {
      Taro.showToast({
        title: '至少保留一个计件项',
        icon: 'none'
      })
      return
    }
    setPieceWorkItems((prev) => prev.filter((item) => item.id !== id))
  }

  // 更新计件项
  const updateItem = (id: string, field: keyof PieceWorkItem, value: string | boolean) => {
    setPieceWorkItems((prev) => prev.map((item) => (item.id === id ? {...item, [field]: value} : item)))
  }

  // 计算单个计件项的金额明细
  const calculateItemDetails = (item: PieceWorkItem) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.unitPrice) || 0
    const upstairsPrice = Number(item.upstairsPrice) || 0
    const sortingQuantity = Number(item.sortingQuantity) || 0
    const sortingUnitPrice = Number(item.sortingUnitPrice) || 0

    const baseAmount = quantity * unitPrice
    const upstairsAmount = item.needUpstairs ? quantity * upstairsPrice : 0
    const sortingAmount = item.needSorting ? sortingQuantity * sortingUnitPrice : 0
    const totalAmount = baseAmount + upstairsAmount + sortingAmount

    return {
      baseAmount,
      upstairsAmount,
      sortingAmount,
      totalAmount
    }
  }

  // 计算所有计件项的总金额
  const calculateTotalAmount = () => {
    return pieceWorkItems.reduce((sum, item) => {
      const {totalAmount} = calculateItemDetails(item)
      return sum + totalAmount
    }, 0)
  }

  // 验证单个计件项
  const validateItem = (item: PieceWorkItem): {valid: boolean; message: string} => {
    // 验证件数
    if (!item.quantity || item.quantity.trim() === '') {
      return {valid: false, message: '请输入件数'}
    }
    const quantity = Number(item.quantity)
    if (Number.isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      return {valid: false, message: '件数必须是正整数'}
    }

    // 验证单价
    if (!item.unitPrice || item.unitPrice.trim() === '') {
      return {valid: false, message: '请输入单价'}
    }
    const unitPrice = Number(item.unitPrice)
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      return {valid: false, message: '单价必须是非负数'}
    }
    // 验证单价最多两位小数
    if (!/^\d+(\.\d{1,2})?$/.test(item.unitPrice)) {
      return {valid: false, message: '单价最多保留两位小数'}
    }

    // 验证上楼
    if (item.needUpstairs) {
      if (!item.upstairsPrice || item.upstairsPrice.trim() === '') {
        return {valid: false, message: '请输入上楼单价'}
      }
      const upstairsPrice = Number(item.upstairsPrice)
      if (Number.isNaN(upstairsPrice) || upstairsPrice < 0) {
        return {valid: false, message: '上楼单价必须是非负数'}
      }
      if (!/^\d+(\.\d{1,2})?$/.test(item.upstairsPrice)) {
        return {valid: false, message: '上楼单价最多保留两位小数'}
      }
    }

    // 验证分拣
    if (item.needSorting) {
      if (!item.sortingQuantity || item.sortingQuantity.trim() === '') {
        return {valid: false, message: '请输入分拣件数'}
      }
      const sortingQuantity = Number(item.sortingQuantity)
      if (Number.isNaN(sortingQuantity) || sortingQuantity <= 0 || !Number.isInteger(sortingQuantity)) {
        return {valid: false, message: '分拣件数必须是正整数'}
      }

      if (!item.sortingUnitPrice || item.sortingUnitPrice.trim() === '') {
        return {valid: false, message: '请输入分拣单价'}
      }
      const sortingUnitPrice = Number(item.sortingUnitPrice)
      if (Number.isNaN(sortingUnitPrice) || sortingUnitPrice < 0) {
        return {valid: false, message: '分拣单价必须是非负数'}
      }
      if (!/^\d+(\.\d{1,2})?$/.test(item.sortingUnitPrice)) {
        return {valid: false, message: '分拣单价最多保留两位小数'}
      }
    }

    return {valid: true, message: ''}
  }

  // 检查是否存在相同的记录（用于累计提示）
  const checkDuplicateRecord = async (): Promise<PieceWorkRecord | null> => {
    if (!user?.id || warehouses.length === 0 || categories.length === 0) return null

    const warehouse = warehouses[selectedWarehouseIndex]
    const category = categories[selectedCategoryIndex]

    // 查找今天同仓库同品类的记录
    const todayRecords = records.filter(
      (r) => r.work_date === workDate && r.warehouse_id === warehouse.id && r.category_id === category.id
    )

    return todayRecords.length > 0 ? todayRecords[0] : null
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!user?.id) {
      Taro.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 检测是否可以进行计件操作
    const checkResult = await canStartPieceWork(user.id)

    if (!checkResult.canStart) {
      // 如果不能计件，显示提示
      if (checkResult.checkResult.onLeave) {
        // 在请假中
        Taro.showToast({
          title: checkResult.reason || '您今天在休假中，无法进行计件操作',
          icon: 'none',
          duration: 2500
        })
        return
      } else if (checkResult.checkResult.needClockIn) {
        // 未打卡，显示打卡提醒弹窗
        Taro.showModal({
          title: '打卡提醒',
          content: '您今天尚未打卡，是否立即去打卡？',
          confirmText: '立即打卡',
          cancelText: '稍后再说',
          success: (res) => {
            if (res.confirm) {
              Taro.navigateTo({url: '/pages/driver/clock-in/index'})
            }
          }
        })
        return
      }
    }

    if (warehouses.length === 0) {
      Taro.showToast({
        title: '请先分配仓库',
        icon: 'none'
      })
      return
    }

    if (categories.length === 0) {
      Taro.showToast({
        title: '暂无可用品类',
        icon: 'none'
      })
      return
    }

    // 验证所有计件项
    for (let i = 0; i < pieceWorkItems.length; i++) {
      const item = pieceWorkItems[i]
      const {valid, message} = validateItem(item)
      if (!valid) {
        Taro.showToast({
          title: `第${i + 1}项：${message}`,
          icon: 'none',
          duration: 2000
        })
        return
      }
    }

    const _warehouse = warehouses[selectedWarehouseIndex]
    const _category = categories[selectedCategoryIndex]

    // 检查是否存在相同记录
    const existingRecord = await checkDuplicateRecord()

    if (existingRecord) {
      // 弹出累计确认对话框
      Taro.showModal({
        title: '检测到重复操作',
        content: '是否累计本次操作数量？',
        confirmText: '累计',
        cancelText: '新增',
        success: async (res) => {
          if (res.confirm) {
            // 累计到现有记录
            await submitWithAccumulate(existingRecord)
          } else if (res.cancel) {
            // 新增记录
            await submitAsNew()
          }
        }
      })
    } else {
      // 直接新增
      await submitAsNew()
    }
  }

  // 累计到现有记录
  const submitWithAccumulate = async (existingRecord: PieceWorkRecord) => {
    // 计算累计后的数据
    let totalQuantity = existingRecord.quantity
    let totalBaseAmount = existingRecord.quantity * existingRecord.unit_price
    let totalUpstairsAmount = existingRecord.need_upstairs ? existingRecord.quantity * existingRecord.upstairs_price : 0
    let totalSortingQuantity = existingRecord.sorting_quantity
    let totalSortingAmount = existingRecord.need_sorting
      ? existingRecord.sorting_quantity * existingRecord.sorting_unit_price
      : 0

    pieceWorkItems.forEach((item) => {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unitPrice)
      const upstairsPrice = Number(item.upstairsPrice) || 0
      const sortingQuantity = Number(item.sortingQuantity) || 0
      const sortingUnitPrice = Number(item.sortingUnitPrice) || 0

      totalQuantity += quantity
      totalBaseAmount += quantity * unitPrice
      if (item.needUpstairs) {
        totalUpstairsAmount += quantity * upstairsPrice
      }
      if (item.needSorting) {
        totalSortingQuantity += sortingQuantity
        totalSortingAmount += sortingQuantity * sortingUnitPrice
      }
    })

    const newTotalAmount = totalBaseAmount + totalUpstairsAmount + totalSortingAmount

    // 更新现有记录
    const success = await updatePieceWorkRecord(existingRecord.id, {
      user_id: existingRecord.user_id,
      warehouse_id: existingRecord.warehouse_id,
      work_date: existingRecord.work_date,
      category_id: existingRecord.category_id,
      quantity: totalQuantity,
      unit_price: totalBaseAmount / totalQuantity, // 平均单价
      need_upstairs: totalUpstairsAmount > 0,
      upstairs_price: totalUpstairsAmount > 0 ? totalUpstairsAmount / totalQuantity : 0,
      need_sorting: totalSortingAmount > 0,
      sorting_quantity: totalSortingQuantity,
      sorting_unit_price: totalSortingQuantity > 0 ? totalSortingAmount / totalSortingQuantity : 0,
      total_amount: newTotalAmount
    })

    if (success) {
      Taro.showToast({
        title: '累计成功',
        icon: 'success'
      })
      savePreferences()
      resetForm()
      loadData()
    } else {
      Taro.showToast({
        title: '累计失败',
        icon: 'error'
      })
    }
  }

  // 新增记录
  const submitAsNew = async () => {
    if (!user?.id) return

    const warehouse = warehouses[selectedWarehouseIndex]
    const category = categories[selectedCategoryIndex]

    let allSuccess = true

    for (const item of pieceWorkItems) {
      const {totalAmount} = calculateItemDetails(item)

      const input: PieceWorkRecordInput = {
        user_id: user.id,
        warehouse_id: warehouse.id,
        category_id: category.id,
        work_date: workDate,
        quantity: Number(item.quantity),
        unit_price: Number(item.unitPrice),
        need_upstairs: item.needUpstairs,
        upstairs_price: item.needUpstairs ? Number(item.upstairsPrice) : 0,
        need_sorting: item.needSorting,
        sorting_quantity: item.needSorting ? Number(item.sortingQuantity) : 0,
        sorting_unit_price: item.needSorting ? Number(item.sortingUnitPrice) : 0,
        total_amount: totalAmount
      }

      const success = await createPieceWorkRecord(input)
      if (!success) {
        allSuccess = false
        break
      }
    }

    if (allSuccess) {
      Taro.showToast({
        title: `成功录入${pieceWorkItems.length}条记录`,
        icon: 'success'
      })
      savePreferences()
      resetForm()
      loadData()
    } else {
      Taro.showToast({
        title: '部分记录录入失败',
        icon: 'error'
      })
    }
  }

  // 保存用户偏好
  const savePreferences = () => {
    const warehouse = warehouses[selectedWarehouseIndex]
    const category = categories[selectedCategoryIndex]

    saveLastWarehouse(warehouse.id, warehouse.name)
    saveLastCategory(category.id, category.category_name)
    saveLastWorkDate(workDate)
    savePieceWorkFormDefaults({
      warehouseId: warehouse.id,
      categoryId: category.id,
      needUpstairs: pieceWorkItems[0]?.needUpstairs || false
    })
  }

  // 重置表单
  const resetForm = () => {
    setPieceWorkItems([
      {
        id: Date.now().toString(),
        quantity: '',
        unitPrice: '',
        unitPriceLocked: false,
        needUpstairs: false,
        upstairsPrice: '',
        needSorting: false,
        sortingQuantity: '',
        sortingUnitPrice: ''
      }
    ])
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between mb-2">
              <Text className="text-white text-2xl font-bold">计件录入</Text>
              {driverProfile && (
                <View className="bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <Text className="text-white text-xs">
                    {driverProfile.driver_type === 'with_vehicle' ? '带车司机' : '纯司机'}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-blue-100 text-sm block">支持批量录入，一次提交多条记录</Text>
          </View>

          {/* 公共信息卡片 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-information text-xl text-blue-900 mr-2" />
              <Text className="text-lg font-bold text-gray-800">基本信息</Text>
            </View>

            {/* 仓库选择 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 block mb-2">
                <Text className="text-red-500">* </Text>仓库
              </Text>
              <Picker
                mode="selector"
                range={warehouses.map((w) => w.name)}
                value={selectedWarehouseIndex}
                onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
                <View className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                  <Text className="text-gray-800">{warehouses[selectedWarehouseIndex]?.name || '请选择仓库'}</Text>
                </View>
              </Picker>
            </View>

            {/* 品类选择 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 block mb-2">
                <Text className="text-red-500">* </Text>品类
              </Text>
              {categories.length === 1 ? (
                // 只有一个品类时，显示为只读
                <View className="border border-gray-300 rounded-lg p-3 bg-gray-100">
                  <Text className="text-gray-800">{categories[0]?.category_name || '暂无品类'}</Text>
                  <Text className="text-xs text-gray-500 mt-1">（该仓库仅此一个品类）</Text>
                </View>
              ) : categories.length > 1 ? (
                // 多个品类时，显示选择器
                <Picker
                  mode="selector"
                  range={categories.map((c) => c.category_name)}
                  value={selectedCategoryIndex}
                  onChange={(e) => setSelectedCategoryIndex(Number(e.detail.value))}>
                  <View className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                    <Text className="text-gray-800">
                      {categories[selectedCategoryIndex]?.category_name || '请选择品类'}
                    </Text>
                  </View>
                </Picker>
              ) : (
                // 没有品类时，显示提示
                <View className="border border-gray-300 rounded-lg p-3 bg-gray-100">
                  <Text className="text-gray-400">该仓库暂无可用品类</Text>
                </View>
              )}
            </View>

            {/* 工作日期 */}
            <View>
              <Text className="text-sm text-gray-600 block mb-2">
                <Text className="text-red-500">* </Text>工作日期
              </Text>
              <Picker mode="date" value={workDate} onChange={(e) => setWorkDate(e.detail.value)}>
                <View className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                  <Text className="text-gray-800">{workDate || '请选择日期'}</Text>
                </View>
              </Picker>
            </View>
          </View>

          {/* 计件项列表 */}
          {pieceWorkItems.map((item, index) => {
            const details = calculateItemDetails(item)
            return (
              <View key={item.id} className="bg-white rounded-xl p-4 mb-4 shadow-md">
                <View className="flex items-center justify-between mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-clipboard-text text-xl text-orange-600 mr-2" />
                    <Text className="text-lg font-bold text-gray-800">计件项 {index + 1}</Text>
                  </View>
                  {pieceWorkItems.length > 1 && (
                    <View
                      className="i-mdi-delete text-xl text-red-500 active:scale-95 transition-all"
                      onClick={() => handleRemoveItem(item.id)}
                    />
                  )}
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
                    value={item.quantity}
                    onInput={(e) => updateItem(item.id, 'quantity', e.detail.value)}
                  />
                </View>

                {/* 单价 */}
                <View className="mb-4">
                  <Text className="text-sm text-gray-600 block mb-2">
                    <Text className="text-red-500">* </Text>单价（元/件，最多两位小数）
                    {item.unitPriceLocked && (
                      <Text className="text-blue-600 text-xs ml-2">（管理员已设置，不可修改）</Text>
                    )}
                  </Text>
                  <Input
                    type="digit"
                    className={`border rounded-lg p-3 ${item.unitPriceLocked ? 'bg-gray-200 text-gray-600' : 'border-gray-300 bg-gray-50'}`}
                    placeholder={item.unitPriceLocked ? '管理员已设置价格' : '请输入单价'}
                    value={item.unitPrice}
                    disabled={item.unitPriceLocked}
                    onInput={(e) => {
                      if (!item.unitPriceLocked) {
                        updateItem(item.id, 'unitPrice', e.detail.value)
                      }
                    }}
                  />
                </View>

                {/* 是否需要上楼 */}
                <View className="mb-4">
                  <View className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <Text className="text-sm text-gray-700">是否需要上楼</Text>
                    <Switch
                      checked={item.needUpstairs}
                      onChange={(e) => updateItem(item.id, 'needUpstairs', e.detail.value)}
                    />
                  </View>
                </View>

                {/* 上楼单价 */}
                {item.needUpstairs && (
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 block mb-2">
                      <Text className="text-red-500">* </Text>上楼单价（元/件，最多两位小数）
                    </Text>
                    <Input
                      type="digit"
                      className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                      placeholder="请输入上楼单价"
                      value={item.upstairsPrice}
                      onInput={(e) => updateItem(item.id, 'upstairsPrice', e.detail.value)}
                    />
                  </View>
                )}

                {/* 是否需要分拣 */}
                <View className="mb-4">
                  <View className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <Text className="text-sm text-gray-700">是否需要分拣</Text>
                    <Switch
                      checked={item.needSorting}
                      onChange={(e) => updateItem(item.id, 'needSorting', e.detail.value)}
                    />
                  </View>
                </View>

                {/* 分拣件数和单价 */}
                {item.needSorting && (
                  <>
                    <View className="mb-4">
                      <Text className="text-sm text-gray-600 block mb-2">
                        <Text className="text-red-500">* </Text>分拣件数（正整数）
                      </Text>
                      <Input
                        type="number"
                        className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                        placeholder="请输入分拣件数"
                        value={item.sortingQuantity}
                        onInput={(e) => updateItem(item.id, 'sortingQuantity', e.detail.value)}
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
                        value={item.sortingUnitPrice}
                        onInput={(e) => updateItem(item.id, 'sortingUnitPrice', e.detail.value)}
                      />
                    </View>
                  </>
                )}

                {/* 金额明细 */}
                <View className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                  <Text className="text-sm font-bold text-gray-700 block mb-3">金额明细</Text>
                  <View className="space-y-2">
                    <View className="flex justify-between">
                      <Text className="text-sm text-gray-600">基础金额：</Text>
                      <Text className="text-sm font-medium text-gray-800">¥{details.baseAmount.toFixed(2)}</Text>
                    </View>
                    {item.needUpstairs && (
                      <View className="flex justify-between">
                        <Text className="text-sm text-gray-600">上楼金额：</Text>
                        <Text className="text-sm font-medium text-blue-600">¥{details.upstairsAmount.toFixed(2)}</Text>
                      </View>
                    )}
                    {item.needSorting && (
                      <View className="flex justify-between">
                        <Text className="text-sm text-gray-600">分拣金额：</Text>
                        <Text className="text-sm font-medium text-purple-600">¥{details.sortingAmount.toFixed(2)}</Text>
                      </View>
                    )}
                    <View className="border-t border-green-200 pt-2 mt-2">
                      <View className="flex justify-between">
                        <Text className="text-base font-bold text-gray-800">小计：</Text>
                        <Text className="text-base font-bold text-green-600">¥{details.totalAmount.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )
          })}

          {/* 添加计件项按钮 */}
          <View className="mb-4">
            <Button
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-md active:scale-98 transition-all"
              onClick={handleAddItem}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-plus-circle text-xl mr-2" />
                <Text className="text-base font-medium">添加计件项</Text>
              </View>
            </Button>
          </View>

          {/* 总金额卡片 */}
          <View className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between">
              <View>
                <Text className="text-green-100 text-sm block mb-1">总金额</Text>
                <Text className="text-white text-3xl font-bold">¥{calculateTotalAmount().toFixed(2)}</Text>
              </View>
              <View className="i-mdi-cash-multiple text-5xl text-white opacity-50" />
            </View>
          </View>

          {/* 提交按钮 */}
          <View className="mb-4">
            <Button
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg active:scale-98 transition-all"
              onClick={handleSubmit}>
              <Text className="text-lg font-bold">提交录入</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default PieceWorkEntry
