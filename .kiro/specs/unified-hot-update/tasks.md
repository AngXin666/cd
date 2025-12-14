# 统一热更新系统实现任务列表

## 任务概述

本任务列表将指导实现统一热更新系统，移除无效的旧代码，并创建平台自适应的更新服务。

## 实现任务

- [x] 1. 移除旧的热更新代码
  - 删除 `src/utils/hotUpdate.ts` 文件
  - 从 `src/app.tsx` 中移除 `silentCheckUpdate` 的导入和调用
  - 搜索并移除项目中所有对旧热更新函数的引用
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. 创建更新策略接口和基础结构
  - 创建 `src/services/updateStrategies/` 目录
  - 创建 `IUpdateStrategy.ts` 接口文件，定义更新策略的统一接口
  - 定义 `initialize()`, `checkAndApplyUpdate()`, `getName()` 方法
  - _Requirements: 4.5_

- [x] 3. 实现小程序更新策略
  - 创建 `src/services/updateStrategies/weappUpdateStrategy.ts`
  - 实现 `WeappUpdateStrategy` 类，使用 `Taro.getUpdateManager()`
  - 在 `initialize()` 中设置更新事件监听器（`onCheckForUpdate`, `onUpdateReady`, `onUpdateFailed`）
  - 在 `onUpdateReady` 中使用 `Taro.showModal` 提示用户重启
  - 用户确认后调用 `updateManager.applyUpdate()`
  - 添加完整的 JSDoc 注释
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 3.1 编写小程序更新策略的属性测试
  - **Property 2: Mini Program Update Manager Initialization**
  - **Validates: Requirements 2.1**
  - 测试在小程序环境中，`Taro.getUpdateManager()` 被正确调用
  - 测试更新事件监听器被正确设置

- [x] 4. 实现 Android 更新策略
  - 创建 `src/services/updateStrategies/androidUpdateStrategy.ts`
  - 实现 `AndroidUpdateStrategy` 类，复用 `h5UpdateService`
  - 在 `initialize()` 中调用 `initLiveUpdate()`
  - 在 `checkAndApplyUpdate()` 中调用 `checkForH5Update()`
  - 当有更新时，使用原生 `confirm` 和 `alert` 显示更新对话框
  - 调用 `applyH5Update()` 下载和安装更新
  - 处理强制更新逻辑（不显示取消按钮）
  - 添加完整的 JSDoc 注释
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 4.1 编写 Android 更新策略的属性测试
  - **Property 3: Update Ready Prompt**
  - **Validates: Requirements 3.5**
  - 测试更新完成后显示重启提示
  - **Property 4: Force Update Enforcement**
  - **Validates: Requirements 3.3**
  - 测试强制更新时无法取消

- [x] 5. 实现 H5 更新策略
  - 创建 `src/services/updateStrategies/h5UpdateStrategy.ts`
  - 实现 `H5UpdateStrategy` 类，提供空实现
  - 在 `checkAndApplyUpdate()` 中仅记录日志，不执行任何操作
  - 添加完整的 JSDoc 注释
  - _Requirements: 4.4_

- [x] 6. 创建统一更新服务
  - 创建 `src/services/unifiedUpdateService.ts`
  - 实现 `UnifiedUpdateService` 类
  - 使用 `getCurrentPlatform()` 检测当前平台
  - 根据平台创建对应的策略实例（WeappUpdateStrategy, AndroidUpdateStrategy, H5UpdateStrategy）
  - 实现 `initialize()` 方法，调用策略的初始化
  - 实现 `checkAndApplyUpdate(silent)` 方法，调用策略的更新检查
  - 添加完整的 JSDoc 注释和文件说明
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 6.1 编写统一更新服务的属性测试
  - **Property 1: Platform Detection Consistency**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  - 测试平台检测的一致性
  - 测试策略选择的正确性
  - **Property 5: Platform-Specific Logic Isolation**
  - **Validates: Requirements 2.4, 3.6**
  - 测试平台逻辑隔离

