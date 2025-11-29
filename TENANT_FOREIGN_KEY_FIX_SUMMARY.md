# 租户 Schema 外键约束修复总结

## 修复日期
2025-11-05

## 问题描述
在之前的修复中，我们删除了 public Schema 中所有引用 `profiles` 的外键约束（41个），以支持多租户架构。但是，这导致租户 Schema 中的表也没有外键约束，无法在数据库层面保证数据引用的正确性。

## 用户需求
用户要求：**修复外键约束，保证数据仅在本租户数据范围内生效**

## 解决方案

### 方案设计
1. **public Schema**：不添加外键约束
   - 原因：需要支持跨 Schema 的引用（例如：中央用户和租户用户）
   - 数据完整性保证：应用层验证 + RLS 策略

2. **租户 Schema**：添加外键约束
   - 原因：租户 Schema 中的数据只引用本租户的用户
   - 数据完整性保证：数据库层面的外键约束

### 实施步骤

#### 第一步：创建函数
创建函数 `add_tenant_foreign_keys(tenant_schema text)`，为指定的租户 Schema 添加外键约束。

```sql
CREATE OR REPLACE FUNCTION add_tenant_foreign_keys(tenant_schema text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 为每个表添加外键约束
  -- attendance.user_id → profiles(id)
  -- driver_warehouses.driver_id → profiles(id)
  -- manager_warehouses.manager_id → profiles(id)
  -- leave_requests.user_id → profiles(id)
  -- notifications.sender_id → profiles(id)
  -- piecework_records.user_id → profiles(id)
  -- vehicles.driver_id → profiles(id)
END;
$$;
```

#### 第二步：应用到所有租户 Schema
为所有现有租户 Schema（tenant_test1、tenant_test2）添加外键约束。

```sql
SELECT add_tenant_foreign_keys('tenant_test1');
SELECT add_tenant_foreign_keys('tenant_test2');
```

#### 第三步：添加注释
为所有外键约束添加注释，说明设计决策。

```sql
COMMENT ON CONSTRAINT attendance_user_id_fkey ON tenant_test1.attendance IS 
  '外键约束：user_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';
```

---

## 添加的外键约束

### 每个租户 Schema 添加的约束

1. **attendance.user_id → profiles(id)**
   - 删除策略：ON DELETE CASCADE
   - 说明：考勤记录的用户 ID 引用本租户的用户

2. **driver_warehouses.driver_id → profiles(id)**
   - 删除策略：ON DELETE CASCADE
   - 说明：司机仓库分配的司机 ID 引用本租户的司机

3. **manager_warehouses.manager_id → profiles(id)**
   - 删除策略：ON DELETE CASCADE
   - 说明：管理员仓库分配的管理员 ID 引用本租户的管理员

4. **leave_requests.user_id → profiles(id)**
   - 删除策略：ON DELETE CASCADE
   - 说明：请假申请的用户 ID 引用本租户的用户

5. **notifications.sender_id → profiles(id)**
   - 删除策略：ON DELETE CASCADE
   - 说明：通知的发送者 ID 引用本租户的用户

6. **piecework_records.user_id → profiles(id)**
   - 删除策略：ON DELETE CASCADE
   - 说明：计件工作记录的用户 ID 引用本租户的用户

7. **vehicles.driver_id → profiles(id)**
   - 删除策略：ON DELETE SET NULL
   - 说明：车辆的司机 ID 引用本租户的司机（删除司机时，车辆的司机 ID 设置为 NULL）

---

## 验证结果

### tenant_test1 Schema
✅ 成功添加 8 个外键约束：
- attendance_user_id_fkey
- driver_warehouses_driver_id_fkey
- manager_warehouses_manager_id_fkey
- leave_requests_user_id_fkey
- notifications_sender_id_fkey
- notifications_receiver_id_fkey（已存在）
- piecework_records_user_id_fkey
- vehicles_driver_id_fkey

