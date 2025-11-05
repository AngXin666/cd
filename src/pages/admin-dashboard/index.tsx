import {Button, Picker, ScrollView, Text, View} from '@tarojs/components'
import {showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getAllProfiles, updateUserRole} from '@/db/api'
import type {Profile, UserRole} from '@/db/types'

const AdminDashboard: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [rolePickerVisible, setRolePickerVisible] = useState(false)

  const roleOptions = [
    {label: '司机', value: 'driver'},
    {label: '管理员', value: 'manager'},
    {label: '超级管理员', value: 'super_admin'}
  ]

  const loadUsers = useCallback(async () => {
    const data = await getAllProfiles()
    setAllUsers(data)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useDidShow(() => {
    loadUsers()
  })

  const handleChangeRole = (userId: string, _currentRole: UserRole) => {
    const targetUser = allUsers.find((u) => u.id === userId)
    if (!targetUser) return

    setSelectedUser(targetUser)
    setRolePickerVisible(true)
  }

  const handleRoleChange = async (e: any) => {
    const selectedIndex = e.detail.value
    const newRole = roleOptions[selectedIndex].value as UserRole

    if (!selectedUser) return

    showModal({
      title: '确认修改',
      content: `确定要将 ${selectedUser.name || selectedUser.phone || '该用户'} 的角色修改为 ${roleOptions[selectedIndex].label} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          const success = await updateUserRole(selectedUser.id, newRole)
          if (success) {
            showToast({title: '修改成功', icon: 'success'})
            loadUsers()
          } else {
            showToast({title: '修改失败', icon: 'error'})
          }
        }
      }
    })

    setRolePickerVisible(false)
    setSelectedUser(null)
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

  const getRoleBgColor = (role: string) => {
    switch (role) {
      case 'driver':
        return 'bg-blue-100'
      case 'manager':
        return 'bg-orange-100'
      case 'super_admin':
        return 'bg-red-100'
      default:
        return 'bg-gray-100'
    }
  }

  const getRoleTextColor = (role: string) => {
    switch (role) {
      case 'driver':
        return 'text-blue-900'
      case 'manager':
        return 'text-orange-600'
      case 'super_admin':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const driverCount = allUsers.filter((u) => u.role === 'driver').length
  const managerCount = allUsers.filter((u) => u.role === 'manager').length
  const superAdminCount = allUsers.filter((u) => u.role === 'super_admin').length

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 统计卡片 */}
          <View className="grid grid-cols-3 gap-3 mb-4">
            <View className="bg-white rounded-lg p-3 shadow">
              <Text className="text-xs text-gray-600 block mb-1">司机</Text>
              <Text className="text-2xl font-bold text-blue-900 block">{driverCount}</Text>
            </View>
            <View className="bg-white rounded-lg p-3 shadow">
              <Text className="text-xs text-gray-600 block mb-1">管理员</Text>
              <Text className="text-2xl font-bold text-orange-600 block">{managerCount}</Text>
            </View>
            <View className="bg-white rounded-lg p-3 shadow">
              <Text className="text-xs text-gray-600 block mb-1">超管</Text>
              <Text className="text-2xl font-bold text-red-600 block">{superAdminCount}</Text>
            </View>
          </View>

          {/* 用户列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">用户管理</Text>
            {allUsers.length === 0 ? (
              <View className="text-center py-8">
                <View className="i-mdi-account-off text-5xl text-gray-300 mx-auto mb-2" />
                <Text className="text-sm text-gray-400 block">暂无用户</Text>
              </View>
            ) : (
              <View>
                {allUsers.map((userItem) => (
                  <View key={userItem.id} className="mb-3 p-4 bg-gray-50 rounded-lg">
                    <View className="flex items-center justify-between mb-3">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-account-circle text-4xl text-blue-900 mr-3" />
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-800 block mb-1">
                            {userItem.name || '未设置姓名'}
                          </Text>
                          <Text className="text-xs text-gray-500 block">
                            {userItem.phone || userItem.email || '无联系方式'}
                          </Text>
                        </View>
                      </View>
                      <View className={`${getRoleBgColor(userItem.role)} px-2 py-1 rounded`}>
                        <Text className={`text-xs ${getRoleTextColor(userItem.role)}`}>
                          {getRoleText(userItem.role)}
                        </Text>
                      </View>
                    </View>

                    {userItem.id !== user?.id && (
                      <Button
                        className="w-full text-xs break-keep"
                        size="mini"
                        style={{
                          backgroundColor: '#1E3A8A',
                          color: 'white',
                          borderRadius: '6px',
                          border: 'none',
                          padding: '8px'
                        }}
                        onClick={() => handleChangeRole(userItem.id, userItem.role)}>
                        修改角色
                      </Button>
                    )}

                    {userItem.id === user?.id && (
                      <View className="bg-blue-50 p-2 rounded text-center">
                        <Text className="text-xs text-blue-900">当前用户</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 角色选择器 */}
      {rolePickerVisible && (
        <Picker
          mode="selector"
          range={roleOptions.map((r) => r.label)}
          onChange={handleRoleChange}
          onCancel={() => {
            setRolePickerVisible(false)
            setSelectedUser(null)
          }}>
          <View />
        </Picker>
      )}
    </View>
  )
}

export default AdminDashboard
