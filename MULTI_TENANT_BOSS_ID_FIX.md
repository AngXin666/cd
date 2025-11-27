# 多租户系统 boss_id 自动设置修复方案

## 问题描述

原系统的 `boss_id` 自动设置逻辑存在严重问题：
1. 数据库触发器使用 `LIMIT 1` 随机选择一个老板，不适用于多租户系统
2. 在多租户环境下，新用户可能被分配到错误的租户
3. 代码层面没有在创建用户时显式设置 `boss_id`

## 解决方案

### 1. 代码层面修复

#### 1.1 修改 `createDriver` 函数 (`src/db/api.ts`)

在创建司机时，自动获取当前用户的 `boss_id` 并设置给新用户：

```typescript
// 步骤3: 获取当前用户的 boss_id（用于多租户隔离）
const {data: {user: currentUser}} = await supabase.auth.getUser()
const {data: currentUserProfile} = await supabase
  .from('profiles')
  .select('boss_id, role')
  .eq('id', currentUser.id)
  .maybeSingle()

// 确定新用户的 boss_id
let newUserBossId: string
if (currentUserProfile.role === 'super_admin') {
  // 如果当前用户是老板，新用户的 boss_id 就是老板的 ID
  newUserBossId = currentUser.id
} else if (currentUserProfile.boss_id) {
  // 如果当前用户不是老板，新用户的 boss_id 与当前用户相同
  newUserBossId = currentUserProfile.boss_id
}

// 插入数据时设置 boss_id
const insertData = {
  id: userId,
  phone,
  name,
  role: 'driver' as UserRole,
  email: loginEmail,
  driver_type: driverType,
  join_date: new Date().toISOString().split('T')[0],
  boss_id: newUserBossId // 设置 boss_id
}
```

#### 1.2 修改 `createUser` 函数 (`src/db/api.ts`)

同样的逻辑应用于创建车队长和其他角色：

```typescript
// 步骤0: 获取当前用户的 boss_id
const {data: {user}} = await supabase.auth.getUser()
const {data: currentProfile} = await supabase
  .from('profiles')
  .select('boss_id, role')
  .eq('id', user.id)
  .maybeSingle()

// 确定新用户的 boss_id
let newUserBossId: string
if (currentProfile.role === 'super_admin') {
  newUserBossId = user.id
} else if (currentProfile.boss_id) {
  newUserBossId = currentProfile.boss_id
}

// 插入数据时使用 newUserBossId
const insertData: any = {
  id: userId,
  phone,
  name,
  role: role as UserRole,
  email: loginEmail,
  boss_id: newUserBossId // 使用新计算的 boss_id
}
```

#### 1.3 添加 `getCurrentUserBossId` 函数 (`src/db/tenant-utils.ts`)

为其他模块提供统一的获取 `boss_id` 的方法：

```typescript
export async function getCurrentUserBossId(userId?: string): Promise<string | null> {
  try {
    let currentUserId = userId

    // 如果没有提供 userId，则从认证系统获取
    if (!currentUserId) {
      const {data: {user}} = await supabase.auth.getUser()
      if (!user) return null
      currentUserId = user.id
    }

    // 从 profiles 表获取用户的 boss_id 和 role
    const {data, error} = await supabase
      .from('profiles')
      .select('boss_id, role, name')
      .eq('id', currentUserId)
      .maybeSingle()

    if (error || !data) return null

    // 如果是老板（super_admin），boss_id 为 NULL，返回自己的 ID
    if (!data.boss_id && data.role === 'super_admin') {
      return currentUserId
    }

    return data.boss_id
  } catch (error) {
    console.error('💥 获取 boss_id 异常:', error)
    return null
  }
}
```

### 2. 数据库层面修复

#### 2.1 更新触发器 (`supabase/migrations/99996_update_auto_set_boss_id_for_multi_tenant.sql`)

触发器作为兜底机制，支持多租户系统：

```sql
CREATE OR REPLACE FUNCTION auto_set_boss_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_user_role user_role;
  current_user_boss_id uuid;
BEGIN
  -- 如果是老板（super_admin），不需要设置 boss_id
  IF NEW.role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- 如果 boss_id 已经设置，不需要修改
  IF NEW.boss_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 获取当前会话的用户 ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 查询当前用户的角色和 boss_id
  SELECT role, boss_id INTO current_user_role, current_user_boss_id
  FROM profiles
  WHERE id = current_user_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- 根据当前用户的角色确定新用户的 boss_id
  IF current_user_role = 'super_admin' THEN
    -- 如果当前用户是老板，新用户的 boss_id 就是老板的 ID
    NEW.boss_id := current_user_id;
  ELSIF current_user_boss_id IS NOT NULL THEN
    -- 如果当前用户不是老板，新用户的 boss_id 与当前用户相同
    NEW.boss_id := current_user_boss_id;
  END IF;

  RETURN NEW;
END;
$$;
```

