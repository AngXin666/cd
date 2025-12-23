/*
# 优化权限体系设计

## 核心变更

### 1. 老板账号可以创建平级账号
- 最多创建3个平级账号
- 平级账号有两种权限模板：完整权限、仅查看权限

### 2. 平级账号权限模板
- 完整权限（full）：可以对车队长和司机执行查看、增加、修改、停用操作
- 仅查看权限（readonly）：只能查看数据，不能修改

### 3. 车队长权限配置
- 权限开关（manager_permissions_enabled）控制是否可以修改司机信息
- 开启时：可以查看、增加、修改、停用司机
- 关闭时：只能查看司机信息

## 实施步骤
1. 创建权限模板枚举类型
2. 添加 peer_account_permission 字段
3. 创建平级账号数量检查函数
4. 创建平级账号权限检查函数
5. 修改 profiles 表 RLS 策略
6. 修改其他表的 RLS 策略
*/

-- ============================================================================
-- 1. 创建权限模板枚举类型
-- ============================================================================

CREATE TYPE peer_permission_type AS ENUM ('full', 'readonly');

COMMENT ON TYPE peer_permission_type IS '平级账号权限模板：full=完整权限，readonly=仅查看权限';

-- ============================================================================
-- 2. 添加 peer_account_permission 字段
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN peer_account_permission peer_permission_type DEFAULT 'full';

COMMENT ON COLUMN profiles.peer_account_permission IS '平级账号的权限模板：full=完整权限（可增删改查），readonly=仅查看权限（只能查看）';

-- ============================================================================
-- 3. 创建平级账号数量检查函数
-- ============================================================================

CREATE OR REPLACE FUNCTION check_peer_account_limit(p_main_account_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) < 3
  FROM profiles
  WHERE main_account_id = p_main_account_id
  AND role = 'super_admin';
$$;

COMMENT ON FUNCTION check_peer_account_limit IS '检查老板账号创建的平级账号数量是否未超过3个';

-- ============================================================================
-- 4. 创建平级账号权限检查函数
-- ============================================================================

-- 4.1 检查平级账号是否有完整权限
CREATE OR REPLACE FUNCTION has_full_permission(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id
    AND role = 'super_admin'
    AND main_account_id IS NOT NULL
    AND peer_account_permission = 'full'
  );
$$;

COMMENT ON FUNCTION has_full_permission IS '检查平级账号是否有完整权限（可增删改查）';

-- 4.2 检查平级账号是否只有查看权限
CREATE OR REPLACE FUNCTION has_readonly_permission(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id
    AND role = 'super_admin'
    AND main_account_id IS NOT NULL
    AND peer_account_permission = 'readonly'
  );
$$;

COMMENT ON FUNCTION has_readonly_permission IS '检查平级账号是否只有查看权限（只能查看）';

-- ============================================================================
-- 5. 修改 profiles 表 RLS 策略
-- ============================================================================

-- 5.1 删除旧的 INSERT 策略
DROP POLICY IF EXISTS "老板和平级账号创建车队长和司机" ON profiles;
DROP POLICY IF EXISTS "车队长创建仓库司机" ON profiles;
DROP POLICY IF EXISTS "用户创建自己的账号" ON profiles;

-- 5.2 创建新的 INSERT 策略

-- 老板账号可以创建平级账号、车队长和司机
CREATE POLICY "老板账号创建平级账号车队长和司机" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_main_boss(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND (
      -- 创建平级账号（最多3个）
      (role = 'super_admin' AND main_account_id = auth.uid() AND check_peer_account_limit(auth.uid()))
      OR
      -- 创建车队长和司机
      (role IN ('manager', 'driver'))
    )
  );

-- 平级账号（完整权限）可以创建车队长和司机
CREATE POLICY "平级账号完整权限创建车队长和司机" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_full_permission(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  );

-- 车队长（权限启用）可以创建仓库司机
CREATE POLICY "车队长创建仓库司机" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role = 'driver'
    AND id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 用户创建自己的账号（首次注册）
