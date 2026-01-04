# Implementation Plan: 动态计量单位

## Overview

本功能的代码实现已基本完成，主要任务是验证和修复数据层面的问题，确保仓库类型和单位正确传递到前端。

## Tasks

- [x] 1. 验证后端仓库类型字段
  - [x] 1.1 检查仓库模型是否正确返回 warehouse_type 字段
    - 检查 Warehouse 模型定义
    - 检查 API 响应是否包含 warehouse_type
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 1.2 检查品类模型是否正确返回 unit 字段
    - 检查 PieceWorkCategory 模型定义
    - 检查 API 响应是否包含 unit
    - _Requirements: 2.1, 2.2_

- [x] 2. 验证前端单位计算逻辑
  - [x] 2.1 检查 currentWarehousePresetUnit 计算属性
    - 确认正确读取 warehouse.warehouse_type
    - 确认正确调用 getWarehousePresetUnit
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 2.2 检查 currentCategoryUnit 计算属性
    - 确认优先级逻辑正确（品类单位 > 仓库预设单位 > 默认值）
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. 添加单元测试
  - [ ]* 3.1 编写 getWarehousePresetUnit 函数测试
    - 测试所有仓库类型返回正确单位
    - 测试无效类型返回默认值
    - **Property 1: 仓库类型单位映射正确性**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 4. 端到端验证
  - [x] 4.1 创建不同类型的测试仓库
    - 创建计件类型仓库，验证显示"件数"
    - 创建点位类型仓库，验证显示"点数"
    - 创建整车类型仓库，验证显示"车数"
    - 创建距离类型仓库，验证显示"公里数"
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 5. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 任务标记 `*` 的为可选任务，可跳过以加快 MVP 进度
- 每个任务引用具体需求以便追溯
- 检查点确保增量验证
