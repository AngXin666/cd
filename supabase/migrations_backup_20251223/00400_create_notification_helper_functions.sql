/*
# 创建通知服务辅助函数

## 说明
创建一组辅助函数来支持通知服务，使用 SECURITY DEFINER 绕过 RLS 策略。
这些函数专门用于通知系统，不受 RLS 策略限制。

## 函数列表
1. get_primary_admin_for_notification() - 获取主账号（老板）
2. get_peer_accounts_for_notification() - 获取所有平级账号
3. get_managers_with_jurisdiction_for_notification(driver_id) - 获取对司机有管辖权的车队长

*/

-- ============================================================================
-- 函数 1: 获取主账号（老板）
-- ============================================================================
CREATE OR REPLACE FUNCTION get_primary_admin_for_notification()
RETURNS TABLE (
  id uuid,
  name text,
  role user_role
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, name, role
  FROM profiles
  WHERE role = 'super_admin'
    AND main_account_id IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_primary_admin_for_notification IS '获取主账号（老板），用于通知服务，绕过 RLS 策略';

-- ============================================================================
-- 函数 2: 获取所有平级账号
-- ============================================================================
CREATE OR REPLACE FUNCTION get_peer_accounts_for_notification()
RETURNS TABLE (
  id uuid,
  name text,
  role user_role
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, name, role
  FROM profiles
  WHERE role = 'super_admin'
    AND main_account_id IS NOT NULL;
$$;

COMMENT ON FUNCTION get_peer_accounts_for_notification IS '获取所有平级账号，用于通知服务，绕过 RLS 策略';

-- ============================================================================
-- 函数 3: 获取对司机有管辖权的车队长
-- ============================================================================
CREATE OR REPLACE FUNCTION get_managers_with_jurisdiction_for_notification(p_driver_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  role user_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- 返回对该司机有管辖权的车队长
  RETURN QUERY
  SELECT DISTINCT p.id, p.name, p.role
  FROM profiles p
  INNER JOIN manager_warehouses mw ON mw.manager_id = p.id
  INNER JOIN driver_warehouses dw ON dw.warehouse_id = mw.warehouse_id
  WHERE dw.driver_id = p_driver_id
    AND p.role = 'manager';
END;
$$;

COMMENT ON FUNCTION get_managers_with_jurisdiction_for_notification IS '获取对司机有管辖权的车队长，用于通知服务，绕过 RLS 策略';

-- ============================================================================
-- 验证
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 通知服务辅助函数已创建';
  RAISE NOTICE '   - get_primary_admin_for_notification()';
  RAISE NOTICE '   - get_peer_accounts_for_notification()';
  RAISE NOTICE '   - get_managers_with_jurisdiction_for_notification(driver_id)';
END $$;
