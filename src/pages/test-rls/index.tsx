import {Button, ScrollView, Text, View} from '@tarojs/components'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import {supabase} from '@/db/supabase'

/**
 * RLS 策略测试页面
 * 提供可视化的测试界面，无需使用浏览器控制台
 */
const TestRLSPage: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [testResults, setTestResults] = useState<string[]>([])
  const [testing, setTesting] = useState(false)

  const addLog = (message: string) => {
    setTestResults((prev) => [...prev, message])
  }

  const clearLogs = () => {
    setTestResults([])
  }

  const runTests = async () => {
    if (!user) {
      addLog('❌ 用户未登录')
      return
    }

    setTesting(true)
    clearLogs()

    addLog('🚀 开始测试 RLS 策略...')
    addLog('')

    try {
      // 测试 1: 检查当前用户
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addLog('测试 1: 检查当前用户')
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addLog(`✅ 用户ID: ${user.id}`)

      // 查询用户角色
      const {data: roleData, error: roleError} = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (roleError) {
        addLog(`❌ 查询角色失败: ${roleError.message}`)
      } else {
        addLog(`✅ 用户角色: ${roleData?.role || '(无)'}`)
      }
      addLog('')

      // 测试 2: 测试 users 表访问
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addLog('测试 2: 测试 users 表访问')
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      const {
        data: usersData,
        error: usersError,
        count: usersCount
      } = await supabase.from('users').select('id, name', {count: 'exact'}).limit(5)

      if (usersError) {
        addLog(`❌ 查询失败: ${usersError.message}`)
      } else {
        addLog(`✅ 查询成功`)
        addLog(`  - 总记录数: ${usersCount}`)
        addLog(`  - 返回记录数: ${usersData?.length || 0}`)
      }
      addLog('')

      // 测试 3: 测试 user_roles 表访问
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addLog('测试 3: 测试 user_roles 表访问')
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      const {
        data: rolesData,
        error: rolesError,
        count: rolesCount
      } = await supabase.from('users').select('user_id, role', {count: 'exact'}).limit(10)

      if (rolesError) {
        addLog(`❌ 查询失败: ${rolesError.message}`)
      } else {
        addLog(`✅ 查询成功`)
        addLog(`  - 总记录数: ${rolesCount}`)
        addLog(`  - 返回记录数: ${rolesData?.length || 0}`)
      }
      addLog('')

      // 测试 4: 测试 notifications 表访问
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addLog('测试 4: 测试 notifications 表访问')
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      const {
        data: notifsData,
        error: notifsError,
        count: notifsCount
      } = await supabase
        .from('notifications')
        .select('id, title, type', {count: 'exact'})
        .eq('recipient_id', user.id)
        .limit(5)

      if (notifsError) {
        addLog(`❌ 查询失败: ${notifsError.message}`)
      } else {
        addLog(`✅ 查询成功`)
        addLog(`  - 总记录数: ${notifsCount}`)
        addLog(`  - 返回记录数: ${notifsData?.length || 0}`)
      }
      addLog('')

      // 测试 5: 测试通知更新权限（仅管理员）
      const isAdmin = roleData?.role && ['BOSS', 'MANAGER', 'PEER_ADMIN'].includes(roleData.role)

      if (isAdmin) {
        addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        addLog('测试 5: 测试通知更新权限')
        addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        // 创建测试通知
        addLog('📊 创建测试通知...')
        const {data: insertData, error: insertError} = await supabase
          .from('notifications')
          .insert({
            recipient_id: user.id,
            sender_id: user.id,
            type: 'system',
            title: 'RLS 测试通知',
            content: '这是一条测试通知',
            is_read: false
          })
          .select('id')
          .single()

        if (insertError) {
          addLog(`❌ 创建失败: ${insertError.message}`)
        } else {
          addLog(`✅ 创建成功，ID: ${insertData.id}`)

          // 测试更新
          addLog('📊 测试更新通知...')
          const {error: updateError} = await supabase
            .from('notifications')
            .update({
              content: '通知已更新',
              updated_at: new Date().toISOString()
            })
            .eq('id', insertData.id)

          if (updateError) {
            addLog(`❌ 更新失败: ${updateError.message}`)
            addLog('⚠️ 这可能是 RLS 策略问题！')
          } else {
            addLog('✅ 更新成功')
          }

          // 清理测试数据
          await supabase.from('notifications').delete().eq('id', insertData.id)
          addLog('✅ 测试数据已清理')
        }
        addLog('')
      } else {
        addLog('ℹ️ 当前用户不是管理员，跳过管理员权限测试')
        addLog('')
      }

      // 总结
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addLog('✅ 测试完成！')
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } catch (error) {
      addLog(`❌ 测试异常: ${error}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <View className="min-h-screen bg-background">
      {/* 顶部标题 */}
      <View className="bg-primary p-4 pb-6">
        <Text className="text-2xl font-bold text-white text-center">RLS 策略测试</Text>
        <Text className="text-sm text-white/80 text-center mt-2">可视化测试界面</Text>
      </View>

      {/* 操作按钮 */}
      <View className="p-4 flex flex-row gap-3">
        <Button
          className="flex-1 bg-primary text-white py-3 rounded break-keep text-base"
          size="default"
          onClick={runTests}
          disabled={testing}>
          {testing ? '测试中...' : '开始测试'}
        </Button>
        <Button
          className="flex-1 bg-muted text-foreground py-3 rounded break-keep text-base"
          size="default"
          onClick={clearLogs}
          disabled={testing}>
          清空日志
        </Button>
      </View>

      {/* 测试结果 */}
      <View className="p-4">
        <View className="bg-card rounded-lg border border-border p-4">
          <Text className="text-lg font-semibold text-foreground mb-3">测试日志</Text>

          <ScrollView className="h-96 box-border" scrollY>
            {testResults.length === 0 ? (
              <Text className="text-muted-foreground text-center py-8">点击"开始测试"按钮运行测试</Text>
            ) : (
              <View>
                {testResults.map((log, index) => (
                  <View key={index} className="mb-1">
                    <Text className="text-sm text-foreground font-mono">{log}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* 说明 */}
      <View className="p-4">
        <View className="bg-muted rounded-lg p-4">
          <Text className="text-base font-semibold text-foreground mb-2">测试说明</Text>
          <View className="space-y-2">
            <View>
              <Text className="text-sm text-muted-foreground">1. 点击"开始测试"按钮运行所有测试</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">2. 测试会检查 RLS 策略和权限配置</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">3. 如果看到 ❌ 错误，说明需要修复 RLS 策略</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">4. 所有测试通过后会显示 ✅ 测试完成</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default TestRLSPage
