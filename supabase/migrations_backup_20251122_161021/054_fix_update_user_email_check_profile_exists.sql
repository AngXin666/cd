/*
# 修复 update_user_email 函数 - 在插入前检查 profiles 是否存在

## 问题描述
当先创建 profiles 记录，再调用 update_user_email 创建 auth.users 记录时，
Supabase 的内部触发器会尝试在 profiles 表中插入记录，
但该 ID 已存在，导致主键冲突错误。

错误信息：
{
  "code": "23505",
  "details": "Key (id)=(xxx) already exists.",
  "message": "duplicate key value violates unique constraint 'profiles_pkey'"
}

## 根本原因
1. createDriver 函数先在 profiles 表中创建记录
2. 然后调用 update_user_email 创建 auth.users 记录
3. update_user_email 插入 auth.users 时触发 Supabase 内部触发器
4. 触发器尝试在 profiles 表中插入记录
5. 但该 ID 已存在，导致冲突

## 解决方案
修改 handle_new_user 触发器：
1. 在插入 profiles 之前，先检查记录是否已存在
2. 如果已存在，跳过插入操作
3. 如果不存在，正常插入
4. 使用 ON CONFLICT DO NOTHING 作为额外保护
*/

-- 修改 handle_new_user 触发器，在 profiles 已存在时跳过插入
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
    profile_exists boolean;
BEGIN
    -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- 检查 profiles 表中是否已存在该用户
        SELECT EXISTS (
            SELECT 1 FROM profiles WHERE id = NEW.id
        ) INTO profile_exists;
        
        -- 如果 profiles 已存在，跳过插入
        IF profile_exists THEN
            RAISE NOTICE '✅ profiles 记录已存在，跳过插入 (id: %)', NEW.id;
            RETURN NEW;
        END IF;
        
        -- 判断 profiles 表里有多少用户
        SELECT COUNT(*) INTO user_count FROM profiles;
        
        -- 插入 profiles，首位用户给 super_admin 角色
        -- 使用 ON CONFLICT DO NOTHING 作为额外保护
        INSERT INTO profiles (id, phone, email, role)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✅ profiles 记录创建成功 (id: %)', NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- 确保触发器已绑定
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
