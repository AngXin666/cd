# Implementation Plan

## 任务概览

本任务清单旨在统一项目中的缓存策略和数据获取逻辑，确保缓存一致性。

---

## 第一部分：移除页面级重复缓存（5个文件）

- [x] 1. 移除 super-admin/user-management 页面级缓存
  - [x] 1.1 清理 index.tsx 中的页面级缓存
    - 移除 `getVersionedCache`/`setVersionedCache` 导入
    - 移除 `CACHE_KEYS.SUPER_ADMIN_USERS`、`CACHE_KEYS.SUPER_ADMIN_USER_DETAILS`、`CACHE_KEYS.SUPER_ADMIN_USER_WAREHOUSES` 缓存逻辑
    - 简化 `loadUsers` 函数，直接调用 API（Repository 层已有缓存）
    - 保留 `CACHE_KEYS` 和 `onDataUpdated` 用于事件订阅
    - _Requirements: 1.1, 4.1, 4.2_
  - [x] 1.2 清理 hooks/useUserManagement.ts 中的页面级缓存
    - 移除 `getVersionedCache`/`setVersionedCache` 导入
    - 移除 `CACHE_KEYS.SUPER_ADMIN_USERS`、`CACHE_KEYS.SUPER_ADMIN_USER_DETAILS` 缓存逻辑
    - 简化数据加载逻辑
    - _Requirements: 1.1, 4.1, 4.2_

- [x] 2. 移除 manager/piece-work-report 页面级缓存
  - [x] 2.1 清理 index.tsx 中的页面级缓存
    - 移除 `getVersionedCache`/`setVersionedCache`/`clearVersionedCache` 导入
    - 移除自定义缓存键 `manager_piece_work_base_data_*` 和 `manager_piece_work_records_*`
    - 简化 `loadData` 函数，直接调用 API
    - 简化 `loadRecords` 函数，直接调用 API
    - 简化 `preloadOtherWarehouses` 函数
    - 移除 `useDidShow` 中的缓存清理逻辑
    - _Requirements: 1.1, 4.1, 4.2, 4.3_

- [x] 3. 移除 manager/driver-management 页面级缓存
  - [x] 3.1 清理 index.tsx 中的页面级缓存
    - 移除 `getVersionedCache`/`setVersionedCache` 导入
    - 移除 `CACHE_KEYS.MANAGER_DRIVERS`、`CACHE_KEYS.MANAGER_DRIVER_DETAILS`、`CACHE_KEYS.MANAGER_DRIVER_WAREHOUSES` 缓存逻辑
    - 简化 `loadDrivers` 函数，直接调用 API
    - _Requirements: 1.1, 4.1, 4.2_

- [x] 4. 移除 driver/vehicle-list 页面级缓存
  - [x] 4.1 清理 index.tsx 中的页面级缓存
    - 移除 `getVersionedCache`/`setVersionedCache` 导入
    - 移除自定义缓存键 `driver_vehicles_*`
    - 简化 `loadVehicles` 函数，直接调用 API
    - _Requirements: 1.1, 4.1, 4.2_

---

## 第二部分：统一数据获取逻辑

### 2.1 统一仓库-司机关系获取逻辑

**统一模式**：使用 `WarehousesAPI.getAllDriverWarehouses()` + `warehouseDriversMap` 映射

| 页面 | 当前方式 | 目标方式 |
|------|---------|---------|
| super-admin/leave-approval | ✅ 已使用统一模式 | 保持 |
| super-admin/piece-work-report | ✅ 已使用统一模式 | 保持 |
| super-admin/user-management | 单独获取每个用户的仓库 | 统一模式 |
| manager/piece-work-report | 单独获取每个用户的仓库 | 统一模式 |
| manager/driver-management | 使用 `driverWarehouseMap` | 确认一致 |

- [x] 5. 统一 super-admin/user-management 的仓库-司机关系获取
  - [x] 5.1 添加 `warehouseDriversMap` 状态
    - 在 `loadUsers` 中调用 `WarehousesAPI.getAllDriverWarehouses()`
    - 构建 `warehouseDriversMap` 映射
    - _Requirements: 2.1, 2.2_
  - [x] 5.2 统一 hooks/useUserManagement.ts 的逻辑
    - 使用相同的 `warehouseDriversMap` 模式
    - _Requirements: 2.1, 2.2_

- [x] 6. 统一 manager/piece-work-report 的仓库-司机关系获取
  - [x] 6.1 添加 `warehouseDriversMap` 状态
    - 在 `loadData` 中调用 `WarehousesAPI.getAllDriverWarehouses()`
    - 构建 `warehouseDriversMap` 映射
    - 用于按仓库筛选司机
    - _Requirements: 2.1, 2.2_

