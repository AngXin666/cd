import {Text, View} from '@tarojs/components'
import type React from 'react'

/**
 * 电脑端管理后台首页 - 简化测试版本
 */
const WebAdminHome: React.FC = () => {
  return (
    <View className="min-h-screen bg-background flex items-center justify-center p-4">
      <View className="text-center">
        <View className="i-mdi-truck text-6xl text-primary mb-4" />
        <Text className="text-2xl font-bold text-foreground mb-2">车队管家 - 管理后台</Text>
        <Text className="text-base text-muted-foreground">页面加载成功！</Text>
      </View>
    </View>
  )
}

export default WebAdminHome
