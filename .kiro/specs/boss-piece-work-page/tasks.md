# Implementation Plan: 老板端计件统计页面

## Overview

在老板端考勤管理页面添加计件统计标签页，复用车队长端的数据结构和日期计算函数，支持多仓库切换查看。

## Tasks

- [x] 1. 添加计件统计标签页
  - 在 `pages/boss/attendance/index.vue` 中添加 `PIECE_WORK` 标签页类型
  - 在标签页切换区域添加"计件统计"标签（位于考勤记录和请假审批之间）
  - 添加标签页切换逻辑
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. 添加计件统计状态变量
  - [x] 2.1 添加 `driverPieceStatsMap` 状态变量
    - 存储司机计件统计映射
    - 复用 `DriverWarehousePieceStats` 和 `DriverPieceStatsMap` 类型
    - _Requirements: 3.1_

- [x] 3. 实现计件数据加载函数
  - [x] 3.1 实现 `loadDriverPieceStats()` 函数
    - 复用 `getTodayRange()`, `getWeekRange()`, `getMonthRange()` 函数
    - 获取今日、本周、本月的计件记录
    - 按司机和仓库聚合统计数据
    - 获取仓库信息以获取单位
    - _Requirements: 3.1, 3.5, 3.6_

- [x] 4. 实现计件统计标签页 UI
  - [x] 4.1 添加计件统计标签页容器
    - 使用 `v-if="activeTab === 'PIECE_WORK'"` 条件渲染
    - _Requirements: 1.3_
  - [x] 4.2 复用仓库切换器
    - 复用现有的 swiper 仓库切换组件
    - 显示当前仓库名称和司机数量
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 4.3 复用搜索功能
    - 复用现有的搜索框和搜索逻辑
    - _Requirements: 5.1, 5.2_
  - [x] 4.4 实现司机卡片列表
    - 复用司机头部信息（头像、姓名、手机号、实名状态、司机类型、入职时间、在职天数）
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 4.5 实现计件统计区域
    - 按仓库分组显示统计数据
    - 每行显示仓库名称、今日数量、本周数量、本月数量
    - 使用仓库的 preset_unit 作为单位
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 4.6 复用操作按钮
    - 个人信息按钮（已实名可点击，未实名禁用）
    - 车辆管理按钮
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 4.7 添加统计页脚
    - 显示"共 X 名司机"
    - _Requirements: 7.1, 7.2_

- [x] 5. 添加计件统计样式
  - 复用车队长端的计件统计区域 SCSS 样式
  - 支持多行仓库统计显示
  - _Requirements: 3.4_

- [x] 6. Checkpoint - 确保功能正常
  - 确保所有功能正常工作，如有问题请询问用户

- [x] 7. 属性测试
  - [x] 7.1 编写 Property 1 测试：司机实名状态影响 UI 显示
    - **Property 1: 司机实名状态影响 UI 显示**
    - **Validates: Requirements 2.4, 6.2, 6.3**
  - [x] 7.2 编写 Property 3 测试：仓库筛选结果一致性
    - **Property 3: 仓库筛选结果一致性**
    - **Validates: Requirements 4.3, 7.2**
  - [x] 7.3 编写 Property 4 测试：搜索功能正确性
    - **Property 4: 搜索功能正确性**
    - **Validates: Requirements 5.1**

## Notes

- 所有任务都必须完成
- 复用车队长端的数据结构和日期计算函数
- 复用现有考勤页面的大部分代码和样式
- 计件统计数据通过 `getPieceWorkRecords` API 获取
- 仓库单位通过 `Warehouse.preset_unit` 获取
- 老板端可以查看所有仓库，通过 swiper 切换
