/**
 * H5 更新策略
 * H5 环境不支持热更新，提供空实现
 *
 * 功能说明：
 * - H5 环境运行在浏览器中，无法进行热更新
 * - 用户刷新页面即可获取最新版本
 * - 此策略仅用于满足接口规范，不执行任何实际操作
 *
 * @module services/updateStrategies/h5UpdateStrategy
 */

import {createLogger} from '@/utils/logger'
import type {IUpdateStrategy} from './IUpdateStrategy'

/**
 * H5 更新策略类
 * 实现 IUpdateStrategy 接口，但不执行任何实际的更新操作
 *
 * H5 环境的特点：
 * - 运行在浏览器中，每次刷新页面都会加载最新代码
 * - 无需像 APP 或小程序那样进行热更新
 * - 此类主要用于统一接口，避免平台判断逻辑
 */
export class H5UpdateStrategy implements IUpdateStrategy {
  /**
   * 日志记录器
   * 用于记录策略调用情况，便于调试
   */
  private logger = createLogger('H5UpdateStrategy')

  /**
   * 初始化 H5 更新策略
   * H5 环境不需要初始化，此方法仅记录日志
   *
   * @returns Promise<void> 立即完成的 Promise
   */
  async initialize(): Promise<void> {
    this.logger.info('H5 更新策略初始化（无需执行任何操作）')

    // H5 环境不需要初始化更新管理器
    // 用户刷新页面即可获取最新版本
  }

  /**
   * 检查并应用更新
   * H5 环境不支持热更新，此方法仅记录日志
   *
   * 说明：
   * - H5 应用运行在浏览器中，每次刷新都会加载最新代码
   * - 无需像 APP 或小程序那样检查和下载更新包
   * - 如果需要提示用户刷新页面，应该在业务层实现
   *
   * @param silent - 是否静默检查（此参数在 H5 环境中无实际作用）
   * @returns Promise<void> 立即完成的 Promise
   */
  async checkAndApplyUpdate(silent: boolean = true): Promise<void> {
    this.logger.info('H5 环境不支持热更新，跳过更新检查', {silent})

    // H5 环境不执行任何更新操作
    // 用户刷新页面即可获取最新版本
  }

  /**
   * 获取策略名称
   * 用于日志记录和调试
   *
   * @returns 策略名称字符串
   */
  getName(): string {
    return 'H5UpdateStrategy'
  }
}
