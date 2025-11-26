/*
# 重新设计 profiles 表的 RLS 策略

## 权限规则

### 租赁管理员 (lease_admin)
- 查看：老板、平级账号
- 增加：老板、平级账号
- 修改：老板、平级账号
- 删除：老板、平级账号
- 无权管辖：车队长、司机

### 老板账号 (super_admin, main_account_id IS NULL)
- 查看：车队长、司机、平级账号
- 增加：车队长、司机（不能创建平级账号）
- 修改：车队长、司机、平级账号
- 删除：车队长、司机、平级账号

### 平级账号 (super_admin, main_account_id IS NOT NULL)
- 查看：车队长、司机
- 增加：车队长、司机
- 修改：车队长、司机
- 删除：车队长、司机

### 车队长 (manager, 权限启用)
- 查看：自己仓库的司机
- 增加：自己仓库的司机
- 修改：自己仓库的司机
- 删除：自己仓库的司机

### 车队长 (manager, 权限禁止)
- 查看：自己仓库的司机
- 增加：禁止
- 修改：禁止
- 删除：禁止

### 司机 (driver)
- 查看：自己
- 修改：自己
*/

-- ============================================================================
-- 1. 删除所有旧的 profiles 表策略
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以查看所有用户" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以删除老板账号和平级账号" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以创建老板账号和平级账号" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以更新老板账号和平级账号" ON profiles;
DROP POLICY IF EXISTS "老板账号可以查看车队长和司机" ON profiles;
DROP POLICY IF EXISTS "老板账号可以创建车队长和司机" ON profiles;
DROP POLICY IF EXISTS "老板账号可以更新车队长和司机" ON profiles;
DROP POLICY IF EXISTS "老板账号可以删除车队长和司机" ON profiles;
DROP POLICY IF EXISTS "车队长可以查看司机" ON profiles;
DROP POLICY IF EXISTS "车队长可以创建司机" ON profiles;
DROP POLICY IF EXISTS "车队长可以更新司机" ON profiles;
DROP POLICY IF EXISTS "车队长可以删除司机" ON profiles;

-- ============================================================================
-- 2. SELECT 策略
-- ============================================================================

-- 2.1 用户可以查看自己
CREATE POLICY "用户可以查看自己" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2.2 租赁管理员可以查看老板和平级账号
CREATE POLICY "租赁管理员可以查看老板和平级账号" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_lease_admin()
    AND role IN ('lease_admin', 'super_admin')
  );

-- 2.3 老板账号可以查看车队长、司机和平级账号
CREATE POLICY "老板账号可以查看车队长司机和平级账号" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_main_boss(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND (
      role IN ('manager', 'driver')
      OR (role = 'super_admin' AND main_account_id IS NOT NULL)
    )
  );

-- 2.4 平级账号可以查看车队长和司机
CREATE POLICY "平级账号可以查看车队长和司机" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_peer_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  );

-- 2.5 车队长可以查看自己仓库的司机
CREATE POLICY "车队长可以查看自己仓库的司机" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND role = 'driver'
    AND tenant_id = get_user_tenant_id()
    AND id IN (
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
-- 3. INSERT 策略
-- ============================================================================

-- 3.1 租赁管理员可以创建老板和平级账号
CREATE POLICY "租赁管理员可以创建老板和平级账号" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_lease_admin()
    AND role IN ('lease_admin', 'super_admin')
  );

-- 3.2 老板账号可以创建车队长和司机（不能创建平级账号）
CREATE POLICY "老板账号可以创建车队长和司机" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_main_boss(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  );

-- 3.3 平级账号可以创建车队长和司机
CREATE POLICY "平级账号可以创建车队长和司机" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_peer_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  );

-- 3.4 车队长可以创建司机（权限启用时）
CREATE POLICY "车队长可以创建司机" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role = 'driver'
  );

-- ============================================================================
-- 4. UPDATE 策略
-- ============================================================================

-- 4.1 用户可以更新自己
CREATE POLICY "用户可以更新自己" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 4.2 租赁管理员可以更新老板和平级账号
CREATE POLICY "租赁管理员可以更新老板和平级账号" ON profiles
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