- [x] 7. 确认 manager/driver-management 的逻辑一致性
  - [x] 7.1 检查 `driverWarehouseMap` 的数据来源
    - ✅ 确认使用 `WarehousesAPI.getDriverWarehouseIds()` 获取
    - ✅ 底层调用 `warehouseAssignmentsRepository.getWarehouseIdsByUser()`
    - ✅ Repository 层带有 5 分钟缓存（TTL）
    - ✅ 与其他页面使用相同的 Repository 层，数据来源一致
    - ⚠️ 数据结构方向不同：`driverWarehouseMap`（司机→仓库）vs `warehouseDriversMap`（仓库→司机）
    - ⚠️ 这是由于功能需求不同导致的合理差异，不需要修改
    - _Requirements: 2.1, 2.2_

### 2.2 统一司机列表获取逻辑

**统一模式**：
- 获取所有司机：`UsersAPI.getDriverProfiles()` 或 `UsersAPI.getAllProfiles().filter(role=DRIVER)`
- 获取特定仓库司机：`WarehousesAPI.getDriversByWarehouse(warehouseId)`
- 获取司机含实名：`UsersAPI.getAllDriversWithRealName()`

| 页面 | 当前方式 | 是否一致 |
|------|---------|---------|
| super-admin/piece-work-report | `UsersAPI.getDriverProfiles()` | ✅ |
| super-admin/leave-approval | `UsersAPI.getAllProfiles()` | ✅ |
| super-admin/staff-management | `WarehousesAPI.getDriversByWarehouse()` | ✅ |
| manager/piece-work-report | `UsersAPI.getDriverProfiles()` | ✅ |
| manager/driver-management | `UsersAPI.getAllDriversWithRealName()` | ✅ |
| manager/staff-management | `WarehousesAPI.getDriversByWarehouse()` | ✅ |

- [x] 8. 验证司机列表获取逻辑一致性
  - [x] 8.1 检查所有页面的司机获取方式
    - ✅ 确认都通过 API 层调用
    - ✅ 确认 API 层都使用 Repository
    - ✅ 验证结果：
      - `UsersAPI.getAllProfiles()` → `usersRepository.getAllUsers()` (TTL 5分钟)
      - `UsersAPI.getDriverProfiles()` → `getUsersByRole('DRIVER')` (带权限过滤)
      - `UsersAPI.getAllDriversWithRealName()` → `getUsersByRole('DRIVER')` + driver_licenses 查询
      - `WarehousesAPI.getDriversByWarehouse()` → `warehouseAssignmentsRepository.getUserIdsByWarehouse()` (TTL 5分钟)
    - ✅ 所有 17 个使用司机列表的页面都已通过 API 层调用
    - _Requirements: 3.1, 3.2_

### 2.3 统一仓库列表获取逻辑

**统一模式**：
- 获取所有仓库：`WarehousesAPI.getAllWarehouses()`
- 获取启用仓库：`WarehousesAPI.getActiveWarehouses()` 或 `.filter(is_active)`
- 获取管理员仓库：`WarehousesAPI.getManagerWarehouses(managerId)`
- 获取司机仓库：`WarehousesAPI.getDriverWarehouses(driverId)`

| 角色 | 获取方式 | 使用页面 |
|------|---------|---------|
| BOSS | `getAllWarehouses()` | 用户管理、仓库管理、品类管理等 |
| MANAGER | `getManagerWarehouses(id)` | 件数报表、司机管理、品类配置等 |
| DRIVER | `getDriverWarehouses(id)` | 请假申请、计件录入、打卡等 |

- [x] 9. 验证仓库列表获取逻辑一致性
  - [x] 9.1 检查所有页面的仓库获取方式
    - ✅ 确认 BOSS 角色（super-admin 页面）使用 `getAllWarehouses()` 或 `getAllWarehousesWithRules()`
      - warehouse-management、warehouse-edit、user-management、staff-management
      - piece-work-report-form、piece-work-report-detail、piece-work-report
      - manager-warehouse-assignment、leave-approval、driver-warehouse-assignment
      - driver-leave-detail、driver-attendance-detail、category-management
    - ✅ 确认 MANAGER 角色（manager 页面）使用 `getManagerWarehouses(user.id)`
      - warehouse-categories、staff-management、piece-work-report-detail
      - piece-work-report、leave-approval、driver-management、data-summary
      - ⚠️ 部分页面同时使用 `getAllWarehouses()` 用于显示仓库名称（合理用法）
      - ⚠️ driver-leave-detail 使用 `getAllWarehouses()` 用于显示历史数据的仓库名称（合理用法）
    - ✅ 确认 DRIVER 角色（driver 页面）使用 `getDriverWarehouses(user.id)`
      - piece-work-entry、leave/index、leave/resign、leave/apply
      - warehouse-stats 使用 `getWarehouseById()` 获取单个仓库详情
    - ✅ shared 页面使用 `getAllWarehouses()` 是合理的（通知、自动提醒等功能需要所有仓库）
    - ✅ 所有仓库获取都通过 API 层调用，API 层使用 Repository（TTL 10 分钟）
    - _Requirements: 3.1, 3.2_

