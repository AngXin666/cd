# Implementation Plan: 动态计量单位

## Overview

实现计件录入页面的动态计量单位功能。单位完全由仓库类型决定，支持预设类型（piece/point/whole/distance）和自定义类型（custom）。

## Tasks

- [x] 1. 后端：更新仓库模型和枚举
  - [x] 1.1 在 enums.py 中添加 CUSTOM 仓库类型枚举值
    - 添加 `CUSTOM = "custom"` 到 WarehouseType 枚举
    - _Requirements: 4.1_
  - [x] 1.2 在 models.py 中为 Warehouse 添加 custom_unit 字段
    - 添加 `custom_unit: Optional[str] = Field(default=None, max_length=20)`
    - _Requirements: 4.1_
  - [x] 1.3 更新 helpers.py 中的单位获取函数
    - 新增 `get_warehouse_unit(warehouse)` 函数
    - 处理 custom 类型返回 custom_unit
    - 未设置时返回空字符串（不提供默认值）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 2. 后端：更新仓库 API
  - [x] 2.1 更新仓库创建/更新 schema
    - 添加 custom_unit 字段到 WarehouseCreate 和 WarehouseUpdate
    - _Requirements: 4.1_
  - [x] 2.2 添加 custom 类型仓库的 custom_unit 验证
    - 当 warehouse_type 为 custom 时，验证 custom_unit 不为空
    - _Requirements: 4.2, 4.3_
  - [x] 2.3 更新仓库响应 schema
    - 确保 custom_unit 字段在响应中返回
    - _Requirements: 4.1_

- [ ] 3. Checkpoint - 后端测试
  - 确保所有后端测试通过，ask the user if questions arise.

- [ ] 4. 前端：更新类型定义
  - [ ] 4.1 在 api/types.ts 中添加 CUSTOM 仓库类型
    - 添加 `CUSTOM = 'custom'` 到 WarehouseType 枚举
    - _Requirements: 4.1_
  - [ ] 4.2 更新 Warehouse 接口添加 custom_unit 字段
    - 添加 `custom_unit?: string`
    - _Requirements: 4.1_
  - [ ] 4.3 更新 getWarehouseUnit 函数
    - 处理 custom 类型返回 custom_unit
    - 未设置时返回空字符串
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 5. 前端：更新计件录入页面
  - [ ] 5.1 简化 currentCategoryUnit 计算属性
    - 使用 getWarehouseUnit(warehouse) 替代原有逻辑
    - 不再依赖品类的 unit 字段
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 5.2 添加单位缺失检查
    - 当单位为空时显示错误提示
    - 禁止录入操作
    - _Requirements: 3.6_
  - [ ] 5.3 确保仓库切换时重新加载品类
    - 切换仓库后清空品类选择
    - 重新加载新仓库的品类
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6. 前端：更新仓库管理页面（老板端）
  - [ ] 6.1 添加 custom 类型选项到仓库类型选择器
    - 在仓库类型下拉框中添加"其他"选项
    - _Requirements: 4.1_
  - [ ] 6.2 添加自定义单位输入框
    - 当选择 custom 类型时显示单位输入框
    - _Requirements: 4.1_
  - [ ] 6.3 添加 custom_unit 验证
    - 保存时验证 custom 类型的 custom_unit 不为空
    - _Requirements: 4.2, 4.3_

- [ ] 7. Checkpoint - 前端测试
  - 确保所有前端功能正常，ask the user if questions arise.

- [ ]* 8. 属性测试
  - [ ]* 8.1 编写预设仓库类型单位映射属性测试
    - **Property 1: 预设仓库类型单位映射正确性**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  - [ ]* 8.2 编写自定义类型单位获取属性测试
    - **Property 2: 自定义类型单位获取**
    - **Validates: Requirements 3.5, 4.1**
  - [ ]* 8.3 编写未设置单位返回空属性测试
    - **Property 3: 未设置单位返回空**
    - **Validates: Requirements 3.6**

- [ ] 9. Final Checkpoint
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- 任务标记 `*` 为可选测试任务
- 单位完全由仓库类型决定，品类的 unit 字段不再用于显示
- custom 类型必须设置 custom_unit，不允许为空
- 预设类型（piece/point/whole/distance）有固定的单位映射
