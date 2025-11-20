# 验证码登录问题完整修复总结

## 修复日期
2025-11-05

## 问题概述
用户使用验证码登录时，连续出现四个数据库错误，导致无法正常登录。这些错误都与用户注册触发器和数据库约束有关。

---

## 修复历程

### 错误 1：driver_type 约束错误

**错误信息**：
```
ERROR: new row for relation "profiles" violates check constraint "check_driver_type_only_for_drivers"
```

**问题**：
- 触发器创建司机账号时没有设置 `driver_type` 字段
- 数据库约束要求：司机必须有 `driver_type`，非司机必须为 NULL

**解决方案**：
- 修改触发器，为司机自动设置 `driver_type`
- 为非司机保持 `driver_type = NULL`

**迁移文件**：
- `48_fix_driver_type_constraint_on_registration.sql`

---

### 错误 2：driver_type 枚举值错误

**错误信息**：
```
ERROR: invalid input value for enum driver_type: "company" (SQLSTATE 22P02)
```

**问题**：
- 触发器使用了错误的枚举值 `'company'`
- 实际枚举类型：`driver_type_enum ('pure', 'with_vehicle')`

**解决方案**：
- 将触发器中的 `'company'` 改为 `'pure'`
- 使用正确的枚举类型 `driver_type_enum`

**迁移文件**：
- `49_fix_driver_type_enum_value_in_trigger.sql`

---

### 错误 3：重复手机号错误（第一次）

**错误信息**：
```
ERROR: duplicate key value violates unique constraint "profiles_phone_key" (SQLSTATE 23505)
```

**问题**：
- 触发器没有检查用户是否已存在
- 重复登录时尝试插入重复记录

**解决方案**：
- 添加 EXISTS 检查
- 如果用户已存在，跳过插入

**迁移文件**：
- `50_fix_duplicate_phone_in_trigger.sql`

---

### 错误 4：重复手机号错误（第二次）

**错误信息**：
```
ERROR: duplicate key value violates unique constraint "profiles_phone_key" (SQLSTATE 23505)
```

**问题**：
- auth.users 和 profiles 表的 ID 不一致
- 触发器只检查 ID，不检查手机号
- 当 ID 不匹配时，仍然尝试插入重复的手机号

**场景**：
- profiles 表：ID=xxx, phone=15766121960
- auth.users 表：ID=yyy, phone=15766121960
- 触发器检查 ID，发现不存在
- 尝试插入，但手机号已存在

**解决方案**：
- 使用 `INSERT ... ON CONFLICT (phone) DO UPDATE`
- 如果手机号已存在，更新 ID 而不是插入
- 自动同步 auth.users 和 profiles 的 ID

**迁移文件**：
- `51_fix_trigger_check_phone_instead_of_id.sql`

---

### 错误 5：外键约束错误

**错误信息**：
```
ERROR: update or delete on table "profiles" violates foreign key constraint 
"piece_work_records_user_id_fkey" on table "piece_work_records" (SQLSTATE 23503)
```

**问题**：
- 所有引用 profiles.id 的外键约束的 `update_rule` 都是 `NO ACTION`
- 当触发器更新 profiles.id 时，相关表的外键不会自动更新
- 导致外键约束违反

**场景**：
- profiles 表：ID=xxx, phone=15766121960
- piece_work_records 表：4条记录，user_id=xxx
- auth.users 表：ID=yyy, phone=15766121960
- 触发器尝试将 profiles.id 从 xxx 更新为 yyy
- piece_work_records.user_id 仍然是 xxx
- 违反外键约束

**解决方案**：
- 修改所有引用 profiles.id 的外键约束
- 添加 `ON UPDATE CASCADE`
- 当 profiles.id 更新时，所有相关表的外键自动更新

