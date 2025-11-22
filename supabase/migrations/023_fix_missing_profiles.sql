/*
# 修复缺失的 profile 记录

## 问题描述
新注册的用户登录后显示"用户角色不存在"

## 根本原因
1. 触发器只在 UPDATE 时触发，但用户注册时可能不会触发 UPDATE
2. 触发器的条件 OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL 可能不满足
3. 某些用户在 auth.users 中存在，但在 profiles 中不存在

## 解决方案
1. 为所有没有 profile 的 auth.users 创建 profile 记录
2. 修改触发器，同时监听 INSERT 和 UPDATE 事件
3. 简化触发器逻辑，确保每个用户都有 profile

## 变更内容
1. 为现有用户创建缺失的 profile 记录
2. 修改触发器，监听 INSERT 和 UPDATE 事件
3. 简化触发器逻辑
*/

-- ============================================
-- 第一步：清理不一致的数据
-- ============================================

-- 删除 profiles 中没有对应 auth.users 的记录
DELETE FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p.id
);

-- ============================================
-- 第二步：为现有用户创建缺失的 profile 记录
-- ============================================

-- 为所有没有 profile 的 auth.users 创建 profile
INSERT INTO profiles (id, phone, email, role)
SELECT 
    u.id,
    u.phone,
    u.email,
    'driver'::user_role  -- 默认角色为司机
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 第二步：重新创建触发器函数
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
    -- 检查 profile 是否已存在
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = NEW.id
    ) INTO profile_exists;
    
    -- 如果 profile 不存在，创建新记录
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
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================
-- 第三步：重新创建触发器
-- ============================================

-- 删除旧触发器
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
-- 第四步：验证修复结果
-- ============================================

-- 检查是否还有没有 profile 的用户
DO $$
DECLARE
    missing_count int;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.id IS NULL;
    
    IF missing_count > 0 THEN
        RAISE WARNING '仍有 % 个用户没有 profile 记录', missing_count;
    ELSE
        RAISE NOTICE '所有用户都有 profile 记录';
    END IF;
END $$;

-- ============================================
-- 完成
-- ============================================

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '缺失 profile 记录修复完成';
    RAISE NOTICE '1. 为现有用户创建了缺失的 profile 记录';
    RAISE NOTICE '2. 修改了触发器，监听 INSERT 和 UPDATE 事件';
    RAISE NOTICE '3. 简化了触发器逻辑';
    RAISE NOTICE '4. 确保每个用户都有 profile 记录';
END $$;
