/**
 * 更新策略接口
 * 定义了所有平台更新策略必须实现的统一接口
 *
 * @module services/updateStrategies/IUpdateStrategy
 */

/**
 * 更新策略接口
 * 各平台实现自己的更新逻辑，但必须遵循此接口规范
 */
export interface IUpdateStrategy {
  /**
   * 初始化更新策略
   * 在应用启动时调用，用于设置更新管理器、监听器等
   *
   * @returns Promise<void> 初始化完成的 Promise
   * @throws {Error} 当初始化失败时抛出错误
   */
  initialize(): Promise<void>

  /**
   * 检查并应用更新
   * 检查是否有新版本可用，如果有则提示用户并执行更新流程
   *
   * @param silent - 是否静默检查（不显示"已是最新版本"提示）
   *                 true: 静默检查，只在有更新时提示用户
   *                 false: 非静默检查，无论是否有更新都给用户反馈
   * @returns Promise<void> 更新检查完成的 Promise
   * @throws {Error} 当更新检查或应用失败时抛出错误
   */
  checkAndApplyUpdate(silent?: boolean): Promise<void>

  /**
   * 获取策略名称
   * 用于日志记录和调试，标识当前使用的更新策略
   *
   * @returns 策略名称字符串
   */
  getName(): string
}
