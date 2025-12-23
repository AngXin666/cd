/*
# 修复 profiles 表的角色权限控制

## 问题描述
当前的 RLS 策略过于宽松，没有根据用户角色限制可以操作的目标用户类型。

## 正确的权限规则
1. **租赁管理员 (lease_admin)**: 
   - 只能创建、修改、停用、删除：老板账号 (super_admin) 和平级账号 (lease_admin)
   - 不能操作：车队长 (manager) 和司机 (driver)

2. **老板账号 (super_admin)**:
   - 可以创建、修改、停用、删除：车队长 (manager) 和司机 (driver)
   - 不能操作：租赁管理员 (lease_admin) 和其他老板账号 (super_admin)

3. **车队长 (manager)**:
   - 可以创建、修改、停用、删除：司机 (driver)
   - 不能操作：租赁管理员、老板账号、其他车队长

4. **司机 (driver)**:
   - 只能查看和修改自己的信息
   - 不能创建、停用、删除任何用户

## 修复方案
重新设计 profiles 表的 RLS 策略，添加基于角色的权限检查。
*/

-- ============================================================================
-- 1. 删除旧的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "租赁管理员可以插入新用户" ON profiles;
DROP POLICY IF EXISTS "Managers can insert driver profiles" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以更新所有用户" ON profiles;
DROP POLICY IF EXISTS "Managers can update driver profiles" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以删除用户" ON profiles;
DROP POLICY IF EXISTS "Managers can delete driver profiles" ON profiles;

-- ============================================================================
-- 2. 创建新的 INSERT 策略
-- ============================================================================

-- 2.1 租赁管理员只能创建老板账号和平级账号
CREATE POLICY "租赁管理员可以创建老板账号和平级账号" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_lease_admin()
    AND role IN ('lease_admin', 'super_admin')
  );

-- 2.2 老板账号可以创建车队长和司机
CREATE POLICY "老板账号可以创建车队长和司机" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    AND role IN ('manager', 'driver')
  );

-- 2.3 车队长只能创建司机
CREATE POLICY "车队长可以创建司机" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_manager(auth.uid())
    AND role = 'driver'
  );

-- ============================================================================
-- 3. 创建新的 UPDATE 策略
-- ============================================================================

-- 3.1 租赁管理员只能更新老板账号和平级账号
CREATE POLICY "租赁管理员可以更新老板账号和平级账号" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_lease_admin()
    AND role IN ('lease_admin', 'super_admin')
  )
  WITH CHECK (
    is_lease_admin()
    AND role IN ('lease_admin', 'super_admin')
  );

-- 3.2 老板账号可以更新车队长和司机
CREATE POLICY "老板账号可以更新车队长和司机" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND role IN ('manager', 'driver')
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    AND role IN ('manager', 'driver')
  );

-- 3.3 车队长只能更新司机
CREATE POLICY "车队长可以更新司机" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND role = 'driver'
  )
  WITH CHECK (
    is_manager(auth.uid())
    AND role = 'driver'
  );

-- ============================================================================
-- 4. 创建新的 DELETE 策略
-- ============================================================================

-- 4.1 租赁管理员只能删除老板账号和平级账号
CREATE POLICY "租赁管理员可以删除老板账号和平级账号" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    is_lease_admin()
    AND role IN ('lease_admin', 'super_admin')
  );

-- 4.2 老板账号可以删除车队长和司机
CREATE POLICY "老板账号可以删除车队长和司机" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND role IN ('manager', 'driver')
  );

-- 4.3 车队长只能删除司机
CREATE POLICY "车队长可以删除司机" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND role = 'driver'
  );

-- ============================================================================
-- 5. 添加注释
-- ============================================================================
COMMENT ON POLICY "租赁管理员可以创建老板账号和平级账号" ON profiles IS '租赁管理员只能创建老板账号和平级账号，不能创建车队长和司机';
COMMENT ON POLICY "老板账号可以创建车队长和司机" ON profiles IS '老板账号可以创建车队长和司机，不能创建租赁管理员和其他老板账号';
COMMENT ON POLICY "车队长可以创建司机" ON profiles IS '车队长只能创建司机，不能创建其他角色';

COMMENT ON POLICY "租赁管理员可以更新老板账号和平级账号" ON profiles IS '租赁管理员只能更新老板账号和平级账号，不能更新车队长和司机';
COMMENT ON POLICY "老板账号可以更新车队长和司机" ON profiles IS '老板账号可以更新车队长和司机，不能更新租赁管理员和其他老板账号';
COMMENT ON POLICY "车队长可以更新司机" ON profiles IS '车队长只能更新司机，不能更新其他角色';

COMMENT ON POLICY "租赁管理员可以删除老板账号和平级账号" ON profiles IS '租赁管理员只能删除老板账号和平级账号，不能删除车队长和司机';
COMMENT ON POLICY "老板账号可以删除车队长和司机" ON profiles IS '老板账号可以删除车队长和司机，不能删除租赁管理员和其他老板账号';
COMMENT ON POLICY "车队长可以删除司机" ON profiles IS '车队长只能删除司机，不能删除其他角色';
