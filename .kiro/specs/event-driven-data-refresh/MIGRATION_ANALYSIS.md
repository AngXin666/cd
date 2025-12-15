# 轮询代码迁移分析报告（完整版）

## 概述

本文档通过系统性扫描代码库，识别所有涉及数据更新的 API 函数，并分析哪些需要集成事件发布机制。

## 1. 数据变更 API 全面扫描

### 1.1 请假/离职模块 (`src/db/api/leave.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `createLeaveApplication` | INSERT | leave_applications | ✅ 已集成 | `leave:created` |
| `updateDraftLeaveApplication` | UPDATE | leave_applications | ❌ 未集成 | `leave:updated` |
| `deleteDraftLeaveApplication` | DELETE | leave_applications | ❌ 未集成 | `leave:deleted` |
| `reviewLeaveApplication` | UPDATE | leave_applications | ✅ 已集成 | `leave:updated` |
| `createResignationApplication` | INSERT | resignation_applications | ✅ 已集成 | `resignation:created` |
| `updateDraftResignationApplication` | UPDATE | resignation_applications | ❌ 未集成 | `resignation:updated` |
| `deleteDraftResignationApplication` | DELETE | resignation_applications | ❌ 未集成 | `resignation:deleted` |
| `reviewResignationApplication` | UPDATE | resignation_applications | ✅ 已集成 | `resignation:updated` |

### 1.2 考勤模块 (`src/db/api/attendance.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `createAttendanceRecord` | INSERT/UPDATE | attendance | ✅ 已集成 | `attendance:created` |
| `updateClockOut` | UPDATE | attendance | ❌ 未集成 | `attendance:updated` |
| `createAttendanceRule` | INSERT | attendance_rules | ❌ 未集成 | `attendance_rule:created` |
| `updateAttendanceRule` | UPDATE | attendance_rules | ❌ 未集成 | `attendance_rule:updated` |
| `deleteAttendanceRule` | DELETE | attendance_rules | ❌ 未集成 | `attendance_rule:deleted` |

### 1.3 计件模块 (`src/db/api/piecework.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `createPieceWorkRecord` | INSERT | piece_work_records | ✅ 已集成 | `piece_work:created` |
| `updatePieceWorkRecord` | UPDATE | piece_work_records | ✅ 已集成 | `piece_work:updated` |
| `deletePieceWorkRecord` | DELETE | piece_work_records | ❌ 未集成 | `piece_work:deleted` |
| `createCategory` | INSERT | piece_work_categories | ❌ 未集成 | `category:created` |
| `updateCategory` | UPDATE | piece_work_categories | ❌ 未集成 | `category:updated` |
| `deleteCategory` | DELETE | piece_work_categories | ❌ 未集成 | `category:deleted` |
| `deleteUnusedCategories` | DELETE | piece_work_categories | ❌ 未集成 | `category:deleted` |
| `upsertCategoryPrice` | UPSERT | category_prices | ❌ 未集成 | `category_price:updated` |
| `upsertCategoryPrices` | UPSERT | category_prices | ❌ 未集成 | `category_price:updated` |
| `deleteCategoryPrice` | DELETE | category_prices | ❌ 未集成 | `category_price:deleted` |


