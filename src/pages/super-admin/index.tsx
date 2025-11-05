import {Button, ScrollView, Text, View} from '@tarojs/components'
import {navigateTo, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getAllProfiles, getCurrentUserProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const SuperAdminHome: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allUsers, setAllUsers] = useState<Profile[]>([])

  const loadData = useCallback(async () => {
    const profileData = await getCurrentUserProfile()
    setProfile(profileData)

    const usersData = await getAllProfiles()
    setAllUsers(usersData)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  const handleManageUsers = () => {
    navigateTo({url: '/pages/admin-dashboard/index'})
  }

  const driverCount = allUsers.filter((u) => u.role === 'driver').length
  const managerCount = allUsers.filter((u) => u.role === 'manager').length
  const superAdminCount = allUsers.filter((u) => u.role === 'super_admin').length

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 欢迎卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">超级管理员控制台</Text>
            <Text className="text-blue-100 text-sm block">欢迎，{profile?.name || profile?.phone || '超级管理员'}</Text>
          </View>

          {/* 系统统计 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">系统统计</Text>
            <View className="grid grid-cols-2 gap-4">
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">总用户数</Text>
                  <View className="i-mdi-account-group text-2xl text-blue-900" />
                </View>
                <Text className="text-3xl font-bold text-blue-900 block">{allUsers.length}</Text>
              </View>
              <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">司机数量</Text>
                  <View className="i-mdi-account text-2xl text-orange-600" />
                </View>
                <Text className="text-3xl font-bold text-orange-600 block">{driverCount}</Text>
              </View>
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">管理员</Text>
                  <View className="i-mdi-shield-account text-2xl text-blue-900" />
                </View>
                <Text className="text-3xl font-bold text-blue-900 block">{managerCount}</Text>
              </View>
              <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">超级管理员</Text>
                  <View className="i-mdi-shield-star text-2xl text-orange-600" />
                </View>
                <Text className="text-3xl font-bold text-orange-600 block">{superAdminCount}</Text>
              </View>
            </View>
          </View>

          {/* 系统管理功能 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">系统管理</Text>
            <View className="grid grid-cols-3 gap-4">
              <View className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-account-cog text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">用户管理</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <View className="i-mdi-shield-check text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">权限管理</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-cog text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">系统设置</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <View className="i-mdi-database text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">数据管理</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-chart-bar text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">统计分析</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <View className="i-mdi-file-document-multiple text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">日志查看</Text>
              </View>
            </View>
          </View>

          {/* 快捷操作 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">快捷操作</Text>
            <Button
              className="w-full mb-3 text-sm break-keep"
              size="default"
              style={{
                backgroundColor: '#1E3A8A',
                color: 'white',
                borderRadius: '8px',
                border: 'none'
              }}
              onClick={handleManageUsers}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-account-multiple mr-2" />
                <Text>用户管理</Text>
              </View>
            </Button>
            <Button
              className="w-full mb-3 text-sm break-keep"
              size="default"
              style={{
                backgroundColor: '#F97316',
                color: 'white',
                borderRadius: '8px',
                border: 'none'
              }}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-car-multiple mr-2" />
                <Text>车辆管理</Text>
              </View>
            </Button>
            <Button
              className="w-full text-sm break-keep"
              size="default"
              style={{
                backgroundColor: '#1E3A8A',
                color: 'white',
                borderRadius: '8px',
                border: 'none'
              }}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-chart-line mr-2" />
                <Text>数据报表</Text>
              </View>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default SuperAdminHome
