/**
 * 权限配置页面
 * 用于配置PEER_ADMIN、MANAGER和SCHEDULER的权限级别
 */

import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import type {PermissionLevel} from '@/db/api/permission-strategy'
import * as PermissionStrategyAPI from '@/db/api/permission-strategy'

const PermissionConfig: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const {userId, userName, userRole} = router.params

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 权限级别选项
  const permissionLevelOptions = [
    {label: '完整控制权', value: 'full_control'},
    {label: '仅查看权', value: 'view_only'}
  ]

  // 当前权限级别
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('full_control')
  const [permissionLevelIndex, setPermissionLevelIndex] = useState(0)

  // 备注
  const [notes, setNotes] = useState('')

  // 当前权限信息
  const [currentPermission, setCurrentPermission] = useState<any>(null)

  // 加载数据
  const loadData = useCallback(async () => {
    if (!userId || !userRole) return

    setLoading(true)
    try {
      let permissionInfo = null

      // 根据角色加载权限信息
      if (userRole === 'PEER_ADMIN') {
        permissionInfo = await PermissionStrategyAPI.getPeerAdminPermission(userId)
      } else if (userRole === 'MANAGER') {
        permissionInfo = await PermissionStrategyAPI.getManagerPermission(userId)
      } else if (userRole === 'SCHEDULER') {
        permissionInfo = await PermissionStrategyAPI.getSchedulerPermission(userId)
      }

      if (permissionInfo) {
        setCurrentPermission(permissionInfo)
        setPermissionLevel(permissionInfo.permission_level as PermissionLevel)
        setPermissionLevelIndex(
          permissionLevelOptions.findIndex((opt) => opt.value === permissionInfo.permission_level)
        )
        setNotes(permissionInfo.notes || '')
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [userId, userRole])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 权限级别选择
  const handlePermissionLevelChange = useCallback((e: {detail: {value: string | number}}) => {
    const index = typeof e.detail.value === 'string' ? Number.parseInt(e.detail.value, 10) : e.detail.value
    setPermissionLevelIndex(index)
    setPermissionLevel(permissionLevelOptions[index].value as PermissionLevel)
  }, [])

  // 保存配置
  const handleSave = useCallback(async () => {
    if (!userId || !user?.id || !userRole) return

    setSaving(true)
    Taro.showLoading({title: '保存中...'})
    try {
      let result

      // 根据角色调用不同的API
      if (userRole === 'PEER_ADMIN') {
        if (currentPermission) {
          // 更新权限
          result = await PermissionStrategyAPI.updatePeerAdminPermission(userId, permissionLevel, user.id, notes)
        } else {
          // 创建权限
          result = await PermissionStrategyAPI.createPeerAdmin(userId, permissionLevel, user.id, notes)
        }
      } else if (userRole === 'MANAGER') {
        if (currentPermission) {
          // 更新权限
          result = await PermissionStrategyAPI.updateManagerPermission(userId, permissionLevel, user.id, notes)
        } else {
          // 创建权限
          result = await PermissionStrategyAPI.createManager(userId, permissionLevel, user.id, notes)
        }
      } else if (userRole === 'SCHEDULER') {
        if (currentPermission) {
          // 更新权限
          result = await PermissionStrategyAPI.updateSchedulerPermission(userId, permissionLevel, user.id, notes)
        } else {
          // 创建权限
          result = await PermissionStrategyAPI.createScheduler(userId, permissionLevel, user.id, notes)
        }
      }

      if (result?.success) {
        Taro.showToast({title: '保存成功', icon: 'success'})
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        throw new Error(result?.message || '保存失败')
      }
    } catch (error: any) {
      console.error('保存失败:', error)
      Taro.showToast({
        title: error.message || '保存失败',
        icon: 'error',
        duration: 2000
      })
    } finally {
      setSaving(false)
      Taro.hideLoading()
    }
  }, [userId, user, userRole, permissionLevel, notes, currentPermission])

  // 删除权限
  const handleDelete = useCallback(async () => {
    if (!userId || !user?.id || !userRole || !currentPermission) return

    const result = await Taro.showModal({
      title: '确认删除',
      content: `确定要删除 ${decodeURIComponent(userName || '')} 的权限吗？删除后该用户将失去管理权限。`
    })

    if (!result.confirm) return

    Taro.showLoading({title: '删除中...'})
    try {
      let deleteResult

      // 根据角色调用不同的API
      if (userRole === 'PEER_ADMIN') {
        deleteResult = await PermissionStrategyAPI.removePeerAdmin(userId, user.id)
      } else if (userRole === 'MANAGER') {
        deleteResult = await PermissionStrategyAPI.removeManager(userId, user.id)
      } else if (userRole === 'SCHEDULER') {
        deleteResult = await PermissionStrategyAPI.removeScheduler(userId, user.id)
      }

      if (deleteResult?.success) {
        Taro.showToast({title: '删除成功', icon: 'success'})
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        throw new Error(deleteResult?.message || '删除失败')
      }
    } catch (error: any) {
      console.error('删除失败:', error)
      Taro.showToast({
        title: error.message || '删除失败',
        icon: 'error',
        duration: 2000
      })
    } finally {
      Taro.hideLoading()
    }
  }, [userId, user, userRole, userName, currentPermission])

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        {/* 页面标题 */}
        <View className="px-4 pt-6 pb-4">
          <Text className="text-2xl max-sm:text-xl font-bold text-gray-800">权限配置</Text>
          <Text className="text-sm text-gray-500 mt-1">
            为 {decodeURIComponent(userName || '')} 配置
            {userRole === 'PEER_ADMIN' ? '平级管理员' : userRole === 'MANAGER' ? '车队长' : '调度'}权限
          </Text>
        </View>

        {loading ? (
          <View className="text-center py-8">
            <Text className="text-gray-500">加载中...</Text>
          </View>
        ) : (
          <>
            {/* 当前权限信息 */}
            {currentPermission && (
              <View className="px-4 mb-4">
                <View className="bg-white rounded-lg p-4 shadow-sm">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-information text-xl text-blue-600 mr-2" />
                    <Text className="text-lg font-semibold text-gray-800">当前权限信息</Text>
                  </View>
                  <View className="space-y-2">
                    <View className="flex items-center">
                      <Text className="text-sm text-gray-500 w-24">权限级别：</Text>
                      <Text className="text-sm text-gray-800">
                        {currentPermission.permission_level === 'full_control' ? '完整控制权' : '仅查看权'}
                      </Text>
                    </View>
                    <View className="flex items-center">
                      <Text className="text-sm text-gray-500 w-24">授权时间：</Text>
                      <Text className="text-sm text-gray-800">
                        {new Date(currentPermission.granted_at).toLocaleString('zh-CN')}
                      </Text>
                    </View>
                    {currentPermission.granted_by_name && (
                      <View className="flex items-center">
                        <Text className="text-sm text-gray-500 w-24">授权人：</Text>
                        <Text className="text-sm text-gray-800">{currentPermission.granted_by_name}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* 权限级别选择 */}
            <View className="px-4 mb-4">
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-shield-account text-xl text-blue-600 mr-2" />
                  <Text className="text-lg font-semibold text-gray-800">权限级别</Text>
                </View>
                <Text className="text-sm text-gray-500 mb-3">选择该用户的权限级别</Text>

                <Picker
                  mode="selector"
                  range={permissionLevelOptions.map((opt) => opt.label)}
                  value={permissionLevelIndex}
                  onChange={handlePermissionLevelChange}>
                  <View className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    <Text className="text-base text-gray-800">
                      {permissionLevelOptions[permissionLevelIndex].label}
                    </Text>
                    <View className="i-mdi-chevron-down text-xl text-gray-400" />
                  </View>
                </Picker>

                {/* 权限说明 */}
                <View className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <Text className="text-sm text-blue-800 font-medium mb-2">权限说明：</Text>
                  {permissionLevel === 'full_control' ? (
                    <View>
                      <Text className="text-xs text-blue-700">• 可以查看所有数据</Text>
                      <Text className="text-xs text-blue-700">• 可以创建、编辑、删除数据</Text>
                      <Text className="text-xs text-blue-700">• 可以管理用户和权限</Text>
                      <Text className="text-xs text-blue-700">• 拥有完整的管理功能</Text>
                      {userRole === 'SCHEDULER' && (
                        <Text className="text-xs text-blue-700 font-semibold mt-1">
                          ⭐ 调度完整权限等同于老板权限，拥有全系统访问权限
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View>
                      <Text className="text-xs text-blue-700">• 可以查看所有数据</Text>
                      <Text className="text-xs text-blue-700">• 不能创建、编辑、删除数据</Text>
                      <Text className="text-xs text-blue-700">• 不能管理用户和权限</Text>
                      <Text className="text-xs text-blue-700">• 仅用于数据查看和统计</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* 备注 */}
            <View className="px-4 mb-4">
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-note-text text-xl text-blue-600 mr-2" />
                  <Text className="text-lg font-semibold text-gray-800">备注</Text>
                </View>
                <View style={{overflow: 'hidden'}}>
                  <Textarea
                    className="w-full p-3 bg-gray-50 rounded-lg text-sm"
                    placeholder="请输入备注信息（可选）"
                    value={notes}
                    onInput={(e) => setNotes(e.detail.value)}
                    maxlength={200}
                    style={{minHeight: '80px'}}
                  />
                </View>
                <Text className="text-xs text-gray-400 mt-2">{notes.length}/200</Text>
              </View>
            </View>

            {/* 操作按钮 */}
            <View className="px-4 pb-6">
              <Button
                size="default"
                className="w-full text-base break-keep mb-3"
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  borderRadius: '8px',
                  height: '48px',
                  lineHeight: '48px'
                }}
                onClick={handleSave}
                disabled={saving}>
                {currentPermission ? '更新权限' : '创建权限'}
              </Button>

              {currentPermission && (
                <Button
                  size="default"
                  className="w-full text-base break-keep"
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    borderRadius: '8px',
                    height: '48px',
                    lineHeight: '48px'
                  }}
                  onClick={handleDelete}>
                  删除权限
                </Button>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

export default PermissionConfig