### 1.4 仓库模块 (`src/db/api/warehouses.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `createWarehouse` | INSERT | warehouses | ❌ 未集成 | `warehouse:created` |
| `updateWarehouse` | UPDATE | warehouses | ❌ 未集成 | `warehouse:updated` |
| `deleteWarehouse` | DELETE | warehouses | ❌ 未集成 | `warehouse:deleted` |
| `updateWarehouseSettings` | UPDATE | warehouses | ❌ 未集成 | `warehouse:updated` |
| `assignWarehouseToDriver` | INSERT | warehouse_assignments | ❌ 未集成 | `warehouse_assignment:created` |
| `removeWarehouseFromDriver` | DELETE | warehouse_assignments | ❌ 未集成 | `warehouse_assignment:deleted` |
| `deleteWarehouseAssignmentsByDriver` | DELETE | warehouse_assignments | ❌ 未集成 | `warehouse_assignment:deleted` |
| `insertWarehouseAssignment` | UPSERT | warehouse_assignments | ❌ 未集成 | `warehouse_assignment:created` |
| `insertManagerWarehouseAssignment` | INSERT | warehouse_assignments | ❌ 未集成 | `warehouse_assignment:created` |
| `setDriverWarehouses` | DELETE+INSERT | warehouse_assignments | ❌ 未集成 | `warehouse_assignment:updated` |
| `addManagerWarehouse` | INSERT | warehouse_assignments | ❌ 未集成 | `warehouse_assignment:created` |
| `removeManagerWarehouse` | DELETE | warehouse_assignments | ❌ 未集成 | `warehouse_assignment:deleted` |
| `setManagerWarehouses` | DELETE+INSERT | warehouse_assignments | ❌ 未集成 | `warehouse_assignment:updated` |

### 1.5 车辆模块 (`src/db/api/vehicles.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `createVehicle` | INSERT | vehicles | ❌ 未集成 | `vehicle:created` |
| `updateVehicle` | UPDATE | vehicles | ❌ 未集成 | `vehicle:updated` |
| `deleteVehicle` | DELETE | vehicles | ❌ 未集成 | `vehicle:deleted` |
| `returnVehicle` | UPDATE | vehicles, vehicle_documents | ❌ 未集成 | `vehicle:returned` |
| `submitVehicleForReview` | UPDATE | vehicles | ❌ 未集成 | `vehicle:review_submitted` |
| `approveVehicle` | UPDATE | vehicles, vehicle_documents | ❌ 未集成 | `vehicle:approved` |
| `lockVehiclePhotos` | UPDATE | vehicles, vehicle_documents | ❌ 未集成 | `vehicle:photos_locked` |
| `requireSupplement` | UPDATE | vehicles, vehicle_documents | ❌ 未集成 | `vehicle:supplement_required` |
| `updateVehiclePhotos` | UPDATE | vehicles | ❌ 未集成 | `vehicle:photos_updated` |
| `saveOrUpdateDriverLicense` | UPSERT | driver_licenses | ❌ 未集成 | `driver_license:updated` |
| `updateDriverLicense` | UPDATE | driver_licenses | ❌ 未集成 | `driver_license:updated` |
| `deleteDriverLicense` | DELETE | driver_licenses | ❌ 未集成 | `driver_license:deleted` |

### 1.6 用户模块 (`src/db/api/users.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `updateManagerPermissionsEnabled` | UPDATE | users | ❌ 未集成 | `user:permission_updated` |
| `updateProfile` | UPDATE | users | ❌ 未集成 | `user:updated` |
| `updateUserRole` | UPDATE | users | ❌ 未集成 | `user:role_updated` |
| `updateUserInfo` | UPDATE | users | ❌ 未集成 | `user:updated` |
| `createUserWithRole` | INSERT | users | ❌ 未集成 | `user:created` |
| `deleteUser` | DELETE | users | ❌ 未集成 | `user:deleted` |

### 1.7 通知模块 (`src/db/api/notifications.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `createNotification` | INSERT | notifications | ❌ 未集成 | `notification:created` |
| `createNotificationSendRecord` | INSERT | notification_send_records | ❌ 未集成 | - |
| `createNotificationsBatch` | INSERT | notifications | ❌ 未集成 | `notification:created` |
| `markNotificationAsRead` | UPDATE | notifications | ❌ 未集成 | `notification:read` |
| `markAllNotificationsAsRead` | UPDATE | notifications | ❌ 未集成 | `notification:read` |
| `deleteNotification` | DELETE | notifications | ❌ 未集成 | `notification:deleted` |
| `createNotificationTemplate` | INSERT | notification_templates | ❌ 未集成 | - |
| `updateNotificationTemplate` | UPDATE | notification_templates | ❌ 未集成 | - |
| `deleteNotificationTemplate` | DELETE | notification_templates | ❌ 未集成 | - |
| `createScheduledNotification` | INSERT | scheduled_notifications | ❌ 未集成 | - |
| `updateScheduledNotification` | UPDATE | scheduled_notifications | ❌ 未集成 | - |
| `createAutoReminderRule` | INSERT | auto_reminder_rules | ❌ 未集成 | - |
| `updateAutoReminderRule` | UPDATE | auto_reminder_rules | ❌ 未集成 | - |
| `deleteAutoReminderRule` | DELETE | auto_reminder_rules | ❌ 未集成 | - |

