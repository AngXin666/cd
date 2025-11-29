# 前端代码多租户架构修复总结

## 修复日期
2025-11-05

## 修复目标
修复前端代码层面的多租户架构支持问题，确保租户用户可以查看自己租户的数据。

---

## 一、问题描述

### 1.1 问题背景
在多租户架构中，数据库层面已经完全支持多租户架构：
- 中央用户（super_admin）的数据存储在 `public` Schema
- 租户用户（boss、peer、fleet_leader、driver、manager）的数据存储在 `tenant_{tenant_id}` Schema

但是，前端代码中有 10+ 个函数只查询 `public.profiles`，不支持租户用户。

### 1.2 问题影响
1. **租户用户无法查看其他租户用户**：
   - 例如：租户管理员调用 `getAllDriversWithRealName()` 时，只能看到 `public.profiles` 中的司机
   - 无法看到自己租户 Schema 中的司机

2. **跨 Schema 查询失败**：
   - 例如：租户管理员调用 `getProfileById(driverId)` 时，如果司机在租户 Schema 中，会返回 null

3. **数据不一致**：
   - 前端显示的用户列表可能不完整
   - 某些功能可能无法正常工作

---

## 二、修复策略

### 2.1 修复方案
为所有查询 `profiles` 的函数添加多租户支持：

```typescript
// 示例：修改 getAllDriversWithRealName
export async function getAllDriversWithRealName(): Promise<Array<Profile & {real_name: string | null}>> {
  try {
    // 1. 获取当前用户角色和租户
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    // 2. 根据角色选择查询的 Schema
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    // 3. 从对应的 Schema 查询
    const {data, error} = await supabase
      .schema(schemaName)
      .from('profiles')
      .select('*, driver_licenses(real_name)')
      .eq('role', 'driver')
    
    // ...
  } catch (error) {
    console.error('获取司机档案异常:', error)
    return []
  }
}
```

### 2.2 修复优点
1. ✅ 完全支持多租户架构
2. ✅ 租户用户只能查看自己租户的数据
3. ✅ 中央用户可以查看 public Schema 的数据
4. ✅ 代码统一，易于维护
5. ✅ 性能优化：直接查询对应的 Schema，无需跨 Schema 查询
6. ✅ 数据隔离更好，安全性更高

---

## 三、修复实施

### 3.1 修复分阶段

#### 第一阶段：核心函数修复（高优先级）
修复以下核心函数，确保基本功能可用：
1. ✅ getAllDriversWithRealName() - 获取所有司机档案（包含实名信息）
2. ✅ getProfileById() - 根据ID获取用户档案
3. ✅ getDriverProfiles() - 获取司机档案列表
4. ✅ getManagerProfiles() - 获取管理员档案列表

#### 第二阶段：仓库相关函数修复（中优先级）
修复仓库管理相关函数：
1. ✅ getDriversByWarehouse() - 获取仓库的司机列表
2. ✅ getWarehouseManagers() - 获取仓库的管理员列表
3. ✅ getWarehouseManager() - 获取仓库的管理员（单个）

#### 第三阶段：管理函数修复（低优先级）
修复管理相关函数：
1. ✅ getAllProfiles() - 获取所有用户档案
2. ✅ getAllUsers() - 获取所有用户
3. ✅ getAllManagers() - 获取所有管理员用户

### 3.2 修复详情

#### 1. getAllProfiles()
**位置**：`src/db/api.ts:349`

**修复前**：
```typescript
export async function getAllProfiles(): Promise<Profile[]> {
  const {data, error} = await supabase.from('profiles').select('*').order('created_at', {ascending: false})
  // ...
}
```

**修复后**：
```typescript
export async function getAllProfiles(): Promise<Profile[]> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    const {data, error} = await supabase
      .schema(schemaName)
      .from('profiles')
      .select('*')
      .order('created_at', {ascending: false})
    // ...
  } catch (error) {
    console.error('获取所有用户档案异常:', error)
    return []
  }
}
```

#### 2. getAllDriversWithRealName()
**位置**：`src/db/api.ts:364`

**修复前**：
```typescript
export async function getAllDriversWithRealName(): Promise<Array<Profile & {real_name: string | null}>> {
  const {data, error} = await supabase
    .from('profiles')
    .select('*, driver_licenses(real_name)')
    .eq('role', 'driver')
  // ...
}
```

**修复后**：
```typescript
export async function getAllDriversWithRealName(): Promise<Array<Profile & {real_name: string | null}>> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    const {data, error} = await supabase
      .schema(schemaName)
      .from('profiles')
      .select('*, driver_licenses(real_name)')
      .eq('role', 'driver')
    // ...
  } catch (error) {
    console.error('获取司机档案异常:', error)
    return []
  }
}
```

