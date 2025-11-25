import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import {navigateBack, showModal, showToast, useDidShow} from '@tarojs/taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getAllUsers, updateProfile} from '@/db/api'
import type {Profile, UserRole} from '@/db/types'
import {useAdminAuth} from '@/hooks/useAdminAuth'

/**
 * 用户管理页面（电脑端）
 * 仅允许管理员和超级管理员访问
 */
const UserManagement: React.FC = () => {
  const {isAuthorized, isLoading} = useAdminAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('driver')

  // 过滤用户
  const filterUsers = useCallback((userList: Profile[], keyword: string, role: 'all' | UserRole) => {
    let filtered = userList

    // 角色过滤
    if (role !== 'all') {
      filtered = filtered.filter((u) => u.role === role)
    }

    // 关键词过滤
    if (keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(lowerKeyword) ||
          u.phone?.toLowerCase().includes(lowerKeyword) ||
          u.email?.toLowerCase().includes(lowerKeyword)
      )
    }

    setFilteredUsers(filtered)
  }, [])

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    const data = await getAllUsers()
    setUsers(data)
    filterUsers(data, searchKeyword, roleFilter)
  }, [searchKeyword, roleFilter, filterUsers])

  useDidShow(() => {
    loadUsers()
  })

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchKeyword(value)
    filterUsers(users, value, roleFilter)
  }

  // 角色过滤处理
  const handleRoleFilter = (role: 'all' | UserRole) => {
    setRoleFilter(role)
    filterUsers(users, searchKeyword, role)
  }

  // 打开编辑模态框
  const handleEdit = (user: Profile) => {
    setEditingUser(user)
    setEditRole(user.role)
    setShowEditModal(true)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingUser) return

    try {
      await updateProfile(editingUser.id, {role: editRole})
      showToast({title: '更新成功', icon: 'success'})
      setShowEditModal(false)
      loadUsers()
    } catch (_error) {
      showToast({title: '更新失败', icon: 'error'})
    }
  }

  // 删除用户（实际上是禁用）
  const _handleDelete = async (user: Profile) => {
    const res = await showModal({
      title: '确认操作',
      content: `确定要禁用用户"${user.name || user.phone}"吗？`
    })

    if (res.confirm) {
      showToast({title: '功能开发中', icon: 'none'})
    }
  }

  // 角色显示名称
  const getRoleName = (role: UserRole) => {
    const roleMap = {
      driver: '司机',
      manager: '车队长',
      super_admin: '老板'
    }
    return roleMap[role] || role
  }

  // 角色颜色
  const getRoleColor = (role: UserRole) => {
    const colorMap = {
      driver: 'bg-blue-100 text-blue-700',
      manager: 'bg-green-100 text-green-700',
      super_admin: 'bg-purple-100 text-purple-700'
    }
    return colorMap[role] || 'bg-gray-100 text-gray-700'
  }

  // 如果正在加载或未授权，显示提示
  if (isLoading || !isAuthorized) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <View className="text-center">
          <View className="i-mdi-shield-lock text-6xl text-gray-400 mb-4" />
          <Text className="text-xl text-gray-600">正在验证权限...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <View className="bg-white shadow-sm border-b border-gray-200">
        <View className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <View className="flex items-center justify-between mb-4">
            <View className="flex items-center">
              <View
                onClick={() => navigateBack()}
                className="i-mdi-arrow-left text-2xl text-gray-600 mr-3 cursor-pointer hover:text-primary"
              />
              <Text className="text-xl font-bold text-gray-800">用户管理</Text>
            </View>
          </View>

          {/* 搜索和过滤 */}
          <View className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <View className="flex-1">
              <View style={{overflow: 'hidden'}}>
                <Input
                  value={searchKeyword}
                  onInput={(e) => handleSearch(e.detail.value)}
                  placeholder="搜索用户名、手机号、邮箱"
                  className="w-full border border-gray-300 rounded px-4 py-2 text-sm"
                />
              </View>
            </View>

            {/* 角色过滤 */}
            <View className="flex gap-2">
              <View
                onClick={() => handleRoleFilter('all')}
                className={`px-4 py-2 rounded cursor-pointer transition-all ${
                  roleFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                <Text className="text-sm">全部</Text>
              </View>
              <View
                onClick={() => handleRoleFilter('driver')}
                className={`px-4 py-2 rounded cursor-pointer transition-all ${
                  roleFilter === 'driver'
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                <Text className="text-sm">司机</Text>
              </View>
              <View
                onClick={() => handleRoleFilter('manager')}
                className={`px-4 py-2 rounded cursor-pointer transition-all ${
                  roleFilter === 'manager'
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                <Text className="text-sm">车队长</Text>
              </View>
              <View
                onClick={() => handleRoleFilter('super_admin')}
                className={`px-4 py-2 rounded cursor-pointer transition-all ${
                  roleFilter === 'super_admin'
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                <Text className="text-sm">老板</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 主内容区域 */}
      <ScrollView scrollY className="h-screen box-border">
        <View className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          {/* 用户列表 */}
          <View className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 表格头部 */}
            <View className="hidden md:grid md:grid-cols-12 gap-4 bg-gray-50 px-6 py-3 border-b border-gray-200">
              <Text className="col-span-2 text-sm font-semibold text-gray-700">用户名</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">手机号</Text>
              <Text className="col-span-3 text-sm font-semibold text-gray-700">邮箱</Text>
              <Text className="col-span-1 text-sm font-semibold text-gray-700">角色</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">注册时间</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700 text-center">操作</Text>
            </View>

            {/* 表格内容 */}
            {filteredUsers.length === 0 ? (
              <View className="py-12 text-center">
                <View className="i-mdi-account-off text-6xl text-gray-300 mb-4" />
                <Text className="text-gray-500">暂无用户数据</Text>
              </View>
            ) : (
              filteredUsers.map((user) => (
                <View
                  key={user.id}
                  className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                  {/* 电脑端表格行 */}
                  <View className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                    <Text className="col-span-2 text-sm text-gray-800 font-medium">{user.name || '-'}</Text>
                    <Text className="col-span-2 text-sm text-gray-600">{user.phone || '-'}</Text>
                    <Text className="col-span-3 text-sm text-gray-600">{user.email || '-'}</Text>
                    <View className="col-span-1">
                      <View className={`inline-block px-2 py-1 rounded text-xs ${getRoleColor(user.role)}`}>
                        <Text>{getRoleName(user.role)}</Text>
                      </View>
                    </View>
                    <Text className="col-span-2 text-sm text-gray-600">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </Text>
                    <View className="col-span-2 flex items-center justify-center gap-2">
                      <Button
                        onClick={() => handleEdit(user)}
                        className="bg-blue-500 text-white px-4 py-1 rounded break-keep text-xs"
                        size="mini">
                        编辑角色
                      </Button>
                    </View>
                  </View>

                  {/* 移动端卡片 */}
                  <View className="md:hidden p-4">
                    <View className="flex items-center justify-between mb-2">
                      <Text className="text-base font-bold text-gray-800">{user.name || user.phone}</Text>
                      <View className={`px-2 py-1 rounded text-xs ${getRoleColor(user.role)}`}>
                        <Text>{getRoleName(user.role)}</Text>
                      </View>
                    </View>
                    {user.phone && <Text className="text-sm text-gray-600 mb-1">手机：{user.phone}</Text>}
                    {user.email && <Text className="text-sm text-gray-600 mb-3">邮箱：{user.email}</Text>}
                    <View className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(user)}
                        className="flex-1 bg-blue-500 text-white py-2 rounded break-keep text-xs"
                        size="mini">
                        编辑角色
                      </Button>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* 编辑角色模态框 */}
      {showEditModal && editingUser && (
        <View className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <View className="bg-white rounded-lg shadow-xl w-11/12 max-w-md">
            {/* 模态框头部 */}
            <View className="bg-primary text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
              <Text className="text-lg font-bold">编辑用户角色</Text>
              <View
                onClick={() => setShowEditModal(false)}
                className="i-mdi-close text-2xl cursor-pointer hover:bg-white hover:bg-opacity-20 rounded p-1"
              />
            </View>

            {/* 模态框内容 */}
            <View className="p-6">
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">用户信息</Text>
                <Text className="text-base font-medium text-gray-800">{editingUser.name || editingUser.phone}</Text>
              </View>

              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-3">选择角色</Text>
                <View className="space-y-2">
                  <View
                    onClick={() => setEditRole('driver')}
                    className={`p-3 rounded border-2 cursor-pointer transition-all ${
                      editRole === 'driver' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <Text className="text-sm font-medium text-gray-800">司机</Text>
                  </View>
                  <View
                    onClick={() => setEditRole('manager')}
                    className={`p-3 rounded border-2 cursor-pointer transition-all ${
                      editRole === 'manager' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <Text className="text-sm font-medium text-gray-800">车队长</Text>
                  </View>
                  <View
                    onClick={() => setEditRole('super_admin')}
                    className={`p-3 rounded border-2 cursor-pointer transition-all ${
                      editRole === 'super_admin' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <Text className="text-sm font-medium text-gray-800">老板</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 模态框底部按钮 */}
            <View className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <Button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded break-keep text-sm"
                size="default">
                取消
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="flex-1 bg-primary text-white py-3 rounded break-keep text-sm"
                size="default">
                保存
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default UserManagement
