/**
 * 统一热更新服务
 * 根据平台自动选择合适的更新策略，提供统一的更新接口
 *
 * 功能说明：
 * - 自动检测当前运行平台（小程序、Android APP、H5）
 * - 根据平台创建对应的更新策略实例
 * - 提供统一的初始化和更新检查接口
 * - 支持开发模式跳过更新检查
 *
 * 平台支持：
 * - 微信小程序：使用 WeappUpdateStrategy（微信官方 UpdateManager）
 * - Android APP：使用 AndroidUpdateStrategy（Capacitor LiveUpdate）
 * - H5：使用 H5UpdateStrategy（空实现，不执行更新）
 *
 * @module services/unifiedUpdateService
 */

import {enhancedErrorHandler} from '@/utils/errorHandler'
import {createLogger} from '@/utils/logger'
import {getCurrentPlatform, PlatformType} from '@/utils/platform'
import {AndroidUpdateStrategy} from './updateStrategies/androidUpdateStrategy'
import {H5UpdateStrategy} from './updateStrategies/h5UpdateStrategy'
import type {IUpdateStrategy} from './updateStrategies/IUpdateStrategy'
import {WeappUpdateStrategy} from './updateStrategies/weappUpdateStrategy'

/**
 * 统一更新服务类
 * 提供平台无关的更新接口，内部根据平台选择合适的更新策略
 */
export class UnifiedUpdateService {
  /**
   * 当前使用的更新策略实例
   * 根据平台自动选择（WeappUpdateStrategy、AndroidUpdateStrategy 或 H5UpdateStrategy）
   */
  private strategy: IUpdateStrategy | null = null

  /**
   * 当前运行平台
   * 在初始化时检测并缓存
   */
  private currentPlatform: PlatformType = PlatformType.UNKNOWN

  /**
   * 日志记录器
   * 用于记录服务运行状态和错误信息
   */
  private logger = createLogger('UnifiedUpdateService')

  /**
   * 是否已初始化
   * 防止重复初始化
   */
  private initialized: boolean = false