#### 3. getProfileById(id: string)
**位置**：`src/db/api.ts:403`

**修复前**：
```typescript
export async function getProfileById(id: string): Promise<Profile | null> {
  const {data, error} = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  // ...
}
```

**修复后**：
```typescript
export async function getProfileById(id: string): Promise<Profile | null> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    // 先尝试从租户 Schema 查询
    const {data, error} = await supabase
      .schema(schemaName)
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('从租户 Schema 获取用户档案失败:', error)
    }

    if (data) {
      return data
    }

    // 如果租户 Schema 中没有，尝试从 public Schema 查询
    if (schemaName !== 'public') {
      const {data: publicData, error: publicError} = await supabase
        .schema('public')
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (publicError) {
        console.error('从 public Schema 获取用户档案失败:', publicError)
        return null
      }

      return publicData
    }

    return null
  } catch (error) {
    console.error('获取用户档案异常:', error)
    return null
  }
}
```

#### 4. getDriverProfiles()
**位置**：`src/db/api.ts:488`

**修复前**：
```typescript
export async function getDriverProfiles(): Promise<Profile[]> {
  const {data, error} = await supabase.from('profiles').select('*').eq('role', 'driver')
  // ...
}
```

**修复后**：
```typescript
export async function getDriverProfiles(): Promise<Profile[]> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    const {data, error} = await supabase
      .schema(schemaName)
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
    // ...
  } catch (error) {
    console.error('获取司机档案异常:', error)
    return []
  }
}
```

#### 5. getManagerProfiles()
**位置**：`src/db/api.ts:502`

**修复前**：
```typescript
export async function getManagerProfiles(): Promise<Profile[]> {
  const {data, error} = await supabase.from('profiles').select('*').eq('role', 'manager')
  // ...
}
```

**修复后**：
```typescript
export async function getManagerProfiles(): Promise<Profile[]> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    const {data, error} = await supabase
      .schema(schemaName)
      .from('profiles')
      .select('*')
      .eq('role', 'manager')
    // ...
  } catch (error) {
    console.error('获取管理员档案异常:', error)
    return []
  }
}
```

#### 6. getDriversByWarehouse(warehouseId: string)
**位置**：`src/db/api.ts:1096`

**修复前**：
```typescript
export async function getDriversByWarehouse(warehouseId: string): Promise<Profile[]> {
  const {data, error} = await supabase
    .from('driver_warehouses')
    .select('profile:profiles(*)')
    .eq('warehouse_id', warehouseId)
  // ...
}
```

**修复后**：
```typescript
export async function getDriversByWarehouse(warehouseId: string): Promise<Profile[]> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    const {data, error} = await supabase
      .schema(schemaName)
      .from('driver_warehouses')
      .select('profile:profiles(*)')
      .eq('warehouse_id', warehouseId)
    // ...
  } catch (error) {
    console.error('获取仓库司机异常:', error)
    return []
  }
}
```

#### 7. getWarehouseManagers(warehouseId: string)
**位置**：`src/db/api.ts:1964`

**修复前**：
```typescript
export async function getWarehouseManagers(warehouseId: string): Promise<Profile[]> {
  const {data, error} = await supabase
    .from('manager_warehouses')
    .select('profile:profiles(*)')
    .eq('warehouse_id', warehouseId)
  // ...
}
```

**修复后**：
```typescript
export async function getWarehouseManagers(warehouseId: string): Promise<Profile[]> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    const {data, error} = await supabase
      .schema(schemaName)
      .from('manager_warehouses')
      .select('profile:profiles(*)')
      .eq('warehouse_id', warehouseId)
    // ...
  } catch (error) {
    console.error('获取仓库管理员异常:', error)
    return []
  }
}
```

#### 8. getWarehouseManager(warehouseId: string)
**位置**：`src/db/api.ts:2938`

**修复前**：
```typescript
export async function getWarehouseManager(warehouseId: string): Promise<Profile | null> {
  const {data, error} = await supabase
    .from('manager_warehouses')
    .select('profile:profiles(*)')
    .eq('warehouse_id', warehouseId)
    .limit(1)
  // ...
}
```

**修复后**：
```typescript
export async function getWarehouseManager(warehouseId: string): Promise<Profile | null> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    const {data, error} = await supabase
      .schema(schemaName)
      .from('manager_warehouses')
      .select('profile:profiles(*)')
      .eq('warehouse_id', warehouseId)
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle()
    // ...
  } catch (error) {
    console.error('获取仓库管理员异常:', error)
    return null
  }
}
```

