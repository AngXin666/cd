# Requirements Document

## Introduction

本规范旨在统一项目中的缓存策略和数据获取逻辑，确保：
1. 所有数据访问都通过 Repository 层进行，享受统一的缓存管理
2. 移除页面级重复缓存，避免缓存不一致问题
3. 统一相同数据的获取逻辑，避免多套代码实现相同功能
4. 清理旧的缓存工具函数调用

## Glossary

- **Repository 模式**: 数据访问层抽象，提供统一的 CRUD 操作和内置缓存管理
- **页面级缓存**: 在页面组件中使用 `getVersionedCache`/`setVersionedCache` 实现的缓存
- **API 层**: `src/db/api/*.ts` 文件，作为 Repository 层的包装器
- **TTL**: Time To Live，缓存过期时间

## Requirements

### Requirement 1: 移除页面级重复缓存

**User Story:** 作为开发者，我希望所有缓存都由 Repository 层统一管理，以避免缓存不一致问题。

#### Acceptance Criteria

1. WHEN 页面需要获取数据 THEN 系统 SHALL 直接调用 API 层函数而不使用页面级缓存
2. WHEN 数据被修改 THEN Repository 层 SHALL 自动清除相关缓存
3. WHEN 页面使用 `getVersionedCache`/`setVersionedCache` THEN 系统 SHALL 移除这些调用并改用 API 层

### Requirement 2: 统一仓库-司机关系获取逻辑

**User Story:** 作为开发者，我希望所有页面使用相同的逻辑获取仓库对应的司机列表，以确保数据一致性。

#### Acceptance Criteria

1. WHEN 页面需要获取仓库的司机列表 THEN 系统 SHALL 使用 `WarehousesAPI.getAllDriverWarehouses()` 获取分配关系
2. WHEN 页面需要按仓库筛选司机 THEN 系统 SHALL 使用统一的 `warehouseDriversMap` 映射逻辑
3. WHEN 仓库分配关系变更 THEN Repository 层 SHALL 自动清除缓存（TTL 5 分钟）

### Requirement 3: 统一司机数据获取逻辑

**User Story:** 作为开发者，我希望所有页面使用相同的方式获取司机列表，以确保数据一致性。

#### Acceptance Criteria

1. WHEN 页面需要获取所有司机 THEN 系统 SHALL 使用 `UsersAPI.getDriverProfiles()` 或 `UsersAPI.getAllProfiles()`
2. WHEN 页面需要获取特定仓库的司机 THEN 系统 SHALL 使用 `WarehousesAPI.getDriversByWarehouse()`
3. WHEN 用户数据变更 THEN Repository 层 SHALL 自动清除缓存（TTL 5 分钟）

### Requirement 4: 清理旧缓存工具函数

**User Story:** 作为开发者，我希望移除所有旧的页面级缓存调用，以简化代码并避免混淆。

#### Acceptance Criteria

1. WHEN 页面导入 `getVersionedCache`/`setVersionedCache`/`clearVersionedCache` THEN 系统 SHALL 移除这些导入
2. WHEN 页面使用自定义缓存键（如 `manager_piece_work_*`）THEN 系统 SHALL 移除这些缓存逻辑
3. WHEN 清理完成 THEN 系统 SHALL 仅保留 `CACHE_KEYS` 和 `onDataUpdated` 的必要导入

### Requirement 5: 确保 Repository 模式全面应用

**User Story:** 作为开发者，我希望确认所有 API 层都已使用 Repository 模式，以享受统一的缓存管理。

#### Acceptance Criteria

1. WHEN API 层函数执行数据查询 THEN 系统 SHALL 通过对应的 Repository 进行
2. WHEN API 层函数执行数据修改 THEN 系统 SHALL 通过 Repository 并自动清除缓存
3. WHEN 新增 API 函数 THEN 开发者 SHALL 使用 Repository 模式实现

## 受影响的文件清单

### 需要移除页面级缓存的文件

1. `src/pages/super-admin/user-management/index.tsx` - 使用 `getVersionedCache`/`setVersionedCache`
2. `src/pages/super-admin/user-management/hooks/useUserManagement.ts` - 使用 `getVersionedCache`/`setVersionedCache`
3. `src/pages/manager/piece-work-report/index.tsx` - 使用 `getVersionedCache`/`setVersionedCache`/`clearVersionedCache`
4. `src/pages/manager/driver-management/index.tsx` - 使用 `getVersionedCache`/`setVersionedCache`
5. `src/pages/driver/vehicle-list/index.tsx` - 使用 `getVersionedCache`/`setVersionedCache`

### 已完成 Repository 迁移的 API 文件

1. ✅ `src/db/api/warehouses.ts` - 使用 warehousesRepository, warehouseAssignmentsRepository
2. ✅ `src/db/api/attendance.ts` - 使用 attendanceRepository
3. ✅ `src/db/api/piecework.ts` - 使用 pieceWorkRepository, categoriesRepository
4. ✅ `src/db/api/leave.ts` - 使用 leaveRepository
5. ✅ `src/db/api/users.ts` - 使用 usersRepository

### Repository 缓存 TTL 配置

| Repository | TTL | 说明 |
|------------|-----|------|
| WarehousesRepository | 10 分钟 | 仓库信息变化不频繁 |
| WarehouseAssignmentsRepository | 5 分钟 | 仓库分配关系 |
| UsersRepository | 5 分钟 | 用户信息 |
| AttendanceRepository | 2 分钟 | 考勤记录变化频繁 |
| PieceWorkRepository | 2 分钟 | 计件记录变化频繁 |
| LeaveRepository | 2 分钟 | 请假申请变化频繁 |
| NotificationsRepository | 1 分钟 | 通知需要及时更新 |
