# 代码优化需求文档

## Introduction

本文档定义了 fleet-manager 前端代码优化的需求，目标是减少代码重复、提升可维护性和 IDE 性能。

## Glossary

- **Boss**: 老板角色，拥有全局管理权限
- **Manager**: 车队长角色，管理指定仓库的司机
- **Driver**: 司机角色，执行打卡、计件等操作
- **Component**: Vue 组件，可复用的 UI 单元

## 现状分析

### 已验证的重复代码

| 对比文件 | 行数 | 相似度 | 验证方法 |
|----------|------|--------|----------|
| boss/attendance vs manager/attendance | 2434 vs 2335 | 88.5% | diff 统计 |
| boss/approval/leave-detail vs manager/approval/leave-detail | 649 vs 634 | 96.6% | diff 统计 |
| boss/piece-work/detail vs manager/piece-work/detail | 690 vs 526 | 70% | diff 统计 |

### 大文件列表（>1000 行）

1. boss/attendance/index.vue - 2434 行
2. manager/attendance/index.vue - 2335 行
3. boss/users/index.vue - 2138 行
4. driver/piece-work/list.vue - 2003 行
5. manager/drivers/index.vue - 1919 行
6. driver/index/index.vue - 1580 行
7. driver/piece-work/entry.vue - 1445 行
8. driver/leave/apply.vue - 1406 行
9. driver/leave/list.vue - 1365 行
10. manager/stats/index.vue - 1358 行

## Requirements

### Requirement 1: 合并考勤管理页面

**User Story:** As a 开发者, I want 将 boss 和 manager 的考勤页面合并为一个可配置组件, so that 减少 88% 的重复代码。

#### Acceptance Criteria

1. THE System SHALL 创建 `components/AttendancePage/index.vue` 公共组件
2. THE System SHALL 通过 `role` prop 区分 boss 和 manager 的行为差异
3. WHEN role 为 boss THEN THE System SHALL 显示所有仓库的仓库切换器
4. WHEN role 为 manager THEN THE System SHALL 显示该车队长管辖的仓库切换器（支持多仓库）
5. THE System SHALL 保持原有功能完全不变

**注意：** 当前 manager/attendance 页面存在设计错误，假设车队长只管辖一个仓库，但实际上车队长可以被分配多个仓库。此重构需同时修复该问题。

### Requirement 2: 合并请假详情页面

**User Story:** As a 开发者, I want 将 boss 和 manager 的请假详情页面合并, so that 消除 97% 的重复代码。

#### Acceptance Criteria

1. THE System SHALL 创建 `components/LeaveDetail/index.vue` 公共组件
2. THE System SHALL 通过 props 传入请假数据和审批权限
3. THE System SHALL 保持原有审批功能不变

### Requirement 3: 提取样式到独立文件

**User Story:** As a 开发者, I want 将大型 Vue 文件的样式提取到独立 SCSS 文件, so that 减少单文件体积，提升 IDE 性能。

#### Acceptance Criteria

1. WHEN Vue 文件样式超过 500 行 THEN THE System SHALL 提取到独立 `.scss` 文件
2. THE System SHALL 在 Vue 文件中使用 `@import` 引入样式
3. THE System SHALL 保持样式作用域（scoped）不变

### Requirement 4: 拆分后端 crud.py

**User Story:** As a 开发者, I want 将 crud.py 按功能模块拆分, so that 提升代码可维护性。

#### Acceptance Criteria

1. THE System SHALL 创建 `crud/` 目录
2. THE System SHALL 按功能拆分为：users.py, warehouses.py, attendance.py, piece_work.py, leave.py, vehicles.py, notifications.py
3. THE System SHALL 在 `crud/__init__.py` 中统一导出所有函数
4. THE System SHALL 保持现有 API 调用方式不变

## 优先级

| 需求 | 优先级 | 预期收益 | 风险 |
|------|--------|----------|------|
| Requirement 1 | 高 | 减少 ~2300 行 | 中（功能复杂） |
| Requirement 2 | 高 | 减少 ~600 行 | 低 |
| Requirement 3 | 中 | 提升 IDE 性能 | 低 |
| Requirement 4 | 中 | 提升可维护性 | 低 |
