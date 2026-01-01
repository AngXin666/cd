# Implementation Plan: 审批功能完整性测试

## Overview

本任务列表定义了对请假申请、离职审批和车辆审批功能进行全面测试的实现步骤。测试将基于现有的 pytest 测试框架，新增属性测试来验证核心功能的正确性。

## Tasks

- [x] 1. 创建审批功能属性测试文件
  - 在 `fleet-manager/backend/tests/` 目录下创建 `test_approval_properties.py`
  - 导入 hypothesis 库和现有测试工具
  - 设置测试基础配置
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 2. 实现请假/离职申请属性测试
  - [x] 2.1 实现 Property 1: 申请创建状态一致性
    - **Property 1: 申请创建状态一致性**
    - 使用 hypothesis 生成随机有效的请假数据
    - 验证创建后状态始终为 pending
    - **Validates: Requirements 1.1, 2.1**

  - [x] 2.2 实现 Property 2: 审批状态变更正确性
    - **Property 2: 审批状态变更正确性**
    - 生成随机的审批操作（approved/rejected）
    - 验证状态正确更新且审批人信息被记录
    - **Validates: Requirements 2.2, 2.3, 3.1, 3.2**

- [x] 3. 实现资源隔离属性测试
  - [x] 3.1 实现 Property 3: 司机资源隔离
    - **Property 3: 司机资源隔离**
    - 创建多个司机和多个申请/车辆
    - 验证每个司机只能查看自己的资源
    - **Validates: Requirements 1.5, 4.4**

- [x] 4. 实现车辆审批属性测试
  - [x] 4.1 实现 Property 4: 车辆初始状态一致性
    - **Property 4: 车辆初始状态一致性**
    - 使用 hypothesis 生成随机有效的车辆数据
    - 验证创建后状态始终为 reviewing
    - **Validates: Requirements 4.1**

  - [x] 4.2 实现 Property 5: 车辆审核状态变更正确性
    - **Property 5: 车辆审核状态变更正确性**
    - 生成随机的审核操作（active/rejected）
    - 验证状态正确更新
    - **Validates: Requirements 5.1, 5.2**

  - [x] 4.3 实现 Property 6: 还车状态变更正确性
    - **Property 6: 还车状态变更正确性**
    - 对使用中的车辆执行还车操作
    - 验证状态更新为 returned
    - **Validates: Requirements 6.1, 6.2**

- [x] 5. 补充权限控制单元测试
  - [x] 5.1 验证司机无法审批请假申请
    - 测试司机调用审批接口返回 403
    - _Requirements: 7.1_

  - [x] 5.2 验证司机无法审核车辆
    - 测试司机调用车辆审核接口返回 403
    - _Requirements: 7.2_

  - [x] 5.3 验证未认证用户无法访问
    - 测试未认证用户调用各接口返回 401/403
    - _Requirements: 1.3, 4.3_

- [x] 6. Checkpoint - 运行所有测试
  - 运行 `pytest fleet-manager/backend/tests/test_approval_properties.py -v`
  - 确保所有属性测试通过
  - 如有问题，询问用户

## Notes

- 属性测试使用 hypothesis 库，每个测试至少 100 次迭代
- 测试使用 SQLite 内存数据库，确保测试隔离
- 每个属性测试需标注对应的设计属性编号和需求编号