-- 4.3 老板账号可以更新车队长、司机和平级账号
CREATE POLICY "老板账号可以更新车队长司机和平级账号" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_main_boss(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND (
      role IN ('manager', 'driver')
      OR (role = 'super_admin' AND main_account_id IS NOT NULL)
    )
  )
  WITH CHECK (
    is_main_boss(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND (
      role IN ('manager', 'driver')
      OR (role = 'super_admin' AND main_account_id IS NOT NULL)
    )
  );

-- 4.4 平级账号可以更新车队长和司机
CREATE POLICY "平级账号可以更新车队长和司机" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_peer_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  )
  WITH CHECK (
    is_peer_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  );

-- 4.5 车队长可以更新自己仓库的司机（权限启用时）
CREATE POLICY "车队长可以更新自己仓库的司机" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND role = 'driver'
    AND tenant_id = get_user_tenant_id()
    AND id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND role = 'driver'
    AND tenant_id = get_user_tenant_id()
    AND id IN (
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
-- 5. DELETE 策略
-- ============================================================================

-- 5.1 租赁管理员可以删除老板和平级账号
CREATE POLICY "租赁管理员可以删除老板和平级账号" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    is_lease_admin()
    AND role IN ('lease_admin', 'super_admin')
  );

-- 5.2 老板账号可以删除车队长、司机和平级账号
CREATE POLICY "老板账号可以删除车队长司机和平级账号" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    is_main_boss(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND (
      role IN ('manager', 'driver')
      OR (role = 'super_admin' AND main_account_id IS NOT NULL)
    )
  );

-- 5.3 平级账号可以删除车队长和司机
CREATE POLICY "平级账号可以删除车队长和司机" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    is_peer_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  );

-- 5.4 车队长可以删除自己仓库的司机（权限启用时）
CREATE POLICY "车队长可以删除自己仓库的司机" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND role = 'driver'
    AND tenant_id = get_user_tenant_id()
    AND id IN (
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
-- 6. 添加策略注释
-- ============================================================================

COMMENT ON POLICY "用户可以查看自己" ON profiles IS '所有用户都可以查看自己的信息';
COMMENT ON POLICY "租赁管理员可以查看老板和平级账号" ON profiles IS '租赁管理员只能查看老板和平级账号，无权查看车队长和司机';
COMMENT ON POLICY "老板账号可以查看车队长司机和平级账号" ON profiles IS '老板账号可以查看自己租户内的车队长、司机和平级账号';
COMMENT ON POLICY "平级账号可以查看车队长和司机" ON profiles IS '平级账号可以查看自己租户内的车队长和司机';
COMMENT ON POLICY "车队长可以查看自己仓库的司机" ON profiles IS '车队长只能查看自己管理的仓库中的司机';

COMMENT ON POLICY "租赁管理员可以创建老板和平级账号" ON profiles IS '租赁管理员只能创建老板和平级账号';
COMMENT ON POLICY "老板账号可以创建车队长和司机" ON profiles IS '老板账号只能创建车队长和司机，不能创建平级账号';
COMMENT ON POLICY "平级账号可以创建车队长和司机" ON profiles IS '平级账号可以创建车队长和司机';
COMMENT ON POLICY "车队长可以创建司机" ON profiles IS '车队长可以创建司机（权限启用时）';

COMMENT ON POLICY "用户可以更新自己" ON profiles IS '所有用户都可以更新自己的信息';
COMMENT ON POLICY "租赁管理员可以更新老板和平级账号" ON profiles IS '租赁管理员可以更新老板和平级账号';
COMMENT ON POLICY "老板账号可以更新车队长司机和平级账号" ON profiles IS '老板账号可以更新车队长、司机和平级账号';
COMMENT ON POLICY "平级账号可以更新车队长和司机" ON profiles IS '平级账号可以更新车队长和司机';
COMMENT ON POLICY "车队长可以更新自己仓库的司机" ON profiles IS '车队长可以更新自己仓库的司机（权限启用时）';

COMMENT ON POLICY "租赁管理员可以删除老板和平级账号" ON profiles IS '租赁管理员可以删除老板和平级账号';
COMMENT ON POLICY "老板账号可以删除车队长司机和平级账号" ON profiles IS '老板账号可以删除车队长、司机和平级账号';
COMMENT ON POLICY "平级账号可以删除车队长和司机" ON profiles IS '平级账号可以删除车队长和司机';
COMMENT ON POLICY "车队长可以删除自己仓库的司机" ON profiles IS '车队长可以删除自己仓库的司机（权限启用时）';
