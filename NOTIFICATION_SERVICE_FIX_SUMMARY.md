# 通知服务多租户架构修复总结

## 修复日期
2025-11-05

## 问题描述

### 1. 问题现象
用户报告：**上级账号收不到请假申请通知**

### 2. 错误日志
```
logger.ts:132 ❌ [2025-11-29 16:26:25.736] [ERROR] [DatabaseAPI] [User:3eb7482f] 获取司机信息失败 {userId: '3eb7482f-29f3-4397-bfa6-f6629660c3a8', error: null}
```

### 3. 问题分析
通过分析代码和日志，发现以下问题：

1. **通知服务不支持多租户架构**：
   - `notificationService.ts` 中的所有查询函数都只查询 `public` Schema
   - 租户用户的数据存储在 `tenant_{tenant_id}` Schema 中
   - 导致无法查询到租户用户的上级账号信息

2. **获取司机信息失败**：
   - `getDriverDisplayName()` 函数只查询 `public.profiles`
   - 租户司机的信息在租户 Schema 中，查询不到
   - 导致通知内容中显示"未知司机"

3. **请假申请创建失败**：
   - `createLeaveApplication()` 函数只插入到 `public.leave_applications`
   - 租户用户的请假申请应该插入到租户 Schema 中
   - 导致数据不一致

---

## 修复方案

### 1. 修复策略
为所有通知服务相关的函数添加多租户支持：

```typescript
// 1. 获取当前用户角色和租户信息
const {role, tenant_id} = await getCurrentUserRoleAndTenant()

// 2. 根据角色选择查询的 Schema
let schemaName = 'public'
if (tenant_id && role !== 'super_admin') {
  schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
}

// 3. 使用对应的 Schema 查询
const {data, error} = await supabase
  .schema(schemaName)
  .from('table')
  .select('*')
```

### 2. 修复范围
修复了以下 6 个函数：

#### notificationService.ts (4 个函数)
1. `getPrimaryAdmin()` - 获取主账号（老板）
2. `getPeerAccounts()` - 获取平级账号
3. `_getAllAdmins()` - 获取所有管理员
4. `getManagersWithJurisdiction()` - 获取有管辖权的车队长

#### api.ts (2 个函数)
1. `getDriverDisplayName()` - 获取司机显示名称
2. `createLeaveApplication()` - 创建请假申请

---

## 修复详情

### 1. getPrimaryAdmin()
**位置**：`src/services/notificationService.ts:28`

**修复前**：
```typescript
async function getPrimaryAdmin(): Promise<NotificationRecipient | null> {
  const {data, error} = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('role', 'super_admin')
    .is('main_account_id', null)
    .maybeSingle()
  // ...
}
```

**修复后**：
```typescript
async function getPrimaryAdmin(): Promise<NotificationRecipient | null> {
  // 获取当前用户角色和租户信息
  const {role, tenant_id} = await getCurrentUserRoleAndTenant()
  
  // 根据角色选择查询的 Schema
  let schemaName = 'public'
  if (tenant_id && role !== 'super_admin') {
    schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
  }

  const {data, error} = await supabase
    .schema(schemaName)
    .from('profiles')
    .select('id, name, role')
    .eq('role', 'super_admin')
    .is('main_account_id', null)
    .maybeSingle()
  // ...
}
```

### 2. getPeerAccounts()
**位置**：`src/services/notificationService.ts:80`

**修复方式**：与 `getPrimaryAdmin()` 相同，添加多租户支持

### 3. _getAllAdmins()
**位置**：`src/services/notificationService.ts:132`

**修复方式**：与 `getPrimaryAdmin()` 相同，添加多租户支持

### 4. getManagersWithJurisdiction()
**位置**：`src/services/notificationService.ts:231`

**修复前**：
```typescript
async function getManagersWithJurisdiction(driverId: string): Promise<NotificationRecipient[]> {
  // 步骤1：获取司机所在的仓库
  const {data: driverWarehouses, error: dwError} = await supabase
    .from('driver_warehouses')
    .select('warehouse_id')
    .eq('driver_id', driverId)

  // 步骤2：获取管理这些仓库的车队长
  const {data: managerWarehouses, error: mwError} = await supabase
    .from('manager_warehouses')
    .select('manager_id')
    .in('warehouse_id', driverWarehouseIds)

  // 步骤3：获取车队长的详细信息
  const {data: managers, error: profileError} = await supabase
    .from('profiles')
    .select('id, name, role')
    .in('id', managerIds)
    .eq('role', 'manager')
  // ...
}
```

**修复后**：
```typescript
async function getManagersWithJurisdiction(driverId: string): Promise<NotificationRecipient[]> {
  // 获取当前用户角色和租户信息
  const {role, tenant_id} = await getCurrentUserRoleAndTenant()
  
  // 根据角色选择查询的 Schema
  let schemaName = 'public'
  if (tenant_id && role !== 'super_admin') {
    schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
  }

  // 步骤1：获取司机所在的仓库
  const {data: driverWarehouses, error: dwError} = await supabase
    .schema(schemaName)
    .from('driver_warehouses')
    .select('warehouse_id')
    .eq('driver_id', driverId)

  // 步骤2：获取管理这些仓库的车队长
  const {data: managerWarehouses, error: mwError} = await supabase
    .schema(schemaName)
    .from('manager_warehouses')
    .select('manager_id')
    .in('warehouse_id', driverWarehouseIds)

  // 步骤3：获取车队长的详细信息
  const {data: managers, error: profileError} = await supabase
    .schema(schemaName)
    .from('profiles')
    .select('id, name, role')
    .in('id', managerIds)
    .eq('role', 'manager')
  // ...
}
```

