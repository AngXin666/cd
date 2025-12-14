/**
 * Android APP 更新策略
 * 使用 Capacitor LiveUpdate 实现 H5 代码热更新
 *
 * 功能说明：
 * - 从 Supabase 数据库获取最新的 H5 版本信息
 * - 使用 Capacitor LiveUpdate 下载和安装更新包
 * - 支持强制更新和可选更新两种模式
 * - 提供更新进度反馈
 * - 更新完成后提示用户重启应用
 *
 * @module services/updateStrategies/androidUpdateStrategy
 */

import Taro from '@tarojs/taro'
import {
  applyH5Update,
  checkForH5Update,
  type H5VersionInfo,
  initLiveUpdate,
  type UpdateProgress
} from '@/services/h5UpdateService'
import {enhancedErrorHandler} from '@/utils/errorHandler'
import {createLogger} from '@/utils/logger'
import type {IUpdateStrategy} from './IUpdateStrategy'

/**
 * Android APP 更新策略类
 * 实现 IUpdateStrategy 接口，提供 Android 平台的 H5 热更新功能
 */
export class AndroidUpdateStrategy implements IUpdateStrategy {
  /**
   * 日志记录器
   * 用于记录更新流程中的关键事件和错误
   */
  private logger = createLogger('AndroidUpdateStrategy')

  /**
   * 初始化 Android 更新策略
   * 调用 LiveUpdate 的初始化方法，准备热更新环境
   *
   * @returns Promise<void> 初始化完成的 Promise
   * @throws {Error} 当 LiveUpdate 初始化失败时抛出错误
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('初始化 Android 更新策略')

      // 初始化 Capacitor LiveUpdate
      // 这会准备下一个 bundle（如果有设置的话）
      await initLiveUpdate()

      this.logger.info('Android 更新策略初始化成功')
    } catch (error) {
      this.logger.error('Android 更新策略初始化失败', error)

      // 使用统一错误处理器记录错误，但不中断应用启动
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false, // 不显示错误提示，避免影响用户体验
        context: {
          component: 'AndroidUpdateStrategy',
          action: 'initialize'
        }
      })
    }
  }

  /**
   * 检查并应用更新
   * 从 Supabase 检查是否有新版本，如果有则提示用户并执行更新流程
   *
   * @param silent - 是否静默检查（不显示"已是最新版本"提示）
   *                 默认为 true，静默检查
   * @returns Promise<void> 更新检查完成的 Promise
   */
  async checkAndApplyUpdate(silent: boolean = true): Promise<void> {
    try {
      this.logger.info('开始检查 Android APP 更新', {silent})

      // 显示检查更新的加载提示（仅非静默模式）
      if (!silent) {
        Taro.showLoading({
          title: '正在检查更新...',
          mask: true // 显示遮罩层，防止用户操作
        })
      }

      // 从 Supabase 检查是否有新版本
      const result = await checkForH5Update()

      // 隐藏加载提示
      if (!silent) {
        Taro.hideLoading()
      }

      if (result.needsUpdate && result.versionInfo) {
        // 有新版本可用
        this.logger.info('发现新版本', {
          currentVersion: result.versionInfo.version,
          isForceUpdate: result.versionInfo.is_force_update
        })

        // 显示更新对话框
        await this.showUpdateDialog(result.versionInfo)
      } else {
        // 已是最新版本
        this.logger.debug('当前已是最新版本')

        // 非静默模式下提示用户
        if (!silent) {
          Taro.showToast({
            title: '已是最新版本',
            icon: 'success',
            duration: 2000 // 2秒后自动关闭
          })
        }
      }
    } catch (error) {
      this.logger.error('检查更新失败', error)

      // 隐藏可能存在的加载提示
      if (!silent) {
        Taro.hideLoading()
      }

      // 使用统一错误处理器
      enhancedErrorHandler.handleWithContext(error, {
        showToast: !silent, // 只在非静默模式下显示错误提示
        customMessage: '检查更新失败，请稍后重试',
        context: {
          component: 'AndroidUpdateStrategy',
          action: 'checkAndApplyUpdate',
          metadata: {silent}
        }
      })
    }
  }

