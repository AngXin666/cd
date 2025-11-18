/**
 * 超级管理员 - 编辑车辆租赁信息页面
 * 允许超级管理员编辑车辆的租赁相关信息
 */

import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getVehicleById, updateVehicle} from '@/db/api'
import type {OwnershipType, Vehicle} from '@/db/types'
import {createLogger} from '@/utils/logger'

// 创建页面日志记录器
const logger = createLogger('VehicleRentalEdit')

const VehicleRentalEdit: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [vehicleId, setVehicleId] = useState('')
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)

  // 表单数据
  const [ownershipType, setOwnershipType] = useState<OwnershipType | ''>('')
  const [lessorName, setLessorName] = useState('')
  const [lessorContact, setLessorContact] = useState('')
  const [lesseeName, setLesseeName] = useState('')
  const [lesseeContact, setLesseeContact] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [leaseStartDate, setLeaseStartDate] = useState('')
  const [leaseEndDate, setLeaseEndDate] = useState('')
  const [rentPaymentDay, setRentPaymentDay] = useState('')

  // 车辆归属类型选项
  const ownershipTypeOptions = [
    {label: '公司车', value: 'company'},
    {label: '个人车', value: 'personal'}
  ]

  // 租金缴纳日选项（1-31号）
  const paymentDayOptions = Array.from({length: 31}, (_, i) => ({
    label: `${i + 1}号`,
    value: String(i + 1)
  }))

  // 加载车辆信息
  const loadVehicle = useCallback(async () => {
    if (!vehicleId) return

    logger.info('开始加载车辆信息', {vehicleId})
    setLoading(true)
    try {
      const data = await getVehicleById(vehicleId)
      if (!data) {
        Taro.showToast({
          title: '车辆不存在',
          icon: 'none'
        })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
        return
      }

      logger.info('车辆信息加载成功', {vehicle: data})
      setVehicle(data)

      // 填充表单数据
      setOwnershipType(data.ownership_type || '')
      setLessorName(data.lessor_name || '')
      setLessorContact(data.lessor_contact || '')
      setLesseeName(data.lessee_name || '')
      setLesseeContact(data.lessee_contact || '')
      setMonthlyRent(data.monthly_rent !== null ? String(data.monthly_rent) : '')
      setLeaseStartDate(data.lease_start_date || '')
      setLeaseEndDate(data.lease_end_date || '')
      setRentPaymentDay(data.rent_payment_day !== null ? String(data.rent_payment_day) : '')
    } catch (error) {
      logger.error('加载车辆信息失败', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  // 页面显示时加载数据
  useDidShow(() => {
    const instance = Taro.getCurrentInstance()
    const id = instance.router?.params?.vehicleId
    if (id) {
      setVehicleId(id)
    }
  })

  // 当 vehicleId 变化时加载车辆信息
  useDidShow(() => {
    if (vehicleId) {
      loadVehicle()
    }
  })

  // 保存租赁信息
  const handleSave = async () => {
    if (!vehicle) return

    logger.info('开始保存租赁信息')
    setSaving(true)
    try {
      // 验证数据
      if (monthlyRent && Number.isNaN(Number(monthlyRent))) {
        Taro.showToast({
          title: '月租金格式不正确',
          icon: 'none'
        })
        return
      }

      if (rentPaymentDay && (Number(rentPaymentDay) < 1 || Number(rentPaymentDay) > 31)) {
        Taro.showToast({
          title: '租金缴纳日必须在1-31之间',
          icon: 'none'
        })
        return
      }

      // 验证日期
      if (leaseStartDate && leaseEndDate) {
        const startDate = new Date(leaseStartDate)
        const endDate = new Date(leaseEndDate)
        if (startDate > endDate) {
          Taro.showToast({
            title: '租赁结束日期不能早于开始日期',
            icon: 'none'
          })
          return
        }
      }

      // 更新车辆信息
      await updateVehicle(vehicle.id, {
        ownership_type: ownershipType || null,
        lessor_name: lessorName || null,
        lessor_contact: lessorContact || null,
        lessee_name: lesseeName || null,
        lessee_contact: lesseeContact || null,
        monthly_rent: monthlyRent ? Number(monthlyRent) : null,
        lease_start_date: leaseStartDate || null,
        lease_end_date: leaseEndDate || null,
        rent_payment_day: rentPaymentDay ? Number(rentPaymentDay) : null
      })

      logger.info('租赁信息保存成功')
      Taro.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      logger.error('保存租赁信息失败', error)
      Taro.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      setSaving(false)
    }
  }

  // 车辆归属类型选择器
  const handleOwnershipTypeChange = (e: {detail: {value: string}}) => {
    const index = Number(e.detail.value)
    setOwnershipType(ownershipTypeOptions[index].value as OwnershipType)
  }

  // 租金缴纳日选择器
  const handlePaymentDayChange = (e: {detail: {value: string}}) => {
    const index = Number(e.detail.value)
    setRentPaymentDay(paymentDayOptions[index].value)
  }

  // 日期选择器
  const handleStartDateChange = (e: {detail: {value: string}}) => {
    setLeaseStartDate(e.detail.value)
  }

  const handleEndDateChange = (e: {detail: {value: string}}) => {
    setLeaseEndDate(e.detail.value)
  }

  if (loading) {
    return (
      <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
        <View className="flex flex-col items-center justify-center py-20">
          <View className="i-mdi-loading animate-spin text-5xl text-blue-600 mb-4"></View>
          <Text className="text-gray-600 font-medium">加载中...</Text>
        </View>
      </View>
    )
  }

  if (!vehicle) {
    return (
      <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
        <View className="flex flex-col items-center justify-center py-20">
          <View className="i-mdi-alert-circle text-5xl text-red-600 mb-4"></View>
          <Text className="text-gray-600 font-medium">车辆不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 车辆信息卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-4 mb-4 shadow-lg">
            <View className="flex items-center">
              <View className="i-mdi-car text-2xl text-white mr-2"></View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">{vehicle.plate_number}</Text>
                <Text className="text-blue-100 text-sm">
                  {vehicle.brand} {vehicle.model}
                </Text>
              </View>
            </View>
          </View>

          {/* 租赁信息表单 */}
          <View className="bg-white rounded-2xl p-4 shadow-lg">
            <View className="flex items-center mb-4">
              <View className="i-mdi-file-document-edit text-2xl text-amber-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">租赁信息</Text>
            </View>

            {/* 车辆归属类型 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-medium mb-2 block">车辆归属类型</Text>
              <Picker
                mode="selector"
                range={ownershipTypeOptions.map((opt) => opt.label)}
                value={ownershipTypeOptions.findIndex((opt) => opt.value === ownershipType)}
                onChange={handleOwnershipTypeChange}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Text className="text-gray-800">
                    {ownershipType
                      ? ownershipTypeOptions.find((opt) => opt.value === ownershipType)?.label
                      : '请选择车辆归属类型'}
                  </Text>
                </View>
              </Picker>
            </View>

            {/* 租赁方信息 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-medium mb-2 block">租赁方名称</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 w-full"
                  placeholder="请输入租赁方名称"
                  value={lessorName}
                  onInput={(e) => setLessorName(e.detail.value)}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-medium mb-2 block">租赁方联系方式</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 w-full"
                  placeholder="请输入租赁方联系方式"
                  value={lessorContact}
                  onInput={(e) => setLessorContact(e.detail.value)}
                />
              </View>
            </View>

            {/* 承租方信息 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-medium mb-2 block">承租方名称</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 w-full"
                  placeholder="请输入承租方名称"
                  value={lesseeName}
                  onInput={(e) => setLesseeName(e.detail.value)}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-medium mb-2 block">承租方联系方式</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 w-full"
                  placeholder="请输入承租方联系方式"
                  value={lesseeContact}
                  onInput={(e) => setLesseeContact(e.detail.value)}
                />
              </View>
            </View>

            {/* 租赁期限 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-medium mb-2 block">租赁开始日期</Text>
              <Picker mode="date" value={leaseStartDate} onChange={handleStartDateChange}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Text className="text-gray-800">{leaseStartDate || '请选择租赁开始日期'}</Text>
                </View>
              </Picker>
            </View>

            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-medium mb-2 block">租赁结束日期</Text>
              <Picker mode="date" value={leaseEndDate} onChange={handleEndDateChange}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Text className="text-gray-800">{leaseEndDate || '请选择租赁结束日期'}</Text>
                </View>
              </Picker>
            </View>

            {/* 租金信息 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-medium mb-2 block">月租金（元）</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 w-full"
                  placeholder="请输入月租金"
                  type="number"
                  value={monthlyRent}
                  onInput={(e) => setMonthlyRent(e.detail.value)}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-medium mb-2 block">租金缴纳日</Text>
              <Picker
                mode="selector"
                range={paymentDayOptions.map((opt) => opt.label)}
                value={paymentDayOptions.findIndex((opt) => opt.value === rentPaymentDay)}
                onChange={handlePaymentDayChange}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Text className="text-gray-800">
                    {rentPaymentDay ? `每月${rentPaymentDay}号` : '请选择租金缴纳日'}
                  </Text>
                </View>
              </Picker>
            </View>

            {/* 保存按钮 */}
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg break-keep text-base font-bold"
              size="default"
              onClick={handleSave}
              disabled={saving}>
              {saving ? '保存中...' : '保存租赁信息'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default VehicleRentalEdit
