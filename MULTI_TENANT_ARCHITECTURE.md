# 多租户框架架构文档

## 概述

车队管家小程序采用多租户架构，通过 PostgreSQL Schema 实现租户数据隔离。每个租户拥有独立的 Schema，确保数据安全和隔离。

---

## 架构设计

### 1. Schema 隔离

#### 中央管理系统（Public Schema）
- **用途**：存储系统级数据和超级管理员信息
- **主要表**：
  - `profiles`：超级管理员的用户档案
  - `tenants`：租户信息表
  - 其他系统级配置表

#### 租户系统（Tenant Schema）
- **命名规则**：`tenant_001`, `tenant_002`, ...
- **用途**：存储租户的所有业务数据
- **主要表**：
  - `profiles`：租户用户档案（boss, peer_admin, manager, driver）
  - `vehicles`：车辆信息
  - `warehouses`：仓库信息
  - `attendance_records`：考勤记录
  - 其他业务表

### 2. 数据隔离机制

```
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │  Public Schema  │  │ Tenant_001      │  │ Tenant_002   ││
│  ├─────────────────┤  ├─────────────────┤  ├──────────────┤│
│  │ - profiles      │  │ - profiles      │  │ - profiles   ││
│  │ - tenants       │  │ - vehicles      │  │ - vehicles   ││
│  │ - ...           │  │ - warehouses    │  │ - warehouses ││
│  └─────────────────┘  │ - ...           │  │ - ...        ││
│                        └─────────────────┘  └──────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 角色系统

### 角色定义

| 角色 | 英文名 | 所属系统 | 权限范围 | 可管理角色 |
|------|--------|---------|---------|-----------|
| 超级管理员 | super_admin | 中央管理系统 | 管理所有租户 | 所有角色 |
| 老板 | boss | 租户系统 | 租户内最高权限 | peer_admin, manager, driver |
| 平级管理员 | peer_admin | 租户系统 | 平级管理员 | manager, driver |
| 车队长 | manager | 租户系统 | 车队管理 | 只读，不能管理 |
| 司机 | driver | 租户系统 | 普通司机 | 无管理权限 |
| 租赁管理员 | lease_admin | 特殊角色 | 租赁管理 | 特定功能 |

### 角色层级

```
super_admin (中央管理系统)
    │
    ├─ 管理所有租户
    │
    └─ 创建/停用/删除租户

boss (租户老板)
    │
    ├─ 租户内最高权限
    │
    ├─ 创建 peer_admin, manager, driver
    │
    └─ 管理租户内所有数据

peer_admin (平级管理员)
    │
    ├─ 与 boss 平级
    │
    ├─ 创建 manager, driver
    │
    └─ 管理部分数据

manager (车队长)
    │
    ├─ 管理车队
    │
    └─ 只读权限

driver (司机)
    │
    └─ 查看自己的数据
```

---

## 权限检查

### 前端权限函数（roleHelper.ts）

```typescript
// 检查是否为中央管理系统的超级管理员
isSuperAdmin(role): boolean

// 检查是否为租户的老板
isBoss(role): boolean

// 检查是否为租户管理员（boss 或 peer_admin）
isTenantAdmin(role): boolean

// 检查是否为管理员（包括所有管理角色）
isManager(role): boolean

// 检查是否可以管理其他用户
canManageUser(managerRole, targetRole): boolean

// 获取可创建的角色列表
getCreatableRoles(currentRole): UserRole[]
```

### 数据库权限函数

```sql
-- 检查用户是否为管理员（super_admin, boss, peer_admin）
is_admin(p_user_id uuid): boolean

-- 检查用户是否为管理员角色（推荐使用）
is_admin_role(uid uuid): boolean

-- 检查用户是否为管理员角色（已废弃，保留向后兼容）
is_super_admin_or_peer(uid uuid): boolean
```

---

## 创建租户流程

### 流程图

```
开始
  │
  ├─ 1. 验证输入参数
  │
  ├─ 2. 在 public.tenants 表中创建租户记录
  │
  ├─ 3. 创建租户 Schema（tenant_xxx）
  │     └─ 从模板 Schema 克隆表结构
  │
  ├─ 4. 创建老板账号（auth.users）
  │     └─ 设置 user_metadata：
  │         - tenant_id
  │         - schema_name
  │         - role: 'boss'
  │
  ├─ 5. 在租户 Schema 中创建老板 profile
  │     └─ 角色：boss
  │
  ├─ 6. 创建默认仓库
  │
  ├─ 7. 更新租户记录
  │     └─ 保存老板信息
  │
  └─ 完成
