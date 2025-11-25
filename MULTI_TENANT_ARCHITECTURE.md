# 车队管家多租户架构设计方案

## 1. 架构概述

### 1.1 核心目标
- 确保所有用户的数据在存储和访问时实现安全隔离
- 防止任何可能的数据越权访问
- 保持系统性能和可维护性

### 1.2 隔离策略
采用**基于用户ID的逻辑隔离机制**，结合Supabase的Row Level Security (RLS)策略实现数据隔离。

### 1.3 架构层次
```
┌─────────────────────────────────────────────────────────┐
│                    应用层 (Taro)                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  全局租户上下文管理器 (TenantContext)             │   │
│  │  - 获取当前登录用户ID                             │   │
│  │  - 提供用户角色信息                               │   │
│  │  - 管理用户权限                                   │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  数据访问层 (API Functions)                       │   │
│  │  - 自动附加用户ID过滤                             │   │
│  │  - 权限检查                                       │   │
│  │  - 数据验证                                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              数据库层 (Supabase PostgreSQL)              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Row Level Security (RLS) 策略                    │   │
│  │  - 基于用户ID的行级过滤                           │   │
│  │  - 角色权限控制                                   │   │
│  │  - 自动注入用户上下文                             │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  数据表结构                                       │   │
│  │  - 所有业务表包含 created_by 字段                 │   │
│  │  - 关联表包含 user_id 字段                        │   │
│  │  - 索引优化                                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 2. 数据隔离设计

### 2.1 用户ID字段设计

#### 2.1.1 字段命名规范
- **created_by**: 记录创建者的用户ID（用于业务数据表）
- **user_id**: 关联用户ID（用于关联表）
- **driver_id**: 司机用户ID（特定业务场景）
- **manager_id**: 管理员用户ID（特定业务场景）

#### 2.1.2 需要添加用户ID的表

**核心业务表**（添加 `created_by` 字段）：
1. ✅ `profiles` - 用户资料表（已有id字段，无需添加）
2. ✅ `warehouses` - 仓库表（需要添加 created_by）
3. ✅ `categories` - 品类表（需要添加 created_by）
4. ✅ `attendance_records` - 考勤记录表（已有 driver_id，需要添加 created_by）
5. ✅ `piece_work_records` - 计件记录表（已有 driver_id，需要添加 created_by）
6. ✅ `leave_applications` - 请假申请表（已有 driver_id，需要添加 created_by）
7. ✅ `vehicles` - 车辆表（已有 current_driver_id，需要添加 created_by）
8. ✅ `vehicle_leases` - 车辆租赁表（已有 driver_id，需要添加 created_by）
9. ✅ `driver_licenses` - 驾驶证表（已有 driver_id，需要添加 created_by）
10. ✅ `feedback` - 反馈表（已有 user_id，无需添加）
11. ✅ `notifications` - 通知表（已有 user_id 和 created_by，无需添加）

**关联表**（已有用户关联字段）：
1. ✅ `warehouse_assignments` - 仓库分配表（已有 driver_id 和 manager_id）
2. ✅ `category_prices` - 品类价格表（通过 category_id 关联）

### 2.2 数据访问权限矩阵

| 角色 | 自己创建的数据 | 同仓库数据 | 所有数据 | 说明 |
|------|--------------|-----------|---------|------|
| 司机 (driver) | ✅ 读写 | ❌ | ❌ | 只能访问自己的数据 |
| 车队长 (manager) | ✅ 读写 | ✅ 读写 | ❌ | 可以访问管理仓库下的所有数据 |
| 老板 (super_admin) | ✅ 读写 | ✅ 读写 | ✅ 读写 | 可以访问所有数据 |

### 2.3 RLS策略设计原则

#### 2.3.1 基本原则
1. **默认拒绝**：未明确授权的访问一律拒绝
2. **最小权限**：用户只能访问必要的数据
3. **显式授权**：权限必须明确定义
4. **层级继承**：高级角色继承低级角色的权限

#### 2.3.2 策略模板

**SELECT 策略**：
```sql
-- 司机：只能查看自己创建的数据
CREATE POLICY "司机查看自己的数据" ON table_name
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

-- 车队长：可以查看管理仓库下的数据
CREATE POLICY "车队长查看管理仓库数据" ON table_name
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'manager'
      AND wa.warehouse_id = table_name.warehouse_id
    )
  );

