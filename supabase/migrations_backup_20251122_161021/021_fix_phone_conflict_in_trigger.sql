/*
# 修复触发器中的手机号冲突问题

## 问题描述
用户登录时仍然出现错误：
- ERROR: duplicate key value violates unique constraint "profiles_phone_key"
- SQLSTATE 23505

## 根本原因
之前的修复使用了 ON CONFLICT (id) DO NOTHING，
但实际冲突发生在 phone 字段上，而不是 id 字段。

## 解决方案
1. 修改触发器，先检查记录是否存在
2. 如果记录已存在（通过 id 或 phone 检查），则不执行插入
3. 如果记录不存在，则插入新记录

## 变更内容
1. 重新创建 handle_new_user() 函数
2. 使用 EXISTS 检查记录是否存在
3. 只在记录不存在时才插入
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
    profile_exists boolean;
BEGIN
    -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- 检查 profile 是否已存在（通过 id 或 phone）
        SELECT EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = NEW.id OR phone = NEW.phone
        ) INTO profile_exists;
        
        -- 如果 profile 不存在，才插入新记录
        IF NOT profile_exists THEN
            -- 判断 profiles 表里有多少用户
            SELECT COUNT(*) INTO user_count FROM profiles;
            
            -- 插入 profiles，首位用户给 super_admin 角色
            INSERT INTO profiles (id, phone, email, role)
            VALUES (
                NEW.id,
                NEW.phone,
                NEW.email,
                CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
            );
        END IF;
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
    RAISE NOTICE '手机号冲突问题修复完成';
    RAISE NOTICE '1. 修改了 handle_new_user() 函数';
    RAISE NOTICE '2. 使用 EXISTS 检查记录是否存在';
    RAISE NOTICE '3. 只在记录不存在时才插入';
    RAISE NOTICE '4. 同时检查 id 和 phone 字段';
END $$;
