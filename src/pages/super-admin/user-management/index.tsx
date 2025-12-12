/**
 * 老板端 - 用户管理页面（重构版）
 * 功能：管理所有用户（司机、车队长、老板）
 * 重构：使用Hooks和组件化架构
 * 代码量：从1664行减少到140行
 */

import {ScrollView, View} from '@tarojs/components'
import {usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import AddUserModal from './components/AddUserModal'
import UserFilter from './components/UserFilter'
import UserList from './components/UserList'
// 导入组件
import UserTabs from './components/UserTabs'
import WarehouseAssign from './components/WarehouseAssign'
import {useUserFilter} from './hooks/useUserFilter'
// 导入Hooks
import {useUserManagement} from './hooks/useUserManagement'
import {useWarehouseAssign} from './hooks/useWarehouseAssign'

const UserManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [activeTab, setActiveTab] = useState<'DRIVER' | 'MANAGER'>('MANAGER')
  const [showAddUser, setShowAddUser] = useState(false)
  const [warehouseAssignUser, setWarehouseAssignUser] = useState<any>(null)

  // 使用用户管理Hook
  const {users, loading, currentUserProfile, loadUsers, addUser, toggleUserType} = useUserManagement()

  // 使用筛选Hook
  const {filteredUsers, searchKeyword, roleFilter, setSearchKeyword, setRoleFilter} = useUserFilter({
    users,
    initialRole: activeTab === 'DRIVER' ? 'DRIVER' : 'MANAGER',
    currentUserProfile,
    currentUserId: user?.id
  })

  // 使用仓库分配Hook
  const {warehouses, selectedIds, setSelectedIds, loadUserWarehouses, saveAssignment} = useWarehouseAssign()

  // 下拉刷新
  usePullDownRefresh(async () => {
    await loadUsers(true)
  })

  // 标签页切换
  const handleTabChange = (tab: 'DRIVER' | 'MANAGER') => {
    setActiveTab(tab)
    setRoleFilter(tab === 'DRIVER' ? 'DRIVER' : 'MANAGER')
    setWarehouseAssignUser(null)
  }

  // 打开仓库分配
  const handleOpenWarehouseAssign = async (targetUser: any) => {
    setWarehouseAssignUser(targetUser)
    await loadUserWarehouses(targetUser.id, targetUser.role)
  }

  // 保存仓库分配
  const handleSaveWarehouseAssignment = async () => {
    if (!warehouseAssignUser) return

    const success = await saveAssignment(
      warehouseAssignUser.id,
      warehouseAssignUser.role,
      warehouseAssignUser.real_name || warehouseAssignUser.name
    )

    if (success) {
      setWarehouseAssignUser(null)
      await loadUsers(true)
    }
  }

  // 添加用户
  const handleAddUser = async (data: any) => {
    await addUser(data)
    setShowAddUser(false)
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 标签页 */}
      <UserTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 筛选栏 */}
      <UserFilter
        searchKeyword={searchKeyword}
        onSearchChange={setSearchKeyword}
        onAddUser={() => setShowAddUser(true)}
        onRefresh={() => loadUsers(true)}
      />

      {/* 用户列表 */}
      <ScrollView scrollY className="flex-1">
        {warehouseAssignUser ? (
          // 仓库分配界面
          <View className="p-4">
            <WarehouseAssign
              user={warehouseAssignUser}
              warehouses={warehouses}
              selectedIds={selectedIds}
              onSelectedChange={setSelectedIds}
              onSave={handleSaveWarehouseAssignment}
              onCancel={() => setWarehouseAssignUser(null)}
            />
          </View>
        ) : (
          // 用户列表
          <UserList
            users={filteredUsers}
            loading={loading}
            onWarehouseAssign={handleOpenWarehouseAssign}
            onToggleUserType={toggleUserType}
          />
        )}
      </ScrollView>

      {/* 添加用户弹窗 */}
      <AddUserModal
        visible={showAddUser}
        warehouses={warehouses}
        onClose={() => setShowAddUser(false)}
        onSubmit={handleAddUser}
      />
    </View>
  )
}

export default UserManagement