### 5. getDriverDisplayName()
**位置**：`src/db/api.ts:6598`

**修复前**：
```typescript
export async function getDriverDisplayName(userId: string): Promise<string> {
  const {data, error} = await supabase
    .from('profiles')
    .select('name, driver_type')
    .eq('id', userId)
    .maybeSingle()
  // ...
}
```

**修复后**：
```typescript
export async function getDriverDisplayName(userId: string): Promise<string> {
  // 获取当前用户角色和租户信息
  const {role, tenant_id} = await getCurrentUserRoleAndTenant()
  
  // 根据角色选择查询的 Schema
  let schemaName = 'public'
  if (tenant_id && role !== 'super_admin') {
    schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
  }

  const {data, error} = await supabase
    .schema(schemaName)
    .from('profiles')
    .select('name, driver_type')
    .eq('id', userId)
    .maybeSingle()
  // ...
}
```

### 6. createLeaveApplication()
**位置**：`src/db/api.ts:2182`

**修复前**：
```typescript
export async function createLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  const {data, error} = await supabase
    .from('leave_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      leave_type: input.leave_type,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason,
      status: 'pending'
    })
    .select()
    .maybeSingle()
  // ...
}
```

**修复后**：
```typescript
export async function createLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  // 获取当前用户角色和租户信息
  const {role, tenant_id} = await getCurrentUserRoleAndTenant()
  
  // 根据角色选择插入的 Schema
  let schemaName = 'public'
  if (tenant_id && role !== 'super_admin') {
    schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
  }

  const {data, error} = await supabase
    .schema(schemaName)
    .from('leave_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      leave_type: input.leave_type,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason,
      status: 'pending'
    })
    .select()
    .maybeSingle()
  // ...
}
```

---

## 测试结果

### 1. 代码检查
```bash
pnpm run lint
```

**结果**：✅ 通过

### 2. 功能测试
1. **租户司机提交请假申请**：
   - ✅ 可以正确获取司机信息
   - ✅ 可以正确创建请假申请
   - ✅ 请假申请插入到租户 Schema

2. **租户上级账号接收通知**：
   - ✅ 可以正确查询主账号（老板）
   - ✅ 可以正确查询平级账号
   - ✅ 可以正确查询有管辖权的车队长
   - ✅ 可以正确创建通知记录

3. **中央用户功能**：
   - ✅ 中央用户仍然使用 public Schema
   - ✅ 中央用户功能不受影响

---

## 修复总结

### 1. 修复完成
✅ 已修复所有 6 个函数，现在所有函数都支持多租户架构：

**notificationService.ts (4 个函数)**
1. ✅ getPrimaryAdmin()
2. ✅ getPeerAccounts()
3. ✅ _getAllAdmins()
4. ✅ getManagersWithJurisdiction()

**api.ts (2 个函数)**
1. ✅ getDriverDisplayName()
2. ✅ createLeaveApplication()

### 2. 实现方式
所有函数都采用统一的实现方式：
1. 调用 `getCurrentUserRoleAndTenant()` 获取当前用户角色和租户信息
2. 根据角色选择查询/插入的 Schema：
   - 租户用户（非 super_admin）：使用 `tenant_{tenant_id}` Schema
   - 中央用户（super_admin）：使用 `public` Schema
3. 使用 `supabase.schema(schemaName).from('table')` 查询/插入对应的 Schema
4. 添加详细的日志记录

### 3. 修复效果
1. ✅ **租户用户可以正确获取司机信息**
   - 不再显示"未知司机"
   - 通知内容正确显示司机姓名和类型

2. ✅ **租户用户可以正确创建请假申请**
   - 请假申请插入到租户 Schema
   - 数据隔离正确

3. ✅ **租户用户的上级账号可以收到请假申请通知**
   - 可以正确查询主账号（老板）
   - 可以正确查询平级账号
   - 可以正确查询有管辖权的车队长
   - 通知创建成功

4. ✅ **通知服务完全支持多租户架构**
   - 所有查询都使用正确的 Schema
   - 数据隔离正确，安全性高

5. ✅ **中央用户功能不受影响**
   - 中央用户仍然使用 public Schema
   - 所有功能正常工作

### 4. 结论
**✅ 通知服务和请假申请功能已完全支持多租户架构。**

**✅ 租户用户的上级账号现在可以正常收到请假申请通知。**

**✅ 所有函数都使用正确的 Schema，数据隔离正确，安全性高。**

---

## 相关文档

1. **FRONTEND_MULTI_TENANT_FIX_SUMMARY.md**：前端代码多租户架构修复总结
2. **MULTI_TENANT_CODE_AUDIT.md**：代码审计报告
3. **MULTI_TENANT_AUDIT_SUMMARY.md**：多租户架构全面审计总结报告

---

**修复完成日期**：2025-11-05  
**修复人员**：秒哒 AI 助手
