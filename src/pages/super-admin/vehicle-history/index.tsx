/**
 * 超级管理员 - 车辆历史记录页面
 * 显示单个车辆的所有录入记录，按时间倒序排列
 */

import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import type {VehicleBaseWithRecords, VehicleRecordWithDetails} from '@/db/types'
import {getVehicleBaseByPlateNumber} from '@/db/vehicleRecordsApi'
import {createLogger} from '@/utils/logger'

const logger = createLogger('VehicleHistory')

const VehicleHistory: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const {plateNumber} = router.params

  const [vehicle, setVehicle] = useState<VehicleBaseWithRecords | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'pickup' | 'registration' | 'license' | 'number'>('pickup')

  // 加载车辆历史记录
  const loadVehicleHistory = useCallback(async () => {
    if (!plateNumber) {
      Taro.showToast({title: '缺少车牌号参数', icon: 'none'})
      return
    }

    logger.info('加载车辆历史记录', {plateNumber})
    setLoading(true)

    try {
      const data = await getVehicleBaseByPlateNumber(plateNumber)
      if (data) {
        setVehicle(data)
        logger.info('车辆历史记录加载成功', {recordCount: data.total_records})
      } else {
        Taro.showToast({title: '未找到车辆信息', icon: 'none'})
      }
    } catch (error) {
      logger.error('加载车辆历史记录失败', {error})
      Taro.showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [plateNumber])

  useDidShow(() => {
    loadVehicleHistory()
  })

  // 格式化日期时间
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 获取审核状态标识
  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'drafting':
        return {text: '草稿', bg: 'bg-gray-100', textColor: 'text-gray-600', icon: 'i-mdi-file-document-outline'}
      case 'pending_review':
        return {text: '审核中', bg: 'bg-orange-100', textColor: 'text-orange-600', icon: 'i-mdi-clock-outline'}
      case 'need_supplement':
        return {text: '需补录', bg: 'bg-red-100', textColor: 'text-red-600', icon: 'i-mdi-alert-circle'}
      case 'approved':
        return {text: '已通过', bg: 'bg-green-100', textColor: 'text-green-600', icon: 'i-mdi-check-circle'}
      default:
        return {text: '未知', bg: 'bg-gray-100', textColor: 'text-gray-600', icon: 'i-mdi-help-circle'}
    }
  }

  // 查看录入记录详情
  const handleViewRecord = (record: VehicleRecordWithDetails) => {
    Taro.navigateTo({
      url: `/pages/super-admin/vehicle-review-detail/index?id=${record.id}`
    })
  }

  // 渲染照片网格
  const renderPhotoGrid = (photos: string[], title: string) => {
    if (!photos || photos.length === 0) return null

    return (
      <View className="mb-4">
        <Text className="text-sm text-gray-600 mb-2 block">{title}</Text>
        <View className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <View key={index} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
              <Image src={photo} mode="aspectFill" className="w-full h-full" />
            </View>
          ))}
        </View>
      </View>
    )
  }

  // 渲染单个录入记录
  const renderRecord = (record: VehicleRecordWithDetails, _index: number) => {
    const statusBadge = getReviewStatusBadge(record.review_status)

    return (
      <View
        key={record.id}
        className="bg-white rounded-2xl p-4 mb-4 shadow-sm active:scale-98 transition-all"
        onClick={() => handleViewRecord(record)}>
        {/* 头部：时间和状态 */}
        <View className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
          <View className="flex items-center">
            <View className="i-mdi-clock-outline text-primary text-lg mr-2"></View>
            <Text className="text-sm text-gray-600">提车录入于 {formatDateTime(record.recorded_at)}</Text>
          </View>
          <View className={`rounded-full px-3 py-1 flex items-center ${statusBadge.bg}`}>
            <View className={`${statusBadge.icon} text-sm mr-1 ${statusBadge.textColor}`}></View>
            <Text className={`text-xs font-medium ${statusBadge.textColor}`}>{statusBadge.text}</Text>
          </View>
        </View>

        {/* 司机信息 */}
        <View className="mb-3">
          <View className="flex items-center mb-2">
            <View className="i-mdi-account text-primary text-lg mr-2"></View>
            <Text className="text-sm font-medium text-gray-800">
              司机：{record.driver_name || record.driver_name_profile || '未知'}
            </Text>
          </View>
          {record.driver_phone && <Text className="text-xs text-gray-500 ml-6">电话：{record.driver_phone}</Text>}
        </View>

        {/* Tab切换 */}
        <View className="flex border-b border-gray-200 mb-3">
          <View
            className={`flex-1 text-center py-2 ${activeTab === 'pickup' ? 'border-b-2 border-primary' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setActiveTab('pickup')
            }}>
            <Text className={`text-sm ${activeTab === 'pickup' ? 'text-primary font-medium' : 'text-gray-600'}`}>
              提车照片
            </Text>
          </View>
          <View
            className={`flex-1 text-center py-2 ${activeTab === 'registration' ? 'border-b-2 border-primary' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setActiveTab('registration')
            }}>
            <Text className={`text-sm ${activeTab === 'registration' ? 'text-primary font-medium' : 'text-gray-600'}`}>
              行驶证照片
            </Text>
          </View>
          <View
            className={`flex-1 text-center py-2 ${activeTab === 'license' ? 'border-b-2 border-primary' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setActiveTab('license')
            }}>
            <Text className={`text-sm ${activeTab === 'license' ? 'text-primary font-medium' : 'text-gray-600'}`}>
              行驶证照片
            </Text>
          </View>
          <View
            className={`flex-1 text-center py-2 ${activeTab === 'number' ? 'border-b-2 border-primary' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setActiveTab('number')
            }}>
            <Text className={`text-sm ${activeTab === 'number' ? 'text-primary font-medium' : 'text-gray-600'}`}>
              车牌特写
            </Text>
          </View>
        </View>

        {/* 照片展示区域 */}
        <View onClick={(e) => e.stopPropagation()}>
          {activeTab === 'pickup' && renderPhotoGrid(record.pickup_photos || [], '提车照片')}
          {activeTab === 'registration' && renderPhotoGrid(record.registration_photos || [], '行驶证照片')}
          {activeTab === 'license' && (
            <View>
              {record.driving_license_main_photo && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-500 mb-1 block">行驶证主页</Text>
                  <Image src={record.driving_license_main_photo} mode="widthFix" className="w-full rounded-lg" />
                </View>
              )}
              {record.driving_license_sub_photo && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-500 mb-1 block">行驶证副页</Text>
                  <Image src={record.driving_license_sub_photo} mode="widthFix" className="w-full rounded-lg" />
                </View>
              )}
            </View>
          )}
          {activeTab === 'number' && renderPhotoGrid(record.damage_photos || [], '车牌特写')}
        </View>

        {/* 查看详情按钮 */}
        <View className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center">
          <Text className="text-sm text-primary">点击查看完整详情</Text>
          <View className="i-mdi-chevron-right text-primary text-lg ml-1"></View>
        </View>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 车辆基本信息卡片 */}
          {vehicle && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <View className="flex items-center justify-between mb-3">
                <View className="flex items-center">
                  <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 mr-2">
                    <Text className="text-white text-lg font-bold">{vehicle.plate_number}</Text>
                  </View>
                  <Text className="text-gray-800 text-base font-medium">
                    {vehicle.brand} {vehicle.model}
                  </Text>
                </View>
              </View>

              <View className="flex items-center justify-between">
                <View className="flex items-center">
                  <View className="i-mdi-file-document-multiple text-primary text-lg mr-2"></View>
                  <Text className="text-sm text-gray-600">共 {vehicle.total_records} 条录入记录</Text>
                </View>
                {vehicle.latest_record && (
                  <Text className="text-xs text-gray-500">
                    最新录入：{formatDateTime(vehicle.latest_record.recorded_at)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* 加载状态 */}
          {loading && (
            <View className="flex items-center justify-center py-20">
              <Text className="text-gray-500">加载中...</Text>
            </View>
          )}

          {/* 录入记录列表 */}
          {!loading && vehicle && vehicle.records.length > 0 && (
            <View>
              <Text className="text-sm text-gray-600 mb-3 block">录入记录（按时间倒序）</Text>
              {vehicle.records.map((record, index) => renderRecord(record, index))}
            </View>
          )}

          {/* 空状态 */}
          {!loading && vehicle && vehicle.records.length === 0 && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-file-document-outline text-6xl text-gray-300 mb-4"></View>
              <Text className="text-gray-500">暂无录入记录</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default VehicleHistory
