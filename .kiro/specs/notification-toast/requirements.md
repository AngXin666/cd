# Requirements Document

## Introduction

本功能为车队管理系统添加实时通知 Toast 弹窗功能。当用户收到新通知时（如审批结果、新申请等），系统会自动弹出 Toast 提示，让用户及时了解重要信息，无需手动刷新或进入通知中心查看。

## Glossary

- **Toast**: 一种轻量级的提示组件，在屏幕上短暂显示后自动消失
- **Notification**: 系统通知，存储在数据库 notifications 表中
- **Realtime**: Supabase 提供的实时数据订阅功能
- **防抖（Debounce）**: 在一定时间内合并多次操作为一次执行

## Requirements

### Requirement 1

**User Story:** 作为司机，我想在申请被审批后收到 Toast 弹窗提示，以便及时了解审批结果。

#### Acceptance Criteria

1. WHEN 司机的请假申请被通过 THEN 系统 SHALL 弹出 Toast 显示"您的请假申请已通过"
2. WHEN 司机的请假申请被拒绝 THEN 系统 SHALL 弹出 Toast 显示"您的请假申请被拒绝"
3. WHEN 司机的离职申请被通过 THEN 系统 SHALL 弹出 Toast 显示"您的离职申请已通过"
4. WHEN 司机的离职申请被拒绝 THEN 系统 SHALL 弹出 Toast 显示"您的离职申请被拒绝"
5. WHEN 司机的车辆审核通过 THEN 系统 SHALL 弹出 Toast 显示"您的车辆审核已通过"
6. WHEN 司机的车辆需要补录 THEN 系统 SHALL 弹出 Toast 显示"您的车辆需要补录信息"

### Requirement 2

**User Story:** 作为管理员（老板/调度/车队长），我想在收到新申请时收到 Toast 弹窗提示，以便及时处理申请。

#### Acceptance Criteria

1. WHEN 管理员收到新的请假申请 THEN 系统 SHALL 弹出 Toast 显示包含司机完整信息的消息
2. WHEN 管理员收到新的离职申请 THEN 系统 SHALL 弹出 Toast 显示包含司机完整信息的消息
3. WHEN 管理员收到新的车辆审核请求 THEN 系统 SHALL 弹出 Toast 显示包含司机完整信息的消息

### Requirement 5

**User Story:** 作为管理员，我想在收到申请通知时看到完整的司机信息（仓库、类型、姓名），以便快速了解申请来源。

#### Acceptance Criteria

1. WHEN 单仓库司机提交申请 THEN 系统 SHALL 显示消息格式为"{仓库名} {司机类型} {姓名} 提交了{申请类型}申请"
2. WHEN 多仓库司机提交申请 THEN 系统 SHALL 显示消息格式为"多仓库 {司机类型} {姓名} 提交了{申请类型}申请"
3. WHEN 司机类型为纯司机 THEN 系统 SHALL 在消息中显示"纯司机"
4. WHEN 司机类型为带车司机 THEN 系统 SHALL 在消息中显示"带车司机"

### Requirement 6

**User Story:** 作为司机，我想在收到审批结果通知时看到审批人的角色和姓名，以便了解是谁审批了我的申请。

#### Acceptance Criteria

1. WHEN 审批通过 THEN 系统 SHALL 显示消息格式为"{审批人角色} {审批人姓名} 通过 {原始申请消息}"
2. WHEN 审批拒绝 THEN 系统 SHALL 显示消息格式为"{审批人角色} {审批人姓名} 拒绝 {原始申请消息}"
3. WHEN 老板审批 THEN 系统 SHALL 在消息中显示"老板"
4. WHEN 车队长审批 THEN 系统 SHALL 在消息中显示"车队长"
5. WHEN 调度审批 THEN 系统 SHALL 在消息中显示"调度"

### Requirement 7

**User Story:** 作为司机，我想在收到仓库分配或司机类型变更通知时看到操作者信息，以便了解是谁进行了操作。

#### Acceptance Criteria

1. WHEN 被分配仓库 THEN 系统 SHALL 显示消息格式为"您被 {操作者角色} {操作者姓名} 分配到 {仓库名} 仓库"
2. WHEN 被取消仓库分配 THEN 系统 SHALL 显示消息格式为"您被 {操作者角色} {操作者姓名} 取消分配 {仓库名} 仓库"
3. WHEN 司机类型被变更 THEN 系统 SHALL 显示消息格式为"您被 {操作者角色} {操作者姓名} 变更为{新司机类型}"

### Requirement 8

**User Story:** 作为车队长，我只想收到自己管辖仓库的司机申请通知，以便专注于自己负责的司机。

#### Acceptance Criteria

1. WHEN 司机提交申请 THEN 系统 SHALL 只通知管辖该司机所在仓库的车队长
2. WHEN 司机属于多个仓库 THEN 系统 SHALL 通知所有管辖这些仓库的车队长
3. WHEN 车队长不管辖该司机的任何仓库 THEN 系统 SHALL 不发送通知给该车队长
4. WHEN 老板或调度收到申请通知 THEN 系统 SHALL 不受仓库管辖限制，始终收到所有申请

### Requirement 3

**User Story:** 作为用户，我希望多条通知能够合并显示，避免频繁弹窗打扰。

#### Acceptance Criteria

1. WHEN 用户在 2 秒内收到多条同类型通知 THEN 系统 SHALL 合并为一条 Toast 显示数量
2. WHEN 用户在 2 秒内收到多条不同类型通知 THEN 系统 SHALL 合并显示所有类型
3. WHEN 用户同时收到请假和离职申请 THEN 系统 SHALL 显示"您有新的请假申请、离职申请"

### Requirement 4

**User Story:** 作为用户，我希望 Toast 弹窗在所有页面都能正常显示，无需停留在特定页面。

#### Acceptance Criteria

1. WHEN 用户登录后 THEN 系统 SHALL 自动订阅通知并在任意页面显示 Toast
2. WHEN 用户退出登录 THEN 系统 SHALL 取消通知订阅
3. WHEN 用户切换页面 THEN 系统 SHALL 保持通知订阅不中断