CREATE POLICY "用户创建自己的账号" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 5.3 删除旧的 UPDATE 策略
DROP POLICY IF EXISTS "老板和平级账号更新租户用户" ON profiles;
DROP POLICY IF EXISTS "车队长更新仓库司机" ON profiles;
DROP POLICY IF EXISTS "司机更新自己的账号" ON profiles;
DROP POLICY IF EXISTS "用户更新自己的账号" ON profiles;

-- 5.4 创建新的 UPDATE 策略

-- 老板账号可以更新平级账号、车队长和司机
CREATE POLICY "老板账号更新租户用户" ON profiles
  FOR UPDATE TO authenticated
  USING (
    is_main_boss(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND (
      -- 更新平级账号
      (role = 'super_admin' AND main_account_id = auth.uid())
      OR
      -- 更新车队长和司机
      (role IN ('manager', 'driver'))
    )
  )
  WITH CHECK (
    is_main_boss(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND (
      (role = 'super_admin' AND main_account_id = auth.uid())
      OR
      (role IN ('manager', 'driver'))
    )
  );

-- 平级账号（完整权限）可以更新车队长和司机
CREATE POLICY "平级账号完整权限更新车队长和司机" ON profiles
  FOR UPDATE TO authenticated
  USING (
    has_full_permission(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  )
  WITH CHECK (
    has_full_permission(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  );

-- 车队长（权限启用）可以更新仓库司机
CREATE POLICY "车队长更新仓库司机" ON profiles
  FOR UPDATE TO authenticated
  USING (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role = 'driver'
    AND id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role = 'driver'
    AND id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 司机可以更新自己的账号
CREATE POLICY "司机更新自己的账号" ON profiles
  FOR UPDATE TO authenticated
  USING (is_driver(auth.uid()) AND id = auth.uid())
  WITH CHECK (is_driver(auth.uid()) AND id = auth.uid());

-- 用户可以更新自己的账号
CREATE POLICY "用户更新自己的账号" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5.5 删除旧的 DELETE 策略
DROP POLICY IF EXISTS "老板和平级账号删除租户用户" ON profiles;
DROP POLICY IF EXISTS "车队长删除仓库司机" ON profiles;
DROP POLICY IF EXISTS "司机删除自己的账号" ON profiles;

-- 5.6 创建新的 DELETE 策略

-- 老板账号可以删除平级账号、车队长和司机
CREATE POLICY "老板账号删除租户用户" ON profiles
  FOR DELETE TO authenticated
  USING (
    is_main_boss(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND (
      (role = 'super_admin' AND main_account_id = auth.uid())
      OR
      (role IN ('manager', 'driver'))
    )
  );

-- 平级账号（完整权限）可以删除车队长和司机
CREATE POLICY "平级账号完整权限删除车队长和司机" ON profiles
  FOR DELETE TO authenticated
  USING (
    has_full_permission(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role IN ('manager', 'driver')
  );

-- 车队长（权限启用）可以删除仓库司机
CREATE POLICY "车队长删除仓库司机" ON profiles
  FOR DELETE TO authenticated
  USING (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND role = 'driver'
    AND id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 司机可以删除自己的账号
CREATE POLICY "司机删除自己的账号" ON profiles
  FOR DELETE TO authenticated
  USING (is_driver(auth.uid()) AND id = auth.uid());

-- ============================================================================
-- 6. 修改其他表的 RLS 策略（attendance、piece_work_records）
-- ============================================================================

-- 6.1 修改 attendance 表的 INSERT 策略
DROP POLICY IF EXISTS "老板和平级账号创建租户考勤" ON attendance;

CREATE POLICY "老板账号创建租户考勤" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "平级账号完整权限创建租户考勤" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (has_full_permission(auth.uid()) AND tenant_id = get_user_tenant_id());

-- 6.2 修改 attendance 表的 UPDATE 策略
DROP POLICY IF EXISTS "老板和平级账号更新租户考勤" ON attendance;

CREATE POLICY "老板账号更新租户考勤" ON attendance
  FOR UPDATE TO authenticated
  USING (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "平级账号完整权限更新租户考勤" ON attendance
  FOR UPDATE TO authenticated
  USING (has_full_permission(auth.uid()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_full_permission(auth.uid()) AND tenant_id = get_user_tenant_id());

-- 6.3 修改 attendance 表的 DELETE 策略
DROP POLICY IF EXISTS "老板和平级账号删除租户考勤" ON attendance;

CREATE POLICY "老板账号删除租户考勤" ON attendance
  FOR DELETE TO authenticated
  USING (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "平级账号完整权限删除租户考勤" ON attendance
  FOR DELETE TO authenticated
  USING (has_full_permission(auth.uid()) AND tenant_id = get_user_tenant_id());

-- 6.4 修改 attendance 表的 SELECT 策略
DROP POLICY IF EXISTS "老板和平级账号查看租户考勤" ON attendance;

CREATE POLICY "老板账号查看租户考勤" ON attendance
  FOR SELECT TO authenticated
  USING (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "平级账号查看租户考勤" ON attendance
  FOR SELECT TO authenticated
  USING (is_peer_admin(auth.uid()) AND tenant_id = get_user_tenant_id());

-- 6.5 修改 piece_work_records 表的 INSERT 策略
DROP POLICY IF EXISTS "老板和平级账号创建租户计件记录" ON piece_work_records;

CREATE POLICY "老板账号创建租户计件记录" ON piece_work_records
  FOR INSERT TO authenticated
  WITH CHECK (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "平级账号完整权限创建租户计件记录" ON piece_work_records
  FOR INSERT TO authenticated
  WITH CHECK (has_full_permission(auth.uid()) AND tenant_id = get_user_tenant_id());

-- 6.6 修改 piece_work_records 表的 UPDATE 策略
DROP POLICY IF EXISTS "老板和平级账号更新租户计件记录" ON piece_work_records;

CREATE POLICY "老板账号更新租户计件记录" ON piece_work_records
  FOR UPDATE TO authenticated
  USING (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "平级账号完整权限更新租户计件记录" ON piece_work_records
  FOR UPDATE TO authenticated
  USING (has_full_permission(auth.uid()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_full_permission(auth.uid()) AND tenant_id = get_user_tenant_id());

-- 6.7 修改 piece_work_records 表的 DELETE 策略
DROP POLICY IF EXISTS "老板和平级账号删除租户计件记录" ON piece_work_records;

CREATE POLICY "老板账号删除租户计件记录" ON piece_work_records
  FOR DELETE TO authenticated
  USING (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "平级账号完整权限删除租户计件记录" ON piece_work_records
  FOR DELETE TO authenticated
  USING (has_full_permission(auth.uid()) AND tenant_id = get_user_tenant_id());

-- 6.8 修改 piece_work_records 表的 SELECT 策略
DROP POLICY IF EXISTS "老板和平级账号查看租户计件记录" ON piece_work_records;

CREATE POLICY "老板账号查看租户计件记录" ON piece_work_records
  FOR SELECT TO authenticated
  USING (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "平级账号查看租户计件记录" ON piece_work_records
  FOR SELECT TO authenticated
  USING (is_peer_admin(auth.uid()) AND tenant_id = get_user_tenant_id());

-- 6.9 修改 notifications 表的 INSERT 策略
DROP POLICY IF EXISTS "老板和平级账号创建租户通知" ON notifications;

CREATE POLICY "老板账号创建租户通知" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_main_boss(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "平级账号完整权限创建租户通知" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (has_full_permission(auth.uid()) AND tenant_id = get_user_tenant_id());

-- ============================================================================
-- 7. 添加策略注释
-- ============================================================================

COMMENT ON POLICY "老板账号创建平级账号车队长和司机" ON profiles IS '老板账号可以创建平级账号（最多3个）、车队长和司机';
COMMENT ON POLICY "平级账号完整权限创建车队长和司机" ON profiles IS '平级账号（完整权限）可以创建车队长和司机';
COMMENT ON POLICY "老板账号更新租户用户" ON profiles IS '老板账号可以更新平级账号、车队长和司机';
COMMENT ON POLICY "平级账号完整权限更新车队长和司机" ON profiles IS '平级账号（完整权限）可以更新车队长和司机';
COMMENT ON POLICY "老板账号删除租户用户" ON profiles IS '老板账号可以删除平级账号、车队长和司机';
COMMENT ON POLICY "平级账号完整权限删除车队长和司机" ON profiles IS '平级账号（完整权限）可以删除车队长和司机';
