/*
# 修复车辆RLS策略，允许管理员查看所有司机的车辆

## 问题
当前RLS策略要求普通管理员只能查看"管辖仓库"的车辆，但是：
1. 新录入的车辆可能没有分配仓库（warehouse_id为null）
2. 管理员需要能够查看所有司机的车辆信息，以便进行管理

## 解决方案
1. 删除旧的"管理员可以查看管辖仓库的车辆"策略
2. 添加新的"管理员可以查看所有车辆"策略

## 影响
- 所有角色为manager的用户都可以查看所有车辆
- 不影响司机和超级管理员的权限
*/

-- 删除旧的管理员查看策略
DROP POLICY IF EXISTS "管理员可以查看管辖仓库的车辆" ON vehicles;

-- 添加新的管理员查看策略：所有管理员都可以查看所有车辆
CREATE POLICY "管理员可以查看所有车辆" ON vehicles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = uid() 
      AND profiles.role = 'manager'
    )
  );
