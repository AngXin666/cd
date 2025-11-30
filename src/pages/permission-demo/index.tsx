/**
 * 权限系统演示页面
 * 展示如何使用权限管理功能
 */

import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {PermissionGuard} from '@/components/PermissionGuard'
import {usePermission} from '@/contexts/PermissionContext'
import {getAllPermissions, getAllRoles, getRolePermissions} from '@/db/permission-api'
import type {Permission, Role} from '@/db/types/permission'
import {PermissionCode} from '@/db/types/permission'

export default function PermissionDemo() {
  const {permissions, isLoading, isLoaded, hasPermission, refreshPermissions} = usePermission()
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [rolePermissions, setRolePermissions] = useState<string[]>([])

  /**
   * 加载角色和权限数据
   */
  const loadData = useCallback(async () => {
    const [rolesData, permissionsData] = await Promise.all([getAllRoles(), getAllPermissions()])
    setRoles(rolesData)
    setAllPermissions(permissionsData)
  }, [])

  /**
   * 加载指定角色的权限
   */
  const loadRolePermissions = useCallback(async (roleId: string) => {
    const perms = await getRolePermissions(roleId)
    setRolePermissions(perms)
  }, [])

  /**
   * 处理角色选择
   */
  const handleRoleSelect = useCallback(
    (roleId: string) => {
      setSelectedRole(roleId)
      loadRolePermissions(roleId)
    },
    [loadRolePermissions]
  )

  /**
   * 刷新权限
   */
  const handleRefresh = useCallback(async () => {
    Taro.showLoading({title: '刷新中...'})
    await refreshPermissions()
    Taro.hideLoading()
    Taro.showToast({title: '刷新成功', icon: 'success'})
  }, [refreshPermissions])

  /**
   * 测试权限检查
   */
  const testPermission = useCallback(
    (permissionCode: string) => {
      const result = hasPermission(permissionCode)
      Taro.showToast({
        title: result ? '有权限' : '无权限',
        icon: result ? 'success' : 'none'
      })
    },
    [hasPermission]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <View className="min-h-screen bg-background">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4 space-y-4">
          {/* 权限状态 */}
          <View className="bg-card rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-foreground mb-2">权限状态</Text>
            <View className="space-y-2">
              <View className="flex flex-row items-center justify-between">
                <Text className="text-muted-foreground">加载状态:</Text>
                <Text className="text-foreground">{isLoading ? '加载中...' : isLoaded ? '已加载' : '未加载'}</Text>
              </View>
              <View className="flex flex-row items-center justify-between">
                <Text className="text-muted-foreground">权限数量:</Text>
                <Text className="text-foreground">{permissions.size}</Text>
              </View>
            </View>
            <Button className="mt-4 bg-primary text-primary-foreground py-2 rounded break-keep text-base" size="default" onClick={handleRefresh}>
              刷新权限
            </Button>
          </View>

          {/* 当前用户权限列表 */}
          <View className="bg-card rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-foreground mb-2">我的权限</Text>
            {permissions.size > 0 ? (
              <View className="space-y-1">
                {Array.from(permissions).map(perm => (
                  <View key={perm} className="flex flex-row items-center py-1">
                    <View className="w-2 h-2 rounded-full bg-primary mr-2" />
                    <Text className="text-sm text-foreground">{perm}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-muted-foreground">暂无权限</Text>
            )}
          </View>

          {/* 权限测试 */}
          <View className="bg-card rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-foreground mb-2">权限测试</Text>
            <View className="space-y-2">
              <Button
                className="bg-secondary text-secondary-foreground py-2 rounded break-keep text-base"
                size="default"
                onClick={() => testPermission(PermissionCode.DRIVER_VIEW)}
              >
                测试: 查看司机
              </Button>
              <Button
                className="bg-secondary text-secondary-foreground py-2 rounded break-keep text-base"
                size="default"
                onClick={() => testPermission(PermissionCode.DRIVER_MANAGE)}
              >
                测试: 管理司机
              </Button>
              <Button
                className="bg-secondary text-secondary-foreground py-2 rounded break-keep text-base"
                size="default"
                onClick={() => testPermission(PermissionCode.PIECEWORK_APPROVE)}
              >
                测试: 审核计件
              </Button>
            </View>
          </View>

          {/* 权限守卫演示 */}
          <View className="bg-card rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-foreground mb-2">权限守卫演示</Text>
            <View className="space-y-2">
              <PermissionGuard permissions={PermissionCode.DRIVER_MANAGE}>
                <View className="bg-green-100 p-3 rounded">
                  <Text className="text-green-800">✓ 您有"管理司机"权限</Text>
                </View>
              </PermissionGuard>

              <PermissionGuard
                permissions={PermissionCode.DRIVER_MANAGE}
                fallback={
                  <View className="bg-red-100 p-3 rounded">
                    <Text className="text-red-800">✗ 您没有"管理司机"权限</Text>
                  </View>
                }
              >
                <View className="bg-green-100 p-3 rounded">
                  <Text className="text-green-800">✓ 您有"管理司机"权限</Text>
                </View>
              </PermissionGuard>

              <PermissionGuard permissions={[PermissionCode.DRIVER_MANAGE, PermissionCode.VEHICLE_MANAGE]}>
                <View className="bg-green-100 p-3 rounded">
                  <Text className="text-green-800">✓ 您有"管理司机"或"管理车辆"权限</Text>
                </View>
              </PermissionGuard>

              <PermissionGuard permissions={[PermissionCode.DRIVER_MANAGE, PermissionCode.VEHICLE_MANAGE]} requireAll>
                <View className="bg-green-100 p-3 rounded">
                  <Text className="text-green-800">✓ 您同时拥有"管理司机"和"管理车辆"权限</Text>
                </View>
              </PermissionGuard>
            </View>
          </View>

          {/* 角色权限查询 */}
          <View className="bg-card rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-foreground mb-2">角色权限查询</Text>
            <View className="space-y-2">
              {roles.map(role => (
                <Button
                  key={role.id}
                  className={`py-2 rounded break-keep text-base ${selectedRole === role.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                  size="default"
                  onClick={() => handleRoleSelect(role.id)}
                >
                  {role.name}
                </Button>
              ))}
            </View>

            {selectedRole && (
              <View className="mt-4 p-3 bg-muted rounded">
                <Text className="text-sm font-bold text-foreground mb-2">
                  {roles.find(r => r.id === selectedRole)?.name} 的权限:
                </Text>
                <View className="space-y-1">
                  {rolePermissions.map(perm => (
                    <View key={perm} className="flex flex-row items-center py-1">
                      <View className="w-2 h-2 rounded-full bg-primary mr-2" />
                      <Text className="text-xs text-foreground">{perm}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 所有权限列表 */}
          <View className="bg-card rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-foreground mb-2">系统权限列表</Text>
            {allPermissions.length > 0 ? (
              <View className="space-y-3">
                {Object.entries(
                  allPermissions.reduce(
                    (acc, perm) => {
                      if (!acc[perm.module]) {
                        acc[perm.module] = []
                      }
                      acc[perm.module].push(perm)
                      return acc
                    },
                    {} as Record<string, Permission[]>
                  )
                ).map(([module, perms]) => (
                  <View key={module} className="p-3 bg-muted rounded">
                    <Text className="text-sm font-bold text-foreground mb-2">{module} 模块</Text>
                    <View className="space-y-1">
                      {perms.map(perm => (
                        <View key={perm.id} className="flex flex-row items-start py-1">
                          <View className="w-2 h-2 rounded-full bg-primary mr-2 mt-1" />
                          <View className="flex-1">
                            <Text className="text-xs font-medium text-foreground">{perm.name}</Text>
                            <Text className="text-xs text-muted-foreground">{perm.id}</Text>
                            {perm.description && <Text className="text-xs text-muted-foreground">{perm.description}</Text>}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-muted-foreground">暂无权限数据</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
