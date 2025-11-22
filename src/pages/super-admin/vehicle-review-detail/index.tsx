/**
 * 车辆信息详细审核页面
 * 超级管理员审核车辆图片
 * 功能：锁定图片、删除图片、通过审核、要求补录
 */

import {Button, Image, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {supabase} from '@/client/supabase'
import {getRegistrationPhotoConfigByIndex, getVehiclePhotoConfigByIndex} from '@/constants/photo-positions'
import {
  approveVehicle,
  getVehicleWithDriverDetails,
  lockPhoto,
  markPhotoForDeletion,
  requireSupplement,
  unlockPhoto
} from '@/db/api'
import type {LockedPhotos, VehicleWithDriverDetails} from '@/db/types'
import {createLogger} from '@/utils/logger'

const logger = createLogger('VehicleReviewDetail')

// 图片字段配置
interface PhotoFieldConfig {
  field: 'pickup_photos' | 'return_photos' | 'registration_photos' | 'damage_photos'
  label: string
  icon: string
}

const PHOTO_FIELDS: PhotoFieldConfig[] = [
  {field: 'pickup_photos', label: '提车照片', icon: 'i-mdi-car'},
  {field: 'return_photos', label: '还车照片', icon: 'i-mdi-car-arrow-left'},
  {field: 'registration_photos', label: '行驶证照片', icon: 'i-mdi-card-account-details'},
  {field: 'damage_photos', label: '车损特写', icon: 'i-mdi-image-multiple'}
]

// 计算年龄
const calculateAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// 计算驾龄
const calculateDrivingYears = (firstIssueDate: string | null): number | null => {
  if (!firstIssueDate) return null
  const issueDate = new Date(firstIssueDate)
  const today = new Date()
  let years = today.getFullYear() - issueDate.getFullYear()
  const monthDiff = today.getMonth() - issueDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < issueDate.getDate())) {
    years--
  }
  return years
}

