/**
 * 超级管理员 - 车辆历史记录页面
 * 显示单个车辆的所有录入记录，按记录类型排序（提车在前，还车在后）
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
  useAuth({guard: true})
  const router = useRouter()
  // 解码车牌号（URL参数可能被编码）
  const plateNumber = router.params.plateNumber ? decodeURIComponent(router.params.plateNumber) : ''

  const [vehicle, setVehicle] = useState<VehicleBaseWithRecords | null>(null)
  const [loading, setLoading] = useState(false)
  // 为每个记录单独管理 activeTab 状态
  const [recordTabs, setRecordTabs] = useState<Record<string, 'pickup' | 'registration' | 'personal' | 'damage'>>({})

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
      url: `/pages/super-admin/vehicle-review-detail/index?vehicleId=${record.id}&fromHistory=true`
    })
  }

  // 预览图片
  const handlePreviewImage = (current: string, urls: string[]) => {
    Taro.previewImage({
      current,
      urls
    })
  }

  // 渲染照片网格（支持点击放大）
  const renderPhotoGrid = (photos: string[], title: string) => {
    if (!photos || photos.length === 0) return null

    return (
      <View className="mb-4">
        <Text className="text-sm text-gray-600 mb-2 block">{title}</Text>
        <View className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <View
              key={index}
              className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100"
              onClick={(e) => {
                e.stopPropagation()
                handlePreviewImage(photo, photos)
              }}>
              <Image src={photo} mode="aspectFill" className="w-full h-full" />
            </View>
          ))}
        </View>
      </View>
    )
  }

  // 获取或初始化记录的 activeTab
  const getRecordTab = (recordId: string, recordType: 'pickup' | 'return') => {
    const key = `${recordId}-${recordType}`
    return recordTabs[key] || 'pickup'
  }

  // 设置记录的 activeTab
  const setRecordTab = (
    recordId: string,
    recordType: 'pickup' | 'return',
    tab: 'pickup' | 'registration' | 'personal' | 'damage'
  ) => {
    const key = `${recordId}-${recordType}`
    setRecordTabs((prev) => ({
      ...prev,
      [key]: tab
    }))
  }

  // 配对提车和还车记录
  interface RecordGroup {
    cycleNumber: number // 使用周期编号（第几次使用）
    pickupRecord: VehicleRecordWithDetails | null // 提车记录
    returnRecord: VehicleRecordWithDetails | null // 还车记录
    status: 'completed' | 'in_progress' // 完成状态：已完成（有还车）或进行中（无还车）
  }

  const groupRecords = (records: VehicleRecordWithDetails[]): RecordGroup[] => {
    // 按时间排序（从早到晚）
    const sortedRecords = [...records].sort((a, b) => {
      const aTime = new Date(a.pickup_time || a.recorded_at || '').getTime()
      const bTime = new Date(b.pickup_time || b.recorded_at || '').getTime()
      return aTime - bTime
    })

    const groups: RecordGroup[] = []

    // 遍历所有记录，每条记录可能包含提车、还车或两者
    for (let i = 0; i < sortedRecords.length; i++) {
      const record = sortedRecords[i]

      // 如果记录同时有提车和还车信息，作为一个完整周期
      if (record.pickup_time && record.return_time) {
        groups.push({
          cycleNumber: groups.length + 1,
          pickupRecord: record,
          returnRecord: record,
          status: 'completed'
        })
      }
      // 如果只有提车信息，作为进行中的周期
      else if (record.pickup_time && !record.return_time) {
        groups.push({
          cycleNumber: groups.length + 1,
          pickupRecord: record,
          returnRecord: null,
          status: 'in_progress'
        })
      }
      // 如果只有还车信息（异常情况，理论上不应该发生）
      else if (!record.pickup_time && record.return_time) {
        groups.push({
          cycleNumber: groups.length + 1,
          pickupRecord: null,
          returnRecord: record,
          status: 'completed'
        })
      }
    }

    return groups
  }

  // 渲染使用周期分组
  const renderRecordGroup = (group: RecordGroup, index: number) => {
    // 使用不同的边框颜色区分不同的使用周期
    const borderColors = [
      'border-blue-300',
      'border-green-300',
      'border-purple-300',
      'border-orange-300',
      'border-pink-300',
      'border-indigo-300'
    ]
    const borderColor = borderColors[index % borderColors.length]

    // 状态标识
    const statusBadge =
      group.status === 'completed'
        ? {text: '已完成', bg: 'bg-green-100', textColor: 'text-green-600', icon: 'i-mdi-check-circle'}
        : {text: '进行中', bg: 'bg-blue-100', textColor: 'text-blue-600', icon: 'i-mdi-clock-outline'}

    return (
      <View
        key={`group-${group.cycleNumber}`}
        className={`bg-white rounded-2xl p-4 mb-4 shadow-sm border-2 ${borderColor}`}>
        {/* 使用周期标题 */}
        <View className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
          <View className="flex items-center">
            <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 mr-2">
              <Text className="text-white text-sm font-bold">第 {group.cycleNumber} 次使用</Text>
            </View>
            <View className={`rounded-full px-3 py-1 flex items-center ${statusBadge.bg}`}>
              <View className={`${statusBadge.icon} text-sm mr-1 ${statusBadge.textColor}`}></View>
              <Text className={`text-xs font-medium ${statusBadge.textColor}`}>{statusBadge.text}</Text>
            </View>
          </View>
        </View>

        {/* 提车记录 */}
        {group.pickupRecord && (
          <View className="mb-3">
            <View className="flex items-center mb-2">
              <View className="bg-blue-100 rounded px-2 py-1">
                <Text className="text-blue-600 text-xs font-medium">提车</Text>
              </View>
            </View>
            {renderRecord(group.pickupRecord, index, 'pickup')}
          </View>
        )}

        {/* 还车记录 */}
        {group.returnRecord && (
          <View>
            <View className="flex items-center mb-2">
              <View className="bg-orange-100 rounded px-2 py-1">
                <Text className="text-orange-600 text-xs font-medium">还车</Text>
              </View>
            </View>
            {renderRecord(group.returnRecord, index, 'return')}
          </View>
        )}

        {/* 如果没有还车记录，显示提示 */}
        {!group.returnRecord && (
          <View className="bg-blue-50 rounded-lg p-3 mt-3">
            <View className="flex items-center">
              <View className="i-mdi-information text-blue-600 text-base mr-2"></View>
              <Text className="text-xs text-blue-600">该车辆当前正在使用中，尚未还车</Text>
            </View>
          </View>
        )}
      </View>
    )
  }

  // 渲染单个录入记录（简化版，用于分组显示）
  const renderRecord = (record: VehicleRecordWithDetails, _index: number, recordType: 'pickup' | 'return') => {
    const statusBadge = getReviewStatusBadge(record.review_status)

    return (
      <View
        key={record.id}
        className="bg-gray-50 rounded-xl p-3 active:scale-98 transition-all"
        onClick={() => handleViewRecord(record)}>
        {/* 头部：审核状态 */}
        <View className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
          <View className={`rounded-full px-3 py-1 flex items-center ${statusBadge.bg}`}>
            <View className={`${statusBadge.icon} text-sm mr-1 ${statusBadge.textColor}`}></View>
            <Text className={`text-xs font-medium ${statusBadge.textColor}`}>{statusBadge.text}</Text>
          </View>
        </View>

        {/* 时间信息 */}
        <View className="mb-3">
          <View className="flex items-center mb-2">
            <View className="i-mdi-clock-outline text-primary text-base mr-2"></View>
            <Text className="text-sm text-gray-600">
              {recordType === 'return' ? '还车时间' : '提车时间'}：
              {formatDateTime(recordType === 'return' ? record.return_time : record.pickup_time)}
            </Text>
          </View>
          <View className="flex items-center ml-6">
            <Text className="text-xs text-gray-500">录入时间：{formatDateTime(record.recorded_at)}</Text>
          </View>
        </View>

        {/* 司机信息 */}
        <View className="mb-3">
          <View className="flex items-center mb-2">
            <View className="i-mdi-account text-primary text-base mr-2"></View>
            <Text className="text-sm font-medium text-gray-800">
              操作司机：{record.driver_name || record.driver_name_profile || '未知'}
            </Text>
          </View>
          {record.driver_phone && <Text className="text-xs text-gray-500 ml-6">联系电话：{record.driver_phone}</Text>}
        </View>

        {/* 审核信息（如果有） */}
        {record.reviewed_at && (
          <View className="mb-3 bg-gray-50 rounded-lg p-2">
            <View className="flex items-center mb-1">
              <View className="i-mdi-account-check text-green-600 text-base mr-2"></View>
              <Text className="text-xs text-gray-600">已审核</Text>
            </View>
            <Text className="text-xs text-gray-500 ml-6">审核时间：{formatDateTime(record.reviewed_at)}</Text>
            {record.review_notes && (
              <Text className="text-xs text-gray-600 ml-6 mt-1">审核备注：{record.review_notes}</Text>
            )}
          </View>
        )}

        {/* Tab切换 - 每个记录独立管理 */}
        <View className="flex border-b border-gray-200 mb-3">
          <View
            className={`flex-1 text-center py-2 ${getRecordTab(record.id, recordType) === 'pickup' ? 'border-b-2 border-primary' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setRecordTab(record.id, recordType, 'pickup')
            }}>
            <Text
              className={`text-sm ${getRecordTab(record.id, recordType) === 'pickup' ? 'text-primary font-medium' : 'text-gray-600'}`}>
              {recordType === 'return' ? '还车照片' : '提车照片'}
            </Text>
          </View>
          {/* 只在提车记录中显示行驶证和个人信息Tab */}
          {recordType === 'pickup' && (
            <>
              <View
                className={`flex-1 text-center py-2 ${getRecordTab(record.id, recordType) === 'registration' ? 'border-b-2 border-primary' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setRecordTab(record.id, recordType, 'registration')
                }}>
                <Text
                  className={`text-sm ${getRecordTab(record.id, recordType) === 'registration' ? 'text-primary font-medium' : 'text-gray-600'}`}>
                  行驶证照片
                </Text>
              </View>
              <View
                className={`flex-1 text-center py-2 ${getRecordTab(record.id, recordType) === 'personal' ? 'border-b-2 border-primary' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setRecordTab(record.id, recordType, 'personal')
                }}>
                <Text
                  className={`text-sm ${getRecordTab(record.id, recordType) === 'personal' ? 'text-primary font-medium' : 'text-gray-600'}`}>
                  个人信息
                </Text>
              </View>
            </>
          )}
          <View
            className={`flex-1 text-center py-2 ${getRecordTab(record.id, recordType) === 'damage' ? 'border-b-2 border-primary' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setRecordTab(record.id, recordType, 'damage')
            }}>
            <Text
              className={`text-sm ${getRecordTab(record.id, recordType) === 'damage' ? 'text-primary font-medium' : 'text-gray-600'}`}>
              车损特写
            </Text>
          </View>
        </View>

        {/* 照片展示区域 - 支持点击放大 */}
        <View onClick={(e) => e.stopPropagation()}>
          {getRecordTab(record.id, recordType) === 'pickup' &&
            renderPhotoGrid(
              recordType === 'return' ? record.return_photos || [] : record.pickup_photos || [],
              recordType === 'return' ? '还车照片' : '提车照片'
            )}
          {/* 行驶证照片Tab - 只在提车记录中显示 */}
          {recordType === 'pickup' && getRecordTab(record.id, recordType) === 'registration' && (
            <View>
              {/* 行驶证主页 */}
              {record.driving_license_main_photo && (
                <View
                  className="mb-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    const photos = [
                      record.driving_license_main_photo,
                      record.driving_license_sub_photo,
                      record.driving_license_sub_back_photo,
                      ...(record.registration_photos || [])
                    ].filter(Boolean)
                    handlePreviewImage(record.driving_license_main_photo, photos)
                  }}>
                  <Text className="text-xs text-gray-500 mb-1 block">行驶证主页</Text>
                  <Image src={record.driving_license_main_photo} mode="widthFix" className="w-full rounded-lg" />
                </View>
              )}
              {/* 行驶证副页 */}
              {record.driving_license_sub_photo && (
                <View
                  className="mb-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    const photos = [
                      record.driving_license_main_photo,
                      record.driving_license_sub_photo,
                      record.driving_license_sub_back_photo,
                      ...(record.registration_photos || [])
                    ].filter(Boolean)
                    handlePreviewImage(record.driving_license_sub_photo, photos)
                  }}>
                  <Text className="text-xs text-gray-500 mb-1 block">行驶证副页</Text>
                  <Image src={record.driving_license_sub_photo} mode="widthFix" className="w-full rounded-lg" />
                </View>
              )}
              {/* 行驶证副页背面 */}
              {record.driving_license_sub_back_photo && (
                <View
                  className="mb-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    const photos = [
                      record.driving_license_main_photo,
                      record.driving_license_sub_photo,
                      record.driving_license_sub_back_photo,
                      ...(record.registration_photos || [])
                    ].filter(Boolean)
                    handlePreviewImage(record.driving_license_sub_back_photo, photos)
                  }}>
                  <Text className="text-xs text-gray-500 mb-1 block">行驶证副页背面</Text>
                  <Image src={record.driving_license_sub_back_photo} mode="widthFix" className="w-full rounded-lg" />
                </View>
              )}
              {/* registration_photos 数组中的行驶证照片 */}
              {record.registration_photos &&
                record.registration_photos.length > 0 &&
                record.registration_photos.map((photo, index) => (
                  <View
                    key={index}
                    className="mb-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      const photos = [
                        record.driving_license_main_photo,
                        record.driving_license_sub_photo,
                        record.driving_license_sub_back_photo,
                        ...(record.registration_photos || [])
                      ].filter(Boolean)
                      handlePreviewImage(photo, photos)
                    }}>
                    <Text className="text-xs text-gray-500 mb-1 block">行驶证照片 {index + 1}</Text>
                    <Image src={photo} mode="widthFix" className="w-full rounded-lg" />
                  </View>
                ))}
              {/* 空状态提示 */}
              {!record.driving_license_main_photo &&
                !record.driving_license_sub_photo &&
                !record.driving_license_sub_back_photo &&
                (!record.registration_photos || record.registration_photos.length === 0) && (
                  <View className="flex flex-col items-center justify-center py-10">
                    <View className="i-mdi-card-text-outline text-4xl text-gray-300 mb-2"></View>
                    <Text className="text-sm text-gray-400">暂无行驶证照片</Text>
                  </View>
                )}
            </View>
          )}
          {/* 个人信息Tab - 只显示身份证和驾驶证照片，只在提车记录中显示 */}
          {recordType === 'pickup' && getRecordTab(record.id, recordType) === 'personal' && (
            <View>
              {/* 身份证正面 */}
              {record.id_card_photo_front && (
                <View
                  className="mb-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    const photos = [
                      record.id_card_photo_front,
                      record.id_card_photo_back,
                      record.driving_license_photo
                    ].filter(Boolean)
                    handlePreviewImage(record.id_card_photo_front, photos)
                  }}>
                  <Text className="text-xs text-gray-500 mb-1 block">身份证正面</Text>
                  <Image src={record.id_card_photo_front} mode="widthFix" className="w-full rounded-lg" />
                </View>
              )}
              {/* 身份证背面 */}
              {record.id_card_photo_back && (
                <View
                  className="mb-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    const photos = [
                      record.id_card_photo_front,
                      record.id_card_photo_back,
                      record.driving_license_photo
                    ].filter(Boolean)
                    handlePreviewImage(record.id_card_photo_back, photos)
                  }}>
                  <Text className="text-xs text-gray-500 mb-1 block">身份证背面</Text>
                  <Image src={record.id_card_photo_back} mode="widthFix" className="w-full rounded-lg" />
                </View>
              )}
              {/* 驾驶证照片 */}
              {record.driving_license_photo && (
                <View
                  className="mb-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    const photos = [
                      record.id_card_photo_front,
                      record.id_card_photo_back,
                      record.driving_license_photo
                    ].filter(Boolean)
                    handlePreviewImage(record.driving_license_photo, photos)
                  }}>
                  <Text className="text-xs text-gray-500 mb-1 block">驾驶证照片</Text>
                  <Image src={record.driving_license_photo} mode="widthFix" className="w-full rounded-lg" />
                </View>
              )}
              {/* 空状态提示 */}
              {!record.id_card_photo_front && !record.id_card_photo_back && !record.driving_license_photo && (
                <View className="flex flex-col items-center justify-center py-10">
                  <View className="i-mdi-card-account-details-outline text-4xl text-gray-300 mb-2"></View>
                  <Text className="text-sm text-gray-400">暂无个人信息照片</Text>
                </View>
              )}
            </View>
          )}
          {getRecordTab(record.id, recordType) === 'damage' && renderPhotoGrid(record.damage_photos || [], '车损特写')}
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

          {/* 录入记录列表 - 按使用周期分组显示 */}
          {!loading && vehicle && vehicle.records.length > 0 && (
            <View>
              <Text className="text-sm text-gray-600 mb-3 block">使用记录（按使用周期分组）</Text>
              {groupRecords(vehicle.records).map((group, index) => renderRecordGroup(group, index))}
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
