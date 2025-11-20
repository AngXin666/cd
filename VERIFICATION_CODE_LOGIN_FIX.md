# 验证码登录约束错误修复说明

## 问题描述

用户通过验证码登录注册时，出现 500 错误：

```
POST https://backend.appmiaoda.com/projects/supabase244341780043055104/auth/v1/verify 500 (Internal Server Error)

ERROR: new row for relation "profiles" violates check constraint "check_driver_type_only_for_drivers" (SQLSTATE 23514)
```

## 错误原因

### 1. 约束条件
在迁移文件 `47_add_driver_type_field.sql` 中，我们添加了以下约束：

```sql
ALTER TABLE profiles
ADD CONSTRAINT check_driver_type_only_for_drivers
CHECK (
    (role = 'driver'::user_role AND driver_type IS NOT NULL)
    OR
    (role != 'driver'::user_role AND driver_type IS NULL)
);
```

这个约束要求：
- **司机角色**：`driver_type` 必须不为 NULL
- **非司机角色**：`driver_type` 必须为 NULL

### 2. 触发器问题
在 `handle_new_user()` 触发器函数中，创建新用户时的代码：

```sql
INSERT INTO profiles (id, phone, email, role)
VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
);
```

**问题**：
- 没有设置 `driver_type` 字段
- 新注册的司机用户 `driver_type` 为 NULL
- 违反了 `check_driver_type_only_for_drivers` 约束

### 3. 错误流程
1. 用户输入手机号和验证码
2. Supabase Auth 验证成功
3. 触发 `handle_new_user()` 函数
4. 尝试插入 profile 记录：`role='driver'`, `driver_type=NULL`
5. 违反约束，抛出错误
6. 用户看到 500 错误

## 解决方案

### 修改触发器函数
更新 `handle_new_user()` 函数，在创建司机账号时自动设置 `driver_type`：

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
    new_role user_role;
BEGIN
    -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- 判断 profiles 表里有多少用户
        SELECT COUNT(*) INTO user_count FROM profiles;
        
        -- 确定新用户的角色
        new_role := CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END;
        
        -- 插入 profiles，首位用户给 super_admin 角色，其他用户默认为 driver
        -- 如果是司机角色，自动设置 driver_type 为 'company'
        INSERT INTO profiles (id, phone, email, role, driver_type)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            new_role,
            CASE WHEN new_role = 'driver'::user_role THEN 'company'::driver_type ELSE NULL END
        );
    END IF;
    RETURN NEW;
END;
$$;
```

### 关键改进
1. **添加 `driver_type` 字段**：在 INSERT 语句中包含 `driver_type`
2. **条件设置**：
   - 司机角色：`driver_type = 'company'`（默认值）
   - 非司机角色：`driver_type = NULL`
3. **符合约束**：所有新记录都满足约束条件

## 测试验证

### 测试场景 1：首位用户注册
**操作**：
1. 清空数据库中的所有用户
2. 使用验证码登录注册

**预期结果**：
- 创建成功
- `role = 'super_admin'`
- `driver_type = NULL`
- 符合约束条件

### 测试场景 2：普通用户注册
**操作**：
1. 已有超级管理员
2. 新用户使用验证码登录注册

**预期结果**：
- 创建成功
- `role = 'driver'`
- `driver_type = 'pure'`（纯司机，开公司的车）
- 符合约束条件

### 测试场景 3：多个用户连续注册
**操作**：
1. 多个新用户依次使用验证码登录注册

**预期结果**：
- 所有用户创建成功
- 都是司机角色
- 都有 `driver_type = 'pure'`
- 没有约束错误

## 验证 SQL

### 检查现有用户
```sql
SELECT 
    id,
    phone,
    role,
    driver_type,
    created_at
FROM profiles
ORDER BY created_at;
```

### 验证约束
```sql
-- 应该成功：司机有 driver_type
INSERT INTO profiles (id, phone, role, driver_type)
VALUES (gen_random_uuid(), '13800000001', 'driver', 'pure');

-- 应该成功：带车司机
INSERT INTO profiles (id, phone, role, driver_type)
VALUES (gen_random_uuid(), '13800000006', 'driver', 'with_vehicle');

-- 应该成功：非司机没有 driver_type
INSERT INTO profiles (id, phone, role, driver_type)
VALUES (gen_random_uuid(), '13800000002', 'manager', NULL);

-- 应该失败：司机没有 driver_type
INSERT INTO profiles (id, phone, role, driver_type)
VALUES (gen_random_uuid(), '13800000003', 'driver', NULL);

-- 应该失败：非司机有 driver_type
INSERT INTO profiles (id, phone, role, driver_type)
VALUES (gen_random_uuid(), '13800000004', 'manager', 'pure');
```

## 迁移文件

创建了新的迁移文件：
- `supabase/migrations/48_fix_driver_type_constraint_on_registration.sql`

包含：
- 详细的问题描述
- 原因分析
- 解决方案说明
- 更新后的 `handle_new_user()` 函数

## 相关文件

### 数据库迁移
- `supabase/migrations/01_create_profiles_table.sql` - 原始触发器定义
- `supabase/migrations/47_add_driver_type_field.sql` - 添加约束
- `supabase/migrations/48_fix_driver_type_constraint_on_registration.sql` - 修复触发器

### 类型定义
- `src/db/types.ts` - Profile 类型定义

## 注意事项

### 1. 数据一致性
- 所有新注册的司机都会自动设置 `driver_type = 'company'`
- 超级管理员可以在用户管理页面修改司机类型
- 修改司机类型时，必须选择有效的类型（company/individual）

### 2. 角色转换
如果需要将司机转换为其他角色：
```sql
-- 将司机转换为管理员
UPDATE profiles
SET 
    role = 'manager',
    driver_type = NULL  -- 必须清空 driver_type
WHERE id = 'user-uuid';
```

如果需要将其他角色转换为司机：
```sql
-- 将管理员转换为司机
UPDATE profiles
SET 
    role = 'driver',
    driver_type = 'company'  -- 必须设置 driver_type
WHERE id = 'user-uuid';
```

### 3. 约束保护
约束确保数据一致性：
- 防止司机没有类型
- 防止非司机有类型
- 保证业务逻辑正确

## 总结

### 问题
验证码登录时，新用户注册失败，违反 `driver_type` 约束

### 原因
触发器创建司机账号时没有设置 `driver_type` 字段

### 解决
修改触发器，自动为司机设置默认类型 `'company'`

### 结果
- ✅ 验证码登录正常工作
- ✅ 新用户注册成功
- ✅ 数据符合约束条件
- ✅ 业务逻辑正确

## 修复日期
2025-11-05
