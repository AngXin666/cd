import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showToast} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import {createNotifications} from '@/db/notificationApi'

/**
 * 通知功能测试页面
 * 用于测试通知创建和发送功能
 */
const TestNotification: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 测试1：给自己发送一条测试通知
  const testSendToSelf = async () => {
    if (!user?.id) {
      showToast({title: '用户未登录', icon: 'none'})
      return
    }

    setLoading(true)
    setTestResult('开始测试...')

    try {
      console.log('🧪 [测试] 开始测试给自己发送通知')
      console.log('🧪 [测试] 当前用户ID:', user.id)

      const notifications = [
        {
          userId: user.id,
          type: 'warehouse_assigned' as const,
          title: '测试通知',
          message: `这是一条测试通知，发送时间：${new Date().toLocaleString()}`,
          relatedId: user.id
        }
      ]

      console.log('🧪 [测试] 准备发送通知:', notifications)

      const success = await createNotifications(notifications)

      console.log('🧪 [测试] 发送结果:', success)

      if (success) {
        setTestResult('✅ 测试成功！\n\n通知已发送，请刷新通知中心查看。')
        showToast({title: '测试成功', icon: 'success'})
      } else {
        setTestResult('❌ 测试失败！\n\n通知发送失败，请查看控制台日志。')
        showToast({title: '测试失败', icon: 'error'})
      }
    } catch (error) {
      console.error('🧪 [测试] 测试异常:', error)
      setTestResult(`❌ 测试异常！\n\n${error}`)
      showToast({title: '测试异常', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }

  // 测试2：批量发送多条通知
  const testBatchSend = async () => {
    if (!user?.id) {
      showToast({title: '用户未登录', icon: 'none'})
      return
    }

    setLoading(true)
    setTestResult('开始批量测试...')

    try {
      console.log('🧪 [测试] 开始批量测试')

      const notifications = [
        {
          userId: user.id,
          type: 'warehouse_assigned' as const,
          title: '批量测试通知1',
          message: '这是第1条测试通知',
          relatedId: user.id
        },
        {
          userId: user.id,
          type: 'warehouse_assigned' as const,
          title: '批量测试通知2',
          message: '这是第2条测试通知',
          relatedId: user.id
        },
        {
          userId: user.id,
          type: 'warehouse_unassigned' as const,
          title: '批量测试通知3',
          message: '这是第3条测试通知',
          relatedId: user.id
        }
      ]

      console.log('🧪 [测试] 准备批量发送通知:', notifications)

      const success = await createNotifications(notifications)

      console.log('🧪 [测试] 批量发送结果:', success)

      if (success) {
        setTestResult('✅ 批量测试成功！\n\n已发送3条通知，请刷新通知中心查看。')
        showToast({title: '批量测试成功', icon: 'success'})
      } else {
        setTestResult('❌ 批量测试失败！\n\n通知发送失败，请查看控制台日志。')
        showToast({title: '批量测试失败', icon: 'error'})
      }
    } catch (error) {
      console.error('🧪 [测试] 批量测试异常:', error)
      setTestResult(`❌ 批量测试异常！\n\n${error}`)
      showToast({title: '批量测试异常', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }

  // 查看通知中心
  const goToNotifications = () => {
    Taro.navigateTo({url: '/pages/common/notifications/index'})
  }

  return (
    <View
      style={{background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--muted)))', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-6 space-y-6">
          {/* 页面标题 */}
          <View className="bg-card rounded-lg p-6 shadow-sm">
            <Text className="text-2xl font-bold text-foreground block mb-2">通知功能测试</Text>
            <Text className="text-sm text-muted-foreground block">用于测试通知创建和发送功能</Text>
          </View>

          {/* 用户信息 */}
          <View className="bg-card rounded-lg p-6 shadow-sm">
            <Text className="text-lg font-semibold text-foreground block mb-4">当前用户信息</Text>
            <View className="space-y-2">
              <View>
                <Text className="text-sm text-muted-foreground">用户ID：</Text>
                <Text className="text-sm text-foreground">{user?.id || '未登录'}</Text>
              </View>
            </View>
          </View>

          {/* 测试按钮 */}
          <View className="bg-card rounded-lg p-6 shadow-sm space-y-4">
            <Text className="text-lg font-semibold text-foreground block mb-4">测试功能</Text>

            <Button
              className="w-full bg-primary text-primary-foreground py-4 rounded break-keep text-base"
              size="default"
              onClick={testSendToSelf}
              disabled={loading}>
              {loading ? '测试中...' : '测试1：发送单条通知'}
            </Button>

            <Button
              className="w-full bg-secondary text-secondary-foreground py-4 rounded break-keep text-base"
              size="default"
              onClick={testBatchSend}
              disabled={loading}>
              {loading ? '测试中...' : '测试2：批量发送通知'}
            </Button>

            <Button
              className="w-full bg-accent text-accent-foreground py-4 rounded break-keep text-base"
              size="default"
              onClick={goToNotifications}>
              查看通知中心
            </Button>
          </View>

          {/* 测试结果 */}
          {testResult && (
            <View className="bg-card rounded-lg p-6 shadow-sm">
              <Text className="text-lg font-semibold text-foreground block mb-4">测试结果</Text>
              <View className="bg-muted p-4 rounded">
                <Text className="text-sm text-foreground whitespace-pre-wrap">{testResult}</Text>
              </View>
            </View>
          )}

          {/* 使用说明 */}
          <View className="bg-card rounded-lg p-6 shadow-sm">
            <Text className="text-lg font-semibold text-foreground block mb-4">使用说明</Text>
            <View className="space-y-2">
              <View>
                <Text className="text-sm text-foreground">1. 打开浏览器控制台（F12）</Text>
              </View>
              <View>
                <Text className="text-sm text-foreground">2. 点击测试按钮</Text>
              </View>
              <View>
                <Text className="text-sm text-foreground">3. 查看控制台日志输出</Text>
              </View>
              <View>
                <Text className="text-sm text-foreground">4. 点击"查看通知中心"查看通知</Text>
              </View>
              <View>
                <Text className="text-sm text-foreground">5. 如果测试失败，请截图控制台日志</Text>
              </View>
            </View>
          </View>

          {/* 调试提示 */}
          <View className="bg-destructive/10 rounded-lg p-6">
            <Text className="text-sm text-destructive font-semibold block mb-2">⚠️ 重要提示</Text>
            <View className="space-y-1">
              <View>
                <Text className="text-sm text-destructive">• 必须打开浏览器控制台才能看到详细日志</Text>
              </View>
              <View>
                <Text className="text-sm text-destructive">• 测试成功后需要刷新通知中心页面</Text>
              </View>
              <View>
                <Text className="text-sm text-destructive">• 如果测试失败，请提供完整的控制台日志</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default TestNotification
