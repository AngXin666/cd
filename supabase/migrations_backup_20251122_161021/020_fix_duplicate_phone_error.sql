/*
# 修复重复手机号错误

## 问题描述
用户登录时出现错误：
- ERROR: duplicate key value violates unique constraint "profiles_phone_key"
- SQLSTATE 23505

## 根本原因
handle_new_user() 触发器在每次用户登录时都会尝试插入新记录，
但没有检查记录是否已存在，导致违反唯一约束。

## 解决方案
修改 handle_new_user() 触发器，使用 INSERT ... ON CONFLICT DO NOTHING
来避免重复插入。

## 变更内容
1. 重新创建 handle_new_user() 函数
2. 使用 ON CONFLICT DO NOTHING 避免重复插入
3. 保持首位用户自动成为超级管理员的逻辑
*/

-- ============================================
-- 重新创建 handle_new_user() 函数
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
BEGIN
    -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- 判断 profiles 表里有多少用户
        SELECT COUNT(*) INTO user_count FROM profiles;
        
        -- 插入 profiles，首位用户给 super_admin 角色
        -- 使用 ON CONFLICT DO NOTHING 避免重复插入
        INSERT INTO profiles (id, phone, email, role)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
        )
        ON CONFLICT (id) DO NOTHING;  -- 如果 id 已存在，则不执行任何操作
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================
-- 验证触发器已绑定
-- ============================================

-- 确保触发器绑定到 auth.users 表
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 完成
-- ============================================

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '重复手机号错误修复完成';
    RAISE NOTICE '1. 修改了 handle_new_user() 函数';
    RAISE NOTICE '2. 使用 ON CONFLICT DO NOTHING 避免重复插入';
    RAISE NOTICE '3. 保持首位用户自动成为超级管理员的逻辑';
END $$;
