/**
 * 权限配置页面
 * 用于配置PEER_ADMIN、MANAGER和SCHEDULER的权限级别
 * 
 * 使用应用层权限控制，基于用户角色和 manager_permissions_enabled 字段推断权限级别
 * 权限级别：full_control（完整控制权）、view_only（仅查看权）
 * 
 * @module pages/super-admin/permission-config
 */

import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {hideLoading, showLoading, showToast} from '@/utils/taroCompat'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import SafeAreaTop from '@/components/SafeAreaTop'
import TopNavBar from '@/components/TopNavBar'
import {supabase} from '@/db/supabase'
import {inferPermissionLevel, type PermissionLevel} from '@/utils/permissionInference'
import type {UserRole} from '@/db/types'

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

  // 标记字段是否存在，用于在保存时显示提示
  const [fieldExists, setFieldExists] = useState(true)

  /**
   * 加载用户权限数据
   * 从 users 表查询 role 和 manager_permissions_enabled 字段
   * 基于这两个字段推断当前权限级别
   * 
   * 如果 manager_permissions_enabled 字段不存在，使用默认值（true = full_control）
   * 
   * Requirements: 1.1, 1.2
   */
  const loadData = useCallback(async () => {
    if (!userId || !userRole) return

    setLoading(true)
    try {
      // 先尝试查询包含 manager_permissions_enabled 字段
      const {data, error} = await supabase
        .from('users')
        .select('id, name, role, manager_permissions_enabled, updated_at')
        .eq('id', userId)
        .maybeSingle()

      // 如果字段不存在（错误码 42703），使用备用查询
      if (error && error.code === '42703') {
        console.warn('manager_permissions_enabled 字段不存在，使用默认值')
        setFieldExists(false)
        
        // 备用查询：不包含 manager_permissions_enabled 字段
        const {data: fallbackData, error: fallbackError} = await supabase
          .from('users')
          .select('id, name, role, updated_at')
          .eq('id', userId)
          .maybeSingle()

        if (fallbackError) {
          console.error('加载权限信息失败:', fallbackError)
          showToast({title: '加载失败', icon: 'error'})
          return
        }

        if (fallbackData) {
          // 字段不存在时，默认为完整权限
          const level: PermissionLevel = inferPermissionLevel(
            fallbackData.role as UserRole,
            true // 默认为 true（完整权限）
          )
          
          setCurrentPermission({
            user_id: fallbackData.id,
            user_name: fallbackData.name,
            permission_level: level,
            granted_at: fallbackData.updated_at || new Date().toISOString()
          })
          setPermissionLevel(level)
          setPermissionLevelIndex(permissionLevelOptions.findIndex((opt) => opt.value === level))
        }
        return
      }

      if (error) {
        console.error('加载权限信息失败:', error)
        showToast({title: '加载失败', icon: 'error'})
        return
      }

      if (data) {
        setFieldExists(true)
        // 基于 role 和 manager_permissions_enabled 推断权限级别
        const level: PermissionLevel = inferPermissionLevel(
          data.role as UserRole,
          data.manager_permissions_enabled
        )
        
        setCurrentPermission({
          user_id: data.id,
          user_name: data.name,
          permission_level: level,
          granted_at: data.updated_at || new Date().toISOString()
        })
        setPermissionLevel(level)
        setPermissionLevelIndex(permissionLevelOptions.findIndex((opt) => opt.value === level))
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      showToast({title: '加载失败', icon: 'error'})
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

  /**
   * 保存权限配置
   * 更新 manager_permissions_enabled 字段来控制权限级别
   * - full_control → manager_permissions_enabled = true
   * - view_only → manager_permissions_enabled = false
   * 
   * 如果字段不存在，会显示明确的错误提示并引导用户执行数据库迁移
   * 
   * Requirements: 1.3, 3.3
   */
  const handleSave = useCallback(async () => {
    if (!userId || !user?.id || !userRole) return

    setSaving(true)
    showLoading({title: '保存中...'})
    try {
      // 将权限级别映射到 manager_permissions_enabled 字段
      // full_control → true, view_only → false
      const managerPermissionsEnabled = permissionLevel === 'full_control'

      // 先检查字段是否存在（通过查询验证）
      const {error: checkError} = await supabase
        .from('users')
        .select('manager_permissions_enabled')
        .eq('id', userId)
        .maybeSingle()

      // 如果查询出错且错误码是 42703（字段不存在），提示用户
      if (checkError && (checkError.code === '42703' || checkError.message?.includes('manager_permissions_enabled'))) {
        console.error('字段不存在:', checkError)
        hideLoading()
        setSaving(false)
        // 显示详细的错误提示，包含解决方案
        Taro.showModal({
          title: '功能暂不可用',
          content: '权限配置功能需要数据库升级。请在 Supabase Dashboard 的 SQL Editor 中执行迁移脚本：supabase/migrations/00628_add_manager_permissions_enabled_field.sql',
          showCancel: false,
          confirmText: '知道了'
        })
        return
      }

      // 直接更新 users 表的 manager_permissions_enabled 字段
      const {error: updateError} = await supabase
        .from('users')
        .update({
          manager_permissions_enabled: managerPermissionsEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        // 检查是否是字段不存在的错误
        if (updateError.code === '42703' || updateError.message?.includes('manager_permissions_enabled')) {
          console.error('更新时字段不存在:', updateError)
          hideLoading()
          setSaving(false)
          Taro.showModal({
            title: '功能暂不可用',
            content: '权限配置功能需要数据库升级。请在 Supabase Dashboard 的 SQL Editor 中执行迁移脚本。',
            showCancel: false,
            confirmText: '知道了'
          })
          return
        }
        console.error('更新权限失败:', updateError)
        throw new Error(updateError.message || '保存失败')
      }

      // 验证更新是否生效
      const {data: verifyData, error: verifyError} = await supabase
        .from('users')
        .select('manager_permissions_enabled')
        .eq('id', userId)
        .maybeSingle()

      if (verifyError) {
        // 如果验证查询也报字段不存在，说明更新被静默忽略了
        if (verifyError.code === '42703') {
          console.error('验证时字段不存在:', verifyError)
          hideLoading()
          setSaving(false)
          Taro.showModal({
            title: '功能暂不可用',
            content: '权限配置功能需要数据库升级。请在 Supabase Dashboard 的 SQL Editor 中执行迁移脚本。',
            showCancel: false,
            confirmText: '知道了'
          })
          return
        }
        console.error('验证失败:', verifyError)
        throw new Error('验证更新失败，请重试')
      }

      // 检查值是否正确更新
      if (verifyData?.manager_permissions_enabled !== managerPermissionsEnabled) {
        console.warn('更新可能未生效，期望:', managerPermissionsEnabled, '实际:', verifyData?.manager_permissions_enabled)
        // 如果值没有变化，可能是字段不存在（Supabase 静默忽略不存在的字段）
        if (verifyData?.manager_permissions_enabled === undefined || verifyData?.manager_permissions_enabled === null) {
          hideLoading()
          setSaving(false)
          Taro.showModal({
            title: '功能暂不可用',
            content: '权限配置功能需要数据库升级。数据库中缺少 manager_permissions_enabled 字段，请联系管理员执行迁移脚本。',
            showCancel: false,
            confirmText: '知道了'
          })
          return
        }
      }

      // 更新成功，显示成功提示
      hideLoading()
      showToast({title: '权限已更新', icon: 'success'})
      
      // 延迟返回上一页
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error: unknown) {
      console.error('保存失败:', error)
      hideLoading()
      
      const errorMessage = error instanceof Error ? error.message : '保存失败'
      showToast({
        title: errorMessage,
        icon: 'error',
        duration: 2000
      })
    } finally {
      setSaving(false)
    }
  }, [userId, user, userRole, permissionLevel])

  /**
   * 删除权限（重置为默认权限）
   * 重置 manager_permissions_enabled 为 true（默认完整权限）
   * 
   * Requirements: 1.3
   */
  const handleDelete = useCallback(async () => {
    if (!userId || !user?.id || !userRole || !currentPermission) return

    const result = await Taro.showModal({
      title: '确认重置',
      content: `确定要重置 ${decodeURIComponent(userName || '')} 的权限吗？重置后该用户将恢复默认权限（完整控制权）。`
    })

    if (!result.confirm) return

    showLoading({title: '重置中...'})
    try {
      // 先检查字段是否存在
      const {error: checkError} = await supabase
        .from('users')
        .select('manager_permissions_enabled')
        .eq('id', userId)
        .maybeSingle()

      // 如果字段不存在，显示提示
      if (checkError && (checkError.code === '42703' || checkError.message?.includes('manager_permissions_enabled'))) {
        console.error('字段不存在:', checkError)
        hideLoading()
        Taro.showModal({
          title: '功能暂不可用',
          content: '权限配置功能需要数据库升级。请联系管理员执行数据库迁移脚本。',
          showCancel: false,
          confirmText: '知道了'
        })
        return
      }

      // 重置为默认权限（manager_permissions_enabled = true，即完整权限）
      const {error} = await supabase
        .from('users')
        .update({
          manager_permissions_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        // 检查是否是字段不存在的错误
        if (error.code === '42703' || error.message?.includes('manager_permissions_enabled')) {
          console.error('重置时字段不存在:', error)
          hideLoading()
          Taro.showModal({
            title: '功能暂不可用',
            content: '权限配置功能需要数据库升级。请联系管理员执行数据库迁移脚本。',
            showCancel: false,
            confirmText: '知道了'
          })
          return
        }
        console.error('重置权限失败:', error)
        throw new Error(error.message || '重置失败')
      }

      hideLoading()
      showToast({title: '权限已重置', icon: 'success'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error: unknown) {
      console.error('重置失败:', error)
      hideLoading()
      const errorMessage = error instanceof Error ? error.message : '重置失败'
      showToast({
        title: errorMessage,
        icon: 'error',
        duration: 2000
      })
    }
  }, [userId, user, userRole, userName, currentPermission])

  return (
    <>
      <SafeAreaTop />
      <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)'}}>
        {/* 顶部导航栏 */}
        <TopNavBar />
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
              {/* 数据库升级提示 - 当字段不存在时显示 */}
              {!fieldExists && (
                <View className="px-4 mb-4">
                  <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <View className="flex items-start">
                      <View className="i-mdi-alert text-xl text-yellow-600 mr-2 flex-shrink-0" />
                      <View>
                        <Text className="text-sm font-semibold text-yellow-800">需要数据库升级</Text>
                        <Text className="text-xs text-yellow-700 mt-1">
                          权限配置功能需要数据库升级才能正常使用。请联系管理员在 Supabase Dashboard 的 SQL Editor 中执行迁移脚本。
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

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
                {/* 保存按钮 - 统一显示"变更权限"，实际操作根据是否有现有权限决定创建或更新 */}
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
                  变更权限
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
    </>
  )
}

export default PermissionConfig
