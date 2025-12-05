-- 修复warehouses表RLS策略中对user_permission_assignments的引用
-- 2025-12-03: 权限系统已简化，user_permission_assignments表已删除

-- 删除所有引用user_permission_assignments的旧RLS策略
DROP POLICY IF EXISTS "Users can view warehouses with permissions" ON warehouses;
DROP POLICY IF EXISTS "Admins can manage warehouses with permissions" ON warehouses;
DROP POLICY IF EXISTS "Managers can view assigned warehouses" ON warehouses;

-- 重新创建简化的RLS策略（基于users.role字段）

-- 1. 所有认证用户可以查看仓库
CREATE POLICY "Authenticated users can view warehouses"
ON warehouses
FOR SELECT
TO authenticated
USING (true);

-- 2. BOSS可以管理所有仓库
CREATE POLICY "Boss can manage all warehouses"
ON warehouses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'BOSS'
  )
);

-- 3. MANAGER可以查看和更新分配给他们的仓库
CREATE POLICY "Managers can update assigned warehouses"
ON warehouses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'MANAGER'
  )
  AND EXISTS (
    SELECT 1 FROM warehouse_assignments
    WHERE warehouse_assignments.warehouse_id = warehouses.id
    AND warehouse_assignments.user_id = auth.uid()
  )
);
