/*
# 修复高风险表的 RLS 策略

## 修复的表
1. attendance（考勤记录）
2. piece_work_records（计件记录）
3. notifications（通知）

## 权限规则

### 租赁管理员
- 可以查看/增删改所有数据

### 老板账号和平级账号
- 可以查看/增删改自己租户内的所有数据

### 车队长（权限启用）
- 可以查看/增删改自己仓库司机的数据

### 车队长（权限禁止）
- 只能查看自己仓库司机的数据

### 司机
- attendance: 只能查看自己的考勤
- piece_work_records: 只能查看自己的计件记录
- notifications: 可以查看/修改/删除自己的通知
*/

-- ============================================================================
-- 1. 修复 attendance（考勤记录）表
-- ============================================================================

-- 1.1 删除旧策略
DROP POLICY IF EXISTS "租户数据隔离 - attendance" ON attendance;
DROP POLICY IF EXISTS "司机可以查看自己的考勤" ON attendance;
DROP POLICY IF EXISTS "车队长可以查看仓库司机的考勤" ON attendance;
DROP POLICY IF EXISTS "老板可以查看所有考勤" ON attendance;
DROP POLICY IF EXISTS "租赁管理员可以查看所有考勤" ON attendance;
DROP POLICY IF EXISTS "车队长可以创建仓库司机的考勤" ON attendance;
DROP POLICY IF EXISTS "老板可以创建所有考勤" ON attendance;
DROP POLICY IF EXISTS "租赁管理员可以创建所有考勤" ON attendance;
DROP POLICY IF EXISTS "车队长可以更新仓库司机的考勤" ON attendance;
DROP POLICY IF EXISTS "老板可以更新所有考勤" ON attendance;
DROP POLICY IF EXISTS "租赁管理员可以更新所有考勤" ON attendance;
DROP POLICY IF EXISTS "车队长可以删除仓库司机的考勤" ON attendance;
DROP POLICY IF EXISTS "老板可以删除所有考勤" ON attendance;
DROP POLICY IF EXISTS "租赁管理员可以删除所有考勤" ON attendance;

