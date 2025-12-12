/*
# 修复触发器中的 driver_type 枚举值错误

## 问题描述
在 48_fix_driver_type_constraint_on_registration.sql 中，触发器使用了错误的枚举值 'company'。
实际的枚举类型 driver_type_enum 的值是：
- 'pure': 纯司机（开公司的车）
- 'with_vehicle': 带车司机（开自己的车）

错误信息：
ERROR: invalid input value for enum driver_type: "company" (SQLSTATE 22P02)

## 原因分析
1. 枚举类型定义：CREATE TYPE driver_type_enum AS ENUM ('pure', 'with_vehicle')
2. 触发器使用了错误的值：'company'::driver_type
3. 应该使用：'pure'::driver_type_enum

## 解决方案
修改 handle_new_user() 触发器函数，使用正确的枚举值 'pure'。
新注册的司机默认为纯司机（开公司的车）。

## 修改内容
将 'company'::driver_type 改为 'pure'::driver_type_enum
*/

-- 重新创建 handle_new_user() 函数，使用正确的枚举值
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

COMMENT ON FUNCTION handle_new_user() IS '处理新用户注册：首位用户为超级管理员，其他用户默认为纯司机（driver_type=pure）';