### 2.4 统一当前用户信息获取逻辑

**统一模式**：
- 基本信息：`UsersAPI.getCurrentUserProfile()`
- 含实名：`UsersAPI.getCurrentUserWithRealName()`
- 权限信息：`UsersAPI.getCurrentUserPermissions()`

- [x] 10. 验证当前用户信息获取逻辑一致性
  - [x] 10.1 检查所有页面的当前用户获取方式
    - ✅ 确认所有页面都通过以下方式获取当前用户信息：
      - `useAuth()` Hook - 提供基本认证信息（user.id），来自 `@supabase/auth-helpers-react`
      - `useUserContext()` Hook - 提供完整用户信息（role, name, phone 等），内部使用 `usersRepository.getById()`
      - `UsersAPI.getCurrentUserProfile()` - 获取当前用户档案，内部使用 `getUserWithRole()` → `usersRepository.getById()` (TTL 5分钟)
      - `UsersAPI.getCurrentUserWithRealName()` - 获取当前用户档案（含实名），内部使用 `getUserWithRole()` → `usersRepository.getById()` (TTL 5分钟)
      - `UsersAPI.getCurrentUserRole()` - 快速获取当前用户角色，直接查询数据库
      - `UsersAPI.getCurrentUserPermissions()` - 获取当前用户权限配置
    - ✅ 确认 API 层使用 Repository 情况：
      - `getCurrentUserProfile()` → `getUserWithRole()` → `usersRepository.getById()` ✅ 使用 Repository
      - `getCurrentUserWithRealName()` → `getUserWithRole()` → `usersRepository.getById()` ✅ 使用 Repository
      - `getCurrentUserRole()` → 直接查询 `supabase.from('users')` ⚠️ 未使用 Repository（轻量级查询，可接受）
      - `getCurrentUserPermissions()` → `getManagerPermission()` → 直接查询 `supabase.from('users')` ⚠️ 未使用 Repository（权限查询，可接受）
    - ✅ 确认 `UserContext` 使用 `usersRepository.getById()` 获取用户信息，缓存由 Repository 统一管理
    - ✅ 所有 20+ 个使用当前用户信息的页面都通过 API 层或 Context 调用
    - ⚠️ 注意：`getCurrentUserRole()` 和 `getCurrentUserPermissions()` 未使用 Repository，但这是合理的设计：
      - 这些是轻量级查询，只查询单个字段
      - 权限信息需要实时性，不适合缓存
      - 当前用户角色查询频率低，缓存收益有限
    - _Requirements: 3.1, 3.2_

---

## 第三部分：验证 Repository 模式全面应用

- [x] 11. 检查 API 层 Repository 使用情况
  - [x] 11.1 检查 users.ts
    - ✅ `getAllProfiles()` 使用 `usersRepository.getAllUsers()`
    - ✅ `getAllUsers()` 使用 `usersRepository.getAllUsers()`
    - ✅ `getAllDrivers()` 使用 `usersRepository.getAllDrivers()`
    - ✅ `getAllManagers()` 使用 `usersRepository.getAllManagers()`
    - ✅ `getDriverProfiles()` 使用 `getUsersByRole('DRIVER')` 辅助函数
    - ✅ `getAllDriversWithRealName()` 使用 `getUsersByRole('DRIVER')` 辅助函数
    - ✅ 数据修改操作都调用 `usersRepository.invalidateCache()`
    - _Requirements: 5.1, 5.2_
  - [x] 11.2 检查 vehicles.ts
    - ✅ `getDriverVehicles()` 使用 `vehiclesRepository.getByDriverId()`
    - ✅ `getAllVehiclesWithDrivers()` 使用 `vehiclesRepository.getAllWithDrivers()`
    - ✅ `getVehicleById()` 使用 `vehiclesRepository.getById()`
    - ✅ `getVehicleWithDriverDetails()` 使用 `vehiclesRepository.getWithDriverDetails()`
    - ✅ 数据修改操作都调用 `vehiclesRepository.invalidateCache()`
    - ✅ 驾驶证相关操作使用 `driverLicensesRepository`
    - _Requirements: 5.1, 5.2_
  - [x] 11.3 检查 warehouses.ts
    - ✅ 已确认使用 `warehousesRepository` 和 `warehouseAssignmentsRepository`
    - _Requirements: 5.1, 5.2_
  - [x] 11.4 检查 attendance.ts
    - ✅ 已确认使用 `attendanceRepository`
    - _Requirements: 5.1, 5.2_
  - [x] 11.5 检查 piecework.ts
    - ✅ 已确认使用 `pieceWorkRepository`、`categoriesRepository` 和 `categoryPricesRepository`
    - _Requirements: 5.1, 5.2_
  - [x] 11.6 检查 leave.ts
    - ✅ 已确认使用 `leaveRepository`
    - _Requirements: 5.1, 5.2_

