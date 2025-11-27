import {Button, Input, Picker, ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {showLoading, showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  addManagerWarehouse,
  createAttendanceRule,
  getAllCategories,
  getAllUsers,
  getAllWarehouses,
  getAttendanceRuleByWarehouseId,
  getCategoryPricesByWarehouse,
  getWarehouseById,
  getWarehouseManagers,
  removeManagerWarehouse,
  updateAttendanceRule,
  updateWarehouse,
  upsertCategoryPrice
} from '@/db/api'
import type {AttendanceRule, PieceWorkCategory, Profile, Warehouse} from '@/db/types'
import {CACHE_KEYS, onDataUpdated} from '@/utils/cache'

const WarehouseEdit: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [_warehouse, setWarehouse] = useState<Warehouse | null>(null)

  // 基本信息
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [maxLeaveDays, setMaxLeaveDays] = useState('7')
  const [resignationNoticeDays, setResignationNoticeDays] = useState('30')
  const [dailyTarget, setDailyTarget] = useState('')

  // 品类和价格
  const [allCategories, setAllCategories] = useState<PieceWorkCategory[]>([])
  const [categoryDriverPrices, setCategoryDriverPrices] = useState<Map<string, string>>(new Map())
  const [categoryVehiclePrices, setCategoryVehiclePrices] = useState<Map<string, string>>(new Map())
  const [categorySortingPrices, setCategorySortingPrices] = useState<Map<string, string>>(new Map())
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())

  // 管理员
  const [allManagers, setAllManagers] = useState<Profile[]>([])
  const [selectedManagers, setSelectedManagers] = useState<Set<string>>(new Set())
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)

  // 考勤规则
  const [currentRule, setCurrentRule] = useState<AttendanceRule | null>(null)
  const [ruleStartTime, setRuleStartTime] = useState('09:00')
  const [ruleEndTime, setRuleEndTime] = useState('18:00')
  const [ruleLateThreshold, setRuleLateThreshold] = useState('15')
  const [ruleEarlyThreshold, setRuleEarlyThreshold] = useState('15')
  const [ruleRequireClockOut, setRuleRequireClockOut] = useState(true)
  const [ruleActive, setRuleActive] = useState(true)

  // 其他仓库（用于复制配置）
  const [allWarehouses, setAllWarehouses] = useState<Warehouse[]>([])
  const [_showCopyDialog, _setShowCopyDialog] = useState(false)

  // 新建品类
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDriverPrice, setNewCategoryDriverPrice] = useState('')
  const [newCategoryVehiclePrice, setNewCategoryVehiclePrice] = useState('')
  const [newCategorySortingPrice, setNewCategorySortingPrice] = useState('')

  // 导入其他仓库品类
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedWarehouseForImport, setSelectedWarehouseForImport] = useState<string>('')

  // 加载仓库信息
  const loadWarehouse = useCallback(async (id: string) => {
    showLoading({title: '加载中...'})
    try {
      const warehouseData = await getWarehouseById(id)
      console.log('加载的仓库数据:', warehouseData)
      if (warehouseData) {
        setWarehouse(warehouseData)
        setName(warehouseData.name)
        setIsActive(warehouseData.is_active)
        setMaxLeaveDays(String(warehouseData.max_leave_days || 7))
        setResignationNoticeDays(String(warehouseData.resignation_notice_days || 30))
        setDailyTarget(warehouseData.daily_target ? String(warehouseData.daily_target) : '')
        console.log('设置的状态:', {
          name: warehouseData.name,
          isActive: warehouseData.is_active,
          maxLeaveDays: warehouseData.max_leave_days,
          resignationNoticeDays: warehouseData.resignation_notice_days,
          dailyTarget: warehouseData.daily_target
        })
      }
    } catch (error) {
      console.error('加载仓库信息失败:', error)
      showToast({title: '加载失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [])

  // 加载品类和价格
  const loadCategoriesAndPrices = useCallback(async (id: string) => {
    try {
      // 加载所有品类
      const categories = await getAllCategories()
      console.log('所有品类:', categories)
      setAllCategories(categories)

      // 加载该仓库的品类价格
      const prices = await getCategoryPricesByWarehouse(id)
      console.log('仓库品类价格:', prices)
      const driverPriceMap = new Map<string, string>()
      const vehiclePriceMap = new Map<string, string>()
      const sortingPriceMap = new Map<string, string>()
      const selectedSet = new Set<string>()

      for (const price of prices) {
        driverPriceMap.set(price.category_name, String(price.unit_price))
        vehiclePriceMap.set(price.category_name, String(price.upstairs_price))
        sortingPriceMap.set(price.category_name, String(price.sorting_unit_price))
        selectedSet.add(price.category_name)
      }

      console.log('已选择的品类:', Array.from(selectedSet))
      console.log('单价:', Array.from(driverPriceMap.entries()))
      console.log('上楼价格:', Array.from(vehiclePriceMap.entries()))
      console.log('分拣单价:', Array.from(sortingPriceMap.entries()))

      setCategoryDriverPrices(driverPriceMap)
      setCategoryVehiclePrices(vehiclePriceMap)
      setCategorySortingPrices(sortingPriceMap)
      setSelectedCategories(selectedSet)
    } catch (error) {
      console.error('加载品类信息失败:', error)
    }
  }, [])

  // 加载管理员
  const loadManagers = useCallback(
    async (id?: string) => {
      try {
        // 加载所有车队长和老板
        const allUsers = await getAllUsers()
        const managers = allUsers.filter((u) => u.role === 'manager' || u.role === 'super_admin')
        console.log('加载到的车队长列表:', managers)
        setAllManagers(managers)

        // 加载当前用户信息
        const current = managers.find((m) => m.id === user?.id)
        if (current) {
          setCurrentUser(current)
        }

        // 如果有仓库ID，加载该仓库的管理员
        if (id) {
          const warehouseManagers = await getWarehouseManagers(id)
          console.log('仓库已分配的管理员:', warehouseManagers)
          const managerSet = new Set<string>()
          for (const manager of warehouseManagers) {
            managerSet.add(manager.id)
          }
          setSelectedManagers(managerSet)
        }
      } catch (error) {
        console.error('加载管理员信息失败:', error)
      }
    },
    [user?.id]
  )

  // 加载考勤规则
  const loadAttendanceRule = useCallback(async (id: string) => {
    try {
      const rule = await getAttendanceRuleByWarehouseId(id)
      console.log('加载的考勤规则:', rule)
      if (rule) {
        setCurrentRule(rule)
        setRuleStartTime(rule.work_start_time)
        setRuleEndTime(rule.work_end_time)
        setRuleLateThreshold(String(rule.late_threshold))
        setRuleEarlyThreshold(String(rule.early_threshold))
        setRuleRequireClockOut(rule.require_clock_out ?? true)
        setRuleActive(rule.is_active)
        console.log('设置的考勤规则状态:', {
          startTime: rule.work_start_time,
          endTime: rule.work_end_time,
          lateThreshold: rule.late_threshold,
          earlyThreshold: rule.early_threshold,
          requireClockOut: rule.require_clock_out,
          isActive: rule.is_active
        })
      }
    } catch (error) {
      console.error('加载考勤规则失败:', error)
    }
  }, [])

  // 加载所有仓库（用于复制配置）
  const loadAllWarehouses = useCallback(async () => {
    try {
      const warehouses = await getAllWarehouses()
      console.log('所有仓库列表:', warehouses)
      console.log('当前仓库ID:', warehouseId)
      // 排除当前仓库
      const others = warehouses.filter((w) => w.id !== warehouseId)
      console.log('过滤后的仓库列表:', others)
      setAllWarehouses(others)
    } catch (error) {
      console.error('加载仓库列表失败:', error)
    }
  }, [warehouseId])

  // 页面加载时获取仓库 ID
  useEffect(() => {
    const instance = Taro.getCurrentInstance()
    const id = instance.router?.params?.id
    console.log('获取到的仓库ID:', id)
    if (id) {
      setWarehouseId(id)
    } else {
      showToast({title: '缺少仓库ID', icon: 'error'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    }
  }, [])

  // 当 warehouseId 变化时加载数据
  useEffect(() => {
    if (warehouseId) {
      console.log('开始加载仓库数据，ID:', warehouseId)
      loadWarehouse(warehouseId)
      loadCategoriesAndPrices(warehouseId)
      loadAttendanceRule(warehouseId)
      loadManagers(warehouseId)
      loadAllWarehouses()
    }
  }, [warehouseId, loadWarehouse, loadCategoriesAndPrices, loadAttendanceRule, loadManagers, loadAllWarehouses])

  // 页面显示时刷新数据
  useDidShow(() => {
    if (warehouseId) {
      console.log('页面显示，刷新数据')
      loadWarehouse(warehouseId)
      loadCategoriesAndPrices(warehouseId)
      loadAttendanceRule(warehouseId)
      loadManagers(warehouseId)
    }
  })

  // 切换品类选择
  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
      // 删除价格
      const newDriverPrices = new Map(categoryDriverPrices)
      const newVehiclePrices = new Map(categoryVehiclePrices)
      const newSortingPrices = new Map(categorySortingPrices)
      newDriverPrices.delete(categoryId)
      newVehiclePrices.delete(categoryId)
      newSortingPrices.delete(categoryId)
      setCategoryDriverPrices(newDriverPrices)
      setCategoryVehiclePrices(newVehiclePrices)
      setCategorySortingPrices(newSortingPrices)
    } else {
      newSelected.add(categoryId)
      // 设置默认价格
      const newDriverPrices = new Map(categoryDriverPrices)
      const newVehiclePrices = new Map(categoryVehiclePrices)
      const newSortingPrices = new Map(categorySortingPrices)
      newDriverPrices.set(categoryId, '0')
      newVehiclePrices.set(categoryId, '0')
      newSortingPrices.set(categoryId, '0')
      setCategoryDriverPrices(newDriverPrices)
      setCategoryVehiclePrices(newVehiclePrices)
      setCategorySortingPrices(newSortingPrices)
    }
    setSelectedCategories(newSelected)
  }

  // 更新单价
  const updateDriverPrice = (categoryId: string, price: string) => {
    const newPrices = new Map(categoryDriverPrices)
    newPrices.set(categoryId, price)
    setCategoryDriverPrices(newPrices)
  }

  // 更新上楼价格
  const updateVehiclePrice = (categoryId: string, price: string) => {
    const newPrices = new Map(categoryVehiclePrices)
    newPrices.set(categoryId, price)
    setCategoryVehiclePrices(newPrices)
  }

  // 更新分拣单价
  const updateSortingPrice = (categoryId: string, price: string) => {
    const newPrices = new Map(categorySortingPrices)
    newPrices.set(categoryId, price)
    setCategorySortingPrices(newPrices)
  }

  // 切换管理员选择
  const toggleManager = (managerId: string) => {
    const newSelected = new Set(selectedManagers)
    if (newSelected.has(managerId)) {
      newSelected.delete(managerId)
    } else {
      newSelected.add(managerId)
    }
    setSelectedManagers(newSelected)
  }

  // 快速选择自己为管理员
  const selectSelfAsManager = () => {
    if (currentUser) {
      const newSelected = new Set(selectedManagers)
      newSelected.add(currentUser.id)
      setSelectedManagers(newSelected)
      showToast({title: '已添加自己为管理员', icon: 'success'})
    }
  }

  // 从其他仓库复制配置
  const _handleCopyFromWarehouse = async () => {
    if (allWarehouses.length === 0) {
      showToast({title: '暂无其他仓库', icon: 'none'})
      return
    }

    const _warehouseNames = allWarehouses.map((w) => w.name)
    const res = await showModal({
      title: '选择仓库',
      content: '请选择要复制配置的仓库',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消'
    })

    if (res.confirm && allWarehouses.length > 0) {
      // 这里简化处理，复制第一个仓库的配置
      // 实际应该让用户选择
      const sourceWarehouse = allWarehouses[0]
      await copyWarehouseConfig(sourceWarehouse.id)
    }
  }

  // 复制仓库配置
  const copyWarehouseConfig = async (sourceWarehouseId: string) => {
    showLoading({title: '复制中...'})
    try {
      // 复制品类价格
      const prices = await getCategoryPricesByWarehouse(sourceWarehouseId)
      const driverPriceMap = new Map<string, string>()
      const vehiclePriceMap = new Map<string, string>()
      const sortingPriceMap = new Map<string, string>()
      const selectedSet = new Set<string>()

      for (const price of prices) {
        driverPriceMap.set(price.category_name, String(price.unit_price))
        vehiclePriceMap.set(price.category_name, String(price.upstairs_price))
        sortingPriceMap.set(price.category_name, String(price.sorting_unit_price))
        selectedSet.add(price.category_name)
      }

      setCategoryDriverPrices(driverPriceMap)
      setCategoryVehiclePrices(vehiclePriceMap)
      setCategorySortingPrices(sortingPriceMap)
      setSelectedCategories(selectedSet)

      // 复制考勤规则
      const rule = await getAttendanceRuleByWarehouseId(sourceWarehouseId)
      if (rule) {
        setRuleStartTime(rule.work_start_time)
        setRuleEndTime(rule.work_end_time)
        setRuleLateThreshold(String(rule.late_threshold))
        setRuleEarlyThreshold(String(rule.early_threshold))
        setRuleRequireClockOut(rule.require_clock_out ?? true)
        setRuleActive(rule.is_active)
      }

      showToast({title: '配置已复制', icon: 'success'})
    } catch (error) {
      console.error('复制配置失败:', error)
      showToast({title: '复制失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }

  // 打开新建品类对话框
  const openNewCategoryDialog = () => {
    setNewCategoryName('')
    setNewCategoryDriverPrice('')
    setNewCategoryVehiclePrice('')
    setNewCategorySortingPrice('')
    setShowNewCategoryDialog(true)
  }

  // 创建新品类
  const handleCreateCategory = async () => {
    // 验证必填项
    if (!newCategoryName.trim()) {
      showToast({title: '请输入品类名称', icon: 'error'})
      return
    }

    showLoading({title: '创建中...'})
    try {
      // 直接创建品类价格记录
      const priceInput = {
        warehouse_id: warehouseId,
        category_name: newCategoryName.trim(),
        unit_price: Number(newCategoryDriverPrice || 0),
        upstairs_price: Number(newCategoryVehiclePrice || 0),
        sorting_unit_price: Number(newCategorySortingPrice || 0),
        driver_only_price: 0,
        driver_with_vehicle_price: 0,
        is_active: true
      }

      const success = await upsertCategoryPrice(priceInput)

      if (success) {
        // 刷新品类列表
        await loadCategoriesAndPrices(warehouseId)

        // 自动选中新品类并设置价格
        const newSelected = new Set(selectedCategories)
        newSelected.add(newCategoryName.trim())
        setSelectedCategories(newSelected)

        const newDriverPrices = new Map(categoryDriverPrices)
        newDriverPrices.set(newCategoryName.trim(), newCategoryDriverPrice || '0')
        setCategoryDriverPrices(newDriverPrices)

        const newVehiclePrices = new Map(categoryVehiclePrices)
        newVehiclePrices.set(newCategoryName.trim(), newCategoryVehiclePrice || '0')
        setCategoryVehiclePrices(newVehiclePrices)

        const newSortingPrices = new Map(categorySortingPrices)
        newSortingPrices.set(newCategoryName.trim(), newCategorySortingPrice || '0')
        setCategorySortingPrices(newSortingPrices)

        showToast({title: '品类创建成功', icon: 'success'})
        setShowNewCategoryDialog(false)

        // 清除缓存
        onDataUpdated([CACHE_KEYS.WAREHOUSE_CATEGORIES])
      } else {
        showToast({title: '创建失败', icon: 'error'})
      }
    } catch (error) {
      console.error('创建品类失败:', error)
      showToast({title: '创建失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }

  // 打开导入品类对话框
  const openImportDialog = async () => {
    console.log('打开导入对话框，当前仓库ID:', warehouseId)

    try {
      // 重新加载仓库列表以确保数据最新
      const warehouses = await getAllWarehouses()
      console.log('所有仓库:', warehouses)

      // 排除当前仓库
      const others = warehouses.filter((w) => w.id !== warehouseId)
      console.log('可选择的其他仓库:', others)

      setAllWarehouses(others)

      if (others.length === 0) {
        showToast({title: '暂无其他仓库', icon: 'none'})
        return
      }

      setSelectedWarehouseForImport('')
      setShowImportDialog(true)
    } catch (error) {
      console.error('加载仓库列表失败:', error)
      showToast({title: '加载仓库列表失败', icon: 'error'})
    }
  }

  // 导入其他仓库的品类配置
  const handleImportCategories = async () => {
    if (!selectedWarehouseForImport) {
      showToast({title: '请选择仓库', icon: 'error'})
      return
    }

    showLoading({title: '导入中...'})
    try {
      // 获取选中仓库的品类价格
      const prices = await getCategoryPricesByWarehouse(selectedWarehouseForImport)

      console.log('导入品类数据:', prices)

      if (prices.length === 0) {
        showToast({title: '该仓库暂无品类配置', icon: 'none'})
        Taro.hideLoading()
        return
      }

      // 合并到当前配置
      const newDriverPrices = new Map(categoryDriverPrices)
      const newVehiclePrices = new Map(categoryVehiclePrices)
      const newSelected = new Set(selectedCategories)

      for (const price of prices) {
        newDriverPrices.set(price.category_name, String(price.unit_price))
        newVehiclePrices.set(price.category_name, String(price.upstairs_price))
        newSelected.add(price.category_name)
      }

      setCategoryDriverPrices(newDriverPrices)
      setCategoryVehiclePrices(newVehiclePrices)
      setSelectedCategories(newSelected)

      // 重新加载品类列表以确保所有品类都能显示
      const categories = await getAllCategories()
      setAllCategories(categories)

      showToast({title: `成功导入 ${prices.length} 个品类`, icon: 'success'})
      setShowImportDialog(false)
    } catch (error) {
      console.error('导入品类失败:', error)
      showToast({title: `导入失败: ${error}`, icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }

  // 保存仓库信息
  const handleSave = async () => {
    // 验证必填项
    if (!name.trim()) {
      showToast({title: '请输入仓库名称', icon: 'error'})
      return
    }

    if (selectedManagers.size === 0) {
      showToast({title: '请至少选择一个管理员', icon: 'error'})
      return
    }

    // 验证每日指标（如果填写了）
    if (dailyTarget.trim() !== '') {
      const targetNum = Number(dailyTarget)
      if (Number.isNaN(targetNum) || targetNum < 0) {
        showToast({title: '每日指标必须是非负整数', icon: 'error'})
        return
      }
    }

    // 验证品类价格
    for (const categoryId of selectedCategories) {
      const driverPrice = categoryDriverPrices.get(categoryId)
      const vehiclePrice = categoryVehiclePrices.get(categoryId)
      const category = allCategories.find((c) => c.id === categoryId)

      if (!driverPrice || Number.isNaN(Number(driverPrice)) || Number(driverPrice) < 0) {
        showToast({title: `请为品类"${category?.category_name}"设置有效的纯司机单价`, icon: 'error'})
        return
      }

      if (!vehiclePrice || Number.isNaN(Number(vehiclePrice)) || Number(vehiclePrice) < 0) {
        showToast({title: `请为品类"${category?.category_name}"设置有效的带车司机单价`, icon: 'error'})
        return
      }
    }

    showLoading({title: '保存中...'})
    try {
      // 1. 更新仓库基本信息
      const success = await updateWarehouse(warehouseId, {
        name: name.trim(),
        is_active: isActive,
        max_leave_days: Number(maxLeaveDays),
        resignation_notice_days: Number(resignationNoticeDays),
        daily_target: dailyTarget.trim() !== '' ? Number(dailyTarget) : null
      })

      if (!success) {
        throw new Error('更新仓库信息失败')
      }

      // 2. 更新品类价格
      for (const categoryName of selectedCategories) {
        const priceInput = {
          warehouse_id: warehouseId,
          category_name: categoryName,
          unit_price: Number(categoryDriverPrices.get(categoryName) || 0),
          upstairs_price: Number(categoryVehiclePrices.get(categoryName) || 0),
          sorting_unit_price: Number(categorySortingPrices.get(categoryName) || 0),
          driver_only_price: 0,
          driver_with_vehicle_price: 0,
          is_active: true
        }

        const priceSuccess = await upsertCategoryPrice(priceInput)
        if (!priceSuccess) {
          console.warn(`更新品类 ${categoryName} 价格失败`)
        }
      }

      // 3. 更新管理员
      // 获取原有管理员
      const oldManagers = await getWarehouseManagers(warehouseId)
      const oldManagerIds = new Set(oldManagers.map((m) => m.id))

      // 找出需要添加和删除的管理员
      const toAdd = Array.from(selectedManagers).filter((id) => !oldManagerIds.has(id))
      const toRemove = Array.from(oldManagerIds).filter((id) => !selectedManagers.has(id))

      // 添加新管理员
      for (const managerId of toAdd) {
        await addManagerWarehouse(managerId, warehouseId)
      }

      // 删除旧管理员
      for (const managerId of toRemove) {
        await removeManagerWarehouse(managerId, warehouseId)
      }

      // 4. 更新考勤规则
      const ruleInput = {
        warehouse_id: warehouseId,
        work_start_time: ruleStartTime,
        work_end_time: ruleEndTime,
        late_threshold: Number(ruleLateThreshold),
        early_threshold: Number(ruleEarlyThreshold),
        require_clock_out: ruleRequireClockOut,
        is_active: ruleActive
      }

      if (currentRule) {
        // 更新现有规则
        const ruleSuccess = await updateAttendanceRule(currentRule.id, ruleInput)
        if (!ruleSuccess) {
          console.warn('更新考勤规则失败')
        }
      } else {
        // 创建新规则
        const newRule = await createAttendanceRule(ruleInput)
        if (newRule) {
          setCurrentRule(newRule)
        } else {
          console.warn('创建考勤规则失败')
        }
      }

      // 清除缓存
      onDataUpdated([
        CACHE_KEYS.ALL_WAREHOUSES,
        CACHE_KEYS.WAREHOUSE_CATEGORIES,
        CACHE_KEYS.WAREHOUSE_ASSIGNMENTS,
        CACHE_KEYS.MANAGER_WAREHOUSES,
        CACHE_KEYS.DASHBOARD_DATA
      ])

      showToast({title: '保存成功', icon: 'success'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('保存失败:', error)
      showToast({title: '保存失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }

  return (
    <View className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4 pb-24">
          {/* 说明卡片 */}
          <View className="bg-blue-50 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
            <View className="flex items-start mb-2">
              <View className="i-mdi-information text-2xl text-blue-600 mr-2 flex-shrink-0" />
              <Text className="text-blue-900 font-bold text-base">设置说明</Text>
            </View>
            <View className="ml-8">
              <View className="mb-2">
                <Text className="text-blue-800 text-sm">
                  1. <Text className="font-bold">品类设置</Text>
                  ：为仓库配置可用的计件品类和单价，司机才能在该仓库提交计件工作报告
                </Text>
              </View>
              <View className="mb-2">
                <Text className="text-blue-800 text-sm">
                  2. <Text className="font-bold">管理员设置</Text>
                  ：必须为仓库指定至少一个管理员，管理员可以审批该仓库的请假申请和计件报告
                </Text>
              </View>
              <View>
                <Text className="text-blue-800 text-sm">
                  3. <Text className="font-bold">老板</Text>：您可以将自己设置为车队长，这样就能直接管理该仓库
                </Text>
              </View>
            </View>
          </View>

          {/* 基本信息 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">基本信息</Text>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm mb-2">
                仓库名称 <Text className="text-red-500">*</Text>
              </Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                  placeholder="请输入仓库名称"
                  value={name}
                  onInput={(e) => setName(e.detail.value)}
                />
              </View>
            </View>

            <View className="mb-4">
              <View className="flex items-center justify-between">
                <Text className="text-gray-700 text-sm">仓库状态</Text>
                <View className="flex items-center">
                  <Text className="text-gray-600 text-sm mr-2">{isActive ? '启用' : '停用'}</Text>
                  <Switch checked={isActive} onChange={(e) => setIsActive(e.detail.value)} />
                </View>
              </View>
              <Text className="text-gray-500 text-xs mt-1">停用后，司机将无法在该仓库打卡和提交计件</Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm mb-2">最大请假天数</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                  type="number"
                  placeholder="请输入最大请假天数"
                  value={maxLeaveDays}
                  onInput={(e) => setMaxLeaveDays(e.detail.value)}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-1">司机单次请假不能超过此天数</Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm mb-2">离职提前通知天数</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                  type="number"
                  placeholder="请输入离职提前通知天数"
                  value={resignationNoticeDays}
                  onInput={(e) => setResignationNoticeDays(e.detail.value)}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-1">司机离职需要提前通知的天数</Text>
            </View>

            <View>
              <Text className="text-gray-700 text-sm mb-2">每日指标数（选填）</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                  type="number"
                  placeholder="请输入每日指标数（件）"
                  value={dailyTarget}
                  onInput={(e) => setDailyTarget(e.detail.value)}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-1">司机每天需要完成的件数目标，不填则不进行目标考核</Text>
            </View>
          </View>

          {/* 考勤规则 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">考勤规则</Text>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm mb-2">上班时间</Text>
              <Picker mode="time" value={ruleStartTime} onChange={(e) => setRuleStartTime(e.detail.value)}>
                <View className="bg-gray-50 px-3 py-2 rounded border border-gray-200">
                  <Text className="text-gray-900">{ruleStartTime}</Text>
                </View>
              </Picker>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm mb-2">下班时间</Text>
              <Picker mode="time" value={ruleEndTime} onChange={(e) => setRuleEndTime(e.detail.value)}>
                <View className="bg-gray-50 px-3 py-2 rounded border border-gray-200">
                  <Text className="text-gray-900">{ruleEndTime}</Text>
                </View>
              </Picker>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm mb-2">迟到阈值（分钟）</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                  type="number"
                  placeholder="请输入迟到阈值"
                  value={ruleLateThreshold}
                  onInput={(e) => setRuleLateThreshold(e.detail.value)}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-1">超过上班时间多少分钟算迟到</Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm mb-2">早退阈值（分钟）</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                  type="number"
                  placeholder="请输入早退阈值"
                  value={ruleEarlyThreshold}
                  onInput={(e) => setRuleEarlyThreshold(e.detail.value)}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-1">提前下班时间多少分钟算早退</Text>
            </View>

            <View className="mb-4">
              <View className="flex items-center justify-between">
                <Text className="text-gray-700 text-sm">是否需要打下班卡</Text>
                <View className="flex items-center">
                  <Text className="text-gray-600 text-sm mr-2">{ruleRequireClockOut ? '需要' : '不需要'}</Text>
                  <Switch checked={ruleRequireClockOut} onChange={(e) => setRuleRequireClockOut(e.detail.value)} />
                </View>
              </View>
              <Text className="text-gray-500 text-xs mt-1">关闭后，司机只需打上班卡</Text>
            </View>

            <View>
              <View className="flex items-center justify-between">
                <Text className="text-gray-700 text-sm">规则状态</Text>
                <View className="flex items-center">
                  <Text className="text-gray-600 text-sm mr-2">{ruleActive ? '启用' : '停用'}</Text>
                  <Switch checked={ruleActive} onChange={(e) => setRuleActive(e.detail.value)} />
                </View>
              </View>
            </View>
          </View>

          {/* 品类设置 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <View className="flex items-center justify-between mb-4">
              <Text className="text-gray-800 font-bold text-lg">品类设置</Text>
              <View className="flex items-center gap-2">
                <Text className="text-gray-500 text-sm mr-2">已选择 {selectedCategories.size} 个品类</Text>
                <Button
                  size="mini"
                  className="bg-green-500 text-white text-xs break-keep mr-2"
                  onClick={openImportDialog}>
                  导入品类
                </Button>
                <Button
                  size="mini"
                  className="bg-blue-500 text-white text-xs break-keep"
                  onClick={openNewCategoryDialog}>
                  新建品类
                </Button>
              </View>
            </View>

            {/* 快捷操作提示 */}
            {allWarehouses.length > 0 && (
              <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <View className="flex items-start">
                  <View className="i-mdi-lightbulb-on text-xl text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-blue-900 font-medium text-sm">快捷提示</Text>
                    <Text className="text-blue-700 text-xs mt-1">
                      可以点击"导入品类"从其他仓库快速导入品类配置，或点击"新建品类"直接创建新品类
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {allCategories.length === 0 ? (
              <View className="text-center py-8">
                <View className="i-mdi-package-variant text-5xl text-gray-300 mx-auto mb-2" />
                <Text className="text-gray-400 text-sm">暂无品类</Text>
                <Text className="text-gray-400 text-xs mt-1">点击上方按钮新建品类或从其他仓库导入</Text>
              </View>
            ) : (
              <View>
                {allCategories.map((category) => {
                  const isSelected = selectedCategories.has(category.category_name)
                  const driverPrice = categoryDriverPrices.get(category.category_name) || '0'
                  const vehiclePrice = categoryVehiclePrices.get(category.category_name) || '0'
                  const sortingPrice = categorySortingPrices.get(category.category_name) || '0'

                  return (
                    <View
                      key={category.id}
                      className={`border rounded-lg p-3 mb-3 ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                      <View className="flex items-center justify-between mb-2">
                        <View className="flex items-center flex-1">
                          <View
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-2 ${
                              isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                            }`}
                            onClick={() => toggleCategory(category.category_name)}>
                            {isSelected && <View className="i-mdi-check text-white text-sm" />}
                          </View>
                          <Text className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                            {category.category_name}
                          </Text>
                        </View>
                        <Text className={`text-xs ${category.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {category.is_active ? '启用中' : '已停用'}
                        </Text>
                      </View>

                      {isSelected && (
                        <View className="ml-7 space-y-2">
                          <View>
                            <Text className="text-gray-600 text-xs mb-1">单价（元/件）</Text>
                            <View style={{overflow: 'hidden'}}>
                              <Input
                                className="bg-white px-2 py-1 rounded border border-blue-300 w-full text-sm"
                                type="digit"
                                placeholder="请输入单价"
                                value={driverPrice}
                                onInput={(e) => updateDriverPrice(category.category_name, e.detail.value)}
                              />
                            </View>
                          </View>
                          <View className="mt-2">
                            <Text className="text-gray-600 text-xs mb-1">上楼价格（元/件）</Text>
                            <View style={{overflow: 'hidden'}}>
                              <Input
                                className="bg-white px-2 py-1 rounded border border-blue-300 w-full text-sm"
                                type="digit"
                                placeholder="请输入上楼价格"
                                value={vehiclePrice}
                                onInput={(e) => updateVehiclePrice(category.category_name, e.detail.value)}
                              />
                            </View>
                          </View>
                          <View className="mt-2">
                            <Text className="text-gray-600 text-xs mb-1">分拣单价（元/件）</Text>
                            <View style={{overflow: 'hidden'}}>
                              <Input
                                className="bg-white px-2 py-1 rounded border border-blue-300 w-full text-sm"
                                type="digit"
                                placeholder="请输入分拣单价"
                                value={sortingPrice}
                                onInput={(e) => updateSortingPrice(category.category_name, e.detail.value)}
                              />
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            )}
          </View>

          {/* 管理员设置 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <View className="flex items-center justify-between mb-4">
              <Text className="text-gray-800 font-bold text-lg">
                管理员设置 <Text className="text-red-500 text-sm">*</Text>
              </Text>
              <Text className="text-gray-500 text-sm">已选择 {selectedManagers.size} 个管理员</Text>
            </View>

            {/* 快速添加自己 */}
            {currentUser && !selectedManagers.has(currentUser.id) && (
              <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                <View className="flex items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-orange-900 font-medium text-sm">快速添加</Text>
                    <Text className="text-orange-700 text-xs mt-1">将自己设置为该仓库的管理员</Text>
                  </View>
                  <Button
                    size="mini"
                    className="bg-orange-500 text-white text-xs break-keep"
                    onClick={selectSelfAsManager}>
                    添加自己
                  </Button>
                </View>
              </View>
            )}

            {allManagers.length === 0 ? (
              <View className="text-center py-8">
                <View className="i-mdi-account-supervisor text-5xl text-gray-300 mx-auto mb-2" />
                <Text className="text-gray-400 text-sm">暂无可用管理员</Text>
              </View>
            ) : (
              <View>
                {allManagers.map((manager) => {
                  const isSelected = selectedManagers.has(manager.id)
                  const isSelf = manager.id === user?.id

                  return (
                    <View
                      key={manager.id}
                      className={`border rounded-lg p-3 mb-3 ${
                        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}
                      onClick={() => toggleManager(manager.id)}>
                      <View className="flex items-center">
                        <View
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                            isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                          }`}>
                          {isSelected && <View className="i-mdi-check text-white text-sm" />}
                        </View>
                        <View className="flex-1">
                          <View className="flex items-center">
                            <Text className={`font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>
                              {manager.name || manager.phone || manager.email || '未命名'}
                            </Text>
                            {isSelf && (
                              <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded">
                                <Text className="text-blue-700 text-xs">我</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-gray-500 text-xs mt-1">
                            {manager.role === 'super_admin' ? '老板' : '车队长'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {selectedManagers.size === 0 && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <Text className="text-red-700 text-xs">⚠️ 必须至少选择一个管理员才能保存</Text>
              </View>
            )}
          </View>
        </View>

        {/* 新建品类对话框 */}
        {showNewCategoryDialog && (
          <View className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <View className="bg-white rounded-lg p-6 m-4 w-full max-w-md">
              <View className="flex items-center justify-between mb-4">
                <Text className="text-gray-900 font-bold text-lg">新建品类</Text>
                <View
                  className="i-mdi-close text-2xl text-gray-500 cursor-pointer"
                  onClick={() => setShowNewCategoryDialog(false)}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm mb-2">
                  品类名称 <Text className="text-red-500">*</Text>
                </Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                    placeholder="例如：装卸货物"
                    value={newCategoryName}
                    onInput={(e) => setNewCategoryName(e.detail.value)}
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm mb-2">单价（可选）</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                    type="digit"
                    placeholder="请输入单价"
                    value={newCategoryDriverPrice}
                    onInput={(e) => setNewCategoryDriverPrice(e.detail.value)}
                  />
                </View>
                <Text className="text-gray-500 text-xs mt-1">创建后会自动选中该品类并设置价格</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm mb-2">上楼价格（可选）</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                    type="digit"
                    placeholder="请输入上楼价格"
                    value={newCategoryVehiclePrice}
                    onInput={(e) => setNewCategoryVehiclePrice(e.detail.value)}
                  />
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 text-sm mb-2">分拣单价（可选）</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-gray-50 px-3 py-2 rounded border border-gray-200 w-full"
                    type="digit"
                    placeholder="请输入分拣单价"
                    value={newCategorySortingPrice}
                    onInput={(e) => setNewCategorySortingPrice(e.detail.value)}
                  />
                </View>
              </View>

              <View className="flex gap-3">
                <Button
                  size="default"
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg break-keep text-base"
                  onClick={() => setShowNewCategoryDialog(false)}>
                  取消
                </Button>
                <Button
                  size="default"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg break-keep text-base"
                  onClick={handleCreateCategory}>
                  创建
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* 导入品类对话框 */}
        {showImportDialog && (
          <View className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <View className="bg-white rounded-lg p-6 m-4 w-full max-w-md">
              <View className="flex items-center justify-between mb-4">
                <Text className="text-gray-900 font-bold text-lg">导入品类配置</Text>
                <View
                  className="i-mdi-close text-2xl text-gray-500 cursor-pointer"
                  onClick={() => setShowImportDialog(false)}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm mb-3">选择要导入的仓库</Text>
                <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <View className="flex items-start">
                    <View className="i-mdi-information text-lg text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <Text className="text-blue-700 text-xs flex-1">
                      将会导入选中仓库的所有品类配置（包括品类和单价），并与当前配置合并
                    </Text>
                  </View>
                </View>

                {allWarehouses.length === 0 ? (
                  <View className="text-center py-8">
                    <View className="i-mdi-warehouse text-5xl text-gray-300 mx-auto mb-2" />
                    <Text className="text-gray-400 text-sm">暂无其他仓库</Text>
                  </View>
                ) : (
                  allWarehouses.map((warehouse) => (
                    <View
                      key={warehouse.id}
                      className={`border rounded-lg p-3 mb-2 cursor-pointer ${
                        selectedWarehouseForImport === warehouse.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                      onClick={() => setSelectedWarehouseForImport(warehouse.id)}>
                      <View className="flex items-center justify-between">
                        <View className="flex-1">
                          <Text
                            className={`font-medium text-sm ${
                              selectedWarehouseForImport === warehouse.id ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                            {warehouse.name}
                          </Text>
                          <Text className="text-gray-500 text-xs mt-1">
                            {warehouse.is_active ? '运营中' : '已停用'}
                          </Text>
                        </View>
                        {selectedWarehouseForImport === warehouse.id && (
                          <View className="i-mdi-check-circle text-2xl text-blue-600" />
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View className="flex gap-3">
                <Button
                  size="default"
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg break-keep text-base"
                  onClick={() => setShowImportDialog(false)}>
                  取消
                </Button>
                <Button
                  size="default"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg break-keep text-base"
                  onClick={handleImportCategories}>
                  导入
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* 底部保存按钮 */}
        <View className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <Button className="w-full bg-blue-600 text-white py-3 rounded-lg break-keep text-base" onClick={handleSave}>
            保存设置
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

export default WarehouseEdit
