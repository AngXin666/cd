/*
# 创建租期管理表

## 1. 新增表
- `leases` - 租期记录表
  - `id` (uuid, primary key) - 租期记录ID
  - `tenant_id` (uuid, not null) - 老板账号ID（主账号）
  - `start_date` (date, not null) - 租期开始日期
  - `end_date` (date, not null) - 租期结束日期
  - `duration_months` (integer, not null) - 租期月数（1/3/6/12）
  - `status` (text, not null) - 租期状态（active=生效中, expired=已过期）
  - `expire_action` (text, not null) - 到期操作（suspend_all=停用所有账号, suspend_main=仅停用主账号, suspend_peer=停用平级账号, suspend_manager=停用车队长）
  - `created_at` (timestamptz) - 创建时间
  - `updated_at` (timestamptz) - 更新时间

## 2. 安全策略
- 启用 RLS
- 租赁管理员（lease_admin）可以查看和管理所有租期
- 老板账号可以查看自己的租期信息

## 3. 索引
- tenant_id 索引，用于快速查询某个老板账号的租期
- status 索引，用于快速查询生效中或已过期的租期
- end_date 索引，用于快速查询即将到期的租期

## 4. 触发器
- 自动更新 updated_at 字段
*/

-- 创建租期状态枚举类型
CREATE TYPE lease_status AS ENUM ('active', 'expired');

-- 创建到期操作枚举类型
CREATE TYPE expire_action_type AS ENUM ('suspend_all', 'suspend_main', 'suspend_peer', 'suspend_manager');

-- 创建租期表
CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_months integer NOT NULL CHECK (duration_months IN (1, 3, 6, 12)),
  status lease_status NOT NULL DEFAULT 'active'::lease_status,
  expire_action expire_action_type NOT NULL DEFAULT 'suspend_all'::expire_action_type,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_end_date ON leases(end_date);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_leases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_leases_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION update_leases_updated_at();

-- 启用 RLS
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- 租赁管理员可以查看和管理所有租期
CREATE POLICY "Lease admins have full access to leases" ON leases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'lease_admin'::user_role
    )
  );

-- 老板账号可以查看自己的租期信息
CREATE POLICY "Tenants can view their own leases" ON leases
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

-- 添加注释
COMMENT ON TABLE leases IS '租期管理表';
COMMENT ON COLUMN leases.id IS '租期记录ID';
COMMENT ON COLUMN leases.tenant_id IS '老板账号ID（主账号）';
COMMENT ON COLUMN leases.start_date IS '租期开始日期';
COMMENT ON COLUMN leases.end_date IS '租期结束日期';
COMMENT ON COLUMN leases.duration_months IS '租期月数（1/3/6/12）';
COMMENT ON COLUMN leases.status IS '租期状态（active=生效中, expired=已过期）';
COMMENT ON COLUMN leases.expire_action IS '到期操作（suspend_all=停用所有账号, suspend_main=仅停用主账号, suspend_peer=停用平级账号, suspend_manager=停用车队长）';
COMMENT ON COLUMN leases.created_at IS '创建时间';
COMMENT ON COLUMN leases.updated_at IS '更新时间';
