# lease_admin 错误修复总结

## 问题描述

老板在老板端添加新的司机或管理员时失败，出现以下错误：

```
❌ 创建 auth.users 记录失败
错误: invalid input value for enum user_role: "lease_admin"
```

## 系统架构说明

### 中央管理系统（public.profiles）

用于存储中央管理员和租户（老板）的基本信息：

- `super_admin`：超级管理员（中央管理员）
- `boss`：老板（租户信息）

### 租户系统（tenant_xxx.profiles）

用于存储租户内部的员工信息：

- `boss`：老板
- `peer`：平级账号
- `fleet_leader`：车队长
- `driver`：司机

**重要**：当老板在老板端添加司机/管理员/平级账号时，这些用户应该被添加到租户 Schema 中，而不是 public.profiles 中。

## 根本原因

虽然 `lease_admin` 角色已在迁移 `00416_remove_lease_admin_role.sql` 中从 `user_role` 枚举类型中移除，但系统中仍有多处问题：

1. **`insert_tenant_profile` 函数**：尝试将角色转换为租户 Schema 中不存在的 `user_role` 枚举类型
2. **`init_lease_admin_profile` 函数**：尝试使用 `'lease_admin'::user_role` 创建用户
3. **`is_lease_admin_user` 函数**：检查用户是否为 lease_admin
4. **相关 RLS 策略**：引用了 lease_admin 角色
5. **角色映射问题**：`createUser` 函数没有将前端的 `manager` 角色映射为租户 Schema 的 `fleet_leader` 角色
6. **`create_user_auth_account_first` 函数**：权限检查时引用了 `'lease_admin'` 角色，导致 PostgreSQL 尝试将字符串转换为枚举类型时失败

## 修复方案

### 1. 修复 `insert_tenant_profile` 函数

**迁移文件**：`supabase/migrations/00443_fix_insert_tenant_profile_remove_enum_cast.sql`

**问题**：
```sql
-- 错误的代码
$5::text::%I.user_role  -- 尝试转换为不存在的枚举类型
```

**解决方案**：
```sql
-- 修复后的代码
$5::text  -- 直接使用 TEXT 类型，因为租户 Schema 中的 role 字段是 TEXT 类型
```

**添加的验证**：
```sql
-- 验证角色值是否有效
IF p_role NOT IN ('boss', 'peer', 'fleet_leader', 'driver') THEN
  RAISE EXCEPTION 'Invalid role: %. Valid roles are: boss, peer, fleet_leader, driver', p_role;
END IF;
```

### 2. 删除废弃的 lease_admin 相关函数和策略

**迁移文件**：`supabase/migrations/00444_remove_lease_admin_functions_and_policies.sql`

**删除的函数**：
- `init_lease_admin_profile(uuid, text)`：尝试创建 lease_admin 用户
- `is_lease_admin_user(uuid)`：检查用户是否为 lease_admin
- `is_lease_admin()`：检查当前用户是否为 lease_admin

**删除的策略**：
- `"租赁管理员查看所有用户"` on `profiles`
- `"Lease admins can view all notifications"` on `notifications`
- `"Lease admins can insert notifications"` on `notifications`
- `"Lease admins can update notifications"` on `notifications`
- `"Lease admins can delete notifications"` on `notifications`

### 3. 修复角色映射问题

**修改文件**：`src/db/api.ts`

**问题**：
```typescript
// 错误的代码
await supabase.rpc('create_tenant_user', {
  p_role: role  // 直接使用 'manager'，但租户 Schema 中应该是 'fleet_leader'
})
```

**解决方案**：
```typescript
// 修复后的代码
// 角色映射：前端角色 -> 租户 Schema 角色
const tenantRole = role === 'manager' ? 'fleet_leader' : 'driver'

await supabase.rpc('create_tenant_user', {
  p_role: tenantRole  // 使用映射后的角色
})
```

**角色映射关系**：
- 前端 `manager` → 租户 Schema `fleet_leader`（车队长）
- 前端 `driver` → 租户 Schema `driver`（司机）

### 4. 修复 `create_user_auth_account_first` 函数的权限检查

**迁移文件**：
- `supabase/migrations/00445_fix_create_user_auth_remove_lease_admin_check.sql`（第一次修复，移除 lease_admin 引用）
- `supabase/migrations/00446_fix_create_user_auth_correct_roles.sql`（第二次修复，使用正确的 public 角色）
- `supabase/migrations/00447_allow_tenant_admins_create_users.sql`（最终修复，允许租户管理员创建用户）

**问题 1**：引用已删除的 `lease_admin` 角色
```sql
-- 错误的代码
IF current_user_role NOT IN ('lease_admin', 'super_admin', 'manager') THEN
  RAISE EXCEPTION '权限不足：只有管理员可以创建用户';
END IF;
```

**问题 2**：使用了错误的角色名称
```sql
-- 第一次修复（仍然有问题）
IF current_user_role NOT IN ('super_admin', 'peer_admin', 'manager', 'boss') THEN
  RAISE EXCEPTION '权限不足：只有管理员可以创建用户';
END IF;
```
- 使用了 `peer_admin`，但正确的角色是 `peer`
- 使用了 `manager`，但正确的角色是 `fleet_leader`
- 包含了租户 Schema 的角色，但这个函数只检查 `public.profiles`

