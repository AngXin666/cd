import {ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {showLoading, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useMemo, useState} from 'react'
import {getAllAttendanceRecords, getAllAttendanceRules, getAllLeaveApplications, getAllProfiles, getAllWarehouses} from '@/db/api'
import type {AttendanceRecord, AttendanceRule, LeaveApplication, Profile, Warehouse} from '@/db/types'

// 司机统计数据类型
interface DriverStats {
  driverId: string
  driverName: string
  driverPhone: string | null
  driverType: 'pure' | 'with_vehicle' | null
  licensePlate: string | null
  warehouseIds: string[]
  warehouseNames: string[]
  attendanceCount: number
  workDays: number
  actualAttendanceDays: number
  leaveDays: number
  lateCount: number
  joinDate: string | null
  workingDays: number
  attendanceRecords: AttendanceRecord[]
}

const SuperAdminLeaveApproval: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [attendanceRules, setAttendanceRules] = useState<AttendanceRule[]>([])
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

      // 获取所有考勤规则
      const rules = await getAllAttendanceRules()
      setAttendanceRules(rules)

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

      // 加载请假记录
      const leaves = await getAllLeaveApplications()
      setLeaveApplications(leaves)
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

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
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

  // 计算工作日天数（可以指定起始日期）
  const calculateWorkDays = useCallback((yearMonth: string, startDate?: string): number => {
    const [year, month] = yearMonth.split('-').map(Number)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    // 确定起始日期
    let firstDay = 1
    if (startDate) {
      const startDateObj = new Date(startDate)
      const startYear = startDateObj.getFullYear()
      const startMonth = startDateObj.getMonth() + 1
      // 只有当起始日期在当前月份时才使用
      if (startYear === year && startMonth === month) {
        firstDay = startDateObj.getDate()
      }
    }

    // 确定结束日期
    let lastDay: number
    if (year === currentYear && month === currentMonth) {
      lastDay = currentDay
    } else {
      lastDay = new Date(year, month, 0).getDate()
    }

    let workDays = 0
    for (let day = firstDay; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day)
      const dayOfWeek = date.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++
      }
    }

    return workDays
  }, [])

  // 计算在职天数（包含入职当天）
  const calculateWorkingDays = useCallback((joinDate: string | null): number => {
    if (!joinDate) return 0
    const join = new Date(joinDate)
    const now = new Date()
    // 设置时间为0点，确保计算整天
    join.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)
    const diffTime = now.getTime() - join.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    // 加1是因为入职当天也算一天
    return diffDays + 1
  }, [])

  // 计算请假天数
  const calculateLeaveDays = useCallback(
    (userId: string, yearMonth: string): number => {
      const [year, month] = yearMonth.split('-').map(Number)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)

      // 获取该司机在当月的已批准请假记录
      const approvedLeaves = leaveApplications.filter(
        (leave) =>
          leave.user_id === userId &&
          leave.status === 'approved' &&
          new Date(leave.start_date) <= monthEnd &&
          new Date(leave.end_date) >= monthStart
      )

      // 计算请假天数
      let totalLeaveDays = 0
      approvedLeaves.forEach((leave) => {
        const startDate = new Date(Math.max(new Date(leave.start_date).getTime(), monthStart.getTime()))
        const endDate = new Date(Math.min(new Date(leave.end_date).getTime(), monthEnd.getTime()))
        const diffTime = endDate.getTime() - startDate.getTime()
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        totalLeaveDays += days
      })

      return totalLeaveDays
    },
    [leaveApplications]
  )

  // 计算迟到次数（根据仓库考勤规则判断）
  const calculateLateCount = useCallback(
    (records: AttendanceRecord[]): number => {
      let lateCount = 0
      records.forEach((record) => {
        // 获取该打卡记录对应的仓库考勤规则
        const rule = attendanceRules.find((r) => r.warehouse_id === record.warehouse_id && r.is_active)
        
        // 如果没有找到规则，使用默认的9:00
        const workStartTime = rule?.work_start_time || '09:00:00'
        
        // 解析上班时间
        const [startHour, startMinute] = workStartTime.split(':').map(Number)
        
        // 解析打卡时间
        const clockInTime = new Date(record.clock_in_time)
        const clockHour = clockInTime.getHours()
        const clockMinute = clockInTime.getMinutes()
        
        // 判断是否迟到
        if (clockHour > startHour || (clockHour === startHour && clockMinute > startMinute)) {
          lateCount++
        }
      })
      return lateCount
    },
    [attendanceRules]
  )

  // 计算司机统计数据
  const calculateDriverStats = useMemo((): DriverStats[] => {
    const driverMap = new Map<string, DriverStats>()

    // 遍历所有司机角色的用户
    const drivers = profiles.filter((p) => p.role === 'driver')

    drivers.forEach((driver) => {
      // 获取该司机的所有打卡记录
      const driverRecords = attendanceRecords.filter((r) => r.user_id === driver.id)

      // 获取该司机关联的所有仓库（包括打卡记录中的仓库）
      const warehouseIdsFromRecords = driverRecords
        .map((r) => r.warehouse_id)
        .filter((id): id is string => id !== null)
      const warehouseIds = Array.from(new Set(warehouseIdsFromRecords))
      const warehouseNames = warehouseIds.map((id) => getWarehouseName(id))

      // 计算实际打卡天数（去重）
      const uniqueDates = new Set(driverRecords.map((r) => formatDate(r.clock_in_time)))
      const actualAttendanceDays = uniqueDates.size

      // 计算应出勤天数（工作日）
      // 如果司机是本月入职的，从入职日期开始计算
      let workDays: number
      if (driver.join_date) {
        const joinDate = new Date(driver.join_date)
        const [filterYear, filterMonthNum] = filterMonth.split('-').map(Number)
        const joinYear = joinDate.getFullYear()
        const joinMonth = joinDate.getMonth() + 1
        
        // 如果入职月份是当前筛选月份，从入职日期开始计算
        if (joinYear === filterYear && joinMonth === filterMonthNum) {
          workDays = calculateWorkDays(filterMonth, driver.join_date)
        } else {
          // 否则计算整月的工作日
          workDays = calculateWorkDays(filterMonth)
        }
      } else {
        workDays = calculateWorkDays(filterMonth)
      }

      // 计算请假天数
      const leaveDays = calculateLeaveDays(driver.id, filterMonth)

      // 计算迟到次数
      const lateCount = calculateLateCount(driverRecords)

      // 计算在职天数
      const workingDays = calculateWorkingDays(driver.join_date)

      driverMap.set(driver.id, {
        driverId: driver.id,
        driverName: driver.name || driver.phone || '未知',
        driverPhone: driver.phone,
        driverType: driver.driver_type,
        licensePlate: driver.license_plate,
        warehouseIds,
        warehouseNames,
        attendanceCount: driverRecords.length,
        workDays,
        actualAttendanceDays,
        leaveDays,
        lateCount,
        joinDate: driver.join_date,
        workingDays,
        attendanceRecords: driverRecords
      })
    })

    return Array.from(driverMap.values()).sort((a, b) => b.actualAttendanceDays - a.actualAttendanceDays)
  }, [
    profiles,
    attendanceRecords,
    filterMonth,
    calculateWorkDays,
    calculateWorkingDays,
    calculateLeaveDays,
    calculateLateCount,
    getWarehouseName
  ])

  // 根据当前仓库筛选司机统计
  const getFilteredDriverStats = () => {
    const currentWarehouseId = getCurrentWarehouseId()
    if (currentWarehouseId === 'all') {
      return calculateDriverStats
    }
    // 显示在当前仓库有打卡记录的司机，以及没有任何打卡记录的司机
    return calculateDriverStats.filter((stats) => {
      // 如果司机有打卡记录，只显示在当前仓库打过卡的司机
      if (stats.warehouseIds.length > 0) {
        return stats.warehouseIds.includes(currentWarehouseId)
      }
      // 如果司机没有任何打卡记录，在所有仓库都显示
      return true
    })
  }

  const driverStats = getFilteredDriverStats()
  const totalDrivers = driverStats.length

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="box-border h-screen">
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-white rounded-3xl p-6 mb-5 shadow-lg">
            <View className="flex items-center gap-4 mb-3">
              <View className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <View className="i-mdi-account-group text-4xl text-white" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-800 text-3xl font-bold block mb-1">考勤管理</Text>
                <Text className="text-gray-500 text-base block">
                  {currentUserProfile?.role === 'super_admin' ? '超级管理员' : '管理员'}工作台
                </Text>
              </View>
            </View>
            
            {/* 统计数据 */}
            <View className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
              <View className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 text-center">
                <View className="i-mdi-account-multiple text-3xl text-blue-600 mb-2 mx-auto" />
                <Text className="text-sm text-gray-600 block mb-1">司机总数</Text>
                <Text className="text-3xl font-bold text-blue-600 block">{totalDrivers}</Text>
              </View>
              <View className="flex-1 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 text-center">
                <View className="i-mdi-check-circle text-3xl text-green-600 mb-2 mx-auto" />
                <Text className="text-sm text-gray-600 block mb-1">本月出勤</Text>
                <Text className="text-3xl font-bold text-green-600 block">
                  {driverStats.filter(s => s.actualAttendanceDays > 0).length}
                </Text>
              </View>
            </View>
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
          <View className="space-y-4">
            <View className="flex items-center gap-2 mb-3">
              <View className="i-mdi-format-list-bulleted text-2xl text-gray-700" />
              <Text className="text-2xl font-bold text-gray-800 block">司机统计</Text>
            </View>

            {driverStats.length === 0 ? (
              <View className="bg-white rounded-3xl p-12 text-center shadow-lg">
                <View className="i-mdi-account-off text-7xl text-gray-300 mb-4 mx-auto" />
                <Text className="text-gray-400 text-xl block">当前仓库暂无司机数据</Text>
              </View>
            ) : (
              driverStats.map((stats) => (
                <View key={stats.driverId} className="bg-white rounded-3xl p-5 shadow-lg">
                  {/* 司机基本信息 */}
                  <View className="flex items-center gap-4 mb-4">
                    <View className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <View className="i-mdi-account text-4xl text-white" />
                    </View>
                    <View className="flex-1">
                      <View className="flex items-center gap-2 flex-wrap mb-2">
                        <Text className="text-2xl font-bold text-gray-800">{stats.driverName}</Text>
                        {/* 司机类型标签 */}
                        {stats.driverType && (
                          <View
                            className={`px-3 py-1 rounded-full shadow-sm ${
                              stats.driverType === 'with_vehicle' 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                                : 'bg-gradient-to-r from-cyan-500 to-cyan-600'
                            }`}>
                            <Text className="text-sm font-bold text-white">
                              {stats.driverType === 'with_vehicle' ? '带车司机' : '纯司机'}
                            </Text>
                          </View>
                        )}
                        {/* 新司机标签 */}
                        {stats.workingDays < 30 && (
                          <View className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 shadow-sm">
                            <Text className="text-sm font-bold text-white">新司机</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* 联系方式和车牌信息 */}
                  <View className="space-y-3 mb-4">
                    {stats.driverPhone && (
                      <View className="flex items-center gap-3">
                        <View className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                          <View className="i-mdi-phone text-xl text-green-600" />
                        </View>
                        <Text className="text-base text-gray-700">{stats.driverPhone}</Text>
                      </View>
                    )}

                    {stats.licensePlate && (
                      <View className="flex items-center gap-3">
                        <View className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                          <View className="i-mdi-car text-xl text-blue-600" />
                        </View>
                        <Text className="text-base text-gray-700">{stats.licensePlate}</Text>
                      </View>
                    )}

                    {stats.warehouseNames.length > 0 ? (
                      <View className="flex items-center gap-3">
                        <View className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                          <View className="i-mdi-warehouse text-xl text-purple-600" />
                        </View>
                        <Text className="text-base text-gray-700">{stats.warehouseNames.join('、')}</Text>
                      </View>
                    ) : (
                      <View className="flex items-center gap-3">
                        <View className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                          <View className="i-mdi-alert-circle text-xl text-orange-600" />
                        </View>
                        <Text className="text-base text-orange-600">暂无打卡记录</Text>
                      </View>
                    )}
                  </View>

                  {/* 统计数据 */}
                  <View className="grid grid-cols-3 gap-3 mb-4">
                    <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 text-center">
                      <View className="i-mdi-calendar-remove text-3xl text-orange-600 mb-2 mx-auto" />
                      <Text className="text-sm text-gray-600 block mb-1">请假天数</Text>
                      <Text className="text-2xl font-bold text-orange-600 block">{stats.leaveDays}</Text>
                    </View>
                    <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 text-center">
                      <View className="i-mdi-calendar-month text-3xl text-purple-600 mb-2 mx-auto" />
                      <Text className="text-sm text-gray-600 block mb-1">应出勤</Text>
                      <Text className="text-2xl font-bold text-purple-600 block">{stats.workDays}天</Text>
                    </View>
                    <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 text-center">
                      <View className="i-mdi-calendar-check text-3xl text-blue-600 mb-2 mx-auto" />
                      <Text className="text-sm text-gray-600 block mb-1">实际出勤</Text>
                      <Text className="text-2xl font-bold text-blue-600 block">{stats.actualAttendanceDays}天</Text>
                    </View>
                  </View>

                  {/* 迟到次数单独显示 */}
                  <View className={`bg-gradient-to-br rounded-2xl p-4 mb-4 ${
                    stats.lateCount === 0 ? 'from-green-50 to-green-100' : 'from-red-50 to-red-100'
                  }`}>
                    <View className="flex items-center justify-between">
                      <View className="flex items-center gap-3">
                        <View className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          stats.lateCount === 0 ? 'bg-green-200' : 'bg-red-200'
                        }`}>
                          <View className={`i-mdi-clock-alert text-2xl ${
                            stats.lateCount === 0 ? 'text-green-700' : 'text-red-700'
                          }`} />
                        </View>
                        <Text className="text-base text-gray-700 font-medium">迟到次数</Text>
                      </View>
                      <Text
                        className={`text-3xl font-bold ${
                          stats.lateCount === 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {stats.lateCount}次
                      </Text>
                    </View>
                  </View>

                  {/* 入职日期和在职天数 */}
                  {stats.joinDate && (
                    <View className="bg-gray-50 rounded-2xl p-3 mb-4">
                      <View className="flex items-center gap-2">
                        <View className="i-mdi-calendar-account text-lg text-gray-600" />
                        <Text className="text-base text-gray-700">
                          入职日期：{formatDate(stats.joinDate)} (在职 {stats.workingDays} 天)
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* 详细记录按钮 */}
                  <View
                    className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl py-4 cursor-pointer shadow-lg active:scale-95 transition-all"
                    onClick={() => {
                      Taro.navigateTo({
                        url: `/pages/super-admin/driver-attendance-detail/index?driverId=${stats.driverId}&driverName=${encodeURIComponent(stats.driverName)}`
                      })
                    }}>
                    <View className="flex items-center justify-center gap-2">
                      <View className="i-mdi-file-document-outline text-2xl text-white" />
                      <Text className="text-lg font-bold text-white">查看详细记录</Text>
                      <View className="i-mdi-chevron-right text-2xl text-white" />
                    </View>
                  </View>
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
