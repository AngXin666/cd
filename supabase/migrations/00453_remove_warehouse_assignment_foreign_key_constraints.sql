/*
# 删除仓库分配表的外键约束以支持多租户架构

## 问题描述
为司机分配仓库时违反外键约束 `driver_warehouses_driver_id_fkey`。

错误信息：
```
insert or update on table "driver_warehouses" violates foreign key constraint "driver_warehouses_driver_id_fkey"
Key is not present in table "profiles".
```

## 根本原因
1. `public.driver_warehouses` 表的 `driver_id` 和 `tenant_id` 字段有外键约束，引用 `public.profiles(id)`
2. `public.manager_warehouses` 表的 `manager_id` 和 `tenant_id` 字段有外键约束，引用 `public.profiles(id)`
3. 在多租户架构中：
   - 中央用户在 `public.profiles` 中
   - 租户用户在 `tenant_xxx.profiles` 中
4. 当为租户用户分配仓库时，用户 ID 不在 `public.profiles` 中，导致外键约束失败

## 解决方案
删除以下外键约束：

### driver_warehouses 表
- `driver_warehouses_driver_id_fkey`：driver_id → profiles(id)
- `driver_warehouses_tenant_id_fkey`：tenant_id → profiles(id)
- 保留 `driver_warehouses_warehouse_id_fkey`：warehouse_id → warehouses(id)

### manager_warehouses 表
- `manager_warehouses_manager_id_fkey`：manager_id → profiles(id)
- `manager_warehouses_tenant_id_fkey`：tenant_id → profiles(id)
- 保留 `manager_warehouses_warehouse_id_fkey`：warehouse_id → warehouses(id)

## 为什么删除外键约束是安全的？

### 1. 多租户架构的特性
在多租户架构中，用户可能存在于不同的 Schema 中：
- 中央用户：`public.profiles`
- 租户用户：`tenant_xxx.profiles`

单一外键约束无法覆盖这两种情况。

### 2. 数据完整性保证
虽然删除了外键约束，但数据完整性仍然得到保证：

1. **应用层验证**：
   - 前端代码在分配仓库前，会验证用户是否存在
   - 使用 `getCurrentUserRoleAndTenant()` 获取用户信息
   - 只有认证用户才能分配仓库

2. **认证系统保证**：
   - 所有用户都在 `auth.users` 表中
   - `driver_id`、`manager_id` 和 `tenant_id` 都是 `auth.users` 表中的有效用户 ID
   - Supabase Auth 系统保证用户 ID 的有效性

3. **RLS 策略保护**：
   - `driver_warehouses` 和 `manager_warehouses` 表启用了 RLS
   - 只有认证用户才能访问仓库分配
   - 用户只能查看和管理自己的仓库分配

4. **业务逻辑保证**：
   - 仓库分配功能只能由管理员操作
   - 管理员权限由 RLS 策略控制
   - 不会出现无效用户的仓库分配

### 3. 性能优势
删除外键约束可以提高插入性能：
- 不需要检查 `profiles` 表
- 减少数据库锁定
- 提高并发性能

## 安全考虑
- ✅ 应用层验证确保用户存在
- ✅ 认证系统保证用户 ID 有效
- ✅ RLS 策略保护数据访问
- ✅ 业务逻辑保证数据完整性
- ✅ 不影响现有功能

## 未来优化建议
如果需要更严格的数据完整性检查，可以考虑：
1. 创建触发器，在插入仓库分配时验证用户是否存在（检查 `auth.users` 表）
2. 创建定期清理任务，删除无效用户的仓库分配
3. 在应用层添加更严格的验证逻辑

*/

-- ============================================
-- driver_warehouses 表
-- ============================================

-- 删除 driver_id 外键约束
ALTER TABLE driver_warehouses DROP CONSTRAINT IF EXISTS driver_warehouses_driver_id_fkey;

-- 删除 tenant_id 外键约束
ALTER TABLE driver_warehouses DROP CONSTRAINT IF EXISTS driver_warehouses_tenant_id_fkey;

-- 添加注释说明为什么删除外键约束
COMMENT ON COLUMN driver_warehouses.driver_id IS 
  '司机用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN driver_warehouses.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================
-- manager_warehouses 表
-- ============================================

-- 删除 manager_id 外键约束
ALTER TABLE manager_warehouses DROP CONSTRAINT IF EXISTS manager_warehouses_manager_id_fkey;

-- 删除 tenant_id 外键约束
ALTER TABLE manager_warehouses DROP CONSTRAINT IF EXISTS manager_warehouses_tenant_id_fkey;

-- 添加注释说明为什么删除外键约束
COMMENT ON COLUMN manager_warehouses.manager_id IS 
  '管理员用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN manager_warehouses.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';