### 1.8 同行账号模块 (`src/db/api/peer-accounts.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `updatePeerAccount` | UPDATE | users | ❌ 未集成 | `peer_account:updated` |

### 1.9 同行管理员模块 (`src/db/api/peer-admin.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `createPeerAdmin` | INSERT (RPC) | peer_admin_permissions | ❌ 未集成 | `peer_admin:created` |
| `updatePeerAdminPermission` | UPDATE (RPC) | peer_admin_permissions | ❌ 未集成 | `peer_admin:updated` |
| `removePeerAdmin` | DELETE (RPC) | peer_admin_permissions | ❌ 未集成 | `peer_admin:deleted` |

### 1.10 权限策略模块 (`src/db/api/permission-strategy.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `createPeerAdmin` | INSERT (RPC) | permission_strategies | ❌ 未集成 | `permission:peer_admin_created` |
| `updatePeerAdminPermission` | UPDATE (RPC) | permission_strategies | ❌ 未集成 | `permission:peer_admin_updated` |
| `removePeerAdmin` | DELETE (RPC) | permission_strategies | ❌ 未集成 | `permission:peer_admin_deleted` |
| `createManager` | INSERT (RPC) | permission_strategies | ❌ 未集成 | `permission:manager_created` |
| `updateManagerPermission` | UPDATE (RPC) | permission_strategies | ❌ 未集成 | `permission:manager_updated` |
| `removeManager` | DELETE (RPC) | permission_strategies | ❌ 未集成 | `permission:manager_deleted` |
| `createScheduler` | INSERT (RPC) | permission_strategies | ❌ 未集成 | `permission:scheduler_created` |
| `updateSchedulerPermission` | UPDATE (RPC) | permission_strategies | ❌ 未集成 | `permission:scheduler_updated` |
| `removeScheduler` | DELETE (RPC) | permission_strategies | ❌ 未集成 | `permission:scheduler_deleted` |

### 1.11 统计模块 (`src/db/api/stats.ts`)

| API 函数 | 操作类型 | 数据表 | 事件发布状态 | 需要的事件 |
|----------|----------|--------|--------------|------------|
| `addRoleToUser` | INSERT (RPC) | user_roles | ❌ 未集成 | `user:role_added` |
| `removeRoleFromUser` | DELETE (RPC) | user_roles | ❌ 未集成 | `user:role_removed` |


---

## 2. 事件类型汇总

### 2.1 现有事件类型（已定义）

```typescript
// src/utils/eventBus.ts
export type EventType =
  | 'leave:created'           // 请假申请创建
  | 'leave:updated'           // 请假申请更新（审批）
  | 'resignation:created'     // 离职申请创建
  | 'resignation:updated'     // 离职申请更新（审批）
  | 'attendance:created'      // 打卡记录创建
  | 'piece_work:created'      // 计件记录创建
  | 'piece_work:updated'      // 计件记录更新
  | 'notification:created'    // 通知创建
  | 'notification:read'       // 通知已读
  | 'data:refresh'            // 通用数据刷新
```

### 2.2 需要新增的事件类型

根据扫描结果，需要新增以下事件类型：

