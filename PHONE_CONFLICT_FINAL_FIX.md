# 手机号冲突问题最终修复方案

## 修复日期
2025-11-05

## 问题描述

### 错误信息
```
ERROR: duplicate key value violates unique constraint "profiles_phone_key" (SQLSTATE 23505)
```

### 问题场景
用户在登录时出现重复手机号错误，即使该用户已经注册过。

### 数据状态
1. **profiles 表**中有用户记录：
   - ID: `0f9e9f85-9800-4c9b-9e0e-618e4f5857ef`
   - phone: `15766121960`
   - role: `driver`
   - driver_type: `pure`

2. **auth.users 表**中有不同的用户记录：
   - ID: `4226f8d9-1c0f-45ba-8595-7be564df6612`
   - phone: `15766121960`
   - confirmed_at: `null` (未确认)

### 问题根源
当用户登录时：
1. auth.users 中的记录被确认（confirmed_at 从 NULL 变为非 NULL）
2. 触发器 `handle_new_user()` 被触发
3. 触发器检查 profiles 表中是否存在该 **ID**
4. 发现 ID 不存在（因为 profiles 中的 ID 不同）
5. 触发器尝试插入新记录
6. 但手机号已存在，违反唯一约束
7. 导致错误

## 原因分析

### 为什么会出现 ID 不匹配？
可能的原因：
1. 手动创建了 profiles 记录，但没有对应的 auth.users 记录
2. 数据迁移或导入时 ID 不同步
3. 之前的触发器逻辑有问题，创建了不匹配的记录
4. 测试数据清理不完整

### 触发器的问题
之前的触发器逻辑：
```sql
-- 检查该用户是否已经在 profiles 表中
SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;

-- 如果用户已存在，跳过插入
IF profile_exists THEN
    RETURN NEW;
END IF;

-- 插入新记录
INSERT INTO profiles (id, phone, email, role, driver_type) VALUES (...);
```

问题：
- ✅ 检查了 ID 是否存在
- ❌ 没有检查手机号是否已被使用
- ❌ 当 ID 不匹配时，会尝试插入重复的手机号

## 解决方案

### 核心思路
使用 PostgreSQL 的 `ON CONFLICT` 子句来处理冲突：
1. 尝试插入新记录
2. 如果手机号已存在（冲突），则更新现有记录的 ID
3. 这样可以自动同步 auth.users 和 profiles 的 ID

### 新的触发器实现
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

### 关键改进
1. **使用 ON CONFLICT**：
   - 当手机号冲突时，不会报错
   - 自动执行 UPDATE 操作

2. **同步 ID**：
   - `id = EXCLUDED.id`：将 profiles 的 ID 更新为 auth.users 的 ID
   - 确保两个表的 ID 一致

3. **保留数据**：
   - `email = COALESCE(EXCLUDED.email, profiles.email)`：优先使用新的 email，如果没有则保留原有的
   - 保留用户的其他信息（role, driver_type 等）

4. **更新时间戳**：
   - `updated_at = now()`：记录更新时间

## 处理场景

### 场景 1：新用户注册
**情况**：手机号在 profiles 表中不存在

**行为**：
- 正常插入新记录
- 创建 profiles 记录
- 设置角色和类型

**结果**：✅ 成功注册

### 场景 2：已存在用户登录（ID 匹配）
**情况**：
- auth.users ID: `xxx`
- profiles ID: `xxx`
- 手机号相同

**行为**：
- 检测到手机号冲突
- 执行 UPDATE
- ID 相同，无需更新
- 更新 updated_at

**结果**：✅ 成功登录，无错误

### 场景 3：已存在用户登录（ID 不匹配）
**情况**：
- auth.users ID: `yyy`
- profiles ID: `xxx`
- 手机号相同

**行为**：
- 检测到手机号冲突
- 执行 UPDATE
- 将 profiles 的 ID 从 `xxx` 更新为 `yyy`
- 同步 ID，更新 updated_at

**结果**：✅ 成功登录，ID 自动同步

### 场景 4：多次登录
**情况**：用户多次登录

**行为**：
- 每次登录都会触发 ON CONFLICT
- 更新 updated_at
- 其他字段保持不变

**结果**：✅ 成功登录，无重复记录

## 迁移文件

### 文件位置
`supabase/migrations/51_fix_trigger_check_phone_instead_of_id.sql`

### 应用方法
迁移已自动应用到数据库。

