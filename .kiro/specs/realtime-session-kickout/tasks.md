# Implementation Plan

## 1. 创建会话实时监听模块

- [x] 1.1 创建 `src/utils/sessionRealtimeMonitor.ts` 文件
  - 创建 `SessionRealtimeMonitor` 类/模块
  - 实现 `start()` 方法：建立 Realtime 订阅
  - 实现 `stop()` 方法：取消订阅
  - 实现 `isMonitoring()` 方法：检查监听状态
  - 实现 `getConnectionStatus()` 方法：获取连接状态
  - 复用 `realtimeConnectionManager` 处理连接错误
  - _Requirements: 2.1, 2.4, 3.1, 3.2, 3.3_

- [x] 1.2 实现 session_token 变化监听逻辑
  - 订阅 `users` 表的 UPDATE 事件
  - 过滤当前用户的记录变化
  - 提取 `session_token` 字段变化
  - _Requirements: 2.1, 2.2_

- [x] 1.3 实现 token 比较和踢出触发逻辑
  - 比较数据库 token 与本地 token
  - 不匹配时调用踢出回调
  - 处理 token 为 null 的边界情况
  - _Requirements: 2.2, 2.3_

- [ ]* 1.4 编写属性测试：Token 不匹配触发踢出
  - **Property 2: Token Mismatch Triggers Kickout**
  - **Validates: Requirements 2.2, 2.3**

## 2. 集成到会话管理器

- [x] 2.1 扩展 `src/utils/sessionManager.ts`
  - 添加 `startRealtimeMonitor()` 方法
  - 添加 `stopRealtimeMonitor()` 方法
  - 添加 `isRealtimeMonitorActive()` 方法
  - _Requirements: 2.1, 2.4_

- [x] 2.2 实现降级逻辑
  - 检测 WebSocket 连接状态
  - 连接失败时自动启动轮询
  - 连接恢复时停止轮询，恢复实时监听
  - _Requirements: 1.4, 3.4, 4.2_

- [ ]* 2.3 编写属性测试：WebSocket 失败降级到轮询
  - **Property 1: Fallback to Polling on WebSocket Failure**
  - **Validates: Requirements 1.4, 3.4, 4.2**

- [x] 2.4 实现网络错误处理
  - 网络错误时不触发踢出
  - 记录错误日志
  - 等待网络恢复
  - _Requirements: 4.3_

- [ ]* 2.5 编写属性测试：网络错误不强制退出
  - **Property 3: Network Errors Do Not Force Logout**
  - **Validates: Requirements 4.3**

## 3. 修改登录流程集成

- [x] 3.1 修改 `handleLoginSuccess` 函数
  - 登录成功后启动实时监听
  - 传入用户ID和本地 session token
  - 设置踢出回调函数
  - _Requirements: 2.1_

- [x] 3.2 修改退出登录流程
  - 退出时停止实时监听
  - 确保资源正确清理
  - _Requirements: 2.4_

## 4. Checkpoint - 确保所有测试通过

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 5. 优化和完善

- [x] 5.1 添加连接状态日志
  - 记录 Realtime 连接状态变化
  - 记录降级和恢复事件
  - 使用现有 logger 模块
  - _Requirements: 3.3_

- [x] 5.2 处理边界情况
  - 处理用户未登录时的调用
  - 处理重复启动监听的情况
  - 处理页面切换时的监听状态
  - _Requirements: 4.1, 4.4_

- [ ]* 5.3 编写单元测试
  - 测试 token 比较逻辑
  - 测试降级逻辑
  - 测试错误处理
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## 6. Final Checkpoint - 确保所有测试通过

- [x] 6. Final Checkpoint
  - ✅ 所有测试通过（2 个测试文件，30 个测试用例）
  - ✅ TypeScript 编译无错误
  - ✅ 核心功能已实现并集成
