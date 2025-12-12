# 修复 user_roles 表不存在错误

## 错误信息
```
Error: Failed to run sql query: ERROR: 42P01: relation "user_roles" does not exist
```

## 根本原因
在迁移 `00598_optimize_permission_tables_update_rls_and_drop_old_tables_v2.sql` 中，`user_roles` 表已被删除，权限系统已优化为直接使用 `users` 表的 `role` 字段。

## 权限系统架构变更

### 旧架构（已废弃）
```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone TEXT,
  name TEXT,
  ...
);

-- 用户角色关联表
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role user_role NOT NULL,
  ...
);
```

### 新架构（当前）
```sql
-- 用户表（包含角色字段）
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone TEXT,
  name TEXT,
  role user_role NOT NULL,  -- 角色直接存储在用户表中
  ...
);
```

## 修复方法

### 方法 1：更新 SQL 脚本（推荐）

将所有引用 `user_roles` 表的查询改为查询 `users` 表：

**错误示例：**
```sql
CREATE POLICY "policy_name" ON table_name
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles           -- ❌ 表不存在
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'BOSS'::user_role
    )
  );
```

**正确示例：**
```sql
CREATE POLICY "policy_name" ON table_name
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users                -- ✅ 使用 users 表
      WHERE users.id = auth.uid()
      AND users.role = 'BOSS'::user_role
    )
  );
```

### 方法 2：使用辅助函数

系统已提供优化的权限检查函数，可直接使用：

```sql
-- 检查是否为老板
CREATE POLICY "policy_name" ON table_name
  FOR ALL TO authenticated
  USING (is_boss_v2(auth.uid()));

-- 检查是否为车队长
CREATE POLICY "policy_name" ON table_name
  FOR ALL TO authenticated
  USING (is_manager_v2(auth.uid()));

-- 检查是否为司机
CREATE POLICY "policy_name" ON table_name
  FOR ALL TO authenticated
  USING (is_driver_v2(auth.uid()));
```

## 可用的权限函数

| 函数名 | 说明 | 用法 |
|--------|------|------|
| `is_boss_v2(uuid)` | 检查是否为老板（超级管理员） | `is_boss_v2(auth.uid())` |
| `is_manager_v2(uuid)` | 检查是否为车队长 | `is_manager_v2(auth.uid())` |
| `is_driver_v2(uuid)` | 检查是否为司机 | `is_driver_v2(auth.uid())` |
| `is_dispatcher_v2(uuid)` | 检查是否为调度 | `is_dispatcher_v2(auth.uid())` |
| `is_peer_admin_v2(uuid)` | 检查是否为同级管理员 | `is_peer_admin_v2(auth.uid())` |
| `get_user_role(uuid)` | 获取用户角色 | `get_user_role(auth.uid())` |

## 已修复的文件

- ✅ `scripts/fix-category-prices-table.sql` - 已更新为使用 `users` 表

## 待检查的文件

需要检查并更新以下类型的文件：

1. **迁移文件** (`supabase/migrations/*.sql`)
   - 搜索包含 `user_roles` 的 RLS 策略
   - 更新为使用 `users` 表或辅助函数

2. **测试脚本** (`scripts/*.sql`)
   - 检查测试脚本中的权限查询
   - 更新为新的权限检查方式

3. **备份文件** (`backup/**/*.sql`)
   - 仅供参考，无需修改

## 验证方法

### 1. 检查 users 表结构
```sql
\d users
```

应包含 `role` 字段：
```
Column     | Type      | 
-----------+-----------+
id         | uuid      | 
phone      | text      | 
name       | text      | 
role       | user_role | 
...
```

### 2. 测试权限函数
```sql
-- 测试是否为老板
SELECT is_boss_v2(auth.uid());

-- 获取当前用户角色
SELECT get_user_role(auth.uid());
```

### 3. 查询用户角色
```sql
SELECT id, phone, name, role 
FROM users 
WHERE role = 'BOSS'::user_role;
```

## 角色枚举值

系统当前支持的角色：

```sql
CREATE TYPE user_role AS ENUM (
  'BOSS',        -- 老板/超级管理员
  'MANAGER',     -- 车队长
  'DRIVER',      -- 司机
  'DISPATCHER',  -- 调度
  'PEER_ADMIN'   -- 同级管理员
);
```

## 注意事项

1. **不要尝试重新创建 `user_roles` 表** - 这会与新架构冲突
2. **使用优化后的权限函数** - 性能提升约 30%
3. **检查所有自定义 SQL** - 确保没有遗漏的 `user_roles` 引用
4. **RLS 策略自动生效** - 更新后无需重启服务

## 相关迁移

- `00596_optimize_permission_tables_add_role_to_users.sql` - 将角色字段添加到 users 表
- `00598_optimize_permission_tables_update_rls_and_drop_old_tables_v2.sql` - 删除 user_roles 表并更新 RLS 函数

## 参考文档

- [权限系统优化完成报告](../PERMISSION_OPTIMIZATION_COMPLETED.md)
- [权限表分析](../PERMISSION_TABLES_ANALYSIS.md)
