/*
# 修复 handle_new_user 触发器

## 问题
触发器只在 UPDATE 操作且 confirmed_at 从 NULL 变为非 NULL 时触发
但 update_user_email 函数在 INSERT 时直接设置 email_confirmed_at = now()
导致触发器不执行，profiles 记录不会被创建

## 解决方案
修改触发器，使其在以下情况下都能执行：
1. INSERT 操作，且 email_confirmed_at 或 phone_confirmed_at 不为 NULL
2. UPDATE 操作，且 confirmed_at 从 NULL 变为非 NULL

## 修改内容
- 添加 TG_OP 判断
- 处理 INSERT 和 UPDATE 两种情况
- 保持原有的 profiles 存在性检查
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
    profile_exists boolean;
BEGIN
    -- 检查 profiles 表中是否已存在该用户
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = NEW.id
    ) INTO profile_exists;
    
    -- 如果 profiles 已存在，跳过插入
    IF profile_exists THEN
        RAISE NOTICE '✅ profiles 记录已存在，跳过插入 (id: %)', NEW.id;
        RETURN NEW;
    END IF;
    
    -- 判断是否需要创建 profiles 记录
    -- 情况1：INSERT 操作，且 email_confirmed_at 或 phone_confirmed_at 不为 NULL
    -- 情况2：UPDATE 操作，且 confirmed_at 从 NULL 变为非 NULL
    IF (TG_OP = 'INSERT' AND (NEW.email_confirmed_at IS NOT NULL OR NEW.phone_confirmed_at IS NOT NULL))
       OR (TG_OP = 'UPDATE' AND OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL) THEN
        
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
        
        RAISE NOTICE '✅ profiles 记录创建成功 (id: %)', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 确保触发器绑定到 auth.users 表的 INSERT 和 UPDATE 操作
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 添加注释
COMMENT ON FUNCTION handle_new_user IS '当 auth.users 表插入或更新记录时，自动在 profiles 表中创建对应记录';
COMMENT ON TRIGGER on_auth_user_confirmed ON auth.users IS '触发器：在 auth.users 表插入或更新时执行 handle_new_user 函数';