-- 1.2 创建 SELECT 策略
CREATE POLICY "司机查看自己的考勤" ON attendance
  FOR SELECT TO authenticated
  USING (is_driver(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "车队长查看仓库司机的考勤" ON attendance
  FOR SELECT TO authenticated
  USING (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND user_id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "老板和平级账号查看租户考勤" ON attendance
  FOR SELECT TO authenticated
  USING (
    (is_main_boss(auth.uid()) OR is_peer_admin(auth.uid()))
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "租赁管理员查看所有考勤" ON attendance
  FOR SELECT TO authenticated
  USING (is_lease_admin());

-- 1.3 创建 INSERT 策略
CREATE POLICY "车队长创建仓库司机的考勤" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND user_id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "老板和平级账号创建租户考勤" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_main_boss(auth.uid()) OR is_peer_admin(auth.uid()))
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "租赁管理员创建所有考勤" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (is_lease_admin());

-- 1.4 创建 UPDATE 策略
CREATE POLICY "车队长更新仓库司机的考勤" ON attendance
  FOR UPDATE TO authenticated
  USING (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND user_id IN (
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
    AND user_id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "老板和平级账号更新租户考勤" ON attendance
  FOR UPDATE TO authenticated
  USING ((is_main_boss(auth.uid()) OR is_peer_admin(auth.uid())) AND tenant_id = get_user_tenant_id())
  WITH CHECK ((is_main_boss(auth.uid()) OR is_peer_admin(auth.uid())) AND tenant_id = get_user_tenant_id());

CREATE POLICY "租赁管理员更新所有考勤" ON attendance
  FOR UPDATE TO authenticated
  USING (is_lease_admin())
  WITH CHECK (is_lease_admin());

-- 1.5 创建 DELETE 策略
CREATE POLICY "车队长删除仓库司机的考勤" ON attendance
  FOR DELETE TO authenticated
  USING (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND user_id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "老板和平级账号删除租户考勤" ON attendance
  FOR DELETE TO authenticated
  USING ((is_main_boss(auth.uid()) OR is_peer_admin(auth.uid())) AND tenant_id = get_user_tenant_id());

CREATE POLICY "租赁管理员删除所有考勤" ON attendance
  FOR DELETE TO authenticated
  USING (is_lease_admin());

-- ============================================================================
-- 2. 修复 piece_work_records（计件记录）表
-- ============================================================================

-- 2.1 删除旧策略
DROP POLICY IF EXISTS "租户数据隔离 - piece_work_records" ON piece_work_records;
DROP POLICY IF EXISTS "司机可以查看自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "车队长可以查看仓库司机的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "老板可以查看所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "租赁管理员可以查看所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "车队长可以创建仓库司机的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "老板可以创建所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "租赁管理员可以创建所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "车队长可以更新仓库司机的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "老板可以更新所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "租赁管理员可以更新所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "车队长可以删除仓库司机的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "老板可以删除所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "租赁管理员可以删除所有计件记录" ON piece_work_records;

-- 2.2 创建 SELECT 策略
CREATE POLICY "司机查看自己的计件记录" ON piece_work_records
  FOR SELECT TO authenticated
  USING (is_driver(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "车队长查看仓库司机的计件记录" ON piece_work_records
  FOR SELECT TO authenticated
  USING (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND user_id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "老板和平级账号查看租户计件记录" ON piece_work_records
  FOR SELECT TO authenticated
  USING (
    (is_main_boss(auth.uid()) OR is_peer_admin(auth.uid()))
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "租赁管理员查看所有计件记录" ON piece_work_records
  FOR SELECT TO authenticated
  USING (is_lease_admin());

-- 2.3 创建 INSERT 策略
CREATE POLICY "车队长创建仓库司机的计件记录" ON piece_work_records
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND user_id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "老板和平级账号创建租户计件记录" ON piece_work_records
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_main_boss(auth.uid()) OR is_peer_admin(auth.uid()))
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "租赁管理员创建所有计件记录" ON piece_work_records
  FOR INSERT TO authenticated
  WITH CHECK (is_lease_admin());

-- 2.4 创建 UPDATE 策略
CREATE POLICY "车队长更新仓库司机的计件记录" ON piece_work_records
  FOR UPDATE TO authenticated
  USING (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND user_id IN (
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
    AND user_id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "老板和平级账号更新租户计件记录" ON piece_work_records
  FOR UPDATE TO authenticated
  USING ((is_main_boss(auth.uid()) OR is_peer_admin(auth.uid())) AND tenant_id = get_user_tenant_id())
  WITH CHECK ((is_main_boss(auth.uid()) OR is_peer_admin(auth.uid())) AND tenant_id = get_user_tenant_id());

CREATE POLICY "租赁管理员更新所有计件记录" ON piece_work_records
  FOR UPDATE TO authenticated
  USING (is_lease_admin())
  WITH CHECK (is_lease_admin());

-- 2.5 创建 DELETE 策略
CREATE POLICY "车队长删除仓库司机的计件记录" ON piece_work_records
  FOR DELETE TO authenticated
  USING (
    is_manager(auth.uid())
    AND is_manager_permissions_enabled(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND user_id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "老板和平级账号删除租户计件记录" ON piece_work_records
  FOR DELETE TO authenticated
  USING ((is_main_boss(auth.uid()) OR is_peer_admin(auth.uid())) AND tenant_id = get_user_tenant_id());

CREATE POLICY "租赁管理员删除所有计件记录" ON piece_work_records
  FOR DELETE TO authenticated
  USING (is_lease_admin());

-- ============================================================================
-- 3. 修复 notifications（通知）表
-- ============================================================================

-- 3.1 删除旧策略
DROP POLICY IF EXISTS "租户数据隔离 - notifications" ON notifications;
DROP POLICY IF EXISTS "用户可以查看自己的通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以查看所有通知" ON notifications;
DROP POLICY IF EXISTS "老板可以创建通知" ON notifications;
DROP POLICY IF EXISTS "车队长可以创建通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以创建通知" ON notifications;
DROP POLICY IF EXISTS "用户可以更新自己的通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以更新所有通知" ON notifications;
DROP POLICY IF EXISTS "用户可以删除自己的通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以删除所有通知" ON notifications;

-- 3.2 创建 SELECT 策略
CREATE POLICY "用户查看自己的通知" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "租赁管理员查看所有通知" ON notifications
  FOR SELECT TO authenticated
  USING (is_lease_admin());

-- 3.3 创建 INSERT 策略
CREATE POLICY "老板和平级账号创建租户通知" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_main_boss(auth.uid()) OR is_peer_admin(auth.uid()))
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "车队长创建仓库司机的通知" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND user_id IN (
      SELECT dw.driver_id FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "租赁管理员创建所有通知" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_lease_admin());

-- 3.4 创建 UPDATE 策略
CREATE POLICY "用户更新自己的通知" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "租赁管理员更新所有通知" ON notifications
  FOR UPDATE TO authenticated
  USING (is_lease_admin())
  WITH CHECK (is_lease_admin());

-- 3.5 创建 DELETE 策略
CREATE POLICY "用户删除自己的通知" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "租赁管理员删除所有通知" ON notifications
  FOR DELETE TO authenticated
  USING (is_lease_admin());

-- ============================================================================
-- 4. 添加策略注释
-- ============================================================================

-- attendance 表注释
COMMENT ON POLICY "司机查看自己的考勤" ON attendance IS '司机只能查看自己的考勤记录';
COMMENT ON POLICY "车队长查看仓库司机的考勤" ON attendance IS '车队长可以查看自己管理的仓库中司机的考勤记录';
COMMENT ON POLICY "老板和平级账号查看租户考勤" ON attendance IS '老板和平级账号可以查看自己租户内所有司机的考勤记录';
COMMENT ON POLICY "租赁管理员查看所有考勤" ON attendance IS '租赁管理员可以查看所有租户的考勤记录';

-- piece_work_records 表注释
COMMENT ON POLICY "司机查看自己的计件记录" ON piece_work_records IS '司机只能查看自己的计件工作记录';
COMMENT ON POLICY "车队长查看仓库司机的计件记录" ON piece_work_records IS '车队长可以查看自己管理的仓库中司机的计件记录';
COMMENT ON POLICY "老板和平级账号查看租户计件记录" ON piece_work_records IS '老板和平级账号可以查看自己租户内所有司机的计件记录';
COMMENT ON POLICY "租赁管理员查看所有计件记录" ON piece_work_records IS '租赁管理员可以查看所有租户的计件记录';

-- notifications 表注释
COMMENT ON POLICY "用户查看自己的通知" ON notifications IS '用户只能查看发给自己的通知';
COMMENT ON POLICY "租赁管理员查看所有通知" ON notifications IS '租赁管理员可以查看所有通知';
