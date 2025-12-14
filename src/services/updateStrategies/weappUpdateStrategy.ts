/**
 * 小程序更新策略
 * 使用微信官方的 UpdateManager API 实现小程序热更新
 *
 * 功能说明：
 * - 在小程序启动时自动检查更新
 * - 当有新版本时，自动下载更新包
 * - 下载完成后提示用户重启应用
 * - 用户确认后立即应用更新
 *
 * @module services/updateStrategies/weappUpdateStrategy
 */

import Taro from '@tarojs/taro'
import {enhancedErrorHandler} from '@/utils/errorHandler'
import {createLogger} from '@/utils/logger'
import type {IUpdateStrategy} from './IUpdateStrategy'

/**
 * 小程序更新策略类
 * 实现 IUpdateStrategy 接口，提供小程序平台的热更新功能
 */
export class WeappUpdateStrategy implements IUpdateStrategy {
  /**
   * 微信小程序更新管理器实例
   * 通过 Taro.getUpdateManager() 获取
   */
  private updateManager: Taro.UpdateManager | null = null

  /**
   * 日志记录器
   * 用于记录更新流程中的关键事件和错误
   */
  private logger = createLogger('WeappUpdateStrategy')

  /**
   * 初始化小程序更新策略
   * 获取微信更新管理器并设置更新事件监听器
   *
   * @returns Promise<void> 初始化完成的 Promise
   * @throws {Error} 当获取更新管理器失败时抛出错误
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('初始化小程序更新策略')

      // 获取微信小程序更新管理器
      // 注意：只有在小程序环境中才能获取到更新管理器
      this.updateManager = Taro.getUpdateManager()

      // 设置更新事件监听器
      this.setupUpdateListeners()

      this.logger.info('小程序更新策略初始化成功')
    } catch (error) {
      this.logger.error('小程序更新策略初始化失败', error)

      // 使用统一错误处理器记录错误，但不中断应用启动
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false, // 不显示错误提示，避免影响用户体验
        context: {
          component: 'WeappUpdateStrategy',
          action: 'initialize'
        }
      })
    }
  }

  /**
   * 设置更新事件监听器
   * 监听更新检查、下载完成、下载失败等事件
   *
   * @private
   */
  private setupUpdateListeners(): void {
    if (!this.updateManager) {
      this.logger.warn('更新管理器未初始化，跳过事件监听器设置')
      return
    }

    // 监听检查更新结果
    // 当微信后台检查到新版本时触发
    this.updateManager.onCheckForUpdate((res) => {
      this.logger.info('检查更新结果', {hasUpdate: res.hasUpdate})

      if (res.hasUpdate) {
        this.logger.info('发现新版本，开始下载更新')
      } else {
        this.logger.debug('当前已是最新版本')
      }
    })

    // 监听更新下载完成事件
    // 当新版本下载完成时触发
    this.updateManager.onUpdateReady(() => {
      this.logger.info('新版本下载完成，准备提示用户重启')

      // 提示用户重启应用以应用新版本
      this.promptUserToRestart()
    })

    // 监听更新下载失败事件
    // 当新版本下载失败时触发
    this.updateManager.onUpdateFailed((error) => {
      this.logger.error('新版本下载失败', error)

      // 记录错误但不影响应用正常使用
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false, // 不显示错误提示，避免打扰用户
        context: {
          component: 'WeappUpdateStrategy',
          action: 'downloadUpdate'
        }
      })
    })
  }

  /**
   * 提示用户重启应用
   * 显示模态对话框，询问用户是否立即重启应用以应用更新
   *
   * @private
   */
  private promptUserToRestart(): void {
    try {
      // 使用 Taro.showModal 显示原生模态对话框
      Taro.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        showCancel: true, // 显示取消按钮，让用户可以选择稍后重启
        confirmText: '立即重启',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            // 用户点击"立即重启"按钮
            this.logger.info('用户确认重启应用')
            this.applyUpdate()
          } else if (res.cancel) {
            // 用户点击"稍后"按钮
            this.logger.info('用户选择稍后重启')
          }
        },
        fail: (error) => {
          // 显示对话框失败
          this.logger.error('显示更新提示对话框失败', error)
        }
      })
    } catch (error) {
      this.logger.error('提示用户重启失败', error)

      // 记录错误但不影响应用正常使用
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false,
        context: {
          component: 'WeappUpdateStrategy',
          action: 'promptUserToRestart'
        }
      })
    }
  }

  /**
   * 应用更新并重启小程序
   * 调用更新管理器的 applyUpdate 方法，强制小程序重启并应用新版本
   *
   * @private
   */
  private applyUpdate(): void {
    try {
      if (!this.updateManager) {
        this.logger.error('更新管理器未初始化，无法应用更新')
        return
      }

      this.logger.info('开始应用更新并重启小程序')

      // 调用 applyUpdate 方法，小程序将立即重启
      this.updateManager.applyUpdate()
    } catch (error) {
      this.logger.error('应用更新失败', error)

      // 显示错误提示，因为这是用户主动触发的操作
      enhancedErrorHandler.handleWithContext(error, {
        showToast: true,
        customMessage: '应用更新失败，请稍后重试',
        context: {
          component: 'WeappUpdateStrategy',
          action: 'applyUpdate'
        }
      })
    }
  }

  /**
   * 检查并应用更新
   *
   * 注意：微信小程序会在启动时自动检查更新，无需手动触发
   * 此方法主要用于满足接口规范，以及在非静默模式下提供用户反馈
   *
   * @param silent - 是否静默检查（不显示"正在检查更新"提示）
   *                 默认为 true，静默检查
   * @returns Promise<void> 检查完成的 Promise
   */
  async checkAndApplyUpdate(silent: boolean = true): Promise<void> {
    try {
      this.logger.info('执行更新检查', {silent})

      // 微信小程序会自动检查更新，这里不需要手动触发
      // 只在非静默模式下显示"正在检查更新"的提示
      if (!silent) {
        Taro.showToast({
          title: '正在检查更新...',
          icon: 'loading',
          duration: 2000 // 2秒后自动关闭
        })
      }

      // 微信会自动处理更新流程，我们只需要等待事件回调
      this.logger.debug('微信将自动处理更新检查和下载')
    } catch (error) {
      this.logger.error('检查更新失败', error)

      // 使用统一错误处理器
      enhancedErrorHandler.handleWithContext(error, {
        showToast: !silent, // 只在非静默模式下显示错误提示
        customMessage: '检查更新失败，请稍后重试',
        context: {
          component: 'WeappUpdateStrategy',
          action: 'checkAndApplyUpdate',
          metadata: {silent}
        }
      })
    }
  }

  /**
   * 获取策略名称
   * 用于日志记录和调试
   *
   * @returns 策略名称字符串
   */
  getName(): string {
    return 'WeappUpdateStrategy'
  }
}
