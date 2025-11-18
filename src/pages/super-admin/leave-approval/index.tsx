import {ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {showLoading, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useMemo, useState} from 'react'
import {getAllAttendanceRecords, getAllProfiles, getAllWarehouses} from '@/db/api'
import type {AttendanceRecord, Profile, Warehouse} from '@/db/types'

// 司机统计数据类型
interface DriverStats {
  driverId: string
  driverName: string
  driverPhone: string | null
  licensePlate: string | null
  warehouseIds: string[]
  warehouseNames: string[]
  attendanceCount: number
  workDays: number
  actualAttendanceDays: number
  attendanceRate: number
  isFullAttendance: boolean
  joinDate: string | null
  workingDays: number
}

const SuperAdminLeaveApproval: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState<number>(0)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)

  // 初始化当前月份
  const initCurrentMonth = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }, [])

  const [filterMonth] = useState<string>(initCurrentMonth())

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user) return

    showLoading({title: '加载中...'})

    try {
      // 获取所有仓库信息
      const allWarehouses = await getAllWarehouses()
      setWarehouses(allWarehouses)

      // 获取所有用户信息
      const allProfiles = await getAllProfiles()
      setProfiles(allProfiles)

      // 获取当前用户信息
      const userProfile = allProfiles.find((p) => p.id === user.id) || null
      setCurrentUserProfile(userProfile)

      // 加载打卡记录
      const currentMonth = filterMonth || initCurrentMonth()
      const [year, month] = currentMonth.split('-').map(Number)
      const records = await getAllAttendanceRecords(year, month)
      setAttendanceRecords(records)
    } finally {
      Taro.hideLoading()
    }
  }, [user, filterMonth, initCurrentMonth])

  useDidShow(() => {
    loadData()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await loadData()
    Taro.stopPullDownRefresh()
  })

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return dateStr.split('T')[0]
  }

  // 获取所有仓库列表（显示所有仓库，包括没有数据的）
  const getVisibleWarehouses = () => {
    return warehouses
  }

  // 获取当前仓库
  const getCurrentWarehouse = () => {
    const visibleWarehouses = getVisibleWarehouses()
    if (visibleWarehouses.length === 0) return null
    return visibleWarehouses[currentWarehouseIndex] || visibleWarehouses[0]
  }

  // 获取当前仓库ID
  const getCurrentWarehouseId = () => {
    const currentWarehouse = getCurrentWarehouse()
    return currentWarehouse?.id || 'all'
  }

  // 处理仓库切换
  const handleWarehouseChange = useCallback((e: any) => {
    const index = e.detail.current
    setCurrentWarehouseIndex(index)
  }, [])

  // 计算工作日天数
  const calculateWorkDays = useCallback((yearMonth: string, endDate?: string): number => {
    const [year, month] = yearMonth.split('-').map(Number)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    let lastDay: number
    if (endDate) {
      const endDateObj = new Date(endDate)
      lastDay = endDateObj.getDate()
    } else if (year === currentYear && month === currentMonth) {
      lastDay = currentDay
    } else {
      lastDay = new Date(year, month, 0).getDate()
    }

    let workDays = 0
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day)
      const dayOfWeek = date.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++
      }
    }

    return workDays
  }, [])

  // 计算在职天数
  const calculateWorkingDays = useCallback((joinDate: string | null): number => {
    if (!joinDate) return 0
    const join = new Date(joinDate)
    const now = new Date()
    const diffTime = now.getTime() - join.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }, [])

  // 计算司机统计数据
  const calculateDriverStats = useMemo((): DriverStats[] => {
    const driverMap = new Map<string, DriverStats>()

    // 遍历所有司机角色的用户
    const drivers = profiles.filter((p) => p.role === 'driver')

    drivers.forEach((driver) => {
      // 获取该司机的所有打卡记录
      const driverRecords = attendanceRecords.filter((r) => r.user_id === driver.id)

      // 获取该司机关联的所有仓库
      const warehouseIds = Array.from(new Set(driverRecords.map((r) => r.warehouse_id)))
      const warehouseNames = warehouseIds.map((id) => getWarehouseName(id))

      // 计算实际打卡天数（去重）
      const uniqueDates = new Set(driverRecords.map((r) => formatDate(r.clock_in_time)))
      const actualAttendanceDays = uniqueDates.size

      // 计算应出勤天数（工作日）
      const workDays = calculateWorkDays(filterMonth)

      // 计算出勤率
      const attendanceRate = workDays > 0 ? Math.round((actualAttendanceDays / workDays) * 100) : 0

      // 判断是否满勤
      const isFullAttendance = actualAttendanceDays >= workDays

      // 计算在职天数
      const workingDays = calculateWorkingDays(driver.join_date)

      driverMap.set(driver.id, {
        driverId: driver.id,
        driverName: driver.name || driver.phone || '未知',
        driverPhone: driver.phone,
        licensePlate: driver.license_plate,
        warehouseIds,
        warehouseNames,
        attendanceCount: driverRecords.length,
        workDays,
        actualAttendanceDays,
        attendanceRate,
        isFullAttendance,
        joinDate: driver.join_date,
        workingDays
      })
    })

    return Array.from(driverMap.values()).sort((a, b) => b.attendanceRate - a.attendanceRate)
  }, [profiles, attendanceRecords, filterMonth, calculateWorkDays, calculateWorkingDays])

  // 根据当前仓库筛选司机统计
  const getFilteredDriverStats = () => {
    const currentWarehouseId = getCurrentWarehouseId()
    if (currentWarehouseId === 'all') {
      return calculateDriverStats
    }
    return calculateDriverStats.filter((stats) => stats.warehouseIds.includes(currentWarehouseId))
  }

  const driverStats = getFilteredDriverStats()
  const totalDrivers = driverStats.length

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">考勤管理</Text>
            <Text className="text-blue-100 text-sm block">
              {currentUserProfile?.role === 'super_admin' ? '超级管理员' : '管理员'}工作台
            </Text>
          </View>

          {/* 统计卡片 */}
          <View className="bg-white rounded-lg p-4 shadow mb-4">
            <Text className="text-sm text-gray-600 block mb-2">司机总数</Text>
            <Text className="text-3xl font-bold text-blue-900 block">{totalDrivers}</Text>
          </View>

          {/* 仓库切换区域 */}
          {warehouses.length > 0 && (
            <View className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
              <Swiper
                className="h-16"
                current={currentWarehouseIndex}
                onChange={handleWarehouseChange}
                indicatorDots
                indicatorColor="rgba(0, 0, 0, 0.2)"
                indicatorActiveColor="#1E3A8A">
                {getVisibleWarehouses().map((warehouse) => (
                  <SwiperItem key={warehouse.id}>
                    <View className="h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100">
                      <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                      <Text className="text-lg font-bold text-blue-900">{warehouse.name}</Text>
                    </View>
                  </SwiperItem>
                ))}
              </Swiper>
            </View>
          )}

          {/* 司机统计列表 */}
          <View className="space-y-3">
            <Text className="text-lg font-bold text-gray-800 block mb-2">司机统计</Text>

            {driverStats.length === 0 ? (
              <View className="bg-white rounded-lg p-8 text-center shadow">
                <View className="i-mdi-account-off text-5xl text-gray-300 mb-3 mx-auto" />
                <Text className="text-gray-400 text-sm block">当前仓库暂无司机数据</Text>
              </View>
            ) : (
              driverStats.map((stats) => (
                <View key={stats.driverId} className="bg-white rounded-lg p-4 shadow">
                  {/* 司机基本信息 */}
                  <View className="flex items-center justify-between mb-3">
                    <View className="flex items-center gap-2">
                      <View className="i-mdi-account-circle text-2xl text-blue-600" />
                      <View>
                        <Text className="text-base font-bold text-gray-800 block">{stats.driverName}</Text>
                        {stats.driverPhone && (
                          <Text className="text-xs text-gray-500 block">{stats.driverPhone}</Text>
                        )}
                      </View>
                    </View>
                    {stats.isFullAttendance && (
                      <View className="bg-green-100 px-2 py-1 rounded">
                        <Text className="text-xs text-green-700 font-bold">满勤</Text>
                      </View>
                    )}
                  </View>

                  {/* 车牌号 */}
                  {stats.licensePlate && (
                    <View className="flex items-center gap-2 mb-2">
                      <View className="i-mdi-car text-base text-gray-600" />
                      <Text className="text-sm text-gray-600">车牌：{stats.licensePlate}</Text>
                    </View>
                  )}

                  {/* 仓库信息 */}
                  {stats.warehouseNames.length > 0 && (
                    <View className="flex items-center gap-2 mb-3">
                      <View className="i-mdi-warehouse text-base text-gray-600" />
                      <Text className="text-sm text-gray-600">仓库：{stats.warehouseNames.join('、')}</Text>
                    </View>
                  )}

                  {/* 统计数据 */}
                  <View className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                    <View className="text-center">
                      <Text className="text-xs text-gray-500 block mb-1">出勤率</Text>
                      <Text
                        className={`text-lg font-bold block ${
                          stats.attendanceRate >= 90
                            ? 'text-green-600'
                            : stats.attendanceRate >= 70
                              ? 'text-orange-600'
                              : 'text-red-600'
                        }`}>
                        {stats.attendanceRate}%
                      </Text>
                    </View>
                    <View className="text-center">
                      <Text className="text-xs text-gray-500 block mb-1">打卡天数</Text>
                      <Text className="text-lg font-bold text-blue-600 block">
                        {stats.actualAttendanceDays}/{stats.workDays}
                      </Text>
                    </View>
                    <View className="text-center">
                      <Text className="text-xs text-gray-500 block mb-1">在职天数</Text>
                      <Text className="text-lg font-bold text-gray-700 block">{stats.workingDays}</Text>
                    </View>
                  </View>

                  {/* 入职日期 */}
                  {stats.joinDate && (
                    <View className="mt-2 pt-2 border-t border-gray-100">
                      <Text className="text-xs text-gray-500">
                        入职日期：{formatDate(stats.joinDate)}
                        {stats.workingDays < 30 && (
                          <Text className="text-orange-600 ml-2">(新司机)</Text>
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default SuperAdminLeaveApproval