**受影响的表（17个外键约束）**：
1. attendance_records.user_id
2. driver_licenses.driver_id
3. driver_warehouses.driver_id
4. feedback.user_id
5. leave_applications.user_id
6. leave_applications.reviewer_id
7. manager_permissions.manager_id
8. manager_warehouses.manager_id
9. notifications.user_id
10. notifications.related_user_id
11. piece_work_records.user_id
12. resignation_applications.user_id
13. resignation_applications.reviewer_id
14. vehicle_records.driver_id
15. vehicle_records.reviewed_by
16. vehicles_deprecated.user_id
17. vehicles_deprecated.reviewed_by

**迁移文件**：
- `52_fix_all_foreign_keys_cascade_on_update.sql`

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
BEGIN
    -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- 判断 profiles 表里有多少用户
        SELECT COUNT(*) INTO user_count FROM profiles;
        
        -- 确定新用户的角色
        new_role := CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END;
        
        -- 插入 profiles，如果手机号已存在则更新 ID
        -- 这样可以处理 auth.users 和 profiles ID 不一致的情况
        INSERT INTO profiles (id, phone, email, role, driver_type)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            new_role,
            CASE WHEN new_role = 'driver'::user_role THEN 'pure'::driver_type_enum ELSE NULL END
        )
        ON CONFLICT (phone) DO UPDATE
        SET 
            id = EXCLUDED.id,
            email = COALESCE(EXCLUDED.email, profiles.email),
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$;
```

---

## 修复效果

### 1. 新用户注册
- ✅ 首位用户自动成为超级管理员
- ✅ 后续用户自动成为纯司机（driver_type='pure'）
- ✅ 正确设置所有必需字段
- ✅ 符合所有约束条件

### 2. 已存在用户登录
- ✅ 不会创建重复记录
- ✅ 自动同步 auth.users 和 profiles 的 ID
- ✅ 更新所有相关表的外键
- ✅ 不会报错

### 3. ID 不匹配情况
- ✅ 自动检测并修复
- ✅ 使用 ON CONFLICT 更新 ID
- ✅ 级联更新所有相关表
- ✅ 保持数据一致性

### 4. 数据完整性
- ✅ 防止重复手机号
- ✅ 防止重复用户记录
- ✅ 确保司机有类型
- ✅ 确保非司机没有类型
- ✅ 保持外键关系完整

---

## 测试验证

### 测试场景 1：新用户注册
```
操作：使用验证码登录注册新用户
手机号：13800000001
预期结果：
- ✅ 创建成功
- ✅ role = 'driver'
- ✅ driver_type = 'pure'
- ✅ 所有约束满足
```

### 测试场景 2：已存在用户登录
```
操作：已注册用户使用验证码登录
手机号：15766121960
预期结果：
- ✅ 登录成功
- ✅ 不会创建重复记录
- ✅ ID 自动同步
- ✅ 无错误
```

### 测试场景 3：ID 不匹配修复
```
初始状态：
- profiles: ID=xxx, phone=15766121960
- auth.users: ID=yyy, phone=15766121960
- piece_work_records: 4条记录，user_id=xxx

操作：用户登录

预期结果：
- ✅ profiles.id 从 xxx 更新为 yyy
- ✅ piece_work_records.user_id 自动更新为 yyy
- ✅ 所有相关表的外键自动更新
- ✅ 登录成功
```

---

## 验证 SQL

### 检查用户数据
```sql
-- 查看所有用户
SELECT 
    id,
    phone,
    email,
    role,
    driver_type,
    created_at
FROM profiles
ORDER BY created_at DESC;

-- 检查 ID 一致性
SELECT 
    a.id AS auth_id,
    p.id AS profile_id,
    a.phone,
    CASE WHEN a.id = p.id THEN 'MATCH' ELSE 'MISMATCH' END AS id_status
FROM auth.users a
LEFT JOIN profiles p ON a.phone = p.phone
WHERE a.confirmed_at IS NOT NULL;
```

### 检查外键约束
```sql
-- 查看所有外键约束的更新规则
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE ccu.table_name = 'profiles'
    AND ccu.column_name = 'id'
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### 检查计件记录
```sql
-- 查看用户的计件记录
SELECT 
    p.id AS profile_id,
    p.phone,
    pw.id AS piece_work_id,
    pw.user_id,
    CASE WHEN p.id = pw.user_id THEN 'MATCH' ELSE 'MISMATCH' END AS id_status
FROM profiles p
LEFT JOIN piece_work_records pw ON p.id = pw.user_id
WHERE p.phone = '15766121960';
```

