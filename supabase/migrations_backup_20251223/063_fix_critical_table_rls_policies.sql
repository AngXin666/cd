/*
# 修复关键表的 RLS 策略（P0 优先级）

## 修复的表
1. attendance（考勤记录）
2. piece_work_records（计件记录）
3. notifications（通知）

## 问题描述
这些表都存在宽松的"租户数据隔离"策略，允许同租户的所有用户查看所有数据。
这导致：
- 司机A可以查看司机B的考勤记录
- 司机A可以查看司机B的计件收入
- 用户A可以查看用户B的通知

## 修复方案
删除宽松策略，创建基于角色的严格权限控制策略。

## 权限规则
### 司机
- 只能查看自己的数据

### 车队长
- 可以查看自己仓库司机的数据
- 可以创建/更新/删除自己仓库司机的数据

### 老板
- 可以查看自己租户的所有数据
- 可以创建/更新/删除自己租户的所有数据

### 租赁管理员
- 可以查看所有数据
*/

-- ============================================================================
-- 1. 修复 attendance（考勤记录）表
-- ============================================================================

-- 1.1 删除旧的宽松策略
DROP POLICY IF EXISTS "租户数据隔离 - attendance" ON attendance;

-- 1.2 创建 SELECT 策略
-- 司机只能查看自己的考勤
CREATE POLICY "司机可以查看自己的考勤" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    is_driver(auth.uid())
    AND driver_id = auth.uid()
  );

-- 车队长可以查看自己仓库司机的考勤
CREATE POLICY "车队长可以查看仓库司机的考勤" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 老板可以查看所有考勤
CREATE POLICY "老板可以查看所有考勤" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以查看所有考勤
CREATE POLICY "租赁管理员可以查看所有考勤" ON attendance
  FOR SELECT
  TO authenticated
  USING (is_lease_admin());

-- 1.3 创建 INSERT 策略
-- 车队长可以创建自己仓库司机的考勤
CREATE POLICY "车队长可以创建仓库司机的考勤" ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 老板可以创建所有考勤
CREATE POLICY "老板可以创建所有考勤" ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以创建所有考勤
CREATE POLICY "租赁管理员可以创建所有考勤" ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (is_lease_admin());

-- 1.4 创建 UPDATE 策略
-- 车队长可以更新自己仓库司机的考勤
CREATE POLICY "车队长可以更新仓库司机的考勤" ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
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
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 老板可以更新所有考勤
CREATE POLICY "老板可以更新所有考勤" ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以更新所有考勤
CREATE POLICY "租赁管理员可以更新所有考勤" ON attendance
  FOR UPDATE
  TO authenticated
  USING (is_lease_admin())
  WITH CHECK (is_lease_admin());

-- 1.5 创建 DELETE 策略
-- 车队长可以删除自己仓库司机的考勤
CREATE POLICY "车队长可以删除仓库司机的考勤" ON attendance
  FOR DELETE
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 老板可以删除所有考勤
CREATE POLICY "老板可以删除所有考勤" ON attendance
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以删除所有考勤
CREATE POLICY "租赁管理员可以删除所有考勤" ON attendance
  FOR DELETE
  TO authenticated
  USING (is_lease_admin());

-- ============================================================================
-- 2. 修复 piece_work_records（计件记录）表
-- ============================================================================

-- 2.1 删除旧的宽松策略
DROP POLICY IF EXISTS "租户数据隔离 - piece_work_records" ON piece_work_records;

-- 2.2 创建 SELECT 策略
-- 司机只能查看自己的计件记录
CREATE POLICY "司机可以查看自己的计件记录" ON piece_work_records
  FOR SELECT
  TO authenticated
  USING (
    is_driver(auth.uid())
    AND driver_id = auth.uid()
  );

-- 车队长可以查看自己仓库司机的计件记录
CREATE POLICY "车队长可以查看仓库司机的计件记录" ON piece_work_records
  FOR SELECT
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 老板可以查看所有计件记录
CREATE POLICY "老板可以查看所有计件记录" ON piece_work_records
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以查看所有计件记录
CREATE POLICY "租赁管理员可以查看所有计件记录" ON piece_work_records
  FOR SELECT
  TO authenticated
  USING (is_lease_admin());

-- 2.3 创建 INSERT 策略
-- 车队长可以创建自己仓库司机的计件记录
CREATE POLICY "车队长可以创建仓库司机的计件记录" ON piece_work_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 老板可以创建所有计件记录
CREATE POLICY "老板可以创建所有计件记录" ON piece_work_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以创建所有计件记录
CREATE POLICY "租赁管理员可以创建所有计件记录" ON piece_work_records
  FOR INSERT
  TO authenticated
  WITH CHECK (is_lease_admin());

