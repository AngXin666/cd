# Requirements Document

## Introduction

本规范文档定义了车辆管理和个人信息功能的字段完整性审计需求。通过对项目进行**五次深度扫描**，发现了多个潜在的字段缺失、数据类型不一致和数组处理问题。本文档旨在系统性地识别和修复这些问题，确保前端页面、API 层和数据库层之间的数据结构保持一致。

### 扫描范围

1. **第一次扫描**：TypeScript 类型定义文件 (`src/db/types.ts`)
2. **第二次扫描**：车辆 API 层 (`src/db/api/vehicles.ts`)
3. **第三次扫描**：驾驶证相关字段使用 (`driver_license`, `id_card`)
4. **第四次扫描**：用户资料相关字段 (`Profile`, `profile`)
5. **第五次扫描**：数据库迁移文件 (`supabase/migrations/`)

### 已发现的关键问题

1. **车辆照片字段重复定义**：`vehicles` 表和 `vehicle_documents` 表都定义了照片字段
2. **字段平铺逻辑复杂**：`getDriverVehicles` 函数需要从 `vehicle_documents` 平铺字段到 `Vehicle` 对象
3. **驾驶证字段不完整**：`DriverLicense` 接口可能缺少某些数据库字段
4. **Profile 转换函数字段遗漏**：`convertUserToProfile` 函数可能未包含所有 Profile 字段
5. **数组字段处理不一致**：照片数组字段在不同层可能有不同的处理方式

## Glossary

- **Vehicle**: 车辆实体，包含车辆基本信息、照片、审核状态等
- **VehicleDocument**: 车辆扩展信息，存储在 vehicle_documents 表中
- **DriverLicense**: 驾驶证信息，包含身份证和驾驶证相关字段
- **Profile**: 用户资料，包含个人基本信息
- **TypeScript Interface**: TypeScript 类型定义接口
- **Database Schema**: 数据库表结构定义
- **Field Mapping**: 字段映射，前端字段与数据库字段的对应关系

## Requirements

### Requirement 1: 车辆类型定义完整性审计

**User Story:** As a 开发者, I want 车辆相关的 TypeScript 类型定义与数据库表结构完全一致, so that 避免运行时类型错误和数据丢失。

#### Acceptance Criteria

1. WHEN 检查 Vehicle 接口定义 THEN THE 系统 SHALL 确保所有数据库字段都有对应的 TypeScript 类型定义
2. WHEN 检查 VehicleDocument 接口定义 THEN THE 系统 SHALL 确保所有扩展字段都有正确的类型声明
3. WHEN 检查 VehicleInput 接口定义 THEN THE 系统 SHALL 确保所有可输入字段都有对应的类型定义
4. WHEN 检查 VehicleUpdate 接口定义 THEN THE 系统 SHALL 确保所有可更新字段都有对应的类型定义
5. IF 发现类型定义与数据库不一致 THEN THE 系统 SHALL 记录差异并提供修复建议

### Requirement 2: 车辆照片字段一致性检查

**User Story:** As a 开发者, I want 车辆照片字段在前端、API 和数据库之间保持一致, so that 照片能够正确保存和显示。

#### Acceptance Criteria

1. WHEN 检查车辆照片字段 THEN THE 系统 SHALL 验证以下字段存在且类型正确：left_front_photo, right_front_photo, left_rear_photo, right_rear_photo, dashboard_photo, rear_door_photo, cargo_box_photo
2. WHEN 检查行驶证照片字段 THEN THE 系统 SHALL 验证以下字段存在且类型正确：driving_license_main_photo, driving_license_sub_photo, driving_license_back_photo, driving_license_sub_back_photo
3. WHEN 检查照片数组字段 THEN THE 系统 SHALL 验证以下字段存在且类型为 string[]：pickup_photos, return_photos, registration_photos, damage_photos
4. IF 照片字段在 vehicles 表和 vehicle_documents 表中重复定义 THEN THE 系统 SHALL 明确数据来源优先级

### Requirement 3: 驾驶证信息字段完整性检查

**User Story:** As a 开发者, I want 驾驶证相关字段在类型定义和数据库中保持一致, so that 司机证件信息能够完整保存和显示。

#### Acceptance Criteria

1. WHEN 检查 DriverLicense 接口 THEN THE 系统 SHALL 确保包含所有必要的身份证字段：id_card_number, id_card_name, id_card_address, id_card_birth_date, id_card_photo_front, id_card_photo_back
2. WHEN 检查 DriverLicense 接口 THEN THE 系统 SHALL 确保包含所有必要的驾驶证字段：license_number, license_class, first_issue_date, valid_from, valid_to, issue_authority, driving_license_photo
3. WHEN 检查 DriverLicenseInput 接口 THEN THE 系统 SHALL 确保所有可输入字段都有对应的类型定义
4. IF 发现字段缺失 THEN THE 系统 SHALL 添加缺失的字段定义

### Requirement 4: 用户资料字段完整性检查

**User Story:** As a 开发者, I want 用户资料相关字段在类型定义和数据库中保持一致, so that 用户个人信息能够完整保存和显示。

#### Acceptance Criteria