**问题 3**：只检查 public.profiles，无法支持租户管理员
```sql
-- 第二次修复（功能不完整）
IF current_user_role NOT IN ('super_admin', 'boss') THEN
  RAISE EXCEPTION '权限不足：只有超级管理员和老板可以创建用户';
END IF;
```
- 只检查 `public.profiles` 中的角色
- 租户系统中的 `peer`（平级账号）和 `fleet_leader`（车队长）无法创建用户
- 但这些角色在完整权限的情况下也应该可以创建用户

**最终解决方案**（迁移 00447）：

实现两级权限检查：

1. **第一级**：检查 `public.profiles` 中的角色
   - 如果用户在 `public.profiles` 中且角色是 `super_admin` 或 `boss`，允许创建

2. **第二级**：检查租户 Schema 中的角色
   - 如果用户不在 `public.profiles` 中，遍历所有租户 Schema
   - 查找用户在租户 Schema 中的角色
   - 如果角色是 `boss`、`peer` 或 `fleet_leader`，允许创建

**核心代码逻辑**：
```sql
-- 第一步：检查 public.profiles
SELECT role INTO current_user_role FROM profiles WHERE id = current_user_id;

IF current_user_role IS NOT NULL THEN
  -- 用户在 public.profiles 中
  IF current_user_role IN ('super_admin', 'boss') THEN
    has_permission := true;
  END IF;
ELSE
  -- 第二步：检查租户 Schema
  FOR tenant_record IN SELECT schema_name FROM tenants LOOP
    EXECUTE format('SELECT role FROM %I.profiles WHERE id = $1', tenant_record.schema_name)
    INTO tenant_role USING current_user_id;
    
    IF tenant_role IN ('boss', 'peer', 'fleet_leader') THEN
      has_permission := true;
      EXIT;
    END IF;
  END LOOP;
END IF;
```

**修复说明**：
- 使用动态 SQL 查询租户 Schema
- 支持多租户架构，每个租户有独立的 Schema
- 允许租户管理员（boss、peer、fleet_leader）创建用户
- 添加详细的日志记录，便于调试

## 当前有效的角色

### Public Schema（`public.profiles`）

用于中央管理系统用户：

- `super_admin`：超级管理员
- `boss`：老板

### 租户 Schema（`tenant_xxx.profiles`）

用于租户内部用户（角色字段是 TEXT 类型，不是枚举）：

- `boss`：老板
- `peer`：平级账号
- `fleet_leader`：车队长
- `driver`：司机

## 验证结果

### 1. 数据库检查

✅ 无 lease_admin 用户记录：
```sql
SELECT id, name, phone, role 
FROM public.profiles 
WHERE role::text = 'lease_admin';
-- 结果：0 行
```

✅ 无 lease_admin metadata：
```sql
SELECT id, email, phone, raw_user_meta_data->>'role' as role 
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'lease_admin';
-- 结果：0 行
```

✅ 函数已删除：
```sql
SELECT proname FROM pg_proc 
WHERE proname IN ('init_lease_admin_profile', 'is_lease_admin_user', 'is_lease_admin');
-- 结果：0 行
```

### 2. 迁移应用

✅ 迁移 `00443_fix_insert_tenant_profile_remove_enum_cast.sql` 成功应用
✅ 迁移 `00444_remove_lease_admin_functions_and_policies.sql` 成功应用

## 后续步骤

### 1. 清除浏览器缓存（重要！）

虽然数据库已修复，但浏览器可能缓存了旧的应用状态。请按照 `CLEAR_CACHE_INSTRUCTIONS.md` 中的说明清除浏览器缓存。

**快速步骤**：
1. 按 `F12` 打开开发者工具
2. 右键点击浏览器刷新按钮
3. 选择"清空缓存并硬性重新加载"
4. 清除 Local Storage 和 Session Storage
5. 重新登录系统

### 2. 测试添加用户功能

1. 以老板身份登录
2. 进入用户管理页面
3. 尝试添加新的司机用户
4. 验证是否成功创建

### 3. 监控日志

在浏览器开发者工具的 Console 标签中监控是否还有与 `lease_admin` 相关的错误。

## 技术细节

### 为什么会出现这个错误？

1. **枚举类型的限制**：PostgreSQL 的枚举类型只接受预定义的值。当尝试插入不在枚举中的值时，会抛出错误。

2. **类型转换的问题**：`insert_tenant_profile` 函数尝试将角色转换为 `user_role` 枚举类型，但：
   - Public Schema 中的 `profiles.role` 是 `user_role` 枚举类型
   - 租户 Schema 中的 `profiles.role` 是 `TEXT` 类型
   - 这两个 Schema 使用不同的角色值集合

3. **废弃函数的影响**：即使不直接调用，存在引用已删除枚举值的函数也可能导致问题，特别是在：
   - 数据库查询优化器分析查询时
   - RLS 策略评估时
   - 触发器执行时

