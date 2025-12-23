/*
# 添加租赁管理员管理司机仓库分配的权限

## 问题描述
租赁管理员在分配仓库给司机时，无法插入 `driver_warehouses` 表。
现有的 RLS 策略要求 `boss_id = get_current_user_boss_id()`，但租赁管理员没有 boss_id。

## 解决方案
添加新的 RLS 策略，允许租赁管理员管理所有租户的司机仓库分配。

## 变更内容
1. 添加租赁管理员插入司机仓库分配的策略
2. 添加租赁管理员查看司机仓库分配的策略
3. 添加租赁管理员更新司机仓库分配的策略
4. 添加租赁管理员删除司机仓库分配的策略

## 影响范围
- 租赁管理员可以管理所有租户的司机仓库分配
- 其他用户的权限不受影响
*/

-- 1. 租赁管理员可以插入司机仓库分配
CREATE POLICY "租赁管理员可以插入司机仓库分配" ON driver_warehouses
  FOR INSERT TO authenticated
  WITH CHECK (is_lease_admin_user(auth.uid()));

-- 2. 租赁管理员可以查看司机仓库分配
CREATE POLICY "租赁管理员可以查看司机仓库分配" ON driver_warehouses
  FOR SELECT TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- 3. 租赁管理员可以更新司机仓库分配
CREATE POLICY "租赁管理员可以更新司机仓库分配" ON driver_warehouses
  FOR UPDATE TO authenticated
  USING (is_lease_admin_user(auth.uid()))
  WITH CHECK (is_lease_admin_user(auth.uid()));

-- 4. 租赁管理员可以删除司机仓库分配
CREATE POLICY "租赁管理员可以删除司机仓库分配" ON driver_warehouses
  FOR DELETE TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- 添加策略注释
COMMENT ON POLICY "租赁管理员可以插入司机仓库分配" ON driver_warehouses IS 
'允许租赁管理员插入所有租户的司机仓库分配';

COMMENT ON POLICY "租赁管理员可以查看司机仓库分配" ON driver_warehouses IS 
'允许租赁管理员查看所有租户的司机仓库分配';

COMMENT ON POLICY "租赁管理员可以更新司机仓库分配" ON driver_warehouses IS 
'允许租赁管理员更新所有租户的司机仓库分配';

COMMENT ON POLICY "租赁管理员可以删除司机仓库分配" ON driver_warehouses IS 
'允许租赁管理员删除所有租户的司机仓库分配';