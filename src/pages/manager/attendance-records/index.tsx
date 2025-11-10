import {Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getAllAttendanceRecords, getAllProfiles, getManagerWarehouses} from '@/db/api'
import type {AttendanceRecord, Profile, Warehouse} from '@/db/types'

// 打卡记录统计类型
interface AttendanceStats {
  totalRecords: number
  normalCount: number
  lateCount: number
  earlyCount: number
  absentCount: number
}

const ManagerAttendanceRecords: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [managerWarehouses, setManagerWarehouses] = useState<Warehouse[]>([])
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterDriver, setFilterDriver] = useState<string>('all')

  // 初始化当前月份
  const initCurrentMonth = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }, [])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user) return

    showLoading({title: '加载中...'})

    try {
      // 获取管理员管辖的仓库
      const managedWarehouses = await getManagerWarehouses(user.id)
      setManagerWarehouses(managedWarehouses)

      // 获取所有用户信息
      const allProfiles = await getAllProfiles()
      setProfiles(allProfiles)

      // 解析筛选月份
      const currentMonth = filterMonth || initCurrentMonth()
      const [year, month] = currentMonth.split('-').map(Number)

      // 获取打卡记录
      const records = await getAllAttendanceRecords(year, month)

      // 过滤管理员管辖的仓库的记录
      const managedWarehouseIds = managedWarehouses.map((w) => w.id)
      const filteredRecords = records.filter((r) => managedWarehouseIds.includes(r.warehouse_id))

      setAttendanceRecords(filteredRecords)
    } finally {
      Taro.hideLoading()
    }
  }, [user, filterMonth, initCurrentMonth])

  useDidShow(() => {
    if (!filterMonth) {
      setFilterMonth(initCurrentMonth())
    }
    loadData()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await loadData()
    Taro.stopPullDownRefresh()
  })

  // 获取用户姓名
  const getUserName = (userId: string) => {
    const profile = profiles.find((p) => p.id === userId)
    return profile?.name || profile?.phone || '未知'
  }

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = managerWarehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 获取状态文本和样式
  const getStatusInfo = (record: AttendanceRecord) => {
    if (record.status === 'absent') {
      return {text: '缺勤', color: 'text-red-600', bg: 'bg-red-50'}
    }
    if (record.status === 'late') {
      return {text: '迟到', color: 'text-orange-600', bg: 'bg-orange-50'}
    }
    if (record.status === 'early') {
      return {text: '早退', color: 'text-yellow-600', bg: 'bg-yellow-50'}
    }
    return {text: '正常', color: 'text-green-600', bg: 'bg-green-50'}
  }

  // 获取可见的打卡记录
  const getVisibleRecords = () => {
    let visible = attendanceRecords

    // 按仓库筛选
    if (filterWarehouse !== 'all') {
      visible = visible.filter((r) => r.warehouse_id === filterWarehouse)
    }

    // 按司机筛选
    if (filterDriver !== 'all') {
      visible = visible.filter((r) => r.user_id === filterDriver)
    }

    // 按日期倒序排序
    return visible.sort((a, b) => new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime())
  }

  // 计算统计数据
  const calculateStats = (): AttendanceStats => {
    const visible = getVisibleRecords()
    return {
      totalRecords: visible.length,
      normalCount: visible.filter((r) => r.status === 'normal').length,
      lateCount: visible.filter((r) => r.status === 'late').length,
      earlyCount: visible.filter((r) => r.status === 'early').length,
      absentCount: visible.filter((r) => r.status === 'absent').length
    }
  }

  // 生成月份选项（最近12个月）
  const generateMonthOptions = () => {
    const options: string[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      options.push(`${year}-${month}`)
    }
    return options
  }

  // 获取司机列表（去重）
  const getDriverList = () => {
    const driverIds = new Set(attendanceRecords.map((r) => r.user_id))
    return Array.from(driverIds)
      .map((id) => ({
        id,
        name: getUserName(id)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const visibleRecords = getVisibleRecords()
  const stats = calculateStats()
  const monthOptions = generateMonthOptions()
  const driverList = getDriverList()

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">打卡记录</Text>
            <Text className="text-blue-100 text-sm block">查看司机考勤打卡记录</Text>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-2 gap-3 mb-4">
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">总记录数</Text>
              <Text className="text-3xl font-bold text-blue-900 block">{stats.totalRecords}</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">正常</Text>
              <Text className="text-3xl font-bold text-green-600 block">{stats.normalCount}</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">迟到</Text>
              <Text className="text-3xl font-bold text-orange-600 block">{stats.lateCount}</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">早退</Text>
              <Text className="text-3xl font-bold text-yellow-600 block">{stats.earlyCount}</Text>
            </View>
          </View>

          {/* 筛选区域 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-sm text-gray-700 font-bold block mb-3">筛选条件</Text>

            {/* 月份筛选 */}
            <View className="mb-3">
              <Text className="text-xs text-gray-600 block mb-2">选择月份</Text>
              <Picker
                mode="selector"
                range={monthOptions}
                value={monthOptions.indexOf(filterMonth || initCurrentMonth())}
                onChange={(e) => {
                  const index = Number(e.detail.value)
                  setFilterMonth(monthOptions[index])
                }}>
                <View className="border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">{filterMonth || initCurrentMonth()}</Text>
                  <View className="i-mdi-chevron-down text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

            {/* 仓库筛选 */}
            <View className="mb-3">
              <Text className="text-xs text-gray-600 block mb-2">选择仓库</Text>
              <Picker
                mode="selector"
                range={['全部仓库', ...managerWarehouses.map((w) => w.name)]}
                value={
                  filterWarehouse === 'all'
                    ? 0
                    : Math.max(0, managerWarehouses.findIndex((w) => w.id === filterWarehouse) + 1)
                }
                onChange={(e) => {
                  const index = Number(e.detail.value)
                  setFilterWarehouse(index === 0 ? 'all' : managerWarehouses[index - 1]?.id || 'all')
                }}>
                <View className="border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">
                    {filterWarehouse === 'all' ? '全部仓库' : getWarehouseName(filterWarehouse)}
                  </Text>
                  <View className="i-mdi-chevron-down text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

            {/* 司机筛选 */}
            <View>
              <Text className="text-xs text-gray-600 block mb-2">选择司机</Text>
              <Picker
                mode="selector"
                range={['全部司机', ...driverList.map((d) => d.name)]}
                value={filterDriver === 'all' ? 0 : Math.max(0, driverList.findIndex((d) => d.id === filterDriver) + 1)}
                onChange={(e) => {
                  const index = Number(e.detail.value)
                  setFilterDriver(index === 0 ? 'all' : driverList[index - 1]?.id || 'all')
                }}>
                <View className="border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">
                    {filterDriver === 'all' ? '全部司机' : getUserName(filterDriver)}
                  </Text>
                  <View className="i-mdi-chevron-down text-xl text-gray-400" />
                </View>
              </Picker>
            </View>
          </View>

          {/* 打卡记录列表 */}
          <View className="mb-4">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-800">打卡记录</Text>
              <Text className="text-xs text-gray-500">{visibleRecords.length} 条记录</Text>
            </View>

            {visibleRecords.length === 0 ? (
              <View className="bg-white rounded-lg p-8 text-center shadow">
                <View className="i-mdi-clock-outline text-6xl text-gray-300 mb-4 mx-auto" />
                <Text className="text-gray-500 block">暂无打卡记录</Text>
              </View>
            ) : (
              visibleRecords.map((record) => {
                const statusInfo = getStatusInfo(record)
                return (
                  <View key={record.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                    {/* 头部信息 */}
                    <View className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                      <View className="flex items-center">
                        <View className="i-mdi-account-circle text-3xl text-blue-900 mr-3" />
                        <View>
                          <Text className="text-base font-bold text-gray-800 block">{getUserName(record.user_id)}</Text>
                          <Text className="text-xs text-gray-500">{getWarehouseName(record.warehouse_id)}</Text>
                        </View>
                      </View>
                      <View className={`px-3 py-1 rounded-full ${statusInfo.bg}`}>
                        <Text className={`text-xs font-bold ${statusInfo.color}`}>{statusInfo.text}</Text>
                      </View>
                    </View>

                    {/* 打卡时间信息 */}
                    <View className="space-y-2">
                      <View className="flex items-center">
                        <View className="i-mdi-calendar text-lg text-gray-500 mr-2" />
                        <Text className="text-sm text-gray-700">日期：{formatDate(record.clock_in_time)}</Text>
                      </View>

                      <View className="flex items-center">
                        <View className="i-mdi-clock-in text-lg text-green-600 mr-2" />
                        <Text className="text-sm text-gray-700">上班打卡：{formatTime(record.clock_in_time)}</Text>
                      </View>

                      {record.clock_out_time && (
                        <View className="flex items-center">
                          <View className="i-mdi-clock-out text-lg text-blue-600 mr-2" />
                          <Text className="text-sm text-gray-700">下班打卡：{formatTime(record.clock_out_time)}</Text>
                        </View>
                      )}

                      {!record.clock_out_time && record.status !== 'absent' && (
                        <View className="flex items-center">
                          <View className="i-mdi-clock-alert text-lg text-gray-400 mr-2" />
                          <Text className="text-sm text-gray-500">下班打卡：未打卡</Text>
                        </View>
                      )}

                      {record.work_hours && (
                        <View className="flex items-center">
                          <View className="i-mdi-timer text-lg text-blue-500 mr-2" />
                          <Text className="text-sm text-gray-700">工作时长：{record.work_hours} 小时</Text>
                        </View>
                      )}
                    </View>

                    {/* 备注信息 */}
                    {record.notes && (
                      <View className="mt-3 pt-3 border-t border-gray-100">
                        <Text className="text-xs text-gray-500">备注：{record.notes}</Text>
                      </View>
                    )}
                  </View>
                )
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ManagerAttendanceRecords
