# 多租户架构开发指南

## 概述

本指南介绍如何在车队管家小程序中使用多租户架构，确保数据安全隔离。

## 快速开始

### 1. 使用租户上下文

在任何需要获取当前用户信息或检查权限的组件中，使用 `useTenant` Hook：

```typescript
import {useTenant} from '@/contexts/TenantContext'
import {View, Text} from '@tarojs/components'

const MyComponent: React.FC = () => {
  const {userId, role, isSuperAdmin, canAccessUser} = useTenant()
  
  // 检查是否登录
  if (!userId) {
    return <Text>请先登录</Text>
  }
  
  // 检查权限
  if (!isSuperAdmin) {
    return <Text>需要超级管理员权限</Text>
  }
  
  return <View>欢迎，{role}</View>
}
```

### 2. 创建数据时自动添加 created_by

使用 `addCreatedBy` 辅助函数：

```typescript
import {addCreatedBy} from '@/db/tenant-utils'
import {supabase} from '@/client/supabase'

// 创建仓库
async function createWarehouse(name: string) {
  // 自动添加 created_by 字段
  const warehouseData = await addCreatedBy({
    name,
    is_active: true
  })
  
  const {data, error} = await supabase
    .from('warehouses')
    .insert(warehouseData)
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}
```

### 3. 批量创建数据

使用 `addCreatedByBatch` 辅助函数：

```typescript
import {addCreatedByBatch} from '@/db/tenant-utils'

// 批量创建考勤记录
async function createAttendanceRecords(records: Array<{
  driver_id: string
  warehouse_id: string
  date: string
}>) {
  // 批量添加 created_by 字段
  const recordsWithCreatedBy = await addCreatedByBatch(records)
  
  const {data, error} = await supabase
    .from('attendance_records')
    .insert(recordsWithCreatedBy)
    .select()
  
  if (error) {
    throw error
  }
  
  return data
}
```

### 4. 检查权限

#### 4.1 检查是否可以访问用户数据

```typescript
import {useTenant} from '@/contexts/TenantContext'

const UserDetailPage: React.FC = () => {
  const {canAccessUser} = useTenant()
  const targetUserId = 'some-user-id'
  
  // 检查权限
  if (!canAccessUser(targetUserId)) {
    return <Text>无权访问该用户信息</Text>
  }
  
  // 显示用户信息
  return <View>...</View>
}
```

#### 4.2 检查是否可以访问仓库数据

```typescript
import {useTenant} from '@/contexts/TenantContext'
import {useEffect, useState} from 'react'

const WarehouseDetailPage: React.FC = () => {
  const {canAccessWarehouse} = useTenant()
  const [hasAccess, setHasAccess] = useState(false)
  const warehouseId = 'some-warehouse-id'
  
  useEffect(() => {
    canAccessWarehouse(warehouseId).then(setHasAccess)
  }, [warehouseId, canAccessWarehouse])
  
  if (!hasAccess) {
    return <Text>无权访问该仓库</Text>
  }
  
  return <View>...</View>
}
```

### 5. 使用数据访问拦截器

```typescript
import {DataAccessInterceptor} from '@/db/tenant-utils'
import {supabase} from '@/client/supabase'

async function getAttendanceRecords(warehouseId: string) {
  return DataAccessInterceptor.intercept(
    async () => {
      const {data, error} = await supabase
        .from('attendance_records')
        .select('*')
        .eq('warehouse_id', warehouseId)
      
      if (error) {
        throw error
      }
      
      return data || []
    },
    {
      table: 'attendance_records',
      action: 'select'
    }
  )
}
```

## API 参考

### useTenant Hook

返回租户上下文值：

```typescript
interface TenantContextValue {
  // 当前用户ID
  userId: string | null
  // 当前用户资料
  profile: Profile | null
  // 当前用户角色
  role: UserRole | null
  // 是否正在加载
  loading: boolean
  // 是否为超级管理员
  isSuperAdmin: boolean
  // 是否为管理员
  isManager: boolean
  // 是否为司机
  isDriver: boolean
  // 获取用户管理的仓库ID列表
  getManagedWarehouseIds: () => Promise<string[]>
  // 获取用户分配的仓库ID列表
  getAssignedWarehouseIds: () => Promise<string[]>
  // 检查是否有权限访问指定用户的数据
  canAccessUser: (targetUserId: string) => boolean
  // 检查是否有权限访问指定仓库的数据
  canAccessWarehouse: (warehouseId: string) => Promise<boolean>
  // 刷新用户资料
  refreshProfile: () => Promise<void>
}
```

