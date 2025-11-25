/*
# 多租户架构：更新 RLS 策略

## 说明
更新所有表的 RLS 策略，实现基于用户ID的数据隔离。

## 策略原则
1. 默认拒绝：未明确授权的访问一律拒绝
2. 最小权限：用户只能访问必要的数据
3. 显式授权：权限必须明确定义
4. 层级继承：高级角色继承低级角色的权限

## 权限矩阵
| 角色 | 自己创建的数据 | 同仓库数据 | 所有数据 |
|------|--------------|-----------|---------|
| 司机 | ✅ 读写 | ❌ | ❌ |
| 车队长 | ✅ 读写 | ✅ 读写 | ❌ |
| 老板 | ✅ 读写 | ✅ 读写 | ✅ 读写 |

## 变更内容
1. 删除旧的 RLS 策略
2. 创建新的基于 created_by 的 RLS 策略
3. 确保数据隔离的安全性
*/

-- ============================================
-- 1. warehouses（仓库表）RLS 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "司机查看分配的仓库" ON warehouses;
DROP POLICY IF EXISTS "管理员查看管理的仓库" ON warehouses;
DROP POLICY IF EXISTS "超级管理员查看所有仓库" ON warehouses;
DROP POLICY IF EXISTS "超级管理员管理仓库" ON warehouses;
DROP POLICY IF EXISTS "Users can view active warehouses" ON warehouses;
DROP POLICY IF EXISTS "Super admins can manage warehouses" ON warehouses;

-- SELECT 策略
CREATE POLICY "司机查看分配的仓库_v2" ON warehouses
  FOR SELECT TO authenticated
  USING (
    -- 司机只能查看分配给自己的仓库
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.driver_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'driver'
      AND wa.warehouse_id = warehouses.id
    )
  );

CREATE POLICY "管理员查看管理的仓库_v2" ON warehouses
  FOR SELECT TO authenticated
  USING (
    -- 管理员可以查看管理的仓库
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'manager'
      AND wa.warehouse_id = warehouses.id
    )
  );

CREATE POLICY "超级管理员查看所有仓库_v2" ON warehouses
  FOR SELECT TO authenticated
  USING (
    is_super_admin_user(auth.uid())
  );

-- INSERT 策略（只有超级管理员可以创建仓库）
CREATE POLICY "超级管理员创建仓库" ON warehouses
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin_user(auth.uid())
    AND created_by = auth.uid()
  );

-- UPDATE 策略
CREATE POLICY "超级管理员更新仓库" ON warehouses
  FOR UPDATE TO authenticated
  USING (is_super_admin_user(auth.uid()))
  WITH CHECK (is_super_admin_user(auth.uid()));

-- DELETE 策略（只有超级管理员可以删除）
CREATE POLICY "超级管理员删除仓库" ON warehouses
  FOR DELETE TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================
-- 2. categories（品类表）RLS 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Users can view categories" ON categories;
DROP POLICY IF EXISTS "Super admins can manage categories" ON categories;

-- SELECT 策略（所有认证用户可以查看品类）
CREATE POLICY "认证用户查看品类" ON categories
  FOR SELECT TO authenticated
  USING (true);

-- INSERT 策略（管理员和超级管理员可以创建）
CREATE POLICY "管理员创建品类" ON categories
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
    AND created_by = auth.uid()
  );

-- UPDATE 策略
CREATE POLICY "创建者更新品类" ON categories
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "超级管理员更新所有品类" ON categories
  FOR UPDATE TO authenticated
  USING (is_super_admin_user(auth.uid()))
  WITH CHECK (is_super_admin_user(auth.uid()));

-- DELETE 策略
CREATE POLICY "超级管理员删除品类" ON categories
  FOR DELETE TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================
-- 3. attendance_records（考勤记录表）RLS 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Drivers can view own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Managers can view warehouse attendance" ON attendance_records;
DROP POLICY IF EXISTS "Super admins can view all attendance" ON attendance_records;
DROP POLICY IF EXISTS "Drivers can create own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Super admins can manage attendance" ON attendance_records;

-- SELECT 策略
CREATE POLICY "司机查看自己的考勤" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

CREATE POLICY "管理员查看管理仓库的考勤" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'manager'
      AND wa.warehouse_id = attendance_records.warehouse_id
    )
  );

CREATE POLICY "超级管理员查看所有考勤" ON attendance_records
  FOR SELECT TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- INSERT 策略
CREATE POLICY "司机创建自己的考勤" ON attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id = auth.uid()
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

CREATE POLICY "管理员创建考勤记录" ON attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
    AND created_by = auth.uid()
  );

