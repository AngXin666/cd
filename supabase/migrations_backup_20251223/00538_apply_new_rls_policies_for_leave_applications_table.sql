/*
# 权限系统重构 - 步骤8：应用新的 RLS 策略（leave_applications 表）

## 说明
为 leave_applications 表应用基于策略模板的动态 RLS 策略

## 策略设计
1. BOSS/MANAGER: 可以查看、更新、删除所有请假申请
2. DRIVER: 可以查看和创建自己的请假申请，可以更新和删除自己待审批的请假申请

## 业务逻辑
- 请假申请由员工自己创建
- 员工只能查看和管理自己的请假申请
- 员工只能更新和删除待审批状态的请假申请
- 管理员可以查看和管理所有请假申请
- 管理员可以审批请假申请

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 删除 leave_applications 表的所有旧策略
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = 'leave_applications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON leave_applications', pol.polname);
  END LOOP;
END $$;

-- ============================================
-- 2. 应用新的 RLS 策略
-- ============================================

-- 策略1：管理员可以查看所有请假申请
CREATE POLICY "new_admins_view_all_leave_applications" ON leave_applications
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略2：用户可以查看自己的请假申请
CREATE POLICY "new_users_view_own_leave_applications" ON leave_applications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- 策略3：用户可以创建自己的请假申请
CREATE POLICY "new_users_insert_own_leave_applications" ON leave_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- 策略4：管理员可以更新所有请假申请
CREATE POLICY "new_admins_update_all_leave_applications" ON leave_applications
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略5：用户可以更新自己待审批的请假申请
CREATE POLICY "new_users_update_own_pending_leave_applications" ON leave_applications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND status = 'pending'
  )
  WITH CHECK (
    user_id = auth.uid() AND status = 'pending'
  );

-- 策略6：管理员可以删除请假申请
CREATE POLICY "new_admins_delete_leave_applications" ON leave_applications
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略7：用户可以删除自己待审批的请假申请
CREATE POLICY "new_users_delete_own_pending_leave_applications" ON leave_applications
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() AND status = 'pending'
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
  'leave_applications',
  'user_id',
  NULL,
  true,
  'status',
  jsonb_build_object(
    'user_update_rule', 'user_id = auth.uid() AND status = ''pending''',
    'user_delete_rule', 'user_id = auth.uid() AND status = ''pending'''
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
CREATE OR REPLACE FUNCTION verify_leave_applications_table_policies()
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
  WHERE cls.relname = 'leave_applications'
  ORDER BY pol.polname;
END;
$$;

COMMENT ON FUNCTION verify_leave_applications_table_policies IS '验证 leave_applications 表的策略是否正确应用';

-- ============================================
-- 5. 创建请假管理辅助函数
-- ============================================

-- 创建请假申请
CREATE OR REPLACE FUNCTION create_leave_application(
  p_user_id uuid,
  p_warehouse_id uuid,
  p_leave_type text,
  p_start_date date,
  p_end_date date,
  p_days numeric,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_leave_id uuid;
BEGIN
  -- 验证日期
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION '开始日期不能晚于结束日期';
  END IF;
  
  -- 验证天数
  IF p_days <= 0 THEN
    RAISE EXCEPTION '请假天数必须大于0';
  END IF;
  
  -- 创建请假申请
  INSERT INTO leave_applications (
    user_id,
    warehouse_id,
    leave_type,
    start_date,
    end_date,
    days,
    reason,
    status
  ) VALUES (
    p_user_id,
    p_warehouse_id,
    p_leave_type::leave_type,
    p_start_date,
    p_end_date,
    p_days,
    p_reason,
    'pending'
  )
  RETURNING id INTO v_leave_id;
  
  RETURN v_leave_id;
END;
$$;

COMMENT ON FUNCTION create_leave_application IS '创建请假申请';

-- 审批请假申请
CREATE OR REPLACE FUNCTION review_leave_application(
  p_leave_id uuid,
  p_reviewer_id uuid,
  p_status text,
  p_review_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_reviewer_id) THEN
    RAISE EXCEPTION '只有管理员可以审批请假申请';
  END IF;
  
  -- 检查请假申请是否存在
  IF NOT EXISTS (
    SELECT 1 FROM leave_applications 
    WHERE id = p_leave_id
  ) THEN
    RAISE EXCEPTION '请假申请不存在';
  END IF;
  
  -- 检查请假申请是否已经审批
  IF EXISTS (
    SELECT 1 FROM leave_applications 
    WHERE id = p_leave_id AND status != 'pending'
  ) THEN
    RAISE EXCEPTION '该请假申请已经审批过了';
  END IF;
  
  -- 验证状态
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION '审批状态必须是 approved 或 rejected';
  END IF;
  
  -- 更新请假申请
  UPDATE leave_applications
  SET 
    status = p_status::application_status,
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_leave_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION review_leave_application IS '审批请假申请';

-- 获取用户的请假申请
CREATE OR REPLACE FUNCTION get_user_leave_applications(
  p_user_id uuid,
  p_status text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  warehouse_id uuid,
  leave_type text,
  start_date date,
  end_date date,
  days numeric,
  reason text,
  status text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.user_id,
    la.warehouse_id,
    la.leave_type::text,
    la.start_date,
    la.end_date,
    la.days,
    la.reason,
    la.status::text,
    la.reviewed_by,
    la.reviewed_at,
    la.review_notes,
    la.created_at,
    la.updated_at
  FROM leave_applications la
  WHERE la.user_id = p_user_id
    AND (p_status IS NULL OR la.status::text = p_status)
    AND (p_start_date IS NULL OR la.start_date >= p_start_date)
    AND (p_end_date IS NULL OR la.end_date <= p_end_date)
  ORDER BY la.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_leave_applications IS '获取用户的请假申请';

-- 管理员获取所有请假申请
CREATE OR REPLACE FUNCTION get_all_leave_applications(
  p_admin_id uuid,
  p_status text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  warehouse_id uuid,
  warehouse_name text,
  leave_type text,
  start_date date,
  end_date date,
  days numeric,
  reason text,
  status text,
  reviewed_by uuid,
  reviewer_name text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION '只有管理员可以查看所有请假申请';
  END IF;
  
  RETURN QUERY
  SELECT 
    la.id,
    la.user_id,
    u.name AS user_name,
    la.warehouse_id,
    w.name AS warehouse_name,
    la.leave_type::text,
    la.start_date,
    la.end_date,
    la.days,
    la.reason,
    la.status::text,
    la.reviewed_by,
    r.name AS reviewer_name,
    la.reviewed_at,
    la.review_notes,
    la.created_at
  FROM leave_applications la
  LEFT JOIN users u ON la.user_id = u.id
  LEFT JOIN warehouses w ON la.warehouse_id = w.id
  LEFT JOIN users r ON la.reviewed_by = r.id
  WHERE (p_status IS NULL OR la.status::text = p_status)
    AND (p_start_date IS NULL OR la.start_date >= p_start_date)
    AND (p_end_date IS NULL OR la.end_date <= p_end_date)
  ORDER BY la.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_all_leave_applications IS '管理员获取所有请假申请';

-- 获取待审批的请假申请数量
CREATE OR REPLACE FUNCTION get_pending_leave_applications_count(p_admin_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_count integer;
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_admin_id) THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*)::integer INTO v_count
  FROM leave_applications
  WHERE status = 'pending';
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_pending_leave_applications_count IS '获取待审批的请假申请数量';

-- 获取用户的请假统计
CREATE OR REPLACE FUNCTION get_user_leave_statistics(
  p_user_id uuid,
  p_year integer DEFAULT NULL
)
RETURNS TABLE (
  total_applications integer,
  pending_applications integer,
  approved_applications integer,
  rejected_applications integer,
  total_leave_days numeric,
  approved_leave_days numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_year integer;
BEGIN
  -- 如果没有指定年份，使用当前年份
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  
  RETURN QUERY
  SELECT 
    COUNT(*)::integer AS total_applications,
    COUNT(*) FILTER (WHERE status = 'pending')::integer AS pending_applications,
    COUNT(*) FILTER (WHERE status = 'approved')::integer AS approved_applications,
    COUNT(*) FILTER (WHERE status = 'rejected')::integer AS rejected_applications,
    COALESCE(SUM(days), 0) AS total_leave_days,
    COALESCE(SUM(days) FILTER (WHERE status = 'approved'), 0) AS approved_leave_days
  FROM leave_applications
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM start_date) = v_year;
END;
$$;

COMMENT ON FUNCTION get_user_leave_statistics IS '获取用户的请假统计';