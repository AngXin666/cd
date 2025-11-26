import {ScrollView, Text, View} from '@tarojs/components'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useEffect, useState} from 'react'
import {behaviorTracker, FeatureModule, type FeatureWeight} from '@/utils/behaviorTracker'
import {type PerformanceStats, performanceMonitor} from '@/utils/performanceMonitor'

/**
 * 性能监控面板
 * 展示系统性能指标和用户行为分析
 */
const PerformanceMonitor: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [featureWeights, setFeatureWeights] = useState<FeatureWeight[]>([])
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats[]>([])
  const [cacheStats, setCacheStats] = useState({
    hitRate: 0,
    totalMetrics: 0,
    cacheHits: 0,
    cacheMisses: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadData()
      behaviorTracker.trackPageView(FeatureModule.DASHBOARD, '/pages/performance-monitor/index')
    }
  }, [user, loadData])

  async function loadData() {
    setLoading(true)
    try {
      const [weights, stats, cache] = await Promise.all([
        behaviorTracker.getAllFeatureWeights(),
        performanceMonitor.getHistoricalStats(undefined, 7),
        Promise.resolve(performanceMonitor.getStats())
      ])

      setFeatureWeights(weights)
      setPerformanceStats(stats)
      setCacheStats(cache)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWeightColor = (score: number) => {
    if (score >= 80) return 'text-red-500'
    if (score >= 50) return 'text-orange-500'
    return 'text-green-500'
  }

  const getWeightLabel = (score: number) => {
    if (score >= 80) return '高频'
    if (score >= 50) return '中频'
    return '低频'
  }

  const formatCacheTTL = (ttl: number) => {
    if (ttl < 60000) return `${Math.round(ttl / 1000)}秒`
    return `${Math.round(ttl / 60000)}分钟`
  }

  if (loading) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  return (
    <ScrollView scrollY className="min-h-screen bg-background box-border">
      <View className="p-4 space-y-4">
        {/* 页面标题 */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-foreground">性能监控</Text>
          <Text className="text-sm text-muted-foreground mt-1">系统性能指标与用户行为分析</Text>
        </View>

        {/* 缓存统计卡片 */}
        <View className="bg-card rounded-lg p-4 shadow-sm">
          <Text className="text-lg font-semibold text-foreground mb-3">缓存统计</Text>
          <View className="space-y-2">
            <View className="flex justify-between items-center">
              <Text className="text-muted-foreground">缓存命中率</Text>
              <Text className="text-xl font-bold text-primary">{cacheStats.hitRate.toFixed(1)}%</Text>
            </View>
            <View className="flex justify-between items-center">
              <Text className="text-muted-foreground">缓存命中次数</Text>
              <Text className="text-foreground font-medium">{cacheStats.cacheHits}</Text>
            </View>
            <View className="flex justify-between items-center">
              <Text className="text-muted-foreground">缓存未命中次数</Text>
              <Text className="text-foreground font-medium">{cacheStats.cacheMisses}</Text>
            </View>
            <View className="flex justify-between items-center">
              <Text className="text-muted-foreground">总指标数</Text>
              <Text className="text-foreground font-medium">{cacheStats.totalMetrics}</Text>
            </View>
          </View>
        </View>

        {/* 功能权重卡片 */}
        <View className="bg-card rounded-lg p-4 shadow-sm">
          <Text className="text-lg font-semibold text-foreground mb-3">功能使用频率</Text>
          {featureWeights.length === 0 ? (
            <Text className="text-muted-foreground text-center py-4">暂无数据，开始使用系统后将自动统计</Text>
          ) : (
            <View className="space-y-3">
              {featureWeights.map((weight, index) => (
                <View key={weight.feature_module} className="border-b border-border pb-3 last:border-0">
                  <View className="flex justify-between items-center mb-2">
                    <View className="flex items-center gap-2">
                      <Text className="text-foreground font-medium">
                        {index + 1}. {weight.feature_module}
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded ${
                          weight.weight_score >= 80
                            ? 'bg-red-100'
                            : weight.weight_score >= 50
                              ? 'bg-orange-100'
                              : 'bg-green-100'
                        }`}>
                        <Text className={`text-xs ${getWeightColor(weight.weight_score)}`}>
                          {getWeightLabel(weight.weight_score)}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-primary">{weight.weight_score.toFixed(1)}</Text>
                  </View>
                  <View className="flex justify-between items-center text-sm">
                    <Text className="text-muted-foreground">访问次数: {weight.access_count || 0}</Text>
                    <Text className="text-muted-foreground">缓存时间: {formatCacheTTL(weight.cache_ttl)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 性能指标卡片 */}
        <View className="bg-card rounded-lg p-4 shadow-sm">
          <Text className="text-lg font-semibold text-foreground mb-3">性能指标（最近7天）</Text>
          {performanceStats.length === 0 ? (
            <Text className="text-muted-foreground text-center py-4">暂无性能数据</Text>
          ) : (
            <View className="space-y-3">
              {performanceStats.slice(0, 10).map((stat, index) => (
                <View
                  key={`${stat.metricType}-${stat.metricName}-${index}`}
                  className="border-b border-border pb-3 last:border-0">
                  <View className="flex justify-between items-center mb-2">
                    <Text className="text-foreground font-medium">{stat.metricName}</Text>
                    <Text className="text-sm text-muted-foreground">{stat.metricType}</Text>
                  </View>
                  <View className="grid grid-cols-3 gap-2 text-sm">
                    <View>
                      <Text className="text-muted-foreground">平均值</Text>
                      <Text className="text-foreground font-medium">
                        {stat.avgValue.toFixed(1)} {stat.unit}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-muted-foreground">最小值</Text>
                      <Text className="text-foreground font-medium">
                        {stat.minValue.toFixed(1)} {stat.unit}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-muted-foreground">最大值</Text>
                      <Text className="text-foreground font-medium">
                        {stat.maxValue.toFixed(1)} {stat.unit}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted-foreground mt-1">样本数: {stat.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 优化建议卡片 */}
        <View className="bg-card rounded-lg p-4 shadow-sm">
          <Text className="text-lg font-semibold text-foreground mb-3">优化建议</Text>
          <View className="space-y-2">
            {cacheStats.hitRate < 60 && (
              <View className="bg-orange-50 p-3 rounded">
                <Text className="text-orange-700 text-sm">
                  ⚠️ 缓存命中率较低（{cacheStats.hitRate.toFixed(1)}%），建议增加缓存时间
                </Text>
              </View>
            )}
            {cacheStats.hitRate >= 80 && (
              <View className="bg-green-50 p-3 rounded">
                <Text className="text-green-700 text-sm">
                  ✅ 缓存命中率良好（{cacheStats.hitRate.toFixed(1)}%），系统性能优秀
                </Text>
              </View>
            )}
            {featureWeights.length === 0 && (
              <View className="bg-blue-50 p-3 rounded">
                <Text className="text-blue-700 text-sm">ℹ️ 暂无使用数据，系统将在您使用过程中自动学习和优化</Text>
              </View>
            )}
            {featureWeights.length > 0 && (
              <View className="bg-blue-50 p-3 rounded">
                <Text className="text-blue-700 text-sm">ℹ️ 系统已根据您的使用习惯优化数据加载策略</Text>
              </View>
            )}
          </View>
        </View>

        {/* 说明卡片 */}
        <View className="bg-card rounded-lg p-4 shadow-sm">
          <Text className="text-lg font-semibold text-foreground mb-3">功能说明</Text>
          <View className="space-y-2">
            <View>
              <Text className="text-foreground font-medium">• 智能学习</Text>
              <Text className="text-sm text-muted-foreground ml-4">系统自动记录您的使用习惯，优化数据加载顺序</Text>
            </View>
            <View>
              <Text className="text-foreground font-medium">• 差异化缓存</Text>
              <Text className="text-sm text-muted-foreground ml-4">高频功能：1分钟缓存（高实时性）</Text>
              <Text className="text-sm text-muted-foreground ml-4">中频功能：5分钟缓存（平衡性能）</Text>
              <Text className="text-sm text-muted-foreground ml-4">低频功能：15分钟缓存（优化性能）</Text>
            </View>
            <View>
              <Text className="text-foreground font-medium">• 优先加载</Text>
              <Text className="text-sm text-muted-foreground ml-4">系统启动时自动预加载您常用的功能数据</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

export default PerformanceMonitor
