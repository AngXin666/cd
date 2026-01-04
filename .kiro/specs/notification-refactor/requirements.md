# 需求文档：通知系统重构

## 简介

重构现有通知系统，删除过度设计的功能（通知模板、定时通知），增强审批类通知的业务关联和状态流转能力。

## 术语表

- **Notification**: 通知消息实体
- **Approval_Notification**: 审批类通知，关联业务ID，有状态流转
- **ref_type**: 关联业务类型（leave/vehicle/resign）
- **ref_id**: 关联业务ID
- **Manager**: 车队长，管辖特定仓库的司机

## 需求

### 需求 1：清理过度设计

**用户故事**：作为开发者，我希望删除未使用的复杂功能，以降低代码维护成本。

#### 验收标准

1. THE System SHALL 删除 NotificationTemplate 模型和相关 CRUD 函数
2. THE System SHALL 删除 ScheduledNotification 模型和相关 CRUD 函数
3. THE System SHALL 删除 scheduler.py 调度器模块
4. THE System SHALL 删除 routers/scheduled.py 定时通知路由
5. THE System SHALL 删除 notifications.py 中的模板相关 API（约 10 个端点）
6. THE System SHALL 保留基础通知功能（创建、查询、标记已读、未读数量）
7. THE System SHALL 保留简化的 SSE 实时推送（仅 notification 事件类型）

### 需求 2：扩展通知模型

**用户故事**：作为系统，我需要通知能关联业务数据，以支持审批流程的状态追踪。

#### 验收标准

1. THE Notification 模型 SHALL 新增 ref_type 字段（关联类型：leave/vehicle/resign）
2. THE Notification 模型 SHALL 新增 ref_id 字段（关联业务ID）
3. THE Notification 模型 SHALL 新增 status 字段（审批状态：pending/approved/rejected/completed）
4. THE Notification 模型 SHALL 新增 updated_at 字段（更新时间）
5. WHEN 创建审批通知时，THE System SHALL 设置 ref_type、ref_id 和 status="pending"

### 需求 3：审批通知接收人规则

**用户故事**：作为管理员，我希望审批通知能发送给正确的人员，以确保审批流程顺畅。

#### 验收标准

1. WHEN 司机提交请假/离职申请时，THE System SHALL 通知管辖该司机的车队长
2. WHEN 司机提交请假/离职申请时，THE System SHALL 通知所有调度（peer_admin）
3. WHEN 司机提交请假/离职申请时，THE System SHALL 通知所有老板（boss）
4. WHEN 司机添加车辆申请审核时，THE System SHALL 通知管辖该司机的车队长
5. WHEN 司机添加车辆申请审核时，THE System SHALL 通知所有调度和老板
6. THE System SHALL 提供 get_managers_for_user(user_id) 函数获取管辖某用户的车队长列表

### 需求 4：审批完成通知

**用户故事**：作为相关人员，我希望在审批完成后收到通知，以了解审批结果。

#### 验收标准

1. WHEN 审批完成时，THE System SHALL 更新所有相关 pending 通知的状态为 approved/rejected
2. WHEN 审批完成时，THE System SHALL 通知申请人审批结果
3. WHEN 审批完成时，THE System SHALL 通知所有之前收到审批通知的管理员
4. THE 审批结果通知 SHALL 包含审批人信息和审批结果
5. THE System SHALL 提供 complete_approval() 函数统一处理审批完成逻辑

### 需求 5：简化通知发送函数

**用户故事**：作为开发者，我希望有简单的函数发送通知，以减少业务代码复杂度。

#### 验收标准

1. THE System SHALL 提供 create_approval_notification() 函数创建审批通知
2. THE create_approval_notification() 函数 SHALL 自动确定接收人（管辖车队长+调度+老板）
3. THE System SHALL 保留 notify_admins() 函数用于普通通知
4. THE System SHALL 保留 create_notification() 函数用于单条通知
5. THE System SHALL 保留 create_notifications_batch() 函数用于批量通知

### 需求 6：前端通知跳转

**用户故事**：作为用户，我希望点击通知能跳转到对应的业务详情页。

#### 验收标准

1. THE 通知响应 SHALL 包含 ref_type 和 ref_id 字段
2. WHEN ref_type="leave" 时，前端 SHALL 可跳转到请假详情页
3. WHEN ref_type="vehicle" 时，前端 SHALL 可跳转到车辆详情页
4. THE 通知响应 SHALL 包含 status 字段显示审批状态