-- UPDATE 策略
CREATE POLICY "司机更新自己的考勤" ON attendance_records
  FOR UPDATE TO authenticated
  USING (
    driver_id = auth.uid()
    AND created_by = auth.uid()
  )
  WITH CHECK (
    driver_id = auth.uid()
    AND created_by = auth.uid()
  );

CREATE POLICY "管理员更新管理仓库的考勤" ON attendance_records
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'manager'
      AND wa.warehouse_id = attendance_records.warehouse_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'manager'
      AND wa.warehouse_id = attendance_records.warehouse_id
    )
  );

CREATE POLICY "超级管理员更新所有考勤" ON attendance_records
  FOR UPDATE TO authenticated
  USING (is_super_admin_user(auth.uid()))
  WITH CHECK (is_super_admin_user(auth.uid()));

-- DELETE 策略
CREATE POLICY "超级管理员删除考勤记录" ON attendance_records
  FOR DELETE TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================
-- 4. piece_work_records（计件记录表）RLS 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Drivers can view own piece work" ON piece_work_records;
DROP POLICY IF EXISTS "Managers can view warehouse piece work" ON piece_work_records;
DROP POLICY IF EXISTS "Super admins can view all piece work" ON piece_work_records;
DROP POLICY IF EXISTS "Drivers can create own piece work" ON piece_work_records;
DROP POLICY IF EXISTS "Super admins can manage piece work" ON piece_work_records;

-- SELECT 策略
CREATE POLICY "司机查看自己的计件" ON piece_work_records
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

CREATE POLICY "管理员查看管理仓库的计件" ON piece_work_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'manager'
      AND wa.warehouse_id = piece_work_records.warehouse_id
    )
  );

CREATE POLICY "超级管理员查看所有计件" ON piece_work_records
  FOR SELECT TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- INSERT 策略
CREATE POLICY "司机创建自己的计件" ON piece_work_records
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id = auth.uid()
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

CREATE POLICY "管理员创建计件记录" ON piece_work_records
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
    AND created_by = auth.uid()
  );

-- UPDATE 策略
CREATE POLICY "司机更新自己的计件" ON piece_work_records
  FOR UPDATE TO authenticated
  USING (
    driver_id = auth.uid()
    AND created_by = auth.uid()
  )
  WITH CHECK (
    driver_id = auth.uid()
    AND created_by = auth.uid()
  );

CREATE POLICY "管理员更新管理仓库的计件" ON piece_work_records
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'manager'
      AND wa.warehouse_id = piece_work_records.warehouse_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'manager'
      AND wa.warehouse_id = piece_work_records.warehouse_id
    )
  );

CREATE POLICY "超级管理员更新所有计件" ON piece_work_records
  FOR UPDATE TO authenticated
  USING (is_super_admin_user(auth.uid()))
  WITH CHECK (is_super_admin_user(auth.uid()));

-- DELETE 策略
CREATE POLICY "超级管理员删除计件记录" ON piece_work_records
  FOR DELETE TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================
-- 5. leave_applications（请假申请表）RLS 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Drivers can view own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Managers can view warehouse leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Super admins can view all leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Drivers can create own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Managers can update leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Super admins can manage leave applications" ON leave_applications;

-- SELECT 策略
CREATE POLICY "司机查看自己的请假" ON leave_applications
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

CREATE POLICY "管理员查看管理仓库的请假" ON leave_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      JOIN warehouse_assignments wa2 ON wa2.warehouse_id = wa.warehouse_id
      WHERE p.id = auth.uid() 
      AND p.role = 'manager'
      AND wa2.driver_id = leave_applications.driver_id
    )
  );

CREATE POLICY "超级管理员查看所有请假" ON leave_applications
  FOR SELECT TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- INSERT 策略
CREATE POLICY "司机创建自己的请假" ON leave_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id = auth.uid()
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

