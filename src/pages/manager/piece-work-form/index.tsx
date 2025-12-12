import {Input, Picker, ScrollView, Switch, Text, Textarea, View} from '@tarojs/components'
import Taro, {getCurrentInstance, navigateBack} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import * as PieceworkAPI from '@/db/api/piecework'
import * as UsersAPI from '@/db/api/users'
import * as WarehousesAPI from '@/db/api/warehouses'

import type {PieceWorkCategory, PieceWorkRecordInput, Profile, Warehouse} from '@/db/types'
import {getLocalDateString} from '@/utils/date'

const ManagerPieceWorkForm: React.FC = () => {
  const {user} = useAuth({guard: true})
  const instance = getCurrentInstance()
  const params = instance.router?.params || {}
  const mode = params.mode || 'add' // 'add' 或 'edit'
  const _recordId = params.id || ''
  const defaultWarehouseId = params.warehouseId || ''

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])

  // 表单数据
  const [selectedDriverIndex, setSelectedDriverIndex] = useState(0)
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0)
  const [workDate, setWorkDate] = useState('')
  const [workTime, setWorkTime] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [needUpstairs, setNeedUpstairs] = useState(false)
  const [upstairsPrice, setUpstairsPrice] = useState('')
  const [needSorting, setNeedSorting] = useState(false)
  const [sortingQuantity, setSortingQuantity] = useState('')
  const [sortingUnitPrice, setSortingUnitPrice] = useState('')
  const [notes, setNotes] = useState('')

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    try {
      // 加载管辖的仓库
      const warehousesData = await WarehousesAPI.getManagerWarehouses(user.id)
      setWarehouses(warehousesData)

      // 如果有默认仓库ID，设置选中
      if (defaultWarehouseId && mode === 'add') {
        const index = warehousesData.findIndex((w) => w.id === defaultWarehouseId)
        if (index >= 0) {
          setSelectedWarehouseIndex(index)
        }
      }

      // 加载所有司机
      const driversData = await UsersAPI.getDriverProfiles()
      setDrivers(driversData)

      // 加载所有品类
      const categoriesData = await PieceworkAPI.getActiveCategories()
      setCategories(categoriesData)

      // 设置默认日期和时间
      const now = new Date()
      const dateStr = getLocalDateString(now)
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      setWorkDate(dateStr)
      setWorkTime(`${hours}:${minutes}`)
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'error',
        duration: 2000
      })
    }
  }, [user?.id, defaultWarehouseId, mode])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 计算总金额
  const calculateTotalAmount = () => {
    const qty = Number(quantity) || 0
    const price = Number(unitPrice) || 0
    const upstairs = needUpstairs ? Number(upstairsPrice) || 0 : 0
    const sortingQty = needSorting ? Number(sortingQuantity) || 0 : 0
    const sortingPrice = needSorting ? Number(sortingUnitPrice) || 0 : 0

    return qty * price + upstairs + sortingQty * sortingPrice
  }

  // 保存记录
  const handleSave = async () => {
    // 验证必填字段
    if (selectedDriverIndex < 0 || !drivers[selectedDriverIndex]) {
      Taro.showToast({
        title: '请选择司机',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (selectedWarehouseIndex < 0 || !warehouses[selectedWarehouseIndex]) {
      Taro.showToast({
        title: '请选择仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (selectedCategoryIndex < 0 || !categories[selectedCategoryIndex]) {
      Taro.showToast({
        title: '请选择品类',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!workDate) {
      Taro.showToast({
        title: '请选择工作日期',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!workTime) {
      Taro.showToast({
        title: '请选择工作时间',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!quantity || Number(quantity) <= 0) {
      Taro.showToast({
        title: '请输入有效的数量',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!unitPrice || Number(unitPrice) <= 0) {
      Taro.showToast({
        title: '请输入有效的单价',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (needUpstairs && (!upstairsPrice || Number(upstairsPrice) <= 0)) {
      Taro.showToast({
        title: '请输入有效的上楼费',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (needSorting && (!sortingQuantity || Number(sortingQuantity) <= 0)) {
      Taro.showToast({
        title: '请输入有效的分拣数量',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (needSorting && (!sortingUnitPrice || Number(sortingUnitPrice) <= 0)) {
      Taro.showToast({
        title: '请输入有效的分拣单价',
        icon: 'none',
        duration: 2000
      })
      return
    }

    try {
      const totalAmount = calculateTotalAmount()

      const recordData: PieceWorkRecordInput = {
        user_id: drivers[selectedDriverIndex].id,
        work_date: workDate,
        warehouse_id: warehouses[selectedWarehouseIndex].id,
        category_id: categories[selectedCategoryIndex].id,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        need_upstairs: needUpstairs,
        upstairs_price: needUpstairs ? Number(upstairsPrice) : 0,
        need_sorting: needSorting,
        sorting_quantity: needSorting ? Number(sortingQuantity) : 0,
        sorting_unit_price: needSorting ? Number(sortingUnitPrice) : 0,
        total_amount: totalAmount,
        notes: notes.trim()
      }

      await PieceworkAPI.createPieceWorkRecord(recordData)
      Taro.showToast({
        title: '添加成功',
        icon: 'success',
        duration: 2000
      })

      // 返回上一页
      setTimeout(() => {
        navigateBack()
      }, 500)
    } catch (error) {
      console.error('保存记录失败:', error)
      Taro.showToast({
        title: '保存失败',
        icon: 'error',
        duration: 2000
      })
    }
  }

  // 取消
  const handleCancel = () => {
    navigateBack()
  }

  const driverOptions = drivers.map((d) => d.name || d.phone || '未命名')
  const warehouseOptions = warehouses.map((w) => w.name)
  const categoryOptions = categories.map((c) => c.category_name)

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">
              {mode === 'edit' ? '编辑计件记录' : '添加计件记录'}
            </Text>
            <Text className="text-blue-100 text-sm block">填写计件信息</Text>
          </View>

          {/* 表单 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            {/* 司机选择 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                司机 <Text className="text-red-500">*</Text>
              </Text>
              <Picker
                mode="selector"
                range={driverOptions}
                value={selectedDriverIndex}
                onChange={(e) => setSelectedDriverIndex(Number(e.detail.value))}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800">{driverOptions[selectedDriverIndex] || '请选择司机'}</Text>
                  <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>

            {/* 仓库选择 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                仓库 <Text className="text-red-500">*</Text>
              </Text>
              <Picker
                mode="selector"
                range={warehouseOptions}
                value={selectedWarehouseIndex}
                onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800">{warehouseOptions[selectedWarehouseIndex] || '请选择仓库'}</Text>
                  <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>

            {/* 品类选择 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                品类 <Text className="text-red-500">*</Text>
              </Text>
              <Picker
                mode="selector"
                range={categoryOptions}
                value={selectedCategoryIndex}
                onChange={(e) => setSelectedCategoryIndex(Number(e.detail.value))}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800">{categoryOptions[selectedCategoryIndex] || '请选择品类'}</Text>
                  <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>

            {/* 工作日期 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                工作日期 <Text className="text-red-500">*</Text>
              </Text>
              <Picker mode="date" value={workDate} onChange={(e) => setWorkDate(e.detail.value)}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800">{workDate || '请选择日期'}</Text>
                  <View className="i-mdi-calendar text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>

            {/* 工作时间 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                工作时间 <Text className="text-red-500">*</Text>
              </Text>
              <Picker mode="time" value={workTime} onChange={(e) => setWorkTime(e.detail.value)}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800">{workTime || '请选择时间'}</Text>
                  <View className="i-mdi-clock text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>

            {/* 数量 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                数量 <Text className="text-red-500">*</Text>
              </Text>
              <Input
                type="number"
                value={quantity}
                onInput={(e) => setQuantity(e.detail.value)}
                placeholder="请输入数量"
                className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
              />
            </View>

            {/* 单价 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                单价（元） <Text className="text-red-500">*</Text>
              </Text>
              <Input
                type="digit"
                value={unitPrice}
                onInput={(e) => setUnitPrice(e.detail.value)}
                placeholder="请输入单价"
                className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
              />
            </View>

            {/* 是否需要上楼 */}
            <View className="mb-4">
              <View className="flex items-center justify-between">
                <Text className="text-sm text-gray-700">是否需要上楼</Text>
                <Switch checked={needUpstairs} onChange={(e) => setNeedUpstairs(e.detail.value)} />
              </View>
            </View>

            {/* 上楼费 */}
            {needUpstairs && (
              <View className="mb-4">
                <Text className="text-sm text-gray-700 block mb-2">
                  上楼费（元） <Text className="text-red-500">*</Text>
                </Text>
                <Input
                  type="digit"
                  value={upstairsPrice}
                  onInput={(e) => setUpstairsPrice(e.detail.value)}
                  placeholder="请输入上楼费"
                  className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
                />
              </View>
            )}

            {/* 是否需要分拣 */}
            <View className="mb-4">
              <View className="flex items-center justify-between">
                <Text className="text-sm text-gray-700">是否需要分拣</Text>
                <Switch checked={needSorting} onChange={(e) => setNeedSorting(e.detail.value)} />
              </View>
            </View>

            {/* 分拣数量 */}
            {needSorting && (
              <View className="mb-4">
                <Text className="text-sm text-gray-700 block mb-2">
                  分拣数量 <Text className="text-red-500">*</Text>
                </Text>
                <Input
                  type="number"
                  value={sortingQuantity}
                  onInput={(e) => setSortingQuantity(e.detail.value)}
                  placeholder="请输入分拣数量"
                  className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
                />
              </View>
            )}

            {/* 分拣单价 */}
            {needSorting && (
              <View className="mb-4">
                <Text className="text-sm text-gray-700 block mb-2">
                  分拣单价（元） <Text className="text-red-500">*</Text>
                </Text>
                <Input
                  type="digit"
                  value={sortingUnitPrice}
                  onInput={(e) => setSortingUnitPrice(e.detail.value)}
                  placeholder="请输入分拣单价"
                  className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
                />
              </View>
            )}

            {/* 备注 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">备注</Text>
              <Textarea
                value={notes}
                onInput={(e) => setNotes(e.detail.value)}
                placeholder="请输入备注信息（可选）"
                maxlength={200}
                className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
                style={{minHeight: '80px'}}
              />
            </View>

            {/* 总金额预览 */}
            <View className="bg-blue-50 rounded-lg p-4">
              <View className="flex items-center justify-between">
                <Text className="text-base font-bold text-gray-800">预计总金额</Text>
                <Text className="text-2xl font-bold text-blue-900">¥{calculateTotalAmount().toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* 操作按钮 */}
          <View className="flex gap-3">
            <View onClick={handleCancel} className="flex-1 bg-gray-200 rounded-lg p-4 text-center">
              <Text className="text-gray-800 font-bold">取消</Text>
            </View>
            <View
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-4 text-center shadow-lg">
              <Text className="text-white font-bold">保存</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ManagerPieceWorkForm
