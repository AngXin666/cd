/**
 * 车辆列表页面 - 提车/还车管理版
 * 显示司机名下的所有车辆
 * 支持管理员查看指定司机的车辆
 * 功能：
 * - 提车录入：添加新车辆时自动记录提车时间
 * - 还车录入：对已提车的车辆进行还车操作
 * - 动态按钮：根据车辆状态显示不同的操作按钮
 * - 智能控制：有未还车车辆时隐藏"添加新车辆"按钮
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {debugAuthStatus, getDriverVehicles, getProfileById} from '@/db/api'
import type {Profile, Vehicle} from '@/db/types'
import {getVersionedCache, setVersionedCache} from '@/utils/cache'
import {createLogger} from '@/utils/logger'

// 创建页面日志记录器
const logger = createLogger('VehicleList')

const VehicleList: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [targetDriverId, setTargetDriverId] = useState<string>('')
  const [targetDriver, setTargetDriver] = useState<Profile | null>(null)
  const [isManagerView, setIsManagerView] = useState(false)
  const [initialized, setInitialized] = useState(false) // 添加初始化标记

  // 加载司机信息
  const loadDriverInfo = useCallback(async (driverId: string) => {
    logger.info('loadDriverInfo被调用', {
      driverId,
      callStack: new Error().stack?.split('\n').slice(0, 5).join('\n')
    })
    try {
      const driver = await getProfileById(driverId)
      setTargetDriver(driver)
      logger.info('司机信息加载成功', {
        driverId,
        driverName: driver?.name,
        driverRole: driver?.role
      })
    } catch (error) {
      logger.error('加载司机信息失败', error)
    }
  }, [])

  // 获取URL参数中的司机ID（只在组件挂载时执行一次）
  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    logger.info('页面参数', {params})
    if (params?.driverId) {
      const driverId = params.driverId
      setTargetDriverId(driverId)
      setIsManagerView(true)
      logger.info('管理员查看模式', {targetDriverId: driverId})
      // 加载司机信息
      loadDriverInfo(driverId)
    } else {
      logger.info('司机自己查看模式', {userId: user?.id})
      // 清空targetDriverId，确保使用当前用户ID
      setTargetDriverId('')
      setIsManagerView(false)
    }
    // 标记初始化完成
    setInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // 加载司机信息
    loadDriverInfo,
    user?.id
  ]) // 只在组件挂载时执行一次

  // 加载车辆列表（带缓存）
  const loadVehicles = useCallback(async () => {
    // 如果是管理员查看模式，使用targetDriverId，否则使用当前用户ID
    const driverId = targetDriverId || user?.id

    logger.info('loadVehicles被调用', {
      targetDriverId,
      userId: user?.id,
      finalDriverId: driverId,
      isManagerView
    })

    if (!driverId) {
      logger.warn('无法加载车辆：缺少司机ID', {targetDriverId, userId: user?.id})
      return
    }

    logger.info('开始加载车辆列表', {driverId, isManagerView})
    setLoading(true)
    try {
      // 生成缓存键
      const cacheKey = `driver_vehicles_${driverId}`
      const cached = getVersionedCache<Vehicle[]>(cacheKey)

      let data: Vehicle[]

      if (cached) {
        logger.info('✅ 使用缓存的车辆列表', {driverId, vehicleCount: cached.length})
        data = cached
      } else {
        logger.info('🔄 从数据库加载车辆列表', {driverId})
        // 调试：检查认证状态
        const authStatus = await debugAuthStatus()
        logger.info('认证状态检查', authStatus)

        // 如果认证用户ID与查询的司机ID不匹配，记录警告
        if (authStatus.userId && authStatus.userId !== driverId && !isManagerView) {
          logger.warn('认证用户ID与查询司机ID不匹配', {
            authUserId: authStatus.userId,
            queryDriverId: driverId
          })
        }

        data = await getDriverVehicles(driverId)
        // 保存到缓存（3分钟有效期）
        setVersionedCache(cacheKey, data, 3 * 60 * 1000)
      }

      setVehicles(data)
      logger.info('车辆列表加载成功', {
        driverId,
        vehicleCount: data.length,
        vehicles: data.map((v) => ({id: v.id, plate: v.plate_number}))
      })
    } catch (error) {
      logger.error('加载车辆列表失败', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [user, targetDriverId, isManagerView])

  // 页面显示时加载数据（只在初始化完成后）
  useDidShow(() => {
    logger.info('useDidShow被调用', {
      initialized,
      targetDriverId,
      userId: user?.id,
      isManagerView
    })
    // 只在初始化完成后才加载数据
    if (initialized) {
      loadVehicles()
    }
  })

  // 当初始化完成后，加载车辆列表
  useEffect(() => {
    if (initialized) {
      logger.info('初始化完成，加载车辆', {targetDriverId, userId: user?.id})
      loadVehicles()
    }
  }, [initialized, loadVehicles])

  // 添加车辆
  const handleAddVehicle = () => {
    Taro.navigateTo({
      url: '/pages/driver/add-vehicle/index'
    })
  }

  // 查看车辆详情
  const handleViewDetail = (vehicleId: string) => {
    Taro.navigateTo({
      url: `/pages/driver/vehicle-detail/index?id=${vehicleId}`
    })
  }

  // 还车录入
  const handleReturnVehicle = (vehicleId: string, plateNumber: string) => {
    Taro.navigateTo({
      url: `/pages/driver/return-vehicle/index?id=${vehicleId}&plate=${plateNumber}`
    })
  }

  // 判断是否应该显示"添加新车辆"按钮
  const shouldShowAddButton = (): boolean => {
    // 如果没有车辆，显示按钮
    if (vehicles.length === 0) return true
    
    // 如果有任何车辆处于"已提车未还车"状态（active 且未还车），隐藏按钮
    const hasPickedUpVehicle = vehicles.some(v => 
      v.status === 'active' && 
      v.review_status === 'approved' && 
      !v.return_time
    )
    return !hasPickedUpVehicle
  }

  // 获取车辆状态显示文本
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'picked_up':
        return '已提车'
      case 'returned':
        return '已还车'
      case 'active':
        return '使用中'
      case 'inactive':
        return '已停用'
      case 'maintenance':
        return '维护中'
      default:
        return status
    }
  }

  // 获取车辆状态颜色
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'picked_up':
        return 'bg-green-500'
      case 'returned':
        return 'bg-gray-500'
      case 'active':
        return 'bg-blue-500'
      case 'inactive':
        return 'bg-red-500'
      case 'maintenance':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  // 获取审核状态显示文本
  const getReviewStatusText = (reviewStatus: string): string => {
    switch (reviewStatus) {
      case 'drafting':
        return '录入中'
      case 'pending_review':
        return '待审核'
      case 'need_supplement':
        return '需补录'
      case 'approved':
        return '审核通过'
      default:
        return reviewStatus
    }
  }

  // 获取审核状态颜色
  const getReviewStatusColor = (reviewStatus: string): string => {
    switch (reviewStatus) {
      case 'drafting':
        return 'bg-gray-500'
      case 'pending_review':
        return 'bg-orange-500'
      case 'need_supplement':
        return 'bg-red-500'
      case 'approved':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  /**
   * 获取车辆综合状态标识
   * 根据review_status和status综合判断显示的状态
   */
  const getVehicleStatusBadge = (vehicle: Vehicle): {text: string; color: string; icon: string} => {
    // 优先判断审核状态
    if (vehicle.review_status === 'need_supplement') {
      return {
        text: '需补录',
        color: 'bg-red-500',
        icon: 'i-mdi-alert-circle'
      }
    }

    // 审核通过后，根据车辆状态判断
    if (vehicle.review_status === 'approved') {
      if (vehicle.status === 'returned' || vehicle.status === 'inactive') {
        return {
          text: '已停用',
          color: 'bg-gray-500',
          icon: 'i-mdi-close-circle'
        }
      }

      // 已提车或使用中
      return {
        text: '已启用',
        color: 'bg-green-500',
        icon: 'i-mdi-check-circle'
      }
    }

    // 默认状态
    return {
      text: '未知',
      color: 'bg-gray-400',
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
                  <Text className="text-2xl font-bold text-white">{isManagerView ? '司机车辆' : '我的车辆'}</Text>
                </View>
                <Text className="text-blue-100 text-sm">
                  {isManagerView ? `查看 ${targetDriver?.name || '司机'} 的车辆信息` : '管理您的车辆信息'}
                </Text>
              </View>
              <View className="bg-white/20 backdrop-blur rounded-full px-4 py-2">
                <Text className="text-white text-lg font-bold">{vehicles.length}</Text>
                <Text className="text-blue-100 text-xs">辆</Text>
              </View>
            </View>
          </View>

          {/* 管理员查看提示 */}
          {isManagerView && targetDriver && (
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <View className="flex items-start">
                <View className="i-mdi-information text-blue-600 text-xl mr-2 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-blue-800 text-sm block mb-1 font-medium">管理员查看模式</Text>
                  <Text className="text-blue-700 text-xs block mb-1">司机姓名：{targetDriver.name || '未设置'}</Text>
                  <Text className="text-blue-700 text-xs block">
                    联系方式：{targetDriver.phone || targetDriver.email}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 添加车辆按钮 - 只在司机自己的视图且满足条件时显示 */}
          {!isManagerView && shouldShowAddButton() && (
            <View className="mb-4">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl break-keep text-base shadow-lg"
                size="default"
                onClick={handleAddVehicle}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-plus-circle-outline text-2xl mr-2"></View>
                  <Text className="font-medium">添加新车辆（提车录入）</Text>
                </View>
              </Button>
            </View>
          )}

          {/* 车辆列表 */}
          {loading ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-loading animate-spin text-5xl text-blue-600 mb-4"></View>
              <Text className="text-gray-600 font-medium">加载中...</Text>
            </View>
          ) : vehicles.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 shadow-md">
              <View className="flex flex-col items-center justify-center py-12">
                <View className="bg-blue-50 rounded-full p-6 mb-4">
                  <View className="i-mdi-car-off text-6xl text-blue-300"></View>
                </View>
                <Text className="text-gray-800 text-lg font-medium mb-2">暂无车辆信息</Text>
                <Text className="text-gray-500 text-sm mb-4">
                  {isManagerView ? '该司机还未添加车辆' : '点击上方按钮添加您的第一辆车'}
                </Text>

                {/* 调试信息 */}
                {process.env.NODE_ENV === 'development' && (
                  <View className="mt-6 w-full bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <Text className="text-gray-700 text-xs font-medium mb-2 block">调试信息：</Text>
                    <Text className="text-gray-600 text-xs block mb-1">当前用户ID: {user?.id || '未获取'}</Text>
                    <Text className="text-gray-600 text-xs block mb-1">
                      查询司机ID: {targetDriverId || user?.id || '未设置'}
                    </Text>
                    <Text className="text-gray-600 text-xs block mb-1">
                      查看模式: {isManagerView ? '管理员查看' : '司机自己查看'}
                    </Text>
                    <Text className="text-gray-600 text-xs block">请查看浏览器控制台获取详细日志</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View className="space-y-4">
              {vehicles.map((vehicle) => (
                <View
                  key={vehicle.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg active:scale-98 transition-all"
                  onClick={() => handleViewDetail(vehicle.id)}>
                  {/* 车辆照片 */}
                  {vehicle.left_front_photo && (
                    <View className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                      <Image 
                        src={vehicle.left_front_photo} 
                        mode="aspectFill" 
                        className="w-full h-full"
                        onError={() => logger.error('车辆照片加载失败', {vehicleId: vehicle.id, photo: vehicle.left_front_photo})}
                      />
                      {/* 状态标签 - 使用综合状态 */}
                      <View className="absolute top-3 right-3">
                        <View
                          className={`backdrop-blur rounded-full px-3 py-1 ${getVehicleStatusBadge(vehicle).color}/90`}>
                          <View className="flex items-center">
                            <View className={`${getVehicleStatusBadge(vehicle).icon} text-white text-sm mr-1`}></View>
                            <Text className="text-white text-xs font-medium">
                              {getVehicleStatusBadge(vehicle).text}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* 车辆信息 */}
                  <View className="p-4">
                    {/* 车牌号和品牌 */}
                    <View className="mb-3">
                      <View className="flex items-center mb-2 flex-wrap gap-2">
                        <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1">
                          <Text className="text-white text-lg font-bold">{vehicle.plate_number}</Text>
                        </View>
                        {/* 综合状态标签 */}
                        <View className={`rounded-full px-3 py-1 flex items-center ${getVehicleStatusBadge(vehicle).color}`}>
                          <View className={`${getVehicleStatusBadge(vehicle).icon} text-white text-sm mr-1`}></View>
                          <Text className="text-white text-xs font-medium">
                            {getVehicleStatusBadge(vehicle).text}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-gray-800 text-base font-medium">
                        {vehicle.brand} {vehicle.model}
                      </Text>
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
                          <Text className="text-xs text-gray-700 font-medium">VIN: {vehicle.vin.slice(-6)}</Text>
                        </View>
                      )}
                    </View>

                    {/* 租赁信息 */}
                    {(vehicle.lessor_name || vehicle.lessee_name || vehicle.monthly_rent) && (
                      <View className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200">
                        <View className="flex items-center mb-2">
                          <View className="i-mdi-file-document-outline text-base text-amber-600 mr-1"></View>
                          <Text className="text-xs font-bold text-amber-800">租赁信息</Text>
                        </View>
                        <View className="space-y-1.5">
                          {vehicle.lessor_name && (
                            <View className="flex items-start">
                              <Text className="text-xs text-gray-600 w-16 flex-shrink-0">租赁方：</Text>
                              <Text className="text-xs text-gray-800 flex-1">{vehicle.lessor_name}</Text>
                            </View>
                          )}
                          {vehicle.lessee_name && (
                            <View className="flex items-start">
                              <Text className="text-xs text-gray-600 w-16 flex-shrink-0">承租方：</Text>
                              <Text className="text-xs text-gray-800 flex-1">{vehicle.lessee_name}</Text>
                            </View>
                          )}
                          {(vehicle.lease_start_date || vehicle.lease_end_date) && (
                            <View className="flex items-start">
                              <Text className="text-xs text-gray-600 w-16 flex-shrink-0">租期：</Text>
                              <Text className="text-xs text-gray-800 flex-1">
                                {vehicle.lease_start_date ? new Date(vehicle.lease_start_date).toLocaleDateString('zh-CN') : '未设置'}
                                {' 至 '}
                                {vehicle.lease_end_date ? new Date(vehicle.lease_end_date).toLocaleDateString('zh-CN') : '未设置'}
                              </Text>
                            </View>
                          )}
                          {vehicle.rent_payment_day && (
                            <View className="flex items-start">
                              <Text className="text-xs text-gray-600 w-16 flex-shrink-0">交租时间：</Text>
                              <Text className="text-xs text-gray-800 flex-1">每月{vehicle.rent_payment_day}号</Text>
                            </View>
                          )}
                          {vehicle.monthly_rent !== undefined && vehicle.monthly_rent !== null && (
                            <View className="flex items-start">
                              <Text className="text-xs text-gray-600 w-16 flex-shrink-0">月租金：</Text>
                              <Text className="text-xs font-bold text-amber-700 flex-1">¥{vehicle.monthly_rent.toLocaleString()}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* 提车/还车时间 */}
                    {(vehicle.pickup_time || vehicle.return_time) && (
                      <View className="mb-4 space-y-2">
                        {vehicle.pickup_time && (
                          <View className="flex items-center">
                            <View className="i-mdi-clock-check-outline text-base text-green-600 mr-2"></View>
                            <Text className="text-xs text-gray-600">
                              提车时间：{new Date(vehicle.pickup_time).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          </View>
                        )}
                        {vehicle.return_time && (
                          <View className="flex items-center">
                            <View className="i-mdi-clock-check text-base text-gray-600 mr-2"></View>
                            <Text className="text-xs text-gray-600">
                              还车时间：{new Date(vehicle.return_time).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* 操作按钮 */}
                    <View className="flex gap-2 pt-3 border-t border-gray-100">
                      {/* 根据审核状态显示不同的按钮 */}
                      {vehicle.review_status === 'need_supplement' && !isManagerView ? (
                        // 需补录状态：显示补录按钮
                        <Button
                          className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-2.5 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all"
                          size="default"
                          onClick={(e) => {
                            e.stopPropagation()
                            Taro.navigateTo({url: `/pages/driver/supplement-photos/index?vehicleId=${vehicle.id}`})
                          }}>
                          <View className="flex items-center justify-center">
                            <View className="i-mdi-image-plus text-base mr-1"></View>
                            <Text className="font-medium">补录图片</Text>
                          </View>
                        </Button>
                      ) : (
                        <>
                          <Button
                            className={`${vehicle.status === 'active' && !vehicle.return_time && !isManagerView && vehicle.review_status === 'approved' ? 'flex-1' : 'w-full'} bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all`}
                            size="default"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDetail(vehicle.id)
                            }}>
                            <View className="flex items-center justify-center">
                              <View className="i-mdi-eye text-base mr-1"></View>
                              <Text className="font-medium">查看详情</Text>
                            </View>
                          </Button>
                          {/* 还车按钮 - 仅在已提车未还车、审核通过且非管理员视图时显示 */}
                          {vehicle.status === 'active' &&
                            !vehicle.return_time &&
                            !isManagerView &&
                            vehicle.review_status === 'approved' && (
                              <Button
                                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all"
                                size="default"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReturnVehicle(vehicle.id, vehicle.plate_number)
                                }}>
                                <View className="flex items-center justify-center">
                                  <View className="i-mdi-car-arrow-left text-base mr-1"></View>
                                  <Text className="font-medium">还车</Text>
                                </View>
                              </Button>
                            )}
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 底部间距 */}
          <View className="h-4"></View>
        </View>
      </ScrollView>
    </View>
  )
}

export default VehicleList