-- UPDATE 策略
CREATE POLICY "司机更新自己的待审批请假" ON leave_applications
  FOR UPDATE TO authenticated
  USING (
    driver_id = auth.uid()
    AND created_by = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    driver_id = auth.uid()
    AND created_by = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "管理员审批请假" ON leave_applications
  FOR UPDATE TO authenticated
  USING (
    (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles p
      JOIN warehouse_assignments wa ON wa.manager_id = p.id
      JOIN warehouse_assignments wa2 ON wa2.warehouse_id = wa.warehouse_id
      WHERE p.id = auth.uid()
      AND wa2.driver_id = leave_applications.driver_id
    )
  )
  WITH CHECK (
    (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
  );

CREATE POLICY "超级管理员更新所有请假" ON leave_applications
  FOR UPDATE TO authenticated
  USING (is_super_admin_user(auth.uid()))
  WITH CHECK (is_super_admin_user(auth.uid()));

-- DELETE 策略
CREATE POLICY "司机删除自己的待审批请假" ON leave_applications
  FOR DELETE TO authenticated
  USING (
    driver_id = auth.uid()
    AND created_by = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "超级管理员删除请假记录" ON leave_applications
  FOR DELETE TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================
-- 6. vehicles（车辆表）RLS 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Drivers can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Managers can view warehouse vehicles" ON vehicles;
DROP POLICY IF EXISTS "Super admins can view all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Drivers can create vehicles" ON vehicles;
DROP POLICY IF EXISTS "Super admins can manage vehicles" ON vehicles;

-- SELECT 策略
CREATE POLICY "司机查看自己的车辆" ON vehicles
  FOR SELECT TO authenticated
  USING (
    (current_driver_id = auth.uid() OR created_by = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

CREATE POLICY "管理员查看所有车辆" ON vehicles
  FOR SELECT TO authenticated
  USING (
    is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid())
  );

-- INSERT 策略
CREATE POLICY "司机创建车辆" ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

CREATE POLICY "管理员创建车辆" ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
    AND created_by = auth.uid()
  );

-- UPDATE 策略
CREATE POLICY "司机更新自己的车辆" ON vehicles
  FOR UPDATE TO authenticated
  USING (
    (current_driver_id = auth.uid() OR created_by = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  )
  WITH CHECK (
    (current_driver_id = auth.uid() OR created_by = auth.uid())
  );

CREATE POLICY "管理员更新车辆" ON vehicles
  FOR UPDATE TO authenticated
  USING (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
  WITH CHECK (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()));

-- DELETE 策略
CREATE POLICY "超级管理员删除车辆" ON vehicles
  FOR DELETE TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================
-- 7. vehicle_leases（车辆租赁表）RLS 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Drivers can view own leases" ON vehicle_leases;
DROP POLICY IF EXISTS "Managers can view all leases" ON vehicle_leases;
DROP POLICY IF EXISTS "Super admins can view all leases" ON vehicle_leases;
DROP POLICY IF EXISTS "Super admins can manage leases" ON vehicle_leases;

-- SELECT 策略
CREATE POLICY "司机查看自己的租赁" ON vehicle_leases
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

CREATE POLICY "管理员查看所有租赁" ON vehicle_leases
  FOR SELECT TO authenticated
  USING (
    is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid())
  );

-- INSERT 策略
CREATE POLICY "管理员创建租赁记录" ON vehicle_leases
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
    AND created_by = auth.uid()
  );

-- UPDATE 策略
CREATE POLICY "管理员更新租赁记录" ON vehicle_leases
  FOR UPDATE TO authenticated
  USING (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
  WITH CHECK (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()));

-- DELETE 策略
CREATE POLICY "超级管理员删除租赁记录" ON vehicle_leases
  FOR DELETE TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================
-- 8. driver_licenses（驾驶证表）RLS 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Drivers can view own license" ON driver_licenses;
DROP POLICY IF EXISTS "Managers can view all licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Super admins can view all licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Drivers can manage own license" ON driver_licenses;
DROP POLICY IF EXISTS "Super admins can manage licenses" ON driver_licenses;

-- SELECT 策略
CREATE POLICY "司机查看自己的驾驶证" ON driver_licenses
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

CREATE POLICY "管理员查看所有驾驶证" ON driver_licenses
  FOR SELECT TO authenticated
  USING (
    is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid())
  );

-- INSERT 策略
CREATE POLICY "司机创建自己的驾驶证" ON driver_licenses
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id = auth.uid()
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

-- UPDATE 策略
CREATE POLICY "司机更新自己的驾驶证" ON driver_licenses
  FOR UPDATE TO authenticated
  USING (
    driver_id = auth.uid()
    AND created_by = auth.uid()
  )
  WITH CHECK (
    driver_id = auth.uid()
    AND created_by = auth.uid()
  );

CREATE POLICY "管理员更新驾驶证" ON driver_licenses
  FOR UPDATE TO authenticated
  USING (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()))
  WITH CHECK (is_manager_user(auth.uid()) OR is_super_admin_user(auth.uid()));

-- DELETE 策略
CREATE POLICY "超级管理员删除驾驶证" ON driver_licenses
  FOR DELETE TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================
-- 9. 验证 RLS 策略
-- ============================================

-- 检查所有表是否启用了 RLS
DO $$
DECLARE
  table_name text;
  rls_enabled boolean;
BEGIN
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'warehouses', 'categories', 'attendance_records', 
      'piece_work_records', 'leave_applications', 'vehicles',
      'vehicle_leases', 'driver_licenses'
    ])
  LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_name;
    
    IF NOT rls_enabled THEN
      RAISE NOTICE '警告：表 % 未启用 RLS', table_name;
    ELSE
      RAISE NOTICE '✓ 表 % 已启用 RLS', table_name;
    END IF;
  END LOOP;
END $$;