```typescript
// 请假/离职相关
| 'leave:deleted'                    // 请假申请删除
| 'resignation:deleted'              // 离职申请删除

// 考勤相关
| 'attendance:updated'               // 打卡记录更新（下班打卡）
| 'attendance_rule:created'          // 考勤规则创建
| 'attendance_rule:updated'          // 考勤规则更新
| 'attendance_rule:deleted'          // 考勤规则删除

// 计件相关
| 'piece_work:deleted'               // 计件记录删除
| 'category:created'                 // 品类创建
| 'category:updated'                 // 品类更新
| 'category:deleted'                 // 品类删除
| 'category_price:updated'           // 品类价格更新
| 'category_price:deleted'           // 品类价格删除

// 仓库相关
| 'warehouse:created'                // 仓库创建
| 'warehouse:updated'                // 仓库更新
| 'warehouse:deleted'                // 仓库删除
| 'warehouse_assignment:created'     // 仓库分配创建
| 'warehouse_assignment:updated'     // 仓库分配更新
| 'warehouse_assignment:deleted'     // 仓库分配删除

// 车辆相关
| 'vehicle:created'                  // 车辆创建
| 'vehicle:updated'                  // 车辆更新
| 'vehicle:deleted'                  // 车辆删除
| 'vehicle:returned'                 // 车辆归还
| 'vehicle:review_submitted'         // 车辆提交审核
| 'vehicle:approved'                 // 车辆审核通过
| 'vehicle:photos_locked'            // 车辆照片锁定
| 'vehicle:supplement_required'      // 车辆需要补录
| 'vehicle:photos_updated'           // 车辆照片更新
| 'driver_license:updated'           // 驾照更新
| 'driver_license:deleted'           // 驾照删除

// 用户相关
| 'user:created'                     // 用户创建
| 'user:updated'                     // 用户更新
| 'user:deleted'                     // 用户删除
| 'user:role_updated'                // 用户角色更新
| 'user:permission_updated'          // 用户权限更新

// 通知相关
| 'notification:deleted'             // 通知删除

// 同行账号相关
| 'peer_account:updated'             // 同行账号更新

// 同行管理员相关
| 'peer_admin:created'               // 同行管理员创建
| 'peer_admin:updated'               // 同行管理员权限更新
| 'peer_admin:deleted'               // 同行管理员删除

// 权限策略相关
| 'permission:peer_admin_created'    // 同行管理员权限创建
| 'permission:peer_admin_updated'    // 同行管理员权限更新
| 'permission:peer_admin_deleted'    // 同行管理员权限删除
| 'permission:manager_created'       // 车队长权限创建
| 'permission:manager_updated'       // 车队长权限更新
| 'permission:manager_deleted'       // 车队长权限删除
| 'permission:scheduler_created'     // 调度权限创建
| 'permission:scheduler_updated'     // 调度权限更新
| 'permission:scheduler_deleted'     // 调度权限删除

// 角色管理相关
| 'user:role_added'                  // 用户角色添加
| 'user:role_removed'                // 用户角色移除
```

---

## 3. 事件发布集成状态统计

### 3.1 已集成事件发布的 API（7个）

| 模块 | API 函数 | 事件 |
|------|----------|------|
| 请假 | `createLeaveApplication` | `leave:created` |
| 请假 | `reviewLeaveApplication` | `leave:updated` |
| 离职 | `createResignationApplication` | `resignation:created` |
| 离职 | `reviewResignationApplication` | `resignation:updated` |
| 考勤 | `createAttendanceRecord` | `attendance:created` |
| 计件 | `createPieceWorkRecord` | `piece_work:created` |
| 计件 | `updatePieceWorkRecord` | `piece_work:updated` |

### 3.2 未集成事件发布的 API（按优先级分类）

#### 🔴 高优先级（核心业务流程，影响用户体验）

