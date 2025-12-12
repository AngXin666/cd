import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showModal, useDidShow, usePullDownRefresh, useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import * as DashboardAPI from '@/db/api/dashboard'
import * as PieceworkAPI from '@/db/api/piecework'
import * as UsersAPI from '@/db/api/users'
import * as WarehousesAPI from '@/db/api/warehouses'

import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'

const SuperAdminPieceWorkReportDetail: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const {driverId, startDate, endDate, warehouseIndex} = router.params

  const [driver, setDriver] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [attendanceStats, setAttendanceStats] = useState({
    attendanceDays: 0,
    lateDays: 0,
    leaveDays: 0
  })

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id || !driverId || !startDate || !endDate) return

    try {
      setLoading(true)

      // 加载司机信息
      const driversData = await UsersAPI.getDriverProfiles()
      const driverData = driversData.find((d) => d.id === driverId)
      setDriver(driverData || null)

      // 加载所有仓库
      const warehousesData = await WarehousesAPI.getAllWarehouses()
      setWarehouses(warehousesData)

      // 加载所有品类
      const categoriesData = await PieceworkAPI.getActiveCategories()
      setCategories(categoriesData)

      // 加载计件记录
      let data: PieceWorkRecord[] = []
      const currentWarehouseIndex = Number(warehouseIndex) || 0

      // 加载当前选中仓库的记录
      const warehouse = warehousesData[currentWarehouseIndex]
      if (warehouse) {
        data = await PieceworkAPI.getPieceWorkRecordsByWarehouse(warehouse.id, startDate, endDate)
      }

      // 筛选该司机的记录
      data = data.filter((r) => r.user_id === driverId)

      // 按日期排序（从新到旧）
      data.sort((a, b) => {
        const dateA = new Date(a.work_date).getTime()
        const dateB = new Date(b.work_date).getTime()
        return dateB - dateA
      })

      setRecords(data)

      // 加载考勤数据
      const attendanceData = await DashboardAPI.getDriverAttendanceStats(driverId, startDate, endDate)
      setAttendanceStats(attendanceData)
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'error',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id, driverId, startDate, endDate, warehouseIndex])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData() // 添加：页面显示时重新加载数据
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadData()])
    Taro.stopPullDownRefresh()
  })

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 获取品类名称
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || '未知品类'
  }

  // 编辑记录
  const handleEditRecord = (record: PieceWorkRecord) => {
    navigateTo({
      url: `/pages/super-admin/piece-work-report-form/index?id=${record.id}&mode=edit`
    })
  }

  // 删除记录
  const handleDeleteRecord = async (record: PieceWorkRecord) => {
    const result = await showModal({
      title: '确认删除',
      content: '确定要删除这条计件记录吗？此操作不可恢复。'
    })

    if (result.confirm) {
      try {
        await PieceworkAPI.deletePieceWorkRecord(record.id)
        Taro.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        })
        loadData()
      } catch (error) {
        console.error('删除失败:', error)
        Taro.showToast({
          title: '删除失败',
          icon: 'error',
          duration: 2000
        })
      }
    }
  }

  // 计算统计数据
  const totalQuantity = records.reduce((sum, r) => sum + (r.quantity || 0), 0)
  const totalAmount = records.reduce((sum, r) => {
    const baseAmount = (r.quantity || 0) * (r.unit_price || 0)
    const upstairsAmount = r.need_upstairs ? (r.quantity || 0) * (r.upstairs_price || 0) : 0
    const sortingAmount = r.need_sorting ? (r.sorting_quantity || 0) * (r.sorting_unit_price || 0) : 0
    return sum + baseAmount + upstairsAmount + sortingAmount
  }, 0)

  // 按仓库分组统计
  const warehouseStats = records.reduce(
    (acc, record) => {
      const warehouseId = record.warehouse_id
      if (!acc[warehouseId]) {
        acc[warehouseId] = {
          warehouseName: getWarehouseName(warehouseId),
          quantity: 0,
          amount: 0,
          recordCount: 0
        }
      }

      acc[warehouseId].quantity += record.quantity || 0
      const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
      const upstairsAmount = record.need_upstairs ? (record.quantity || 0) * (record.upstairs_price || 0) : 0
      const sortingAmount = record.need_sorting ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0) : 0
      acc[warehouseId].amount += baseAmount + upstairsAmount + sortingAmount
      acc[warehouseId].recordCount += 1

      return acc
    },
    {} as Record<string, {warehouseName: string; quantity: number; amount: number; recordCount: number}>
  )

  return (
    <View style={{background: 'linear-gradient(to-bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 司机信息卡片 */}
          <View className="bg-white rounded-lg p-4 shadow mb-4">
            <View className="flex items-center mb-3">
              <View className="i-mdi-account-circle text-4xl text-blue-900 mr-3" />
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800 block">
                  {driver?.name || driver?.phone || '未知司机'}
                </Text>
                {driver?.phone && driver?.name && <Text className="text-sm text-gray-500">{driver.phone}</Text>}
              </View>
            </View>

            <View className="border-t border-gray-100 pt-3">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">统计周期</Text>
                <Text className="text-sm text-gray-800 font-medium">
                  {startDate} 至 {endDate}
                </Text>
              </View>
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">总件数</Text>
                <Text className="text-sm text-gray-800 font-medium">{totalQuantity}</Text>
              </View>
              <View className="flex items-center justify-between mb-3">
                <Text className="text-sm text-gray-600">总金额</Text>
                <Text className="text-lg text-orange-600 font-bold">¥{totalAmount.toFixed(2)}</Text>
              </View>

              {/* 考勤统计 */}
              <View className="border-t border-gray-100 pt-3">
                <Text className="text-sm text-gray-700 font-medium mb-2">考勤统计</Text>
                <View className="flex items-center justify-between mb-2">
                  <View className="flex items-center">
                    <View className="i-mdi-calendar-check text-base text-green-600 mr-1" />
                    <Text className="text-sm text-gray-600">出勤天数</Text>
                  </View>
                  <Text className="text-sm text-gray-800 font-medium">{attendanceStats.attendanceDays}天</Text>
                </View>
                <View className="flex items-center justify-between mb-2">
                  <View className="flex items-center">
                    <View className="i-mdi-clock-alert text-base text-orange-600 mr-1" />
                    <Text className="text-sm text-gray-600">迟到天数</Text>
                  </View>
                  <Text className="text-sm text-gray-800 font-medium">{attendanceStats.lateDays}天</Text>
                </View>
                <View className="flex items-center justify-between">
                  <View className="flex items-center">
                    <View className="i-mdi-calendar-remove text-base text-red-600 mr-1" />
                    <Text className="text-sm text-gray-600">请假天数</Text>
                  </View>
                  <Text className="text-sm text-gray-800 font-medium">{attendanceStats.leaveDays}天</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 仓库维度统计 */}
          {Object.keys(warehouseStats).length > 1 && (
            <View className="bg-white rounded-lg p-4 shadow mb-4">
              <Text className="text-base font-bold text-gray-800 mb-3">仓库维度统计</Text>
              {Object.entries(warehouseStats).map(([warehouseId, stats]) => (
                <View key={warehouseId} className="mb-3 p-3 bg-blue-50 rounded-lg">
                  <View className="flex items-center justify-between mb-2">
                    <View className="flex items-center">
                      <View className="i-mdi-warehouse text-lg text-blue-700 mr-2" />
                      <Text className="text-sm font-medium text-gray-800">{stats.warehouseName}</Text>
                    </View>
                    <Text className="text-sm text-orange-600 font-bold">¥{stats.amount.toFixed(2)}</Text>
                  </View>
                  <View className="flex items-center gap-4 ml-6">
                    <Text className="text-xs text-gray-600">件数: {stats.quantity}</Text>
                    <Text className="text-xs text-gray-600">记录: {stats.recordCount}条</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 详细记录列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-800">详细记录</Text>
              <Text className="text-xs text-gray-500">共 {records.length} 条</Text>
            </View>

            {loading ? (
              <View className="text-center py-12">
                <Text className="text-sm text-gray-400">加载中...</Text>
              </View>
            ) : records.length === 0 ? (
              <View className="text-center py-12">
                <View className="i-mdi-clipboard-text-off text-6xl text-gray-300 mx-auto mb-3" />
                <Text className="text-sm text-gray-400 block">暂无记录</Text>
              </View>
            ) : (
              <View>
                {records.map((record) => {
                  const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
                  const upstairsAmount = record.need_upstairs
                    ? (record.quantity || 0) * (record.upstairs_price || 0)
                    : 0
                  const sortingAmount = record.need_sorting
                    ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0)
                    : 0
                  const totalRecordAmount = baseAmount + upstairsAmount + sortingAmount

                  return (
                    <View key={record.id} className="mb-3 p-3 bg-gray-50 rounded-lg">
                      {/* 头部：日期和金额 */}
                      <View className="flex items-center justify-between mb-2">
                        <View className="flex items-center">
                          <View className="i-mdi-calendar text-base text-gray-500 mr-1" />
                          <Text className="text-sm text-gray-700">{record.work_date}</Text>
                        </View>
                        <View className="bg-orange-100 px-2 py-1 rounded">
                          <Text className="text-sm text-orange-600 font-medium">¥{totalRecordAmount.toFixed(2)}</Text>
                        </View>
                      </View>

                      {/* 仓库和品类 */}
                      <View className="mb-2">
                        <View className="flex items-center mb-1">
                          <View className="i-mdi-warehouse text-sm text-gray-500 mr-1" />
                          <Text className="text-xs text-gray-600">{getWarehouseName(record.warehouse_id)}</Text>
                        </View>
                        <View className="flex items-center">
                          <View className="i-mdi-package-variant text-sm text-gray-500 mr-1" />
                          <Text className="text-xs text-gray-600">
                            {getCategoryName(record.category_id)} × {record.quantity}
                          </Text>
                        </View>
                      </View>

                      {/* 价格明细 */}
                      <View className="border-t border-gray-200 pt-2 mt-2">
                        <View className="flex items-center justify-between mb-1">
                          <Text className="text-xs text-gray-500">基础单价</Text>
                          <Text className="text-xs text-gray-700">¥{record.unit_price?.toFixed(2)}</Text>
                        </View>
                        <View className="flex items-center justify-between mb-1">
                          <Text className="text-xs text-gray-500">基础金额</Text>
                          <Text className="text-xs text-gray-700">¥{baseAmount.toFixed(2)}</Text>
                        </View>

                        {record.need_upstairs && (
                          <>
                            <View className="flex items-center justify-between mb-1">
                              <Text className="text-xs text-gray-500">上楼单价</Text>
                              <Text className="text-xs text-gray-700">¥{record.upstairs_price?.toFixed(2)}</Text>
                            </View>
                            <View className="flex items-center justify-between mb-1">
                              <Text className="text-xs text-gray-500">上楼金额</Text>
                              <Text className="text-xs text-gray-700">¥{upstairsAmount.toFixed(2)}</Text>
                            </View>
                          </>
                        )}

                        {record.need_sorting && (
                          <>
                            <View className="flex items-center justify-between mb-1">
                              <Text className="text-xs text-gray-500">分拣数量</Text>
                              <Text className="text-xs text-gray-700">{record.sorting_quantity}</Text>
                            </View>
                            <View className="flex items-center justify-between mb-1">
                              <Text className="text-xs text-gray-500">分拣单价</Text>
                              <Text className="text-xs text-gray-700">¥{record.sorting_unit_price?.toFixed(2)}</Text>
                            </View>
                            <View className="flex items-center justify-between mb-1">
                              <Text className="text-xs text-gray-500">分拣金额</Text>
                              <Text className="text-xs text-gray-700">¥{sortingAmount.toFixed(2)}</Text>
                            </View>
                          </>
                        )}
                      </View>

                      {/* 备注 */}
                      {record.notes && (
                        <View className="border-t border-gray-200 pt-2 mt-2">
                          <Text className="text-xs text-gray-500 mb-1">备注</Text>
                          <Text className="text-xs text-gray-700">{record.notes}</Text>
                        </View>
                      )}

                      {/* 操作按钮 */}
                      <View className="flex gap-2 mt-3">
                        <Button
                          size="mini"
                          className="flex-1 bg-blue-600 text-white text-xs break-keep"
                          onClick={() => handleEditRecord(record)}>
                          编辑
                        </Button>
                        <Button
                          size="mini"
                          className="flex-1 bg-red-600 text-white text-xs break-keep"
                          onClick={() => handleDeleteRecord(record)}>
                          删除
                        </Button>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default SuperAdminPieceWorkReportDetail