-- 超级管理员：可以查看所有数据
CREATE POLICY "超级管理员查看所有数据" ON table_name
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );
```

**INSERT 策略**：
```sql
-- 自动设置 created_by 为当前用户
CREATE POLICY "用户创建数据" ON table_name
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
```

**UPDATE 策略**：
```sql
-- 只能更新自己创建的数据（司机）
CREATE POLICY "司机更新自己的数据" ON table_name
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 车队长可以更新管理仓库下的数据
-- 超级管理员可以更新所有数据
```

**DELETE 策略**：
```sql
-- 只有超级管理员可以删除
CREATE POLICY "超级管理员删除数据" ON table_name
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );
```

## 3. 应用层实现

### 3.1 全局租户上下文管理器

#### 3.1.1 TenantContext 设计
```typescript
// src/contexts/TenantContext.tsx
import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from 'miaoda-auth-taro'
import type { Profile, UserRole } from '@/db/types'

interface TenantContextValue {
  // 当前用户ID
  userId: string | null
  // 当前用户资料
  profile: Profile | null
  // 当前用户角色
  role: UserRole | null
  // 是否为超级管理员
  isSuperAdmin: boolean
  // 是否为管理员
  isManager: boolean
  // 是否为司机
  isDriver: boolean
  // 获取用户管理的仓库ID列表
  getManagedWarehouseIds: () => Promise<string[]>
  // 检查是否有权限访问指定数据
  canAccess: (resourceUserId: string) => boolean
  // 检查是否有权限访问指定仓库的数据
  canAccessWarehouse: (warehouseId: string) => Promise<boolean>
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined)

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  
  // 实现逻辑...
  
  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}
```

#### 3.1.2 使用示例
```typescript
// 在页面中使用
const MyPage: React.FC = () => {
  const { userId, role, isSuperAdmin, canAccess } = useTenant()
  
  // 检查权限
  if (!canAccess(someResourceUserId)) {
    return <Text>无权访问</Text>
  }
  
  // 正常渲染
  return <View>...</View>
}
```

### 3.2 数据访问层改造

#### 3.2.1 API函数自动注入用户ID

**改造前**：
```typescript
export async function getAttendanceRecords(warehouseId: string) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('warehouse_id', warehouseId)
  
  return data || []
}
```

**改造后**：
```typescript
export async function getAttendanceRecords(
  warehouseId: string,
  options?: { userId?: string }
) {
  // 获取当前用户ID
  const currentUserId = options?.userId || (await getCurrentUserId())
  
  // 获取用户角色
  const userRole = await getUserRole(currentUserId)
  
  // 构建查询
  let query = supabase
    .from('attendance_records')
    .select('*')
    .eq('warehouse_id', warehouseId)
  
  // 根据角色添加过滤条件
  if (userRole === 'driver') {
    // 司机只能看自己的数据
    query = query.eq('driver_id', currentUserId)
  } else if (userRole === 'manager') {
    // 车队长可以看管理仓库下的数据（RLS会自动过滤）
    // 无需额外过滤
  }
  // 超级管理员可以看所有数据（RLS会自动过滤）
  
  const { data, error } = await query
  
  if (error) {
    console.error('获取考勤记录失败:', error)
    return []
  }
  
  return data || []
}
```

#### 3.2.2 创建数据访问辅助函数

```typescript
// src/db/tenant-utils.ts

/**
 * 获取当前登录用户ID
 */
export async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('用户未登录')
  }
  return user.id
}

/**
 * 获取用户角色
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    throw new Error('获取用户角色失败')
  }
  
  return data.role
}

/**
 * 检查用户是否有权限访问指定资源
 */
export async function canAccessResource(
  resourceUserId: string,
  currentUserId?: string
): Promise<boolean> {
  const userId = currentUserId || (await getCurrentUserId())
  
  // 如果是自己的资源，直接允许
  if (userId === resourceUserId) {
    return true
  }
  
  // 获取当前用户角色
  const role = await getUserRole(userId)
  
  // 超级管理员可以访问所有资源
  if (role === 'super_admin') {
    return true
  }
  
  // 车队长需要检查是否在同一仓库
  if (role === 'manager') {
    return await isInSameWarehouse(userId, resourceUserId)
  }
  
  // 司机不能访问其他人的资源
  return false
}

/**
 * 检查两个用户是否在同一仓库
 */
async function isInSameWarehouse(
  userId1: string,
  userId2: string
): Promise<boolean> {
  // 获取用户1管理的仓库
  const { data: warehouses1 } = await supabase
    .from('warehouse_assignments')
    .select('warehouse_id')
    .eq('manager_id', userId1)
  
  // 获取用户2所在的仓库
  const { data: warehouses2 } = await supabase
    .from('warehouse_assignments')
    .select('warehouse_id')
    .eq('driver_id', userId2)
  
  if (!warehouses1 || !warehouses2) {
    return false
  }
  
  // 检查是否有交集
  const warehouseIds1 = warehouses1.map(w => w.warehouse_id)
  const warehouseIds2 = warehouses2.map(w => w.warehouse_id)
  
  return warehouseIds1.some(id => warehouseIds2.includes(id))
}