| 模块 | API 函数 | 需要的事件 | 影响场景 |
|------|----------|------------|----------|
| 仓库 | `assignWarehouseToDriver` | `warehouse_assignment:created` | 司机分配仓库后需刷新 |
| 仓库 | `removeWarehouseFromDriver` | `warehouse_assignment:deleted` | 取消分配后需刷新 |
| 仓库 | `setDriverWarehouses` | `warehouse_assignment:updated` | 批量设置仓库后需刷新 |
| 车辆 | `submitVehicleForReview` | `vehicle:review_submitted` | 管理员需收到审核通知 |
| 车辆 | `approveVehicle` | `vehicle:approved` | 司机需收到审核结果 |
| 车辆 | `requireSupplement` | `vehicle:supplement_required` | 司机需收到补录通知 |
| 用户 | `updateUserRole` | `user:role_updated` | 角色变更后权限需刷新 |
| 用户 | `updateManagerPermissionsEnabled` | `user:permission_updated` | 权限变更后需刷新 |

#### 🟡 中等优先级（管理功能，影响数据一致性）

| 模块 | API 函数 | 需要的事件 | 影响场景 |
|------|----------|------------|----------|
| 仓库 | `createWarehouse` | `warehouse:created` | 仓库列表需刷新 |
| 仓库 | `updateWarehouse` | `warehouse:updated` | 仓库信息需刷新 |
| 仓库 | `deleteWarehouse` | `warehouse:deleted` | 仓库列表需刷新 |
| 车辆 | `createVehicle` | `vehicle:created` | 车辆列表需刷新 |
| 车辆 | `updateVehicle` | `vehicle:updated` | 车辆信息需刷新 |
| 车辆 | `deleteVehicle` | `vehicle:deleted` | 车辆列表需刷新 |
| 车辆 | `returnVehicle` | `vehicle:returned` | 车辆状态需刷新 |
| 用户 | `createUserWithRole` | `user:created` | 用户列表需刷新 |
| 用户 | `updateProfile` | `user:updated` | 用户信息需刷新 |
| 用户 | `deleteUser` | `user:deleted` | 用户列表需刷新 |
| 计件 | `createCategory` | `category:created` | 品类列表需刷新 |
| 计件 | `updateCategory` | `category:updated` | 品类信息需刷新 |
| 计件 | `deleteCategory` | `category:deleted` | 品类列表需刷新 |
| 计件 | `upsertCategoryPrice` | `category_price:updated` | 价格配置需刷新 |

#### 🟢 低优先级（辅助功能，影响较小）

| 模块 | API 函数 | 需要的事件 | 影响场景 |
|------|----------|------------|----------|
| 考勤 | `updateClockOut` | `attendance:updated` | 考勤记录需刷新 |
| 考勤 | `createAttendanceRule` | `attendance_rule:created` | 规则列表需刷新 |
| 考勤 | `updateAttendanceRule` | `attendance_rule:updated` | 规则信息需刷新 |
| 考勤 | `deleteAttendanceRule` | `attendance_rule:deleted` | 规则列表需刷新 |
| 计件 | `deletePieceWorkRecord` | `piece_work:deleted` | 计件列表需刷新 |
| 车辆 | `saveOrUpdateDriverLicense` | `driver_license:updated` | 驾照信息需刷新 |
| 车辆 | `updateDriverLicense` | `driver_license:updated` | 驾照信息需刷新 |
| 车辆 | `deleteDriverLicense` | `driver_license:deleted` | 驾照信息需刷新 |
| 车辆 | `lockVehiclePhotos` | `vehicle:photos_locked` | 车辆状态需刷新 |
| 车辆 | `updateVehiclePhotos` | `vehicle:photos_updated` | 车辆照片需刷新 |
| 通知 | `markNotificationAsRead` | `notification:read` | 通知状态需刷新 |
| 通知 | `deleteNotification` | `notification:deleted` | 通知列表需刷新 |


---

## 4. 跨端通知场景分析

### 4.1 需要 Realtime 订阅的场景

