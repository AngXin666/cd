# Implementation Plan: 通知系统全面测试

## Overview

本任务列表定义了通知系统的全面测试实现计划，包括单元测试、集成测试和端到端测试。重点验证审批类通知在审批完成后是否正确更新原通知状态。

## Tasks

- [x] 1. 创建测试基础设施
  - [x] 1.1 创建测试数据工厂 `tests/test_helpers.py`
    - 实现 `create_test_user()` 函数创建各角色用户
    - 实现 `create_test_warehouse()` 函数创建仓库
    - 实现 `assign_user_to_warehouse()` 函数分配用户到仓库
    - 实现 `create_test_vehicle()` 函数创建车辆
    - _Requirements: 测试基础设施_

  - [x] 1.2 创建通知断言工具
    - 实现 `assert_notification_exists()` 断言通知存在
    - 实现 `assert_notification_status()` 断言通知状态
    - 实现 `get_notifications_by_ref()` 按 ref_type/ref_id 查询通知
    - _Requirements: 测试基础设施_

- [x] 2. 通知 CRUD 单元测试
  - [x] 2.1 测试 `create_notification` 函数
    - 测试创建基本通知
    - 测试创建带 ref_type/ref_id/status 的审批通知
    - 验证通知字段正确保存
    - _Requirements: 8.1_

  - [x] 2.2 测试 `create_notifications_batch` 函数
    - 测试批量创建通知给多个用户
    - 验证所有用户都收到通知
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 2.3 测试 `get_managers_for_user` 函数
    - 测试获取管辖某司机的车队长列表
    - 测试司机没有分配仓库时返回空列表
    - 测试司机分配多个仓库时返回所有车队长
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 2.4 测试 `create_approval_notification` 函数
    - 测试创建审批通知发送给车队长、调度、老板
    - 验证通知的 ref_type、ref_id、status 正确设置
    - _Requirements: 1.2, 2.2, 3.2_

  - [x] 2.5 测试 `complete_approval` 函数 (关键测试)
    - 测试审批完成后更新所有 pending 通知的 status
    - 测试审批完成后创建结果通知给所有相关人员
    - 验证 updated_at 时间戳被更新
    - _Requirements: 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4_

  - [x] 2.6 测试 `get_notifications` 函数
    - 测试获取用户通知列表
    - 测试按 is_read 过滤
    - 测试分页功能
    - 测试按创建时间倒序排列
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 2.7 测试 `mark_notification_as_read` 函数
    - 测试标记通知为已读
    - 验证 is_read 字段更新为 true
    - _Requirements: 8.2_

  - [x] 2.8 测试 `get_unread_count` 函数
    - 测试获取未读通知数量
    - 测试标记已读后数量减少
    - _Requirements: 8.3_

- [x] 3. 请假/离职通知集成测试
  - [x] 3.1 测试请假申请通知流程
    - 创建司机、车队长、调度、老板
    - 司机提交请假申请
    - 验证车队长、调度、老板都收到通知
    - 验证通知 ref_type="leave", status="pending"
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 测试请假审批通过后通知状态更新 (关键测试)
    - 创建请假申请和审批通知
    - 执行审批通过操作
    - 验证所有 pending 通知的 status 更新为 "approved"
    - 验证申请人和审批人都收到结果通知
    - _Requirements: 1.3, 1.5, 9.1, 9.2, 9.3, 9.4_

  - [x] 3.3 测试请假审批拒绝后通知状态更新
    - 创建请假申请和审批通知
    - 执行审批拒绝操作
    - 验证所有 pending 通知的 status 更新为 "rejected"
    - 验证申请人和审批人都收到结果通知
    - _Requirements: 1.4, 1.5, 9.1, 9.2, 9.3, 9.4_

  - [x] 3.4 测试离职申请通知流程
    - 创建司机、车队长、调度、老板
    - 司机提交离职申请
    - 验证车队长、调度、老板都收到通知
    - 验证通知 ref_type="resign", status="pending"
    - _Requirements: 2.1, 2.2_

  - [x] 3.5 测试离职审批后通知状态更新
    - 创建离职申请和审批通知
    - 执行审批操作
    - 验证所有 pending 通知的 status 正确更新
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 4. 车辆通知集成测试
  - [x] 4.1 测试车辆添加通知流程
    - 创建司机、车队长、调度、老板
    - 司机添加新车辆
    - 验证车队长、调度、老板都收到审核通知
    - 验证通知 ref_type="vehicle", status="pending"
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 测试车辆审核通过后通知状态更新 (关键测试)
    - 创建车辆和审核通知
    - 执行审核通过操作
    - 验证所有 pending 通知的 status 更新为 "approved"
    - 验证车辆所有者和审批人都收到结果通知
    - _Requirements: 3.3, 3.5, 9.1, 9.2, 9.3, 9.4_

  - [x] 4.3 测试车辆审核拒绝后通知状态更新
    - 创建车辆和审核通知
    - 执行审核拒绝操作
    - 验证所有 pending 通知的 status 更新为 "rejected"
    - _Requirements: 3.4, 3.5_

  - [x] 4.4 测试车辆分配通知
    - 创建车辆和目标司机
    - 执行车辆分配操作
    - 验证目标司机收到分配通知
    - 验证通知内容包含车牌号
    - _Requirements: 7.1, 7.2_

- [x] 5. 用户管理通知集成测试
  - [x] 5.1 测试司机类型变更通知
    - 创建司机用户
    - 修改司机的 driver_type
    - 验证司机收到类型变更通知
    - 验证通知 ref_type="driver_type_change"
    - 验证通知内容包含新类型名称
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 测试用户仓库分配通知
    - 创建用户和仓库
    - 给用户分配仓库
    - 验证用户收到仓库分配通知
    - 验证通知 ref_type="warehouse_assignment"
    - 验证通知内容包含仓库名称列表
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.3 测试仓库用户分配通知
    - 创建仓库和多个用户
    - 将用户分配到仓库
    - 验证每个用户都收到分配通知
    - 验证通知内容包含仓库名称
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. API 端到端测试
  - [x] 6.1 测试请假 API 通知流程
    - POST /api/leave 创建请假申请
    - 验证通知已创建
    - PUT /api/leave/{id}/approve 审批
    - 验证通知状态已更新
    - GET /api/notifications 验证通知列表
    - _Requirements: 1.1-1.5, 10.1_

  - [x] 6.2 测试车辆 API 通知流程
    - POST /api/vehicles 添加车辆
    - 验证审核通知已创建
    - PUT /api/vehicles/{id}/review 审核
    - 验证通知状态已更新
    - _Requirements: 3.1-3.5_

  - [x] 6.3 测试用户管理 API 通知流程
    - PUT /api/users/{id} 修改司机类型
    - 验证类型变更通知已创建
    - POST /api/users/{id}/warehouses 分配仓库
    - 验证仓库分配通知已创建
    - _Requirements: 4.1-4.3, 5.1-5.3_

  - [x] 6.4 测试仓库管理 API 通知流程
    - POST /api/warehouses/{id}/assign 分配用户
    - 验证每个用户都收到通知
    - _Requirements: 6.1-6.3_

- [x] 7. Checkpoint - 确保所有测试通过
  - 运行所有测试: `pytest tests/test_notifications*.py -v`
  - 确保所有测试通过
  - 如有问题，询问用户

- [x] 8. 边界条件和异常测试
  - [x] 8.1 测试无管辖关系时的通知
    - 司机没有分配仓库时提交申请
    - 验证只有调度和老板收到通知
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 8.2 测试重复审批
    - 对已审批的申请再次审批
    - 验证返回错误，不创建新通知
    - _Requirements: 错误处理_

  - [x] 8.3 测试通知查询边界条件
    - 测试空通知列表
    - 测试分页边界（skip 超出范围）
    - _Requirements: 10.1, 10.4_

- [x] 9. Final Checkpoint - 确保所有测试通过
  - 运行完整测试套件
  - 生成测试覆盖率报告
  - 确保所有测试通过，如有问题询问用户

## Notes

- 任务标记为 `*` 的为可选任务，可跳过以加快 MVP 开发
- 每个任务都引用了具体的需求以便追溯
- Checkpoint 任务用于确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界条件
- **关键测试**: 标记为"关键测试"的任务是验证审批后通知状态更新的核心测试，必须通过
