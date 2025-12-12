import {Button, Checkbox, CheckboxGroup, Input, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import * as NotificationsAPI from '@/db/api/notifications'
import * as UsersAPI from '@/db/api/users'
import * as VehiclesAPI from '@/db/api/vehicles'
import * as WarehousesAPI from '@/db/api/warehouses'

import type {Profile, Warehouse} from '@/db/types'
import {CACHE_KEYS, getVersionedCache, onDataUpdated, setVersionedCache} from '@/utils/cache'
import {createLogger} from '@/utils/logger'
import ErrorBoundary from '@/components/ErrorBoundary'

// 创建页面日志记录器
const logger = createLogger('DriverManagement')

// 扩展Profile类型，包含实名信息
type DriverWithRealName = Profile & {real_name: string | null}

// 司机详细信息类型
type DriverDetailInfo = {
  profile: Profile
  license: any
  vehicles: any[]
  age: number | null
  drivingYears: number | null
  driverType: string
  joinDate: string | null
  workDays: number | null
}

const DriverManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [drivers, setDrivers] = useState<DriverWithRealName[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0) // 当前选中的仓库索引

  // 司机详细信息
  const [driverDetails, setDriverDetails] = useState<Map<string, DriverDetailInfo>>(new Map())

  // 司机的仓库分配信息（用于过滤）
  const [driverWarehouseMap, setDriverWarehouseMap] = useState<Map<string, string[]>>(new Map())

  // 仓库分配展开状态（记录哪个司机的仓库分配面板是展开的）
  const [warehouseAssignExpanded, setWarehouseAssignExpanded] = useState<string | null>(null)

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showSearch, setShowSearch] = useState(false) // 搜索框展开状态

  // 添加司机相关状态
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [newDriverPhone, setNewDriverPhone] = useState('')
  const [newDriverName, setNewDriverName] = useState('')
  const [newDriverType, setNewDriverType] = useState<'pure' | 'with_vehicle'>('pure') // 默认为纯司机
  const [newDriverWarehouseIds, setNewDriverWarehouseIds] = useState<string[]>([]) // 新司机的仓库分配
  const [addingDriver, setAddingDriver] = useState(false)

  // 车队长权限状态
  const [managerPermissionsEnabled, setManagerPermissionsEnabled] = useState<boolean>(true) // 默认为true，加载后更新

  // 过滤后的司机列表（支持搜索实名和仓库过滤）
  const filteredDrivers = useMemo(() => {
    let result = drivers

    // 仓库过滤（当有多个仓库时）
    if (warehouses.length > 1 && warehouses[currentWarehouseIndex]) {
      const currentWarehouseId = warehouses[currentWarehouseIndex].id
      result = result.filter((driver) => {
        const driverWarehouses = driverWarehouseMap.get(driver.id) || []
        return driverWarehouses.includes(currentWarehouseId)
      })
    }

    // 搜索关键词过滤
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase()
      result = result.filter(
        (driver) =>
          driver.name?.toLowerCase().includes(keyword) ||
          driver.phone?.toLowerCase().includes(keyword) ||
          driver.real_name?.toLowerCase().includes(keyword)
      )
    }

    return result
  }, [drivers, searchKeyword, warehouses, currentWarehouseIndex, driverWarehouseMap])

  // 加载司机列表
  const loadDrivers = useCallback(async (forceRefresh: boolean = false) => {
    // 如果不是强制刷新，先尝试从缓存加载
    if (!forceRefresh) {
      const cachedDrivers = getVersionedCache<DriverWithRealName[]>(CACHE_KEYS.MANAGER_DRIVERS)
      const cachedDetails = getVersionedCache<Map<string, DriverDetailInfo>>(CACHE_KEYS.MANAGER_DRIVER_DETAILS)
      const cachedWarehouseMap = getVersionedCache<Map<string, string[]>>(CACHE_KEYS.MANAGER_DRIVER_WAREHOUSES)

      if (cachedDrivers && cachedDetails && cachedWarehouseMap) {
        setDrivers(cachedDrivers)
        // 将普通对象转换为 Map
        const detailsMap = new Map(Object.entries(cachedDetails))
        setDriverDetails(detailsMap)
        const warehouseMap = new Map(Object.entries(cachedWarehouseMap))
        setDriverWarehouseMap(warehouseMap)
        return
      }
    }

    // 从数据库加载
    try {
      const driverList = await UsersAPI.getAllDriversWithRealName()
      setDrivers(driverList)

      // 批量并行加载所有司机的详细信息和仓库分配（优化性能）
      const detailsPromises = driverList.map((driver) => VehiclesAPI.getDriverDetailInfo(driver.id))
      const warehousePromises = driverList.map((driver) => WarehousesAPI.getDriverWarehouseIds(driver.id))
      const [detailsResults, warehouseResults] = await Promise.all([
        Promise.all(detailsPromises),
        Promise.all(warehousePromises)
      ])

      const detailsMap = new Map<string, DriverDetailInfo>()
      const warehouseMap = new Map<string, string[]>()

      detailsResults.forEach((detail, index) => {
        if (detail) {
          detailsMap.set(driverList[index].id, detail)
        }
      })

      warehouseResults.forEach((warehouseIds, index) => {
        warehouseMap.set(driverList[index].id, warehouseIds)
      })

      setDriverDetails(detailsMap)
      setDriverWarehouseMap(warehouseMap)

      // 使用带版本号的缓存（5分钟有效期）
      setVersionedCache(CACHE_KEYS.MANAGER_DRIVERS, driverList, 5 * 60 * 1000)
      // Map 需要转换为普通对象才能缓存
      const detailsObj = Object.fromEntries(detailsMap)
      setVersionedCache(CACHE_KEYS.MANAGER_DRIVER_DETAILS, detailsObj, 5 * 60 * 1000)
      const warehouseObj = Object.fromEntries(warehouseMap)
      setVersionedCache(CACHE_KEYS.MANAGER_DRIVER_WAREHOUSES, warehouseObj, 5 * 60 * 1000)
    } catch (error) {
      logger.error('加载司机列表失败', error)
    }
  }, [])

  // 加载管理员负责的仓库列表（只加载启用的仓库）
  const loadWarehouses = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await WarehousesAPI.getManagerWarehouses(user.id)
      const enabledWarehouses = data.filter((w) => w.is_active)
      setWarehouses(enabledWarehouses)
    } catch (error) {
      logger.error('加载仓库列表失败', error)
    }
  }, [user?.id])

  // 加载司机的仓库分配
  const _loadDriverWarehouses = useCallback(
    async (driverId: string) => {
      try {
        const warehouseIds = await WarehousesAPI.getDriverWarehouseIds(driverId)
        // 只显示管理员负责的且启用的仓库
        const managerWarehouseIds = warehouses.map((w) => w.id)
        const filteredIds = warehouseIds.filter((id) => managerWarehouseIds.includes(id))
        setSelectedWarehouseIds(filteredIds)
      } catch (error) {
        logger.error('加载司机仓库分配失败', error)
      }
    },
    [warehouses]
  )

  // 加载车队长权限状态
  const loadManagerPermissions = useCallback(async () => {
    if (!user?.id) return
    try {
      const currentUser = await UsersAPI.getCurrentUserWithRealName()
      if (currentUser) {
        const enabled = currentUser.manager_permissions_enabled ?? true // 默认为true
        setManagerPermissionsEnabled(enabled)
      }
    } catch (error) {
      logger.error('加载车队长权限状态失败', error)
    }
  }, [user?.id])

  useEffect(() => {
    loadDrivers()
    loadWarehouses()
    loadManagerPermissions()
  }, [loadDrivers, loadWarehouses, loadManagerPermissions])

  // 页面显示时加载数据（批量并行查询优化）
  useDidShow(() => {
    Promise.all([loadDrivers(), loadWarehouses(), loadManagerPermissions()]).catch((error) => {
      console.error('[DriverManagement] 批量刷新数据失败:', error)
    })
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadDrivers(), loadWarehouses(), loadManagerPermissions()])
    Taro.stopPullDownRefresh()
  })

  // 处理仓库切换
  const handleWarehouseChange = useCallback((e: any) => {
    const index = e.detail.current
    setCurrentWarehouseIndex(index)
  }, [])

  // 选择司机（已废弃，保留用于兼容性）
  const _handleSelectDriver = async (driver: DriverWithRealName) => {
    logger.userAction('选择司机', {driverId: driver.id, driverName: driver.real_name || driver.name})
    // 功能已移至卡片内的仓库分配按钮
  }

  // 查看司机的个人信息
  const handleViewDriverProfile = (driverId: string) => {
    logger.userAction('查看司机个人信息', {driverId})
    Taro.navigateTo({
      url: `/pages/manager/driver-profile/index?driverId=${driverId}`
    })
  }

  // 查看司机的车辆
  const handleViewDriverVehicles = (driverId: string) => {
    logger.userAction('查看司机车辆', {driverId})
    Taro.navigateTo({
      url: `/pages/driver/vehicle-list/index?driverId=${driverId}`
    })
  }

  // 发送实名通知
  const handleSendVerificationReminder = async (driver: DriverWithRealName) => {
    if (!user) return

    logger.userAction('发送实名通知', {driverId: driver.id, driverName: driver.name})

    Taro.showLoading({title: '发送中...', mask: true})

    try {
      // 获取当前用户信息和角色
      const currentUser = await UsersAPI.getCurrentUserWithRealName()
      if (!currentUser) {
        Taro.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
        return
      }

      // 获取当前用户的角色
      const userRoles = await UsersAPI.getUserRoles(user.id)
      const isBoss = userRoles.includes('BOSS')
      const isDispatcher = userRoles.includes('PEER_ADMIN')
      const isManager = userRoles.includes('MANAGER')

      // 如果是车队长，需要检查是否对该司机有管辖权
      if (isManager && !isBoss && !isDispatcher) {
        // 获取司机的仓库分配
        const driverWarehouseIds = driverWarehouseMap.get(driver.id) || []
        // 获取车队长管辖的仓库
        const managerWarehouseIds = warehouses.map((w) => w.id)

        // 检查是否有交集
        const hasPermission = driverWarehouseIds.some((id) => managerWarehouseIds.includes(id))

        if (!hasPermission) {
          Taro.showToast({
            title: '该司机不在您管辖的仓库中',
            icon: 'none',
            duration: 2000
          })
          return
        }
      }

      // 确定发送者角色
      let senderRole: 'MANAGER' | 'BOSS' | 'PEER_ADMIN' = 'MANAGER'
      if (isBoss) {
        senderRole = 'BOSS'
      } else if (isDispatcher) {
        senderRole = 'PEER_ADMIN'
      }

      // 发送通知
      const success = await NotificationsAPI.sendVerificationReminder(
        driver.id,
        user.id,
        currentUser.real_name || currentUser.name || '管理员',
        senderRole
      )

      if (success) {
        Taro.showToast({
          title: '通知已发送',
          icon: 'success'
        })
      } else {
        Taro.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        })
        logger.error('实名通知发送失败', {driverId: driver.id})
      }
    } catch (error) {
      logger.error('发送实名通知异常', {error, driverId: driver.id})
      Taro.showToast({
        title: '发送失败',
        icon: 'none'
      })
    } finally {
      Taro.hideLoading()
    }
  }

  // 切换添加司机表单显示
  const toggleAddDriver = () => {
    setShowAddDriver(!showAddDriver)
    if (!showAddDriver) {
      // 重置表单
      setNewDriverPhone('')
      setNewDriverName('')
      setNewDriverType('pure') // 重置为默认值
      setNewDriverWarehouseIds([]) // 重置仓库选择
    }
  }

  // 切换搜索框显示
  const toggleSearch = () => {
    setShowSearch(!showSearch)
    if (showSearch) {
      // 收起时清空搜索关键词
      setSearchKeyword('')
    }
  }

  // 处理添加司机
  const handleAddDriver = async () => {
    // 验证输入
    if (!newDriverPhone.trim()) {
      showToast({title: '请输入手机号', icon: 'none'})
      return
    }
    if (!newDriverName.trim()) {
      showToast({title: '请输入姓名', icon: 'none'})
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(newDriverPhone.trim())) {
      showToast({title: '请输入正确的手机号', icon: 'none'})
      return
    }

    // 验证仓库选择
    if (newDriverWarehouseIds.length === 0) {
      showToast({title: '请至少选择一个仓库', icon: 'none'})
      return
    }

    setAddingDriver(true)
    showLoading({title: '添加中...'})

    try {
      // 传递司机类型参数
      const newDriver = await UsersAPI.createDriver(newDriverPhone.trim(), newDriverName.trim(), newDriverType)

      if (newDriver) {
        // 分配仓库
        for (const warehouseId of newDriverWarehouseIds) {
          await WarehousesAPI.insertWarehouseAssignment({
            user_id: newDriver.id,
            warehouse_id: warehouseId
          })
        }

        Taro.hideLoading()
        setAddingDriver(false)

        // 显示详细的创建成功信息
        const loginAccount = `${newDriverPhone.trim()}@fleet.com`
        const driverTypeText = newDriverType === 'with_vehicle' ? '带车司机' : '纯司机'
        const defaultPassword = '123456'
        const plateNumber = newDriver.vehicle_plate || '未设置'
        const warehouseNames = warehouses
          .filter((w) => newDriverWarehouseIds.includes(w.id))
          .map((w) => w.name)
          .join('、')

        Taro.showModal({
          title: '司机创建成功',
          content: `姓名：${newDriverName.trim()}
手机号码：${newDriverPhone.trim()}
司机类型：${driverTypeText}
分配仓库：${warehouseNames}
登录账号：${loginAccount}
默认密码：${defaultPassword}
车牌号码：${plateNumber}`,
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            // 重置表单
            setNewDriverPhone('')
            setNewDriverName('')
            setNewDriverType('pure')
            setNewDriverWarehouseIds([])
            setShowAddDriver(false)
            // 数据更新，增加版本号并清除相关缓存
            onDataUpdated([CACHE_KEYS.MANAGER_DRIVERS, CACHE_KEYS.MANAGER_DRIVER_DETAILS])
            loadDrivers(true)
          }
        })
      } else {
        Taro.hideLoading()
        setAddingDriver(false)
        showToast({title: '添加失败，手机号可能已存在', icon: 'error'})
      }
    } catch (error) {
      Taro.hideLoading()
      setAddingDriver(false)
      logger.error('添加司机失败', error)
      showToast({title: '添加失败，请重试', icon: 'error'})
    }
  }

  // 切换司机类型
  const handleToggleDriverType = useCallback(
    async (driver: DriverWithRealName) => {
      const currentType = driver.driver_type
      const newType = currentType === 'with_vehicle' ? 'pure' : 'with_vehicle'
      const currentTypeText = currentType === 'with_vehicle' ? '带车司机' : '纯司机'
      const newTypeText = newType === 'with_vehicle' ? '带车司机' : '纯司机'

      // 二次确认
      const result = await Taro.showModal({
        title: '确认切换司机类型',
        content: `确定要将 ${driver.real_name || driver.name || '该司机'} 从【${currentTypeText}】切换为【${newTypeText}】吗？`,
        confirmText: '确定',
        cancelText: '取消'
      })

      if (!result.confirm) {
        return
      }

      showLoading({title: '切换中...'})

      const success = await UsersAPI.updateProfile(driver.id, {driver_type: newType})

      Taro.hideLoading()

      if (success) {
        showToast({title: `已切换为${newTypeText}`, icon: 'success'})

        // 发送通知
        try {
          const notifications: Array<{
            userId: string
            type: 'driver_type_changed'
            title: string
            message: string
            relatedId?: string
          }> = []

          // 1. 通知司机
          notifications.push({
            userId: driver.id,
            type: 'driver_type_changed',
            title: '司机类型变更通知',
            message: `您的司机类型已从【${currentTypeText}】变更为【${newTypeText}】`,
            relatedId: driver.id
          })

          // 2. 获取当前操作者信息
          const currentUserProfile = await UsersAPI.getCurrentUserWithRealName()

          if (currentUserProfile) {
            if (currentUserProfile.role === 'MANAGER') {
              // 获取操作人的显示名称（优先使用真实姓名）
              const operatorRealName = currentUserProfile.real_name
              const operatorUserName = currentUserProfile.name

              // 智能构建操作人显示文本
              let operatorText = '车队长'
              if (operatorRealName) {
                // 如果有真实姓名，显示：车队长【张三】
                operatorText = `车队长【${operatorRealName}】`
              } else if (operatorUserName && operatorUserName !== '老板' && operatorUserName !== '车队长') {
                // 如果有用户名且不是角色名称，显示：车队长【admin】
                operatorText = `车队长【${operatorUserName}】`
              }
              // 否则只显示：车队长

              // 车队长操作 → 通知所有老板
              const superAdmins = await UsersAPI.getAllSuperAdmins()
              for (const admin of superAdmins) {
                notifications.push({
                  userId: admin.id,
                  type: 'driver_type_changed',
                  title: '司机类型变更操作通知',
                  message: `${operatorText}修改了司机类型：${driver.real_name || driver.name}，从【${currentTypeText}】变更为【${newTypeText}】`,
                  relatedId: driver.id
                })
              }
            }
          }
        } catch (error) {
          console.error('❌ 发送司机类型变更通知失败:', error)
        }

        // 数据更新，增加版本号并清除相关缓存
        onDataUpdated([CACHE_KEYS.MANAGER_DRIVERS, CACHE_KEYS.MANAGER_DRIVER_DETAILS])
        await loadDrivers(true)
        // 重新加载该司机的详细信息
        const detail = await VehiclesAPI.getDriverDetailInfo(driver.id)
        if (detail) {
          setDriverDetails((prev) => new Map(prev).set(driver.id, detail))
        }
      } else {
        showToast({title: '切换失败', icon: 'error'})
      }
    },
    [loadDrivers]
  )

  // 处理仓库分配按钮点击
  const handleWarehouseAssignClick = useCallback(
    async (driver: DriverWithRealName) => {
      if (warehouseAssignExpanded === driver.id) {
        // 如果已经展开，则收起
        setWarehouseAssignExpanded(null)
        setSelectedWarehouseIds([])
      } else {
        // 展开仓库分配面板
        setWarehouseAssignExpanded(driver.id)
        // 加载该司机已分配的仓库
        showLoading({title: '加载中...'})
        const assignments = await WarehousesAPI.getWarehouseAssignmentsByDriver(driver.id)
        Taro.hideLoading()
        setSelectedWarehouseIds(assignments.map((a) => a.warehouse_id))
      }
    },
    [warehouseAssignExpanded]
  )

  // 保存仓库分配
  const handleSaveWarehouseAssignment = useCallback(
    async (driverId: string) => {
      // 获取司机信息用于显示名称
      const driver = drivers.find((d) => d.id === driverId)
      const driverName = driver?.real_name || driver?.name || '该司机'

      // 获取选中的仓库名称
      const selectedWarehouseNames = warehouses
        .filter((w) => selectedWarehouseIds.includes(w.id))
        .map((w) => w.name)
        .join('、')

      const warehouseText = selectedWarehouseIds.length > 0 ? selectedWarehouseNames : '无'

      // 二次确认
      const result = await Taro.showModal({
        title: '确认保存仓库分配',
        content: `确定要为 ${driverName} 分配以下仓库吗？

${warehouseText}

${selectedWarehouseIds.length === 0 ? '（将清除该司机的所有仓库分配）' : ''}`,
        confirmText: '确定',
        cancelText: '取消'
      })

      if (!result.confirm) {
        return
      }

      showLoading({title: '保存中...'})

      // 获取之前的仓库分配（用于对比变更）
      const previousAssignments = await WarehousesAPI.getWarehouseAssignmentsByDriver(driverId)
      const previousWarehouseIds = previousAssignments.map((a) => a.warehouse_id)

      // 先删除该司机的所有仓库分配
      await WarehousesAPI.deleteWarehouseAssignmentsByDriver(driverId)

      // 添加新的仓库分配
      for (const warehouseId of selectedWarehouseIds) {
        await WarehousesAPI.insertWarehouseAssignment({
          user_id: driverId,
          warehouse_id: warehouseId
        })
      }

      Taro.hideLoading()
      showToast({title: '保存成功', icon: 'success'})
      setWarehouseAssignExpanded(null)
      setSelectedWarehouseIds([])

      // 发送通知
      try {
        const notifications: Array<{
          userId: string
          type: 'warehouse_assigned' | 'warehouse_unassigned'
          title: string
          message: string
          relatedId?: string
        }> = []

        // 计算仓库变更情况
        const addedWarehouseIds = selectedWarehouseIds.filter((id) => !previousWarehouseIds.includes(id))
        const removedWarehouseIds = previousWarehouseIds.filter((id) => !selectedWarehouseIds.includes(id))

        // 通知司机
        if (addedWarehouseIds.length > 0 || removedWarehouseIds.length > 0) {
          const addedWarehouseNames = warehouses
            .filter((w) => addedWarehouseIds.includes(w.id))
            .map((w) => w.name)
            .join('、')
          const removedWarehouseNames = warehouses
            .filter((w) => removedWarehouseIds.includes(w.id))
            .map((w) => w.name)
            .join('、')

          let message = ''
          if (addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0) {
            message = `您的仓库分配已更新：\n新增：${addedWarehouseNames}\n移除：${removedWarehouseNames}`
          } else if (addedWarehouseIds.length > 0) {
            message = `您已被分配到新仓库：${addedWarehouseNames}`
          } else {
            message = `您已从以下仓库移除：${removedWarehouseNames}`
          }

          notifications.push({
            userId: driverId,
            type: addedWarehouseIds.length > 0 ? 'warehouse_assigned' : 'warehouse_unassigned',
            title: '仓库分配变更通知',
            message: message,
            relatedId: driverId
          })
        }

      } catch (error) {
        console.error('❌ [仓库分配-管理员] 发送通知失败:', error)
      }
    },
    [selectedWarehouseIds, drivers, warehouses]
  )

  return (
    <ErrorBoundary>
      <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
        <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">司机管理</Text>
            <Text className="text-blue-100 text-sm block">为司机分配您负责的仓库</Text>
          </View>

          {/* 提示信息 */}
          {warehouses.length === 0 && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <View className="flex items-start">
                <View className="i-mdi-alert text-yellow-600 text-xl mr-2 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-yellow-800 text-sm block mb-1 font-medium">暂无仓库</Text>
                  <Text className="text-yellow-700 text-xs block">您还没有被分配任何仓库，无法管理司机</Text>
                </View>
              </View>
            </View>
          )}

          {warehouses.length > 0 && (
            <>
              {/* 权限禁用提示 */}
              {!managerPermissionsEnabled && (
                <View className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <View className="flex items-start">
                    <View className="i-mdi-lock text-orange-600 text-xl mr-2 mt-0.5" />
                    <View className="flex-1">
                      <Text className="text-orange-800 text-sm block mb-1 font-medium">权限已禁用</Text>
                      <Text className="text-orange-700 text-xs block">
                        您的用户信息修改权限已被禁用，无法添加司机、分配仓库或切换司机类型。如需开启权限，请联系管理员。
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 司机列表 */}
              <View className="bg-white rounded-lg p-4 mb-4 shadow">
                <View className="flex items-center justify-between mb-3">
                  <View className="flex items-center">
                    <View className="i-mdi-account-group text-blue-600 text-xl mr-2" />
                    <Text className="text-gray-800 text-base font-bold">选择司机</Text>
                  </View>
                  {/* 添加司机按钮 - 仅在权限启用时显示 */}
                  {managerPermissionsEnabled && (
                    <View
                      onClick={toggleAddDriver}
                      className="flex items-center bg-blue-600 rounded-lg px-3 py-2 active:scale-95 transition-all">
                      <View className={`${showAddDriver ? 'i-mdi-close' : 'i-mdi-plus'} text-white text-base mr-1`} />
                      <Text className="text-white text-xs font-medium">{showAddDriver ? '取消' : '添加司机'}</Text>
                    </View>
                  )}
                </View>

                {/* 仓库切换器（多仓库时显示） */}
                {warehouses.length > 1 && (
                  <View className="mb-3">
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-warehouse text-lg text-blue-900 mr-2" />
                      <Text className="text-sm font-bold text-gray-700">选择仓库</Text>
                      <Text className="text-xs text-gray-400 ml-2">
                        ({currentWarehouseIndex + 1}/{warehouses.length})
                      </Text>
                      <Text className="text-xs text-gray-400 ml-auto">{filteredDrivers.length} 名司机</Text>
                    </View>
                    <View className="bg-white rounded-xl shadow-md overflow-hidden">
                      <Swiper
                        className="h-16"
                        current={currentWarehouseIndex}
                        onChange={handleWarehouseChange}
                        indicatorDots
                        indicatorColor="rgba(0, 0, 0, 0.2)"
                        indicatorActiveColor="#1E3A8A">
                        {warehouses.map((warehouse) => {
                          // 计算该仓库的司机数量
                          const warehouseDriverCount = drivers.filter((driver) => {
                            const driverWarehouses = driverWarehouseMap.get(driver.id) || []
                            return driverWarehouses.includes(warehouse.id)
                          }).length

                          return (
                            <SwiperItem key={warehouse.id}>
                              <View className="h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 px-4">
                                <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                                <Text className="text-lg font-bold text-blue-900">{warehouse.name}</Text>
                                <Text className="text-xs text-gray-500 ml-2">({warehouseDriverCount}人)</Text>
                              </View>
                            </SwiperItem>
                          )
                        })}
                      </Swiper>
                    </View>
                  </View>
                )}

                {/* 搜索按钮 */}
                <View className="mb-3">
                  <View
                    onClick={toggleSearch}
                    className="flex items-center justify-center bg-white rounded-lg py-3 px-4 border border-gray-200 shadow-sm active:scale-98 transition-all">
                    <View className={`${showSearch ? 'i-mdi-close' : 'i-mdi-magnify'} text-blue-600 text-lg mr-2`} />
                    <Text className="text-blue-600 text-sm font-medium">{showSearch ? '收起搜索' : '展开搜索'}</Text>
                  </View>
                </View>

                {/* 搜索框（可展开/收起） */}
                {showSearch && (
                  <View className="mb-3">
                    <View className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                      <View className="i-mdi-magnify text-gray-400 text-xl mr-2" />
                      <Input
                        type="text"
                        placeholder="搜索司机姓名或手机号"
                        value={searchKeyword}
                        onInput={(e) => setSearchKeyword(e.detail.value)}
                        className="flex-1 text-sm"
                      />
                      {searchKeyword && (
                        <View
                          className="i-mdi-close-circle text-gray-400 text-lg"
                          onClick={() => setSearchKeyword('')}
                        />
                      )}
                    </View>
                  </View>
                )}

                {/* 添加司机表单 */}
                {showAddDriver && (
                  <View className="bg-blue-50 rounded-lg p-4 mb-3 border-2 border-blue-200">
                    <View className="mb-3">
                      <Text className="text-gray-700 text-sm block mb-2">手机号</Text>
                      <Input
                        type="number"
                        maxlength={11}
                        placeholder="请输入11位手机号"
                        value={newDriverPhone}
                        onInput={(e) => setNewDriverPhone(e.detail.value)}
                        className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                      />
                    </View>
                    <View className="mb-3">
                      <Text className="text-gray-700 text-sm block mb-2">姓名</Text>
                      <Input
                        type="text"
                        placeholder="请输入司机姓名"
                        value={newDriverName}
                        onInput={(e) => setNewDriverName(e.detail.value)}
                        className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                      />
                    </View>
                    <View className="mb-3">
                      <Text className="text-gray-700 text-sm block mb-2">司机类型</Text>
                      <View className="flex gap-2">
                        <View
                          onClick={() => setNewDriverType('pure')}
                          className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
                            newDriverType === 'pure'
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300 active:bg-gray-50'
                          }`}>
                          <View
                            className={`i-mdi-account text-base mr-1.5 ${
                              newDriverType === 'pure' ? 'text-white' : 'text-gray-600'
                            }`}
                          />
                          <Text
                            className={`text-sm font-medium ${
                              newDriverType === 'pure' ? 'text-white' : 'text-gray-700'
                            }`}>
                            纯司机
                          </Text>
                        </View>
                        <View
                          onClick={() => setNewDriverType('with_vehicle')}
                          className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
                            newDriverType === 'with_vehicle'
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300 active:bg-gray-50'
                          }`}>
                          <View
                            className={`i-mdi-truck text-base mr-1.5 ${
                              newDriverType === 'with_vehicle' ? 'text-white' : 'text-gray-600'
                            }`}
                          />
                          <Text
                            className={`text-sm font-medium ${
                              newDriverType === 'with_vehicle' ? 'text-white' : 'text-gray-700'
                            }`}>
                            带车司机
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="mb-3">
                      <Text className="text-gray-700 text-sm block mb-2">
                        分配仓库 <Text className="text-red-500">*</Text>
                      </Text>
                      {warehouses.length > 0 ? (
                        <CheckboxGroup
                          onChange={(e) => setNewDriverWarehouseIds(e.detail.value as string[])}
                          className="space-y-2">
                          {warehouses.map((warehouse) => (
                            <View
                              key={warehouse.id}
                              className={`flex items-center bg-white rounded-lg px-3 py-2.5 border-2 transition-all ${
                                newDriverWarehouseIds.includes(warehouse.id)
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-300'
                              }`}>
                              <Checkbox
                                value={warehouse.id}
                                checked={newDriverWarehouseIds.includes(warehouse.id)}
                                className="mr-2"
                              />
                              <Text className="text-sm text-gray-700 flex-1">{warehouse.name}</Text>
                            </View>
                          ))}
                        </CheckboxGroup>
                      ) : (
                        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <Text className="text-yellow-800 text-xs">暂无可分配的仓库</Text>
                        </View>
                      )}
                    </View>
                    <View className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <View className="flex items-start">
                        <View className="i-mdi-information text-yellow-600 text-base mr-2 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-yellow-800 text-xs leading-relaxed">
                            默认密码为 <Text className="font-bold">123456</Text>，司机首次登录后请及时修改密码
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View
                      onClick={addingDriver ? undefined : handleAddDriver}
                      className={`flex items-center justify-center bg-blue-600 rounded-lg py-2 active:scale-98 transition-all ${
                        addingDriver ? 'opacity-50' : ''
                      }`}>
                      <View className="i-mdi-check text-white text-base mr-1" />
                      <Text className="text-white text-sm font-medium">确认添加</Text>
                    </View>
                  </View>
                )}

                {filteredDrivers.length > 0 ? (
                  <View className="space-y-3">
                    {filteredDrivers.map((driver) => {
                      const detail = driverDetails.get(driver.id)
                      // 判断司机是否已实名：检查是否已录入身份证信息
                      const hasIdCard = !!(
                        detail?.license?.id_card_number ||
                        detail?.license?.id_card_photo_front ||
                        detail?.license?.id_card_photo_back
                      )
                      const isVerified = hasIdCard

                      return (
                        <View key={driver.id} className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
                          {/* 司机头部信息 */}
                          <View className="p-4 flex items-center justify-between">
                            <View className="flex items-center flex-1">
                              <View className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-full p-3 mr-3 shadow-md">
                                <View className="i-mdi-account text-white text-2xl" />
                              </View>
                              <View className="flex-1">
                                <View className="flex items-center gap-2 mb-1">
                                  <Text className="text-gray-900 text-lg font-bold">
                                    {driver.real_name || driver.name || '未设置姓名'}
                                  </Text>
                                  {/* 实名状态标签：检查是否已录入身份证信息 */}
                                  {isVerified && (
                                    <View className="bg-green-100 px-2 py-0.5 rounded-full">
                                      <Text className="text-green-700 text-xs font-medium">已实名</Text>
                                    </View>
                                  )}
                                  {/* 司机类型标签 */}
                                  {detail &&
                                    (() => {
                                      // 判断是否为新司机
                                      const isNewDriver =
                                        detail.workDays !== null &&
                                        detail.workDays !== undefined &&
                                        detail.workDays <= 7
                                      // 根据 driver_type 字段和是否为新司机，计算司机类型
                                      let driverTypeLabel = ''
                                      if (driver.driver_type === 'with_vehicle') {
                                        driverTypeLabel = isNewDriver ? '新带车司机' : '带车司机'
                                      } else {
                                        driverTypeLabel = isNewDriver ? '新纯司机' : '纯司机'
                                      }

                                      return (
                                        <View
                                          className={`px-2 py-0.5 rounded-full ${
                                            driverTypeLabel === '新带车司机'
                                              ? 'bg-amber-100'
                                              : driverTypeLabel === '带车司机'
                                                ? 'bg-orange-100'
                                                : driverTypeLabel === '新纯司机'
                                                  ? 'bg-cyan-100'
                                                  : 'bg-blue-100'
                                          }`}>
                                          <Text
                                            className={`text-xs font-medium ${
                                              driverTypeLabel === '新带车司机'
                                                ? 'text-amber-700'
                                                : driverTypeLabel === '带车司机'
                                                  ? 'text-orange-700'
                                                  : driverTypeLabel === '新纯司机'
                                                    ? 'text-cyan-700'
                                                    : 'text-blue-700'
                                            }`}>
                                            {driverTypeLabel}
                                          </Text>
                                        </View>
                                      )
                                    })()}
                                  {/* 未实名标签 */}
                                  {!isVerified && (
                                    <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                                      <Text className="text-gray-600 text-xs font-medium">未实名</Text>
                                    </View>
                                  )}
                                </View>
                                <Text className="text-gray-500 text-sm">{driver.phone || '未设置手机号'}</Text>
                              </View>
                            </View>
                          </View>

                          {/* 司机详细信息 */}
                          {detail && (
                            <View className="px-4 pb-3 border-t border-gray-100">
                              <View className="grid grid-cols-2 gap-2 mt-3">
                                {/* 年龄 */}
                                {detail.age !== null && (
                                  <View className="flex items-center bg-gray-50 rounded-lg p-2">
                                    <View className="i-mdi-cake-variant text-blue-600 text-lg mr-2" />
                                    <View className="flex-1">
                                      <Text className="text-gray-500 text-xs block">年龄</Text>
                                      <Text className="text-gray-900 text-sm font-medium">{detail.age}岁</Text>
                                    </View>
                                  </View>
                                )}

                                {/* 驾龄 */}
                                {detail.drivingYears !== null && (
                                  <View className="flex items-center bg-gray-50 rounded-lg p-2">
                                    <View className="i-mdi-steering text-green-600 text-lg mr-2" />
                                    <View className="flex-1">
                                      <Text className="text-gray-500 text-xs block">驾龄</Text>
                                      <Text className="text-gray-900 text-sm font-medium">{detail.drivingYears}年</Text>
                                    </View>
                                  </View>
                                )}

                                {/* 驾驶证类型 */}
                                {detail.license?.license_class && (
                                  <View className="flex items-center bg-gray-50 rounded-lg p-2">
                                    <View className="i-mdi-card-account-details text-purple-600 text-lg mr-2" />
                                    <View className="flex-1">
                                      <Text className="text-gray-500 text-xs block">准驾车型</Text>
                                      <Text className="text-gray-900 text-sm font-medium">
                                        {detail.license.license_class}
                                      </Text>
                                    </View>
                                  </View>
                                )}

                                {/* 车辆数量 */}
                                <View className="flex items-center bg-gray-50 rounded-lg p-2">
                                  <View className="i-mdi-car text-orange-600 text-lg mr-2" />
                                  <View className="flex-1">
                                    <Text className="text-gray-500 text-xs block">车辆</Text>
                                    <Text className="text-gray-900 text-sm font-medium">
                                      {detail.vehicles.length > 0 ? `${detail.vehicles.length}辆` : '无车辆'}
                                    </Text>
                                  </View>
                                </View>

                                {/* 入职时间 */}
                                {detail.joinDate && (
                                  <View className="flex items-center bg-gray-50 rounded-lg p-2">
                                    <View className="i-mdi-calendar-check text-teal-600 text-lg mr-2" />
                                    <View className="flex-1">
                                      <Text className="text-gray-500 text-xs block">入职时间</Text>
                                      <Text className="text-gray-900 text-sm font-medium">{detail.joinDate}</Text>
                                    </View>
                                  </View>
                                )}

                                {/* 在职天数 */}
                                {detail.workDays !== null && (
                                  <View className="flex items-center bg-gray-50 rounded-lg p-2">
                                    <View className="i-mdi-clock-outline text-indigo-600 text-lg mr-2" />
                                    <View className="flex-1">
                                      <Text className="text-gray-500 text-xs block">在职天数</Text>
                                      <Text className="text-gray-900 text-sm font-medium">{detail.workDays}天</Text>
                                    </View>
                                  </View>
                                )}
                              </View>

                              {/* 车牌号（如果有车辆） */}
                              {detail.vehicles.length > 0 && (
                                <View className="mt-2 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-2 border border-orange-200">
                                  <View className="flex items-center">
                                    <View className="i-mdi-card-text text-orange-600 text-base mr-2" />
                                    <Text className="text-gray-600 text-xs mr-2">车牌号：</Text>
                                    <Text className="text-gray-900 text-sm font-bold">
                                      {detail.vehicles.map((v) => v.plate_number).join('、')}
                                    </Text>
                                  </View>
                                </View>
                              )}

                              {/* 身份证号码 */}
                              {detail.license?.id_card_number && (
                                <View className="mt-2 bg-indigo-50 rounded-lg p-2 border border-indigo-200">
                                  <View className="flex items-start">
                                    <View className="i-mdi-card-account-details text-indigo-600 text-base mr-2 mt-0.5" />
                                    <View className="flex-1">
                                      <Text className="text-gray-600 text-xs block mb-0.5">身份证号码</Text>
                                      <Text className="text-gray-900 text-xs font-mono tracking-wide">
                                        {detail.license.id_card_number}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              )}

                              {/* 住址 */}
                              {detail.license?.id_card_address && (
                                <View className="mt-2 bg-blue-50 rounded-lg p-2 border border-blue-200">
                                  <View className="flex items-start">
                                    <View className="i-mdi-home-map-marker text-blue-600 text-base mr-2 mt-0.5" />
                                    <View className="flex-1">
                                      <Text className="text-gray-600 text-xs block mb-0.5">住址</Text>
                                      <Text className="text-gray-900 text-xs leading-relaxed">
                                        {detail.license.id_card_address}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              )}
                            </View>
                          )}

                          {/* 实名通知按钮 - 仅对未实名司机显示 */}
                          {!isVerified && (
                            <View className="px-4 pb-3 flex justify-center">
                              <View
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSendVerificationReminder(driver)
                                }}
                                className="flex items-center justify-center bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg px-6 py-3 active:opacity-80 transition-all shadow-md">
                                <View className="i-mdi-bell-alert text-white text-lg mr-2" />
                                <Text className="text-white text-base font-bold">实名通知</Text>
                              </View>
                            </View>
                          )}

                          {/* 操作按钮 */}
                          <View className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border-t border-gray-100">
                            {/* 查看个人信息按钮 - 始终显示 */}
                            <View
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDriverProfile(driver.id)
                              }}
                              className="flex items-center justify-center bg-blue-50 border border-blue-200 rounded-lg py-2.5 active:bg-blue-100 transition-all">
                              <View className="i-mdi-account-card text-blue-600 text-base mr-1.5" />
                              <Text className="text-blue-700 text-sm font-medium">个人信息</Text>
                            </View>
                            {/* 查看车辆按钮 - 始终显示 */}
                            <View
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDriverVehicles(driver.id)
                              }}
                              className="flex items-center justify-center bg-green-50 border border-green-200 rounded-lg py-2.5 active:bg-green-100 transition-all">
                              <View className="i-mdi-car text-green-600 text-base mr-1.5" />
                              <Text className="text-green-700 text-sm font-medium">车辆管理</Text>
                            </View>
                            {/* 仓库分配按钮 - 仅在权限启用时显示 */}
                            {managerPermissionsEnabled && (
                              <View
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleWarehouseAssignClick(driver)
                                }}
                                className="flex items-center justify-center bg-purple-50 border border-purple-200 rounded-lg py-2.5 active:bg-purple-100 transition-all">
                                <View className="i-mdi-warehouse text-purple-600 text-base mr-1.5" />
                                <Text className="text-purple-700 text-sm font-medium">仓库分配</Text>
                              </View>
                            )}
                            {/* 司机类型切换按钮 - 仅在权限启用时显示 */}
                            {managerPermissionsEnabled && (
                              <View
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleDriverType(driver)
                                }}
                                className="flex items-center justify-center bg-orange-50 border border-orange-200 rounded-lg py-2.5 active:bg-orange-100 transition-all">
                                <View className="i-mdi-swap-horizontal text-orange-600 text-base mr-1.5" />
                                <Text className="text-orange-700 text-xs font-medium">
                                  {driver.driver_type === 'with_vehicle' ? '切换为纯司机' : '切换为带车司机'}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* 仓库分配面板 */}
                          {warehouseAssignExpanded === driver.id && (
                            <View className="px-3 pb-3 bg-gray-50 border-t border-gray-200">
                              <View className="bg-white rounded-lg p-3 mt-2">
                                <View className="flex items-center justify-between mb-3">
                                  <View className="flex items-center">
                                    <View className="i-mdi-warehouse text-purple-600 text-lg mr-2" />
                                    <Text className="text-gray-800 text-sm font-bold">选择仓库</Text>
                                  </View>
                                  <Text className="text-gray-500 text-xs">已选 {selectedWarehouseIds.length} 个</Text>
                                </View>
                                <CheckboxGroup
                                  onChange={(e) => {
                                    setSelectedWarehouseIds(e.detail.value as string[])
                                  }}>
                                  <View className="space-y-2 max-h-60 overflow-y-auto">
                                    {warehouses.map((warehouse) => (
                                      <View key={warehouse.id} className="flex items-center bg-gray-50 rounded-lg p-2">
                                        <Checkbox
                                          value={warehouse.id}
                                          checked={selectedWarehouseIds.includes(warehouse.id)}
                                          className="mr-2"
                                        />
                                        <View className="flex-1">
                                          <Text className="text-gray-800 text-sm font-medium block">
                                            {warehouse.name}
                                          </Text>
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                </CheckboxGroup>
                                <View className="flex gap-2 mt-3">
                                  <Button
                                    size="default"
                                    className="flex-1 bg-gray-100 border border-gray-300 text-gray-700 py-2 rounded text-sm"
                                    onClick={() => {
                                      setWarehouseAssignExpanded(null)
                                      setSelectedWarehouseIds([])
                                    }}>
                                    取消
                                  </Button>
                                  <Button
                                    size="default"
                                    className="flex-1 bg-purple-50 border border-purple-300 text-purple-700 py-2 rounded text-sm"
                                    onClick={() => handleSaveWarehouseAssignment(driver.id)}>
                                    保存
                                  </Button>
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                ) : searchKeyword ? (
                  <View className="text-center py-8">
                    <View className="i-mdi-account-search text-gray-300 text-5xl mb-2" />
                    <Text className="text-gray-400 text-sm block">未找到匹配的司机</Text>
                  </View>
                ) : (
                  <View className="text-center py-8">
                    <View className="i-mdi-account-off text-gray-300 text-5xl mb-2" />
                    <Text className="text-gray-400 text-sm block">暂无司机</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
    </ErrorBoundary>
  )
}

export default DriverManagement
