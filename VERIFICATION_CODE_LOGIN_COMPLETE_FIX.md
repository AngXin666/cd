# 验证码登录功能完整修复总结

## 修复日期
2025-11-05

## 问题概述
验证码登录功能在新用户注册时连续出现三个数据库错误，导致用户无法正常注册和登录。

## 修复过程

### 问题 1：driver_type 约束错误
**错误信息**：
```
ERROR: new row for relation "profiles" violates check constraint "check_driver_type_only_for_drivers"
```

**原因**：
- 触发器创建司机账号时没有设置 `driver_type` 字段
- 数据库约束要求：司机角色必须有 `driver_type`，非司机角色必须为 NULL

**解决方案**：
- 修改 `handle_new_user()` 触发器函数
- 为司机角色自动设置 `driver_type`
- 为非司机角色保持 `driver_type = NULL`

**迁移文件**：
- `supabase/migrations/48_fix_driver_type_constraint_on_registration.sql`

---

### 问题 2：driver_type 枚举值错误
**错误信息**：
```
ERROR: invalid input value for enum driver_type: "company" (SQLSTATE 22P02)
```

**原因**：
- 触发器使用了错误的枚举值 `'company'`
- 实际的枚举类型定义：`driver_type_enum ('pure', 'with_vehicle')`
- 应该使用 `'pure'` 而不是 `'company'`

**枚举值说明**：
- `'pure'`：纯司机（开公司的车）- 新注册用户的默认类型
- `'with_vehicle'`：带车司机（开自己的车）- 需要管理员手动设置

**解决方案**：
- 修改触发器，将 `'company'` 改为 `'pure'`
- 使用正确的枚举类型 `driver_type_enum`

**迁移文件**：
- `supabase/migrations/49_fix_driver_type_enum_value_in_trigger.sql`

---

### 问题 3：重复手机号错误
**错误信息**：
```
ERROR: duplicate key value violates unique constraint "profiles_phone_key" (SQLSTATE 23505)
```

**原因**：
- 触发器在用户确认时尝试插入 profiles 记录
- 没有检查用户是否已经在 profiles 表中
- 当用户重复登录或触发器多次执行时，导致重复插入

**可能场景**：
- 用户重复登录
- 触发器多次执行
- 用户已存在但触发器仍尝试插入

**解决方案**：
- 在插入之前检查用户是否已存在
- 使用 `SELECT EXISTS` 查询检查 profiles 表
- 如果用户已存在，跳过插入
- 如果不存在，才执行插入

**迁移文件**：
- `supabase/migrations/50_fix_duplicate_phone_in_trigger.sql`

---

## 最终触发器实现

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
    new_role user_role;
    profile_exists boolean;
BEGIN
    -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- 检查该用户是否已经在 profiles 表中
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
        
        -- 如果用户已存在，跳过插入
        IF profile_exists THEN
            RETURN NEW;
        END IF;
        
        -- 判断 profiles 表里有多少用户
        SELECT COUNT(*) INTO user_count FROM profiles;
        
        -- 确定新用户的角色
        new_role := CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END;
        
        -- 插入 profiles，首位用户给 super_admin 角色，其他用户默认为 driver
        -- 如果是司机角色，自动设置 driver_type 为 'pure'（纯司机，开公司的车）
        INSERT INTO profiles (id, phone, email, role, driver_type)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            new_role,
            CASE WHEN new_role = 'driver'::user_role THEN 'pure'::driver_type_enum ELSE NULL END
        );
    END IF;
    RETURN NEW;
