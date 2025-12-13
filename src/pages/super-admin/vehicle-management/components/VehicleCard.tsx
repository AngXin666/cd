/**
 * 车辆卡片组件
 * 
 * @description 显示单个车辆的信息卡片
 */

import {Image, Text, View} from '@tarojs/components'
import React, {memo} from 'react'
import type {VehicleWithDriver} from '@/db/types'

export interface VehicleCardProps {
  vehicle: VehicleWithDriver
  historyCount?: number
  onViewHistory?: (vehicle: VehicleWithDriver) => void
  onViewPhotos?: (vehicle: VehicleWithDriver) => void
}

interface StatusBadge {
  text: string
  icon: string
  bg: string
  textColor: string
}

// 获取车辆状态标签
const getVehicleStatusBadge = (vehicle: VehicleWithDriver): StatusBadge => {
  // 优先级：已归还 > 使用中 > 待提车
  if (vehicle.return_time) {
    return {
      text: '已归还',
      icon: 'i-mdi-check-circle',
      bg: 'bg-green-500/20',
      textColor: 'text-green-700'
    }
  }
  
  if (vehicle.pickup_time) {
    return {
      text: '使用中',
      icon: 'i-mdi-car',
      bg: 'bg-blue-500/20',
      textColor: 'text-blue-700'
    }
  }
  
  return {
    text: '待提车',
    icon: 'i-mdi-clock-outline',
    bg: 'bg-orange-500/20',
    textColor: 'text-orange-700'
  }
}

const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  historyCount = 0,
  onViewHistory,
  onViewPhotos
}) => {
  const statusBadge = getVehicleStatusBadge(vehicle)

  return (
    <View className="bg-white rounded-2xl overflow-hidden shadow-lg active:scale-98 transition-all mb-4">
      {/* 车辆照片 */}
      {vehicle.left_front_photo && (
        <View className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200">
          <Image src={vehicle.left_front_photo} mode="aspectFill" className="w-full h-full" />
          {/* 状态标签 */}
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
          {vehicle.brand && (
            <Text className="text-gray-600 text-sm">{vehicle.brand}</Text>
          )}
        </View>

        {/* 司机信息 */}
        {vehicle.driver_name && (
          <View className="flex items-center mb-3 bg-gray-50 rounded-lg p-3">
            <View className="i-mdi-account text-xl text-blue-600 mr-2"></View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">当前使用人</Text>
              <Text className="text-gray-800 font-medium">{vehicle.driver_name}</Text>
            </View>
          </View>
        )}

        {/* 操作按钮 */}
        <View className="flex gap-2">
          {historyCount > 0 && (
            <View
              className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 active:scale-95 transition-all"
              onClick={() => onViewHistory?.(vehicle)}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-history text-lg text-blue-600 mr-2"></View>
                <Text className="text-blue-700 font-medium text-sm">
                  历史记录 ({historyCount})
                </Text>
              </View>
            </View>
          )}
          <View
            className="flex-1 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 active:scale-95 transition-all"
            onClick={() => onViewPhotos?.(vehicle)}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-image-multiple text-lg text-purple-600 mr-2"></View>
              <Text className="text-purple-700 font-medium text-sm">查看照片</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default memo(VehicleCard)
