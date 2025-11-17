/**
 * 超级管理端 - 车辆租赁编辑页面
 */

import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import type {OwnershipType, VehicleBase} from '@/db/types'
import {createVehicle, getVehicleBaseById, updateVehicle} from '@/db/vehicle-lease'

const VehicleLeaseEdit: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const vehicleId = router.params.id

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<VehicleBase>>({
    plate_number: '',
    brand: '',
    model: '',
    vehicle_type: '货车',
    color: '',
    vin: '',
    owner_name: '',
    use_character: '',
    register_date: null,
    engine_number: '',
    ownership_type: 'company',
    lessor_name: '',
    lessor_contact: '',
    lessee_name: '',
    lessee_contact: '',
    monthly_rent: 0,
    lease_start_date: null,
    lease_end_date: null,
    rent_payment_day: null
  })

  // 车辆归属类型选项
  const ownershipTypeOptions = [
    {label: '公司车', value: 'company'},
    {label: '个人车', value: 'personal'}
  ]

  // 加载车辆信息
  const loadVehicle = useCallback(async () => {
    if (!vehicleId) return

    setLoading(true)
    try {
      const data = await getVehicleBaseById(vehicleId)
      if (data) {
        setFormData(data)
      }
    } catch (error) {
      console.error('加载车辆信息失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  // 保存车辆
  const handleSave = useCallback(async () => {
    // 验证必填字段
    if (!formData.plate_number?.trim()) {
      Taro.showToast({
        title: '请输入车牌号',
        icon: 'none'
      })
      return
    }

    if (!formData.brand?.trim()) {
      Taro.showToast({
        title: '请输入品牌',
        icon: 'none'
      })
      return
    }

    if (!formData.model?.trim()) {
      Taro.showToast({
        title: '请输入型号',
        icon: 'none'
      })
      return
    }

    setLoading(true)
    try {
      if (vehicleId) {
        // 更新车辆
        await updateVehicle(vehicleId, formData)
        Taro.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        // 创建车辆
        await createVehicle(formData)
        Taro.showToast({
          title: '创建成功',
          icon: 'success'
        })
      }

      // 返回上一页
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('保存车辆失败:', error)
      Taro.showToast({
        title: '保存失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [vehicleId, formData])

  // 更新表单字段
  const updateField = useCallback((field: keyof VehicleBase, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // 选择日期
  const handleDateChange = useCallback(
    (field: 'register_date' | 'lease_start_date' | 'lease_end_date', e: any) => {
      updateField(field, e.detail.value)
    },
    [updateField]
  )

  // 选择车辆归属类型
  const handleOwnershipTypeChange = useCallback(
    (e: any) => {
      const index = e.detail.value
      updateField('ownership_type', ownershipTypeOptions[index].value as OwnershipType)
    },
    [updateField]
  )

  useEffect(() => {
    loadVehicle()
  }, [loadVehicle])

  if (!user) {
    return null
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-primary">{vehicleId ? '编辑车辆' : '添加车辆'}</Text>
            <Text className="text-sm text-muted-foreground mt-1">填写车辆基本信息和租赁信息</Text>
          </View>

          {/* 基本信息 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-foreground mb-3">基本信息</Text>

            <View className="space-y-3">
              {/* 车牌号 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">
                  车牌号 <Text className="text-destructive">*</Text>
                </Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入车牌号"
                    value={formData.plate_number}
                    onInput={(e) => updateField('plate_number', e.detail.value)}
                  />
                </View>
              </View>

              {/* 品牌 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">
                  品牌 <Text className="text-destructive">*</Text>
                </Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入品牌"
                    value={formData.brand}
                    onInput={(e) => updateField('brand', e.detail.value)}
                  />
                </View>
              </View>

              {/* 型号 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">
                  型号 <Text className="text-destructive">*</Text>
                </Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入型号"
                    value={formData.model}
                    onInput={(e) => updateField('model', e.detail.value)}
                  />
                </View>
              </View>

              {/* 车辆类型 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">车辆类型</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入车辆类型（如：货车）"
                    value={formData.vehicle_type || ''}
                    onInput={(e) => updateField('vehicle_type', e.detail.value)}
                  />
                </View>
              </View>

              {/* 颜色 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">颜色</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入颜色"
                    value={formData.color || ''}
                    onInput={(e) => updateField('color', e.detail.value)}
                  />
                </View>
              </View>

              {/* 车辆识别代号 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">车辆识别代号(VIN)</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入车辆识别代号"
                    value={formData.vin || ''}
                    onInput={(e) => updateField('vin', e.detail.value)}
                  />
                </View>
              </View>

              {/* 所有人 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">所有人</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入所有人"
                    value={formData.owner_name || ''}
                    onInput={(e) => updateField('owner_name', e.detail.value)}
                  />
                </View>
              </View>

              {/* 注册日期 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">注册日期</Text>
                <Picker
                  mode="date"
                  value={formData.register_date || ''}
                  onChange={(e) => handleDateChange('register_date', e)}>
                  <View className="bg-input text-foreground px-3 py-2 rounded border border-border w-full">
                    <Text className={formData.register_date ? 'text-foreground' : 'text-muted-foreground'}>
                      {formData.register_date || '请选择注册日期'}
                    </Text>
                  </View>
                </Picker>
              </View>
            </View>
          </View>

          {/* 租赁信息 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-foreground mb-3">租赁信息</Text>

            <View className="space-y-3">
              {/* 车辆归属 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">车辆归属</Text>
                <Picker
                  mode="selector"
                  range={ownershipTypeOptions.map((o) => o.label)}
                  value={ownershipTypeOptions.findIndex((o) => o.value === formData.ownership_type)}
                  onChange={handleOwnershipTypeChange}>
                  <View className="bg-input text-foreground px-3 py-2 rounded border border-border w-full">
                    <Text className="text-foreground">
                      {ownershipTypeOptions.find((o) => o.value === formData.ownership_type)?.label || '请选择'}
                    </Text>
                  </View>
                </Picker>
              </View>

              {/* 租赁方名称 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">租赁方名称</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入租赁方名称（出租车辆的公司或个人）"
                    value={formData.lessor_name || ''}
                    onInput={(e) => updateField('lessor_name', e.detail.value)}
                  />
                </View>
              </View>

              {/* 租赁方联系方式 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">租赁方联系方式</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入租赁方联系方式"
                    value={formData.lessor_contact || ''}
                    onInput={(e) => updateField('lessor_contact', e.detail.value)}
                  />
                </View>
              </View>

              {/* 承租方名称 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">承租方名称</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入承租方名称（租用车辆的公司或个人）"
                    value={formData.lessee_name || ''}
                    onInput={(e) => updateField('lessee_name', e.detail.value)}
                  />
                </View>
              </View>

              {/* 承租方联系方式 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">承租方联系方式</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入承租方联系方式"
                    value={formData.lessee_contact || ''}
                    onInput={(e) => updateField('lessee_contact', e.detail.value)}
                  />
                </View>
              </View>

              {/* 月租金 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">月租金（元）</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="请输入月租金"
                    type="digit"
                    value={formData.monthly_rent?.toString() || '0'}
                    onInput={(e) => updateField('monthly_rent', parseFloat(e.detail.value) || 0)}
                  />
                </View>
              </View>

              {/* 租赁开始日期 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">租赁开始日期</Text>
                <Picker
                  mode="date"
                  value={formData.lease_start_date || ''}
                  onChange={(e) => handleDateChange('lease_start_date', e)}>
                  <View className="bg-input text-foreground px-3 py-2 rounded border border-border w-full">
                    <Text className={formData.lease_start_date ? 'text-foreground' : 'text-muted-foreground'}>
                      {formData.lease_start_date || '请选择租赁开始日期'}
                    </Text>
                  </View>
                </Picker>
              </View>

              {/* 租赁结束日期 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">租赁结束日期</Text>
                <Picker
                  mode="date"
                  value={formData.lease_end_date || ''}
                  onChange={(e) => handleDateChange('lease_end_date', e)}>
                  <View className="bg-input text-foreground px-3 py-2 rounded border border-border w-full">
                    <Text className={formData.lease_end_date ? 'text-foreground' : 'text-muted-foreground'}>
                      {formData.lease_end_date || '请选择租赁结束日期'}
                    </Text>
                  </View>
                </Picker>
              </View>

              {/* 每月租金缴纳日 */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">每月租金缴纳日（1-31）</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    placeholder="自动根据租赁开始日期设置，也可手动输入"
                    type="number"
                    value={formData.rent_payment_day?.toString() || ''}
                    onInput={(e) => {
                      const day = parseInt(e.detail.value, 10)
                      if (day >= 1 && day <= 31) {
                        updateField('rent_payment_day', day)
                      }
                    }}
                  />
                </View>
                <Text className="text-xs text-muted-foreground mt-1">
                  提示：如果不填写，系统会自动根据租赁开始日期设置
                </Text>
              </View>
            </View>
          </View>

          {/* 保存按钮 */}
          <View className="flex gap-3">
            <Button
              className="flex-1 bg-muted text-muted-foreground py-4 rounded break-keep text-base"
              size="default"
              onClick={() => Taro.navigateBack()}>
              取消
            </Button>
            <Button
              className="flex-1 bg-primary text-white py-4 rounded break-keep text-base"
              size="default"
              onClick={handleSave}
              disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default VehicleLeaseEdit
