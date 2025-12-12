/*
# 修复触发器中的重复手机号错误

## 问题描述
触发器在用户确认时尝试插入 profiles 记录，但没有检查该用户是否已存在。
当用户重复登录或触发器多次执行时，会导致重复插入错误。

错误信息：
ERROR: duplicate key value violates unique constraint "profiles_phone_key" (SQLSTATE 23505)

## 原因分析
1. 触发器在 confirmed_at 从 NULL → 非 NULL 时执行
2. 没有检查用户是否已经在 profiles 表中
3. 直接执行 INSERT 导致违反唯一约束

## 解决方案
在插入之前检查用户是否已存在：
1. 先查询 profiles 表，看是否已有该用户的记录
2. 如果不存在，才执行插入
3. 如果已存在，跳过插入

## 修改内容
添加 EXISTS 检查，防止重复插入
*/

-- 重新创建 handle_new_user() 函数，添加重复检查
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

COMMENT ON FUNCTION handle_new_user() IS '处理新用户注册：首位用户为超级管理员，其他用户默认为纯司机。包含重复检查防止重复插入。';
