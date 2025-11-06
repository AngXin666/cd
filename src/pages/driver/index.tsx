import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getCurrentUserProfile, getDriverAttendanceStats, getDriverWarehouses, getPieceWorkRecordsByUser} from '@/db/api'
import type {Profile, Warehouse} from '@/db/types'

const DriverHome: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stats, setStats] = useState({
    todayPieceCount: 0,
    todayIncome: 0,
    monthPieceCount: 0,
    monthIncome: 0,
    attendanceDays: 0,
    leaveDays: 0
  })

  const loadProfile = useCallback(async () => {
    const data = await getCurrentUserProfile()
    setProfile(data)
  }, [])

  const loadWarehouses = useCallback(async () => {
    if (!user?.id) return
    const data = await getDriverWarehouses(user.id)
    setWarehouses(data)
  }, [user?.id])

  // 加载统计数据
  const loadStats = useCallback(async () => {
    if (!user?.id) return

    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1

    // 获取当月计件记录
    const records = await getPieceWorkRecordsByUser(user.id, year.toString(), month.toString())

    // 筛选今日记录
    const todayStr = today.toISOString().split('T')[0]
    const todayRecords = records.filter((record) => record.work_date.startsWith(todayStr))

    // 计算今日统计
    const todayPieceCount = todayRecords.reduce((sum, record) => sum + (record.quantity || 0), 0)
    const todayIncome = todayRecords.reduce((sum, record) => {
      const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
      const upstairsAmount = record.need_upstairs ? (record.quantity || 0) * (record.upstairs_price || 0) : 0
      const sortingAmount = record.need_sorting ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0) : 0
      return sum + baseAmount + upstairsAmount + sortingAmount
    }, 0)

    // 计算本月统计
    const monthPieceCount = records.reduce((sum, record) => sum + (record.quantity || 0), 0)
    const monthIncome = records.reduce((sum, record) => {
      const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
      const upstairsAmount = record.need_upstairs ? (record.quantity || 0) * (record.upstairs_price || 0) : 0
      const sortingAmount = record.need_sorting ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0) : 0
      return sum + baseAmount + upstairsAmount + sortingAmount
    }, 0)

    // 获取本月考勤数据
    const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0)
    const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`
    const attendanceData = await getDriverAttendanceStats(user.id, firstDay, lastDayStr)

    setStats({
      todayPieceCount,
      todayIncome,
      monthPieceCount,
      monthIncome,
      attendanceDays: attendanceData.attendanceDays,
      leaveDays: attendanceData.leaveDays
    })
  }, [user?.id])

  useEffect(() => {
    loadProfile()
    loadWarehouses()
    loadStats()
  }, [loadProfile, loadWarehouses, loadStats])

  useDidShow(() => {
    loadProfile()
    loadWarehouses()
    loadStats()
  })

  // 快捷功能点击处理
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'piece-work':
        navigateTo({url: '/pages/driver/piece-work-entry/index'})
        break
      case 'clock-in':
        navigateTo({url: '/pages/driver/clock-in/index'})
        break
      case 'leave':
        navigateTo({url: '/pages/driver/leave/index'})
        break
      case 'expense':
        Taro.showToast({title: '支出管理功能开发中', icon: 'none'})
        break
      case 'stats':
        navigateTo({url: '/pages/driver/piece-work/index'})
        break
      case 'vehicle':
        Taro.showToast({title: '车辆管理功能开发中', icon: 'none'})
        break
      default:
        break
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 欢迎卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">司机工作台</Text>
            <Text className="text-blue-100 text-sm block">欢迎回来，{profile?.name || profile?.phone || '司机'}</Text>
          </View>

          {/* 统计板块 */}
          <View className="mb-4">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-chart-box text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">数据统计</Text>
              </View>
              <Text className="text-xs text-gray-500">{new Date().toLocaleDateString('zh-CN')}</Text>
            </View>

            {/* 第一行：当日数据 */}
            <View className="mb-3">
              <Text className="text-sm font-medium text-gray-600 mb-2 ml-1">今日数据</Text>
              <View className="grid grid-cols-2 gap-3">
                {/* 当日件数 */}
                <View className="bg-white rounded-xl p-4 shadow-md">
                  <View className="flex items-center justify-between mb-2">
                    <View className="i-mdi-package-variant text-2xl text-blue-600" />
                    {stats.todayPieceCount > 0 && <View className="i-mdi-trending-up text-sm text-green-500" />}
                  </View>
                  <Text className="text-xs text-gray-500 block mb-1">当日件数</Text>
                  <Text className="text-2xl font-bold text-blue-900 block">{stats.todayPieceCount}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">件</Text>
                </View>

                {/* 当日收入 */}
                <View className="bg-white rounded-xl p-4 shadow-md">
                  <View className="flex items-center justify-between mb-2">
                    <View className="i-mdi-cash-multiple text-2xl text-green-600" />
                    {stats.todayIncome > 0 && <View className="i-mdi-trending-up text-sm text-green-500" />}
                  </View>
                  <Text className="text-xs text-gray-500 block mb-1">当日收入</Text>
                  <Text className="text-2xl font-bold text-green-600 block">{stats.todayIncome.toFixed(0)}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">元</Text>
                </View>
              </View>
            </View>

            {/* 第二行：本月数据 */}
            <View className="mb-3">
              <Text className="text-sm font-medium text-gray-600 mb-2 ml-1">本月数据</Text>
              <View className="grid grid-cols-2 gap-3">
                {/* 本月件数 */}
                <View className="bg-white rounded-xl p-4 shadow-md">
                  <View className="flex items-center justify-between mb-2">
                    <View className="i-mdi-package-variant-closed text-2xl text-purple-600" />
                  </View>
                  <Text className="text-xs text-gray-500 block mb-1">本月件数</Text>
                  <Text className="text-2xl font-bold text-purple-900 block">{stats.monthPieceCount}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">件</Text>
                </View>

                {/* 本月收入 */}
                <View className="bg-white rounded-xl p-4 shadow-md">
                  <View className="flex items-center justify-between mb-2">
                    <View className="i-mdi-currency-cny text-2xl text-orange-600" />
                  </View>
                  <Text className="text-xs text-gray-500 block mb-1">本月收入</Text>
                  <Text className="text-2xl font-bold text-orange-600 block">{stats.monthIncome.toFixed(0)}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">元</Text>
                </View>
              </View>
            </View>

            {/* 第三行：考勤数据 */}
            <View>
              <Text className="text-sm font-medium text-gray-600 mb-2 ml-1">考勤数据</Text>
              <View className="grid grid-cols-2 gap-3">
                {/* 出勤天数 */}
                <View className="bg-white rounded-xl p-4 shadow-md">
                  <View className="flex items-center justify-between mb-2">
                    <View className="i-mdi-calendar-check text-2xl text-teal-600" />
                  </View>
                  <Text className="text-xs text-gray-500 block mb-1">出勤天数</Text>
                  <Text className="text-2xl font-bold text-teal-900 block">{stats.attendanceDays}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">天</Text>
                </View>

                {/* 请假天数 */}
                <View className="bg-white rounded-xl p-4 shadow-md">
                  <View className="flex items-center justify-between mb-2">
                    <View className="i-mdi-calendar-remove text-2xl text-red-600" />
                  </View>
                  <Text className="text-xs text-gray-500 block mb-1">请假天数</Text>
                  <Text className="text-2xl font-bold text-red-900 block">{stats.leaveDays}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">天</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 快捷功能板块 - 优化后 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-lightning-bolt text-xl text-orange-600 mr-2" />
              <Text className="text-lg font-bold text-gray-800">快捷功能</Text>
            </View>
            <View className="grid grid-cols-3 gap-4">
              {/* 计件 */}
              <View
                className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl active:scale-95 transition-all"
                onClick={() => handleQuickAction('piece-work')}>
                <View className="i-mdi-clipboard-edit text-4xl text-blue-600 mb-2" />
                <Text className="text-sm font-medium text-gray-800">计件</Text>
              </View>

              {/* 打卡 */}
              <View
                className="flex flex-col items-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl active:scale-95 transition-all"
                onClick={() => handleQuickAction('clock-in')}>
                <View className="i-mdi-clock-check text-4xl text-orange-600 mb-2" />
                <Text className="text-sm font-medium text-gray-800">打卡</Text>
              </View>

              {/* 请假 */}
              <View
                className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl active:scale-95 transition-all"
                onClick={() => handleQuickAction('leave')}>
                <View className="i-mdi-calendar-remove text-4xl text-purple-600 mb-2" />
                <Text className="text-sm font-medium text-gray-800">请假</Text>
              </View>

              {/* 支出 */}
              <View
                className="flex flex-col items-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl active:scale-95 transition-all"
                onClick={() => handleQuickAction('expense')}>
                <View className="i-mdi-wallet text-4xl text-red-600 mb-2" />
                <Text className="text-sm font-medium text-gray-800">支出</Text>
              </View>

              {/* 数据统计 */}
              <View
                className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl active:scale-95 transition-all"
                onClick={() => handleQuickAction('stats')}>
                <View className="i-mdi-chart-bar text-4xl text-green-600 mb-2" />
                <Text className="text-sm font-medium text-gray-800">数据统计</Text>
              </View>

              {/* 车辆管理 */}
              <View
                className="flex flex-col items-center p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl active:scale-95 transition-all"
                onClick={() => handleQuickAction('vehicle')}>
                <View className="i-mdi-car text-4xl text-cyan-600 mb-2" />
                <Text className="text-sm font-medium text-gray-800">车辆管理</Text>
              </View>
            </View>
          </View>

          {/* 所属仓库卡片 */}
          <View className="bg-white rounded-xl p-4 shadow-md">
            <View className="flex items-center mb-3">
              <View className="i-mdi-warehouse text-xl text-blue-900 mr-2" />
              <Text className="text-lg font-bold text-gray-800">所属仓库</Text>
            </View>
            {warehouses.length > 0 ? (
              <View className="space-y-2">
                {warehouses.map((warehouse) => (
                  <View
                    key={warehouse.id}
                    className="flex items-center bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 active:scale-98 transition-all"
                    onClick={() =>
                      navigateTo({url: `/pages/driver/warehouse-stats/index?warehouseId=${warehouse.id}`})
                    }>
                    <View className="i-mdi-map-marker text-blue-600 text-xl mr-2" />
                    <Text className="text-gray-800 text-sm flex-1 font-medium">{warehouse.name}</Text>
                    <View className={`px-2 py-1 rounded mr-2 ${warehouse.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Text className={`text-xs ${warehouse.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                        {warehouse.is_active ? '启用中' : '已禁用'}
                      </Text>
                    </View>
                    <View className="i-mdi-chevron-right text-gray-400 text-xl" />
                  </View>
                ))}
              </View>
            ) : (
              <View className="text-center py-8">
                <View className="i-mdi-alert-circle text-gray-300 text-5xl mb-3" />
                <Text className="text-gray-400 text-sm block font-medium">暂未分配仓库</Text>
                <Text className="text-gray-400 text-xs block mt-1">请联系管理员分配仓库</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverHome
