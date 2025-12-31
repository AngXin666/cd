# 考勤功能优化任务

## 概述

优化考勤统计功能，支持按仓库筛选考勤记录，并删除超级管理员角色。

## 任务列表

- [x] 1. 后端：修改 CRUD 函数支持按用户列表筛选
  - 修改 `get_attendance_records` 函数，新增 `user_ids` 参数
  - 文件：`fleet-manager/backend/crud.py`
  - _Requirements: 1.1_

- [x] 2. 后端：修改考勤列表 API 支持按仓库筛选
  - 修改 `GET /api/attendance` API，新增 `warehouse_id` 参数
  - 实现角色权限控制（司机/车队长/调度/老板）
  - 文件：`fleet-manager/backend/routers/attendance.py`
  - _Requirements: 1.1, 2.1_

- [x] 3. 测试：验证功能正常
  - 运行现有测试确保无回归
  - 验证 API 文档自动更新
  - _Requirements: AC1, AC2_

- [x] 4. 后端：删除超级管理员角色
  - [x] 4.1 修改 `models.py`：从 `UserRole` 枚举中删除 `SUPER_ADMIN`
  - [x] 4.2 修改 `crud.py`：删除默认超级管理员账号创建逻辑
  - [x] 4.3 修改 `helpers.py`：更新权限判断逻辑
  - [x] 4.4 修改路由文件：更新所有涉及 `SUPER_ADMIN` 的权限判断
  - [x] 4.5 修改测试文件：删除或更新超级管理员相关测试用例
  - [x] 4.6 全局搜索验证：确保没有遗漏的 `SUPER_ADMIN` 引用
  - _Requirements: 3.1_

## 技术方案

- 不修改数据库表结构
- 不新增 API，只修改现有 `GET /api/attendance` API
- 复用现有 `crud.get_warehouse_users()` 函数获取仓库用户

## 验收标准

### AC1：考勤列表按仓库筛选
- 考勤列表 API 支持 `warehouse_id` 参数
- 传入 `warehouse_id` 时，返回该仓库分配用户的考勤记录
- 不传 `warehouse_id` 时，保持原有逻辑

### AC2：角色权限控制
- 司机只能查看自己的考勤记录
- 车队长只能查看自己管理仓库的司机考勤
- 车队长指定非管理仓库时返回 403 错误
- 调度可以查看所有仓库的考勤
- 老板可以查看所有仓库的考勤

### AC3：超级管理员角色移除
- ✅ `UserRole` 枚举中不再包含 `SUPER_ADMIN`
- ✅ 所有权限判断代码中不再引用 `SUPER_ADMIN`
- ✅ 项目正常运行，无报错
- ✅ 所有 291 个测试通过