### 租户工具函数

#### getCurrentUserId()

获取当前登录用户ID：

```typescript
import {getCurrentUserId} from '@/db/tenant-utils'

const userId = await getCurrentUserId()
```

#### getUserRole(userId)

获取用户角色：

```typescript
import {getUserRole} from '@/db/tenant-utils'

const role = await getUserRole(userId)
```

#### isSuperAdmin(userId?)

检查用户是否为超级管理员：

```typescript
import {isSuperAdmin} from '@/db/tenant-utils'

const isAdmin = await isSuperAdmin() // 检查当前用户
const isAdmin2 = await isSuperAdmin(someUserId) // 检查指定用户
```

#### canAccessResource(resourceUserId, currentUserId?)

检查用户是否可以访问指定资源：

```typescript
import {canAccessResource} from '@/db/tenant-utils'

const canAccess = await canAccessResource(resourceUserId)
```

#### addCreatedBy(data)

为插入操作自动添加 created_by 字段：

```typescript
import {addCreatedBy} from '@/db/tenant-utils'

const dataWithCreatedBy = await addCreatedBy({
  name: '测试数据'
})
```

#### addCreatedByBatch(dataArray)

批量为插入操作添加 created_by 字段：

```typescript
import {addCreatedByBatch} from '@/db/tenant-utils'

const dataWithCreatedBy = await addCreatedByBatch([
  {name: '数据1'},
  {name: '数据2'}
])
```

## 最佳实践

### 1. 始终使用 useTenant Hook

在组件中获取用户信息时，优先使用 `useTenant` Hook 而不是直接调用 Supabase API：

```typescript
// ✅ 推荐
const {userId, role} = useTenant()

// ❌ 不推荐
const {data: {user}} = await supabase.auth.getUser()
```

### 2. 创建数据时自动添加 created_by

所有创建操作都应该使用 `addCreatedBy` 或 `addCreatedByBatch`：

```typescript
// ✅ 推荐
const data = await addCreatedBy({name: '测试'})
await supabase.from('table').insert(data)

// ❌ 不推荐
await supabase.from('table').insert({name: '测试'})
```

### 3. 在 UI 层检查权限

在显示敏感信息前，先检查权限：

```typescript
// ✅ 推荐
const {canAccessUser} = useTenant()

if (!canAccessUser(targetUserId)) {
  return <Text>无权访问</Text>
}

// 显示敏感信息
return <View>...</View>
```

### 4. 使用数据访问拦截器记录日志

对于重要的数据操作，使用拦截器记录日志：

```typescript
// ✅ 推荐
return DataAccessInterceptor.intercept(
  async () => {
    // 数据库操作
  },
  {
    table: 'table_name',
    action: 'select'
  }
)
```

### 5. 缓存用户角色信息

使用 `getUserRoleCached` 而不是 `getUserRole` 来减少数据库查询：

```typescript
// ✅ 推荐
const role = await getUserRoleCached(userId)

// ❌ 不推荐（频繁调用时）
const role = await getUserRole(userId)
```

### 6. 清除缓存

当用户角色变更时，记得清除缓存：

```typescript
import {clearRoleCache} from '@/db/tenant-utils'

// 更新用户角色后
await updateUserRole(userId, newRole)
clearRoleCache(userId)
```

## 常见问题

### Q1: 为什么我的查询返回空数据？

**A:** 可能是 RLS 策略过滤了数据。检查：
1. 用户是否已登录
2. 用户角色是否正确
3. 用户是否有权限访问该数据

### Q2: 如何让超级管理员访问所有数据？

**A:** RLS 策略已经配置了超级管理员权限。确保：
1. 用户的 role 字段为 'super_admin'
2. 使用了正确的 RLS 策略

### Q3: 创建数据时忘记添加 created_by 怎么办？

**A:** 数据库触发器会自动设置 created_by 为当前用户。但最好还是使用 `addCreatedBy` 函数。

### Q4: 如何调试权限问题？

