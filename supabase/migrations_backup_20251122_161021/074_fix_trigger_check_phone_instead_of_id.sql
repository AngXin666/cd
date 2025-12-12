/*
# 修复触发器：检查手机号而不仅仅是 ID

## 问题描述
当 auth.users 和 profiles 表中的用户 ID 不一致时，会导致重复手机号错误。

场景：
1. profiles 表中有用户 A（ID: xxx, phone: 15766121960）
2. auth.users 表中有用户 B（ID: yyy, phone: 15766121960）
3. 用户 B 登录时，触发器检查 ID，发现不存在
4. 触发器尝试插入，但手机号已存在，导致错误

错误信息：
ERROR: duplicate key value violates unique constraint "profiles_phone_key" (SQLSTATE 23505)

## 原因分析
触发器只检查 ID 是否存在，没有检查手机号是否已被使用。
这导致当 auth.users 和 profiles 的 ID 不匹配时，会尝试插入重复的手机号。

## 解决方案
1. 先检查手机号是否已在 profiles 表中
2. 如果手机号已存在，更新该记录的 ID 为当前用户的 ID
3. 如果手机号不存在，才插入新记录

这样可以处理：
- 新用户注册：正常插入
- 已存在用户登录：更新 ID，不插入
- ID 不匹配的情况：同步 ID

## 修改内容
改用 INSERT ... ON CONFLICT 处理重复情况
*/

-- 重新创建 handle_new_user() 函数，使用手机号检查
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

COMMENT ON FUNCTION handle_new_user() IS '处理新用户注册：首位用户为超级管理员，其他用户默认为纯司机。使用 ON CONFLICT 处理手机号冲突，同步 ID。';
