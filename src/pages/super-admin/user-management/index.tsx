import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getAllUsers, resetUserPassword, updateUserRole} from '@/db/api'
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

  // 编辑用户信息
  const handleEditUser = useCallback((targetUser: Profile) => {
    navigateTo({
      url: `/pages/super-admin/edit-user/index?userId=${targetUser.id}`
    })
  }, [])

  // 重置密码
  const handleResetPassword = useCallback(async (targetUser: Profile) => {
    console.log('=== 用户管理页面：开始重置密码流程 ===')
    console.log('目标用户:', targetUser)

    const {confirm} = await Taro.showModal({
      title: '重置密码',
      content: `确认将用户"${targetUser.name || targetUser.phone}"的密码重置为 123456 吗？`
    })

    if (!confirm) {
      console.log('用户取消了重置密码操作')
      return
    }

    Taro.showLoading({title: '重置中...'})
    try {
      console.log('调用 resetUserPassword 函数...')
      const result = await resetUserPassword(targetUser.id)
      console.log('resetUserPassword 返回结果:', result)

      if (result.success) {
        console.log('✅ 密码重置成功')
        Taro.showToast({title: '密码已重置为 123456', icon: 'success', duration: 3000})
      } else {
        console.error('❌ 密码重置失败:', result.error)
        // 显示详细的错误信息
        const errorMessage = result.error || '重置失败，原因未知'
        Taro.showModal({
          title: '重置失败',
          content: errorMessage,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    } catch (error) {
      console.error('❌ 重置密码异常:', error)
      console.error('异常详情:', JSON.stringify(error, null, 2))

      // 显示异常信息
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      Taro.showModal({
        title: '重置失败',
        content: `发生异常: ${errorMessage}`,
        showCancel: false,
        confirmText: '知道了'
      })
    } finally {
      Taro.hideLoading()
    }
  }, [])

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

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadUsers()])
    Taro.stopPullDownRefresh()
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

  // 获取司机类型
  const getDriverType = (user: Profile) => {
    if (user.role !== 'driver') return null
    return user.vehicle_plate ? '带车司机' : '纯司机'
  }

  // 计算在职天数
  const getWorkDays = (joinDate: string | null) => {
    if (!joinDate) return null
    const join = new Date(joinDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - join.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置'
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
              <View key={u.id} className="bg-white rounded-xl p-3 mb-3 shadow-sm">
                {/* 用户基本信息 */}
                <View className="flex items-center justify-between mb-2">
                  <View className="flex items-center">
                    <Text className="text-base font-semibold text-gray-800 mr-2">{u.name || '未设置姓名'}</Text>
                    <View className={`px-2 py-0.5 rounded ${getRoleColor(u.role)} bg-opacity-10`}>
                      <Text className={`text-xs ${getRoleColor(u.role)}`}>{getRoleText(u.role)}</Text>
                    </View>
                    {getDriverType(u) && (
                      <View className="ml-2 px-2 py-0.5 rounded bg-purple-50">
                        <Text className="text-xs text-purple-600">{getDriverType(u)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 详细信息 - 网格布局 */}
                <View className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                  {/* 电话号码 */}
                  <View className="flex items-center">
                    <View className="i-mdi-phone text-sm text-gray-400 mr-1" />
                    <Text className="text-xs text-gray-600">{u.phone || '未设置'}</Text>
                  </View>

                  {/* 登录账号 */}
                  <View className="flex items-center">
                    <View className="i-mdi-account text-sm text-gray-400 mr-1" />
                    <Text className="text-xs text-gray-600">{u.login_account || '未设置'}</Text>
                  </View>

                  {/* 车牌号码 */}
                  {u.role === 'driver' && (
                    <View className="flex items-center">
                      <View className="i-mdi-car text-sm text-gray-400 mr-1" />
                      <Text className="text-xs text-gray-600">{u.vehicle_plate || '无车辆'}</Text>
                    </View>
                  )}

                  {/* 入职时间 */}
                  {u.role === 'driver' && (
                    <View className="flex items-center">
                      <View className="i-mdi-calendar text-sm text-gray-400 mr-1" />
                      <Text className="text-xs text-gray-600">{formatDate(u.join_date)}</Text>
                    </View>
                  )}

                  {/* 在职天数 */}
                  {u.role === 'driver' && getWorkDays(u.join_date) !== null && (
                    <View className="flex items-center">
                      <View className="i-mdi-clock-outline text-sm text-gray-400 mr-1" />
                      <Text className="text-xs text-gray-600">在职 {getWorkDays(u.join_date)} 天</Text>
                    </View>
                  )}
                </View>

                {/* 操作按钮 - 更小更紧凑 */}
                <View className="flex flex-wrap gap-1.5">
                  {/* 编辑按钮 */}
                  <Button
                    size="mini"
                    className="text-xs break-keep"
                    style={{
                      backgroundColor: '#10b981',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      height: '28px',
                      lineHeight: '20px',
                      fontSize: '11px'
                    }}
                    onClick={() => handleEditUser(u)}>
                    编辑
                  </Button>

                  {/* 重置密码按钮 */}
                  <Button
                    size="mini"
                    className="text-xs break-keep"
                    style={{
                      backgroundColor: '#f59e0b',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      height: '28px',
                      lineHeight: '20px',
                      fontSize: '11px'
                    }}
                    onClick={() => handleResetPassword(u)}>
                    重置密码
                  </Button>

                  {/* 修改角色按钮 */}
                  {u.role !== 'super_admin' && (
                    <Button
                      size="mini"
                      className="text-xs break-keep"
                      style={{
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        height: '28px',
                        lineHeight: '20px',
                        fontSize: '11px'
                      }}
                      onClick={() => handleChangeRole(u)}>
                      {u.role === 'manager' ? '降级' : '升级'}
                    </Button>
                  )}

                  {/* 配置权限按钮（仅管理员） */}
                  {u.role === 'manager' && (
                    <Button
                      size="mini"
                      className="text-xs break-keep"
                      style={{
                        backgroundColor: '#f97316',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        height: '28px',
                        lineHeight: '20px',
                        fontSize: '11px'
                      }}
                      onClick={() => handleConfigPermission(u)}>
                      权限
                    </Button>
                  )}

                  {/* 超级管理员提示 */}
                  {u.role === 'super_admin' && (
                    <View className="px-2 py-1 bg-gray-100 rounded">
                      <Text className="text-xs text-gray-500">最高权限</Text>
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