**A:** 
1. 检查浏览器控制台的日志
2. 使用 `DataAccessInterceptor` 记录访问日志
3. 在 Supabase Dashboard 中查看 RLS 策略
4. 使用 SQL 查询检查用户角色和仓库分配

### Q5: 性能会受影响吗？

**A:** 
1. RLS 策略在数据库层面执行，性能影响很小
2. 使用了索引优化查询性能
3. 角色信息有5分钟缓存
4. 如果遇到性能问题，可以优化查询或增加缓存

## 安全注意事项

### 1. 不要在前端硬编码用户ID

```typescript
// ❌ 危险
const userId = 'hardcoded-user-id'

// ✅ 安全
const {userId} = useTenant()
```

### 2. 不要绕过 RLS 策略

```typescript
// ❌ 危险（使用 service_role key）
const supabaseAdmin = createClient(url, serviceRoleKey)

// ✅ 安全（使用 anon key）
const supabase = createClient(url, anonKey)
```

### 3. 始终验证用户输入

```typescript
// ✅ 安全
if (!userId || typeof userId !== 'string') {
  throw new Error('无效的用户ID')
}
```

### 4. 记录安全事件

```typescript
// ✅ 推荐
try {
  await validateAccess(resourceUserId, 'write')
} catch (error) {
  // 记录越权访问尝试
  console.warn('[安全警告] 越权访问尝试')
  throw error
}
```

## 测试

### 单元测试示例

```typescript
import {describe, it, expect} from 'vitest'
import {canAccessResource} from '@/db/tenant-utils'

describe('canAccessResource', () => {
  it('用户可以访问自己的资源', async () => {
    const userId = 'user-1'
    const result = await canAccessResource(userId, userId)
    expect(result).toBe(true)
  })
  
  it('司机不能访问其他用户的资源', async () => {
    const driverId = 'driver-1'
    const otherUserId = 'user-2'
    const result = await canAccessResource(otherUserId, driverId)
    expect(result).toBe(false)
  })
  
  it('超级管理员可以访问所有资源', async () => {
    const adminId = 'admin-1'
    const otherUserId = 'user-2'
    const result = await canAccessResource(otherUserId, adminId)
    expect(result).toBe(true)
  })
})
```

### 集成测试示例

```typescript
import {describe, it, expect} from 'vitest'
import {supabase} from '@/client/supabase'

describe('多租户数据隔离', () => {
  it('司机只能查看自己的考勤记录', async () => {
    // 以司机身份登录
    await supabase.auth.signInWithPassword({
      email: 'driver@example.com',
      password: 'password'
    })
    
    // 查询考勤记录
    const {data} = await supabase
      .from('attendance_records')
      .select('*')
    
    // 验证所有记录都属于当前司机
    expect(data?.every(record => record.driver_id === driverId)).toBe(true)
  })
})
```

## 迁移现有代码

### 步骤1：添加 created_by 字段

数据库迁移已经完成，无需手动操作。

### 步骤2：更新 API 函数

```typescript
// 旧代码
export async function createWarehouse(name: string) {
  const {data, error} = await supabase
    .from('warehouses')
    .insert({name, is_active: true})
    .select()
    .single()
  
  return data
}

// 新代码
export async function createWarehouse(name: string) {
  const warehouseData = await addCreatedBy({
    name,
    is_active: true
  })
  
  const {data, error} = await supabase
    .from('warehouses')
    .insert(warehouseData)
    .select()
    .single()
  
  return data
}
```

### 步骤3：更新组件

```typescript
// 旧代码
const MyComponent: React.FC = () => {
  const {user} = useAuth()
  
  return <View>用户ID: {user?.id}</View>
}

// 新代码
const MyComponent: React.FC = () => {
  const {userId, role, isSuperAdmin} = useTenant()
  
  return (
    <View>
      <Text>用户ID: {userId}</Text>
      <Text>角色: {role}</Text>
      <Text>是否管理员: {isSuperAdmin ? '是' : '否'}</Text>
    </View>
  )
}
```

## 相关文档

- [多租户架构设计方案](MULTI_TENANT_ARCHITECTURE.md)
- [实现任务清单](MULTI_TENANT_TODO.md)
- [数据库迁移脚本](supabase/migrations/027_add_created_by_fields.sql)
- [RLS 策略更新](supabase/migrations/028_update_rls_policies_for_multi_tenant.sql)