## 修复的文件列表

### 代码文件
1. `src/db/api.ts` - 修改 `createDriver` 和 `createUser` 函数
2. `src/db/tenant-utils.ts` - 添加 `getCurrentUserBossId` 函数
3. `src/utils/behaviorTracker.ts` - 修复 `init` 方法的异步调用
4. `src/utils/performanceMonitor.ts` - 修复 `init` 方法的异步调用
5. `src/pages/performance-monitor/index.tsx` - 修复缓存统计数据映射
6. `src/pages/super-admin/user-management/index.tsx` - 修复仓库选项类型

### 数据库迁移文件
1. `supabase/migrations/99996_update_auto_set_boss_id_for_multi_tenant.sql` - 更新触发器以支持多租户

## 工作原理

### 多租户隔离逻辑

1. **老板（super_admin）创建用户**
   - 老板的 `boss_id` 为 `NULL`
   - 新用户的 `boss_id` 设置为老板的 ID
   - 所有新用户都属于这个老板的租户

2. **车队长（manager）创建用户**
   - 车队长的 `boss_id` 指向他的老板
   - 新用户的 `boss_id` 与车队长相同
   - 新用户属于同一个租户

3. **平级账号（peer_admin）创建用户**
   - 平级账号的 `boss_id` 指向他的老板
   - 新用户的 `boss_id` 与平级账号相同
   - 新用户属于同一个租户

### 双重保障机制

1. **代码层面（主要机制）**
   - 在 `createDriver` 和 `createUser` 函数中显式设置 `boss_id`
   - 根据当前用户的角色和 `boss_id` 计算新用户的 `boss_id`
   - 确保多租户隔离的正确性

2. **数据库层面（兜底机制）**
   - 触发器在插入新用户时自动检查和设置 `boss_id`
   - 仅在代码未设置 `boss_id` 时触发
   - 从当前会话用户获取租户信息

## 测试验证

### 测试场景

1. **老板创建司机**
   - 验证新司机的 `boss_id` 是老板的 ID

2. **老板创建车队长**
   - 验证新车队长的 `boss_id` 是老板的 ID

3. **车队长创建司机**
   - 验证新司机的 `boss_id` 与车队长相同

4. **多个租户并存**
   - 创建多个老板账号
   - 每个老板创建自己的用户
   - 验证用户的 `boss_id` 正确指向各自的老板

### 验证 SQL

```sql
-- 查看所有用户的 boss_id 分布
SELECT 
  p.name,
  p.role,
  p.boss_id,
  b.name as boss_name
FROM profiles p
LEFT JOIN profiles b ON p.boss_id = b.id
ORDER BY p.boss_id, p.role;

-- 验证每个租户的用户数量
SELECT 
  b.name as boss_name,
  COUNT(*) as user_count
FROM profiles p
LEFT JOIN profiles b ON p.boss_id = b.id
WHERE p.role != 'super_admin'
GROUP BY b.name;
```

## 注意事项

1. **老板账号的 boss_id**
   - 老板（super_admin）的 `boss_id` 为 `NULL`
   - 这是正常的，不是错误

2. **getCurrentUserBossId 函数**
   - 如果当前用户是老板，返回老板自己的 ID
   - 如果当前用户不是老板，返回他的 `boss_id`
   - 这样可以统一处理租户隔离逻辑

3. **触发器的作用**
   - 触发器仅作为兜底机制
   - 主要逻辑应该在代码层面实现
   - 触发器确保即使代码遗漏，也能正确设置 `boss_id`

## 总结

通过代码层面和数据库层面的双重修复，系统现在能够正确处理多租户环境下的 `boss_id` 设置：

1. ✅ 老板创建的用户自动属于老板的租户
2. ✅ 车队长创建的用户自动属于同一租户
3. ✅ 平级账号创建的用户自动属于同一租户
4. ✅ 多个租户可以并存，互不干扰
5. ✅ 数据隔离正确，查询时使用 `boss_id` 过滤

这个修复方案确保了系统在多租户环境下的数据安全和隔离性。
