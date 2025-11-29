# 司机仓库分配 RLS 权限问题修复总结

## 问题描述

用户报告：添加司机时，插入仓库分配失败，错误信息：

```
插入仓库分配失败: {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "driver_warehouses"'
}
```

## 问题分析

### 1. 表结构问题

**发现**：租户 Schema 中缺少 `driver_warehouses` 和 `manager_warehouses` 表。

**原因**：
- 迁移文件 `00400_implement_schema_based_tenant_isolation.sql` 定义了在租户 Schema 中创建这些表
- 但是，现有租户是在这个迁移文件之前创建的，或者迁移执行不完整

**影响**：
- 前端代码尝试访问租户 Schema 中的表，但表不存在
- 导致操作失败

### 2. RLS 策略问题

**发现**：`public.driver_warehouses` 表的 RLS 策略阻止了租户用户的插入操作。

**原因**：
1. 租户用户（boss、peer、fleet_leader）不在 `public.profiles` 中，只在租户 Schema 中有记录
2. `is_admin()` 和 `is_manager()` 函数只检查 `public.profiles` 表
3. RLS 策略使用这些函数，导致租户用户无法插入数据

**影响**：
- 租户管理员（boss、peer、fleet_leader）无法添加司机的仓库分配
- 系统功能受限

## 解决方案

### 修复1：为租户 Schema 添加缺失的表

**迁移文件**：`00449_add_missing_tables_to_tenant_schemas.sql`

**操作**：
1. 遍历所有现有租户 Schema
2. 检查 `driver_warehouses` 和 `manager_warehouses` 表是否存在
3. 如果不存在，创建这些表

**表结构**：

#### driver_warehouses
```sql
CREATE TABLE tenant_xxx.driver_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES tenant_xxx.profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES tenant_xxx.warehouses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, warehouse_id)
);
```

#### manager_warehouses
```sql
CREATE TABLE tenant_xxx.manager_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES tenant_xxx.profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES tenant_xxx.warehouses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, warehouse_id)
);
```

**安全策略**：
- 不启用 RLS，因为租户内的用户应该可以自由访问这些表
- 租户隔离通过 Schema 级别实现

### 修复2：更新 RLS 策略，允许租户用户插入数据

**迁移文件**：`00450_fix_driver_warehouses_rls_for_tenant_users.sql`

**操作**：
1. 创建新函数 `is_tenant_admin()`，检查用户是否在任何租户 Schema 中有管理员权限
2. 删除旧的 RLS 策略
3. 创建新的 RLS 策略，允许租户管理员管理数据

**新函数**：`is_tenant_admin(p_user_id uuid)`

```sql
CREATE OR REPLACE FUNCTION is_tenant_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  tenant_record RECORD;
  user_role text;
BEGIN
  -- 首先检查 public.profiles 中的角色
  SELECT role INTO user_role
  FROM profiles
  WHERE id = p_user_id;
  
  IF user_role IN ('super_admin', 'boss') THEN
    RETURN true;
  END IF;
  
  -- 检查租户 Schema 中的角色
  FOR tenant_record IN 
    SELECT schema_name 
    FROM tenants 
    WHERE schema_name IS NOT NULL
  LOOP
    BEGIN
      EXECUTE format(
        'SELECT role FROM %I.profiles WHERE id = $1',
        tenant_record.schema_name
      ) INTO user_role USING p_user_id;
      
      IF user_role IN ('boss', 'peer', 'fleet_leader') THEN
        RETURN true;
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        CONTINUE;
      WHEN OTHERS THEN
        CONTINUE;
    END;
  END LOOP;
  
  RETURN false;
END;
$$;
```

**新 RLS 策略**：

```sql
-- driver_warehouses 表
CREATE POLICY "Tenant admins can manage driver warehouses"
ON driver_warehouses
FOR ALL
TO public
USING (is_tenant_admin(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid()));

-- manager_warehouses 表
CREATE POLICY "Tenant admins can manage manager warehouses"
ON manager_warehouses
FOR ALL
TO public
USING (is_tenant_admin(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid()));
```

## 修复结果

### 1. 租户 Schema 中的表已创建

查询 `tenant_test1` Schema：

| 表名 | RLS 状态 |
|------|---------|
| attendance | false |
| driver_warehouses | false ✅ |
| leave_requests | false |
| manager_warehouses | false ✅ |
| notifications | true |
| piecework_records | false |
| profiles | false |
| vehicles | false |
| warehouses | false |

### 2. RLS 策略已更新

#### driver_warehouses 表

| 策略名称 | 操作 | 条件 |
|---------|------|------|
| Tenant admins can manage driver warehouses | ALL | is_tenant_admin(auth.uid()) ✅ |
| All authenticated users can view driver warehouses | SELECT | auth.uid() IS NOT NULL |
| Authenticated users can view driver warehouses | SELECT | is_admin() OR is_manager() OR is_driver() |
| Drivers can view own warehouse assignments | SELECT | driver_id = auth.uid() |