  /**
   * 显示更新对话框
   * 根据版本信息显示更新提示，包括版本号和更新说明
   *
   * @param versionInfo - H5 版本信息对象
   * @private
   */
  private async showUpdateDialog(versionInfo: H5VersionInfo): Promise<void> {
    try {
      // 构建更新对话框的内容
      // 包含版本号和更新说明（如果有）
      const content = this.buildUpdateContent(versionInfo)

      // 使用原生 confirm 对话框
      // 注意：在 Taro 中，我们使用 Taro.showModal 来实现跨平台的对话框
      const result = await Taro.showModal({
        title: '发现新版本',
        content: content,
        showCancel: !versionInfo.is_force_update, // 强制更新时不显示取消按钮
        confirmText: '立即更新',
        cancelText: '稍后',
        confirmColor: '#667eea' // 使用品牌色
      })

      if (result.confirm) {
        // 用户点击"立即更新"按钮
        this.logger.info('用户确认更新')
        await this.downloadAndInstallUpdate(versionInfo)
      } else if (result.cancel) {
        // 用户点击"稍后"按钮（仅在非强制更新时可用）
        this.logger.info('用户选择稍后更新')
      }
    } catch (error) {
      this.logger.error('显示更新对话框失败', error)

      // 记录错误但不影响应用正常使用
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false,
        context: {
          component: 'AndroidUpdateStrategy',
          action: 'showUpdateDialog',
          metadata: {
            version: versionInfo.version,
            isForceUpdate: versionInfo.is_force_update
          }
        }
      })
    }
  }

  /**
   * 构建更新对话框的内容
   * 格式化版本号和更新说明
   *
   * @param versionInfo - H5 版本信息对象
   * @returns 格式化后的对话框内容字符串
   * @private
   */
  private buildUpdateContent(versionInfo: H5VersionInfo): string {
    // 基础内容：版本号
    let content = `版本 ${versionInfo.version}`

    // 如果有更新说明，添加到内容中
    if (versionInfo.release_notes) {
      content += `\n\n更新内容：\n${versionInfo.release_notes}`
    }

    // 如果是强制更新，添加提示
    if (versionInfo.is_force_update) {
      content += '\n\n此为重要更新，需要立即安装。'
    }

    return content
  }

  /**
   * 下载并安装更新
   * 调用 H5UpdateService 下载更新包并安装
   *
   * @param versionInfo - H5 版本信息对象
   * @private
   */
  private async downloadAndInstallUpdate(versionInfo: H5VersionInfo): Promise<void> {
    try {
      this.logger.info('开始下载更新', {
        version: versionInfo.version,
        url: versionInfo.h5_url
      })

      // 显示下载进度对话框
      Taro.showLoading({
        title: '准备下载...',
        mask: true // 显示遮罩层，防止用户操作
      })

      // 调用 applyH5Update 下载并安装更新
      // 传入进度回调函数以更新 UI
      const success = await applyH5Update(versionInfo.h5_url, versionInfo.version, this.handleUpdateProgress.bind(this))

      // 隐藏加载提示
      Taro.hideLoading()

      if (success) {
        // 更新成功
        this.logger.info('更新下载和安装成功')
        await this.showRestartPrompt()
      } else {
        // 更新失败
        this.logger.error('更新下载或安装失败')
        await this.showUpdateFailedDialog(versionInfo)
      }
    } catch (error) {
      this.logger.error('下载更新失败', error)

      // 隐藏可能存在的加载提示
      Taro.hideLoading()

      // 显示错误提示
      enhancedErrorHandler.handleWithContext(error, {
        showToast: true,
        customMessage: '更新下载失败，请检查网络后重试',
        context: {
          component: 'AndroidUpdateStrategy',
          action: 'downloadAndInstallUpdate',
          metadata: {
            version: versionInfo.version,
            url: versionInfo.h5_url
          }
        }
      })

      // 显示重试对话框
      await this.showUpdateFailedDialog(versionInfo)
    }
  }

  /**
   * 处理更新进度
   * 更新进度回调函数，用于更新 UI 显示
   *
   * @param progress - 更新进度对象
   * @private
   */
  private handleUpdateProgress(progress: UpdateProgress): void {
    // 记录进度日志
    this.logger.debug('更新进度', {
      percent: progress.percent,
      status: progress.status,
      message: progress.message
    })

    // 根据状态更新 UI
    switch (progress.status) {
      case 'downloading':
        // 下载中：显示下载进度
        Taro.showLoading({
          title: `下载中 ${Math.round(progress.percent)}%`,
          mask: true
        })
        break

      case 'installing':
        // 安装中：显示安装提示
        Taro.showLoading({
          title: '正在安装...',
          mask: true
        })
        break

      case 'complete':
        // 完成：隐藏加载提示（在 downloadAndInstallUpdate 中处理）
        this.logger.info('更新完成')
        break

      case 'error':
        // 错误：隐藏加载提示并显示错误信息（在 downloadAndInstallUpdate 中处理）
        this.logger.error('更新出错', progress.message)
        break
    }
  }

  /**
   * 显示重启提示
   * 更新完成后提示用户重启应用以应用更新
   *
   * @private
   */
  private async showRestartPrompt(): Promise<void> {
    try {
      // 显示重启提示对话框
      const result = await Taro.showModal({
        title: '更新完成',
        content: '更新已下载完成，请重启应用以应用新版本。',
        showCancel: false, // 不显示取消按钮，强制用户确认
        confirmText: '我知道了',
        confirmColor: '#667eea'
      })

      if (result.confirm) {
        this.logger.info('用户确认重启提示')
      }

      // 注意：Capacitor LiveUpdate 需要用户完全退出 APP 后重新打开才能应用更新
      // 我们不能强制重启 APP，只能提示用户手动重启
    } catch (error) {
      this.logger.error('显示重启提示失败', error)

      // 记录错误但不影响应用正常使用
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false,
        context: {
          component: 'AndroidUpdateStrategy',
          action: 'showRestartPrompt'
        }
      })
    }
  }

  /**
   * 显示更新失败对话框
   * 当更新失败时，提供重试或取消选项
   *
   * @param versionInfo - H5 版本信息对象
   * @private
   */
  private async showUpdateFailedDialog(versionInfo: H5VersionInfo): Promise<void> {
    try {
      // 显示更新失败对话框
      const result = await Taro.showModal({
        title: '更新失败',
        content: '更新下载失败，请检查网络连接后重试。',
        showCancel: !versionInfo.is_force_update, // 强制更新时不显示取消按钮
        confirmText: '重试',
        cancelText: '取消',
        confirmColor: '#667eea'
      })

      if (result.confirm) {
        // 用户点击"重试"按钮
        this.logger.info('用户选择重试更新')
        await this.downloadAndInstallUpdate(versionInfo)
      } else if (result.cancel) {
        // 用户点击"取消"按钮（仅在非强制更新时可用）
        this.logger.info('用户取消更新')
      }
    } catch (error) {
      this.logger.error('显示更新失败对话框失败', error)

      // 记录错误但不影响应用正常使用
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false,
        context: {
          component: 'AndroidUpdateStrategy',
          action: 'showUpdateFailedDialog',
          metadata: {
            version: versionInfo.version
          }
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
    return 'AndroidUpdateStrategy'
  }
}