const VehicleReviewDetail: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicle, setVehicle] = useState<VehicleWithDriverDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [lockedPhotos, setLockedPhotos] = useState<LockedPhotos>({})
  const [requiredPhotos, setRequiredPhotos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [fromHistory, setFromHistory] = useState(false) // 是否从历史记录页面跳转过来

  // 加载车辆信息
  const loadVehicle = useCallback(async (vehicleId: string) => {
    setLoading(true)
    logger.info('加载车辆信息', {vehicleId})

    try {
      const data = await getVehicleWithDriverDetails(vehicleId)
      if (!data) {
        throw new Error('车辆不存在')
      }

      setVehicle(data)
      setLockedPhotos(data.locked_photos || {})
      setRequiredPhotos(data.required_photos || [])
      setReviewNotes(data.review_notes || '')
      logger.info('加载车辆信息成功', {vehicleId})
    } catch (error) {
      logger.error('加载车辆信息失败', error)
      Taro.showToast({title: '加载失败', icon: 'none'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } finally {
      setLoading(false)
    }
  }, [])

  // 页面加载时获取车辆ID
  useLoad((options) => {
    const {vehicleId, fromHistory: fromHistoryParam} = options
    // 设置是否从历史记录页面跳转过来
    if (fromHistoryParam === 'true') {
      setFromHistory(true)
    }
    if (vehicleId) {
      loadVehicle(vehicleId)
    } else {
      Taro.showToast({title: '参数错误', icon: 'none'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    }
  })

  // 获取图片公共URL
  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    const bucketName = `${process.env.TARO_APP_APP_ID}_vehicles`
    try {
      const {data} = supabase.storage.from(bucketName).getPublicUrl(path)
      return data.publicUrl
    } catch (error) {
      logger.error('获取图片URL失败', {path, error})
      return ''
    }
  }

  // 检查图片是否已锁定
  const isPhotoLocked = (field: string, index: number): boolean => {
    const fieldLocks = lockedPhotos[field] || []
    return fieldLocks.includes(index)
  }

  // 检查图片是否需要补录
  const isPhotoRequired = (field: string, index: number): boolean => {
    const photoKey = `${field}_${index}`
    return requiredPhotos.includes(photoKey)
  }

  // 切换图片锁定状态
  const togglePhotoLock = async (field: string, index: number) => {
    if (!vehicle) return

    const locked = isPhotoLocked(field, index)

    try {
      if (locked) {
        // 解锁
        const success = await unlockPhoto(vehicle.id, field, index)
        if (success) {
          const newLockedPhotos = {...lockedPhotos}
          const fieldLocks = newLockedPhotos[field] || []
          newLockedPhotos[field] = fieldLocks.filter((i) => i !== index)
          setLockedPhotos(newLockedPhotos)
          Taro.showToast({title: '已解锁', icon: 'success'})
        }
      } else {
        // 锁定
        const success = await lockPhoto(vehicle.id, field, index)
        if (success) {
          const newLockedPhotos = {...lockedPhotos}
          const fieldLocks = newLockedPhotos[field] || []
          if (!fieldLocks.includes(index)) {
            fieldLocks.push(index)
          }
          newLockedPhotos[field] = fieldLocks
          setLockedPhotos(newLockedPhotos)
          Taro.showToast({title: '已锁定', icon: 'success'})
        }
      }
    } catch (error) {
      logger.error('切换图片锁定状态失败', error)
      Taro.showToast({title: '操作失败', icon: 'none'})
    }
  }

  // 标记图片需要补录
  const markPhotoRequired = async (field: string, index: number) => {
    if (!vehicle) return

    const required = isPhotoRequired(field, index)

    if (required) {
      // 已标记，取消标记
      const photoKey = `${field}_${index}`
      setRequiredPhotos(requiredPhotos.filter((key) => key !== photoKey))
      Taro.showToast({title: '已取消标记', icon: 'success'})
    } else {
      // 标记为需补录
      try {
        const success = await markPhotoForDeletion(vehicle.id, field, index)
        if (success) {
          const photoKey = `${field}_${index}`
          setRequiredPhotos([...requiredPhotos, photoKey])
          Taro.showToast({title: '已标记需补录', icon: 'success'})
        }
      } catch (error) {
        logger.error('标记图片需补录失败', error)
        Taro.showToast({title: '操作失败', icon: 'none'})
      }
    }
  }

  // 通过审核
  const handleApprove = async () => {
    if (!vehicle || !user) return

    // 检查是否有需要补录的图片
    if (requiredPhotos.length > 0) {
      Taro.showModal({
        title: '提示',
        content: '还有图片需要补录，请先处理或要求司机补录',
        showCancel: false
      })
      return
    }

    Taro.showModal({
      title: '确认通过审核',
      content: '确认所有图片符合要求吗？',
      success: async (res) => {
        if (res.confirm) {
          setSubmitting(true)
          Taro.showLoading({title: '提交中...'})

          try {
            const success = await approveVehicle(vehicle.id, user.id, reviewNotes)
            if (success) {
              Taro.hideLoading()
              Taro.showToast({title: '审核通过', icon: 'success'})
              setTimeout(() => {
                Taro.navigateBack()
              }, 1500)
            } else {
              throw new Error('审核失败')
            }
          } catch (error) {
            logger.error('通过审核失败', error)
            Taro.hideLoading()
            Taro.showToast({title: '操作失败', icon: 'none'})
          } finally {
            setSubmitting(false)
          }
        }
      }
    })
  }

  // 要求补录（同时自动锁定其他照片）
  const handleRequireSupplement = async () => {
    if (!vehicle || !user) return

    if (requiredPhotos.length === 0) {
      Taro.showModal({
        title: '提示',
        content: '请先标记需要补录的图片',
        showCancel: false
      })
      return
    }

    if (!reviewNotes.trim()) {
      Taro.showModal({
        title: '提示',
        content: '请填写审核备注，说明需要补录的原因',
        showCancel: false
      })
      return
    }

    // 计算需要锁定的照片（所有未标记需要补录的照片）
    const lockedPhotosData: LockedPhotos = {}
    let totalLockedCount = 0

    PHOTO_FIELDS.forEach(({field}) => {
      const photos = vehicle[field] || []
      const lockedIndices: number[] = []

      photos.forEach((_, index) => {
        const photoKey = `${field}_${index}`
        // 如果不在需要补录列表中，则锁定
        if (!requiredPhotos.includes(photoKey)) {
          lockedIndices.push(index)
          totalLockedCount++
        }
      })

      if (lockedIndices.length > 0) {
        lockedPhotosData[field] = lockedIndices
      }
    })

    Taro.showModal({
      title: '确认要求补录',
      content: `将要求司机补录 ${requiredPhotos.length} 张图片，同时自动锁定其他 ${totalLockedCount} 张照片`,
      success: async (res) => {
        if (res.confirm) {
          setSubmitting(true)
          Taro.showLoading({title: '提交中...'})

          try {
            // 先更新需要补录的照片列表和审核状态
            const success = await requireSupplement(vehicle.id, user.id, reviewNotes)
            if (!success) {
              throw new Error('要求补录失败')
            }

            // 如果有需要锁定的照片，则锁定它们
            if (totalLockedCount > 0) {
              // 更新锁定的照片
              const {error: lockError} = await supabase
                .from('vehicles')
                .update({
                  locked_photos: lockedPhotosData,
                  updated_at: new Date().toISOString()
                })
                .eq('id', vehicle.id)

              if (lockError) {
                logger.error('锁定照片失败', lockError)
                throw new Error('锁定照片失败')
              }
            }

            Taro.hideLoading()
            Taro.showToast({
              title: `已要求补录，已锁定 ${totalLockedCount} 张照片`,
              icon: 'success',
              duration: 2000
            })
            setTimeout(() => {
              Taro.navigateBack()
            }, 2000)
          } catch (error) {
            logger.error('要求补录失败', error)
            Taro.hideLoading()
            Taro.showToast({
              title: error instanceof Error ? error.message : '操作失败',
              icon: 'none'
            })
          } finally {
            setSubmitting(false)
          }
        }
      }
    })
  }

  // 预览图片
  const previewImage = (url: string, urls: string[]) => {
    Taro.previewImage({
      current: url,
      urls: urls
    })
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center h-screen">
        <View className="i-mdi-loading animate-spin text-4xl text-orange-600 mb-4"></View>
        <Text className="text-gray-600">加载中...</Text>
      </View>
    )
  }

  if (!vehicle) {
    return (
      <View className="flex items-center justify-center h-screen">
        <Text className="text-gray-600">车辆信息不存在</Text>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #FEF3C7, #FDE68A)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className={`p-4 ${fromHistory ? 'pb-4' : 'pb-32'}`}>
          {/* 车辆基本信息 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
            <View className="flex items-center mb-3">
              <View className="i-mdi-car text-2xl text-orange-600 mr-2"></View>
              <Text className="text-xl font-bold text-gray-800">车辆信息</Text>
            </View>
            <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 inline-block mb-2">
              <Text className="text-white text-lg font-bold">{vehicle.plate_number}</Text>
            </View>
            <Text className="text-gray-800 text-base font-medium mb-2">
              {vehicle.brand} {vehicle.model}
            </Text>
            {vehicle.color && <Text className="text-sm text-gray-600">颜色：{vehicle.color}</Text>}
          </View>

          {/* 司机信息 */}
          {(vehicle.driver_profile || vehicle.driver_license) && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
              <View className="flex items-center mb-3">
                <View className="i-mdi-account-circle text-2xl text-blue-600 mr-2"></View>
                <Text className="text-xl font-bold text-gray-800">司机信息</Text>
              </View>

              {/* 基本信息 */}
              {vehicle.driver_profile && (
                <View className="mb-4">
                  <View className="flex items-center mb-2">
                    <View className="i-mdi-account text-blue-600 text-lg mr-2"></View>
                    <Text className="text-base font-bold text-gray-700">基本信息</Text>
                  </View>
                  {vehicle.driver_profile.name && (
                    <View className="flex items-start mb-1.5 ml-7">
                      <Text className="text-sm text-gray-600 w-20">姓名：</Text>
                      <Text className="text-sm text-gray-900 font-medium flex-1">{vehicle.driver_profile.name}</Text>
                    </View>
                  )}
                  {vehicle.driver_profile.phone && (
                    <View className="flex items-start mb-1.5 ml-7">
                      <Text className="text-sm text-gray-600 w-20">电话：</Text>
                      <Text className="text-sm text-gray-900 flex-1">{vehicle.driver_profile.phone}</Text>
                    </View>
                  )}
                  {vehicle.driver_profile.email && (
                    <View className="flex items-start ml-7">
                      <Text className="text-sm text-gray-600 w-20">邮箱：</Text>
                      <Text className="text-sm text-gray-900 flex-1">{vehicle.driver_profile.email}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* 身份证信息 */}
              {vehicle.driver_license &&
                (vehicle.driver_license.id_card_name ||
                  vehicle.driver_license.id_card_number ||
                  vehicle.driver_license.id_card_address ||
                  vehicle.driver_license.id_card_birth_date) && (
                  <View className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-card-account-details text-blue-600 text-lg mr-2"></View>
                      <Text className="text-base font-bold text-blue-800">身份证信息</Text>
                    </View>
                    {vehicle.driver_license.id_card_name && (
                      <View className="flex items-start mb-1.5 ml-7">
                        <Text className="text-sm text-gray-600 w-20">姓名：</Text>
                        <Text className="text-sm text-gray-900 font-medium flex-1">
                          {vehicle.driver_license.id_card_name}
                        </Text>
                      </View>
                    )}
                    {vehicle.driver_license.id_card_number && (
                      <View className="flex items-start mb-1.5 ml-7">
                        <Text className="text-sm text-gray-600 w-20">身份证号：</Text>
                        <Text className="text-sm text-gray-900 flex-1">{vehicle.driver_license.id_card_number}</Text>
                      </View>
                    )}
                    {vehicle.driver_license.id_card_birth_date && (
                      <View className="flex items-start mb-1.5 ml-7">
                        <Text className="text-sm text-gray-600 w-20">出生日期：</Text>
                        <Text className="text-sm text-gray-900 flex-1">
                          {vehicle.driver_license.id_card_birth_date}
                          {calculateAge(vehicle.driver_license.id_card_birth_date) !== null && (
                            <Text className="text-blue-600 font-medium ml-2">
                              ({calculateAge(vehicle.driver_license.id_card_birth_date)}岁)
                            </Text>
                          )}
                        </Text>
                      </View>
                    )}
                    {vehicle.driver_license.id_card_address && (
                      <View className="flex items-start mb-1.5 ml-7">
                        <Text className="text-sm text-gray-600 w-20">住址：</Text>
                        <Text className="text-sm text-gray-900 flex-1">{vehicle.driver_license.id_card_address}</Text>
                      </View>
                    )}
                    {vehicle.driver_license.issue_authority && (
                      <View className="flex items-start ml-7">
                        <Text className="text-sm text-gray-600 w-20">签发机关：</Text>
                        <Text className="text-sm text-gray-900 flex-1">{vehicle.driver_license.issue_authority}</Text>
                      </View>
                    )}
                  </View>
                )}

              {/* 驾驶证信息 */}
              {vehicle.driver_license &&
                (vehicle.driver_license.license_number ||
                  vehicle.driver_license.license_class ||
                  vehicle.driver_license.first_issue_date) && (
                  <View className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-card-account-details text-green-600 text-lg mr-2"></View>
                      <Text className="text-base font-bold text-green-800">驾驶证信息</Text>
                    </View>
                    {vehicle.driver_license.license_number && (
                      <View className="flex items-start mb-1.5 ml-7">
                        <Text className="text-sm text-gray-600 w-24">驾驶证号：</Text>
                        <Text className="text-sm text-gray-900 flex-1">{vehicle.driver_license.license_number}</Text>
                      </View>
                    )}
                    {vehicle.driver_license.license_class && (
                      <View className="flex items-start mb-1.5 ml-7">
                        <Text className="text-sm text-gray-600 w-24">准驾车型：</Text>
                        <Text className="text-sm text-gray-900 font-medium flex-1">
                          {vehicle.driver_license.license_class}
                        </Text>
                      </View>
                    )}
                    {vehicle.driver_license.first_issue_date && (
                      <View className="flex items-start mb-1.5 ml-7">
                        <Text className="text-sm text-gray-600 w-24">初次领证日期：</Text>
                        <Text className="text-sm text-gray-900 flex-1">
                          {vehicle.driver_license.first_issue_date}
                          {calculateDrivingYears(vehicle.driver_license.first_issue_date) !== null && (
                            <Text className="text-green-600 font-medium ml-2">
                              (驾龄{calculateDrivingYears(vehicle.driver_license.first_issue_date)}年)
                            </Text>
                          )}
                        </Text>
                      </View>
                    )}
                    {vehicle.driver_license.valid_from && vehicle.driver_license.valid_to && (
                      <View className="flex items-start ml-7">
                        <Text className="text-sm text-gray-600 w-24">有效期：</Text>
                        <Text className="text-sm text-gray-900 flex-1">
                          {vehicle.driver_license.valid_from} 至 {vehicle.driver_license.valid_to}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

              {/* 证件照片 */}
              {vehicle.driver_license &&
                (vehicle.driver_license.id_card_photo_front ||
                  vehicle.driver_license.id_card_photo_back ||
                  vehicle.driver_license.driving_license_photo) && (
                  <View className="bg-gray-50 rounded-xl p-3">
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-image-multiple text-gray-600 text-lg mr-2"></View>
                      <Text className="text-base font-bold text-gray-700">证件照片</Text>
                    </View>
                    <View className="grid grid-cols-2 gap-3">
                      {/* 身份证正面 */}
                      {vehicle.driver_license.id_card_photo_front && (
                        <View
                          onClick={() => {
                            const photos = [
                              vehicle.driver_license?.id_card_photo_front,
                              vehicle.driver_license?.id_card_photo_back,
                              vehicle.driver_license?.driving_license_photo
                            ].filter(Boolean) as string[]
                            previewImage(
                              getImageUrl(vehicle.driver_license?.id_card_photo_front || ''),
                              photos.map((p) => getImageUrl(p))
                            )
                          }}>
                          <Text className="text-xs text-gray-500 mb-1 block">身份证正面</Text>
                          <Image
                            src={getImageUrl(vehicle.driver_license.id_card_photo_front)}
                            mode="aspectFill"
                            className="w-full h-32 rounded-lg"
                          />
                        </View>
                      )}
                      {/* 身份证背面 */}
                      {vehicle.driver_license.id_card_photo_back && (
                        <View
                          onClick={() => {
                            const photos = [
                              vehicle.driver_license?.id_card_photo_front,
                              vehicle.driver_license?.id_card_photo_back,
                              vehicle.driver_license?.driving_license_photo
                            ].filter(Boolean) as string[]
                            previewImage(
                              getImageUrl(vehicle.driver_license?.id_card_photo_back || ''),
                              photos.map((p) => getImageUrl(p))
                            )
                          }}>
                          <Text className="text-xs text-gray-500 mb-1 block">身份证背面</Text>
                          <Image
                            src={getImageUrl(vehicle.driver_license.id_card_photo_back)}
                            mode="aspectFill"
                            className="w-full h-32 rounded-lg"
                          />
                        </View>
                      )}
                      {/* 驾驶证照片 */}
                      {vehicle.driver_license.driving_license_photo && (
                        <View
                          onClick={() => {
                            const photos = [
                              vehicle.driver_license?.id_card_photo_front,
                              vehicle.driver_license?.id_card_photo_back,
                              vehicle.driver_license?.driving_license_photo
                            ].filter(Boolean) as string[]
                            previewImage(
                              getImageUrl(vehicle.driver_license?.driving_license_photo || ''),
                              photos.map((p) => getImageUrl(p))
                            )
                          }}>
                          <Text className="text-xs text-gray-500 mb-1 block">驾驶证照片</Text>
                          <Image
                            src={getImageUrl(vehicle.driver_license.driving_license_photo)}
                            mode="aspectFill"
                            className="w-full h-32 rounded-lg"
                          />
                        </View>
                      )}
                    </View>
                  </View>
                )}
            </View>
          )}

          {/* 图片审核区域 */}
          {PHOTO_FIELDS.map((config) => {
            const photos = vehicle[config.field] || []
            if (photos.length === 0) return null

            return (
              <View key={config.field} className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
                <View className="flex items-center justify-between mb-3">
                  <View className="flex items-center">
                    <View className={`${config.icon} text-xl text-orange-600 mr-2`}></View>
                    <Text className="text-lg font-bold text-gray-800">{config.label}</Text>
                  </View>
                  <Text className="text-sm text-gray-600">共 {photos.length} 张</Text>
                </View>

                <View className="grid grid-cols-2 gap-3">
                  {photos.map((photo, index) => {
                    const locked = isPhotoLocked(config.field, index)
                    const required = isPhotoRequired(config.field, index)
                    const imageUrl = getImageUrl(photo)

                    // 获取照片位置配置
                    let positionConfig
                    if (config.field === 'pickup_photos' || config.field === 'return_photos') {
                      positionConfig = getVehiclePhotoConfigByIndex(index)
                    } else if (config.field === 'registration_photos') {
                      positionConfig = getRegistrationPhotoConfigByIndex(index)
                    }

                    return (
                      <View key={index} className="relative">
                        {/* 照片位置标注 */}
                        {positionConfig && (
                          <View className="mb-2 bg-blue-50 rounded-lg p-2">
                            <View className="flex items-center mb-1">
                              <View className={`${positionConfig.icon} text-base text-blue-600 mr-1`}></View>
                              <Text className="text-sm font-bold text-blue-900">{positionConfig.title}</Text>
                            </View>
                            <Text className="text-xs text-blue-700">{positionConfig.description}</Text>
                          </View>
                        )}

                        {/* 图片 */}
                        <View
                          className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-100"
                          onClick={() => imageUrl && previewImage(imageUrl, photos.map(getImageUrl).filter(Boolean))}>
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              mode="aspectFill"
                              className="w-full h-full"
                              onError={() => logger.error('图片加载失败', {imageUrl, field: config.field, index})}
                            />
                          ) : (
                            <View className="w-full h-full flex items-center justify-center">
                              <View className="i-mdi-image-off text-4xl text-gray-400"></View>
                            </View>
                          )}

                          {/* 锁定标识 */}
                          {locked && (
                            <View className="absolute top-2 left-2 bg-blue-500 rounded-full p-1">
                              <View className="i-mdi-lock text-base text-white"></View>
                            </View>
                          )}

                          {/* 需补录标识 */}
                          {required && (
                            <View className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                              <View className="bg-red-600 rounded-full p-2">
                                <View className="i-mdi-alert text-2xl text-white"></View>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* 操作按钮 */}
                        <View className="flex gap-1 mt-2">
                          <Button
                            className={`flex-1 ${locked ? 'bg-gray-400' : 'bg-blue-500'} text-white py-1 rounded break-keep text-xs`}
                            size="mini"
                            onClick={() => togglePhotoLock(config.field, index)}>
                            <View className="flex items-center justify-center">
                              <View className={`${locked ? 'i-mdi-lock-open' : 'i-mdi-lock'} text-sm mr-1`}></View>
                              <Text>{locked ? '解锁' : '锁定'}</Text>
                            </View>
                          </Button>
                          <Button
                            className={`flex-1 ${required ? 'bg-gray-400' : 'bg-red-500'} text-white py-1 rounded break-keep text-xs`}
                            size="mini"
                            onClick={() => markPhotoRequired(config.field, index)}
                            disabled={locked}>
                            <View className="flex items-center justify-center">
                              <View className={`${required ? 'i-mdi-close' : 'i-mdi-delete'} text-sm mr-1`}></View>
                              <Text>{required ? '取消' : '删除'}</Text>
                            </View>
                          </Button>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
            )
          })}

          {/* 统计信息 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
            <View className="flex items-center mb-3">
              <View className="i-mdi-chart-box text-xl text-orange-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">审核统计</Text>
            </View>
            <View className="flex gap-2">
              <View className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3">
                <Text className="text-xs text-blue-600 mb-1">已锁定</Text>
                <Text className="text-2xl font-bold text-blue-700">
                  {Object.values(lockedPhotos).reduce((sum, arr) => sum + arr.length, 0)}
                </Text>
              </View>
              <View className="flex-1 bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-3">
                <Text className="text-xs text-red-600 mb-1">需补录</Text>
                <Text className="text-2xl font-bold text-red-700">{requiredPhotos.length}</Text>
              </View>
            </View>
          </View>

          {/* 审核备注 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
            <View className="flex items-center mb-3">
              <View className="i-mdi-note-text text-xl text-orange-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">审核备注</Text>
            </View>
            <View style={{overflow: 'hidden'}}>
              <Textarea
                className="bg-gray-50 text-foreground px-3 py-2 rounded border border-border w-full"
                placeholder="请填写审核意见..."
                value={reviewNotes}
                onInput={(e) => setReviewNotes(e.detail.value)}
                maxlength={500}
                style={{minHeight: '100px'}}
              />
            </View>
            <Text className="text-xs text-gray-500 mt-2">{reviewNotes.length}/500</Text>
          </View>
        </View>

        {/* 底部操作按钮 - 只在非历史记录页面显示 */}
        {!fromHistory && (
          <View className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <View className="flex gap-2">
              {/* 要求补录 */}
              <Button
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all"
                size="default"
                onClick={handleRequireSupplement}
                disabled={submitting}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-alert-circle text-lg mr-2"></View>
                  <Text className="font-medium">要求补录</Text>
                </View>
              </Button>

              {/* 通过审核 */}
              <Button
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all"
                size="default"
                onClick={handleApprove}
                disabled={submitting}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-check-circle text-lg mr-2"></View>
                  <Text className="font-medium">通过审核</Text>
                </View>
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default VehicleReviewDetail