1. WHEN 检查 Profile 接口 THEN THE 系统 SHALL 确保包含所有必要的基本信息字段：name, phone, email, avatar_url, role
2. WHEN 检查 Profile 接口 THEN THE 系统 SHALL 确保包含所有必要的扩展字段：driver_type, vehicle_plate, address_province, address_city, address_district, address_detail
3. WHEN 检查 Profile 接口 THEN THE 系统 SHALL 确保包含所有必要的紧急联系人字段：emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
4. WHEN 检查 ProfileUpdate 接口 THEN THE 系统 SHALL 确保所有可更新字段都有对应的类型定义

### Requirement 5: API 层字段映射检查

**User Story:** As a 开发者, I want API 层正确处理字段映射, so that 前端和数据库之间的数据传递不会丢失字段。

#### Acceptance Criteria

1. WHEN 检查 insertVehicle 函数 THEN THE 系统 SHALL 确保所有输入字段都被正确映射到数据库字段
2. WHEN 检查 updateVehicle 函数 THEN THE 系统 SHALL 确保所有更新字段都被正确映射到数据库字段
3. WHEN 检查 getDriverVehicles 函数 THEN THE 系统 SHALL 确保从 vehicle_documents 表获取的字段被正确平铺到车辆对象
4. WHEN 检查 getVehicleById 函数 THEN THE 系统 SHALL 确保返回的车辆对象包含所有必要字段
5. IF 发现字段映射遗漏 THEN THE 系统 SHALL 添加缺失的字段映射

### Requirement 6: 数据库迁移文件一致性检查

**User Story:** As a 开发者, I want 数据库迁移文件与当前代码使用的字段保持一致, so that 数据库结构能够支持所有功能需求。

#### Acceptance Criteria

1. WHEN 检查 vehicles 表结构 THEN THE 系统 SHALL 确保包含所有代码中使用的字段
2. WHEN 检查 vehicle_documents 表结构 THEN THE 系统 SHALL 确保包含所有扩展字段
3. WHEN 检查 driver_licenses 表结构 THEN THE 系统 SHALL 确保包含所有驾驶证相关字段
4. WHEN 检查 users 表结构 THEN THE 系统 SHALL 确保包含所有用户资料字段
5. IF 发现数据库字段缺失 THEN THE 系统 SHALL 创建迁移脚本添加缺失字段

### Requirement 7: 前端页面字段使用检查

**User Story:** As a 开发者, I want 前端页面正确使用所有必要字段, so that 用户界面能够完整显示所有信息。

#### Acceptance Criteria

1. WHEN 检查车辆列表页面 THEN THE 系统 SHALL 确保正确显示车辆照片和基本信息
2. WHEN 检查车辆详情页面 THEN THE 系统 SHALL 确保正确显示所有车辆字段
3. WHEN 检查添加车辆页面 THEN THE 系统 SHALL 确保正确收集和提交所有必要字段
4. WHEN 检查司机个人信息页面 THEN THE 系统 SHALL 确保正确显示身份证和驾驶证信息
5. IF 发现页面字段使用不完整 THEN THE 系统 SHALL 添加缺失的字段显示或输入

### Requirement 8: 数组字段处理一致性检查

**User Story:** As a 开发者, I want 数组类型字段在整个系统中被一致处理, so that 多值数据能够正确保存和读取。

#### Acceptance Criteria

1. WHEN 处理照片数组字段 THEN THE 系统 SHALL 确保数组类型在 TypeScript、API 和数据库中一致
2. WHEN 从数据库读取数组字段 THEN THE 系统 SHALL 正确处理 null 值和空数组
3. WHEN 向数据库写入数组字段 THEN THE 系统 SHALL 正确序列化数组数据
4. IF 发现数组处理不一致 THEN THE 系统 SHALL 统一数组处理逻辑

### Requirement 9: 可选字段和必填字段标记检查

**User Story:** As a 开发者, I want 字段的可选性在类型定义中正确标记, so that TypeScript 编译器能够正确检查字段使用。

#### Acceptance Criteria

1. WHEN 检查 Vehicle 接口 THEN THE 系统 SHALL 确保必填字段不带 ? 标记，可选字段带 ? 标记
2. WHEN 检查 VehicleInput 接口 THEN THE 系统 SHALL 确保只有 plate_number 等核心字段为必填
3. WHEN 检查 DriverLicense 接口 THEN THE 系统 SHALL 确保字段可选性与数据库约束一致
4. IF 发现可选性标记不一致 THEN THE 系统 SHALL 修正字段的可选性标记

### Requirement 10: 字段命名一致性检查

**User Story:** As a 开发者, I want 字段命名在整个系统中保持一致, so that 避免因命名不一致导致的数据丢失。

#### Acceptance Criteria

1. WHEN 检查照片字段命名 THEN THE 系统 SHALL 确保前端、API 和数据库使用相同的字段名
2. WHEN 检查时间字段命名 THEN THE 系统 SHALL 确保 pickup_time, return_time 等字段命名一致
3. WHEN 检查审核字段命名 THEN THE 系统 SHALL 确保 review_status, reviewed_at, reviewed_by 等字段命名一致
4. IF 发现命名不一致 THEN THE 系统 SHALL 统一字段命名
