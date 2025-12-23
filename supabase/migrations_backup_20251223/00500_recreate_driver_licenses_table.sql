/*
# 重新创建驾驶员证件信息表

## 背景
在单用户系统迁移过程中，`driver_licenses` 表被删除了，但代码中仍在使用这个表。
本迁移文件重新创建 `driver_licenses` 表，并适配新的单用户系统架构。

## 变更内容

### 1. 创建 driver_licenses 表
- `id` (uuid, primary key) - 主键
- `driver_id` (uuid, unique, not null) - 司机ID（来自 auth.users）
- `license_number` (text) - 驾驶证号
- `id_card_name` (text) - 身份证姓名
- `id_card_number` (text) - 身份证号
- `id_card_photo_front` (text) - 身份证正面照片URL
- `id_card_photo_back` (text) - 身份证反面照片URL
- `id_card_address` (text) - 身份证地址
- `id_card_birth_date` (date) - 出生日期
- `license_class` (text) - 准驾车型
- `first_issue_date` (date) - 初次领证日期
- `valid_from` (date) - 驾驶证有效期起
- `valid_to` (date) - 驾驶证有效期至
- `issue_authority` (text) - 签发机关
- `status` (text, default 'active') - 状态
- `created_at` (timestamptz, default now()) - 创建时间
- `updated_at` (timestamptz, default now()) - 更新时间

### 2. 创建索引
- 为常用查询字段创建索引，提升查询性能

### 3. 创建触发器
- 自动更新 updated_at 字段

### 4. RLS 策略
- 启用 RLS
- 管理员（BOSS/MANAGER）可以查看和管理所有证件信息
- 司机只能查看和管理自己的证件信息

## 注意事项
- 不使用外键约束引用 users 表，因为在单用户系统中，用户ID直接来自 auth.users
- 数据完整性由应用层验证、认证系统和 RLS 策略保证
- driver_id 必须唯一，一个司机只能有一条证件记录
*/

-- 1. 创建 driver_licenses 表
CREATE TABLE IF NOT EXISTS driver_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID UNIQUE NOT NULL,
  license_number TEXT,
  id_card_name TEXT,
  id_card_number TEXT,
  id_card_photo_front TEXT,
  id_card_photo_back TEXT,
  id_card_address TEXT,
  id_card_birth_date DATE,
  license_class TEXT,
  first_issue_date DATE,
  valid_from DATE,
  valid_to DATE,
  issue_authority TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_to_after_valid_from CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from),
  CONSTRAINT status_valid CHECK (status IN ('active', 'inactive', 'expired'))
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_driver_licenses_driver_id ON driver_licenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_license_number ON driver_licenses(license_number);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_id_card_number ON driver_licenses(id_card_number);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_valid_to ON driver_licenses(valid_to);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_status ON driver_licenses(status);

-- 3. 创建触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 driver_licenses 创建触发器
DROP TRIGGER IF EXISTS update_driver_licenses_updated_at ON driver_licenses;
CREATE TRIGGER update_driver_licenses_updated_at
  BEFORE UPDATE ON driver_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. 启用 RLS
ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略（使用大写枚举值）

-- 管理员可以查看所有证件信息
DROP POLICY IF EXISTS "Managers can view all driver licenses" ON driver_licenses;
CREATE POLICY "Managers can view all driver licenses" ON driver_licenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- 管理员可以更新所有证件信息
DROP POLICY IF EXISTS "Managers can update all driver licenses" ON driver_licenses;
CREATE POLICY "Managers can update all driver licenses" ON driver_licenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- 管理员可以删除所有证件信息
DROP POLICY IF EXISTS "Managers can delete all driver licenses" ON driver_licenses;
CREATE POLICY "Managers can delete all driver licenses" ON driver_licenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- 管理员可以创建证件信息
DROP POLICY IF EXISTS "Managers can create driver licenses" ON driver_licenses;
CREATE POLICY "Managers can create driver licenses" ON driver_licenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- 司机可以查看自己的证件信息
DROP POLICY IF EXISTS "Drivers can view own licenses" ON driver_licenses;
CREATE POLICY "Drivers can view own licenses" ON driver_licenses
  FOR SELECT
  USING (driver_id = auth.uid());

-- 司机可以创建自己的证件信息
DROP POLICY IF EXISTS "Drivers can create own licenses" ON driver_licenses;
CREATE POLICY "Drivers can create own licenses" ON driver_licenses
  FOR INSERT
  WITH CHECK (driver_id = auth.uid());

-- 司机可以更新自己的证件信息
DROP POLICY IF EXISTS "Drivers can update own licenses" ON driver_licenses;
CREATE POLICY "Drivers can update own licenses" ON driver_licenses
  FOR UPDATE
  USING (driver_id = auth.uid());

-- 6. 添加注释
COMMENT ON TABLE driver_licenses IS '驾驶员证件信息表';

COMMENT ON COLUMN driver_licenses.driver_id IS '司机用户ID（来自 auth.users）';
COMMENT ON COLUMN driver_licenses.license_number IS '驾驶证号';
COMMENT ON COLUMN driver_licenses.id_card_name IS '身份证姓名';
COMMENT ON COLUMN driver_licenses.id_card_number IS '身份证号';
COMMENT ON COLUMN driver_licenses.id_card_photo_front IS '身份证正面照片URL';
COMMENT ON COLUMN driver_licenses.id_card_photo_back IS '身份证反面照片URL';
COMMENT ON COLUMN driver_licenses.id_card_address IS '身份证地址';
COMMENT ON COLUMN driver_licenses.id_card_birth_date IS '出生日期';
COMMENT ON COLUMN driver_licenses.license_class IS '准驾车型';
COMMENT ON COLUMN driver_licenses.first_issue_date IS '初次领证日期';
COMMENT ON COLUMN driver_licenses.valid_from IS '驾驶证有效期起';
COMMENT ON COLUMN driver_licenses.valid_to IS '驾驶证有效期至';
COMMENT ON COLUMN driver_licenses.issue_authority IS '签发机关';
COMMENT ON COLUMN driver_licenses.status IS '状态：active（有效）、inactive（无效）、expired（已过期）';