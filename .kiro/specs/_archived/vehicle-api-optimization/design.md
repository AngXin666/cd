# Design Document

## Overview

本设计文档描述车辆管理 API 的优化方案。优化目标是在保持功能完整性的前提下：
- 删除未使用的代码（调试函数、类型接口）
- 合并重复的函数逻辑
- 为核心功能编写完整的单元测试

## Architecture

优化不改变现有架构，仅进行代码精简：

```
┌─────────────────────────────────────────────────────────┐
│                    前端页面                              │
│  (vehicle-list, add-vehicle, return-vehicle, 审核页面)   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              src/db/api/vehicles.ts                      │
│  优化后：~20 个函数（删除 1 个调试函数，合并 2 个函数）    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              src/db/types.ts                             │
│  优化后：~9 个车辆相关接口（删除 6 个未使用接口）          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase 数据库                        │
│  vehicles | vehicle_documents | driver_licenses          │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 保留的核心函数（vehicles.ts）

| 函数名 | 用途 | 保留原因 |
|--------|------|----------|
| `getDriverVehicles` | 获取司机车辆列表 | 车辆列表页面使用 |
| `getAllVehiclesWithDrivers` | 获取所有车辆（含司机） | 管理员页面使用 |
| `getVehicleById` | 根据ID获取车辆 | 详情页面使用 |
| `getVehicleByPlateNumber` | 根据车牌获取车辆 | 搜索功能使用 |
| `getVehicleWithDriverDetails` | 获取车辆和司机详情 | 详情页面使用 |
| `getVehiclesByDriverId` | 根据司机ID获取车辆 | 司机管理使用 |
| `insertVehicle` | 添加车辆 | 添加车辆页面使用 |
| `updateVehicle` | 更新车辆 | 编辑功能使用 |
| `deleteVehicle` | 删除车辆 | 删除功能使用 |
| `deleteVehicleByPlateNumber` | 根据车牌删除 | 重复车牌处理 |
| `returnVehicle` | 还车录入 | 还车页面使用 |
| `getDriverLicense` | 获取驾照信息 | 证件管理使用 |
| `upsertDriverLicense` | 保存驾照信息 | 证件录入使用 |
| `updateDriverLicense` | 更新驾照信息 | 证件编辑使用 |
| `deleteDriverLicense` | 删除驾照信息 | 证件删除使用 |
| `getDriverDetailInfo` | 获取司机详情 | 司机详情页使用 |
| `submitVehicleForReview` | 提交审核 | 审核流程使用 |
| `getPendingReviewVehicles` | 获取待审核列表 | 审核页面使用 |
| `approveVehicle` | 通过审核 | 审核操作使用 |
| `requireSupplement` | 要求补录 | 审核操作使用 |
| `togglePhotoLock` | 锁定/解锁图片 | 合并后的新函数 |
| `markPhotoForDeletion` | 标记需补录 | 审核操作使用 |
| `supplementPhoto` | 补录图片 | 补录功能使用 |
| `getRequiredPhotos` | 获取需补录列表 | 补录页面使用 |
| `lockVehiclePhotos` | 一键锁定 | 审核操作使用 |

### 删除的函数

| 函数名 | 删除原因 |
|--------|----------|
| `debugAuthStatus` | 调试函数，生产环境不需要 |
| `lockPhoto` | 合并到 togglePhotoLock |
| `unlockPhoto` | 合并到 togglePhotoLock |

### 保留的类型接口（types.ts）

| 接口名 | 用途 |
|--------|------|
| `Vehicle` | 车辆核心信息 |
| `VehicleDocument` | 车辆扩展信息 |
| `VehicleWithDocuments` | 车辆完整信息 |
| `VehicleInput` | 创建车辆输入 |
| `VehicleDocumentInput` | 创建扩展信息输入 |
| `VehicleUpdate` | 更新车辆输入 |
| `VehicleDocumentUpdate` | 更新扩展信息输入 |
| `VehicleWithDriver` | 车辆含司机信息 |
| `VehicleWithDriverDetails` | 车辆含司机详情 |

### 删除的类型接口

| 接口名 | 删除原因 |
|--------|----------|
| `VehicleBase` | 与 Vehicle 重复，未被使用 |
| `VehicleLeaseInfo` | 未被使用 |
| `VehicleRecord` | 未被使用 |
| `VehicleRecordInput` | 未被使用 |
| `VehicleBaseWithRecords` | 未被使用 |
| `VehicleRecordWithDetails` | 未被使用 |

## Data Models

数据模型保持不变，仅删除未使用的类型定义。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 图片锁定状态切换正确性
*For any* 车辆ID、图片字段和索引，调用 togglePhotoLock(vehicleId, field, index, true) 后再调用 togglePhotoLock(vehicleId, field, index, false)，应该恢复到原始状态
**Validates: Requirements 3.2**

### Property 2: CRUD 操作数据一致性
*For any* 有效的车辆输入数据，insertVehicle 创建的车辆应该能通过 getVehicleById 正确获取，且所有字段值一致
**Validates: Requirements 4.1, 4.2**

### Property 3: 更新操作幂等性
*For any* 车辆ID和更新数据，连续两次调用 updateVehicle 应该产生相同的结果
**Validates: Requirements 4.3**

### Property 4: 删除操作完整性
*For any* 车辆ID，deleteVehicle 成功后，getVehicleById 应该返回 null
**Validates: Requirements 4.4**

### Property 5: 审核状态转换正确性
*For any* 车辆ID，submitVehicleForReview 后 review_status 应该变为 'pending_review'，approveVehicle 后应该变为 'approved'
**Validates: Requirements 4.5, 4.6**

## Error Handling

- 所有函数保持现有的错误处理逻辑
- 删除代码时确保不影响错误处理路径
- 合并函数时保持原有的错误返回格式

## Testing Strategy

### 单元测试

使用 Vitest 框架，测试文件：`src/db/api/vehicles.test.ts`

测试覆盖：
1. CRUD 操作测试（getDriverVehicles, insertVehicle, updateVehicle, deleteVehicle）
2. 审核流程测试（submitVehicleForReview, approveVehicle, requireSupplement）
3. 图片管理测试（togglePhotoLock, markPhotoForDeletion）
4. 驾照管理测试（getDriverLicense, upsertDriverLicense）

### 属性测试

使用 fast-check 库进行属性测试：
- 图片锁定状态切换的往返测试
- CRUD 操作的数据一致性测试

### 集成测试

- TypeScript 编译检查：`npx tsc --noEmit`
- H5 构建测试：`pnpm taro build --type h5`
- 本地服务器测试：`npx serve dist -l 8080 -s`

### 测试执行顺序

1. 每次代码修改后运行单元测试
2. 所有修改完成后运行 TypeScript 编译检查
3. 最后进行 H5 构建和本地测试
