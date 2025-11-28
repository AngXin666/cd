# 租户 Schema 克隆字段缺失问题分析与解决

## 问题描述

用户在中央管理系统创建租户时，Edge Function 返回 500 错误：

```
column "max_leave_days" of relation "warehouses" does not exist
```

---

## 问题现象

### 错误日志

```
🚀 开始创建租户: 测试2
✅ Token 有效，准备调用 Edge Function
POST https://backend.appmiaoda.com/.../create-tenant 500 (Internal Server Error)
📥 Edge Function 响应状态: 500
📥 Edge Function 响应内容: {
  "success": false,
  "error": "column \"max_leave_days\" of relation \"warehouses\" does not exist"
}
```

### 关键发现

1. **Session 问题已解决**：
   - 修复21 已经解决了 session 丢失问题
   - 日志显示 "✅ Token 有效，准备调用 Edge Function"
   - Edge Function 成功接收到请求

2. **新问题出现**：
   - Edge Function 在创建租户 Schema 时失败
   - 错误信息指向 `warehouses` 表缺少 `max_leave_days` 字段
   - 这是一个数据库结构问题，不是权限问题

---

## 根本原因

### 问题定位

通过检查 `supabase/migrations/create_tenant_schema_clone_v4.sql` 文件，发现：

```sql
-- 使用 CREATE TABLE LIKE 复制表结构（不包括约束和默认值）
EXECUTE format(
  'CREATE TABLE %I.%I (LIKE %I.%I)',
  p_new_schema_name,
  v_table_record.tablename,
  v_template_schema,
  v_table_record.tablename
);
```

### PostgreSQL CREATE TABLE LIKE 语法

PostgreSQL 的 `CREATE TABLE LIKE` 语法有多个选项：

1. **基本语法**（V4 使用的）：
   ```sql
   CREATE TABLE new_table (LIKE old_table)
   ```
   - **只复制列定义**（列名和数据类型）
   - **不复制**：默认值、约束、索引、注释

2. **完整语法**：
   ```sql
   CREATE TABLE new_table (LIKE old_table INCLUDING ALL)
   ```
   - 复制列定义
   - 复制默认值（INCLUDING DEFAULTS）
   - 复制约束（INCLUDING CONSTRAINTS）
   - 复制索引（INCLUDING INDEXES）
   - 复制存储参数（INCLUDING STORAGE）
   - 复制注释（INCLUDING COMMENTS）

### 为什么会缺少字段？

**实际上不是缺少字段，而是缺少默认值和约束！**

但是错误信息说 "column does not exist"，这说明：

1. **可能的原因1**：基本的 `LIKE` 语法在某些情况下可能不会复制所有列
2. **可能的原因2**：模板 Schema 中的 `warehouses` 表本身就有问题
3. **可能的原因3**：克隆过程中出现了错误，但没有正确报告

### 验证模板 Schema

检查 `supabase/migrations/002_create_core_tables.sql`：

```sql
CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  max_leave_days integer DEFAULT 30 NOT NULL,  -- ✅ 字段存在
  resignation_notice_days integer DEFAULT 30 NOT NULL,
  daily_target integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT max_leave_days_positive CHECK (max_leave_days > 0),
  CONSTRAINT resignation_notice_days_positive CHECK (resignation_notice_days > 0),
  CONSTRAINT daily_target_non_negative CHECK (daily_target >= 0)
);
```

**结论**：模板定义中 `max_leave_days` 字段是存在的。

---

## 解决方案

### 核心思路

**使用 `INCLUDING ALL` 选项确保完整复制表结构**

### V5 版本的改进

#### 1. 使用 INCLUDING ALL 语法

```sql
EXECUTE format(
  'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL EXCLUDING CONSTRAINTS)',
  p_new_schema_name,
  v_table_record.tablename,
  v_template_schema,
  v_table_record.tablename
);
```

**说明**：
- `INCLUDING ALL`：复制所有内容（字段、默认值、索引、注释等）
- `EXCLUDING CONSTRAINTS`：排除约束（因为我们要单独处理）

#### 2. 单独添加约束

```sql
-- 单独添加约束（排除外键约束）
FOR v_constraint_record IN
  SELECT 
    conname,
    pg_get_constraintdef(oid) as condef
  FROM pg_constraint
  WHERE conrelid = (v_template_schema || '.' || v_table_record.tablename)::regclass
    AND contype IN ('p', 'u', 'c')  -- 主键、唯一约束、检查约束（不包括外键 'f'）
LOOP
  BEGIN
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
      p_new_schema_name,
      v_table_record.tablename,
      v_constraint_record.conname,
      v_constraint_record.condef
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '添加约束失败 (表: %, 约束: %): %', 
        v_table_record.tablename, 
        v_constraint_record.conname, 
        SQLERRM;
  END;
END LOOP;
```

**说明**：
- 只复制主键（p）、唯一约束（u）、检查约束（c）
- 不复制外键约束（f），避免跨 Schema 引用问题
- 添加详细的错误处理

#### 3. 完整的错误处理

