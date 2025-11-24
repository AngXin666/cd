/**
 * 老板 - 车辆管理页面
 * 显示所有已录入的车辆信息，包括车牌号和使用人
 */

import {Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {supabase} from '@/client/supabase'
import {getAllVehiclesWithDrivers} from '@/db/api'
import type {VehicleWithDriver} from '@/db/types'
import {getVersionedCache, setVersionedCache} from '@/utils/cache'
import {createLogger} from '@/utils/logger'

// 创建页面日志记录器
const logger = createLogger('SuperAdminVehicleManagement')

const VehicleManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicles, setVehicles] = useState<VehicleWithDriver[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleWithDriver[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  // 存储每辆车的历史记录数量
  const [vehicleHistoryCount, setVehicleHistoryCount] = useState<Map<string, number>>(new Map())

  // 加载车辆列表（带缓存）
  const loadVehicles = useCallback(async () => {
    logger.info('开始加载车辆列表')
    setLoading(true)
    try {
      // 生成缓存键
      const cacheKey = 'super_admin_all_vehicles'
      const cached = getVersionedCache<VehicleWithDriver[]>(cacheKey)

      let data: VehicleWithDriver[]

      if (cached) {
        logger.info('✅ 使用缓存的车辆列表', {vehicleCount: cached.length})
        data = cached
      } else {
        logger.info('🔄 从数据库加载车辆列表')
        data = await getAllVehiclesWithDrivers()
        logger.info('📊 API返回的原始数据', {
          dataLength: data.length,
          data: data
        })
        // 保存到缓存（5分钟有效期）
        setVersionedCache(cacheKey, data, 5 * 60 * 1000)
      }

      logger.info('📝 设置车辆列表状态', {
        vehicleCount: data.length,
        vehicles: data
      })
      setVehicles(data)
      setFilteredVehicles(data)

      // 查询每辆车的历史记录数量
      const historyCountMap = new Map<string, number>()
      for (const vehicle of data) {
        try {
          const {count, error} = await supabase
            .from('vehicles')
            .select('*', {count: 'exact', head: true})
            .eq('plate_number', vehicle.plate_number)

          if (!error && count !== null) {
            historyCountMap.set(vehicle.plate_number, count)
            logger.info('📊 车辆历史记录数量', {
              plateNumber: vehicle.plate_number,
              count: count
            })
          }
        } catch (err) {
          logger.warn('查询历史记录数量失败', {
            plateNumber: vehicle.plate_number,
            error: err
          })
        }
      }
      setVehicleHistoryCount(historyCountMap)

      logger.info('✅ 车辆列表加载成功', {vehicleCount: data.length})
    } catch (error) {
      logger.error('❌ 加载车辆列表失败', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  // 页面显示时加载数据
  useDidShow(() => {
    // 清除缓存，强制重新加载
    const cacheKey = 'super_admin_all_vehicles'
    try {
      Taro.removeStorageSync(cacheKey)
      logger.info('🗑️ 已清除缓存')
    } catch (e) {
      logger.warn('清除缓存失败', e)
    }
    loadVehicles()
  })

  // 下拉刷新
  usePullDownRefresh(() => {
    loadVehicles().finally(() => {
      Taro.stopPullDownRefresh()
    })
  })

  // 搜索过滤
  const handleSearch = useCallback(
    (value: string) => {
      setSearchText(value)
      if (!value.trim()) {
        setFilteredVehicles(vehicles)
        return
      }

      const filtered = vehicles.filter(
        (vehicle) =>
          vehicle.plate_number.toLowerCase().includes(value.toLowerCase()) ||
          vehicle.driver_name?.toLowerCase().includes(value.toLowerCase()) ||
          vehicle.brand?.toLowerCase().includes(value.toLowerCase()) ||
          vehicle.model?.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredVehicles(filtered)
    },
    [vehicles]
  )

  // 查看车辆详情
  const handleViewDetail = (vehicleId: string) => {
    Taro.navigateTo({
      url: `/pages/driver/vehicle-detail/index?id=${vehicleId}`
    })
  }

  // 查看司机详情
  const handleViewDriver = (driverId: string) => {
    Taro.navigateTo({
      url: `/pages/super-admin/user-detail/index?id=${driverId}`
    })
  }

  // 查看车辆历史记录
  const handleViewHistory = (plateNumber: string) => {
    Taro.navigateTo({
      url: `/pages/super-admin/vehicle-history/index?plateNumber=${encodeURIComponent(plateNumber)}`
    })
  }

  // 车辆审核
  const handleReview = (vehicleId: string) => {
    Taro.navigateTo({
      url: `/pages/super-admin/vehicle-review-detail/index?vehicleId=${vehicleId}`
    })
  }

  // 编辑租赁信息
  const handleEditRental = (vehicleId: string) => {
    Taro.navigateTo({
      url: `/pages/super-admin/vehicle-rental-edit/index?vehicleId=${vehicleId}`
    })
  }

  /**
   * 判断车辆是否需要显示审核按钮
   * 仅当车辆状态为"待审核"或"需补录"时显示
   */
  const shouldShowReviewButton = (vehicle: VehicleWithDriver): boolean => {
    return vehicle.review_status === 'pending_review' || vehicle.review_status === 'need_supplement'
  }

  /**
   * 判断车辆是否有历史记录
   * 1. 如果该车牌号有多条记录（大于1条），说明有历史记录
   * 2. 如果车辆状态为 inactive 或 returned（已停用/已还车），也显示历史记录按钮
   */
  const hasHistory = (vehicle: VehicleWithDriver): boolean => {
    const count = vehicleHistoryCount.get(vehicle.plate_number) || 0
    // 如果车辆已停用或已还车，显示历史记录按钮
    const isInactive = vehicle.status === 'inactive' || vehicle.status === 'returned'
    // 如果有多条记录，也显示历史记录按钮
    const hasMultipleRecords = count > 1
    const result = isInactive || hasMultipleRecords
    logger.info('🔍 检查车辆历史记录', {
      plateNumber: vehicle.plate_number,
      status: vehicle.status,
      count: count,
      isInactive: isInactive,
      hasMultipleRecords: hasMultipleRecords,
      hasHistory: result
    })
    return result
  }

  // 获取状态样式
  const _getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-green-100',
          text: 'text-green-600',
          label: '使用中'
        }
      case 'inactive':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          label: '已停用'
        }
      case 'maintenance':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-600',
          label: '维护中'
        }
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          label: '未知'
        }
    }
  }

  /**
   * 获取车辆综合状态标识
   * 根据review_status和status综合判断显示的状态
   */
  const getVehicleStatusBadge = (
    vehicle: VehicleWithDriver
  ): {text: string; bg: string; textColor: string; icon: string} => {
    // 优先判断审核状态
    if (vehicle.review_status === 'pending_review') {
      return {
        text: '审核中',
        bg: 'bg-orange-100',
        textColor: 'text-orange-600',
        icon: 'i-mdi-clock-outline'
      }
    }

    if (vehicle.review_status === 'need_supplement') {
      return {
        text: '需补录',
        bg: 'bg-red-100',
        textColor: 'text-red-600',
        icon: 'i-mdi-alert-circle'
      }
    }

    // 审核通过后，根据车辆状态判断
    if (vehicle.review_status === 'approved') {
      if (vehicle.status === 'returned' || vehicle.status === 'inactive') {
        return {
          text: '已停用',
          bg: 'bg-gray-100',
          textColor: 'text-gray-600',
          icon: 'i-mdi-close-circle'
        }
      }

      // 已提车或使用中
      return {
        text: '已启用',
        bg: 'bg-green-100',
        textColor: 'text-green-600',
        icon: 'i-mdi-check-circle'
      }
    }

    // 默认状态
    return {
      text: '未知',
      bg: 'bg-gray-100',
      textColor: 'text-gray-600',
      icon: 'i-mdi-help-circle'
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between">
              <View className="flex-1">
                <View className="flex items-center mb-2">
                  <View className="i-mdi-car-multiple text-3xl text-white mr-3"></View>
                  <Text className="text-2xl font-bold text-white">车辆管理</Text>
                </View>
                <Text className="text-blue-100 text-sm">查看和管理所有车辆信息</Text>
              </View>
              <View className="bg-white/20 backdrop-blur rounded-full px-4 py-2">
                <Text className="text-white text-lg font-bold">{filteredVehicles.length}</Text>
                <Text className="text-blue-100 text-xs">辆</Text>
              </View>
            </View>
          </View>

          {/* 搜索框 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center bg-gray-50 rounded-lg px-3 py-2">
              <View className="i-mdi-magnify text-xl text-gray-400 mr-2"></View>
              <View style={{overflow: 'hidden', flex: 1}}>
                <Input
                  className="flex-1 text-sm"
                  placeholder="搜索车牌号、司机姓名、品牌型号..."
                  value={searchText}
                  onInput={(e) => handleSearch(e.detail.value)}
                />
              </View>
              {searchText && (
                <View className="i-mdi-close-circle text-lg text-gray-400 ml-2" onClick={() => handleSearch('')}></View>
              )}
            </View>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-3 gap-3 mb-4">
            <View className="bg-white rounded-xl p-3 shadow-md">
              <View className="flex items-center justify-center mb-2">
                <View className="i-mdi-car text-2xl text-blue-600"></View>
              </View>
              <Text className="text-center text-xs text-gray-600 mb-1">总车辆</Text>
              <Text className="text-center text-xl font-bold text-gray-800">{vehicles.length}</Text>
            </View>
            <View className="bg-white rounded-xl p-3 shadow-md">
              <View className="flex items-center justify-center mb-2">
                <View className="i-mdi-check-circle text-2xl text-green-600"></View>
              </View>
              <Text className="text-center text-xs text-gray-600 mb-1">使用中</Text>
              <Text className="text-center text-xl font-bold text-gray-800">
                {vehicles.filter((v) => v.status === 'active').length}
              </Text>
            </View>
            <View className="bg-white rounded-xl p-3 shadow-md">
              <View className="flex items-center justify-center mb-2">
                <View className="i-mdi-account-check text-2xl text-purple-600"></View>
              </View>
              <Text className="text-center text-xs text-gray-600 mb-1">已分配</Text>
              <Text className="text-center text-xl font-bold text-gray-800">
                {vehicles.filter((v) => v.driver_id).length}
              </Text>
            </View>
          </View>

          {/* 车辆列表 */}
          {loading ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-loading animate-spin text-5xl text-blue-600 mb-4"></View>
              <Text className="text-gray-600 font-medium">加载中...</Text>
            </View>
          ) : filteredVehicles.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 shadow-md">
              <View className="flex flex-col items-center justify-center py-12">
                <View className="bg-blue-50 rounded-full p-6 mb-4">
                  <View className="i-mdi-car-off text-6xl text-blue-300"></View>
                </View>
                <Text className="text-gray-800 text-lg font-medium mb-2">
                  {searchText ? '未找到匹配的车辆' : '暂无车辆信息'}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {searchText ? '请尝试其他搜索关键词' : '司机还未添加车辆'}
                </Text>
              </View>
            </View>
          ) : (
            <View className="space-y-4">
              {filteredVehicles.map((vehicle) => {
                const statusBadge = getVehicleStatusBadge(vehicle)
                return (
                  <View
                    key={vehicle.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-lg active:scale-98 transition-all">
                    {/* 车辆照片 */}
                    {vehicle.left_front_photo && (
                      <View className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                        <Image src={vehicle.left_front_photo} mode="aspectFill" className="w-full h-full" />
                        {/* 状态标签 - 使用综合状态 */}
                        <View className="absolute top-3 right-3">
                          <View className={`backdrop-blur rounded-full px-3 py-1 flex items-center ${statusBadge.bg}`}>
                            <View className={`${statusBadge.icon} text-sm mr-1 ${statusBadge.textColor}`}></View>
                            <Text className={`text-xs font-medium ${statusBadge.textColor}`}>{statusBadge.text}</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 车辆信息 */}
                    <View className="p-4">
                      {/* 车牌号和品牌 */}
                      <View className="mb-3">
                        <View className="flex items-center mb-2">
                          <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 mr-2">
                            <Text className="text-white text-lg font-bold">{vehicle.plate_number}</Text>
                          </View>
                          {!vehicle.left_front_photo && (
                            <View className={`rounded-full px-3 py-1 flex items-center ${statusBadge.bg}`}>
                              <View className={`${statusBadge.icon} text-sm mr-1 ${statusBadge.textColor}`}></View>
                              <Text className={`text-xs font-medium ${statusBadge.textColor}`}>{statusBadge.text}</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-gray-800 text-base font-medium">
                          {vehicle.brand} {vehicle.model}
                        </Text>
                      </View>

                      {/* 使用人信息 */}
                      {vehicle.driver_id && vehicle.driver_name ? (
                        <View
                          className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-3 mb-3"
                          onClick={() => handleViewDriver(vehicle.driver_id!)}>
                          <View className="flex items-center justify-between">
                            <View className="flex items-center flex-1">
                              <View className="bg-purple-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                                <View className="i-mdi-account text-xl text-purple-700"></View>
                              </View>
                              <View className="flex-1">
                                <Text className="text-xs text-purple-600 mb-1 block">使用人</Text>
                                <Text className="text-sm text-purple-900 font-medium block">{vehicle.driver_name}</Text>
                                {vehicle.driver_phone && (
                                  <Text className="text-xs text-purple-700 block">{vehicle.driver_phone}</Text>
                                )}
                              </View>
                            </View>
                            <View className="i-mdi-chevron-right text-xl text-purple-400"></View>
                          </View>
                        </View>
                      ) : (
                        <View className="bg-gray-50 rounded-xl p-3 mb-3">
                          <View className="flex items-center">
                            <View className="bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                              <View className="i-mdi-account-off text-xl text-gray-500"></View>
                            </View>
                            <View className="flex-1">
                              <Text className="text-xs text-gray-500 mb-1 block">使用人</Text>
                              <Text className="text-sm text-gray-600 font-medium block">未分配</Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* 租赁信息 - 始终显示 */}
                      <View className="mb-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200">
                        <View className="flex items-center justify-between mb-2">
                          <View className="flex items-center">
                            <View className="i-mdi-file-document-outline text-base text-amber-600 mr-1"></View>
                            <Text className="text-xs font-bold text-amber-800">租赁信息</Text>
                          </View>
                          {/* 编辑按钮 */}
                          <View
                            className="flex items-center bg-amber-600 rounded-full px-2 py-1 active:scale-95 transition-all"
                            onClick={() => handleEditRental(vehicle.id)}>
                            <View className="i-mdi-pencil text-xs text-white mr-0.5"></View>
                            <Text className="text-xs text-white font-medium">编辑</Text>
                          </View>
                        </View>
                        <View className="space-y-1.5">
                          {/* 车辆归属类型 */}
                          <View className="flex items-start">
                            <Text className="text-xs text-gray-600 w-16 flex-shrink-0">车辆类型：</Text>
                            <Text className="text-xs text-gray-800 flex-1">
                              {vehicle.ownership_type === 'company'
                                ? '公司车'
                                : vehicle.ownership_type === 'personal'
                                  ? '个人车'
                                  : '未设置'}
                            </Text>
                          </View>

                          {/* 租赁方 */}
                          <View className="flex items-start">
                            <Text className="text-xs text-gray-600 w-16 flex-shrink-0">租赁方：</Text>
                            <Text className="text-xs text-gray-800 flex-1">{vehicle.lessor_name || '未设置'}</Text>
                          </View>

                          {/* 承租方 */}
                          <View className="flex items-start">
                            <Text className="text-xs text-gray-600 w-16 flex-shrink-0">承租方：</Text>
                            <Text className="text-xs text-gray-800 flex-1">{vehicle.lessee_name || '未设置'}</Text>
                          </View>

                          {/* 租期 */}
                          <View className="flex items-start">
                            <Text className="text-xs text-gray-600 w-16 flex-shrink-0">租期：</Text>
                            <Text className="text-xs text-gray-800 flex-1">
                              {vehicle.lease_start_date
                                ? new Date(vehicle.lease_start_date).toLocaleDateString('zh-CN')
                                : '未设置'}
                              {' 至 '}
                              {vehicle.lease_end_date
                                ? new Date(vehicle.lease_end_date).toLocaleDateString('zh-CN')
                                : '未设置'}
                            </Text>
                          </View>

                          {/* 交租时间 */}
                          <View className="flex items-start">
                            <Text className="text-xs text-gray-600 w-16 flex-shrink-0">交租时间：</Text>
                            <Text className="text-xs text-gray-800 flex-1">
                              {vehicle.rent_payment_day ? `每月${vehicle.rent_payment_day}号` : '未设置'}
                            </Text>
                          </View>

                          {/* 月租金 */}
                          <View className="flex items-start">
                            <Text className="text-xs text-gray-600 w-16 flex-shrink-0">月租金：</Text>
                            <Text className="text-xs font-bold text-amber-700 flex-1">
                              {vehicle.monthly_rent !== undefined && vehicle.monthly_rent !== null
                                ? `¥${vehicle.monthly_rent.toLocaleString()}`
                                : '未设置'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* 车辆详细信息 */}
                      <View className="flex flex-wrap gap-2 mb-4">
                        {vehicle.color && (
                          <View className="flex items-center bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-1.5 rounded-lg">
                            <View className="i-mdi-palette text-base text-purple-600 mr-1"></View>
                            <Text className="text-xs text-purple-700 font-medium">{vehicle.color}</Text>
                          </View>
                        )}
                        {vehicle.vehicle_type && (
                          <View className="flex items-center bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-1.5 rounded-lg">
                            <View className="i-mdi-car-info text-base text-blue-600 mr-1"></View>
                            <Text className="text-xs text-blue-700 font-medium">{vehicle.vehicle_type}</Text>
                          </View>
                        )}
                        {vehicle.vin && (
                          <View className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-1.5 rounded-lg">
                            <View className="i-mdi-barcode text-base text-gray-600 mr-1"></View>
                            <Text className="text-xs text-gray-700 font-medium">{vehicle.vin.slice(0, 8)}...</Text>
                          </View>
                        )}
                      </View>

                      {/* 操作按钮 - 始终显示 */}
                      <View className="flex flex-col gap-2">
                        {/* 第一行：查看详情、查看司机、车辆审核 */}
                        <View className="flex gap-2">
                          {/* 查看详情按钮 */}
                          <View
                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg py-2 active:scale-95 transition-all"
                            onClick={() => handleViewDetail(vehicle.id)}>
                            <View className="flex items-center justify-center">
                              <View className="i-mdi-eye text-base text-white mr-1"></View>
                              <Text className="text-white text-sm font-medium">查看详情</Text>
                            </View>
                          </View>

                          {/* 查看司机按钮 - 仅当有司机时显示 */}
                          {vehicle.driver_id && (
                            <View
                              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg py-2 active:scale-95 transition-all"
                              onClick={() => handleViewDriver(vehicle.driver_id!)}>
                              <View className="flex items-center justify-center">
                                <View className="i-mdi-account text-base text-white mr-1"></View>
                                <Text className="text-white text-sm font-medium">查看司机</Text>
                              </View>
                            </View>
                          )}

                          {/* 车辆审核按钮 - 仅当需要审核时显示 */}
                          {shouldShowReviewButton(vehicle) && (
                            <View
                              className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg py-2 active:scale-95 transition-all"
                              onClick={() => handleReview(vehicle.id)}>
                              <View className="flex items-center justify-center">
                                <View className="i-mdi-clipboard-check text-base text-white mr-1"></View>
                                <Text className="text-white text-sm font-medium">车辆审核</Text>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* 第二行：查看历史记录 - 仅当有历史记录时显示 */}
                        {hasHistory(vehicle) && (
                          <View
                            className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg py-2 active:scale-95 transition-all"
                            onClick={() => handleViewHistory(vehicle.plate_number)}>
                            <View className="flex items-center justify-center">
                              <View className="i-mdi-history text-base text-white mr-1"></View>
                              <Text className="text-white text-sm font-medium">查看历史记录</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default VehicleManagement
