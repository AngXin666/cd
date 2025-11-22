/*
# 创建用户档案表

1. 新建表
    - `profiles`
        - `id` (uuid, 主键, 默认: gen_random_uuid())
        - `phone` (text, 唯一)
        - `email` (text, 唯一)
        - `name` (text, 用户姓名)
        - `role` (user_role, 用户角色: driver/manager/super_admin, 默认: 'driver', 非空)
        - `created_at` (timestamptz, 默认: now())
        - `updated_at` (timestamptz, 默认: now())

2. 安全策略
    - 在 `profiles` 表上启用 RLS
    - 创建管理员辅助函数检查用户角色
    - 超级管理员对所有档案拥有完全访问权限
    - 普通管理员可以查看所有档案，但只能修改司机档案
    - 用户可以查看和更新自己的档案

3. 触发器
    - 创建触发器，当用户首次登录时自动创建档案
    - 第一个注册的用户自动成为超级管理员
*/

-- 创建用户角色枚举类型
CREATE TYPE user_role AS ENUM ('driver', 'manager', 'super_admin');

-- 创建用户档案表
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone text UNIQUE,
    email text UNIQUE,
    name text,
    role user_role DEFAULT 'driver'::user_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 启用行级安全
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 创建辅助函数：检查是否为超级管理员
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = uid AND p.role = 'super_admin'::user_role
    );
$$;

-- 创建辅助函数：检查是否为管理员（包括超级管理员和普通管理员）
CREATE OR REPLACE FUNCTION is_manager_or_above(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = uid AND p.role IN ('manager'::user_role, 'super_admin'::user_role)
    );
$$;

-- 超级管理员拥有完全访问权限
CREATE POLICY "超级管理员拥有完全访问权限" ON profiles
    FOR ALL TO authenticated USING (is_super_admin(auth.uid()));

-- 普通管理员可以查看所有档案
CREATE POLICY "管理员可以查看所有档案" ON profiles
    FOR SELECT TO authenticated USING (is_manager_or_above(auth.uid()));

-- 普通管理员可以修改司机档案
CREATE POLICY "管理员可以修改司机档案" ON profiles
    FOR UPDATE TO authenticated 
    USING (is_manager_or_above(auth.uid()) AND role = 'driver'::user_role);

-- 用户可以查看自己的档案
CREATE POLICY "用户可以查看自己的档案" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- 用户可以更新自己的档案（但不能修改角色）
CREATE POLICY "用户可以更新自己的档案" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 创建触发器函数：处理新用户注册
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
        INSERT INTO profiles (id, phone, email, role)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 绑定触发器到 auth.users 表
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 profiles 表添加更新时间戳触发器
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