END;
$$;
```

## 功能特性

### 1. 自动角色分配
- **首位用户**：自动设置为 `super_admin`，`driver_type = NULL`
- **后续用户**：自动设置为 `driver`，`driver_type = 'pure'`

### 2. 司机类型管理
- **纯司机（pure）**：
  - 没有自己的车辆
  - 使用公司分配的车辆
  - 新注册用户的默认类型
  
- **带车司机（with_vehicle）**：
  - 有自己的车辆
  - 使用自己的车辆工作
  - 需要管理员手动设置

### 3. 数据一致性保护
- 防止重复插入用户记录
- 确保司机必须有类型
- 确保非司机不能有类型
- 自动处理用户重复登录

## 测试场景

### 场景 1：首位用户注册
**操作**：使用验证码登录注册第一个用户

**预期结果**：
- ✅ 创建成功
- ✅ `role = 'super_admin'`
- ✅ `driver_type = NULL`
- ✅ 符合约束条件

### 场景 2：普通用户注册
**操作**：已有超级管理员，新用户使用验证码登录注册

**预期结果**：
- ✅ 创建成功
- ✅ `role = 'driver'`
- ✅ `driver_type = 'pure'`
- ✅ 符合约束条件

### 场景 3：用户重复登录
**操作**：已注册用户再次使用验证码登录

**预期结果**：
- ✅ 登录成功
- ✅ 不会创建重复记录
- ✅ 不会报错
- ✅ 数据保持一致

### 场景 4：批量注册
**操作**：多个新用户依次使用验证码登录注册

**预期结果**：
- ✅ 所有用户创建成功
- ✅ 都是司机角色
- ✅ 都有 `driver_type = 'pure'`
- ✅ 没有约束错误

## 验证 SQL

### 检查现有用户
```sql
SELECT 
    id,
    phone,
    email,
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

## 相关文件

### 数据库迁移
- `supabase/migrations/48_fix_driver_type_constraint_on_registration.sql`
- `supabase/migrations/49_fix_driver_type_enum_value_in_trigger.sql`
- `supabase/migrations/50_fix_duplicate_phone_in_trigger.sql`

### 类型定义
- `src/db/types.ts` - Profile 类型定义

### 文档
- `VERIFICATION_CODE_LOGIN_FIX.md` - 详细修复文档
- `QUICK_TEST_VERIFICATION_CODE_LOGIN.md` - 快速测试指南

## 注意事项

### 1. 角色转换
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
    driver_type = 'pure'  -- 必须设置 driver_type，默认为纯司机
WHERE id = 'user-uuid';
```

### 2. 司机类型修改
超级管理员可以在用户管理页面修改司机类型：
```sql
-- 将纯司机改为带车司机
UPDATE profiles
SET driver_type = 'with_vehicle'
WHERE id = 'user-uuid' AND role = 'driver';

-- 将带车司机改为纯司机
UPDATE profiles
SET driver_type = 'pure'
WHERE id = 'user-uuid' AND role = 'driver';
```

### 3. 约束保护
约束确保数据一致性：
- ✅ 防止司机没有类型
- ✅ 防止非司机有类型
- ✅ 防止重复手机号
- ✅ 防止重复用户记录

## 修复总结

### 问题根源
触发器函数在处理新用户注册时存在三个问题：
1. 没有为司机设置必需的 `driver_type` 字段
2. 使用了错误的枚举值
3. 没有检查用户是否已存在

### 解决方案
通过三次迭代修复：
1. 添加 `driver_type` 字段处理逻辑
2. 修正枚举值为正确的 `'pure'`
3. 添加重复检查机制

### 最终效果
- ✅ 验证码登录正常工作
- ✅ 新用户注册成功
- ✅ 用户重复登录不报错
- ✅ 数据符合约束条件
- ✅ 业务逻辑正确
- ✅ 使用正确的枚举值
- ✅ 防止重复插入

## 后续建议

### 1. 监控和日志
- 监控触发器执行情况
- 记录用户注册和登录日志
- 定期检查数据一致性

### 2. 测试覆盖
- 添加自动化测试
- 测试各种边界情况
- 验证约束条件

### 3. 文档维护
- 保持文档更新
- 记录所有数据库变更
- 维护测试指南

## 相关链接
- [验证码登录详细修复文档](./VERIFICATION_CODE_LOGIN_FIX.md)
- [快速测试指南](./QUICK_TEST_VERIFICATION_CODE_LOGIN.md)
- [司机类型功能说明](./DRIVER_TYPE_FEATURE.md)