-- 2.4 创建 UPDATE 策略
-- 车队长可以更新自己仓库司机的计件记录
CREATE POLICY "车队长可以更新仓库司机的计件记录" ON piece_work_records
  FOR UPDATE
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
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
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 老板可以更新所有计件记录
CREATE POLICY "老板可以更新所有计件记录" ON piece_work_records
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以更新所有计件记录
CREATE POLICY "租赁管理员可以更新所有计件记录" ON piece_work_records
  FOR UPDATE
  TO authenticated
  USING (is_lease_admin())
  WITH CHECK (is_lease_admin());

-- 2.5 创建 DELETE 策略
-- 车队长可以删除自己仓库司机的计件记录
CREATE POLICY "车队长可以删除仓库司机的计件记录" ON piece_work_records
  FOR DELETE
  TO authenticated
  USING (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
    AND driver_id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 老板可以删除所有计件记录
CREATE POLICY "老板可以删除所有计件记录" ON piece_work_records
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以删除所有计件记录
CREATE POLICY "租赁管理员可以删除所有计件记录" ON piece_work_records
  FOR DELETE
  TO authenticated
  USING (is_lease_admin());

-- ============================================================================
-- 3. 修复 notifications（通知）表
-- ============================================================================

-- 3.1 删除旧的宽松策略
DROP POLICY IF EXISTS "租户数据隔离 - notifications" ON notifications;

-- 3.2 创建 SELECT 策略
-- 用户只能查看发给自己的通知
CREATE POLICY "用户可以查看自己的通知" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 租赁管理员可以查看所有通知
CREATE POLICY "租赁管理员可以查看所有通知" ON notifications
  FOR SELECT
  TO authenticated
  USING (is_lease_admin());

-- 3.3 创建 INSERT 策略
-- 老板可以创建通知
CREATE POLICY "老板可以创建通知" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 车队长可以创建通知
CREATE POLICY "车队长可以创建通知" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_manager(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以创建通知
CREATE POLICY "租赁管理员可以创建通知" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_lease_admin());

-- 3.4 创建 UPDATE 策略
-- 用户可以更新自己的通知（标记为已读）
CREATE POLICY "用户可以更新自己的通知" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 租赁管理员可以更新所有通知
CREATE POLICY "租赁管理员可以更新所有通知" ON notifications
  FOR UPDATE
  TO authenticated
  USING (is_lease_admin())
  WITH CHECK (is_lease_admin());

-- 3.5 创建 DELETE 策略
-- 用户可以删除自己的通知
CREATE POLICY "用户可以删除自己的通知" ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 租赁管理员可以删除所有通知
CREATE POLICY "租赁管理员可以删除所有通知" ON notifications
  FOR DELETE
  TO authenticated
  USING (is_lease_admin());

-- ============================================================================
-- 4. 添加性能优化索引
-- ============================================================================

-- 优化 driver_warehouses 查询
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_warehouse_driver 
  ON driver_warehouses(warehouse_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_warehouses_driver 
  ON driver_warehouses(driver_id);

-- 优化 manager_warehouses 查询
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_manager_warehouse 
  ON manager_warehouses(manager_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_manager_warehouses_warehouse 
  ON manager_warehouses(warehouse_id);

-- 优化 attendance 查询
CREATE INDEX IF NOT EXISTS idx_attendance_driver_tenant 
  ON attendance(driver_id, tenant_id);

-- 优化 piece_work_records 查询
CREATE INDEX IF NOT EXISTS idx_piece_work_records_driver_tenant 
  ON piece_work_records(driver_id, tenant_id);

-- 优化 notifications 查询
CREATE INDEX IF NOT EXISTS idx_notifications_user 
  ON notifications(user_id);

-- ============================================================================
-- 5. 添加策略注释
-- ============================================================================

-- attendance 表注释
COMMENT ON POLICY "司机可以查看自己的考勤" ON attendance IS '司机只能查看自己的考勤记录';
COMMENT ON POLICY "车队长可以查看仓库司机的考勤" ON attendance IS '车队长可以查看自己管理的仓库中司机的考勤记录';
COMMENT ON POLICY "老板可以查看所有考勤" ON attendance IS '老板可以查看自己租户内所有司机的考勤记录';
COMMENT ON POLICY "租赁管理员可以查看所有考勤" ON attendance IS '租赁管理员可以查看所有租户的考勤记录';

-- piece_work_records 表注释
COMMENT ON POLICY "司机可以查看自己的计件记录" ON piece_work_records IS '司机只能查看自己的计件工作记录';
COMMENT ON POLICY "车队长可以查看仓库司机的计件记录" ON piece_work_records IS '车队长可以查看自己管理的仓库中司机的计件记录';
COMMENT ON POLICY "老板可以查看所有计件记录" ON piece_work_records IS '老板可以查看自己租户内所有司机的计件记录';
COMMENT ON POLICY "租赁管理员可以查看所有计件记录" ON piece_work_records IS '租赁管理员可以查看所有租户的计件记录';

-- notifications 表注释
COMMENT ON POLICY "用户可以查看自己的通知" ON notifications IS '用户只能查看发给自己的通知';
COMMENT ON POLICY "租赁管理员可以查看所有通知" ON notifications IS '租赁管理员可以查看所有通知';
