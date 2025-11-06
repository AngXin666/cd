import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showModal, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getCurrentUserProfile, getDriverAttendanceStats, getDriverWarehouses, getPieceWorkRecordsByUser} from '@/db/api'
import type {Profile, Warehouse} from '@/db/types'

const DriverHome: React.FC = () => {
  const {user, logout} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
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
    if (!user?.id) {
      console.log('用户ID不存在，无法加载统计数据，user:', user)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('开始加载统计数据，用户ID:', user.id)

      const today = new Date()
      const year = today.getFullYear()
      const month = today.getMonth() + 1
      const day = today.getDate()

      // 使用本地日期而不是UTC日期
      const todayStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      console.log('今日日期（本地时间）:', todayStr)

      // 计算本月的开始和结束日期
      const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0)
      const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`

      // 获取当月计件记录
      console.log('获取计件记录:', firstDay, '至', lastDayStr)
      const records = await getPieceWorkRecordsByUser(user.id, firstDay, lastDayStr)
      console.log('计件记录数量:', records.length, '记录:', records)

      // 筛选今日记录（使用本地日期）
      const todayRecords = records.filter((record) => record.work_date === todayStr)
      console.log('今日记录数量:', todayRecords.length, '筛选条件:', todayStr)

      // 计算今日统计
      const todayPieceCount = todayRecords.reduce((sum, record) => sum + (record.quantity || 0), 0)
      const todayIncome = todayRecords.reduce((sum, record) => {
        const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
        const upstairsAmount = record.need_upstairs ? (record.quantity || 0) * (record.upstairs_price || 0) : 0
        const sortingAmount = record.need_sorting
          ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0)
          : 0
        return sum + baseAmount + upstairsAmount + sortingAmount
      }, 0)

      // 计算本月统计
      const monthPieceCount = records.reduce((sum, record) => sum + (record.quantity || 0), 0)
      const monthIncome = records.reduce((sum, record) => {
        const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
        const upstairsAmount = record.need_upstairs ? (record.quantity || 0) * (record.upstairs_price || 0) : 0
        const sortingAmount = record.need_sorting
          ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0)
          : 0
        return sum + baseAmount + upstairsAmount + sortingAmount
      }, 0)

      console.log(
        '计件统计 - 今日件数:',
        todayPieceCount,
        '今日收入:',
        todayIncome,
        '本月件数:',
        monthPieceCount,
        '本月收入:',
        monthIncome
      )

      // 获取本月考勤数据（使用前面已经计算好的firstDay和lastDayStr）
      console.log('获取考勤数据:', firstDay, '至', lastDayStr)
      const attendanceData = await getDriverAttendanceStats(user.id, firstDay, lastDayStr)
      console.log('考勤统计 - 出勤天数:', attendanceData.attendanceDays, '请假天数:', attendanceData.leaveDays)

      const newStats = {
        todayPieceCount,
        todayIncome,
        monthPieceCount,
        monthIncome,
        attendanceDays: attendanceData.attendanceDays,
        leaveDays: attendanceData.leaveDays
      }
      console.log('设置新的统计数据:', newStats)
      setStats(newStats)
    } catch (error) {
      console.error('加载统计数据失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'error',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id, user])

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
      case 'stats':
        navigateTo({url: '/pages/driver/piece-work/index'})
        break
      default:
        break
    }
  }

  // 处理统计卡片点击
  const handleStatsClick = (type: 'today' | 'month') => {
    // 跳转到数据统计页面，并传递时间范围参数
    navigateTo({url: `/pages/driver/piece-work/index?range=${type}`})
  }

  // 处理考勤卡片点击
  const handleAttendanceClick = () => {
    // 跳转到请假申请页面
    navigateTo({url: '/pages/driver/leave/index'})
  }

  // 退出登录处理
  const handleLogout = () => {
    showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout()
        }
      }
    })
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

          {/* 数据统计仪表盘 */}
          <View className="mb-4">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-view-dashboard text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">数据仪表盘</Text>
              </View>
              <Text className="text-xs text-gray-500">{new Date().toLocaleDateString('zh-CN')}</Text>
            </View>

            {loading ? (
              <View className="bg-white rounded-xl p-8 shadow-md flex items-center justify-center">
                <Text className="text-gray-500">加载中...</Text>
              </View>
            ) : (
              <View className="bg-white rounded-xl p-4 shadow-md">
                <View className="grid grid-cols-3 gap-3">
                  {/* 当日件数 */}
                  <View
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 active:scale-95 transition-all"
                    onClick={() => handleStatsClick('today')}>
                    <View className="i-mdi-package-variant text-2xl text-blue-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">当日件数</Text>
                    <Text className="text-2xl font-bold text-blue-900 block">{stats.todayPieceCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">件</Text>
                  </View>

                  {/* 当日收入 */}
                  <View
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 active:scale-95 transition-all"
                    onClick={() => handleStatsClick('today')}>
                    <View className="i-mdi-cash-multiple text-2xl text-green-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">当日收入</Text>
                    <Text className="text-2xl font-bold text-green-600 block">{stats.todayIncome.toFixed(0)}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">元</Text>
                  </View>

                  {/* 本月件数 */}
                  <View
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 active:scale-95 transition-all"
                    onClick={() => handleStatsClick('month')}>
                    <View className="i-mdi-package-variant-closed text-2xl text-purple-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">本月件数</Text>
                    <Text className="text-2xl font-bold text-purple-900 block">{stats.monthPieceCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">件</Text>
                  </View>

                  {/* 本月收入 */}
                  <View
                    className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 active:scale-95 transition-all"
                    onClick={() => handleStatsClick('month')}>
                    <View className="i-mdi-currency-cny text-2xl text-orange-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">本月收入</Text>
                    <Text className="text-2xl font-bold text-orange-600 block">{stats.monthIncome.toFixed(0)}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">元</Text>
                  </View>

                  {/* 出勤天数 */}
                  <View
                    className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 active:scale-95 transition-all"
                    onClick={handleAttendanceClick}>
                    <View className="i-mdi-calendar-check text-2xl text-teal-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">出勤天数</Text>
                    <Text className="text-2xl font-bold text-teal-900 block">{stats.attendanceDays}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">天</Text>
                  </View>

                  {/* 请假天数 */}
                  <View
                    className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 active:scale-95 transition-all"
                    onClick={handleAttendanceClick}>
                    <View className="i-mdi-calendar-remove text-2xl text-red-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">请假天数</Text>
                    <Text className="text-2xl font-bold text-red-900 block">{stats.leaveDays}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">天</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 快捷功能板块 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center justify-between mb-4">
              <View className="flex items-center">
                <View className="i-mdi-lightning-bolt text-xl text-orange-600 mr-2" />
                <Text className="text-lg font-bold text-gray-800">快捷功能</Text>
              </View>
              {/* 右侧个人中心按钮 */}
              <View
                className="flex items-center bg-blue-50 rounded-full px-3 py-1 active:scale-95 transition-all"
                onClick={() => Taro.switchTab({url: '/pages/profile/index'})}>
                <View className="i-mdi-account-circle text-lg text-blue-600 mr-1" />
                <Text className="text-sm text-blue-600 font-medium">个人中心</Text>
              </View>
            </View>

            {/* 2x2网格布局 */}
            <View className="grid grid-cols-2 gap-4">
              {/* 计件录入 */}
              <View
                className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl active:scale-95 transition-all shadow"
                onClick={() => handleQuickAction('piece-work')}>
                <View className="i-mdi-clipboard-edit text-5xl text-blue-600 mb-3" />
                <Text className="text-base font-medium text-gray-800">计件录入</Text>
              </View>

              {/* 考勤打卡 */}
              <View
                className="flex flex-col items-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl active:scale-95 transition-all shadow"
                onClick={() => handleQuickAction('clock-in')}>
                <View className="i-mdi-clock-check text-5xl text-orange-600 mb-3" />
                <Text className="text-base font-medium text-gray-800">考勤打卡</Text>
              </View>

              {/* 请假申请 */}
              <View
                className="flex flex-col items-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl active:scale-95 transition-all shadow"
                onClick={() => handleQuickAction('leave')}>
                <View className="i-mdi-calendar-remove text-5xl text-purple-600 mb-3" />
                <Text className="text-base font-medium text-gray-800">请假申请</Text>
              </View>

              {/* 数据统计 */}
              <View
                className="flex flex-col items-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl active:scale-95 transition-all shadow"
                onClick={() => handleQuickAction('stats')}>
                <View className="i-mdi-chart-bar text-5xl text-green-600 mb-3" />
                <Text className="text-base font-medium text-gray-800">数据统计</Text>
              </View>
            </View>
          </View>

          {/* 所属仓库卡片 */}
          <View className="bg-white rounded-xl p-4 shadow-md mb-4">
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

          {/* 退出登录按钮 */}
          <View className="bg-white rounded-xl p-4 shadow-md mb-4">
            <View
              className="flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 active:scale-98 transition-all"
              onClick={handleLogout}>
              <View className="i-mdi-logout text-2xl text-white mr-2" />
              <Text className="text-base font-bold text-white">退出登录</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverHome
