# 任务清单：通知系统重构

## 任务概览

| 任务 | 描述 | 预计代码变更 |
|------|------|-------------|
| Task 1 | 扩展 Notification 模型 | ~20 行 |
| Task 2 | 新增 CRUD 函数 | ~100 行 |
| Task 3 | 更新 Schema | ~10 行 |
| Task 4 | 更新请假/离职路由 | ~30 行 |
| Task 5 | 更新车辆路由 | ~30 行 |
| Task 6 | 删除过度设计代码 | -1500 行 |
| Task 7 | 清理主入口和导入 | ~20 行 |

## Task 1: 扩展 Notification 模型

- [x] 在 `models.py` 中修改 `Notification` 类
- [x] 添加 `ref_type` 字段（关联类型）
- [x] 添加 `ref_id` 字段（关联业务ID）
- [x] 添加 `status` 字段（审批状态）
- [x] 添加 `updated_at` 字段（更新时间）
- [x] 删除 `template_id` 外键和关联关系

## Task 2: 新增 CRUD 函数

- [x] 在 `crud.py` 中添加 `get_managers_for_user()` 函数
- [x] 在 `crud.py` 中添加 `create_approval_notification()` 函数
- [x] 在 `crud.py` 中添加 `complete_approval()` 函数
- [x] 更新 `create_notification()` 支持新字段
- [x] 更新 `create_notifications_batch()` 支持新字段

## Task 3: 更新 Schema

- [x] 在 `schemas.py` 中更新 `NotificationResponse`
- [x] 添加 `ref_type`、`ref_id`、`status`、`updated_at` 字段
- [x] 删除 `template_id` 字段

## Task 4: 更新请假/离职路由

- [x] 修改 `routers/leave.py` 中的申请提交逻辑
- [x] 使用 `create_approval_notification()` 替换 `notify_admins()`
- [x] 修改审批逻辑，添加 `complete_approval()` 调用

## Task 5: 更新车辆路由

- [x] 修改 `routers/vehicles.py` 中的车辆添加逻辑
- [x] 使用 `create_approval_notification()` 替换 `notify_admins()`
- [x] 修改审核逻辑，添加 `complete_approval()` 调用

## Task 6: 删除过度设计代码

### 6.1 删除模型
- [x] 删除 `models.py` 中的 `NotificationTemplate` 类
- [x] 删除 `models.py` 中的 `ScheduledNotification` 类
- [x] 删除 `enums.py` 中的 `RepeatType` 枚举
- [x] 删除 `enums.py` 中的 `ScheduledNotificationStatus` 枚举

### 6.2 删除 CRUD 函数
- [x] 删除 `crud.py` 中所有通知模板相关函数（约 200 行）
- [x] 删除 `crud.py` 中所有定时通知相关函数（约 400 行）
- [x] 删除 `crud.py` 中的 `init_default_notification_templates()` 函数
- [x] 修改 `init_default_data()` 删除模板初始化调用

### 6.3 删除路由
- [x] 删除 `routers/scheduled.py` 整个文件
- [x] 删除 `routers/notifications.py` 中的模板相关端点（约 350 行）

### 6.4 删除调度器
- [x] 删除 `scheduler.py` 整个文件

### 6.5 删除 Schema
- [x] 删除 `schemas.py` 中的模板相关类
- [x] 删除 `schemas.py` 中的定时通知相关类

## Task 7: 清理主入口和导入

- [x] 修改 `main.py` 删除 scheduler 导入和调用
- [x] 修改 `main.py` 删除 scheduled 路由注册
- [x] 清理 `crud.py` 中的无用导入
- [x] 清理 `models.py` 中的无用导入

## 执行顺序

建议按以下顺序执行：

1. **Task 1** - 先扩展模型，为后续功能做准备
2. **Task 3** - 更新 Schema 配合模型变更
3. **Task 2** - 添加新的 CRUD 函数
4. **Task 4 & 5** - 更新业务路由使用新函数
5. **Task 6** - 删除过度设计的代码
6. **Task 7** - 最后清理入口和导入

## 测试验证

每个任务完成后需要验证：

- [x] 后端服务能正常启动
- [x] 请假申请能正常发送通知给管辖车队长
- [x] 车辆审核能正常发送通知给管辖车队长
- [-] 审批完成后所有相关人员收到结果通知
- [ ] 通知列表正常显示 ref_type 和 status
- [ ] 删除的 API 端点返回 404
