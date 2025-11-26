/*
# 修复 warehouses 表的 RLS 策略，避免递归

## 问题分析
warehouses 表的策略也可能导致递归问题

## 解决方案
使用已创建的 get_user_role_and_boss 函数来避免递归

*/

-- 删除旧策略
DROP POLICY IF EXISTS "Admins can view tenant warehouses" ON warehouses;
DROP POLICY IF EXISTS "Drivers can view assigned warehouses" ON warehouses;

-- 策略 1：管理员可以查看同租户的所有仓库
CREATE POLICY "Admins can view tenant warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin')
    AND
    warehouses.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b)
  );

-- 策略 2：司机可以查看分配给自己的仓库
CREATE POLICY "Drivers can view assigned warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) = 'driver'
    AND
    warehouses.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b)
    AND
    EXISTS (
      SELECT 1 FROM driver_warehouses dw
      WHERE dw.driver_id = auth.uid()
        AND dw.warehouse_id = warehouses.id
    )
  );

-- 添加注释
COMMENT ON POLICY "Admins can view tenant warehouses" ON warehouses IS '管理员可以查看同租户的所有仓库';
COMMENT ON POLICY "Drivers can view assigned warehouses" ON warehouses IS '司机可以查看分配给自己的仓库';
