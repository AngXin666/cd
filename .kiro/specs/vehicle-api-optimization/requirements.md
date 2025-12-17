# Requirements Document

## Introduction

本规范定义了车辆管理 API 的优化需求。目标是在保持功能完整性的前提下，减少代码复杂度、删除未使用的类型和函数、合并重复逻辑。优化必须通过严格的测试验证，确保所有现有功能正常工作。

## Glossary

- **Vehicle**: 车辆核心信息，存储在 vehicles 表
- **VehicleDocument**: 车辆扩展信息（照片、行驶证、租赁），存储在 vehicle_documents 表
- **DriverLicense**: 驾驶员证件信息，存储在 driver_licenses 表
- **API 函数**: vehicles.ts 中导出的异步函数
- **类型接口**: types.ts 中定义的 TypeScript 接口

## Requirements

### Requirement 1

**User Story:** 作为开发者，我希望删除未使用的调试函数，以减少代码量和维护负担。

#### Acceptance Criteria

1. WHEN 代码中存在 debugAuthStatus 函数 THEN 系统 SHALL 删除该函数
2. WHEN 删除调试函数后 THEN 系统 SHALL 确保没有其他代码引用该函数
3. WHEN 删除完成后 THEN 系统 SHALL 通过 TypeScript 编译检查

### Requirement 2

**User Story:** 作为开发者，我希望删除未使用的类型接口，以简化类型定义文件。

#### Acceptance Criteria

1. WHEN 类型接口 VehicleBase 未被任何代码使用 THEN 系统 SHALL 删除该接口
2. WHEN 类型接口 VehicleLeaseInfo 未被任何代码使用 THEN 系统 SHALL 删除该接口
3. WHEN 类型接口 VehicleRecord 未被任何代码使用 THEN 系统 SHALL 删除该接口
4. WHEN 类型接口 VehicleRecordInput 未被任何代码使用 THEN 系统 SHALL 删除该接口
5. WHEN 类型接口 VehicleBaseWithRecords 未被任何代码使用 THEN 系统 SHALL 删除该接口
6. WHEN 类型接口 VehicleRecordWithDetails 未被任何代码使用 THEN 系统 SHALL 删除该接口
7. WHEN 删除类型后 THEN 系统 SHALL 通过 TypeScript 编译检查

### Requirement 3

**User Story:** 作为开发者，我希望合并重复的图片管理函数，以减少代码重复。

#### Acceptance Criteria

1. WHEN 存在 lockPhoto 和 unlockPhoto 函数 THEN 系统 SHALL 合并为一个 togglePhotoLock 函数
2. WHEN 调用合并后的函数 THEN 系统 SHALL 保持原有的锁定/解锁功能
3. WHEN 合并完成后 THEN 系统 SHALL 更新所有调用点

### Requirement 4

**User Story:** 作为开发者，我希望所有优化后的代码都有完整的单元测试覆盖。

#### Acceptance Criteria

1. WHEN 优化 CRUD 函数后 THEN 系统 SHALL 有测试验证 getDriverVehicles 返回正确数据
2. WHEN 优化 CRUD 函数后 THEN 系统 SHALL 有测试验证 insertVehicle 正确创建车辆
3. WHEN 优化 CRUD 函数后 THEN 系统 SHALL 有测试验证 updateVehicle 正确更新车辆
4. WHEN 优化 CRUD 函数后 THEN 系统 SHALL 有测试验证 deleteVehicle 正确删除车辆
5. WHEN 优化审核函数后 THEN 系统 SHALL 有测试验证 submitVehicleForReview 正确提交审核
6. WHEN 优化审核函数后 THEN 系统 SHALL 有测试验证 approveVehicle 正确通过审核

### Requirement 5

**User Story:** 作为开发者，我希望优化后的代码保持向后兼容，不破坏现有功能。

#### Acceptance Criteria

1. WHEN 优化完成后 THEN 系统 SHALL 通过所有现有的单元测试
2. WHEN 优化完成后 THEN 系统 SHALL 通过 TypeScript 编译检查
3. WHEN 优化完成后 THEN 系统 SHALL 通过本地 H5 构建测试
4. WHEN 优化完成后 THEN 系统 SHALL 保持所有页面功能正常（车辆列表、添加车辆、还车、审核）
