# Requirements Document

## Introduction

本需求文档描述了修复车辆管理系统中数据库字段缺失和代码兼容性问题的需求。当前系统在添加车辆时出现以下错误：

1. **vehicle_documents 表结构冲突**：存在两个不同版本的表定义（00599 和 00610），导致 `document_type NOT NULL` 约束违反
2. **driver_licenses 表缺少字段**：`id_card_address` 和 `driving_license_photo` 字段在 Schema Cache 中找不到
3. **Taro 兼容层缺失函数**：`removeStorage` 异步函数未实现，导致 H5 环境报错

### 问题根源分析

#### vehicle_documents 表问题
- **00599_optimize_vehicle_tables_create_vehicle_documents.sql**：定义了优化后的表结构，包含 46 个扩展字段，没有 `document_type` 字段
- **00610_create_missing_tables.sql**：定义了简化的表结构，包含 `document_type NOT NULL` 字段，但缺少大部分扩展字段
- 由于 `CREATE TABLE IF NOT EXISTS`，实际表结构取决于哪个迁移先执行

#### driver_licenses 表问题
- **00500_recreate_driver_licenses_table.sql**：定义了完整的表结构，包含 `id_card_address` 字段
- 但数据库中可能缺少 `driving_license_photo` 字段（在 00633 迁移中添加）

#### Taro 兼容层问题
- `taroCompat.ts` 中实现了 `removeStorageSync`（同步版本）
- 但缺少 `removeStorage`（异步版本）的实现

## Glossary

- **Vehicle_Documents**: 车辆扩展信息表，存储行驶证信息、照片、租赁信息等
- **Driver_Licenses**: 驾驶员证件表，存储身份证和驾驶证信息
- **Document_Type**: 文档类型字段，用于区分不同类型的车辆文档（在简化版表结构中使用）
- **Schema Cache**: Supabase 的数据库模式缓存，用于加速查询
- **Taro 兼容层**: 用于在 H5 环境下模拟 Taro 原生 API 的兼容性代码
- **幂等性**: 多次执行同一操作产生相同结果的特性

## Requirements

### Requirement 1

**User Story:** 作为司机，我希望能够成功添加车辆信息，以便系统能够记录我的车辆数据。

#### Acceptance Criteria

1. WHEN 司机提交车辆信息 THEN 系统 SHALL 成功将车辆核心信息保存到 vehicles 表
2. WHEN 司机提交车辆扩展信息 THEN 系统 SHALL 成功将扩展信息保存到 vehicle_documents 表
3. WHEN vehicle_documents 表存在 document_type 字段且为 NOT NULL THEN 系统 SHALL 修改该字段为可空或添加默认值
4. WHEN vehicle_documents 表缺少扩展字段 THEN 系统 SHALL 添加所有必需的扩展字段
5. WHEN 车辆信息保存成功 THEN 系统 SHALL 返回完整的车辆对象

### Requirement 2

**User Story:** 作为司机，我希望能够保存我的完整证件信息，以便系统能够完整记录我的身份证和驾驶证数据。

#### Acceptance Criteria

1. WHEN 司机提交证件信息包含身份证地址 THEN 系统 SHALL 成功将 id_card_address 字段保存到 driver_licenses 表
2. WHEN 司机提交证件信息包含驾驶证照片 THEN 系统 SHALL 成功将 driving_license_photo 字段保存到 driver_licenses 表
3. WHEN 查询驾驶员证件信息 THEN 系统 SHALL 返回包含所有字段的完整数据
4. WHEN driver_licenses 表中可选字段为空 THEN 系统 SHALL 允许这些字段为 NULL

### Requirement 3

**User Story:** 作为用户，我希望在 H5 环境下能够正常使用存储功能，以便系统能够正确管理本地数据。

#### Acceptance Criteria

1. WHEN 在 H5 环境下调用 removeStorage 异步函数 THEN 系统 SHALL 成功执行存储删除操作
2. WHEN removeStorage 函数被调用 THEN 系统 SHALL 使用 localStorage.removeItem 作为底层实现
3. WHEN removeStorage 操作完成 THEN 系统 SHALL 调用 success 回调并返回 Promise
4. WHEN removeStorage 操作失败 THEN 系统 SHALL 调用 fail 回调并拒绝 Promise

### Requirement 4

**User Story:** 作为系统管理员，我希望数据库迁移脚本具有幂等性，以便可以安全地重复执行。

#### Acceptance Criteria

1. WHEN 执行数据库迁移脚本 THEN 系统 SHALL 使用 IF NOT EXISTS 或 IF EXISTS 语法确保幂等性
2. WHEN 字段已存在时执行迁移 THEN 系统 SHALL 跳过该字段的添加操作
3. WHEN 约束需要修改时 THEN 系统 SHALL 先检查约束是否存在再进行修改
4. WHEN 迁移完成 THEN 系统 SHALL 输出执行结果日志

### Requirement 5

**User Story:** 作为开发者，我希望数据库表结构与代码类型定义保持一致，以便避免运行时错误。

#### Acceptance Criteria

1. WHEN vehicle_documents 表结构与 VehicleDocument 类型定义不一致 THEN 系统 SHALL 通过迁移脚本同步表结构
2. WHEN driver_licenses 表结构与 DriverLicense 类型定义不一致 THEN 系统 SHALL 通过迁移脚本同步表结构
3. WHEN 执行迁移后 THEN 系统 SHALL 刷新 Schema Cache 使新字段生效

