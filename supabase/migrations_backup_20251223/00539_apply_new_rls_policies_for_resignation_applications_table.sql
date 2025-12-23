/*
# 权限系统重构 - 步骤9：应用新的 RLS 策略（resignation_applications 表）

## 说明
为 resignation_applications 表应用基于策略模板的动态 RLS 策略

## 策略设计
1. BOSS/MANAGER: 可以查看、更新、删除所有离职申请
2. DRIVER: 可以查看和创建自己的离职申请，可以更新和删除自己待审批的离职申请

## 业务逻辑
- 离职申请由员工自己创建
- 员工只能查看和管理自己的离职申请
- 员工只能更新和删除待审批状态的离职申请
- 管理员可以查看和管理所有离职申请
- 管理员可以审批离职申请

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 删除 resignation_applications 表的所有旧策略
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = 'resignation_applications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON resignation_applications', pol.polname);
  END LOOP;
END $$;

-- ============================================
-- 2. 应用新的 RLS 策略
-- ============================================

-- 策略1：管理员可以查看所有离职申请
CREATE POLICY "new_admins_view_all_resignation_applications" ON resignation_applications
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略2：用户可以查看自己的离职申请
CREATE POLICY "new_users_view_own_resignation_applications" ON resignation_applications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- 策略3：用户可以创建自己的离职申请
CREATE POLICY "new_users_insert_own_resignation_applications" ON resignation_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- 策略4：管理员可以更新所有离职申请
CREATE POLICY "new_admins_update_all_resignation_applications" ON resignation_applications
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略5：用户可以更新自己待审批的离职申请
CREATE POLICY "new_users_update_own_pending_resignation_applications" ON resignation_applications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND status = 'pending'
  )
  WITH CHECK (
    user_id = auth.uid() AND status = 'pending'
  );

-- 策略6：管理员可以删除离职申请
CREATE POLICY "new_admins_delete_resignation_applications" ON resignation_applications
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略7：用户可以删除自己待审批的离职申请
CREATE POLICY "new_users_delete_own_pending_resignation_applications" ON resignation_applications
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
  'resignation_applications',
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
CREATE OR REPLACE FUNCTION verify_resignation_applications_table_policies()
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
  WHERE cls.relname = 'resignation_applications'
  ORDER BY pol.polname;
END;
$$;

COMMENT ON FUNCTION verify_resignation_applications_table_policies IS '验证 resignation_applications 表的策略是否正确应用';

-- ============================================
-- 5. 创建离职管理辅助函数
-- ============================================

-- 创建离职申请
CREATE OR REPLACE FUNCTION create_resignation_application(
  p_user_id uuid,
  p_warehouse_id uuid,
  p_resignation_date date,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resignation_id uuid;
BEGIN
  -- 验证离职日期
  IF p_resignation_date < CURRENT_DATE THEN
    RAISE EXCEPTION '离职日期不能早于今天';
  END IF;
  
  -- 检查是否已经有待审批的离职申请
  IF EXISTS (
    SELECT 1 FROM resignation_applications 
    WHERE user_id = p_user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION '您已经有一个待审批的离职申请';
  END IF;
  
  -- 创建离职申请
  INSERT INTO resignation_applications (
    user_id,
    warehouse_id,
    resignation_date,
    reason,
    status
  ) VALUES (
    p_user_id,
    p_warehouse_id,
    p_resignation_date,
    p_reason,
    'pending'
  )
  RETURNING id INTO v_resignation_id;
  
  RETURN v_resignation_id;
END;
$$;

COMMENT ON FUNCTION create_resignation_application IS '创建离职申请';

-- 审批离职申请
CREATE OR REPLACE FUNCTION review_resignation_application(
  p_resignation_id uuid,
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
    RAISE EXCEPTION '只有管理员可以审批离职申请';
  END IF;
  
  -- 检查离职申请是否存在
  IF NOT EXISTS (
    SELECT 1 FROM resignation_applications 
    WHERE id = p_resignation_id
  ) THEN
    RAISE EXCEPTION '离职申请不存在';
  END IF;
  
  -- 检查离职申请是否已经审批
  IF EXISTS (
    SELECT 1 FROM resignation_applications 
    WHERE id = p_resignation_id AND status != 'pending'
  ) THEN
    RAISE EXCEPTION '该离职申请已经审批过了';
  END IF;
  
  -- 验证状态
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION '审批状态必须是 approved 或 rejected';
  END IF;
  
  -- 更新离职申请
  UPDATE resignation_applications
  SET 
    status = p_status,
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_resignation_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION review_resignation_application IS '审批离职申请';

-- 获取用户的离职申请
CREATE OR REPLACE FUNCTION get_user_resignation_applications(
  p_user_id uuid,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  warehouse_id uuid,
  resignation_date date,
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
    ra.id,
    ra.user_id,
    ra.warehouse_id,
    ra.resignation_date,
    ra.reason,
    ra.status,
    ra.reviewed_by,
    ra.reviewed_at,
    ra.review_notes,
    ra.created_at,
    ra.updated_at
  FROM resignation_applications ra
  WHERE ra.user_id = p_user_id
    AND (p_status IS NULL OR ra.status = p_status)
  ORDER BY ra.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_resignation_applications IS '获取用户的离职申请';

-- 管理员获取所有离职申请
CREATE OR REPLACE FUNCTION get_all_resignation_applications(
  p_admin_id uuid,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  warehouse_id uuid,
  warehouse_name text,
  resignation_date date,
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
    RAISE EXCEPTION '只有管理员可以查看所有离职申请';
  END IF;
  
  RETURN QUERY
  SELECT 
    ra.id,
    ra.user_id,
    u.name AS user_name,
    ra.warehouse_id,
    w.name AS warehouse_name,
    ra.resignation_date,
    ra.reason,
    ra.status,
    ra.reviewed_by,
    r.name AS reviewer_name,
    ra.reviewed_at,
    ra.review_notes,
    ra.created_at
  FROM resignation_applications ra
  LEFT JOIN users u ON ra.user_id = u.id
  LEFT JOIN warehouses w ON ra.warehouse_id = w.id
  LEFT JOIN users r ON ra.reviewed_by = r.id
  WHERE (p_status IS NULL OR ra.status = p_status)
  ORDER BY ra.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_all_resignation_applications IS '管理员获取所有离职申请';

-- 获取待审批的离职申请数量
CREATE OR REPLACE FUNCTION get_pending_resignation_applications_count(p_admin_id uuid)
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
  FROM resignation_applications
  WHERE status = 'pending';
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_pending_resignation_applications_count IS '获取待审批的离职申请数量';

-- 检查用户是否有待审批的离职申请
CREATE OR REPLACE FUNCTION has_pending_resignation_application(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM resignation_applications
    WHERE user_id = p_user_id AND status = 'pending'
  );
END;
$$;

COMMENT ON FUNCTION has_pending_resignation_application IS '检查用户是否有待审批的离职申请';