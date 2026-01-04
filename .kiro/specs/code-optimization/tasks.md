# Implementation Plan: 代码优化

## Overview

本计划将 fleet-manager 前端重复代码进行合并优化，重点是考勤管理和请假详情页面的组件化重构。

## Tasks

- [x] 1. 创建 AttendancePage 公共组件
  - [x] 1.1 分析 boss/attendance 和 manager/attendance 的差异点
    - 对比两个文件的具体差异
    - 确定需要通过 props 控制的功能点
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 创建 AttendancePage 组件骨架
    - 创建 `components/AttendancePage/index.vue`
    - 定义 `role: 'boss' | 'manager'` prop
    - 复制 boss/attendance 作为基础模板
    - _Requirements: 1.1_

  - [x] 1.3 实现角色差异逻辑
    - Boss: 获取所有仓库数据
    - Manager: 获取用户管辖的仓库数据（支持多仓库）
    - 统一使用仓库切换器组件
    - 修复原 manager 页面"只支持单仓库"的 bug
    - _Requirements: 1.3, 1.4_

  - [x] 1.4 提取样式到独立文件
    - 创建 `components/AttendancePage/attendance.scss`
    - 将样式代码移至独立文件
    - 在 Vue 文件中使用 `@import` 引入
    - _Requirements: 3.1, 3.2_

  - [x] 1.5 替换原有页面
    - 修改 `boss/attendance/index.vue` 使用 `<AttendancePage role="boss" />`
    - 修改 `manager/attendance/index.vue` 使用 `<AttendancePage role="manager" />`
    - _Requirements: 1.5_

- [x] 2. Checkpoint - 验证考勤页面重构
  - 手动测试 Boss 考勤页面功能
  - 手动测试 Manager 考勤页面功能
  - 确认仓库切换、搜索、筛选功能正常
  - 确保 Manager 多仓库切换正常工作

- [x] 3. 创建 LeaveDetail 公共组件
  - [x] 3.1 分析 boss 和 manager 请假详情页面差异
    - 对比两个文件的具体差异（预期 97% 相似）
    - _Requirements: 2.1_

  - [x] 3.2 创建 LeaveDetail 组件
    - 创建 `components/LeaveDetail/index.vue`
    - 定义 props: `leaveId`, `canApprove`
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 替换原有页面
    - 修改 `boss/approval/leave-detail.vue` 使用公共组件
    - 修改 `manager/approval/leave-detail.vue` 使用公共组件
    - _Requirements: 2.3_

- [x] 4. Checkpoint - 验证请假详情重构
  - 手动测试 Boss 请假详情和审批功能
  - 手动测试 Manager 请假详情和审批功能

- [x] 5. 拆分后端 crud.py
  - [x] 5.1 创建 crud 模块目录结构
    - 创建 `backend/crud/` 目录
    - 创建 `__init__.py` 文件
    - _Requirements: 4.1_

  - [x] 5.2 拆分用户和仓库相关函数
    - 创建 `crud/users.py` - 用户 CRUD 函数
    - 创建 `crud/warehouses.py` - 仓库 CRUD 函数
    - _Requirements: 4.2_

  - [x] 5.3 拆分业务相关函数
    - 创建 `crud/attendance.py` - 考勤 CRUD 函数
    - 创建 `crud/piece_work.py` - 计件 CRUD 函数
    - 创建 `crud/leave.py` - 请假 CRUD 函数
    - 创建 `crud/vehicles.py` - 车辆 CRUD 函数
    - 创建 `crud/notifications.py` - 通知 CRUD 函数
    - _Requirements: 4.2_

  - [x] 5.4 更新导入和统一导出
    - 在 `crud/__init__.py` 中统一导出所有函数
    - 更新所有 `from crud import ...` 的导入语句
    - _Requirements: 4.3, 4.4_

- [x] 6. Final Checkpoint - 完整回归测试
  - 运行后端测试套件
  - 手动测试前端所有重构页面
  - 确认无功能回归

## Notes

- 任务 1 和 3 是前端重构，优先级最高
- 任务 5 是后端重构，可独立进行
- 每个 Checkpoint 需要手动验证功能正常
- 重构过程中保持 Git 提交粒度小，便于回滚
