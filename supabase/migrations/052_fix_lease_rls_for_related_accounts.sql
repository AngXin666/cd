/*
# 修复租期表RLS策略 - 允许关联账号查看租期

## 问题
车队长和平级账号无法查看其所属老板的租期信息，导致租期检测失败

## 解决方案
添加新的RLS策略，允许：
1. 车队长可以查看其 tenant_id 对应老板的租期
2. 平级账号可以查看其 main_account_id 对应老板的租期

## 策略逻辑
- 车队长：profiles.tenant_id = leases.tenant_id
- 平级账号：profiles.main_account_id 的 tenant_id = leases.tenant_id
*/

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Related accounts can view their boss leases" ON leases;

-- 创建新策略：允许车队长和平级账号查看其老板的租期
CREATE POLICY "Related accounts can view their boss leases" ON leases
  FOR SELECT TO authenticated
  USING (
    -- 车队长可以查看其 tenant_id 对应老板的租期
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'::user_role
      AND profiles.tenant_id = leases.tenant_id
    )
    OR
    -- 平级账号可以查看其主账号的租期
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.main_account_id = p2.id
      WHERE p1.id = auth.uid()
      AND p1.role = 'super_admin'::user_role
      AND p1.main_account_id IS NOT NULL
      AND p2.tenant_id = leases.tenant_id
    )
  );
