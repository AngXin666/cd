# Implementation Plan: 动态计量单位

## Overview

实现计件录入页面的动态计量单位功能。单位完全由仓库类型决定，支持预设类型（piece/point/whole/distance）和自定义类型（custom）。

## Tasks

- [x] 1. 后端：更新仓库模型和枚举
  - [x] 1.1 在 enums.py 中添加 CUSTOM 仓库类型枚举值
  - [x] 1.2 在 models.py 中为 Warehouse 添加 custom_unit 字段
  - [x] 1.3 更新 helpers.py 中的单位获取函数

- [x] 2. 后端：更新仓库 API
  - [x] 2.1 更新仓库创建/更新 schema 添加 custom_unit 字段
  - [x] 2.2 添加 custom 类型仓库的 custom_unit 验证
  - [x] 2.3 更新仓库响应 schema

- [x] 3. Checkpoint - 后端测试
  - 确保所有后端测试通过

- [x] 4. 前端：添加 CUSTOM 类型支持
  - [x] 4.1 在 api/types.ts 中添加 CUSTOM 到 WarehouseType 枚举
  - [x] 4.2 更新 Warehouse 接口添加 custom_unit 字段
  - [x] 4.3 更新 getWarehousePresetUnit 函数处理 custom 类型
  - _Requirements: 3.5, 4.1_

- [x] 5. 前端：更新仓库管理页面（老板端）
  - [x] 5.1 添加 custom 类型选项和自定义单位输入框
  - [x] 5.2 添加 custom_unit 验证（custom 类型时必填）
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Final Checkpoint
  - 确保前端功能正常

## Notes

- 后端已完成，前端只需添加 CUSTOM 类型支持
- 计件录入页面的 currentCategoryUnit 已有完善逻辑，无需修改
- 属性测试已在后端 test_warehouse_type.py 中覆盖