| 场景 | 触发方 | 接收方 | 数据表 | 事件类型 |
|------|--------|--------|--------|----------|
| 司机提交请假 | 司机 | 管理员 | leave_applications | INSERT |
| 司机提交离职 | 司机 | 管理员 | resignation_applications | INSERT |
| 管理员审批请假 | 管理员 | 司机 | leave_applications | UPDATE |
| 管理员审批离职 | 管理员 | 司机 | resignation_applications | UPDATE |
| 司机提交车辆审核 | 司机 | 管理员 | vehicles | UPDATE |
| 管理员审核车辆 | 管理员 | 司机 | vehicles | UPDATE |
| 管理员分配仓库 | 管理员 | 司机 | warehouse_assignments | INSERT |
| 管理员取消仓库分配 | 管理员 | 司机 | warehouse_assignments | DELETE |
| 管理员修改司机角色 | 管理员 | 司机 | users | UPDATE |
| 管理员修改权限 | 管理员 | 司机/管理员 | users | UPDATE |
| 司机打卡 | 司机 | 管理员 | attendance | INSERT |
| 司机提交计件 | 司机 | 管理员 | piece_work_records | INSERT |

### 4.2 需要订阅的 Supabase Realtime 表

```typescript
// 管理员需要订阅的表
const managerRealtimeTables = [
  'leave_applications',        // 请假申请
  'resignation_applications',  // 离职申请
  'vehicles',                  // 车辆（审核状态）
  'attendance',                // 考勤记录
  'piece_work_records',        // 计件记录
]

// 司机需要订阅的表
const driverRealtimeTables = [
  'leave_applications',        // 请假申请（审批状态）
  'resignation_applications',  // 离职申请（审批状态）
  'vehicles',                  // 车辆（审核状态）
  'warehouse_assignments',     // 仓库分配
  'users',                     // 用户信息（角色/权限变更）
]
```

---

## 5. 迁移优先级列表（更新版）

### 🔴 高优先级（第一阶段）

| 序号 | 任务 | 说明 |
|------|------|------|
| 1 | 扩展 Event Bus 事件类型 | 添加所有需要的事件类型 |
| 2 | 仓库分配 API 事件集成 | `assignWarehouseToDriver`, `removeWarehouseFromDriver`, `setDriverWarehouses` |
| 3 | 车辆审核 API 事件集成 | `submitVehicleForReview`, `approveVehicle`, `requireSupplement` |
| 4 | 用户权限 API 事件集成 | `updateUserRole`, `updateManagerPermissionsEnabled` |
| 5 | 创建 useRealtimeSubscription Hook | 用于跨端实时通知 |
| 6 | 管理员页面 Realtime 集成 | 订阅请假、离职、车辆审核等 |
| 7 | 司机页面 Realtime 集成 | 订阅审批结果、仓库分配等 |

### 🟡 中等优先级（第二阶段）

| 序号 | 任务 | 说明 |
|------|------|------|
| 8 | 仓库管理 API 事件集成 | `createWarehouse`, `updateWarehouse`, `deleteWarehouse` |
| 9 | 车辆管理 API 事件集成 | `createVehicle`, `updateVehicle`, `deleteVehicle`, `returnVehicle` |
| 10 | 用户管理 API 事件集成 | `createUserWithRole`, `updateProfile`, `deleteUser` |
| 11 | 品类管理 API 事件集成 | `createCategory`, `updateCategory`, `deleteCategory` |
| 12 | 品类价格 API 事件集成 | `upsertCategoryPrice`, `deleteCategoryPrice` |
| 13 | 权限策略 API 事件集成 | `createManager`, `updateManagerPermission`, `removeManager`, `createScheduler`, `updateSchedulerPermission`, `removeScheduler` |
| 14 | 同行管理员 API 事件集成 | `createPeerAdmin`, `updatePeerAdminPermission`, `removePeerAdmin` |
| 15 | 角色管理 API 事件集成 | `addRoleToUser`, `removeRoleFromUser` |