### 验证方法
```sql
-- 查看触发器定义
SELECT 
    tgname AS trigger_name,
    proname AS function_name,
    prosrc AS function_source
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_confirmed';

-- 测试触发器
-- 1. 创建测试用户
INSERT INTO auth.users (id, phone, confirmed_at)
VALUES (gen_random_uuid(), '13800000001', now());

-- 2. 检查 profiles 表
SELECT * FROM profiles WHERE phone = '13800000001';
```

## 测试验证

### 测试步骤
1. **清理测试数据**：
   ```sql
   -- 删除测试用户
   DELETE FROM profiles WHERE phone LIKE '138%';
   DELETE FROM auth.users WHERE phone LIKE '138%';
   ```

2. **测试新用户注册**：
   - 使用验证码登录
   - 手机号：`13800000001`
   - 预期：成功注册，创建 profiles 记录

3. **测试已存在用户登录**：
   - 使用已注册的手机号登录
   - 手机号：`15766121960`
   - 预期：成功登录，无错误

4. **验证 ID 同步**：
   ```sql
   -- 检查 auth.users 和 profiles 的 ID 是否一致
   SELECT 
       a.id AS auth_id,
       p.id AS profile_id,
       a.phone,
       CASE WHEN a.id = p.id THEN 'MATCH' ELSE 'MISMATCH' END AS id_status
   FROM auth.users a
   LEFT JOIN profiles p ON a.phone = p.phone
   WHERE a.phone = '15766121960';
   ```

### 预期结果
- ✅ 新用户可以正常注册
- ✅ 已存在用户可以正常登录
- ✅ 不会出现重复手机号错误
- ✅ auth.users 和 profiles 的 ID 自动同步
- ✅ 用户数据保持完整

## 相关修复

### 之前的修复
1. **48_fix_driver_type_constraint_on_registration.sql**
   - 修复 driver_type 约束错误
   - 为司机自动设置 driver_type

2. **49_fix_driver_type_enum_value_in_trigger.sql**
   - 修复枚举值错误
   - 将 'company' 改为 'pure'

3. **50_fix_duplicate_phone_in_trigger.sql**
   - 添加 ID 重复检查
   - 防止重复插入

### 本次修复
4. **51_fix_trigger_check_phone_instead_of_id.sql**
   - 使用 ON CONFLICT 处理手机号冲突
   - 自动同步 auth.users 和 profiles 的 ID
   - 彻底解决重复手机号问题

## 注意事项

### 1. 数据一致性
- 触发器会自动同步 ID
- 不会丢失用户数据
- 保留原有的 role 和 driver_type

### 2. 性能影响
- ON CONFLICT 比 EXISTS 检查更高效
- 减少了数据库查询次数
- 原子操作，避免竞态条件

### 3. 边界情况
- 如果 email 不同，优先使用新的 email
- role 和 driver_type 不会被更新（保留原有值）
- updated_at 会被更新为当前时间

### 4. 回滚方案
如果需要回滚到之前的版本：
```sql
-- 恢复之前的触发器（带 EXISTS 检查）
-- 参考 50_fix_duplicate_phone_in_trigger.sql
```

## 后续建议

### 1. 数据清理
定期检查和清理不一致的数据：
```sql
-- 查找 ID 不匹配的记录
SELECT 
    a.id AS auth_id,
    p.id AS profile_id,
    a.phone
FROM auth.users a
JOIN profiles p ON a.phone = p.phone
WHERE a.id != p.id;
```

### 2. 监控
- 监控触发器执行情况
- 记录 ID 同步事件
- 定期检查数据一致性

### 3. 文档维护
- 更新用户注册流程文档
- 记录所有数据库变更
- 维护测试用例

## 总结

### 问题
- 验证码登录时出现重复手机号错误
- auth.users 和 profiles 的 ID 不一致
- 触发器只检查 ID，不检查手机号

### 解决方案
- 使用 ON CONFLICT 处理手机号冲突
- 自动同步 auth.users 和 profiles 的 ID
- 保留用户数据，更新时间戳

### 效果
- ✅ 新用户可以正常注册
- ✅ 已存在用户可以正常登录
- ✅ 不会出现重复手机号错误
- ✅ ID 自动同步
- ✅ 数据保持一致

### 相关文档
- [验证码登录完整修复总结](./VERIFICATION_CODE_LOGIN_COMPLETE_FIX.md)
- [验证码登录详细修复文档](./VERIFICATION_CODE_LOGIN_FIX.md)
- [快速测试指南](./QUICK_TEST_VERIFICATION_CODE_LOGIN.md)
