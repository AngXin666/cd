/*
# 修复触发器中的手机号冲突问题 v2

## 问题描述
新用户使用验证码登录时出现错误：
- ERROR: duplicate key value violates unique constraint "profiles_phone_key"
- SQLSTATE 23505
- 手机号：13927308879

## 根本原因
1. 触发器只检查 id 是否存在
2. 没有检查 phone 是否存在
3. 当用户使用相同手机号重新注册时，会生成新的 id
4. 但手机号相同，导致冲突

## 解决方案
1. 修改触发器，同时检查 id 和 phone
2. 如果 phone 已存在，更新现有记录的 id
3. 如果 phone 不存在，插入新记录

## 变更内容
1. 重新创建 handle_new_user() 函数
2. 同时检查 id 和 phone
3. 处理手机号已存在的情况
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
    existing_profile_id uuid;
BEGIN
    -- 检查 phone 是否已存在
    SELECT id INTO existing_profile_id
    FROM profiles 
    WHERE phone = NEW.phone
    LIMIT 1;
    
    -- 如果 phone 已存在
    IF existing_profile_id IS NOT NULL THEN
        -- 如果 id 不同，更新现有记录的 id
        IF existing_profile_id != NEW.id THEN
            UPDATE profiles
            SET id = NEW.id,
                email = COALESCE(NEW.email, email),
                updated_at = NOW()
            WHERE phone = NEW.phone;
        END IF;
    ELSE
        -- 如果 phone 不存在，检查 id 是否存在
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
            -- 判断 profiles 表里有多少用户
            SELECT COUNT(*) INTO user_count FROM profiles;
            
            -- 插入 profiles，首位用户给 super_admin 角色
            INSERT INTO profiles (id, phone, email, role)
            VALUES (
                NEW.id,
                NEW.phone,
                NEW.email,
                CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
            )
            ON CONFLICT (id) DO NOTHING;
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建 INSERT 触发器（用户注册时）
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 创建 UPDATE 触发器（用户确认时）
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
    RAISE NOTICE '手机号冲突问题修复完成 v2';
    RAISE NOTICE '1. 修改了 handle_new_user() 函数';
    RAISE NOTICE '2. 同时检查 id 和 phone 字段';
    RAISE NOTICE '3. 处理手机号已存在的情况';
    RAISE NOTICE '4. 如果 phone 已存在，更新现有记录的 id';
    RAISE NOTICE '5. 如果 phone 不存在，插入新记录';
END $$;
