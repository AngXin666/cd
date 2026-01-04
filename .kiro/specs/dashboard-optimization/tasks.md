# Implementation Plan: Dashboard Optimization

## Overview

本实现计划采用渐进式重构策略，提取共享组件和 Composable，减少三端首页的重复代码。

## Tasks

- [x] 1. 创建共享样式文件
  - 创建 `src/styles/home-common.scss`
  - 包含区块样式、加载动画、渐变背景、徽章样式
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. 创建 WelcomeCard 组件
  - 创建 `src/components/WelcomeCard/index.vue` 和 `types.ts`
  - 实现 title、subtitle 属性和默认插槽
  - 复制现有欢迎卡片样式
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. 创建 LogoutCard 组件
  - 创建 `src/components/LogoutCard/index.vue`
  - 复制现有 handleLogout 函数，保持逻辑完全一致
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. 创建 QuickActions 组件
  - 创建 `src/components/QuickActions/index.vue` 和 `types.ts`
  - 实现 actions 数组渲染、columns 列数配置、click 事件触发、徽章显示
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5. 更新组件导出
  - 更新 `src/components/index.ts`，导出 WelcomeCard、LogoutCard、QuickActions
  - _Requirements: 2.1, 3.1, 4.1_

- [x] 6. 扩展日期工具函数
  - 在 `src/utils/date.ts` 添加 getMonthStartStr 和 getDateRange 函数
  - _Requirements: 10.2, 10.4_

- [x] 7. 创建 useHomeStats Composable
  - 创建 `src/composables/useHomeStats.ts`
  - 封装 loadAttendanceStats、loadPieceWorkStats、loadAllStats 函数
  - 接收 warehouseId 参数，返回 stats 响应式对象和 loading 状态
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 8. 创建 useWarehouseLoader Composable
  - 创建 `src/composables/useWarehouseLoader.ts`
  - 封装 loadWarehouses 函数，支持 sortBy、includeDriverCount、includeAttendance 配置
  - 返回 warehouses、warehouseDataMap、warehouseDriverCountMap 等响应式对象
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 9. 重构司机端首页 ✅
  - 导入共享样式和组件（WelcomeCard、LogoutCard、QuickActions）
  - 替换欢迎卡片、快捷功能入口、退出登录
  - 使用日期工具函数替换重复的日期计算代码
  - 删除原有冗余样式和函数
  - 代码从 1581 行减少到 1304 行（减少 277 行）
  - _Requirements: 6.1, 6.5, 7.7, 10.5_

- [x] 10. 重构老板端首页
  - 导入共享样式和组件（WelcomeCard、LogoutCard）
  - 使用 useHomeStats 替换 loadAttendanceStats 和 loadPieceWorkStats
  - 使用 useWarehouseLoader 替换 loadWarehouses 函数
  - 删除原有冗余样式、函数和状态变量
  - _Requirements: 6.2, 6.5, 7.7, 8.7, 9.7_

- [x] 11. 重构车队长端首页
  - 导入共享样式和组件（WelcomeCard、LogoutCard、QuickActions）
  - 使用 useHomeStats 替换 loadAttendanceStats 和 loadPieceWorkStats
  - 使用 useWarehouseLoader 替换 loadWarehouses 函数
  - 删除原有冗余样式、函数和状态变量
  - _Requirements: 6.3, 6.5, 7.7, 8.7, 9.7_

- [x] 12. 验证和清理
  - 手动验证三端首页功能和 UI 正常
  - 清理未使用的导入和变量
  - 确认代码减少约 500+ 行
  - _Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

## Notes

- 本次优化是纯重构，不改变任何业务逻辑
- 不需要写自动化测试，手动验证 UI 即可
- 所有 API 调用参数和计算逻辑保持不变

## 预期效果

- 三端首页代码减少约 500+ 行
- 消除重复的样式、组件和业务逻辑代码
- 提升代码复用性和可维护性