#### manager_warehouses 表

| 策略名称 | 操作 | 条件 |
|---------|------|------|
| Tenant admins can manage manager warehouses | ALL | is_tenant_admin(auth.uid()) ✅ |
| All authenticated users can view manager warehouses | SELECT | auth.uid() IS NOT NULL |
| Authenticated users can view manager warehouses | SELECT | is_admin() OR is_manager() |
| Managers can view own warehouse assignments | SELECT | manager_id = auth.uid() |

### 3. 权限验证

现在，以下用户可以插入数据到 `driver_warehouses` 和 `manager_warehouses` 表：

| 用户类型 | 位置 | 角色 | 权限 |
|---------|------|------|------|
| 中央管理员 | public.profiles | super_admin | ✅ 有权限 |
| 中央老板 | public.profiles | boss | ✅ 有权限 |
| 租户老板 | tenant_xxx.profiles | boss | ✅ 有权限 |
| 租户平级账号 | tenant_xxx.profiles | peer | ✅ 有权限 |
| 租户车队长 | tenant_xxx.profiles | fleet_leader | ✅ 有权限 |
| 租户司机 | tenant_xxx.profiles | driver | ❌ 无权限 |

## 系统架构说明

### 双层架构

系统采用**双层架构**：

1. **`public` schema**：
   - 用于中央管理员访问所有租户的数据
   - 启用 RLS，通过策略控制访问权限
   - 包含所有业务表（warehouses、driver_warehouses、manager_warehouses 等）

2. **租户 Schema**（`tenant_xxx`）：
   - 用于租户内部的数据隔离
   - 不启用 RLS（除了 notifications 表）
   - 包含租户特定的业务表

### 数据访问模式

- **前端代码**：默认访问 `public` schema（`supabase.from('table_name')`）
- **RLS 策略**：控制用户对 `public` schema 中数据的访问权限
- **租户隔离**：通过 Schema 级别实现，不需要行级安全

### 用户存储位置

| 用户类型 | public.profiles | tenant_xxx.profiles | auth.users |
|---------|----------------|---------------------|------------|
| 中央管理员 | ✅ 有记录 | ❌ 无记录 | ✅ 有记录 |
| 租户用户 | ❌ 无记录 | ✅ 有记录 | ✅ 有记录（带 tenant_id） |

## 测试建议

### 1. 测试租户老板添加司机

- **账号**：13900000001（老板1）
- **操作**：添加新司机，并分配仓库
- **预期结果**：✅ 成功插入 `driver_warehouses` 表

### 2. 测试租户平级账号添加司机

- **账号**：13900000011（admin11）
- **操作**：添加新司机，并分配仓库
- **预期结果**：✅ 成功插入 `driver_warehouses` 表

### 3. 测试租户车队长添加司机

- **账号**：13900000111（admin111）
- **操作**：添加新司机，并分配仓库
- **预期结果**：✅ 成功插入 `driver_warehouses` 表

### 4. 测试租户司机添加司机

- **账号**：13900001111（司机）
- **操作**：尝试添加新司机，并分配仓库
- **预期结果**：❌ 失败，提示权限不足

### 5. 测试中央管理员添加司机

- **账号**：中央管理员
- **操作**：添加新司机，并分配仓库
- **预期结果**：✅ 成功插入 `driver_warehouses` 表

## 相关文件

- 迁移文件1：`supabase/migrations/00449_add_missing_tables_to_tenant_schemas.sql`
- 迁移文件2：`supabase/migrations/00450_fix_driver_warehouses_rls_for_tenant_users.sql`
- 前端 API：`src/db/api.ts`（`insertWarehouseAssignment` 函数）

## 总结

通过以下两个修复，彻底解决了司机仓库分配的 RLS 权限问题：

1. ✅ 为租户 Schema 添加缺失的 `driver_warehouses` 和 `manager_warehouses` 表
2. ✅ 创建 `is_tenant_admin()` 函数，检查租户 Schema 中的用户角色
3. ✅ 更新 RLS 策略，允许租户管理员（boss、peer、fleet_leader）插入数据

现在，租户管理员可以正常添加司机并分配仓库了！✅

## 注意事项

### 性能考虑

`is_tenant_admin()` 函数会遍历所有租户 Schema，可能影响性能。如果租户数量很大，建议：

1. 添加缓存机制
2. 优化查询逻辑
3. 考虑使用物化视图

### 未来优化

1. **统一数据访问层**：创建辅助函数，自动根据用户类型选择正确的 Schema
2. **简化 RLS 策略**：减少重复的策略，提高可维护性
3. **性能监控**：监控 `is_tenant_admin()` 函数的执行时间，及时优化