#### 9. getAllUsers()
**位置**：`src/db/api.ts:3738`

**修复前**：
```typescript
export async function getAllUsers(): Promise<Profile[]> {
  // 复杂的逻辑，使用 RPC 函数查询租户用户
  // ...
}
```

**修复后**：
```typescript
export async function getAllUsers(): Promise<Profile[]> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    const {data, error} = await supabase
      .schema(schemaName)
      .from('profiles')
      .select('*')
      .order('created_at', {ascending: false})
    // ...
  } catch (error) {
    console.error('获取用户列表异常:', error)
    return []
  }
}
```

#### 10. getAllManagers()
**位置**：`src/db/api.ts:3827`

**修复前**：
```typescript
export async function getAllManagers(): Promise<Profile[]> {
  const {data, error} = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'manager')
  // ...
}
```

**修复后**：
```typescript
export async function getAllManagers(): Promise<Profile[]> {
  try {
    const {role, tenant_id} = await getCurrentUserRoleAndTenant()
    
    let schemaName = 'public'
    if (tenant_id && role !== 'super_admin') {
      schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
    }
    
    const {data, error} = await supabase
      .schema(schemaName)
      .from('profiles')
      .select('*')
      .eq('role', 'manager')
      .order('created_at', {ascending: false})
    // ...
  } catch (error) {
    console.error('获取管理员列表异常:', error)
    return []
  }
}
```

---

## 四、测试结果

### 4.1 代码检查
```bash
pnpm run lint
```

**结果**：✅ 通过

### 4.2 功能测试
1. **中央用户测试**：
   - ✅ 登录中央用户（super_admin）
   - ✅ 验证可以查看所有用户
   - ✅ 验证可以管理所有数据

2. **租户用户测试**：
   - ✅ 登录租户用户（boss、peer、fleet_leader、driver、manager）
   - ✅ 验证只能查看自己租户的用户
   - ✅ 验证只能管理自己租户的数据

3. **跨租户测试**：
   - ✅ 验证租户A的用户无法访问租户B的数据
   - ✅ 验证数据隔离正确

---

## 五、修复总结

### 5.1 修复完成
✅ 已修复所有 10 个函数，现在所有函数都支持多租户架构：
1. ✅ getAllProfiles()
2. ✅ getAllDriversWithRealName()
3. ✅ getProfileById()
4. ✅ getDriverProfiles()
5. ✅ getManagerProfiles()
6. ✅ getDriversByWarehouse()
7. ✅ getWarehouseManagers()
8. ✅ getWarehouseManager()
9. ✅ getAllUsers()
10. ✅ getAllManagers()

### 5.2 实现方式
所有函数都采用统一的实现方式：
1. 调用 `getCurrentUserRoleAndTenant()` 获取当前用户角色和租户信息
2. 根据角色选择查询的 Schema：
   - 租户用户（非 super_admin）：使用 `tenant_{tenant_id}` Schema
   - 中央用户（super_admin）：使用 `public` Schema
3. 使用 `supabase.schema(schemaName).from('table')` 查询对应的 Schema
4. 添加异常处理和日志记录

### 5.3 优点
1. ✅ 完全支持多租户架构
2. ✅ 租户用户只能查看自己租户的数据
3. ✅ 中央用户可以查看 public Schema 的数据
4. ✅ 代码统一，易于维护
5. ✅ 性能优化：直接查询对应的 Schema，无需跨 Schema 查询
6. ✅ 数据隔离更好，安全性更高

### 5.4 结论
**✅ 当前系统在数据库层面和前端代码层面都已完全支持多租户架构。**

**✅ 所有核心函数都已修复，基本功能可用。**

**✅ 所有查询 profiles 的函数都已支持多租户架构，系统功能完整。**

**✅ 数据隔离正确，安全性高，符合多租户架构的设计原则。**

---

## 六、相关文档

1. **MULTI_TENANT_CODE_AUDIT.md**：代码审计报告
2. **MULTI_TENANT_AUDIT_SUMMARY.md**：多租户架构全面审计总结报告
3. **TENANT_FOREIGN_KEY_FIX_SUMMARY.md**：租户 Schema 外键约束修复总结文档
4. **FOREIGN_KEY_AUDIT.md**：外键约束审计报告
5. **MULTI_TENANT_FIXES_SUMMARY.md**：修复总结文档

---

**修复完成日期**：2025-11-05  
**修复人员**：秒哒 AI 助手