### tenant_test2 Schema
✅ 成功添加 8 个外键约束：
- attendance_user_id_fkey
- driver_warehouses_driver_id_fkey
- manager_warehouses_manager_id_fkey
- leave_requests_user_id_fkey
- notifications_sender_id_fkey
- notifications_receiver_id_fkey（已存在）
- piecework_records_user_id_fkey
- vehicles_driver_id_fkey

### 验证查询
```sql
-- 查询租户 Schema 中的所有外键约束
SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE con.contype = 'f'
  AND n.nspname LIKE 'tenant_%'
ORDER BY n.nspname, c.relname, con.conname;
```

---

## 优点

### 1. 数据完整性保证
- **数据库层面保证**：外键约束确保数据引用的正确性
- **防止数据错误**：防止引用不存在的用户 ID
- **自动级联删除**：删除用户时，相关数据自动删除或设置为 NULL

### 2. 租户数据隔离
- **确保数据仅在本租户范围内引用**：外键约束只引用本租户 Schema 中的 profiles
- **防止跨租户引用**：无法引用其他租户的用户 ID
- **提高数据安全性**：租户数据完全隔离

### 3. 性能优化
- **数据库可以利用外键索引优化查询**：外键约束会自动创建索引
- **提高查询性能**：JOIN 操作可以利用索引
- **减少应用层验证**：数据库层面保证数据完整性，减少应用层验证逻辑

### 4. 维护性
- **清晰的数据关系**：外键约束明确表示数据之间的关系
- **易于理解**：开发人员可以通过外键约束了解数据结构
- **自动化维护**：数据库自动维护数据完整性

---

## 与 public Schema 的对比

### public Schema
- **不添加外键约束**
- **原因**：需要支持跨 Schema 的引用
- **数据完整性保证**：
  1. 应用层验证：前端代码验证用户存在
  2. 认证系统保证：所有用户都在 `auth.users` 表中
  3. RLS 策略保护：所有表都启用了 RLS
  4. 业务逻辑保证：所有操作都需要认证

### 租户 Schema
- **添加外键约束**
- **原因**：租户 Schema 中的数据只引用本租户的用户
- **数据完整性保证**：
  1. 数据库层面保证：外键约束确保数据引用的正确性
  2. 租户数据隔离：确保数据仅在本租户范围内引用
  3. 防止数据错误：防止引用不存在的用户 ID
  4. 性能优化：数据库可以利用外键索引优化查询

---

## 未来扩展

### 新租户 Schema 的处理
当创建新的租户 Schema 时，需要调用 `add_tenant_foreign_keys()` 函数为新租户添加外键约束。

```sql
-- 创建新租户 Schema
CREATE SCHEMA tenant_new;

-- 创建表（复制 public Schema 的表结构）
-- ...

-- 添加外键约束
SELECT add_tenant_foreign_keys('tenant_new');
```

### 新表的处理
如果在租户 Schema 中添加新表，需要更新 `add_tenant_foreign_keys()` 函数，为新表添加外键约束。

---

## 相关文件

### 迁移文件
- `supabase/migrations/00456_add_tenant_schema_foreign_key_constraints.sql`

### 文档
- `MULTI_TENANT_AUDIT_SUMMARY.md` - 多租户架构全面审计总结报告
- `FOREIGN_KEY_AUDIT.md` - 外键约束审计报告
- `MULTI_TENANT_CODE_AUDIT.md` - 代码审计报告

---

## 总结

通过为租户 Schema 添加外键约束，我们实现了：
1. ✅ 数据库层面保证数据引用的正确性
2. ✅ 租户数据隔离：确保数据仅在本租户范围内引用
3. ✅ 防止数据错误：防止引用不存在的用户 ID
4. ✅ 性能优化：数据库可以利用外键索引优化查询

同时，我们保持了 public Schema 的灵活性，支持跨 Schema 的引用，满足多租户架构的需求。

**这是一个更好的方案，既保证了数据完整性，又保持了系统的灵活性！** 🎉
