/*
# 修复 warehouse_categories 表的 RLS 策略

## 问题
warehouse_categories 表没有启用行级安全策略，导致：
- 任何认证用户都可以查看、修改、删除所有租户的仓库品类数据
- 严重违反多租户隔离原则

## 解决方案
1. 启用 RLS
2. 添加租户隔离策略
3. 允许租赁管理员访问所有数据

## 影响
- 修复后，用户只能访问自己租户的品类数据
- 租赁管理员可以访问所有租户的数据
*/

-- 启用 RLS
ALTER TABLE warehouse_categories ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can only access their tenant's categories" ON warehouse_categories;
DROP POLICY IF EXISTS "Lease admins can access all categories" ON warehouse_categories;
DROP POLICY IF EXISTS "Super admins can access their tenant's categories" ON warehouse_categories;

-- 策略1：用户只能访问自己租户的品类数据
CREATE POLICY "Users can only access their tenant's categories"
ON warehouse_categories
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
);

-- 策略2：租赁管理员可以访问所有数据
CREATE POLICY "Lease admins can access all categories"
ON warehouse_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'lease_admin'::user_role
  )
);

-- 添加注释
COMMENT ON TABLE warehouse_categories IS '仓库品类表 - 已启用RLS租户隔离';