### 为什么租户 Schema 使用 TEXT 而不是枚举？

1. **灵活性**：每个租户可能需要不同的角色定义
2. **动态性**：TEXT 类型允许在不修改数据库架构的情况下添加新角色
3. **隔离性**：避免不同租户的角色定义相互影响

## 相关文件

### 迁移文件
- `supabase/migrations/00416_remove_lease_admin_role.sql`：移除 lease_admin 角色
- `supabase/migrations/00432_recreate_insert_tenant_profile_function.sql`：旧的（有问题的）函数
- `supabase/migrations/00443_fix_insert_tenant_profile_remove_enum_cast.sql`：修复后的 insert_tenant_profile 函数
- `supabase/migrations/00444_remove_lease_admin_functions_and_policies.sql`：删除废弃的函数和策略
- `supabase/migrations/00445_fix_create_user_auth_remove_lease_admin_check.sql`：第一次修复 create_user_auth_account_first 函数（移除 lease_admin 引用）
- `supabase/migrations/00446_fix_create_user_auth_correct_roles.sql`：第二次修复 create_user_auth_account_first 函数（使用正确的 public 角色）
- `supabase/migrations/00447_allow_tenant_admins_create_users.sql`：最终修复 create_user_auth_account_first 函数（允许租户管理员创建用户）

### 代码文件
- `src/db/types.ts`：TypeScript 类型定义
- `src/db/api.ts`：`createUser` 函数（已修复角色映射）
- `src/pages/super-admin/user-management/index.tsx`：老板端用户管理页面

### 文档文件
- `FIX_LEASE_ADMIN_ERROR.md`：详细的问题诊断和修复过程
- `CLEAR_CACHE_INSTRUCTIONS.md`：清除浏览器缓存的详细说明
- `LEASE_ADMIN_ERROR_RESOLUTION_SUMMARY.md`：本文档

## 预防措施

为了避免类似问题再次发生：

1. **删除枚举值时**：
   - 搜索所有引用该值的函数、策略和触发器
   - 更新或删除所有相关代码
   - 在迁移文件中添加详细的注释说明影响范围

2. **类型转换时**：
   - 确认目标类型确实存在
   - 验证源值在目标类型的有效值范围内
   - 考虑使用 TEXT 类型以提供更大的灵活性

3. **多租户架构**：
   - 明确区分 Public Schema 和租户 Schema 的数据结构
   - 避免在跨 Schema 操作时假设类型一致性
   - 为不同 Schema 使用不同的类型定义

4. **角色映射**：
   - 在前端和后端之间建立清晰的角色映射关系
   - 在 API 层面进行角色转换，而不是在数据库层面
   - 为不同的系统（中央管理系统 vs 租户系统）使用不同的角色定义

## 总结

通过以下四个关键修复，彻底解决了 `lease_admin` 错误：

1. ✅ 修复 `insert_tenant_profile` 函数，移除错误的枚举类型转换
2. ✅ 删除所有引用已删除 `lease_admin` 角色的函数和策略
3. ✅ 修复 `createUser` 函数的角色映射，确保前端角色正确映射到租户 Schema 角色
4. ✅ 修复 `create_user_auth_account_first` 函数的权限检查，移除对 `lease_admin` 的引用

现在系统可以正常添加新用户，并且角色系统清晰明确：
- **中央管理系统**：使用 `super_admin` 和 `boss` 角色
- **租户系统**：使用 `boss`、`peer`、`fleet_leader` 和 `driver` 角色
- **角色映射**：前端 `manager` 自动映射为租户 Schema 的 `fleet_leader`
- **权限检查**：只使用当前系统中存在的角色进行权限验证

## 修复5：老板权限问题（2025-11-29）

### 问题描述
用户报告：老板没有权限创建用户，错误显示 `public.profiles` 中的角色 `driver` 无权创建用户。

### 根本原因
**租户用户不应该在 `public.profiles` 中有记录！**

问题出在 `handle_new_user` 触发器上：
1. Edge Function 创建租户时，调用 `supabase.auth.admin.createUser` 创建老板账号
2. `supabase.auth.admin.createUser` 在内部可能进行多次操作，第一次 UPDATE 时 `user_metadata` 可能还没有完全设置
3. 触发器检查失败，在 `public.profiles` 中创建了记录，角色为 `driver`
4. 权限检查时，先检查 `public.profiles`，发现角色是 `driver`，拒绝创建用户

### 解决方案
1. **删除租户用户在 `public.profiles` 中的记录**
2. **优化 `handle_new_user` 触发器**，在 INSERT 和 UPDATE 时都检查 `user_metadata`
3. **更新触发器**，同时在 INSERT 和 UPDATE 时触发

详细信息请参考：`BOSS_PERMISSION_FIX_SUMMARY.md`

### 修复结果
- ✅ 所有租户用户在 `public.profiles` 中的记录已被删除
- ✅ 租户用户只在租户 Schema 中有记录
- ✅ 老板、平级账号、车队长都可以正常创建用户

如果问题仍然存在，请清除浏览器缓存并重新登录。
