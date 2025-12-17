# Implementation Plan

## 任务概述

修复车辆管理系统中数据库字段缺失和代码兼容性问题，包括：
1. 统一 vehicle_documents 表结构
2. 补充 driver_licenses 表缺失字段
3. 实现 Taro 兼容层 removeStorage 函数

---

- [x] 1. 创建 vehicle_documents 表修复迁移
  - [x] 1.1 创建迁移文件 `00634_fix_vehicle_documents_structure.sql`
    - 检查并处理 document_type 字段的 NOT NULL 约束
    - 添加所有缺失的扩展字段（行驶证信息、车辆照片、租赁信息等）
    - 使用 IF NOT EXISTS 语法确保幂等性
    - 添加执行结果日志输出
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2_

- [x] 2. 创建 driver_licenses 表修复迁移
  - [x] 2.1 创建迁移文件 `00635_fix_driver_licenses_fields.sql`
    - 添加 id_card_address 字段（如果不存在）
    - 添加 driving_license_photo 字段（如果不存在）
    - 确保所有身份证相关字段存在（id_card_name, id_card_number, id_card_photo_front, id_card_photo_back, id_card_birth_date）
    - 使用 IF NOT EXISTS 语法确保幂等性
    - 添加执行结果日志输出
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2_

- [x] 3. 实现 Taro 兼容层 removeStorage 函数
  - [x] 3.1 在 `src/utils/taroCompat.ts` 中添加 removeStorage 函数
    - 定义 RemoveStorageOptions 接口
    - 实现 H5 环境下使用 localStorage.removeItem
    - 实现非 H5 环境下调用 Taro.removeStorage
    - 支持 success/fail/complete 回调
    - 返回 Promise
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 在 initTaroCompat 函数中注册 removeStorage
    - 全局覆盖 Taro.removeStorage 方法
    - _Requirements: 3.1_

- [x] 4. 创建迁移执行脚本
  - [x] 4.1 创建 `scripts/fix-vehicle-database-fields.js` 脚本
    - 连接 Supabase 执行迁移 SQL
    - 执行 00634 和 00635 迁移文件
    - 输出执行结果
    - _Requirements: 4.4_

- [x] 5. 执行迁移并验证
  - [x] 5.1 执行迁移脚本
    - 运行迁移脚本添加/修复字段
    - 验证字段已成功添加
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 4.2_

  - [x] 5.2 刷新 Schema Cache
    - 通过 Supabase Dashboard 或 API 刷新 schema cache
    - 验证新字段在 schema cache 中可见
    - _Requirements: 5.3_

- [x] 6. Checkpoint - 确保迁移成功
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. 本地测试验证
  - [x] 7.1 测试车辆添加功能
    - 构建 H5 并启动本地服务器
    - 测试添加车辆功能
    - 验证不再出现 document_type 约束错误
    - 验证不再出现 id_card_address 字段缺失错误
    - 验证不再出现 removeStorage 函数错误
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 3.1_

- [x] 7.2 编写属性测试 - 车辆信息保存一致性
  - **Property 1: 车辆信息保存一致性**
  - **Validates: Requirements 1.1, 1.2, 1.5**

- [x] 7.3 编写属性测试 - 驾驶员证件字段保存一致性
  - **Property 2: 驾驶员证件字段保存一致性**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 7.4 编写属性测试 - 可选字段 NULL 值处理
  - **Property 3: 可选字段 NULL 值处理**
  - **Validates: Requirements 2.4**

- [x] 7.5 编写属性测试 - removeStorage 函数正确性
  - **Property 4: removeStorage 函数正确性**
  - **Validates: Requirements 3.1, 3.3**

- [x] 8. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