/**
 * 为插入操作自动添加 created_by 字段
 */
export async function addCreatedBy<T extends Record<string, any>>(
  data: T
): Promise<T & { created_by: string }> {
  const userId = await getCurrentUserId()
  return {
    ...data,
    created_by: userId
  }
}

/**
 * 批量为插入操作添加 created_by 字段
 */
export async function addCreatedByBatch<T extends Record<string, any>>(
  dataArray: T[]
): Promise<Array<T & { created_by: string }>> {
  const userId = await getCurrentUserId()
  return dataArray.map(data => ({
    ...data,
    created_by: userId
  }))
}
```

### 3.3 数据访问拦截器

```typescript
// src/db/interceptor.ts

/**
 * 数据访问拦截器
 * 在所有数据库操作前后执行检查和日志记录
 */
export class DataAccessInterceptor {
  /**
   * 拦截查询操作
   */
  static async interceptQuery<T>(
    operation: () => Promise<T>,
    context: {
      table: string
      action: 'select' | 'insert' | 'update' | 'delete'
      userId?: string
    }
  ): Promise<T> {
    const startTime = Date.now()
    const userId = context.userId || (await getCurrentUserId())
    
    try {
      // 执行操作
      const result = await operation()
      
      // 记录访问日志
      await this.logAccess({
        ...context,
        userId,
        success: true,
        duration: Date.now() - startTime
      })
      
      return result
    } catch (error) {
      // 记录错误日志
      await this.logAccess({
        ...context,
        userId,
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        duration: Date.now() - startTime
      })
      
      throw error
    }
  }
  
  /**
   * 记录访问日志
   */
  private static async logAccess(log: {
    table: string
    action: string
    userId: string
    success: boolean
    duration: number
    error?: string
  }): Promise<void> {
    // 在开发环境打印日志
    if (process.env.NODE_ENV === 'development') {
      console.log('[数据访问]', log)
    }
    
    // 在生产环境可以将日志发送到日志服务
    // await sendToLogService(log)
  }
}
```

## 4. 安全加固

### 4.1 越权访问检测

```typescript
// src/utils/security.ts

/**
 * 检测并阻止越权访问
 */
export async function detectUnauthorizedAccess(
  resourceUserId: string,
  action: 'read' | 'write' | 'delete'
): Promise<void> {
  const currentUserId = await getCurrentUserId()
  const canAccess = await canAccessResource(resourceUserId, currentUserId)
  
  if (!canAccess) {
    // 记录越权访问尝试
    await logSecurityEvent({
      type: 'unauthorized_access_attempt',
      userId: currentUserId,
      targetUserId: resourceUserId,
      action,
      timestamp: new Date().toISOString()
    })
    
    // 抛出错误
    throw new Error('无权访问该资源')
  }
}

/**
 * 记录安全事件
 */
async function logSecurityEvent(event: {
  type: string
  userId: string
  targetUserId: string
  action: string
  timestamp: string
}): Promise<void> {
  console.warn('[安全警告]', event)
  
  // 可以将安全事件发送到监控系统
  // await sendToSecurityMonitoring(event)
}
```

### 4.2 数据访问审计

```typescript
// src/utils/audit.ts

/**
 * 审计日志接口
 */
interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id?: string
  old_value?: any
  new_value?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

/**
 * 记录审计日志
 */
export async function recordAudit(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
  // 在生产环境中，应该将审计日志存储到专门的审计表
  // 这里仅作示例
  console.log('[审计日志]', log)
}
```

## 5. 性能优化

### 5.1 索引优化

为所有包含 `created_by` 字段的表创建索引：

```sql
-- 为 created_by 字段创建索引
CREATE INDEX IF NOT EXISTS idx_table_name_created_by ON table_name(created_by);

-- 为常用查询创建复合索引
CREATE INDEX IF NOT EXISTS idx_table_name_warehouse_created_by 
  ON table_name(warehouse_id, created_by);
```

### 5.2 查询优化

1. **使用 RLS 策略自动过滤**：让数据库层面处理权限过滤，减少应用层逻辑
2. **缓存用户角色信息**：避免每次查询都获取用户角色
3. **批量操作优化**：使用批量插入和更新减少数据库往返

### 5.3 缓存策略

```typescript
// src/utils/cache.ts

