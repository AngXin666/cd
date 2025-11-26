/*
# 修复 profiles 表的查看权限策略

## 问题描述
当前的 RLS 策略存在问题：
1. "租户数据隔离 - profiles" 策略太宽松，允许所有同租户用户查看彼此
2. 缺少基于角色的查看权限控制
3. 老板B可以看到老板A的司机

## 正确的权限规则
1. **租赁管理员 (lease_admin)**: 
   - 可以查看所有用户

2. **老板账号 (super_admin)**:
   - 可以查看自己租户内的车队长和司机
   - 不能查看其他租户的用户
   - 不能查看租赁管理员

3. **车队长 (manager)**:
   - 可以查看自己仓库的司机
   - 不能查看其他仓库的司机
   - 不能查看租赁管理员和老板账号

4. **司机 (driver)**:
   - 只能查看自己的信息

## 修复方案
删除宽松的"租户数据隔离 - profiles"策略，创建严格的基于角色的查看策略。
*/

-- ============================================================================
-- 1. 删除旧的宽松策略
-- ============================================================================
DROP POLICY IF EXISTS "租户数据隔离 - profiles" ON profiles;

-- ============================================================================
-- 2. 创建新的 SELECT 策略
-- ============================================================================

-- 2.1 老板账号可以查看自己租户内的车队长和司机
CREATE POLICY "老板账号可以查看车队长和司机" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND role IN ('manager', 'driver')
    AND tenant_id = get_user_tenant_id()
  );

-- 2.2 车队长可以查看自己仓库的司机
CREATE POLICY "车队长可以查看司机" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND role = 'driver'
    AND tenant_id = get_user_tenant_id()
    AND id IN (
      -- 查找车队长管理的仓库中的司机
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 3. 添加策略注释
-- ============================================================================
COMMENT ON POLICY "老板账号可以查看车队长和司机" ON profiles IS '老板账号可以查看自己租户内的车队长和司机，不能查看其他租户的用户';
COMMENT ON POLICY "车队长可以查看司机" ON profiles IS '车队长可以查看自己仓库的司机，不能查看其他仓库的司机';
