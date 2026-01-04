# 代码优化设计文档

## Overview

本设计文档描述如何优化 fleet-manager 项目的代码结构，减少重复代码，提升可维护性。

## Architecture

### 当前架构问题

```
pages/
├── boss/
│   ├── attendance/index.vue (2434 行) ─┐
│   ├── approval/leave-detail.vue ──────┼── 高度重复
│   └── piece-work/detail.vue ──────────┘
├── manager/
│   ├── attendance/index.vue (2335 行) ─┐
│   ├── approval/leave-detail.vue ──────┼── 高度重复
│   └── piece-work/detail.vue ──────────┘
└── driver/
```

### 目标架构

```
components/
├── AttendancePage/          # 新增：考勤管理公共组件
│   ├── index.vue
│   └── attendance.scss
├── LeaveDetail/             # 新增：请假详情公共组件
│   └── index.vue
└── PieceWorkDetail/         # 新增：计件详情公共组件
    └── index.vue

pages/
├── boss/
│   ├── attendance/index.vue  # 简化为 <AttendancePage role="boss" />
│   └── approval/leave-detail.vue  # 简化为 <LeaveDetail />
├── manager/
│   ├── attendance/index.vue  # 简化为 <AttendancePage role="manager" />
│   └── approval/leave-detail.vue  # 简化为 <LeaveDetail />
└── driver/
```

## Components and Interfaces

### AttendancePage 组件

```typescript
interface AttendancePageProps {
  /** 用户角色：boss 显示所有仓库，manager 显示管辖仓库 */
  role: 'boss' | 'manager'
}
```

**角色差异处理：**

| 功能 | Boss | Manager |
|------|------|---------|
| 仓库数据来源 | 所有仓库 | 用户管辖的仓库（可多个） |
| 仓库切换器 | ✅ 显示 | ✅ 显示（修复原有 bug） |
| 其他功能 | 完全相同 | 完全相同 |

**修复说明：** 原 manager/attendance 页面错误地假设车队长只管辖一个仓库，实际上车队长可以被分配多个仓库。合并后的组件将统一使用仓库切换器。

### LeaveDetail 组件

```typescript
interface LeaveDetailProps {
  /** 请假申请 ID */
  leaveId: number
  /** 是否有审批权限 */
  canApprove?: boolean
}
```

## Data Models

无新增数据模型，复用现有类型。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: 功能等价性

*For any* 用户操作，重构后的组件行为应与原页面完全一致。

**Validates: Requirements 1.5, 2.3**

### Property 2: 样式一致性

*For any* UI 元素，重构后的视觉呈现应与原页面完全一致。

**Validates: Requirements 3.3**

## Error Handling

- 组件加载失败时显示错误提示
- 保持原有的错误处理逻辑不变

## Testing Strategy

### 验证方法

1. **视觉对比**：截图对比重构前后页面
2. **功能测试**：手动测试所有交互功能
3. **回归测试**：确保现有功能不受影响

### 测试用例

| 场景 | 预期结果 |
|------|----------|
| Boss 考勤页面 | 可切换多仓库，显示所有司机 |
| Manager 考勤页面 | 只显示管辖仓库，无切换器 |
| 请假详情审批 | 审批功能正常工作 |