- [x] 7. 集成错误处理和日志
  - 在所有策略中使用 `try-catch` 包裹异步操作
  - 使用 `createLogger()` 创建日志记录器
  - 使用 `enhancedErrorHandler.handleWithContext()` 处理错误
  - 确保错误不会导致应用崩溃
  - 为所有关键操作添加日志（初始化、检查更新、下载、安装、错误）
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3_

- [ ]* 7.1 编写错误处理的属性测试
  - **Property 9: Error Handling Without Crash**
  - **Validates: Requirements 7.1, 7.4**
  - 测试各种错误场景下应用不崩溃
  - **Property 12: Logging Integration**
  - **Validates: Requirements 8.1, 8.3**
  - 测试日志记录的完整性
  - **Property 13: Error Handler Integration**
  - **Validates: Requirements 8.2**
  - 测试错误处理器的集成

- [x] 8. 更新应用入口文件
  - 修改 `src/app.tsx`
  - 移除旧的热更新相关代码（`silentCheckUpdate` 导入和调用）
  - 导入 `UnifiedUpdateService`
  - 在 `useEffect` 中创建服务实例并调用 `initialize()`
  - 延迟 500ms 后调用 `checkAndApplyUpdate(true)` 进行静默检查
  - 移除开发环境的热更新检查逻辑
  - 更新文件注释
  - _Requirements: 1.2, 5.1, 5.2, 5.4_

- [ ]* 8.1 编写应用启动流程的单元测试
  - 测试统一更新服务在应用启动时被初始化
  - 测试静默更新检查被触发
  - 测试开发模式下跳过更新检查
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 9. 添加开发模式检测
  - 在 `UnifiedUpdateService` 中检查 `process.env.NODE_ENV`
  - 如果是 `development` 模式，跳过自动更新检查
  - 记录日志说明跳过原因
  - _Requirements: 5.4_

- [ ]* 9.1 编写开发模式检测的属性测试
  - **Property 14: Development Mode Skip**
  - **Validates: Requirements 5.4**
  - 测试开发模式下跳过更新检查

- [x] 10. 验证和清理
  - 运行 `npm run lint` 确保代码规范
  - 搜索项目中是否还有对 `hotUpdate.ts` 的引用
  - 确认所有文件都有完整的注释
  - 确认所有函数都有 JSDoc 注释
  - 运行所有测试确保通过
  - _Requirements: 1.3_

- [x] 11. 平台测试
  - 在微信小程序开发工具中测试小程序更新流程
  - 在 Android 设备或模拟器中测试 APP 更新流程
  - 在浏览器中测试 H5 环境（确保不执行更新逻辑）
  - 测试强制更新和可选更新两种场景
  - 测试错误处理（网络错误、下载失败等）
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.4_

- [x] 12. 文档更新
  - 更新项目 README，说明新的热更新机制
  - 添加使用说明（如何配置、如何测试）
  - 记录小程序和 Android APP 的不同更新方式
  - 更新 CHANGELOG 记录此次重构
  - _Requirements: All_

## 注意事项

### 代码注释要求（强制）
- **所有文件必须有文件说明注释**
- **所有函数必须有 JSDoc 注释**（包括参数、返回值、异常）
- **所有复杂逻辑必须有行内注释**
- **所有魔法数字必须注释说明含义**

### 文档同步要求（强制）
- **代码变更时必须立即更新相关文档**
- **不允许先改代码后补文档**
- **每个任务完成时必须确认文档已同步**

### 测试策略
- **实现优先**：先实现核心功能，确保功能正常工作
- **测试跟进**：功能实现后立即编写测试
- **可选测试**：标记为 `*` 的测试任务为可选，可以根据时间和需求决定是否实现

### 平台差异
- **小程序**：使用微信官方 `wx.getUpdateManager()`，无需管理版本
- **Android APP**：使用 Capacitor LiveUpdate，需要从 Supabase 获取版本信息
- **H5**：不支持热更新，提供空实现

### 错误处理
- 所有异步操作必须使用 `try-catch`
- 错误必须记录日志但不能导致应用崩溃
- 用户可见的错误必须显示友好的错误消息

### 性能考虑
- 更新检查不应阻塞应用启动
- 延迟 500ms 后再检查更新
- 开发模式下跳过自动更新检查
