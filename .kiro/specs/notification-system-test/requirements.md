# Requirements Document

## Introduction

本文档定义了车队管理系统通知功能的全面测试需求。通知系统是系统的核心功能之一，涵盖审批流程通知、状态变更通知、仓库分配通知等多种场景。测试目标是确保所有通知场景正确触发、通知内容准确、审批后原通知状态正确更新。

## Glossary

- **Notification_System**: 通知系统，负责创建、发送、更新通知消息
- **Approval_Notification**: 审批类通知，包含 ref_type、ref_id、status 字段用于关联业务
- **SSE_Event**: Server-Sent Events 实时推送事件
- **Manager**: 车队长角色用户
- **Dispatcher**: 调度角色用户
- **Boss**: 老板角色用户
- **Driver**: 司机角色用户

## Requirements

### Requirement 1: 请假申请通知

**User Story:** As a 管理员, I want to 收到司机请假申请通知, so that 我可以及时审批请假申请

#### Acceptance Criteria

1. WHEN 司机提交请假申请 THEN Notification_System SHALL 创建通知发送给管辖该司机的车队长、调度和老板
2. WHEN 请假申请被创建 THEN Notification_System SHALL 设置通知的 ref_type 为 "leave"，ref_id 为申请ID，status 为 "pending"
3. WHEN 请假申请被批准 THEN Notification_System SHALL 更新所有相关 pending 通知的 status 为 "approved"
4. WHEN 请假申请被拒绝 THEN Notification_System SHALL 更新所有相关 pending 通知的 status 为 "rejected"
5. WHEN 请假审批完成 THEN Notification_System SHALL 创建结果通知发送给申请人和所有相关审批人

### Requirement 2: 离职申请通知

**User Story:** As a 管理员, I want to 收到司机离职申请通知, so that 我可以及时处理离职流程

#### Acceptance Criteria

1. WHEN 司机提交离职申请 THEN Notification_System SHALL 创建通知发送给管辖该司机的车队长、调度和老板
2. WHEN 离职申请被创建 THEN Notification_System SHALL 设置通知的 ref_type 为 "resign"，ref_id 为申请ID，status 为 "pending"
3. WHEN 离职申请被批准 THEN Notification_System SHALL 更新所有相关 pending 通知的 status 为 "approved"
4. WHEN 离职申请被拒绝 THEN Notification_System SHALL 更新所有相关 pending 通知的 status 为 "rejected"
5. WHEN 离职审批完成 THEN Notification_System SHALL 创建结果通知发送给申请人和所有相关审批人

### Requirement 3: 车辆审核通知

**User Story:** As a 管理员, I want to 收到新车辆审核通知, so that 我可以及时审核车辆信息

#### Acceptance Criteria

1. WHEN 司机添加新车辆 THEN Notification_System SHALL 创建通知发送给管辖该司机的车队长、调度和老板
2. WHEN 车辆审核申请被创建 THEN Notification_System SHALL 设置通知的 ref_type 为 "vehicle"，ref_id 为车辆ID，status 为 "pending"
3. WHEN 车辆审核通过 THEN Notification_System SHALL 更新所有相关 pending 通知的 status 为 "approved"
4. WHEN 车辆审核拒绝 THEN Notification_System SHALL 更新所有相关 pending 通知的 status 为 "rejected"
5. WHEN 车辆审核完成 THEN Notification_System SHALL 创建结果通知发送给车辆所有者和所有相关审批人

### Requirement 4: 司机类型变更通知

**User Story:** As a 司机, I want to 收到司机类型变更通知, so that 我可以了解自己的类型变化

#### Acceptance Criteria

1. WHEN 管理员修改司机的 driver_type THEN Notification_System SHALL 创建通知发送给被修改的司机
2. WHEN 司机类型变更通知被创建 THEN Notification_System SHALL 设置通知的 ref_type 为 "driver_type_change"
3. WHEN 司机类型变更通知被创建 THEN Notification_System SHALL 在通知内容中包含新的司机类型名称

### Requirement 5: 仓库分配通知（用户维度）

**User Story:** As a 用户, I want to 收到仓库分配变更通知, so that 我可以了解自己被分配到哪些仓库

#### Acceptance Criteria

1. WHEN 管理员给用户分配仓库 THEN Notification_System SHALL 创建通知发送给被分配的用户
2. WHEN 仓库分配通知被创建 THEN Notification_System SHALL 设置通知的 ref_type 为 "warehouse_assignment"
3. WHEN 仓库分配通知被创建 THEN Notification_System SHALL 在通知内容中包含所有被分配的仓库名称

### Requirement 6: 仓库分配通知（仓库维度）

**User Story:** As a 用户, I want to 收到被分配到仓库的通知, so that 我可以了解自己的工作地点变化

#### Acceptance Criteria

1. WHEN 管理员将用户分配到仓库 THEN Notification_System SHALL 创建通知发送给每个被分配的用户
2. WHEN 仓库用户分配通知被创建 THEN Notification_System SHALL 设置通知的 ref_type 为 "warehouse_assignment"
3. WHEN 仓库用户分配通知被创建 THEN Notification_System SHALL 在通知内容中包含被分配到的仓库名称

### Requirement 7: 车辆分配通知

**User Story:** As a 司机, I want to 收到车辆分配通知, so that 我可以了解分配给我的车辆信息

#### Acceptance Criteria

1. WHEN 管理员将车辆分配给司机 THEN Notification_System SHALL 创建通知发送给目标司机
2. WHEN 车辆分配通知被创建 THEN Notification_System SHALL 在通知内容中包含车辆车牌号

### Requirement 8: 通知状态管理

**User Story:** As a 用户, I want to 管理我的通知状态, so that 我可以追踪已读和未读通知

#### Acceptance Criteria

1. WHEN 通知被创建 THEN Notification_System SHALL 设置 is_read 为 false
2. WHEN 用户标记通知为已读 THEN Notification_System SHALL 更新 is_read 为 true
3. WHEN 查询未读通知数量 THEN Notification_System SHALL 返回正确的未读数量

### Requirement 9: 审批通知状态同步

**User Story:** As a 系统, I want to 确保审批完成后原通知状态正确更新, so that 通知状态与业务状态保持一致

#### Acceptance Criteria

1. WHEN 审批完成 THEN Notification_System SHALL 查找所有 ref_type 和 ref_id 匹配且 status 为 "pending" 的通知
2. WHEN 审批完成 THEN Notification_System SHALL 将匹配的通知 status 更新为审批结果（approved/rejected）
3. WHEN 审批完成 THEN Notification_System SHALL 更新匹配通知的 updated_at 时间戳
4. WHEN 审批完成 THEN Notification_System SHALL 创建新的结果通知发送给所有相关人员

### Requirement 10: 通知查询功能

**User Story:** As a 用户, I want to 查询我的通知列表, so that 我可以查看所有通知消息

#### Acceptance Criteria

1. WHEN 用户查询通知列表 THEN Notification_System SHALL 返回该用户的所有通知
2. WHEN 用户按已读状态过滤 THEN Notification_System SHALL 只返回匹配状态的通知
3. WHEN 用户查询通知列表 THEN Notification_System SHALL 按创建时间倒序排列
4. WHEN 用户查询通知列表 THEN Notification_System SHALL 支持分页参数