---

## 相关文件

### 数据库迁移
1. `supabase/migrations/48_fix_driver_type_constraint_on_registration.sql`
   - 修复 driver_type 约束错误

2. `supabase/migrations/49_fix_driver_type_enum_value_in_trigger.sql`
   - 修复枚举值错误

3. `supabase/migrations/50_fix_duplicate_phone_in_trigger.sql`
   - 添加重复检查

4. `supabase/migrations/51_fix_trigger_check_phone_instead_of_id.sql`
   - 使用 ON CONFLICT 处理手机号冲突

5. `supabase/migrations/52_fix_all_foreign_keys_cascade_on_update.sql`
   - 添加外键级联更新

### 文档
- `VERIFICATION_CODE_LOGIN_COMPLETE_FIX.md` - 详细修复文档
- `PHONE_CONFLICT_FINAL_FIX.md` - 手机号冲突修复文档
- `QUICK_TEST_VERIFICATION_CODE_LOGIN.md` - 快速测试指南

---

## 技术要点

### 1. ON CONFLICT 的使用
```sql
INSERT INTO profiles (id, phone, email, role, driver_type)
VALUES (...)
ON CONFLICT (phone) DO UPDATE
SET 
    id = EXCLUDED.id,
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now();
```

**优点**：
- 原子操作，避免竞态条件
- 自动处理冲突
- 比 EXISTS 检查更高效

### 2. ON UPDATE CASCADE 的使用
```sql
ALTER TABLE piece_work_records
ADD CONSTRAINT piece_work_records_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;
```

**优点**：
- 自动维护数据一致性
- 减少手动更新的需要
- 防止外键约束违反

### 3. 枚举类型的使用
```sql
CREATE TYPE driver_type_enum AS ENUM ('pure', 'with_vehicle');

-- 使用时必须显式转换
'pure'::driver_type_enum
```

**注意事项**：
- 必须使用正确的枚举值
- 必须显式类型转换
- 不能使用不存在的值

---

## 注意事项

### 1. 数据一致性
- 定期检查 auth.users 和 profiles 的 ID 一致性
- 监控触发器执行情况
- 记录 ID 同步事件

### 2. 性能考虑
- ON CONFLICT 比 EXISTS 检查更高效
- CASCADE 更新可能影响多个表
- 大量数据时需要注意性能

### 3. 回滚方案
如果需要回滚：
```sql
-- 恢复之前的触发器
-- 参考之前的迁移文件

-- 恢复外键约束
ALTER TABLE piece_work_records
DROP CONSTRAINT piece_work_records_user_id_fkey;

ALTER TABLE piece_work_records
ADD CONSTRAINT piece_work_records_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE NO ACTION;
```

---

## 总结

### 问题根源
1. 触发器逻辑不完善
2. 没有处理 ID 不匹配的情况
3. 外键约束没有级联更新
4. 枚举值使用错误

### 解决方案
1. 完善触发器逻辑
2. 使用 ON CONFLICT 处理冲突
3. 添加 ON UPDATE CASCADE
4. 修正枚举值

### 最终效果
- ✅ 验证码登录正常工作
- ✅ 新用户可以正常注册
- ✅ 已存在用户可以正常登录
- ✅ ID 自动同步
- ✅ 数据保持一致
- ✅ 无约束错误

### 后续建议
1. 定期监控数据一致性
2. 添加自动化测试
3. 记录所有数据库变更
4. 维护详细文档

---

## 相关链接
- [验证码登录完整修复总结](./VERIFICATION_CODE_LOGIN_COMPLETE_FIX.md)
- [手机号冲突修复文档](./PHONE_CONFLICT_FINAL_FIX.md)
- [司机类型功能说明](./DRIVER_TYPE_FEATURE.md)
- [快速测试指南](./QUICK_TEST_VERIFICATION_CODE_LOGIN.md)