---

## 第四部分：编译验证和测试

- [x] 12. 编译验证
  - [x] 12.1 TypeScript 编译检查
    - 运行 `npx tsc --noEmit` 确保无编译错误
    - _Requirements: 1.1, 4.1_

- [x] 13. 功能测试
  - [x] 13.1 测试 super-admin 页面
    - 用户管理页面数据加载
    - 件数报表页面数据加载
    - 考勤管理页面数据加载
    - _Requirements: 1.1, 2.1, 3.1_
  - [x] 13.2 测试 manager 页面
    - 件数报表页面数据加载
    - 司机管理页面数据加载
    - _Requirements: 1.1, 2.1, 3.1_
  - [x] 13.3 测试 driver 页面
    - 车辆列表页面数据加载
    - _Requirements: 1.1, 4.1_

---

## 第五部分：文档更新

- [x] 14. 更新开发文档
  - [x] 14.1 更新 Repository 使用指南
    - ✅ 添加"不要使用页面级缓存"的说明（包含原因、错误示例、正确示例）
    - ✅ 添加统一数据获取模式的示例（仓库-司机关系获取模式）
    - ✅ 添加各角色数据获取规范（仓库列表、司机列表、当前用户信息）
    - ✅ 添加 Repository 缓存 TTL 配置参考表
    - _Requirements: 5.3_

---

## 附录：Repository 缓存 TTL 配置

| Repository | TTL | 说明 |
|------------|-----|------|
| WarehousesRepository | 10 分钟 | 仓库信息变化不频繁 |
| WarehouseAssignmentsRepository | 5 分钟 | 仓库分配关系 |
| UsersRepository | 5 分钟 | 用户信息 |
| VehiclesRepository | 5 分钟 | 车辆信息 |
| CategoriesRepository | 10 分钟 | 品类信息 |
| AttendanceRepository | 2 分钟 | 考勤记录变化频繁 |
| PieceWorkRepository | 2 分钟 | 计件记录变化频繁 |
| LeaveRepository | 2 分钟 | 请假申请变化频繁 |
| NotificationsRepository | 1 分钟 | 通知需要及时更新 |

## 附录：统一数据获取模式总结

### 仓库-司机关系获取（推荐模式）

```typescript
// 1. 在 loadData 中获取所有分配关系
const allDriverWarehouses = await WarehousesAPI.getAllDriverWarehouses()

// 2. 构建映射
const warehouseDriversMapping = new Map<string, string[]>()
for (const assignment of allDriverWarehouses) {
  if (!warehouseDriversMapping.has(assignment.warehouse_id)) {
    warehouseDriversMapping.set(assignment.warehouse_id, [])
  }
  warehouseDriversMapping.get(assignment.warehouse_id)!.push(assignment.user_id)
}
setWarehouseDriversMap(warehouseDriversMapping)

// 3. 按仓库筛选司机
const assignedDriverIds = warehouseDriversMap.get(currentWarehouseId) || []
const filteredDrivers = drivers.filter(d => assignedDriverIds.includes(d.id))
```

### 数据获取规范

| 数据类型 | BOSS 角色 | MANAGER 角色 | DRIVER 角色 |
|---------|----------|-------------|-------------|
| 仓库列表 | `getAllWarehouses()` | `getManagerWarehouses(id)` | `getDriverWarehouses(id)` |
| 司机列表 | `getDriverProfiles()` | `getDriverProfiles()` + 仓库筛选 | N/A |
| 用户信息 | `getCurrentUserProfile()` | `getCurrentUserProfile()` | `getCurrentUserProfile()` |

---

## 优先级说明

1. **高优先级**：任务 1-4（移除页面级缓存）- 直接影响缓存一致性
2. **中优先级**：任务 5-11（统一逻辑和验证）- 确保代码质量和一致性
3. **低优先级**：任务 12-14（测试和文档）- 确保稳定性

## 风险评估

- **低风险**：移除页面级缓存后，Repository 层缓存仍然有效，不会影响性能
- **中风险**：需要确保所有页面都正确调用 API 层函数
- **缓解措施**：每个任务完成后进行编译检查和功能测试

## 预期收益

1. **缓存一致性**：所有缓存由 Repository 层统一管理，避免数据不一致
2. **代码简化**：移除重复的缓存逻辑，减少代码量约 200+ 行
3. **维护性提升**：统一的数据获取模式，便于理解和维护
4. **性能保证**：Repository 层缓存仍然有效，不会影响性能
5. **逻辑一致性**：所有页面使用相同的数据获取逻辑，避免数据不一致
