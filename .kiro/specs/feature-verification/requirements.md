# Requirements Document - 功能验证测试

## Introduction

本规范定义了车队管家系统的全面功能验证测试，旨在验证每个功能模块的可靠性、完整性和数据同步性。测试覆盖司机端、车队长端、老板端的所有核心功能。

## Glossary

- **System**: 车队管家系统
- **Verification_Test**: 功能验证测试
- **Data_Sync**: 数据同步验证
- **SSE**: Server-Sent Events 实时通信
- **API**: 后端接口
- **UI**: 前端用户界面

## Requirements

### Requirement 1: 认证系统验证

**User Story:** As a 测试人员, I want 验证认证系统的完整性, so that 确保用户登录和权限控制正常工作。

#### Acceptance Criteria

1. WHEN 用户使用正确的用户名密码登录 THEN THE System SHALL 返回有效的 JWT Token
2. WHEN 用户使用错误的密码登录 THEN THE System SHALL 返回 401 错误
3. WHEN 用户携带有效 Token 访问 /api/auth/me THEN THE System SHALL 返回当前用户信息
4. WHEN 用户携带过期 Token 访问 API THEN THE System SHALL 返回 401 错误
5. WHEN 用户修改密码 THEN THE System SHALL 验证旧密码并更新密码哈希

---

### Requirement 2: 用户管理验证

**User Story:** As a 测试人员, I want 验证用户管理功能的完整性, so that 确保用户 CRUD 操作正常工作。

#### Acceptance Criteria

1. WHEN 管理员创建新用户 THEN THE System SHALL 在数据库中创建用户记录并返回用户信息
2. WHEN 创建用户时用户名已存在 THEN THE System SHALL 返回 400 错误
3. WHEN 管理员更新用户信息 THEN THE System SHALL 更新数据库并推送 user_update 事件
4. WHEN 管理员禁用用户 THEN THE System SHALL 更新 is_active 状态并推送事件
5. WHEN 非超级管理员尝试操作老板账号 THEN THE System SHALL 返回 403 错误
6. WHEN 车队长更新司机信息 THEN THE System SHALL 验证仓库权限后更新

---

### Requirement 3: 仓库管理验证

**User Story:** As a 测试人员, I want 验证仓库管理功能的完整性, so that 确保仓库 CRUD 和分配功能正常。

#### Acceptance Criteria

1. WHEN 管理员创建仓库 THEN THE System SHALL 在数据库中创建仓库记录
2. WHEN 管理员分配用户到仓库 THEN THE System SHALL 创建关联记录并推送 assignment_update 事件
3. WHEN 查询仓库用户列表 THEN THE System SHALL 返回该仓库下所有用户
4. WHEN 查询仓库车辆列表 THEN THE System SHALL 返回该仓库下所有车辆
5. WHEN 司机访问非分配仓库 THEN THE System SHALL 返回 403 错误

---

### Requirement 4: 考勤打卡验证

**User Story:** As a 测试人员, I want 验证考勤打卡功能的完整性, so that 确保打卡记录准确。

#### Acceptance Criteria

1. WHEN 司机上班打卡 THEN THE System SHALL 创建考勤记录并记录 clock_in 时间
2. WHEN 司机下班打卡 THEN THE System SHALL 更新 clock_out 时间并计算工时
3. WHEN 司机未上班打卡就下班打卡 THEN THE System SHALL 返回 400 错误
4. WHEN 查询今日打卡状态 THEN THE System SHALL 返回正确的打卡状态
5. WHEN 查询考勤记录 THEN THE System SHALL 按日期范围返回记录

---

### Requirement 5: 计件功能验证

**User Story:** As a 测试人员, I want 验证计件功能的完整性, so that 确保计件录入和计算正确。

#### Acceptance Criteria

1. WHEN 司机录入计件 THEN THE System SHALL 创建记录并自动计算金额
2. WHEN 计件使用上楼单价 THEN THE System SHALL 使用 upstairs_price 计算金额
3. WHEN 计件使用分拣单价 THEN THE System SHALL 使用 sorting_price 计算金额
4. WHEN 计件记录创建 THEN THE System SHALL 推送 piece_work_update 事件给司机和车队长
5. WHEN 查询计件统计 THEN THE System SHALL 返回正确的汇总数据
6. WHEN 删除有计件记录的品类 THEN THE System SHALL 返回 400 错误

---

### Requirement 6: 请假审批验证

**User Story:** As a 测试人员, I want 验证请假审批功能的完整性, so that 确保请假流程正常。

#### Acceptance Criteria

1. WHEN 司机提交请假申请 THEN THE System SHALL 创建待审批记录
2. WHEN 车队长批准请假 THEN THE System SHALL 更新状态为 approved 并推送 leave_update 事件
3. WHEN 车队长拒绝请假 THEN THE System SHALL 更新状态为 rejected 并推送事件
4. WHEN 司机提交离职申请 THEN THE System SHALL 创建 leave_type=resign 的记录
5. WHEN 查询请假列表 THEN THE System SHALL 按状态和日期正确筛选

---

### Requirement 7: 车辆管理验证

**User Story:** As a 测试人员, I want 验证车辆管理功能的完整性, so that 确保车辆全生命周期管理正常。

#### Acceptance Criteria

