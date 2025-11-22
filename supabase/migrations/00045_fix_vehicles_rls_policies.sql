/*
# 修复 vehicles 表的 RLS 策略

## 问题
当前 vehicles 表的 RLS 策略只允许：
1. 所有认证用户查看车辆
2. 超级管理员管理所有车辆

缺少了司机和管理员的权限，导致司机无法添加车辆。

## 新增策略
1. 司机可以插入自己的车辆
2. 司机可以更新自己的车辆
3. 管理员可以更新自己负责仓库的车辆（用于审核）
4. 管理员可以查看自己负责仓库的车辆
*/

-- 司机可以插入自己的车辆
DROP POLICY IF EXISTS "Drivers can insert their own vehicles" ON vehicles;
CREATE POLICY "Drivers can insert their own vehicles"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- 司机可以更新自己的车辆
DROP POLICY IF EXISTS "Drivers can update their own vehicles" ON vehicles;
CREATE POLICY "Drivers can update their own vehicles"
ON vehicles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 管理员可以更新自己负责仓库的车辆（用于审核）
DROP POLICY IF EXISTS "Managers can update vehicles in their warehouses" ON vehicles;
CREATE POLICY "Managers can update vehicles in their warehouses"
ON vehicles FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM manager_warehouses mw
    WHERE mw.manager_id = auth.uid()
    AND mw.warehouse_id = vehicles.warehouse_id
  )
);

-- 管理员可以查看自己负责仓库的车辆
DROP POLICY IF EXISTS "Managers can view vehicles in their warehouses" ON vehicles;
CREATE POLICY "Managers can view vehicles in their warehouses"
ON vehicles FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM manager_warehouses mw
    WHERE mw.manager_id = auth.uid()
    AND mw.warehouse_id = vehicles.warehouse_id
  )
);
