import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getAllUsers, updateUserRole} from '@/db/api'
import type {Profile, UserRole} from '@/db/types'
import {matchWithPinyin} from '@/utils/pinyin'

const UserManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [users, setUsers] = useState<Profile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [loading, setLoading] = useState(false)

  // 角色选择器选项
  const roleOptions = [
    {label: '全部角色', value: 'all'},
    {label: '超级管理员', value: 'super_admin'},
    {label: '管理员', value: 'manager'},
    {label: '司机', value: 'driver'}
  ]

  // 过滤用户
  const filterUsers = useCallback((userList: Profile[], keyword: string, role: 'all' | UserRole) => {
    let filtered = userList

    // 角色过滤
    if (role !== 'all') {
      filtered = filtered.filter((u) => u.role === role)
    }

    // 关键词过滤
    if (keyword.trim()) {
      filtered = filtered.filter((u) => {
        const name = u.name || ''
        const phone = u.phone || ''
        const email = u.email || ''
        return (
          matchWithPinyin(name, keyword) ||
          phone.toLowerCase().includes(keyword.toLowerCase()) ||
          email.toLowerCase().includes(keyword.toLowerCase())
        )
      })
    }

    setFilteredUsers(filtered)
  }, [])

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllUsers()
      setUsers(data)
      filterUsers(data, searchKeyword, roleFilter)
    } catch (error) {
      console.error('加载用户列表失败:', error)
      Taro.showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, roleFilter, filterUsers])

  // 搜索关键词变化
  const handleSearchChange = useCallback(
    (e: any) => {
      const keyword = e.detail.value
      setSearchKeyword(keyword)
      filterUsers(users, keyword, roleFilter)
    },
    [users, roleFilter, filterUsers]
  )

  // 角色筛选变化
  const handleRoleFilterChange = useCallback(
    (e: any) => {
      const selectedIndex = Number(e.detail.value)
      const role = roleOptions[selectedIndex].value as 'all' | UserRole
      setRoleFilter(role)
      filterUsers(users, searchKeyword, role)
    },
    [users, searchKeyword, filterUsers]
  )

  // 修改用户角色
  const handleChangeRole = useCallback(
    async (targetUser: Profile) => {
      // 不能修改超级管理员角色
      if (targetUser.role === 'super_admin') {
        Taro.showToast({
          title: '不可修改最高权限角色',
          icon: 'none'
        })
        return
      }

      // 确定目标角色和提示信息
      let targetRole: UserRole
      let confirmMessage: string

      if (targetUser.role === 'manager') {
        targetRole = 'driver'
        confirmMessage = `确认将管理员"${targetUser.name || targetUser.phone}"降级为司机吗？`
      } else {
        targetRole = 'manager'
        confirmMessage = `确认将司机"${targetUser.name || targetUser.phone}"升级为管理员吗？`
      }

      // 显示确认对话框
      const {confirm} = await Taro.showModal({
        title: '修改角色',
        content: confirmMessage
      })

      if (!confirm) return

      // 执行角色修改
      Taro.showLoading({title: '修改中...'})
      try {
        const success = await updateUserRole(targetUser.id, targetRole)
        if (success) {
          Taro.showToast({title: '修改成功', icon: 'success'})
          await loadUsers()
        } else {
          Taro.showToast({title: '修改失败', icon: 'error'})
        }
      } catch (error) {
        console.error('修改角色失败:', error)
        Taro.showToast({title: '修改失败', icon: 'error'})
      } finally {
        Taro.hideLoading()
      }
    },
    [loadUsers]
  )

  // 配置权限
  const handleConfigPermission = useCallback((targetUser: Profile) => {
    navigateTo({
      url: `/pages/super-admin/permission-config/index?userId=${targetUser.id}&userName=${encodeURIComponent(targetUser.name || targetUser.phone || '')}`
    })
  }, [])

  // 页面显示时加载数据
  useDidShow(() => {
    loadUsers()
  })

  // 获取角色显示文本
  const getRoleText = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return '超级管理员'
      case 'manager':
        return '管理员'
      case 'driver':
        return '司机'
      default:
        return role
    }
  }

  // 获取角色颜色
  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'text-red-600'
      case 'manager':
        return 'text-blue-600'
      case 'driver':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        {/* 页面标题 */}
        <View className="px-4 pt-6 pb-4">
          <Text className="text-2xl font-bold text-gray-800">用户管理</Text>
          <Text className="text-sm text-gray-500 mt-1">管理系统用户和角色权限</Text>
        </View>

        {/* 搜索和筛选 */}
        <View className="px-4 mb-4">
          <View className="bg-white rounded-lg p-4 shadow-sm">
            {/* 搜索框 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-600 mb-2">搜索用户</Text>
              <Input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="输入姓名、手机号或邮箱"
                value={searchKeyword}
                onInput={handleSearchChange}
              />
            </View>

            {/* 角色筛选 */}
            <View>
              <Text className="text-sm text-gray-600 mb-2">角色筛选</Text>
              <Picker mode="selector" range={roleOptions.map((o) => o.label)} onChange={handleRoleFilterChange}>
                <View className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg">
                  <Text className="text-gray-800">{roleOptions.find((o) => o.value === roleFilter)?.label}</Text>
                  <Text className="text-gray-400">▼</Text>
                </View>
              </Picker>
            </View>
          </View>
        </View>

        {/* 用户列表 */}
        <View className="px-4 pb-6">
          {loading ? (
            <View className="text-center py-8">
              <Text className="text-gray-500">加载中...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View className="text-center py-8">
              <Text className="text-gray-500">暂无用户数据</Text>
            </View>
          ) : (
            filteredUsers.map((u) => (
              <View key={u.id} className="bg-white rounded-lg p-4 mb-3 shadow-sm">
                {/* 用户基本信息 */}
                <View className="flex items-start justify-between mb-3">
                  <View className="flex-1">
                    <View className="flex items-center mb-1">
                      <Text className="text-lg font-semibold text-gray-800 mr-2">{u.name || '未设置姓名'}</Text>
                      <View className={`px-2 py-0.5 rounded ${getRoleColor(u.role)} bg-opacity-10`}>
                        <Text className={`text-xs ${getRoleColor(u.role)}`}>{getRoleText(u.role)}</Text>
                      </View>
                    </View>
                    {u.phone && (
                      <View className="mb-1">
                        <Text className="text-sm text-gray-600">手机：{u.phone}</Text>
                      </View>
                    )}
                    {u.email && (
                      <View>
                        <Text className="text-sm text-gray-600">邮箱：{u.email}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 操作按钮 */}
                <View className="flex gap-2">
                  {/* 修改角色按钮 */}
                  {u.role !== 'super_admin' && (
                    <Button
                      size="mini"
                      className="flex-1 text-sm"
                      style={{
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        borderRadius: '6px'
                      }}
                      onClick={() => handleChangeRole(u)}>
                      {u.role === 'manager' ? '降级为司机' : '升级为管理员'}
                    </Button>
                  )}

                  {/* 配置权限按钮（仅管理员） */}
                  {u.role === 'manager' && (
                    <Button
                      size="mini"
                      className="flex-1 text-sm"
                      style={{
                        backgroundColor: '#f97316',
                        color: '#fff',
                        borderRadius: '6px'
                      }}
                      onClick={() => handleConfigPermission(u)}>
                      配置权限
                    </Button>
                  )}

                  {/* 超级管理员提示 */}
                  {u.role === 'super_admin' && (
                    <View className="flex-1 px-3 py-1 bg-gray-100 rounded-lg">
                      <Text className="text-xs text-gray-500 text-center">最高权限，不可修改</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default UserManagement
