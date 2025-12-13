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

import TopNavBar from '@/components/TopNavBar'
const SuperAdminPieceWorkReportForm: React.FC = () => {
  const {user} = useAuth({guard: true})
  const instance = getCurrentInstance()
  const params = instance.router?.params || {}
  const mode = params.mode || 'add' // 'add' 或 'edit'
  const recordId = params.id || ''
  const defaultWarehouseId = params.warehouseId || ''

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])

  // 表单数据
  const [selectedDriverIndex, setSelectedDriverIndex] = useState(0)
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0)
  const [workDate, setWorkDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [needUpstairs, setNeedUpstairs] = useState(false)
  const [upstairsPrice, setUpstairsPrice] = useState('')
  const [needSorting, setNeedSorting] = useState(false)
  const [sortingQuantity, setSortingQuantity] = useState('')
  const [sortingUnitPrice, setSortingUnitPrice] = useState('')
  const [notes, setNotes] = useState('')

  // 加载记录详情
  const loadRecordDetail = useCallback(
    async (id: string, warehousesData: Warehouse[], driversData: Profile[], categoriesData: PieceWorkCategory[]) => {
      try {
        // 获取所有仓库的记录
        const allRecords = await Promise.all(
          warehousesData.map((w) => PieceworkAPI.getPieceWorkRecordsByWarehouse(w.id, '', ''))
        )
        const records = allRecords.flat()
        const record = records.find((r) => r.id === id)

        if (record) {
          // 设置司机
          const driverIndex = driversData.findIndex((d) => d.id === record.user_id)
          if (driverIndex >= 0) {
            setSelectedDriverIndex(driverIndex)
          }

          // 设置仓库
          const warehouseIndex = warehousesData.findIndex((w) => w.id === record.warehouse_id)
          if (warehouseIndex >= 0) {
            setSelectedWarehouseIndex(warehouseIndex)
          }

          // 设置品类
          const categoryIndex = categoriesData.findIndex((c) => c.id === record.category_id)
          if (categoryIndex >= 0) {
            setSelectedCategoryIndex(categoryIndex)
          }

          // 设置其他字段
          setWorkDate(record.work_date)
          setQuantity(String(record.quantity || ''))
          setUnitPrice(String(record.unit_price || ''))
          setNeedUpstairs(record.need_upstairs || false)
          setUpstairsPrice(String(record.upstairs_price || ''))
          setNeedSorting(record.need_sorting || false)
          setSortingQuantity(String(record.sorting_quantity || ''))
          setSortingUnitPrice(String(record.sorting_unit_price || ''))
          setNotes(record.notes || '')
        }
      } catch (error) {
        console.error('加载记录详情失败:', error)
        Taro.showToast({
          title: '加载记录详情失败',
          icon: 'error',
          duration: 2000
        })
      }
    },
    []
  )

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    try {
      // 加载所有仓库
      const warehousesData = await WarehousesAPI.getAllWarehouses()
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

      // 如果是编辑模式，加载记录详情
      if (mode === 'edit' && recordId) {
        await loadRecordDetail(recordId, warehousesData, driversData, categoriesData)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'error',
        duration: 2000
      })
    }
  }, [user?.id, mode, recordId, defaultWarehouseId, loadRecordDetail])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 初始化日期
  useEffect(() => {
    if (mode === 'add' && !workDate) {
      setWorkDate(getLocalDateString())
    }
  }, [mode, workDate])

  // 提交表单
  const handleSubmit = async () => {
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
        title: '请输入有效的上楼单价',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (needSorting) {
      if (!sortingQuantity || Number(sortingQuantity) <= 0) {
        Taro.showToast({
          title: '请输入有效的分拣数量',
          icon: 'none',
          duration: 2000
        })
        return
      }
      if (!sortingUnitPrice || Number(sortingUnitPrice) <= 0) {
        Taro.showToast({
          title: '请输入有效的分拣单价',
          icon: 'none',
          duration: 2000
        })
        return
      }
    }

    try {
      const baseAmount = Number(quantity) * Number(unitPrice)
      const upstairsAmount = needUpstairs ? Number(quantity) * Number(upstairsPrice) : 0
      const sortingAmount = needSorting ? Number(sortingQuantity) * Number(sortingUnitPrice) : 0
      const totalAmount = baseAmount + upstairsAmount + sortingAmount

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

      if (mode === 'add') {
        await PieceworkAPI.createPieceWorkRecord(recordData)
        Taro.showToast({
          title: '添加成功',
          icon: 'success',
          duration: 2000
        })
      } else {
        await PieceworkAPI.updatePieceWorkRecord(recordId, recordData)
        Taro.showToast({
          title: '更新成功',
          icon: 'success',
          duration: 2000
        })
      }

      setTimeout(() => {
        navigateBack()
      }, 2000)
    } catch (error) {
      console.error('提交失败:', error)
      Taro.showToast({
        title: mode === 'add' ? '添加失败' : '更新失败',
        icon: 'error',
        duration: 2000
      })
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      {/* 顶部导航栏 */}
      <TopNavBar />
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          <View className="bg-white rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">
              {mode === 'add' ? '添加计件记录' : '编辑计件记录'}
            </Text>

            {/* 司机选择 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                司机 <Text className="text-red-500">*</Text>
              </Text>
              <Picker
                mode="selector"
                range={drivers.map((d) => d.name || d.phone || '未知')}
                value={selectedDriverIndex}
                onChange={(e) => setSelectedDriverIndex(Number(e.detail.value))}>
                <View className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <Text className="text-sm text-gray-800">
                    {drivers[selectedDriverIndex]?.name || drivers[selectedDriverIndex]?.phone || '请选择司机'}
                  </Text>
                  <View className="i-mdi-chevron-down text-xl text-gray-400" />
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
                range={warehouses.map((w) => w.name)}
                value={selectedWarehouseIndex}
                onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
                <View className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <Text className="text-sm text-gray-800">
                    {warehouses[selectedWarehouseIndex]?.name || '请选择仓库'}
                  </Text>
                  <View className="i-mdi-chevron-down text-xl text-gray-400" />
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
                range={categories.map((c) => c.category_name)}
                value={selectedCategoryIndex}
                onChange={(e) => setSelectedCategoryIndex(Number(e.detail.value))}>
                <View className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <Text className="text-sm text-gray-800">
                    {categories[selectedCategoryIndex]?.category_name || '请选择品类'}
                  </Text>
                  <View className="i-mdi-chevron-down text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

            {/* 工作日期 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                工作日期 <Text className="text-red-500">*</Text>
              </Text>
              <Picker mode="date" value={workDate} onChange={(e) => setWorkDate(e.detail.value)}>
                <View className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <Text className="text-sm text-gray-800">{workDate || '请选择日期'}</Text>
                  <View className="i-mdi-calendar text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

            {/* 数量 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                数量 <Text className="text-red-500">*</Text>
              </Text>
              <Input
                className="bg-gray-50 rounded-lg p-3 text-sm"
                type="number"
                placeholder="请输入数量"
                value={quantity}
                onInput={(e) => setQuantity(e.detail.value)}
              />
            </View>

            {/* 单价 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">
                单价（元） <Text className="text-red-500">*</Text>
              </Text>
              <Input
                className="bg-gray-50 rounded-lg p-3 text-sm"
                type="digit"
                placeholder="请输入单价"
                value={unitPrice}
                onInput={(e) => setUnitPrice(e.detail.value)}
              />
            </View>

            {/* 是否需要上楼 */}
            <View className="mb-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-700">需要上楼</Text>
                <Switch checked={needUpstairs} onChange={(e) => setNeedUpstairs(e.detail.value)} color="#1E3A8A" />
              </View>
              {needUpstairs && (
                <Input
                  className="bg-gray-50 rounded-lg p-3 text-sm"
                  type="digit"
                  placeholder="请输入上楼单价"
                  value={upstairsPrice}
                  onInput={(e) => setUpstairsPrice(e.detail.value)}
                />
              )}
            </View>

            {/* 是否需要分拣 */}
            <View className="mb-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-700">需要分拣</Text>
                <Switch checked={needSorting} onChange={(e) => setNeedSorting(e.detail.value)} color="#1E3A8A" />
              </View>
              {needSorting && (
                <View>
                  <Input
                    className="bg-gray-50 rounded-lg p-3 text-sm mb-2"
                    type="number"
                    placeholder="请输入分拣数量"
                    value={sortingQuantity}
                    onInput={(e) => setSortingQuantity(e.detail.value)}
                  />
                  <Input
                    className="bg-gray-50 rounded-lg p-3 text-sm"
                    type="digit"
                    placeholder="请输入分拣单价"
                    value={sortingUnitPrice}
                    onInput={(e) => setSortingUnitPrice(e.detail.value)}
                  />
                </View>
              )}
            </View>

            {/* 备注 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">备注</Text>
              <Textarea
                className="bg-gray-50 rounded-lg p-3 text-sm"
                placeholder="请输入备注信息"
                value={notes}
                onInput={(e) => setNotes(e.detail.value)}
                maxlength={200}
                style={{minHeight: '80px'}}
              />
            </View>

            {/* 提交按钮 */}
            <View className="flex gap-3">
              <View onClick={() => navigateBack()} className="flex-1 bg-gray-200 text-center py-3 rounded-lg">
                <Text className="text-sm text-gray-700">取消</Text>
              </View>
              <View onClick={handleSubmit} className="flex-1 bg-blue-900 text-center py-3 rounded-lg">
                <Text className="text-sm text-white">{mode === 'add' ? '添加' : '保存'}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default SuperAdminPieceWorkReportForm