/**
 * 用户角色缓存
 */
const roleCache = new Map<string, { role: UserRole; expireAt: number }>()

/**
 * 获取用户角色（带缓存）
 */
export async function getUserRoleCached(userId: string): Promise<UserRole> {
  const cached = roleCache.get(userId)
  
  // 检查缓存是否有效（5分钟过期）
  if (cached && cached.expireAt > Date.now()) {
    return cached.role
  }
  
  // 从数据库获取
  const role = await getUserRole(userId)
  
  // 更新缓存
  roleCache.set(userId, {
    role,
    expireAt: Date.now() + 5 * 60 * 1000 // 5分钟
  })
  
  return role
}

/**
 * 清除用户角色缓存
 */
export function clearRoleCache(userId: string): void {
  roleCache.delete(userId)
}
```

## 6. 测试策略

### 6.1 单元测试

测试各个辅助函数的正确性：
- `getCurrentUserId()`
- `getUserRole()`
- `canAccessResource()`
- `addCreatedBy()`

### 6.2 集成测试

测试完整的数据访问流程：
- 司机只能访问自己的数据
- 车队长可以访问管理仓库下的数据
- 超级管理员可以访问所有数据

### 6.3 安全测试

测试安全防护措施：
- 尝试越权访问其他用户的数据
- 尝试修改其他用户的数据
- 尝试删除其他用户的数据

### 6.4 性能测试

测试性能影响：
- 查询响应时间
- 并发访问性能
- 缓存命中率

## 7. 迁移计划

### 7.1 数据迁移

为现有数据添加 `created_by` 字段：

```sql
-- 为现有数据设置 created_by
-- 根据业务逻辑推断创建者

-- 示例：考勤记录的创建者是司机本人
UPDATE attendance_records 
SET created_by = driver_id 
WHERE created_by IS NULL;

-- 示例：车辆的创建者是当前司机或第一个使用的司机
UPDATE vehicles 
SET created_by = current_driver_id 
WHERE created_by IS NULL AND current_driver_id IS NOT NULL;
```

### 7.2 分阶段部署

1. **阶段1**：添加字段和索引（不影响现有功能）
2. **阶段2**：更新RLS策略（逐步启用）
3. **阶段3**：改造应用层代码（逐个模块）
4. **阶段4**：全面启用多租户隔离

### 7.3 回滚计划

如果出现问题，可以快速回滚：
1. 禁用新的RLS策略
2. 恢复旧的API函数
3. 保留 `created_by` 字段（不影响功能）

## 8. 监控与维护

### 8.1 监控指标

- 数据访问成功率
- 越权访问尝试次数
- 查询响应时间
- RLS策略命中率

### 8.2 日志记录

- 所有数据访问操作
- 权限检查结果
- 安全事件
- 性能指标

### 8.3 定期审计

- 每月审查访问日志
- 检查异常访问模式
- 更新安全策略
- 优化性能瓶颈

## 9. 最佳实践

### 9.1 开发规范

1. **所有新表必须包含 `created_by` 字段**
2. **所有查询必须考虑用户权限**
3. **使用 `useTenant` Hook 获取用户上下文**
4. **使用辅助函数自动添加 `created_by`**
5. **不要在前端硬编码用户ID**

### 9.2 代码审查清单

- [ ] 是否添加了 `created_by` 字段？
- [ ] 是否创建了RLS策略？
- [ ] 是否使用了 `useTenant` Hook？
- [ ] 是否处理了权限错误？
- [ ] 是否添加了单元测试？
- [ ] 是否更新了类型定义？

### 9.3 常见陷阱

1. **忘记添加 `created_by` 字段**：导致无法追踪数据创建者
2. **RLS策略过于宽松**：导致数据泄露
3. **缓存用户角色时间过长**：导致权限变更不及时生效
4. **在前端硬编码用户ID**：导致安全漏洞
5. **忽略性能影响**：导致查询变慢

## 10. 总结

本多租户架构设计方案通过以下措施确保数据安全隔离：

1. **数据库层**：使用RLS策略强制行级过滤
2. **应用层**：使用租户上下文管理器和数据访问拦截器
3. **安全层**：实现越权访问检测和审计日志
4. **性能层**：通过索引优化和缓存策略保证性能

该方案具有以下优势：
- ✅ 安全性高：多层防护，防止数据泄露
- ✅ 性能好：合理的索引和缓存策略
- ✅ 可维护性强：清晰的架构和规范
- ✅ 可扩展性好：易于添加新的租户隔离规则

实施该方案后，系统将具备企业级的数据安全能力，满足多租户场景的需求。