```

### Edge Function

**文件**：`supabase/functions/create-tenant/index.ts`

**关键步骤**：

1. **创建租户记录**
   ```typescript
   const { data: tenant } = await supabase
     .from('tenants')
     .insert({
       company_name: input.company_name,
       contact_name: input.contact_name,
       // ...
     })
     .select()
     .single()
   ```

2. **创建租户 Schema**
   ```typescript
   const schemaName = `tenant_${tenant.id.substring(0, 3)}`
   await supabase.rpc('clone_tenant_schema_from_template', {
     p_new_schema_name: schemaName
   })
   ```

3. **创建老板账号**
   ```typescript
   const { data: authData } = await supabase.auth.admin.createUser({
     phone: input.boss_phone,
     email: accountEmail,
     password: input.boss_password,
     user_metadata: {
       name: input.boss_name,
       role: 'boss',
       tenant_id: tenant.id,
       schema_name: schemaName
     }
   })
   ```

4. **在租户 Schema 中创建老板 profile**
   ```typescript
   await supabase.rpc('insert_tenant_profile', {
     p_schema_name: schemaName,
     p_user_id: authData.user.id,
     p_name: input.boss_name,
     p_phone: input.boss_phone,
     p_email: input.boss_email || null,
     p_role: 'boss'
   })
   ```

---

## 用户认证和 Profile 查询

### 认证流程

1. **用户登录**
   - 使用手机号或账号登录
   - Supabase Auth 验证凭证

2. **获取用户信息**
   - 从 `auth.users` 表获取用户基本信息
   - 从 `user_metadata` 获取租户信息

3. **查询 Profile**
   - 调用 `get_current_user_profile()` RPC 函数
   - 函数自动判断从哪个 Schema 查询：
     - 如果 `user_metadata` 中有 `tenant_id`，从租户 Schema 查询
     - 否则从 `public.profiles` 查询

### Profile 查询函数

**数据库函数**：`get_current_user_profile()`

```sql
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id text;
  v_schema_name text;
  v_profile jsonb;