  /**
   * 初始化统一更新服务
   * 检测当前平台并创建对应的更新策略实例
   *
   * 执行流程：
   * 1. 检测当前运行平台
   * 2. 根据平台创建对应的策略实例
   * 3. 调用策略的初始化方法
   *
   * @returns Promise<void> 初始化完成的 Promise
   * @throws {Error} 当策略初始化失败时抛出错误（但不会中断应用启动）
   */
  async initialize(): Promise<void> {
    try {
      // 防止重复初始化
      if (this.initialized) {
        this.logger.warn('统一更新服务已初始化，跳过重复初始化')
        return
      }

      this.logger.info('开始初始化统一更新服务')

      // 1. 检测当前运行平台
      this.currentPlatform = getCurrentPlatform()
      this.logger.info('检测到当前平台', {platform: this.currentPlatform})

      // 2. 根据平台创建对应的更新策略实例
      this.strategy = this.createStrategy(this.currentPlatform)

      if (!this.strategy) {
        this.logger.error('无法创建更新策略，平台不支持', {
          platform: this.currentPlatform
        })
        return
      }

      this.logger.info('创建更新策略成功', {
        strategyName: this.strategy.getName()
      })

      // 3. 调用策略的初始化方法
      await this.strategy.initialize()

      // 标记为已初始化
      this.initialized = true

      this.logger.info('统一更新服务初始化完成', {
        platform: this.currentPlatform,
        strategy: this.strategy.getName()
      })
    } catch (error) {
      this.logger.error('统一更新服务初始化失败', error)

      // 使用统一错误处理器记录错误，但不中断应用启动
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false, // 不显示错误提示，避免影响用户体验
        context: {
          component: 'UnifiedUpdateService',
          action: 'initialize',
          metadata: {
            platform: this.currentPlatform
          }
        }
      })
    }
  }

  /**
   * 检查并应用更新
   * 调用当前策略的更新检查方法
   *
   * 注意事项：
   * - 开发模式下会跳过更新检查
   * - 如果服务未初始化，会先尝试初始化
   * - 如果没有可用的策略，会记录警告但不会报错
   *
   * @param silent - 是否静默检查（不显示"已是最新版本"提示）
   *                 默认为 true，静默检查
   *                 false: 非静默检查，无论是否有更新都给用户反馈
   * @returns Promise<void> 更新检查完成的 Promise
   */
  async checkAndApplyUpdate(silent: boolean = true): Promise<void> {
    try {
      // 检查是否为开发模式
      if (this.isDevelopmentMode()) {
        this.logger.info('开发模式下跳过更新检查')
        return
      }

      // 如果服务未初始化，先尝试初始化
      if (!this.initialized) {
        this.logger.warn('服务未初始化，尝试先初始化')
        await this.initialize()
      }

      // 检查是否有可用的策略
      if (!this.strategy) {
        this.logger.warn('没有可用的更新策略，跳过更新检查', {
          platform: this.currentPlatform
        })
        return
      }

      this.logger.info('开始检查更新', {
        platform: this.currentPlatform,
        strategy: this.strategy.getName(),
        silent
      })

      // 调用策略的更新检查方法
      await this.strategy.checkAndApplyUpdate(silent)

      this.logger.info('更新检查完成')
    } catch (error) {
      this.logger.error('检查更新失败', error)

      // 使用统一错误处理器
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false, // 不显示错误提示，避免打扰用户
        context: {
          component: 'UnifiedUpdateService',
          action: 'checkAndApplyUpdate',
          metadata: {
            platform: this.currentPlatform,
            strategy: this.strategy?.getName(),
            silent
          }
        }
      })
    }
  }

  /**
   * 获取当前平台
   * 返回当前运行的平台类型
   *
   * @returns 平台类型枚举值
   */
  getCurrentPlatform(): PlatformType {
    return this.currentPlatform
  }

  /**
   * 获取当前使用的策略名称
   * 用于调试和日志记录
   *
   * @returns 策略名称字符串，如果没有策略则返回 null
   */
  getStrategyName(): string | null {
    return this.strategy?.getName() || null
  }

  /**
   * 根据平台创建对应的更新策略实例
   *
   * 策略映射：
   * - WEAPP（微信小程序）→ WeappUpdateStrategy
   * - ANDROID（Android APP）→ AndroidUpdateStrategy
   * - H5（H5 网页）→ H5UpdateStrategy
   * - UNKNOWN（未知平台）→ null
   *
   * @param platform - 平台类型
   * @returns 更新策略实例，如果平台不支持则返回 null
   * @private
   */
  private createStrategy(platform: PlatformType): IUpdateStrategy | null {
    switch (platform) {
      case PlatformType.WEAPP:
        // 微信小程序：使用微信官方 UpdateManager
        this.logger.debug('创建小程序更新策略')
        return new WeappUpdateStrategy()

      case PlatformType.ANDROID:
        // Android APP：使用 Capacitor LiveUpdate
        this.logger.debug('创建 Android 更新策略')
        return new AndroidUpdateStrategy()

      case PlatformType.H5:
        // H5：提供空实现，不执行更新
        this.logger.debug('创建 H5 更新策略（空实现）')
        return new H5UpdateStrategy()
      default:
        // 未知平台：不支持更新
        this.logger.warn('未知平台，无法创建更新策略', {platform})
        return null
    }
  }

  /**
   * 检查是否为开发模式
   * 开发模式下跳过自动更新检查，避免干扰开发
   *
   * @returns true: 开发模式，false: 生产模式
   * @private
   */
  private isDevelopmentMode(): boolean {
    // 检查 NODE_ENV 环境变量
    const isDev = process.env.NODE_ENV === 'development'

    if (isDev) {
      this.logger.debug('当前为开发模式')
    }

    return isDev
  }
}

/**
 * 导出统一更新服务的单例实例
 * 确保全局只有一个更新服务实例
 */
export const unifiedUpdateService = new UnifiedUpdateService()

/**
 * 默认导出
 * 提供便捷的导入方式
 */
export default unifiedUpdateService