1. WHEN 司机添加车辆 THEN THE System SHALL 创建状态为 reviewing 的车辆记录
2. WHEN 老板审核通过车辆 THEN THE System SHALL 更新状态为 active 并推送 vehicle_update 事件
3. WHEN 司机还车 THEN THE System SHALL 更新状态为 returned 并记录还车照片
4. WHEN 上传车辆证件 THEN THE System SHALL 创建证件记录
5. WHEN 补录照片 THEN THE System SHALL 更新 supplemented_photos 字段
6. WHEN 司机访问他人车辆 THEN THE System SHALL 返回 403 错误
7. WHEN 查询车辆使用历史 THEN THE System SHALL 返回提车/还车记录

---

### Requirement 8: 租赁信息验证

**User Story:** As a 测试人员, I want 验证车辆租赁功能的完整性, so that 确保租赁信息管理正常。

#### Acceptance Criteria

1. WHEN 更新租赁信息 THEN THE System SHALL 保存出租方、承租方、租金等信息
2. WHEN 设置租金缴纳日 THEN THE System SHALL 保存 rent_payment_day 字段
3. WHEN 查询租赁信息 THEN THE System SHALL 返回完整的租赁数据
4. WHEN 租赁到期提醒 THEN THE System SHALL 在到期前发送通知

---

### Requirement 9: 通知系统验证

**User Story:** As a 测试人员, I want 验证通知系统的完整性, so that 确保通知发送和接收正常。

#### Acceptance Criteria

1. WHEN 发送通知 THEN THE System SHALL 创建通知记录
2. WHEN 使用模板发送通知 THEN THE System SHALL 替换模板变量
3. WHEN 标记通知已读 THEN THE System SHALL 更新 is_read 状态
4. WHEN 查询未读数量 THEN THE System SHALL 返回正确的未读计数
5. WHEN 连接 SSE 流 THEN THE System SHALL 实时推送新通知

---

### Requirement 10: 定时通知验证

**User Story:** As a 测试人员, I want 验证定时通知功能的完整性, so that 确保定时任务正常执行。

#### Acceptance Criteria

1. WHEN 创建一次性定时通知 THEN THE System SHALL 在指定时间发送
2. WHEN 创建每日重复通知 THEN THE System SHALL 每天在指定时间发送
3. WHEN 创建每周重复通知 THEN THE System SHALL 在指定星期几发送
4. WHEN 取消定时通知 THEN THE System SHALL 更新状态为 cancelled
5. WHEN 查询调度器状态 THEN THE System SHALL 返回运行状态

---

### Requirement 11: SSE 实时数据同步验证

**User Story:** As a 测试人员, I want 验证 SSE 实时数据同步的完整性, so that 确保前端能实时接收更新。

#### Acceptance Criteria

1. WHEN 车辆审核状态变更 THEN THE System SHALL 推送 vehicle_update 事件给车主
2. WHEN 请假审批完成 THEN THE System SHALL 推送 leave_update 事件给申请人和车队长
3. WHEN 计件记录变更 THEN THE System SHALL 推送 piece_work_update 事件
4. WHEN 仓库分配变更 THEN THE System SHALL 推送 assignment_update 事件
5. WHEN 权限配置变更 THEN THE System SHALL 推送 permission_update 事件
6. WHEN 用户状态变更 THEN THE System SHALL 推送 user_update 事件

---

### Requirement 12: 权限系统验证

**User Story:** As a 测试人员, I want 验证权限系统的完整性, so that 确保权限控制正确。

#### Acceptance Criteria

1. WHEN 司机访问管理 API THEN THE System SHALL 返回 403 错误
2. WHEN 车队长访问非所辖仓库数据 THEN THE System SHALL 返回 403 错误
3. WHEN 老板访问所有数据 THEN THE System SHALL 允许访问
4. WHEN 超级管理员操作老板账号 THEN THE System SHALL 允许操作
5. WHEN 非超级管理员操作超级管理员账号 THEN THE System SHALL 返回 403 错误

---

### Requirement 13: 版本管理验证

**User Story:** As a 测试人员, I want 验证版本管理功能的完整性, so that 确保热更新正常工作。

#### Acceptance Criteria

1. WHEN 发布新版本 THEN THE System SHALL 创建版本记录
2. WHEN 检查更新 THEN THE System SHALL 返回最新版本信息
3. WHEN 版本为强制更新 THEN THE System SHALL 返回 update_type=required
4. WHEN 查询版本列表 THEN THE System SHALL 按版本号排序返回

---

### Requirement 14: OCR 识别验证

**User Story:** As a 测试人员, I want 验证 OCR 功能的完整性, so that 确保驾驶证识别正常。

#### Acceptance Criteria

1. WHEN 上传驾驶证图片 THEN THE System SHALL 调用百度 OCR 识别
2. WHEN OCR 识别成功 THEN THE System SHALL 返回姓名、证号等信息
3. WHEN OCR 服务不可用 THEN THE System SHALL 返回服务状态错误

---

### Requirement 15: 数据完整性验证

**User Story:** As a 测试人员, I want 验证数据完整性, so that 确保数据一致性和约束正确。

#### Acceptance Criteria

1. WHEN 删除有关联数据的记录 THEN THE System SHALL 返回约束错误或级联删除
2. WHEN 创建重复唯一键记录 THEN THE System SHALL 返回 400 错误
3. WHEN 外键引用不存在的记录 THEN THE System SHALL 返回 400 错误
4. WHEN 查询关联数据 THEN THE System SHALL 返回完整的关联信息