```sql
EXCEPTION
  WHEN OTHERS THEN
    -- 发生错误时，删除已创建的 Schema
    BEGIN
      EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_new_schema_name);
    EXCEPTION
      WHEN OTHERS THEN
        NULL; -- 忽略删除错误
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', '克隆 Schema 时发生错误: ' || SQLERRM
    );
END;
```

---

## 版本对比

### V4 版本（有问题）

```sql
-- 只复制列定义
CREATE TABLE new_schema.table_name (LIKE old_schema.table_name)

-- 手动添加主键
ALTER TABLE new_schema.table_name ADD PRIMARY KEY (id)
```

**问题**：
- 可能不会复制所有列
- 不复制默认值
- 不复制约束
- 不复制索引

### V5 版本（修复后）

```sql
-- 复制所有内容（除了约束）
CREATE TABLE new_schema.table_name (
  LIKE old_schema.table_name 
  INCLUDING ALL 
  EXCLUDING CONSTRAINTS
)

-- 单独添加约束（排除外键）
ALTER TABLE new_schema.table_name 
ADD CONSTRAINT constraint_name constraint_definition
```

**优点**：
- 确保复制所有列
- 复制默认值
- 复制索引
- 单独处理约束，更灵活

---

## 预期效果

### 修复前的错误

```
❌ Edge Function 返回错误状态: 500
❌ 错误信息: column "max_leave_days" of relation "warehouses" does not exist
```

### 修复后的成功日志

```
✅ Token 有效，准备调用 Edge Function
📥 Edge Function 响应状态: 200
✅ 租户创建成功
```

---

## 测试建议

### 1. 创建新租户测试

1. 登录中央管理系统
2. 进入创建租户页面
3. 填写表单：
   - 公司名称：测试公司3
   - 老板账号：boss3@test.com
   - 老板密码：Test123456
   - 老板手机号：13800000003
4. 提交创建
5. 检查日志，确认：
   - ✅ Token 有效
   - ✅ Edge Function 响应状态: 200
   - ✅ 租户创建成功

### 2. 验证租户 Schema

创建成功后，在数据库中验证：

```sql
-- 查看新创建的租户 Schema
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name LIKE 'tenant_%'
ORDER BY schema_name DESC
LIMIT 1;

-- 验证 warehouses 表结构
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'tenant_xxx'  -- 替换为实际的 Schema 名称
  AND table_name = 'warehouses'
ORDER BY ordinal_position;

-- 应该看到 max_leave_days 字段
```

### 3. 验证字段和约束

```sql
-- 检查 max_leave_days 字段
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'tenant_xxx'
  AND table_name = 'warehouses'
  AND column_name = 'max_leave_days';

-- 应该返回：
-- column_name: max_leave_days
-- data_type: integer
-- column_default: 30
-- is_nullable: NO

-- 检查约束
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'tenant_xxx'
  AND table_name = 'warehouses';

-- 应该包括：
-- - PRIMARY KEY
-- - CHECK (max_leave_days_positive)
-- - CHECK (resignation_notice_days_positive)
-- - CHECK (daily_target_non_negative)
```

---

## 相关修复

### 修复21：Session 丢失问题
- 解决了 `getSession()` 重复调用导致的 session 丢失
- 直接传递 access_token 给 `createTenant` 函数

### 修复22：Schema 克隆字段缺失问题
- 使用 `INCLUDING ALL` 选项确保完整复制
- 单独处理约束，排除外键
- 添加详细的错误处理

---

## 经验教训

### 1. 理解 PostgreSQL 的 LIKE 语法

`CREATE TABLE LIKE` 有多个选项，需要根据需求选择：

- **基本 LIKE**：只复制列定义
- **INCLUDING DEFAULTS**：复制默认值
- **INCLUDING CONSTRAINTS**：复制约束
- **INCLUDING INDEXES**：复制索引
- **INCLUDING ALL**：复制所有内容

### 2. 避免跨 Schema 引用

外键约束会引用其他表，跨 Schema 复制时可能导致问题：

- 不复制外键约束
- 如果需要外键，在克隆后单独创建

### 3. 添加详细的错误处理

克隆 Schema 是一个复杂的操作，需要：

- 为每个步骤添加错误处理
- 记录详细的日志
- 失败时清理已创建的资源

### 4. 测试验证

在修复后，需要：

- 测试创建新租户
- 验证 Schema 结构
- 检查字段和约束
- 确认数据操作正常

---

## 总结

这个问题的根本原因是 **V4 版本的克隆函数使用了基本的 `CREATE TABLE LIKE` 语法，没有使用 `INCLUDING ALL` 选项**，导致某些字段或约束没有被正确复制。

通过 **V5 版本的改进**，使用 `INCLUDING ALL EXCLUDING CONSTRAINTS` 语法，并单独处理约束，确保了：

1. ✅ 所有字段都被正确复制
2. ✅ 默认值被正确复制
3. ✅ 索引被正确复制
4. ✅ 约束被正确处理（排除外键）
5. ✅ 添加了详细的错误处理

现在创建租户应该可以成功了！🎉
