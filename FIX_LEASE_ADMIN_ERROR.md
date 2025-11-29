# 修复"添加用户失败 - lease_admin 角色错误"问题

## 问题描述

用户在添加新用户时遇到以下错误：

```
❌ 创建 auth.users 记录失败
错误: invalid input value for enum user_role: "lease_admin"
```

## 问题原因

1. **数据库枚举类型已更新**：在迁移文件 `00416_remove_lease_admin_role.sql` 中，`lease_admin` 角色已从 `user_role` 枚举类型中移除。当前有效的角色包括：
   - `driver`（司机）
   - `manager`（管理员）
   - `super_admin`（超级管理员）
   - `peer_admin`（平级管理员）
   - `boss`（老板）

2. **RPC 函数类型转换错误**：`insert_tenant_profile` 函数（在 `00432_recreate_insert_tenant_profile_function.sql` 中定义）尝试将角色值转换为租户 Schema 中的 `user_role` 枚举类型：
   ```sql
   $5::text::%I.user_role
   ```
   但是，租户 Schema 中的 `profiles.role` 字段实际上是 `TEXT` 类型，不是枚举类型。这导致了类型转换错误。

## 解决方案

### 1. 修复 `insert_tenant_profile` 函数

创建了新的迁移文件 `00443_fix_insert_tenant_profile_remove_enum_cast.sql`，该文件：

- 移除了对不存在的枚举类型的转换
- 直接使用 TEXT 类型处理角色字段
- 添加了角色值验证，确保只接受租户 Schema 中有效的角色：
  - `boss`（老板）
  - `peer`（平级账号）
  - `fleet_leader`（车队长）
  - `driver`（司机）

### 2. 删除废弃的 lease_admin 相关函数和策略

创建了新的迁移文件 `00444_remove_lease_admin_functions_and_policies.sql`，该文件：

- 删除了 `init_lease_admin_profile` 函数（该函数尝试使用已删除的 'lease_admin' 枚举值）
- 删除了 `is_lease_admin_user` 函数
- 删除了 `is_lease_admin` 函数
- 删除了所有与 lease_admin 相关的 RLS 策略

这些函数和策略引用了已删除的 'lease_admin' 枚举值，可能导致错误。

### 3. 关键代码更改

**之前（错误的）：**
```sql
v_sql := format(
  'INSERT INTO %I.profiles (id, name, phone, email, role, status) 
   VALUES ($1, $2, $3, $4, $5::text::%I.user_role, $6) ...',
  p_schema_name,
  p_schema_name
);
```

**之后（正确的）：**
```sql
-- 验证角色值
IF p_role NOT IN ('boss', 'peer', 'fleet_leader', 'driver') THEN
  RAISE EXCEPTION 'Invalid role for tenant schema: %. Valid roles are: boss, peer, fleet_leader, driver', p_role;
END IF;

v_sql := format(
  'INSERT INTO %I.profiles (id, name, phone, email, role, status) 
   VALUES ($1, $2, $3, $4, $5, $6) ...',
  p_schema_name
);
```

## 验证步骤

1. **检查数据库中是否有 lease_admin 用户**：
   ```sql
   SELECT id, name, phone, role 
   FROM public.profiles 
   WHERE role::text = 'lease_admin';
   ```
   结果：无记录（✓）

2. **检查 auth.users 的 metadata**：
   ```sql
   SELECT id, email, phone, raw_user_meta_data->>'role' as role 
   FROM auth.users 
   WHERE raw_user_meta_data->>'role' = 'lease_admin';
   ```
   结果：无记录（✓）

3. **应用迁移**：
   ```bash
   supabase_apply_migration fix_insert_tenant_profile_remove_enum_cast
   supabase_apply_migration remove_lease_admin_functions_and_policies
   ```
   结果：成功（✓）

4. **验证函数已删除**：
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname IN ('init_lease_admin_profile', 'is_lease_admin_user', 'is_lease_admin');
   ```
   结果：无记录（✓）

## 注意事项

### 角色映射关系

- **Public Schema（public.profiles）**：
  - `driver`：司机
  - `manager`：管理员
  - `super_admin`：超级管理员
  - `peer_admin`：平级管理员
  - `boss`：老板

- **租户 Schema（tenant_xxx.profiles）**：
  - `driver`：司机
  - `fleet_leader`：车队长
  - `peer`：平级账号
  - `boss`：老板

### 可能的浏览器缓存问题

如果问题仍然存在，可能是浏览器缓存了旧的表单数据或应用状态。建议：

1. **清除浏览器缓存**：
   - 打开浏览器开发者工具（F12）
   - 进入 Application/应用程序 标签
   - 清除 Local Storage 和 Session Storage
   - 刷新页面

2. **硬刷新页面**：
   - Windows/Linux：Ctrl + Shift + R
   - Mac：Cmd + Shift + R

3. **检查前端代码**：
   - 确认 `src/db/types.ts` 中的 `UserRole` 类型定义正确
   - 确认用户管理页面中没有使用 `lease_admin` 角色

## 相关文件

- **迁移文件**：
  - `supabase/migrations/00416_remove_lease_admin_role.sql`：移除 lease_admin 角色
  - `supabase/migrations/00432_recreate_insert_tenant_profile_function.sql`：旧的（有问题的）函数
  - `supabase/migrations/00443_fix_insert_tenant_profile_remove_enum_cast.sql`：修复后的 insert_tenant_profile 函数
  - `supabase/migrations/00444_remove_lease_admin_functions_and_policies.sql`：删除废弃的 lease_admin 相关函数和策略

- **类型定义**：
  - `src/db/types.ts`：TypeScript 类型定义

- **API 函数**：
  - `src/db/api.ts`：`createUser` 函数

## 测试建议

1. 尝试创建一个新的司机用户
2. 尝试创建一个新的管理员用户
3. 尝试创建一个新的老板账号
4. 验证所有角色都能正确创建

## 如果问题仍然存在

如果清除缓存后问题仍然存在，请提供：

1. 完整的错误堆栈跟踪
2. 浏览器控制台的完整日志
3. 尝试创建用户时使用的具体参数（手机号、姓名、角色等）
4. 当前登录用户的角色和租户信息

这将帮助我们进一步诊断问题。
