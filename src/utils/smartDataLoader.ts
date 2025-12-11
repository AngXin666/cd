/**
 * 智能数据加载器
 * 基于用户行为权重，实现优先级数据加载和差异化缓存策略
 */

import {behaviorTracker, type FeatureModule, type FeatureWeight} from './behaviorTracker'
import {getCache, setCache} from './cache'

/**
 * 数据加载器配置
 */
interface LoaderConfig {
  featureModule: FeatureModule | string
  loadFunction: () => Promise<any>
  cacheKey: string
  defaultTTL?: number // 默认缓存时间（毫秒）
}

/**
 * 数据加载结果
 */
interface LoadResult<T> {
  data: T
  fromCache: boolean
  loadTime: number // 加载耗时（毫秒）
}

/**
 * 智能数据加载器类
 */
class SmartDataLoader {
  private loadingQueue: Map<string, Promise<any>> = new Map()
  private featureWeights: Map<string, FeatureWeight> = new Map()

  /**
   * 初始化加载器
   */
  async init(userId: string) {
    // 初始化行为追踪器
    await behaviorTracker.init(userId)

    // 加载用户的功能权重
    await this.loadFeatureWeights()
  }

  /**
   * 加载功能权重
   */
  private async loadFeatureWeights() {
    const weights = await behaviorTracker.getAllFeatureWeights()
    this.featureWeights.clear()
    weights.forEach((weight) => {
      this.featureWeights.set(weight.feature_module, weight)
    })
  }

  /**
   * 智能加载数据
   * 根据功能权重决定缓存策略
   */
  async load<T>(config: LoaderConfig): Promise<LoadResult<T>> {
    const startTime = Date.now()
    const {featureModule, loadFunction, cacheKey, defaultTTL = 300000} = config

    // 获取功能权重
    const weight = this.featureWeights.get(featureModule)
    const cacheTTL = weight?.cache_ttl || defaultTTL

    // 尝试从缓存获取
    const cachedData = getCache<T>(cacheKey)
    if (cachedData !== null) {
      const loadTime = Date.now() - startTime
      return {
        data: cachedData,
        fromCache: true,
        loadTime
      }
    }

    // 缓存未命中，从数据库加载

    // 检查是否已经在加载中（避免重复加载）
    if (this.loadingQueue.has(cacheKey)) {
      const data = await this.loadingQueue.get(cacheKey)
      const loadTime = Date.now() - startTime
      return {
        data,
        fromCache: false,
        loadTime
      }
    }

    // 开始加载
    const loadPromise = loadFunction()
    this.loadingQueue.set(cacheKey, loadPromise)

    try {
      const data = await loadPromise
      const loadTime = Date.now() - startTime

      // 保存到缓存
      setCache(cacheKey, data, cacheTTL)

      return {
        data,
        fromCache: false,
        loadTime
      }
    } finally {
      // 清理加载队列
      this.loadingQueue.delete(cacheKey)
    }
  }

  /**
   * 批量预加载高优先级功能的数据
   */
  async preloadHighPriorityData(loaders: LoaderConfig[]) {
    // 获取高优先级功能列表
    const highPriorityFeatures = await behaviorTracker.getHighPriorityFeatures(5)
    const priorityModules = new Set(highPriorityFeatures.map((f) => f.feature_module))

    // 筛选出高优先级的加载器
    const priorityLoaders = loaders.filter((loader) => priorityModules.has(loader.featureModule))

    // 按权重排序
    priorityLoaders.sort((a, b) => {
      const weightA = this.featureWeights.get(a.featureModule)?.weight_score || 0
      const weightB = this.featureWeights.get(b.featureModule)?.weight_score || 0
      return weightB - weightA
    })

    // 并行预加载（最多3个）
    const batchSize = 3
    for (let i = 0; i < priorityLoaders.length; i += batchSize) {
      const batch = priorityLoaders.slice(i, i + batchSize)
      await Promise.all(
        batch.map((loader) =>
          this.load(loader).catch((error) => {
            console.error(`[智能加载] 预加载失败: ${loader.featureModule}`, error)
            return null
          })
        )
      )
    }
  }

  /**
   * 获取功能的缓存时间
   */
  getFeatureCacheTTL(featureModule: string): number {
    const weight = this.featureWeights.get(featureModule)
    return weight?.cache_ttl || 300000 // 默认5分钟
  }

  /**
   * 获取功能权重分数
   */
  getFeatureWeight(featureModule: string): number {
    const weight = this.featureWeights.get(featureModule)
    return weight?.weight_score || 0
  }

  /**
   * 刷新功能权重
   */
  async refreshWeights() {
    await this.loadFeatureWeights()
  }

  /**
   * 清理加载器
   */
  cleanup() {
    this.loadingQueue.clear()
    this.featureWeights.clear()
  }
}

// 导出单例
export const smartDataLoader = new SmartDataLoader()

/**
 * React Hook：使用智能数据加载
 */
export function useSmartDataLoader() {
  return {
    load: <T>(config: LoaderConfig) => smartDataLoader.load<T>(config),
    preloadHighPriorityData: (loaders: LoaderConfig[]) => smartDataLoader.preloadHighPriorityData(loaders),
    getFeatureCacheTTL: (featureModule: string) => smartDataLoader.getFeatureCacheTTL(featureModule),
    getFeatureWeight: (featureModule: string) => smartDataLoader.getFeatureWeight(featureModule),
    refreshWeights: () => smartDataLoader.refreshWeights()
  }
}