### 🟢 低优先级（第三阶段）

| 序号 | 任务 | 说明 |
|------|------|------|
| 16 | 考勤规则 API 事件集成 | `createAttendanceRule`, `updateAttendanceRule`, `deleteAttendanceRule` |
| 17 | 驾照管理 API 事件集成 | `saveOrUpdateDriverLicense`, `updateDriverLicense`, `deleteDriverLicense` |
| 18 | 通知管理 API 事件集成 | `markNotificationAsRead`, `deleteNotification` |
| 19 | 移除轮询代码 | 清理不再需要的轮询逻辑 |
| 20 | 实现降级机制 | Realtime 失败时的备用方案 |

---

## 6. 统计汇总

### 6.1 API 函数统计

| 类别 | 数量 |
|------|------|
| 总数据变更 API | 约 75 个 |
| 已集成事件发布 | 7 个 (9%) |
| 未集成事件发布 | 约 68 个 (91%) |

### 6.2 事件类型统计

| 类别 | 数量 |
|------|------|
| 现有事件类型 | 10 个 |
| 需要新增事件类型 | 约 50 个 |
| 总计 | 约 60 个 |

### 6.3 按模块分布

| 模块 | 数据变更 API 数量 | 已集成 | 未集成 |
|------|-------------------|--------|--------|
| 请假/离职 | 8 | 4 | 4 |
| 考勤 | 5 | 1 | 4 |
| 计件 | 10 | 2 | 8 |
| 仓库 | 13 | 0 | 13 |
| 车辆 | 12 | 0 | 12 |
| 用户 | 6 | 0 | 6 |
| 通知 | 14 | 0 | 14 |
| 同行账号 | 1 | 0 | 1 |
| 同行管理员 | 3 | 0 | 3 |
| 权限策略 | 9 | 0 | 9 |
| 统计/角色 | 2 | 0 | 2 |

---

## 7. 结论

### 7.1 当前状态

- 事件驱动机制的基础设施已经建立（Event Bus、useEventSubscription）
- 但只有 **9%** 的数据变更 API 集成了事件发布
- 大量核心业务场景（仓库分配、车辆审核、用户权限、权限策略）缺少事件通知

### 7.2 主要差距

1. **仓库模块**：13 个 API 全部未集成事件发布
2. **车辆模块**：12 个 API 全部未集成事件发布
3. **用户模块**：6 个 API 全部未集成事件发布
4. **权限策略模块**：9 个 API 全部未集成事件发布（PEER_ADMIN、MANAGER、SCHEDULER 权限管理）
5. **同行管理员模块**：3 个 API 全部未集成事件发布
6. **统计/角色模块**：2 个 API 全部未集成事件发布（角色添加/移除）
7. **跨端通知**：缺少 `useRealtimeSubscription` Hook

### 7.3 建议的实施顺序

1. **第一阶段**：扩展事件类型 + 高优先级 API 集成 + Realtime Hook
2. **第二阶段**：中等优先级 API 集成（包括权限策略模块）
3. **第三阶段**：低优先级 API 集成 + 清理轮询代码

### 7.4 预期工作量

- 扩展 Event Bus 事件类型：1-2 天（新增约 50 个事件类型）
- 高优先级 API 集成：2-3 天
- 创建 useRealtimeSubscription Hook：1 天
- 页面 Realtime 集成：2-3 天
- 中等优先级 API 集成（含权限策略）：3-4 天
- 低优先级 API 集成：1-2 天
- 测试和调试：2-3 天

**总计：约 14-18 天**

---

*文档生成时间：2025-12-15*
*最后更新：2025-12-15*
*分析方法：系统性扫描 src/db/api 目录下所有 .ts 文件中的 insert/update/delete/upsert/rpc 操作*
*覆盖模块：leave, attendance, piecework, warehouses, vehicles, users, notifications, peer-accounts, peer-admin, permission-strategy, stats*
