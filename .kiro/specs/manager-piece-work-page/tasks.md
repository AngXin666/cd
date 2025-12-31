# Implementation Plan: 车队长计件统计页面

## Overview

在车队长端考勤管理页面添加计件统计标签页，复用司机卡片布局，显示按仓库分组的计件统计数据。

## Tasks

- [x] 1. 添加计件统计标签页
  - 在 `pages/manager/attendance/index.vue` 中添加 `PIECE_WORK` 标签页类型
  - 在标签页切换区域添加"计件统计"标签（位于考勤记录和请假审批之间）
  - 添加标签页切换逻辑
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. 定义计件统计数据结构
  - [x] 2.1 添加 `DriverWarehousePieceStats` 接口定义
    - 包含 warehouseId, warehouseName, unit, todayQuantity, weekQuantity, monthQuantity
    - _Requirements: 3.1_
  - [x] 2.2 添加 `DriverPieceStatsMap` 类型定义
    - Map<number, DriverWarehousePieceStats[]>
    - _Requirements: 3.2, 3.3_

- [x] 3. 实现日期范围计算函数
  - [x] 3.1 实现 `getTodayRange()` 函数
    - 返回今日的开始和结束日期
    - _Requirements: 3.5_
  - [x] 3.2 实现 `getWeekRange()` 函数
    - 返回本周一到今天的日期范围
    - _Requirements: 3.5_
  - [x] 3.3 实现 `getMonthRange()` 函数
    - 返回本月1日到今天的日期范围
    - _Requirements: 3.5_

- [x] 4. 实现计件数据加载函数
  - [x] 4.1 实现 `loadDriverPieceStats()` 函数
    - 获取今日、本周、本月的计件记录
    - 按司机和仓库聚合统计数据
    - 获取仓库信息以获取单位
    - _Requirements: 3.1, 3.6_
  - [x] 4.2 添加 `driverPieceStatsMap` 状态变量
    - 存储司机计件统计映射
    - _Requirements: 3.2, 3.3_

- [x] 5. 实现计件统计标签页 UI
  - [x] 5.1 添加计件统计标签页容器
    - 使用 `v-if="activeTab === 'PIECE_WORK'"` 条件渲染
    - _Requirements: 1.3_
  - [x] 5.2 复用搜索功能
    - 复用现有的搜索框和搜索逻辑
    - _Requirements: 4.2, 4.3_
  - [x] 5.3 复用仓库信息显示
    - 显示车队长管辖的仓库信息
    - _Requirements: 4.1_
  - [x] 5.4 实现司机卡片列表
    - 复用司机头部信息（头像、姓名、手机号、实名状态、司机类型、入职时间、在职天数）
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 5.5 实现计件统计区域
    - 按仓库分组显示统计数据
    - 每行显示仓库名称、今日数量、本周数量、本月数量
    - 使用仓库的 preset_unit 作为单位
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 5.6 复用操作按钮
    - 个人信息按钮（已实名可点击，未实名禁用）
    - 车辆管理按钮
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 5.7 添加统计页脚
    - 显示"共 X 名司机"
    - _Requirements: 6.1, 6.2_

- [x] 6. 添加计件统计样式
  - 添加计件统计区域的 SCSS 样式
  - 支持多行仓库统计显示
  - _Requirements: 3.4_

- [x] 7. Checkpoint - 确保功能正常
  - 确保所有功能正常工作，如有问题请询问用户

- [x] 8. 属性测试
  - [x] 8.1 编写 Property 1 测试：司机实名状态影响 UI 显示
    - **Property 1: 司机实名状态影响 UI 显示**
    - **Validates: Requirements 2.4, 5.2, 5.3**
  - [x] 8.2 编写 Property 4 测试：筛选结果一致性
    - **Property 4: 筛选结果一致性**
    - **Validates: Requirements 4.1, 4.2, 6.2**
  - [x] 8.3 编写 Property 5 测试：搜索功能正确性
    - **Property 5: 搜索功能正确性**
    - **Validates: Requirements 4.2**

## Notes

- 所有任务都必须完成
- 复用现有考勤页面的大部分代码和样式
- 计件统计数据通过 `getPieceWorkRecords` API 获取
- 仓库单位通过 `Warehouse.preset_unit` 获取
