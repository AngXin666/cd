/*
# 权限系统重构 - 步骤7：应用新的 RLS 策略（attendance 表）

## 说明
为 attendance 表应用基于策略模板的动态 RLS 策略

## 策略设计
1. BOSS/MANAGER: 可以查看、创建、更新、删除所有考勤记录
2. DRIVER: 可以查看和创建自己的考勤记录，可以更新自己未完成的考勤记录

## 业务逻辑
- 考勤记录由司机自己打卡创建
- 司机只能查看和管理自己的考勤记录
- 管理员可以查看和管理所有考勤记录
- 司机只能更新自己未完成的考勤记录（clock_out_time 为 NULL）

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 删除 attendance 表的所有旧策略
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = 'attendance'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON attendance', pol.polname);
  END LOOP;
END $$;

-- ============================================
-- 2. 应用新的 RLS 策略
-- ============================================

-- 策略1：管理员可以查看所有考勤记录
CREATE POLICY "new_admins_view_all_attendance" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略2：司机可以查看自己的考勤记录
CREATE POLICY "new_drivers_view_own_attendance" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- 策略3：管理员可以插入考勤记录
CREATE POLICY "new_admins_insert_attendance" ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略4：司机可以创建自己的考勤记录
CREATE POLICY "new_drivers_insert_own_attendance" ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- 策略5：管理员可以更新所有考勤记录
CREATE POLICY "new_admins_update_all_attendance" ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略6：司机可以更新自己未完成的考勤记录
CREATE POLICY "new_drivers_update_own_attendance" ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND clock_out_time IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- 策略7：管理员可以删除考勤记录
CREATE POLICY "new_admins_delete_attendance" ON attendance
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- ============================================
-- 3. 更新资源权限配置
-- ============================================
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field,
  custom_rules
) VALUES (
  'attendance',
  'user_id',
  NULL,
  false,
  NULL,
  jsonb_build_object(
    'driver_update_rule', 'user_id = auth.uid() AND clock_out_time IS NULL'
  )
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  custom_rules = EXCLUDED.custom_rules,
  updated_at = now();

-- ============================================
-- 4. 创建验证函数
-- ============================================
CREATE OR REPLACE FUNCTION verify_attendance_table_policies()
RETURNS TABLE (
  policy_name text,
  policy_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pol.polname::text AS policy_name,
    CASE
      WHEN pol.polcmd = 'r' THEN 'SELECT'
      WHEN pol.polcmd = 'a' THEN 'INSERT'
      WHEN pol.polcmd = 'w' THEN 'UPDATE'
      WHEN pol.polcmd = 'd' THEN 'DELETE'
      WHEN pol.polcmd = '*' THEN 'ALL'
      ELSE 'UNKNOWN'
    END AS policy_type
  FROM pg_policy pol
  JOIN pg_class cls ON pol.polrelid = cls.oid
  WHERE cls.relname = 'attendance'
  ORDER BY pol.polname;
END;
$$;

COMMENT ON FUNCTION verify_attendance_table_policies IS '验证 attendance 表的策略是否正确应用';

-- ============================================
-- 5. 创建考勤管理辅助函数
-- ============================================

-- 打卡上班
CREATE OR REPLACE FUNCTION clock_in(
  p_user_id uuid,
  p_warehouse_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attendance_id uuid;
  v_work_date date;
BEGIN
  -- 获取当前日期
  v_work_date := CURRENT_DATE;
  
  -- 检查今天是否已经打过卡
  IF EXISTS (
    SELECT 1 FROM attendance 
    WHERE user_id = p_user_id 
      AND work_date = v_work_date
  ) THEN
    RAISE EXCEPTION '今天已经打过卡了';
  END IF;
  
  -- 创建考勤记录
  INSERT INTO attendance (
    user_id,
    warehouse_id,
    clock_in_time,
    work_date,
    status,
    notes
  ) VALUES (
    p_user_id,
    p_warehouse_id,
    NOW(),
    v_work_date,
    'present',
    p_notes
  )
  RETURNING id INTO v_attendance_id;
  
  RETURN v_attendance_id;
END;
$$;

COMMENT ON FUNCTION clock_in IS '打卡上班';

-- 打卡下班
CREATE OR REPLACE FUNCTION clock_out(
  p_user_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attendance_id uuid;
  v_clock_in_time timestamptz;
  v_clock_out_time timestamptz;
  v_work_hours numeric;
BEGIN
  -- 获取今天的考勤记录
  SELECT id, clock_in_time INTO v_attendance_id, v_clock_in_time
  FROM attendance
  WHERE user_id = p_user_id
    AND work_date = CURRENT_DATE
    AND clock_out_time IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '今天还没有打卡上班，或者已经打卡下班了';
  END IF;
  
  -- 计算工作时长
  v_clock_out_time := NOW();
  v_work_hours := EXTRACT(EPOCH FROM (v_clock_out_time - v_clock_in_time)) / 3600;
  
  -- 更新考勤记录
  UPDATE attendance
  SET 
    clock_out_time = v_clock_out_time,
    work_hours = v_work_hours,
    notes = CASE 
      WHEN p_notes IS NOT NULL THEN 
        CASE 
          WHEN notes IS NOT NULL THEN notes || E'\n' || p_notes
          ELSE p_notes
        END
      ELSE notes
    END
  WHERE id = v_attendance_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION clock_out IS '打卡下班';

-- 获取用户的考勤记录
CREATE OR REPLACE FUNCTION get_user_attendance(
  p_user_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  warehouse_id uuid,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  work_date date,
  work_hours numeric,
  status text,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.user_id,
    a.warehouse_id,
    a.clock_in_time,
    a.clock_out_time,
    a.work_date,
    a.work_hours,
    a.status::text,
    a.notes,
    a.created_at
  FROM attendance a
  WHERE a.user_id = p_user_id
    AND (p_start_date IS NULL OR a.work_date >= p_start_date)
    AND (p_end_date IS NULL OR a.work_date <= p_end_date)
  ORDER BY a.work_date DESC, a.clock_in_time DESC;
END;
$$;

COMMENT ON FUNCTION get_user_attendance IS '获取用户的考勤记录';

-- 获取用户今天的考勤状态
CREATE OR REPLACE FUNCTION get_today_attendance_status(p_user_id uuid)
RETURNS TABLE (
  has_clocked_in boolean,
  has_clocked_out boolean,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  work_hours numeric,
  attendance_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_attendance RECORD;
BEGIN
  -- 查询今天的考勤记录
  SELECT * INTO v_attendance
  FROM attendance
  WHERE user_id = p_user_id
    AND work_date = CURRENT_DATE;
  
  IF FOUND THEN
    RETURN QUERY
    SELECT 
      true AS has_clocked_in,
      v_attendance.clock_out_time IS NOT NULL AS has_clocked_out,
      v_attendance.clock_in_time,
      v_attendance.clock_out_time,
      v_attendance.work_hours,
      v_attendance.id AS attendance_id;
  ELSE
    RETURN QUERY
    SELECT 
      false AS has_clocked_in,
      false AS has_clocked_out,
      NULL::timestamptz AS clock_in_time,
      NULL::timestamptz AS clock_out_time,
      NULL::numeric AS work_hours,
      NULL::uuid AS attendance_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_today_attendance_status IS '获取用户今天的考勤状态';

-- 获取考勤统计
CREATE OR REPLACE FUNCTION get_attendance_statistics(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  total_days integer,
  present_days integer,
  absent_days integer,
  total_work_hours numeric,
  average_work_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer AS total_days,
    COUNT(*) FILTER (WHERE status = 'present')::integer AS present_days,
    COUNT(*) FILTER (WHERE status = 'absent')::integer AS absent_days,
    COALESCE(SUM(work_hours), 0) AS total_work_hours,
    COALESCE(AVG(work_hours), 0) AS average_work_hours
  FROM attendance
  WHERE user_id = p_user_id
    AND work_date BETWEEN p_start_date AND p_end_date;
END;
$$;

COMMENT ON FUNCTION get_attendance_statistics IS '获取考勤统计';

-- 管理员获取所有用户的考勤记录
CREATE OR REPLACE FUNCTION get_all_attendance(
  p_admin_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  warehouse_id uuid,
  warehouse_name text,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  work_date date,
  work_hours numeric,
  status text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION '只有管理员可以查看所有考勤记录';
  END IF;
  
  RETURN QUERY
  SELECT 
    a.id,
    a.user_id,
    u.name AS user_name,
    a.warehouse_id,
    w.name AS warehouse_name,
    a.clock_in_time,
    a.clock_out_time,
    a.work_date,
    a.work_hours,
    a.status::text,
    a.notes
  FROM attendance a
  LEFT JOIN users u ON a.user_id = u.id
  LEFT JOIN warehouses w ON a.warehouse_id = w.id
  WHERE (p_start_date IS NULL OR a.work_date >= p_start_date)
    AND (p_end_date IS NULL OR a.work_date <= p_end_date)
  ORDER BY a.work_date DESC, a.clock_in_time DESC;
END;
$$;

COMMENT ON FUNCTION get_all_attendance IS '管理员获取所有用户的考勤记录';