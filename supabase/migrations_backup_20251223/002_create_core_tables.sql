/*
# 创建核心表

## 说明
创建系统的核心表，包括用户资料表和仓库表。

## 表结构

### 1. profiles（用户资料表）
用户的基本信息和扩展资料。

**字段说明**：
- id (uuid, PK): 用户ID，与 auth.users.id 关联
- phone (text, unique): 手机号
- email (text, unique): 邮箱
- name (text): 真实姓名
- role (user_role): 用户角色
- driver_type (driver_type): 司机类型（仅司机角色使用）
- avatar_url (text): 头像URL
- nickname (text): 昵称
- address_province (text): 省份
- address_city (text): 城市
- address_district (text): 区县
- address_detail (text): 详细地址
- emergency_contact_name (text): 紧急联系人姓名
- emergency_contact_phone (text): 紧急联系人电话
- login_account (text, unique): 登录账号
- vehicle_plate (text): 车牌号（带车司机使用）
- join_date (date): 入职日期
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

### 2. warehouses（仓库表）
仓库的基本信息和配置。

**字段说明**：
- id (uuid, PK): 仓库ID
- name (text, unique): 仓库名称
- is_active (boolean): 是否启用
- max_leave_days (integer): 最大请假天数
- resignation_notice_days (integer): 离职提前通知天数
- daily_target (integer): 每日目标件数
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

## 安全策略
- profiles 表启用 RLS
- warehouses 表启用 RLS

## 触发器
- 自动设置 updated_at 字段
- 首个注册用户自动成为超级管理员
*/

-- ============================================
-- 创建 profiles 表
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text UNIQUE,
  email text UNIQUE,
  name text,
  role user_role DEFAULT 'driver'::user_role NOT NULL,
  driver_type driver_type,
  avatar_url text,
  nickname text,
  address_province text,
  address_city text,
  address_district text,
  address_detail text,
  emergency_contact_name text,
  emergency_contact_phone text,
  login_account text UNIQUE,
  vehicle_plate text,
  join_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_login_account ON profiles(login_account);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 profiles 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 创建 warehouses 表
-- ============================================
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  max_leave_days integer DEFAULT 30 NOT NULL,
  resignation_notice_days integer DEFAULT 30 NOT NULL,
  daily_target integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT max_leave_days_positive CHECK (max_leave_days > 0),
  CONSTRAINT resignation_notice_days_positive CHECK (resignation_notice_days > 0),
  CONSTRAINT daily_target_positive CHECK (daily_target IS NULL OR daily_target > 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name);

-- 为 warehouses 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 首个用户自动成为超级管理员
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
    
    -- 插入 profiles，首位用户给 admin 角色
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

-- 确保触发器绑定到 auth.users 表
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 辅助函数：检查是否为超级管理员
-- ============================================
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'super_admin'::user_role
  );
$$;

-- ============================================
-- 辅助函数：检查是否为管理员（包括超级管理员）
-- ============================================
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role IN ('manager'::user_role, 'super_admin'::user_role)
  );
$$;
