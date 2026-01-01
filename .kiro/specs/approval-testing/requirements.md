# Requirements Document

## Introduction

本规范定义了对请假申请、离职审批和车辆审批功能进行全面测试的需求。目标是验证这三个核心审批流程的功能完整性、权限控制、数据一致性和边界条件处理。

## Glossary

- **Leave_Application_System**: 请假申请系统，处理司机的请假和离职申请
- **Vehicle_Approval_System**: 车辆审批系统，处理车辆的添加、审核、提车、还车等操作
- **Approval_Workflow**: 审批工作流，包含待审批、已批准、已拒绝三种状态
- **Driver**: 司机角色，可以提交申请但无审批权限
- **Manager**: 车队长角色，具有审批权限
- **Boss**: 老板角色，具有最高审批权限
- **SSE_Event**: 服务器推送事件，用于实时通知审批状态变更

## Requirements

### Requirement 1: 请假申请提交功能

**User Story:** As a 司机, I want to 提交请假申请, so that 我可以申请休假并等待审批。

#### Acceptance Criteria

1. WHEN 司机提交有效的请假申请（包含开始日期、结束日期、请假原因）THEN Leave_Application_System SHALL 创建状态为 pending 的请假记录
2. WHEN 司机提交请假申请时结束日期早于开始日期 THEN Leave_Application_System SHALL 返回验证错误或接受申请（根据当前实现）
3. WHEN 未认证用户尝试提交请假申请 THEN Leave_Application_System SHALL 返回 401 或 403 错误
4. WHEN 司机提交请假申请成功 THEN Leave_Application_System SHALL 向管理员发送通知
5. WHEN 司机查询请假列表 THEN Leave_Application_System SHALL 仅返回该司机自己的申请记录

### Requirement 2: 离职申请提交功能

**User Story:** As a 司机, I want to 提交离职申请, so that 我可以正式申请离职并等待审批。

#### Acceptance Criteria

1. WHEN 司机提交离职申请（leave_type 为 resign）THEN Leave_Application_System SHALL 创建状态为 pending 的离职记录
2. WHEN 离职申请被批准 THEN Leave_Application_System SHALL 将状态更新为 approved 并记录审批人信息
3. WHEN 离职申请被拒绝 THEN Leave_Application_System SHALL 将状态更新为 rejected 并记录拒绝原因

### Requirement 3: 请假/离职审批功能

**User Story:** As a 管理员（车队长/老板）, I want to 审批请假和离职申请, so that 我可以管理团队的人员调度。

#### Acceptance Criteria

1. WHEN 车队长审批待处理的请假申请 THEN Leave_Application_System SHALL 更新申请状态并记录审批人
2. WHEN 老板审批待处理的请假申请 THEN Leave_Application_System SHALL 更新申请状态并记录审批人
3. WHEN 司机尝试审批请假申请 THEN Leave_Application_System SHALL 返回 403 权限错误
4. WHEN 审批不存在的请假申请 THEN Leave_Application_System SHALL 返回 404 错误
5. WHEN 审批已处理的申请（非 pending 状态）THEN Leave_Application_System SHALL 返回 400 错误
6. WHEN 审批完成 THEN Leave_Application_System SHALL 触发 SSE_Event 通知申请人和相关车队长

### Requirement 4: 车辆添加功能

**User Story:** As a 司机, I want to 添加车辆信息, so that 我可以登记我使用的车辆并等待审核。

#### Acceptance Criteria

1. WHEN 司机提交有效的车辆信息（车牌号、品牌、型号等）THEN Vehicle_Approval_System SHALL 创建状态为 reviewing 的车辆记录
2. WHEN 司机添加车辆时车牌号已存在 THEN Vehicle_Approval_System SHALL 返回错误
3. WHEN 未认证用户尝试添加车辆 THEN Vehicle_Approval_System SHALL 返回 401 或 403 错误
4. WHEN 司机查询车辆列表 THEN Vehicle_Approval_System SHALL 仅返回该司机自己的车辆

### Requirement 5: 车辆审核功能

**User Story:** As a 管理员（老板）, I want to 审核车辆申请, so that 我可以批准或拒绝司机的车辆登记。

#### Acceptance Criteria

1. WHEN 老板批准车辆审核 THEN Vehicle_Approval_System SHALL 将车辆状态更新为 active
2. WHEN 老板拒绝车辆审核 THEN Vehicle_Approval_System SHALL 将车辆状态更新为 rejected
3. WHEN 司机尝试审核车辆 THEN Vehicle_Approval_System SHALL 返回 403 权限错误
4. WHEN 审核不存在的车辆 THEN Vehicle_Approval_System SHALL 返回 404 错误

### Requirement 6: 车辆还车功能

**User Story:** As a 管理员, I want to 处理车辆还车, so that 我可以记录车辆的归还状态。

#### Acceptance Criteria

1. WHEN 执行还车操作 THEN Vehicle_Approval_System SHALL 将车辆状态更新为 returned
2. WHEN 还车时提供还车日期和原因 THEN Vehicle_Approval_System SHALL 记录还车信息

### Requirement 7: 审批权限控制

**User Story:** As a 系统管理员, I want to 确保审批权限控制正确, so that 只有授权用户才能执行审批操作。

#### Acceptance Criteria

1. WHEN 司机尝试审批请假申请 THEN Leave_Application_System SHALL 返回 403 权限错误
2. WHEN 司机尝试审核车辆 THEN Vehicle_Approval_System SHALL 返回 403 权限错误
3. WHEN 老板审批任意请假申请 THEN Leave_Application_System SHALL 成功更新状态
4. WHEN 老板审核任意车辆 THEN Vehicle_Approval_System SHALL 成功更新状态
