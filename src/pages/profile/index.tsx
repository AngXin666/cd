import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showModal, switchTab, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getCurrentUserProfile, getDriverLicense, getDriverStats, getManagerStats, getSuperAdminStats} from '@/db/api'
import type {DriverLicense, Profile} from '@/db/types'

const ProfilePage: React.FC = () => {
  const {user, logout} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [driverLicense, setDriverLicense] = useState<DriverLicense | null>(null)

  const loadProfile = useCallback(async () => {
    const data = await getCurrentUserProfile()
    setProfile(data)

    // 根据角色加载统计数据
    if (data && user) {
      if (data.role === 'driver') {
        const driverStats = await getDriverStats(user.id)
        setStats(driverStats)
        // 加载司机的驾驶证信息以获取真实姓名
        const license = await getDriverLicense(user.id)
        setDriverLicense(license)
      } else if (data.role === 'manager') {
        const managerStats = await getManagerStats(user.id)
        setStats(managerStats)
      } else if (data.role === 'super_admin') {
        const superAdminStats = await getSuperAdminStats()
        setStats(superAdminStats)
      }
    }
  }, [user])

  useDidShow(() => {
    loadProfile()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadProfile()])
    Taro.stopPullDownRefresh()
  })

  const handleLogout = () => {
    showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout()
        }
      }
    })
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'driver':
        return '司机'
      case 'manager':
        return '管理员'
      case 'super_admin':
        return '超级管理员'
      default:
        return '未知'
    }
  }

  const getRoleBgGradient = (role: string) => {
    switch (role) {
      case 'driver':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      case 'manager':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      case 'super_admin':
        return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
      default:
        return 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    }
  }

  // 隐藏手机号中间4位
  const maskPhone = (phone: string | null) => {
    if (!phone) return '未设置'
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  // 获取显示名称（司机优先显示真实姓名）
  const getDisplayName = () => {
    // 如果是司机角色，优先显示驾驶证上的真实姓名
    if (profile?.role === 'driver' && driverLicense?.id_card_name) {
      return driverLicense.id_card_name
    }
    // 其他角色或未录入驾驶证信息时，显示profile中的姓名
    return profile?.name || profile?.nickname || '未设置姓名'
  }

  // 格式化金额
  const _formatMoney = (amount: number) => {
    return `¥${amount.toFixed(2)}`
  }

  // 司机端快捷功能
  const driverQuickActions = [
    {icon: 'i-mdi-clock-check', text: '上下班打卡', url: '/pages/driver/clock-in/index'},
    {icon: 'i-mdi-file-document-edit', text: '计件录入', url: '/pages/driver/piece-work-entry/index'},
    {icon: 'i-mdi-calendar-clock', text: '请假申请', url: '/pages/driver/leave/apply/index'},
    {icon: 'i-mdi-chart-line', text: '考勤记录', url: '/pages/driver/attendance/index'}
  ]

  // 管理员端快捷功能
  const managerQuickActions = [
    {icon: 'i-mdi-account-group', text: '司机管理', url: '/pages/manager/driver-management/index'},
    {icon: 'i-mdi-chart-box', text: '数据汇总', url: '/pages/manager/data-summary/index'},
    {icon: 'i-mdi-clipboard-check', text: '请假审批', url: '/pages/manager/leave-approval/index'},
    {icon: 'i-mdi-file-chart', text: '计件报表', url: '/pages/manager/piece-work-report/index'}
  ]

  // 超级管理员端快捷功能
  const superAdminQuickActions = [
    {icon: 'i-mdi-warehouse', text: '仓库管理', url: '/pages/super-admin/warehouse-management/index'},
    {icon: 'i-mdi-account-multiple', text: '用户管理', url: '/pages/super-admin/user-management/index'},
    {icon: 'i-mdi-clipboard-check', text: '请假审批', url: '/pages/super-admin/leave-approval/index'},
    {icon: 'i-mdi-cog', text: '权限配置', url: '/pages/super-admin/permission-config/index'}
  ]

  const getQuickActions = () => {
    if (!profile) return []
    switch (profile.role) {
      case 'driver':
        return driverQuickActions
      case 'manager':
        return managerQuickActions
      case 'super_admin':
        return superAdminQuickActions
      default:
        return []
    }
  }

  const handleQuickAction = (url: string) => {
    navigateTo({url})
  }

  const _handleGoToHome = () => {
    switchTab({url: '/pages/index/index'})
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="pb-4">
          {/* 顶部个人信息卡片 */}
          <View
            style={{
              background: getRoleBgGradient(profile?.role || ''),
              borderRadius: '0 0 24px 24px'
            }}
            className="p-6 mb-4 shadow-lg">
            <View className="flex items-center mb-4">
              {/* 头像 */}
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  mode="aspectFill"
                  className="w-20 h-20 rounded-full mr-4"
                  style={{border: '3px solid rgba(255,255,255,0.3)'}}
                />
              ) : (
                <View
                  className="w-20 h-20 rounded-full mr-4 flex items-center justify-center"
                  style={{background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.3)'}}>
                  <View className="i-mdi-account text-5xl text-white" />
                </View>
              )}

              {/* 姓名和角色 */}
              <View className="flex-1">
                <Text className="text-2xl font-bold text-white block mb-1">{getDisplayName()}</Text>
                <View className="flex items-center">
                  <View
                    className="px-3 py-1 rounded-full"
                    style={{background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)'}}>
                    <Text className="text-sm font-medium text-white">{getRoleText(profile?.role || '')}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 基本信息 */}
            <View className="flex items-center justify-between">
              <View className="flex items-center">
                <View className="i-mdi-phone text-lg text-white mr-2 opacity-80" />
                <Text className="text-sm text-white opacity-90">{maskPhone(profile?.phone)}</Text>
              </View>
              {profile?.email && (
                <View className="flex items-center">
                  <View className="i-mdi-email text-lg text-white mr-2 opacity-80" />
                  <Text className="text-sm text-white opacity-90">{profile.email}</Text>
                </View>
              )}
            </View>
          </View>

          <View className="px-4">
            {/* 统计数据卡片 */}
            {stats && (
              <View className="bg-white rounded-xl p-4 mb-4 shadow">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-chart-box text-blue-900 text-xl mr-2" />
                  <Text className="text-gray-800 text-base font-bold">数据统计</Text>
                </View>

                {/* 司机端统计 */}
                {profile?.role === 'driver' && (
                  <View className="grid grid-cols-2 gap-3">
                    <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-calendar-check text-blue-600 text-xl mr-1" />
                        <Text className="text-xs text-gray-600">本月出勤</Text>
                      </View>
                      <Text className="text-2xl font-bold text-blue-900 block">{stats.monthAttendanceDays}</Text>
                      <Text className="text-xs text-gray-500 block">天</Text>
                    </View>

                    <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-currency-cny text-green-600 text-xl mr-1" />
                        <Text className="text-xs text-gray-600">本月收入</Text>
                      </View>
                      <Text className="text-2xl font-bold text-green-900 block">
                        {(stats.monthPieceWorkIncome || 0).toFixed(0)}
                      </Text>
                      <Text className="text-xs text-gray-500 block">元</Text>
                    </View>

                    <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-calendar-remove text-orange-600 text-xl mr-1" />
                        <Text className="text-xs text-gray-600">本月请假</Text>
                      </View>
                      <Text className="text-2xl font-bold text-orange-900 block">{stats.monthLeaveDays}</Text>
                      <Text className="text-xs text-gray-500 block">天</Text>
                    </View>

                    <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-warehouse text-purple-600 text-xl mr-1" />
                        <Text className="text-xs text-gray-600">工作仓库</Text>
                      </View>
                      <Text className="text-2xl font-bold text-purple-900 block">{stats.totalWarehouses}</Text>
                      <Text className="text-xs text-gray-500 block">个</Text>
                    </View>
                  </View>
                )}

                {/* 管理员端统计 */}
                {profile?.role === 'manager' && (
                  <View className="grid grid-cols-2 gap-3">
                    <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-warehouse text-blue-600 text-xl mr-1" />
                        <Text className="text-xs text-gray-600">管理仓库</Text>
                      </View>
                      <Text className="text-2xl font-bold text-blue-900 block">{stats.totalWarehouses}</Text>
                      <Text className="text-xs text-gray-500 block">个</Text>
                    </View>

                    <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-account-group text-green-600 text-xl mr-1" />
                        <Text className="text-xs text-gray-600">管理司机</Text>
                      </View>
                      <Text className="text-2xl font-bold text-green-900 block">{stats.totalDrivers}</Text>
                      <Text className="text-xs text-gray-500 block">人</Text>
                    </View>

                    <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-clipboard-alert text-orange-600 text-xl mr-1" />
                        <Text className="text-xs text-gray-600">待审批</Text>
                      </View>
                      <Text className="text-2xl font-bold text-orange-900 block">{stats.pendingLeaveCount}</Text>
                      <Text className="text-xs text-gray-500 block">条</Text>
                    </View>

                    <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-currency-cny text-purple-600 text-xl mr-1" />
                        <Text className="text-xs text-gray-600">本月总额</Text>
                      </View>
                      <Text className="text-2xl font-bold text-purple-900 block">
                        {(stats.monthPieceWorkTotal || 0).toFixed(0)}
                      </Text>
                      <Text className="text-xs text-gray-500 block">元</Text>
                    </View>
                  </View>
                )}

                {/* 超级管理员端统计 */}
                {profile?.role === 'super_admin' && (
                  <View className="grid grid-cols-3 gap-3">
                    <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-warehouse text-blue-600 text-lg mr-1" />
                        <Text className="text-xs text-gray-600">仓库</Text>
                      </View>
                      <Text className="text-xl font-bold text-blue-900 block">{stats.totalWarehouses}</Text>
                      <Text className="text-xs text-gray-500 block">个</Text>
                    </View>

                    <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-account text-green-600 text-lg mr-1" />
                        <Text className="text-xs text-gray-600">司机</Text>
                      </View>
                      <Text className="text-xl font-bold text-green-900 block">{stats.totalDrivers}</Text>
                      <Text className="text-xs text-gray-500 block">人</Text>
                    </View>

                    <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-account-tie text-orange-600 text-lg mr-1" />
                        <Text className="text-xs text-gray-600">管理员</Text>
                      </View>
                      <Text className="text-xl font-bold text-orange-900 block">{stats.totalManagers}</Text>
                      <Text className="text-xs text-gray-500 block">人</Text>
                    </View>

                    <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-clipboard-alert text-purple-600 text-lg mr-1" />
                        <Text className="text-xs text-gray-600">待审批</Text>
                      </View>
                      <Text className="text-xl font-bold text-purple-900 block">{stats.pendingLeaveCount}</Text>
                      <Text className="text-xs text-gray-500 block">条</Text>
                    </View>

                    <View className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-currency-cny text-pink-600 text-lg mr-1" />
                        <Text className="text-xs text-gray-600">本月</Text>
                      </View>
                      <Text className="text-xl font-bold text-pink-900 block">
                        {(stats.monthPieceWorkTotal || 0).toFixed(0)}
                      </Text>
                      <Text className="text-xs text-gray-500 block">元</Text>
                    </View>

                    <View className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3">
                      <View className="flex items-center mb-2">
                        <View className="i-mdi-account-multiple text-cyan-600 text-lg mr-1" />
                        <Text className="text-xs text-gray-600">用户</Text>
                      </View>
                      <Text className="text-xl font-bold text-cyan-900 block">{stats.totalUsers}</Text>
                      <Text className="text-xs text-gray-500 block">人</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 快捷功能 */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow">
              <View className="flex items-center mb-3">
                <View className="i-mdi-lightning-bolt text-blue-900 text-xl mr-2" />
                <Text className="text-gray-800 text-base font-bold">快捷功能</Text>
              </View>

              <View className="grid grid-cols-4 gap-3">
                {getQuickActions().map((action, index) => (
                  <View
                    key={index}
                    className="flex flex-col items-center active:scale-95 transition-all"
                    onClick={() => handleQuickAction(action.url)}>
                    <View
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-2"
                      style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                      <View className={`${action.icon} text-2xl text-white`} />
                    </View>
                    <Text className="text-xs text-gray-700 text-center">{action.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 个人设置菜单 */}
            <View className="bg-white rounded-xl mb-4 shadow overflow-hidden">
              {/* 个人信息 - 仅司机角色显示 */}
              {profile?.role === 'driver' && (
                <View
                  className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 transition-all"
                  onClick={() => navigateTo({url: '/pages/driver/profile/index'})}>
                  <View className="flex items-center">
                    <View className="i-mdi-card-account-details text-2xl text-blue-900 mr-3" />
                    <View className="flex-1">
                      <Text className="text-sm text-gray-800 font-medium block">个人信息</Text>
                      <Text className="text-xs text-gray-500 block mt-0.5">查看身份证、驾驶证等证件信息</Text>
                    </View>
                  </View>
                  <View className="i-mdi-chevron-right text-xl text-gray-400" />
                </View>
              )}

              <View
                className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 transition-all"
                onClick={() => navigateTo({url: '/pages/profile/settings/index'})}>
                <View className="flex items-center">
                  <View className="i-mdi-cog text-2xl text-blue-900 mr-3" />
                  <Text className="text-sm text-gray-800">设置</Text>
                </View>
                <View className="i-mdi-chevron-right text-xl text-gray-400" />
              </View>

              <View
                className="flex items-center justify-between p-4 active:bg-gray-50 transition-all"
                onClick={() => navigateTo({url: '/pages/profile/help/index'})}>
                <View className="flex items-center">
                  <View className="i-mdi-help-circle text-2xl text-blue-900 mr-3" />
                  <Text className="text-sm text-gray-800">帮助与反馈</Text>
                </View>
                <View className="i-mdi-chevron-right text-xl text-gray-400" />
              </View>
            </View>

            {/* 退出登录 */}
            <View className="bg-white rounded-xl p-4 shadow active:scale-95 transition-all" onClick={handleLogout}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-logout text-xl text-red-600 mr-2" />
                <Text className="text-base font-medium text-red-600">退出登录</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ProfilePage
