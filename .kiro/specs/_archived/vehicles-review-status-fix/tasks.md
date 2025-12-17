# Implementation Plan

## 任务概述

修复 vehicles 表中 `review_status` 字段缺失问题，使车辆添加和审核功能正常工作。

---

- [x] 1. 创建数据库迁移脚本
  - [x] 1.1 创建迁移文件 `00632_add_vehicles_review_status_field.sql`
    - 添加 review_status 枚举类型（如果不存在）
    - 添加 review_status 字段到 vehicles 表
    - 添加其他缺失的审核相关字段（user_id, warehouse_id, driver_id, owner_id, current_driver_id, color, vin, purchase_date, ownership_type, is_active, notes, reviewed_at, reviewed_by）
    - 使用 `IF NOT EXISTS` 语法确保幂等性
    - _Requirements: 1.2, 1.3, 2.1, 2.2_

  - [x] 1.2 创建执行迁移的脚本
    - 创建 `scripts/add-vehicles-review-status.js` 脚本
    - 连接 Supabase 执行迁移 SQL
    - 输出执行结果
    - _Requirements: 2.3_

- [x] 2. 执行迁移并验证
  - [x] 2.1 执行迁移脚本
    - 运行迁移脚本添加字段
    - 验证字段已成功添加
    - _Requirements: 1.2, 2.3_

  - [x] 2.2 刷新 Schema Cache
    - 通过 Supabase Dashboard 或 API 刷新 schema cache
    - 验证新字段在 schema cache 中可见
    - _Requirements: 1.4_

- [ ] 3. 验证功能修复
  - [ ] 3.1 测试车辆添加功能
    - 在本地环境测试添加车辆
    - 验证不再出现 PGRST204 错误
    - 验证 review_status 默认值为 'drafting'
    - _Requirements: 1.1, 1.3, 3.1_

- [ ] 4. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 4.1 编写属性测试
  - **Property 1: 车辆插入-查询一致性**
  - **Validates: Requirements 1.1, 3.1, 3.2**

- [ ]* 4.2 编写属性测试
  - **Property 2: 审核状态更新一致性**
  - **Validates: Requirements 3.3**

- [ ]* 4.3 编写属性测试
  - **Property 3: 默认值正确性**
  - **Validates: Requirements 1.3**

- [ ] 5. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
