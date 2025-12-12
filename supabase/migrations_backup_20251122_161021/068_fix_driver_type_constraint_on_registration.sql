/*
# 修复注册时的 driver_type 约束错误

## 问题描述
用户通过验证码登录注册时,触发器创建 profile 记录时违反了 check_driver_type_only_for_drivers 约束。
错误信息：ERROR: new row for relation "profiles" violates check constraint "check_driver_type_only_for_drivers"

## 原因分析
1. 约束要求：司机角色必须有 driver_type，非司机角色的 driver_type 必须为 NULL
2. 触发器问题：handle_new_user() 函数在创建司机账号时，没有设置 driver_type 字段
3. 结果：创建的司机记录 driver_type 为 NULL，违反约束

## 解决方案
修改 handle_new_user() 触发器函数：
- 当创建司机账号时，自动设置 driver_type 为默认值 'company'
- 当创建非司机账号时，driver_type 保持为 NULL

## 修改内容
1. 更新 handle_new_user() 函数
2. 在 INSERT 语句中添加 driver_type 字段
3. 使用 CASE 语句：司机角色设置为 'company'，其他角色为 NULL
*/

-- 重新创建 handle_new_user() 函数，添加 driver_type 字段处理
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
        
        -- 插入 profiles，首位用户给 super_admin 角色，其他用户默认为 driver
        -- 如果是司机角色，自动设置 driver_type 为 'company'
        INSERT INTO profiles (id, phone, email, role, driver_type)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            new_role,
            CASE WHEN new_role = 'driver'::user_role THEN 'company'::driver_type ELSE NULL END
        );
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS '处理新用户注册：首位用户为超级管理员，其他用户默认为司机（driver_type=company）';
