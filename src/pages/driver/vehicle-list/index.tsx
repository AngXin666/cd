/**
 * 车辆列表页面 - 优化版
 * 显示司机名下的所有车辆
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {deleteVehicle, getDriverVehicles} from '@/db/api'
import type {Vehicle} from '@/db/types'

const VehicleList: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)

  // 加载车辆列表
  const loadVehicles = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await getDriverVehicles(user.id)
      setVehicles(data)
    } catch (error) {
      console.error('加载车辆列表失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  // 页面显示时加载数据
  useDidShow(() => {
    loadVehicles()
  })

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

  // 删除车辆
  const handleDeleteVehicle = async (vehicleId: string, plateNumber: string) => {
    const res = await Taro.showModal({
      title: '确认删除',
      content: `确定要删除车辆 ${plateNumber} 吗？`
    })

    if (res.confirm) {
      Taro.showLoading({title: '删除中...'})
      const success = await deleteVehicle(vehicleId)
      Taro.hideLoading()

      if (success) {
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        })
        loadVehicles()
      } else {
        Taro.showToast({
          title: '删除失败',
          icon: 'error'
        })
      }
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
                  <Text className="text-2xl font-bold text-white">我的车辆</Text>
                </View>
                <Text className="text-blue-100 text-sm">管理您的车辆信息</Text>
              </View>
              <View className="bg-white/20 backdrop-blur rounded-full px-4 py-2">
                <Text className="text-white text-lg font-bold">{vehicles.length}</Text>
                <Text className="text-blue-100 text-xs">辆</Text>
              </View>
            </View>
          </View>

          {/* 添加车辆按钮 */}
          <View className="mb-4">
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl break-keep text-base shadow-lg"
              size="default"
              onClick={handleAddVehicle}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-plus-circle-outline text-2xl mr-2"></View>
                <Text className="font-medium">添加新车辆</Text>
              </View>
            </Button>
          </View>

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
                <Text className="text-gray-500 text-sm">点击上方按钮添加您的第一辆车</Text>
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
                  {vehicle.front_photo && (
                    <View className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                      <Image src={vehicle.front_photo} mode="aspectFill" className="w-full h-full" />
                      {/* 状态标签 */}
                      <View className="absolute top-3 right-3">
                        <View
                          className={`backdrop-blur rounded-full px-3 py-1 ${
                            vehicle.status === 'active' ? 'bg-green-500/90' : 'bg-gray-500/90'
                          }`}>
                          <View className="flex items-center">
                            <View
                              className={`w-2 h-2 rounded-full mr-1 ${
                                vehicle.status === 'active' ? 'bg-white' : 'bg-gray-300'
                              }`}></View>
                            <Text className="text-white text-xs font-medium">
                              {vehicle.status === 'active' ? '使用中' : '已停用'}
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
                      <View className="flex items-center mb-2">
                        <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 mr-2">
                          <Text className="text-white text-lg font-bold">{vehicle.plate_number}</Text>
                        </View>
                        {!vehicle.front_photo && (
                          <View
                            className={`rounded-full px-2 py-0.5 ${
                              vehicle.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                            <Text
                              className={`text-xs font-medium ${
                                vehicle.status === 'active' ? 'text-green-600' : 'text-gray-600'
                              }`}>
                              {vehicle.status === 'active' ? '使用中' : '已停用'}
                            </Text>
                          </View>
                        )}
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

                    {/* 操作按钮 */}
                    <View className="flex gap-2 pt-3 border-t border-gray-100">
                      <Button
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all"
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
                      <Button
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2.5 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all"
                        size="default"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteVehicle(vehicle.id, vehicle.plate_number)
                        }}>
                        <View className="flex items-center justify-center">
                          <View className="i-mdi-delete text-base mr-1"></View>
                          <Text className="font-medium">删除</Text>
                        </View>
                      </Button>
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
