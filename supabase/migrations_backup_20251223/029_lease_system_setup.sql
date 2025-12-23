/*
# 租赁系统设置

## 说明
为车队管家小程序添加租赁系统管理功能，用于管理租用该小程序的客户（老板账号）。

## 变更内容

### 1. 扩展profiles表
- 添加 status 字段：账号状态（active/suspended/deleted）
- 添加 company_name 字段：公司名称（仅老板账号）
- 添加 lease_start_date 字段：租赁开始日期
- 添加 lease_end_date 字段：租赁结束日期
- 添加 monthly_fee 字段：月租费用
- 添加 notes 字段：备注信息

### 2. 创建租赁账单表
- 创建 lease_bills 表，记录每个老板的租金账单
- 包含账单月份、金额、状态、核销信息等字段

### 3. 更新RLS策略
- 租赁管理员可以查看和管理所有老板账号
- 租赁管理员可以管理所有账单

## 权限说明
租赁管理员（lease_admin）权限：
- ✅ 查看所有老板账号
- ✅ 创建老板账号
- ✅ 编辑老板账号
- ✅ 停用/启用老板账号
- ✅ 删除老板账号
- ✅ 查看所有账单
- ✅ 核销账单
*/

-- ============================================
-- 1. 扩展profiles表
-- ============================================

-- 添加账号状态字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 添加公司信息字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;

-- 添加租赁信息字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lease_start_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lease_end_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT 0;

-- 添加备注字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notes text;
  END IF;
END $$;

-- 添加字段注释
COMMENT ON COLUMN profiles.status IS '账号状态：active(正常), suspended(停用), deleted(已删除)';
COMMENT ON COLUMN profiles.company_name IS '公司名称（仅老板账号）';
COMMENT ON COLUMN profiles.lease_start_date IS '租赁开始日期（仅老板账号）';
COMMENT ON COLUMN profiles.lease_end_date IS '租赁结束日期（仅老板账号）';
COMMENT ON COLUMN profiles.monthly_fee IS '月租费用（仅老板账号）';
COMMENT ON COLUMN profiles.notes IS '备注信息';

-- ============================================
-- 2. 创建租赁账单表
-- ============================================

CREATE TABLE IF NOT EXISTS lease_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  bill_month text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_lease_bills_tenant_id ON lease_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_bills_status ON lease_bills(status);
CREATE INDEX IF NOT EXISTS idx_lease_bills_bill_month ON lease_bills(bill_month);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_lease_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lease_bills_updated_at
  BEFORE UPDATE ON lease_bills
  FOR EACH ROW
  EXECUTE FUNCTION update_lease_bills_updated_at();

-- 添加表注释
COMMENT ON TABLE lease_bills IS '租赁账单表';
COMMENT ON COLUMN lease_bills.tenant_id IS '租户ID（老板账号）';
COMMENT ON COLUMN lease_bills.bill_month IS '账单月份，格式：2025-01';
COMMENT ON COLUMN lease_bills.amount IS '账单金额';
COMMENT ON COLUMN lease_bills.status IS '账单状态：pending(待核销), verified(已核销), cancelled(已取消)';
COMMENT ON COLUMN lease_bills.verified_at IS '核销时间';
COMMENT ON COLUMN lease_bills.verified_by IS '核销人ID';

-- ============================================
-- 3. 启用RLS
-- ============================================

ALTER TABLE lease_bills ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. 创建RLS策略
-- ============================================

-- 租赁管理员可以查看所有老板账号
CREATE POLICY "租赁管理员查看所有老板账号" ON profiles
  FOR SELECT TO authenticated
  USING (
    is_lease_admin_user(auth.uid())
    AND role = 'super_admin'
  );

-- 租赁管理员可以创建老板账号
CREATE POLICY "租赁管理员创建老板账号" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_lease_admin_user(auth.uid())
    AND role = 'super_admin'
  );

-- 租赁管理员可以更新老板账号
CREATE POLICY "租赁管理员更新老板账号" ON profiles
  FOR UPDATE TO authenticated
  USING (
    is_lease_admin_user(auth.uid())
    AND role = 'super_admin'
  );

-- 租赁管理员可以删除老板账号
CREATE POLICY "租赁管理员删除老板账号" ON profiles
  FOR DELETE TO authenticated
  USING (
    is_lease_admin_user(auth.uid())
    AND role = 'super_admin'
  );

-- 租赁管理员可以查看所有账单
CREATE POLICY "租赁管理员查看所有账单" ON lease_bills
  FOR SELECT TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- 租赁管理员可以创建账单
CREATE POLICY "租赁管理员创建账单" ON lease_bills
  FOR INSERT TO authenticated
  WITH CHECK (is_lease_admin_user(auth.uid()));

-- 租赁管理员可以更新账单
CREATE POLICY "租赁管理员更新账单" ON lease_bills
  FOR UPDATE TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- 租赁管理员可以删除账单
CREATE POLICY "租赁管理员删除账单" ON lease_bills
  FOR DELETE TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- ============================================
-- 5. 验证配置
-- ============================================

-- 检查profiles表字段是否添加成功
DO $$
DECLARE
  field_count integer;
BEGIN
  SELECT COUNT(*) INTO field_count
  FROM information_schema.columns
  WHERE table_name = 'profiles'
  AND column_name IN ('status', 'company_name', 'lease_start_date', 'lease_end_date', 'monthly_fee');
  
  IF field_count >= 5 THEN
    RAISE NOTICE '✓ profiles表字段已添加';
  ELSE
    RAISE WARNING '✗ profiles表字段添加不完整';
  END IF;
END $$;

-- 检查lease_bills表是否创建成功
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'lease_bills'
  ) THEN
    RAISE NOTICE '✓ lease_bills表已创建';
  ELSE
    RAISE WARNING '✗ lease_bills表未创建';
  END IF;
END $$;

-- 检查RLS策略是否创建成功
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'lease_bills')
  AND policyname LIKE '%租赁管理员%';
  
  IF policy_count >= 8 THEN
    RAISE NOTICE '✓ RLS策略已创建';
  ELSE
    RAISE WARNING '✗ RLS策略创建不完整';
  END IF;
END $$;