BEGIN
  -- 获取当前用户 ID
  v_user_id := auth.uid();
  
  -- 从 auth.users 的 user_metadata 中获取租户信息
  SELECT 
    raw_user_meta_data->>'tenant_id',
    raw_user_meta_data->>'schema_name'
  INTO v_tenant_id, v_schema_name
  FROM auth.users
  WHERE id = v_user_id;
  
  -- 如果是租户用户，从租户 Schema 查询
  IF v_tenant_id IS NOT NULL AND v_schema_name IS NOT NULL THEN
    EXECUTE format('
      SELECT row_to_json(p.*)::jsonb
      FROM %I.profiles p
      WHERE p.id = $1
    ', v_schema_name)
    INTO v_profile
    USING v_user_id;
    
    RETURN v_profile;
  ELSE
    -- 如果是超级管理员，从 public.profiles 查询
    SELECT row_to_json(p.*)::jsonb
    INTO v_profile
    FROM public.profiles p
    WHERE p.id = v_user_id;
    
    RETURN v_profile;
  END IF;
END;
$$;
```

**前端函数**：`getCurrentUserProfile()`

```typescript
export async function getCurrentUserProfile(): Promise<Profile | null> {
  // 获取当前认证用户
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  // 使用 RPC 函数从正确的 Schema 查询 profile
  const { data, error } = await supabase.rpc('get_current_user_profile')
  
  if (error || !data) return null
  
  return data as Profile
}
```

---

## 触发器和自动化

### handle_new_user 触发器

**用途**：在用户注册时自动创建 profile

**逻辑**：
1. 检查 `user_metadata` 中是否有 `tenant_id`
2. 如果有 `tenant_id`，跳过（租户用户的 profile 由 Edge Function 创建）
3. 如果没有 `tenant_id`，在 `public.profiles` 表中创建记录

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
BEGIN
  -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    -- 检查是否是租户用户
    IF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
      -- 跳过租户用户，由 Edge Function 处理
      RETURN NEW;
    END IF;
    
    -- 判断 profiles 表里有多少用户
    SELECT COUNT(*) INTO user_count FROM profiles;
    
    -- 插入 profiles，首位用户给 admin 角色
    INSERT INTO profiles (id, phone, email, role)
    VALUES (
        NEW.id,
        NEW.phone,
        NEW.email,
        CASE WHEN user_count = 0 THEN 'admin'::user_role ELSE 'user'::user_role END
    );
  END IF;
  RETURN NEW;
END;
$$;
```

---

## RLS 策略

### Public Schema

**profiles 表**：
- 超级管理员可以查看和管理所有用户
- 用户可以查看和更新自己的 profile

**tenants 表**：
- 超级管理员可以查看和管理所有租户
- 租户老板可以查看自己的租户信息

### Tenant Schema

**不使用 RLS**：
- 租户 Schema 本身就是隔离的
- 通过应用层逻辑控制访问
- 租户用户只能访问自己租户的 Schema

---

## 数据迁移

### 克隆租户 Schema

**函数**：`clone_tenant_schema_from_template(p_new_schema_name TEXT)`

**功能**：
1. 从模板 Schema 克隆表结构
2. 使用 `CREATE TABLE LIKE INCLUDING ALL` 复制所有字段和约束
3. 不复制外键约束（避免跨 Schema 引用）
4. 不复制触发器、函数、RLS 策略

**迁移文件**：`supabase/migrations/00409_create_tenant_schema_clone_v5.sql`

---

## 最佳实践

### 1. 角色检查

**推荐**：使用 roleHelper.ts 中的函数
```typescript
import { isSuperAdmin, isBoss, isTenantAdmin } from '@/utils/roleHelper'

if (isSuperAdmin(user.role)) {
  // 超级管理员逻辑
}

if (isBoss(user.role)) {
  // 老板逻辑
}

if (isTenantAdmin(user.role)) {
  // 租户管理员逻辑
}
```

**不推荐**：直接比较角色字符串
```typescript
// ❌ 不推荐
if (user.role === 'super_admin' || user.role === 'boss') {
  // ...
}
```

### 2. Profile 查询

**推荐**：使用 getCurrentUserProfile()
```typescript
import { getCurrentUserProfile } from '@/db/api'

const profile = await getCurrentUserProfile()
```

**不推荐**：直接查询 profiles 表
```typescript
// ❌ 不推荐
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

### 3. 权限检查

**推荐**：使用 canManageUser()
```typescript
import { canManageUser } from '@/utils/roleHelper'

if (canManageUser(currentUser.role, targetUser.role)) {
  // 允许管理
}
```

### 4. 创建租户

**推荐**：使用 Edge Function
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/create-tenant`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    company_name: '公司名称',
    boss_name: '老板姓名',
    boss_phone: '13800138000',
    boss_password: '密码'
  })
})
```

---

## 故障排查

### 问题1：租户用户角色显示错误

**症状**：创建租户后，老板登录显示角色为"司机"

**原因**：
1. `handle_new_user` 触发器在 `public.profiles` 表中创建了记录
2. 前端从 `public.profiles` 表查询，得到错误的角色

**解决方案**：
1. 修改 `handle_new_user` 触发器，跳过租户用户
2. 使用 `get_current_user_profile()` RPC 函数查询

### 问题2：权限检查函数不包含 boss 角色

**症状**：boss 用户没有管理员权限

**原因**：
1. `is_admin()` 函数没有包含 `boss` 角色
2. `is_super_admin_or_peer()` 函数没有包含 `boss` 角色

**解决方案**：
1. 更新 `is_admin()` 函数，添加 `boss` 角色
2. 更新 `is_super_admin_or_peer()` 函数，添加 `boss` 角色

### 问题3：前端权限函数逻辑错误

**症状**：boss 用户无法执行某些操作

**原因**：
1. `roleHelper.ts` 中的函数没有正确处理 `boss` 角色

**解决方案**：
1. 更新所有权限检查函数
2. 添加 `isBoss()` 和 `isTenantAdmin()` 函数

---

## 版本历史

### v1.0.0 (2025-11-28)
- ✅ 完善多租户框架的角色权限系统
- ✅ 修复租户用户角色显示问题
- ✅ 更新所有权限检查函数
- ✅ 添加角色权限矩阵
- ✅ 完善文档

---

## 相关文件

### 数据库迁移
- `supabase/migrations/001_create_enums.sql` - 创建枚举类型
- `supabase/migrations/00411_add_boss_role_to_user_role_enum.sql` - 添加 boss 角色
- `supabase/migrations/00412_fix_handle_new_user_for_tenant_users.sql` - 修复触发器
- `supabase/migrations/00413_add_get_current_user_profile_function.sql` - 创建 RPC 函数
- `supabase/migrations/00414_fix_is_admin_function_add_boss_role.sql` - 修复 is_admin 函数
- `supabase/migrations/00415_fix_is_super_admin_or_peer_add_boss.sql` - 修复 is_super_admin_or_peer 函数

### Edge Functions
- `supabase/functions/create-tenant/index.ts` - 创建租户

### 前端代码
- `src/db/types.ts` - 类型定义
- `src/db/api.ts` - API 函数
- `src/utils/roleHelper.ts` - 权限检查函数

### 文档
- `README.md` - 项目说明
- `MULTI_TENANT_ARCHITECTURE.md` - 多租户架构文档（本文档）

---

## 联系方式

如有问题，请联系开发团队。
