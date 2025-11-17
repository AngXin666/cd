/**
 * 车辆详情页面 - 标签页版
 * 功能：
 * - 使用标签页展示提车照片、还车照片、行驶证照片
 * - 显示提车时间和还车时间
 * - 展示车辆基本信息
 * - 编辑车辆租赁信息
 */

import {Image, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import {deleteVehicle, getVehicleById, updateVehicle} from '@/db/api'
import type {OwnershipType, Vehicle} from '@/db/types'
import {getImagePublicUrl} from '@/utils/imageUtils'
import {logger} from '@/utils/logger'

type TabType = 'pickup' | 'return' | 'registration' | 'damage'

// 租赁信息表单接口
interface LeaseFormData {
  ownership_type: OwnershipType | null
  lessor_name: string
  lessor_contact: string
  lessee_name: string
  lessee_contact: string
  monthly_rent: string
  lease_start_date: string
  lease_end_date: string
  rent_payment_day: string
}

const VehicleDetail: React.FC = () => {
  useAuth({guard: true})
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('pickup')
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [isEditingLease, setIsEditingLease] = useState(false)
  const [leaseForm, setLeaseForm] = useState<LeaseFormData>({
    ownership_type: null,
    lessor_name: '',
    lessor_contact: '',
    lessee_name: '',
    lessee_contact: '',
    monthly_rent: '',
    lease_start_date: '',
    lease_end_date: '',
    rent_payment_day: ''
  })

  useLoad((options) => {
    const {id} = options
    if (id) {
      loadVehicleDetail(id)
    }
  })

  // 加载车辆详情
  const loadVehicleDetail = async (vehicleId: string) => {
    setLoading(true)
    try {
      const vehicleData = await getVehicleById(vehicleId)
      setVehicle(vehicleData)
    } catch (error) {
      console.error('加载车辆详情失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  // 获取照片的公开URL
  const getPhotoUrl = (path: string): string => {
    const bucketName = `${process.env.TARO_APP_APP_ID}_vehicles`
    return getImagePublicUrl(path, bucketName)
  }

  // 预览图片
  const previewImage = (url: string, urls: string[]) => {
    Taro.previewImage({
      current: url,
      urls: urls
    })
  }

  // 格式化时间
  const formatTime = (time: string | null): string => {
    if (!time) return '未记录'
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 处理图片加载失败
  const handleImageError = (photoUrl: string, photoType: string, index: number) => {
    logger.error(`${photoType}加载失败`, {photoUrl, index})
    setFailedImages((prev) => new Set(prev).add(photoUrl))
  }

  // 开始编辑租赁信息
  const handleStartEditLease = () => {
    if (!vehicle) return
    // 初始化表单数据
    setLeaseForm({
      ownership_type: vehicle.ownership_type || null,
      lessor_name: vehicle.lessor_name || '',
      lessor_contact: vehicle.lessor_contact || '',
      lessee_name: vehicle.lessee_name || '',
      lessee_contact: vehicle.lessee_contact || '',
      monthly_rent: vehicle.monthly_rent?.toString() || '',
      lease_start_date: vehicle.lease_start_date || '',
      lease_end_date: vehicle.lease_end_date || '',
      rent_payment_day: vehicle.rent_payment_day?.toString() || ''
    })
    setIsEditingLease(true)
  }

  // 取消编辑租赁信息
  const handleCancelEditLease = () => {
    setIsEditingLease(false)
  }

  // 保存租赁信息
  const handleSaveLeaseInfo = async () => {
    if (!vehicle) return

    try {
      // 验证必填字段
      if (!leaseForm.ownership_type) {
        Taro.showToast({
          title: '请选择车辆归属类型',
          icon: 'none'
        })
        return
      }

      // 验证租金字段（所有车辆类型）
      if (leaseForm.monthly_rent && Number.isNaN(Number(leaseForm.monthly_rent))) {
        Taro.showToast({
          title: '请输入有效的月租金',
          icon: 'none'
        })
        return
      }
      if (
        leaseForm.rent_payment_day &&
        (Number(leaseForm.rent_payment_day) < 1 || Number(leaseForm.rent_payment_day) > 31)
      ) {
        Taro.showToast({
          title: '租金缴纳日必须在1-31之间',
          icon: 'none'
        })
        return
      }

      // 更新车辆信息
      await updateVehicle(vehicle.id, {
        ownership_type: leaseForm.ownership_type,
        lessor_name: leaseForm.lessor_name || null,
        lessor_contact: leaseForm.lessor_contact || null,
        lessee_name: leaseForm.lessee_name || null,
        lessee_contact: leaseForm.lessee_contact || null,
        monthly_rent: leaseForm.monthly_rent ? Number(leaseForm.monthly_rent) : null,
        lease_start_date: leaseForm.lease_start_date || null,
        lease_end_date: leaseForm.lease_end_date || null,
        rent_payment_day: leaseForm.rent_payment_day ? Number(leaseForm.rent_payment_day) : null
      })

      Taro.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 重新加载车辆信息
      await loadVehicleDetail(vehicle.id)
      setIsEditingLease(false)
    } catch (error) {
      console.error('保存租赁信息失败:', error)
      Taro.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  }

  // 删除车辆（测试功能）
  const handleDeleteVehicle = async () => {
    if (!vehicle) return

    try {
      const result = await Taro.showModal({
        title: '确认删除',
        content: `确定要删除车辆 ${vehicle.plate_number} 吗？此操作不可恢复！`,
        confirmText: '删除',
        cancelText: '取消',
        confirmColor: '#ef4444'
      })

      if (!result.confirm) {
        return
      }

      Taro.showLoading({title: '删除中...'})

      const success = await deleteVehicle(vehicle.id)

      Taro.hideLoading()

      if (success) {
        logger.userAction('删除车辆', {vehicleId: vehicle.id, plateNumber: vehicle.plate_number})
        Taro.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        })

        // 延迟返回列表页面
        setTimeout(() => {
          Taro.navigateBack()
        }, 2000)
      } else {
        Taro.showToast({
          title: '删除失败',
          icon: 'error',
          duration: 2000
        })
      }
    } catch (error) {
      logger.error('删除车辆失败', {error, vehicleId: vehicle.id})
      Taro.hideLoading()
      Taro.showToast({
        title: '删除失败',
        icon: 'error',
        duration: 2000
      })
    }
  }

  // 获取车辆状态文本
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

  if (loading) {
    return (
      <View className="flex items-center justify-center" style={{minHeight: '100vh', background: '#F8FAFC'}}>
        <View className="text-center">
          <View className="i-mdi-loading animate-spin text-5xl text-blue-600 mb-4"></View>
          <Text className="text-gray-600 font-medium">加载中...</Text>
        </View>
      </View>
    )
  }

  if (!vehicle) {
    return (
      <View className="flex items-center justify-center" style={{minHeight: '100vh', background: '#F8FAFC'}}>
        <View className="text-center">
          <View className="i-mdi-alert-circle text-5xl text-red-500 mb-4"></View>
          <Text className="text-gray-800 text-lg font-medium">车辆不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 车辆头部卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between mb-4">
              <View className="flex-1">
                <View className="bg-white rounded-lg px-4 py-2 mb-3 inline-block">
                  <Text className="text-blue-900 text-2xl font-bold">{vehicle.plate_number}</Text>
                </View>
                <Text className="text-white text-lg font-medium mb-1">
                  {vehicle.brand} {vehicle.model}
                </Text>
                {vehicle.color && <Text className="text-blue-100 text-sm">颜色：{vehicle.color}</Text>}
              </View>
              <View className={`rounded-full px-4 py-2 ${getStatusColor(vehicle.status)}`}>
                <Text className="text-white text-sm font-medium">{getStatusText(vehicle.status)}</Text>
              </View>
            </View>
          </View>

          {/* 补录照片按钮 - 只在审核不通过且有需要补录的照片时显示 */}
          {vehicle.review_status === 'rejected' && vehicle.required_photos && vehicle.required_photos.length > 0 && (
            <View className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
              <View className="flex items-center justify-between">
                <View className="flex-1">
                  <View className="flex items-center mb-1">
                    <View className="i-mdi-alert-circle text-xl text-red-600 mr-2"></View>
                    <Text className="text-red-900 font-bold">需要补录照片</Text>
                  </View>
                  <Text className="text-red-700 text-sm">
                    审核未通过，需要重新拍摄 {vehicle.required_photos.length} 张照片
                  </Text>
                </View>
                <View
                  className="bg-red-500 rounded-lg px-6 py-3 ml-4 active:bg-red-600 transition-colors"
                  onClick={() => {
                    Taro.navigateTo({
                      url: `/pages/driver/edit-vehicle/index?id=${vehicle.id}`
                    })
                  }}
                  style={{cursor: 'pointer'}}>
                  <View className="flex items-center">
                    <View className="i-mdi-camera-plus text-xl text-white mr-1"></View>
                    <Text className="text-white font-bold">补录照片</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 测试功能：删除按钮 */}
          <View className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
            <View className="flex items-center justify-between">
              <View className="flex-1">
                <View className="flex items-center mb-1">
                  <View className="i-mdi-alert text-xl text-red-600 mr-2"></View>
                  <Text className="text-red-900 font-bold">测试功能</Text>
                </View>
                <Text className="text-red-700 text-sm">删除此车辆记录，方便重新录入测试</Text>
              </View>
              <View
                className="bg-red-500 rounded-lg px-6 py-3 ml-4"
                onClick={handleDeleteVehicle}
                style={{cursor: 'pointer'}}>
                <View className="flex items-center">
                  <View className="i-mdi-delete text-xl text-white mr-1"></View>
                  <Text className="text-white font-bold">删除</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 基本信息卡片 */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-information text-2xl text-blue-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">基本信息</Text>
            </View>
            <View className="space-y-3">
              <InfoRow icon="i-mdi-car" label="车辆类型" value={vehicle.vehicle_type || '未填写'} />
              <InfoRow icon="i-mdi-barcode" label="车辆识别代号" value={vehicle.vin || '未填写'} />
              <InfoRow icon="i-mdi-file-document" label="使用性质" value={vehicle.use_character || '未填写'} />
              <InfoRow
                icon="i-mdi-calendar"
                label="注册日期"
                value={vehicle.register_date ? new Date(vehicle.register_date).toLocaleDateString('zh-CN') : '未填写'}
              />
            </View>
          </View>

          {/* 租赁信息卡片 */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
            <View className="flex items-center justify-between mb-4">
              <View className="flex items-center">
                <View className="i-mdi-file-document-edit text-2xl text-teal-600 mr-2"></View>
                <Text className="text-lg font-bold text-gray-800">租赁信息</Text>
              </View>
              {!isEditingLease && (
                <View
                  className="bg-teal-500 rounded-lg px-4 py-2 active:scale-95 transition-all"
                  onClick={handleStartEditLease}>
                  <View className="flex items-center">
                    <View className="i-mdi-pencil text-base text-white mr-1"></View>
                    <Text className="text-white text-sm font-medium">编辑</Text>
                  </View>
                </View>
              )}
            </View>

            {!isEditingLease ? (
              // 查看模式
              <View className="space-y-3">
                {vehicle.ownership_type ? (
                  <>
                    <InfoRow
                      icon="i-mdi-domain"
                      label="车辆归属"
                      value={vehicle.ownership_type === 'company' ? '公司车' : '个人车'}
                    />
                    {/* 显示所有租赁信息，不限制车辆类型 */}
                    {vehicle.lessor_name && <InfoRow icon="i-mdi-account-tie" label="租赁方" value={vehicle.lessor_name} />}
                    {vehicle.lessor_contact && (
                      <InfoRow icon="i-mdi-phone" label="租赁方联系方式" value={vehicle.lessor_contact} />
                    )}
                    {vehicle.lessee_name && <InfoRow icon="i-mdi-account" label="承租方" value={vehicle.lessee_name} />}
                    {vehicle.lessee_contact && (
                      <InfoRow icon="i-mdi-phone" label="承租方联系方式" value={vehicle.lessee_contact} />
                    )}
                    {vehicle.monthly_rent !== null && vehicle.monthly_rent !== undefined && (
                      <InfoRow icon="i-mdi-cash" label="月租金" value={`¥${vehicle.monthly_rent}`} />
                    )}
                    {vehicle.lease_start_date && (
                      <InfoRow
                        icon="i-mdi-calendar-start"
                        label="租赁开始日期"
                        value={new Date(vehicle.lease_start_date).toLocaleDateString('zh-CN')}
                      />
                    )}
                    {vehicle.lease_end_date && (
                      <InfoRow
                        icon="i-mdi-calendar-end"
                        label="租赁结束日期"
                        value={new Date(vehicle.lease_end_date).toLocaleDateString('zh-CN')}
                      />
                    )}
                    {vehicle.rent_payment_day && (
                      <InfoRow icon="i-mdi-calendar-clock" label="每月租金缴纳日" value={`每月${vehicle.rent_payment_day}日`} />
                    )}
                  </>
                ) : (
                  <Text className="text-gray-500 text-center py-4">暂无租赁信息</Text>
                )}
              </View>
            ) : (
              // 编辑模式
              <View className="space-y-4">
                {/* 车辆归属类型 */}
                <View>
                  <Text className="text-sm text-gray-700 mb-2 block">车辆归属类型 *</Text>
                  <Picker
                    mode="selector"
                    range={['公司车', '个人车']}
                    value={leaseForm.ownership_type === 'company' ? 0 : 1}
                    onChange={(e) => {
                      const value = e.detail.value === 0 ? 'company' : 'personal'
                      setLeaseForm({...leaseForm, ownership_type: value as OwnershipType})
                    }}>
                    <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                      <Text className={leaseForm.ownership_type ? 'text-gray-800' : 'text-gray-400'}>
                        {leaseForm.ownership_type === 'company'
                          ? '公司车'
                          : leaseForm.ownership_type === 'personal'
                            ? '个人车'
                            : '请选择'}
                      </Text>
                      <View className="i-mdi-chevron-down text-xl text-gray-400"></View>
                    </View>
                  </Picker>
                </View>

                {/* 租赁信息 - 所有车辆类型都可以编辑 */}
                {/* 租赁方信息 */}
                <View>
                  <Text className="text-sm text-gray-700 mb-2 block">租赁方名称</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-gray-50 rounded-lg px-4 py-3 w-full"
                      placeholder="请输入租赁方名称"
                      value={leaseForm.lessor_name}
                      onInput={(e) => setLeaseForm({...leaseForm, lessor_name: e.detail.value})}
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm text-gray-700 mb-2 block">租赁方联系方式</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-gray-50 rounded-lg px-4 py-3 w-full"
                      placeholder="请输入租赁方联系方式"
                      value={leaseForm.lessor_contact}
                      onInput={(e) => setLeaseForm({...leaseForm, lessor_contact: e.detail.value})}
                    />
                  </View>
                </View>

                {/* 承租方信息 */}
                <View>
                  <Text className="text-sm text-gray-700 mb-2 block">承租方名称</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-gray-50 rounded-lg px-4 py-3 w-full"
                      placeholder="请输入承租方名称"
                      value={leaseForm.lessee_name}
                      onInput={(e) => setLeaseForm({...leaseForm, lessee_name: e.detail.value})}
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm text-gray-700 mb-2 block">承租方联系方式</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-gray-50 rounded-lg px-4 py-3 w-full"
                      placeholder="请输入承租方联系方式"
                      value={leaseForm.lessee_contact}
                      onInput={(e) => setLeaseForm({...leaseForm, lessee_contact: e.detail.value})}
                    />
                  </View>
                </View>

                {/* 租金信息 */}
                <View>
                  <Text className="text-sm text-gray-700 mb-2 block">月租金（元）</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-gray-50 rounded-lg px-4 py-3 w-full"
                      type="number"
                      placeholder="请输入月租金"
                      value={leaseForm.monthly_rent}
                      onInput={(e) => setLeaseForm({...leaseForm, monthly_rent: e.detail.value})}
                    />
                  </View>
                </View>

                {/* 租期信息 */}
                <View>
                  <Text className="text-sm text-gray-700 mb-2 block">租赁开始日期</Text>
                  <Picker
                    mode="date"
                    value={leaseForm.lease_start_date}
                    onChange={(e) => setLeaseForm({...leaseForm, lease_start_date: e.detail.value})}>
                    <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                      <Text className={leaseForm.lease_start_date ? 'text-gray-800' : 'text-gray-400'}>
                        {leaseForm.lease_start_date || '请选择日期'}
                      </Text>
                      <View className="i-mdi-calendar text-xl text-gray-400"></View>
                    </View>
                  </Picker>
                </View>

                <View>
                  <Text className="text-sm text-gray-700 mb-2 block">租赁结束日期</Text>
                  <Picker
                    mode="date"
                    value={leaseForm.lease_end_date}
                    onChange={(e) => setLeaseForm({...leaseForm, lease_end_date: e.detail.value})}>
                    <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                      <Text className={leaseForm.lease_end_date ? 'text-gray-800' : 'text-gray-400'}>
                        {leaseForm.lease_end_date || '请选择日期'}
                      </Text>
                      <View className="i-mdi-calendar text-xl text-gray-400"></View>
                    </View>
                  </Picker>
                </View>

                <View>
                  <Text className="text-sm text-gray-700 mb-2 block">每月租金缴纳日（1-31）</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-gray-50 rounded-lg px-4 py-3 w-full"
                      type="number"
                      placeholder="请输入缴纳日（1-31）"
                      value={leaseForm.rent_payment_day}
                      onInput={(e) => setLeaseForm({...leaseForm, rent_payment_day: e.detail.value})}
                    />
                  </View>
                </View>

                {/* 操作按钮 */}
                <View className="flex gap-3 pt-2">
                  <View
                    className="flex-1 bg-gray-500 rounded-lg py-3 active:scale-95 transition-all"
                    onClick={handleCancelEditLease}>
                    <Text className="text-white text-center font-medium">取消</Text>
                  </View>
                  <View
                    className="flex-1 bg-teal-500 rounded-lg py-3 active:scale-95 transition-all"
                    onClick={handleSaveLeaseInfo}>
                    <Text className="text-white text-center font-medium">保存</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 标签页导航 */}
          <View className="bg-white rounded-t-2xl shadow-md">
            <View className="flex border-b border-gray-200">
              <View
                className={`flex-1 py-4 text-center ${activeTab === 'pickup' ? 'border-b-2 border-blue-600' : ''}`}
                onClick={() => setActiveTab('pickup')}>
                <Text className={`font-medium ${activeTab === 'pickup' ? 'text-blue-600' : 'text-gray-600'}`}>
                  提车照片
                </Text>
              </View>
              <View
                className={`flex-1 py-4 text-center ${activeTab === 'return' ? 'border-b-2 border-blue-600' : ''}`}
                onClick={() => setActiveTab('return')}>
                <Text className={`font-medium ${activeTab === 'return' ? 'text-blue-600' : 'text-gray-600'}`}>
                  还车照片
                </Text>
              </View>
              <View
                className={`flex-1 py-4 text-center ${activeTab === 'registration' ? 'border-b-2 border-blue-600' : ''}`}
                onClick={() => setActiveTab('registration')}>
                <Text className={`font-medium ${activeTab === 'registration' ? 'text-blue-600' : 'text-gray-600'}`}>
                  行驶证照片
                </Text>
              </View>
              <View
                className={`flex-1 py-4 text-center ${activeTab === 'damage' ? 'border-b-2 border-blue-600' : ''}`}
                onClick={() => setActiveTab('damage')}>
                <Text className={`font-medium ${activeTab === 'damage' ? 'text-blue-600' : 'text-gray-600'}`}>
                  车损特写
                </Text>
              </View>
            </View>
          </View>

          {/* 标签页内容 */}
          <View className="bg-white rounded-b-2xl p-5 mb-4 shadow-md">
            {/* 提车照片标签页 */}
            {activeTab === 'pickup' && (
              <View>
                {/* 提车时间 */}
                <View className="bg-green-50 rounded-lg p-4 mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-clock-check-outline text-2xl text-green-600 mr-2"></View>
                    <View className="flex-1">
                      <Text className="text-sm text-gray-600 mb-1">提车录入时间</Text>
                      <Text className="text-base text-gray-800 font-bold">{formatTime(vehicle.pickup_time)}</Text>
                    </View>
                  </View>
                </View>

                {/* 提车照片网格 */}
                {vehicle.pickup_photos && vehicle.pickup_photos.length > 0 ? (
                  <View className="grid grid-cols-3 gap-3">
                    {vehicle.pickup_photos.map((photo, index) => {
                      const photoUrl = getPhotoUrl(photo)
                      return (
                        <View
                          key={index}
                          className="relative rounded-lg overflow-hidden bg-gray-100"
                          onClick={() => {
                            const urls = vehicle.pickup_photos?.map((p) => getPhotoUrl(p)).filter(Boolean) || []
                            if (photoUrl && urls.length > 0 && !failedImages.has(photoUrl)) {
                              previewImage(photoUrl, urls)
                            }
                          }}>
                          {photoUrl ? (
                            failedImages.has(photoUrl) ? (
                              <View className="w-full h-24 flex flex-col items-center justify-center bg-red-50">
                                <View className="i-mdi-image-broken text-2xl text-red-400 mb-1"></View>
                                <Text className="text-red-600 text-xs">加载失败</Text>
                              </View>
                            ) : (
                              <Image
                                src={photoUrl}
                                mode="aspectFill"
                                className="w-full h-24"
                                onError={() => handleImageError(photoUrl, '提车照片', index)}
                              />
                            )
                          ) : (
                            <View className="w-full h-24 flex items-center justify-center">
                              <View className="i-mdi-image-off text-2xl text-gray-400"></View>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                ) : (
                  <View className="flex flex-col items-center justify-center py-12">
                    <View className="i-mdi-image-off text-5xl text-gray-300 mb-2"></View>
                    <Text className="text-gray-500">暂无提车照片</Text>
                  </View>
                )}
              </View>
            )}

            {/* 还车照片标签页 */}
            {activeTab === 'return' && (
              <View>
                {/* 还车时间 */}
                <View className="bg-gray-50 rounded-lg p-4 mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-clock-check text-2xl text-gray-600 mr-2"></View>
                    <View className="flex-1">
                      <Text className="text-sm text-gray-600 mb-1">还车录入时间</Text>
                      <Text className="text-base text-gray-800 font-bold">{formatTime(vehicle.return_time)}</Text>
                    </View>
                  </View>
                </View>

                {/* 还车照片网格 */}
                {vehicle.return_photos && vehicle.return_photos.length > 0 ? (
                  <View className="grid grid-cols-3 gap-3">
                    {vehicle.return_photos.map((photo, index) => {
                      const photoUrl = getPhotoUrl(photo)
                      return (
                        <View
                          key={index}
                          className="relative rounded-lg overflow-hidden bg-gray-100"
                          onClick={() => {
                            const urls = vehicle.return_photos?.map((p) => getPhotoUrl(p)).filter(Boolean) || []
                            if (photoUrl && urls.length > 0 && !failedImages.has(photoUrl)) {
                              previewImage(photoUrl, urls)
                            }
                          }}>
                          {photoUrl ? (
                            failedImages.has(photoUrl) ? (
                              <View className="w-full h-24 flex flex-col items-center justify-center bg-red-50">
                                <View className="i-mdi-image-broken text-2xl text-red-400 mb-1"></View>
                                <Text className="text-red-600 text-xs">加载失败</Text>
                              </View>
                            ) : (
                              <Image
                                src={photoUrl}
                                mode="aspectFill"
                                className="w-full h-24"
                                onError={() => handleImageError(photoUrl, '还车照片', index)}
                              />
                            )
                          ) : (
                            <View className="w-full h-24 flex items-center justify-center">
                              <View className="i-mdi-image-off text-2xl text-gray-400"></View>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                ) : (
                  <View className="flex flex-col items-center justify-center py-12">
                    <View className="i-mdi-image-off text-5xl text-gray-300 mb-2"></View>
                    <Text className="text-gray-500">暂无还车照片</Text>
                  </View>
                )}
              </View>
            )}

            {/* 行驶证照片标签页 */}
            {activeTab === 'registration' && (
              <View>
                {/* 提示信息 */}
                <View className="bg-blue-50 rounded-lg p-4 mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-information-outline text-2xl text-blue-600 mr-2"></View>
                    <Text className="text-sm text-gray-600">行驶证照片在提车时录入</Text>
                  </View>
                </View>

                {/* 行驶证照片网格 */}
                {vehicle.registration_photos && vehicle.registration_photos.length > 0 ? (
                  <View className="grid grid-cols-2 gap-3">
                    {vehicle.registration_photos.map((photo, index) => {
                      const photoUrl = getPhotoUrl(photo)
                      return (
                        <View
                          key={index}
                          className="relative rounded-lg overflow-hidden bg-gray-100"
                          onClick={() => {
                            const urls = vehicle.registration_photos?.map((p) => getPhotoUrl(p)).filter(Boolean) || []
                            if (photoUrl && urls.length > 0 && !failedImages.has(photoUrl)) {
                              previewImage(photoUrl, urls)
                            }
                          }}>
                          {photoUrl ? (
                            failedImages.has(photoUrl) ? (
                              <View className="w-full h-32 flex flex-col items-center justify-center bg-red-50">
                                <View className="i-mdi-image-broken text-3xl text-red-400 mb-1"></View>
                                <Text className="text-red-600 text-xs">加载失败</Text>
                              </View>
                            ) : (
                              <>
                                <Image
                                  src={photoUrl}
                                  mode="aspectFit"
                                  className="w-full h-32 bg-gray-100"
                                  onError={() => handleImageError(photoUrl, '行驶证照片', index)}
                                />
                                <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                  <Text className="text-white text-xs font-medium">
                                    {index === 0 ? '主页' : index === 1 ? '副页' : '副页背面'}
                                  </Text>
                                </View>
                              </>
                            )
                          ) : (
                            <View className="w-full h-32 flex items-center justify-center">
                              <View className="i-mdi-image-off text-3xl text-gray-400"></View>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                ) : (
                  <View className="flex flex-col items-center justify-center py-12">
                    <View className="i-mdi-image-off text-5xl text-gray-300 mb-2"></View>
                    <Text className="text-gray-500">暂无行驶证照片</Text>
                  </View>
                )}
              </View>
            )}

            {/* 车损特写照片标签页 */}
            {activeTab === 'damage' && (
              <View>
                {/* 提示信息 */}
                <View className="bg-orange-50 rounded-lg p-4 mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-information-outline text-2xl text-orange-600 mr-2"></View>
                    <Text className="text-sm text-gray-600">车损特写照片用于记录车辆损伤情况</Text>
                  </View>
                </View>

                {/* 车损照片网格 */}
                {vehicle.damage_photos && vehicle.damage_photos.length > 0 ? (
                  <View className="grid grid-cols-3 gap-2">
                    {vehicle.damage_photos.map((photo, index) => {
                      const photoUrl = getPhotoUrl(photo)
                      return (
                        <View
                          key={index}
                          className="relative rounded-lg overflow-hidden bg-gray-100"
                          onClick={() => {
                            const urls = vehicle.damage_photos?.map((p) => getPhotoUrl(p)).filter(Boolean) || []
                            if (photoUrl && urls.length > 0 && !failedImages.has(photoUrl)) {
                              previewImage(photoUrl, urls)
                            }
                          }}>
                          {photoUrl ? (
                            failedImages.has(photoUrl) ? (
                              <View className="w-full h-24 flex flex-col items-center justify-center bg-red-50">
                                <View className="i-mdi-image-broken text-2xl text-red-400 mb-1"></View>
                                <Text className="text-red-600 text-xs">加载失败</Text>
                              </View>
                            ) : (
                              <>
                                <Image
                                  src={photoUrl}
                                  mode="aspectFill"
                                  className="w-full h-24 bg-gray-100"
                                  onError={() => handleImageError(photoUrl, '车损照片', index)}
                                />
                                <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                                  <Text className="text-white text-xs font-medium">车损 {index + 1}</Text>
                                </View>
                              </>
                            )
                          ) : (
                            <View className="w-full h-24 flex items-center justify-center">
                              <View className="i-mdi-image-off text-2xl text-gray-400"></View>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                ) : (
                  <View className="flex flex-col items-center justify-center py-12">
                    <View className="i-mdi-image-off text-5xl text-gray-300 mb-2"></View>
                    <Text className="text-gray-500">暂无车损照片</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 底部间距 */}
          <View className="h-4"></View>
        </View>
      </ScrollView>
    </View>
  )
}

// 信息行组件
interface InfoRowProps {
  icon: string
  label: string
  value: string
}

const InfoRow: React.FC<InfoRowProps> = ({icon, label, value}) => (
  <View className="flex items-center py-2 border-b border-gray-100 last:border-0">
    <View className={`${icon} text-lg text-blue-600 mr-3`}></View>
    <View className="flex-1">
      <Text className="text-sm text-gray-500 block mb-0.5">{label}</Text>
      <Text className="text-base text-gray-800 font-medium">{value}</Text>
    </View>
  </View>
)

export default VehicleDetail
