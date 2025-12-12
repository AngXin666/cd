# 🔍 未使用函数分析报告

## 📊 统计概览

**扫描时间**: 2025-12-12  
**扫描范围**: src/db/api/*.ts  
**发现未使用函数**: 33个  
**建议操作**: 保留（可能用于未来功能）或删除

---

## 📝 详细列表

### 1. attendance.ts (1个未使用)

#### ⚠️ deleteAttendanceRule
```typescript
export async function deleteAttendanceRule(ruleId: string)
```
**建议**: 保留 - 可能用于管理员删除考勤规则

---

### 2. dashboard.ts (1个未使用)

#### ⚠️ getWarehouseDataVolume
```typescript
export async function getWarehouseDataVolume(warehouseId: string)
```
**建议**: 保留 - 用于数据统计功能

---

### 3. leave.ts (3个未使用)

#### ⚠️ submitDraftLeaveApplication
```typescript
export async function submitDraftLeaveApplication(...)
```
**建议**: 保留 - 草稿功能可能在未来使用

#### ⚠️ submitDraftResignationApplication
```typescript
export async function submitDraftResignationApplication(...)
```
**建议**: 保留 - 草稿功能可能在未来使用

#### ⚠️ getResignationApplicationsByWarehouse
```typescript
export async function getResignationApplicationsByWarehouse(warehouseId: string)
```
**建议**: 保留 - 仓库维度的离职申请查询

---

### 4. notifications.ts (2个未使用)

#### ⚠️ createNotificationRecord
```typescript
export async function createNotificationRecord(...)
```
**建议**: 可删除 - 已有 createNotification 函数

#### ⚠️ getNotifications
```typescript
export async function getNotifications(...)
```
**建议**: 可删除 - 已有 getUserNotifications 函数

---

### 5. peer-accounts.ts (1个未使用)

#### ⚠️ isPrimaryAccount
```typescript
export async function isPrimaryAccount(userId: string)
```
**建议**: 保留 - 可能用于多账号管理

---

### 6. permission-context.ts (4个未使用)

#### ⚠️ getDriverPermissionContext
```typescript
export async function getDriverPermissionContext(userId: string)
```
**建议**: 可删除 - 权限系统已简化

#### ⚠️ getManagerPermissionContext
```typescript
export async function getManagerPermissionContext(userId: string)
```
**建议**: 可删除 - 权限系统已简化

#### ⚠️ getSchedulerPermissionContext
```typescript
export async function getSchedulerPermissionContext(userId: string)
```
**建议**: 可删除 - 权限系统已简化

#### ⚠️ getAdminPermissionContext
```typescript
export async function getAdminPermissionContext(userId: string)
```
**建议**: 可删除 - 权限系统已简化

---

### 7. permission-strategy.ts (6个未使用)

#### ⚠️ isPeerAdminWithFullControl
```typescript
export async function isPeerAdminWithFullControl(userId: string)
```
**建议**: 可删除 - 已有更通用的权限检查函数

#### ⚠️ isPeerAdminViewOnly
```typescript
export async function isPeerAdminViewOnly(userId: string)
```
**建议**: 可删除 - 已有更通用的权限检查函数

#### ⚠️ isManagerWithFullControl
```typescript
export async function isManagerWithFullControl(userId: string, warehouseId: string)
```
**建议**: 可删除 - 已有更通用的权限检查函数

#### ⚠️ isManagerViewOnly
```typescript
export async function isManagerViewOnly(userId: string, warehouseId: string)
```
**建议**: 可删除 - 已有更通用的权限检查函数

#### ⚠️ isSchedulerFullControl
```typescript
export async function isSchedulerFullControl(userId: string)
```
**建议**: 可删除 - 已有更通用的权限检查函数

#### ⚠️ isSchedulerViewOnly
```typescript
export async function isSchedulerViewOnly(userId: string)
```
**建议**: 可删除 - 已有更通用的权限检查函数

---

### 8. piecework.ts (3个未使用)

#### ⚠️ getAllPieceWorkRecords
```typescript
export async function getAllPieceWorkRecords()
```
**建议**: 保留 - 可能用于全局统计

#### ⚠️ getCategoryPrice
```typescript
export async function getCategoryPrice(warehouseId: string, category: string)
```
**建议**: 保留 - 价格查询功能

#### ⚠️ deleteCategoryPrice
```typescript
export async function deleteCategoryPrice(warehouseId: string, category: string)
```
**建议**: 保留 - 价格管理功能

---

### 9. users.ts (5个未使用)

#### ⚠️ getManagerProfiles
```typescript
export async function getManagerProfiles()
```
**建议**: 可删除 - 已有其他方式获取车队长列表

#### ⚠️ getManagerWarehouseIds
```typescript
export async function getManagerWarehouseIds(managerId: string)
```
**建议**: 可删除 - 已有其他方式获取仓库列表

#### ⚠️ updateManagerPermissionsEnabled
```typescript
export async function updateManagerPermissionsEnabled(...)
```
**建议**: 可删除 - 权限系统已简化

#### ⚠️ getManagerPermissionsEnabled
```typescript
export async function getManagerPermissionsEnabled(managerId: string)
```
**建议**: 可删除 - 权限系统已简化

#### ⚠️ deleteTenantWithLog
```typescript
export async function deleteTenantWithLog(tenantId: string)
```
**建议**: 保留 - 重要的删除功能

---

### 10. vehicles.ts (5个未使用)

#### ⚠️ getVehiclesByDriverId
```typescript
export async function getVehiclesByDriverId(driverId: string)
```
**建议**: 保留 - 司机车辆查询

#### ⚠️ deleteVehicle
```typescript
export async function deleteVehicle(vehicleId: string)
```
**建议**: 保留 - 车辆删除功能

#### ⚠️ updateDriverLicense
```typescript
export async function updateDriverLicense(...)
```
**建议**: 保留 - 驾照更新功能

#### ⚠️ getPendingReviewVehicles
```typescript
export async function getPendingReviewVehicles()
```
**建议**: 保留 - 车辆审核功能

#### ⚠️ lockVehiclePhotos
```typescript
export async function lockVehiclePhotos(vehicleId: string)
```
**建议**: 保留 - 照片锁定功能

---

### 11. warehouses.ts (7个未使用)

#### ⚠️ getActiveWarehouses
```typescript
export async function getActiveWarehouses()
```
**建议**: 保留 - 活跃仓库查询

#### ⚠️ getWarehousesWithRules
```typescript
export async function getWarehousesWithRules()
```
**建议**: 保留 - 带规则的仓库查询

#### ⚠️ assignWarehouseToDriver
```typescript
export async function assignWarehouseToDriver(...)
```
**建议**: 保留 - 仓库分配功能

#### ⚠️ removeWarehouseFromDriver
```typescript
export async function removeWarehouseFromDriver(...)
```
**建议**: 保留 - 仓库移除功能

#### ⚠️ getAllDriverWarehouses
```typescript
export async function getAllDriverWarehouses(driverId: string)
```
**建议**: 保留 - 司机仓库查询

#### ⚠️ getWarehouseCategories
```typescript
export async function getWarehouseCategories(warehouseId: string)
```
**建议**: 保留 - 仓库分类查询

#### ⚠️ setWarehouseCategories
```typescript
export async function setWarehouseCategories(...)
```
**建议**: 保留 - 仓库分类设置

---

## 📋 清理建议

### 🔴 建议删除 (12个)

这些函数已被其他函数替代或权限系统已简化：

1. `notifications.ts`
   - createNotificationRecord
   - getNotifications

2. `permission-context.ts`
   - getDriverPermissionContext
   - getManagerPermissionContext
   - getSchedulerPermissionContext
   - getAdminPermissionContext

3. `permission-strategy.ts`
   - isPeerAdminWithFullControl
   - isPeerAdminViewOnly
   - isManagerWithFullControl
   - isManagerViewOnly
   - isSchedulerFullControl
   - isSchedulerViewOnly

### 🟡 建议保留 (21个)

这些函数可能在未来功能中使用，或是重要的业务功能：

1. `attendance.ts` - deleteAttendanceRule
2. `dashboard.ts` - getWarehouseDataVolume
3. `leave.ts` - 3个草稿相关函数
4. `peer-accounts.ts` - isPrimaryAccount
5. `piecework.ts` - 3个价格管理函数
6. `users.ts` - deleteTenantWithLog
7. `vehicles.ts` - 5个车辆管理函数
8. `warehouses.ts` - 7个仓库管理函数

---

## 🛠️ 清理脚本

如果决定删除建议删除的函数，可以使用以下脚本：

```bash
#!/bin/bash

echo "🗑️  删除未使用的函数..."

# 备份文件
cp src/db/api/notifications.ts src/db/api/notifications.ts.bak
cp src/db/api/permission-context.ts src/db/api/permission-context.ts.bak
cp src/db/api/permission-strategy.ts src/db/api/permission-strategy.ts.bak

# 手动删除函数（需要编辑文件）
echo "请手动删除以下函数："
echo "1. src/db/api/notifications.ts - createNotificationRecord, getNotifications"
echo "2. src/db/api/permission-context.ts - 所有4个函数"
echo "3. src/db/api/permission-strategy.ts - 所有6个is*函数"

echo ""
echo "备份文件已创建（*.bak）"
```

---

## 📊 预期效果

### 删除12个函数后：

- **代码行数**: 减少约 300-400 行
- **文件大小**: 减少约 10-15KB
- **维护成本**: 降低
- **代码清晰度**: 提升

### 保留21个函数：

- **功能完整性**: 保持
- **未来扩展**: 支持
- **业务需求**: 满足

---

## ⚠️ 注意事项

1. **删除前备份**: 确保有Git提交或文件备份
2. **测试验证**: 删除后运行完整测试
3. **团队沟通**: 确认这些函数确实不需要
4. **文档更新**: 更新API文档

---

**报告生成时间**: 2025-12-12  
**分析工具**: 自动化脚本  
**维护团队**: 车队管家开发团队
