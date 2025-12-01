/*
# 权限系统重构 - 步骤12：应用新的 RLS 策略（notifications 表）

## 说明
为 notifications 表应用基于策略模板的动态 RLS 策略

## 策略设计
1. BOSS/MANAGER: 可以查看、创建、更新、删除所有通知
2. DRIVER: 可以查看发送给自己的通知，可以更新和删除自己的通知

## 业务逻辑
- 通知由管理员或系统创建
- 用户只能查看发送给自己的通知（recipient_id）
- 用户可以更新自己的通知（标记为已读）
- 用户可以删除自己的通知
- 管理员可以查看和管理所有通知
- 管理员可以发送通知给用户

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 删除 notifications 表的所有旧策略
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', pol.polname);
  END LOOP;
END $$;

-- ============================================
-- 2. 应用新的 RLS 策略
-- ============================================

-- 策略1：管理员可以查看所有通知
CREATE POLICY "new_admins_view_all_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略2：用户可以查看发送给自己的通知
CREATE POLICY "new_users_view_own_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid()
  );

-- 策略3：管理员可以插入通知
CREATE POLICY "new_admins_insert_notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略4：系统可以插入通知（用于系统自动通知）
CREATE POLICY "new_system_insert_notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- 策略5：管理员可以更新所有通知
CREATE POLICY "new_admins_update_all_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略6：用户可以更新自己的通知（标记为已读）
CREATE POLICY "new_users_update_own_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    recipient_id = auth.uid()
  )
  WITH CHECK (
    recipient_id = auth.uid()
  );

-- 策略7：管理员可以删除通知
CREATE POLICY "new_admins_delete_notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略8：用户可以删除自己的通知
CREATE POLICY "new_users_delete_own_notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (
    recipient_id = auth.uid()
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
  'notifications',
  'recipient_id',
  NULL,
  false,
  NULL,
  jsonb_build_object(
    'user_view_rule', 'recipient_id = auth.uid()',
    'user_update_rule', 'recipient_id = auth.uid()',
    'user_delete_rule', 'recipient_id = auth.uid()'
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
CREATE OR REPLACE FUNCTION verify_notifications_table_policies()
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
  WHERE cls.relname = 'notifications'
  ORDER BY pol.polname;
END;
$$;

COMMENT ON FUNCTION verify_notifications_table_policies IS '验证 notifications 表的策略是否正确应用';

-- ============================================
-- 5. 删除可能冲突的旧函数
-- ============================================
DROP FUNCTION IF EXISTS mark_notification_as_read(uuid);
DROP FUNCTION IF EXISTS mark_all_notifications_as_read();
DROP FUNCTION IF EXISTS get_unread_notification_count();
DROP FUNCTION IF EXISTS send_notification(uuid, uuid, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS send_notification_to_multiple(uuid, uuid[], text, text, text, text, uuid);
DROP FUNCTION IF EXISTS get_user_notifications(uuid, boolean, text, integer);
DROP FUNCTION IF EXISTS get_all_notifications(uuid, text, uuid, integer);
DROP FUNCTION IF EXISTS delete_notification(uuid, uuid);
DROP FUNCTION IF EXISTS get_notification_statistics(uuid);

-- ============================================
-- 6. 创建通知管理辅助函数
-- ============================================

-- 发送通知
CREATE OR REPLACE FUNCTION send_notification(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_content text,
  p_action_url text DEFAULT NULL,
  p_related_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
  v_sender_name text;
  v_sender_role text;
BEGIN
  -- 获取发送者信息
  SELECT name, role INTO v_sender_name, v_sender_role
  FROM users
  WHERE id = p_sender_id;
  
  IF v_sender_name IS NULL THEN
    RAISE EXCEPTION '发送者不存在';
  END IF;
  
  -- 检查接收者是否存在
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_recipient_id
  ) THEN
    RAISE EXCEPTION '接收者不存在';
  END IF;
  
  -- 验证通知类型
  IF p_type NOT IN ('system', 'approval', 'reminder', 'announcement', 'alert') THEN
    RAISE EXCEPTION '无效的通知类型';
  END IF;
  
  -- 创建通知
  INSERT INTO notifications (
    sender_id,
    sender_name,
    sender_role,
    recipient_id,
    type,
    title,
    content,
    action_url,
    related_id,
    is_read
  ) VALUES (
    p_sender_id,
    v_sender_name,
    v_sender_role,
    p_recipient_id,
    p_type,
    p_title,
    p_content,
    p_action_url,
    p_related_id,
    false
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION send_notification IS '发送通知';

-- 批量发送通知
CREATE OR REPLACE FUNCTION send_notification_to_multiple(
  p_sender_id uuid,
  p_recipient_ids uuid[],
  p_type text,
  p_title text,
  p_content text,
  p_action_url text DEFAULT NULL,
  p_related_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name text;
  v_sender_role text;
  v_recipient_id uuid;
  v_count integer := 0;
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_sender_id) THEN
    RAISE EXCEPTION '只有管理员可以批量发送通知';
  END IF;
  
  -- 获取发送者信息
  SELECT name, role INTO v_sender_name, v_sender_role
  FROM users
  WHERE id = p_sender_id;
  
  IF v_sender_name IS NULL THEN
    RAISE EXCEPTION '发送者不存在';
  END IF;
  
  -- 验证通知类型
  IF p_type NOT IN ('system', 'approval', 'reminder', 'announcement', 'alert') THEN
    RAISE EXCEPTION '无效的通知类型';
  END IF;
  
  -- 批量创建通知
  FOREACH v_recipient_id IN ARRAY p_recipient_ids
  LOOP
    -- 检查接收者是否存在
    IF EXISTS (
      SELECT 1 FROM users 
      WHERE id = v_recipient_id
    ) THEN
      INSERT INTO notifications (
        sender_id,
        sender_name,
        sender_role,
        recipient_id,
        type,
        title,
        content,
        action_url,
        related_id,
        is_read
      ) VALUES (
        p_sender_id,
        v_sender_name,
        v_sender_role,
        v_recipient_id,
        p_type,
        p_title,
        p_content,
        p_action_url,
        p_related_id,
        false
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION send_notification_to_multiple IS '批量发送通知';

-- 标记通知为已读
CREATE OR REPLACE FUNCTION mark_notification_as_read(
  p_notification_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查通知是否存在且属于该用户
  IF NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE id = p_notification_id AND recipient_id = p_user_id
  ) THEN
    RAISE EXCEPTION '通知不存在或无权访问';
  END IF;
  
  -- 标记为已读
  UPDATE notifications
  SET 
    is_read = true,
    updated_at = NOW()
  WHERE id = p_notification_id AND recipient_id = p_user_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION mark_notification_as_read IS '标记通知为已读';

-- 批量标记通知为已读
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- 标记所有未读通知为已读
  UPDATE notifications
  SET 
    is_read = true,
    updated_at = NOW()
  WHERE recipient_id = p_user_id AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION mark_all_notifications_as_read IS '批量标记通知为已读';

-- 获取用户的通知
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id uuid,
  p_is_read boolean DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_role text,
  type text,
  title text,
  content text,
  action_url text,
  related_id uuid,
  is_read boolean,
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
    n.id,
    n.sender_id,
    n.sender_name,
    n.sender_role,
    n.type,
    n.title,
    n.content,
    n.action_url,
    n.related_id,
    n.is_read,
    n.created_at,
    n.updated_at
  FROM notifications n
  WHERE n.recipient_id = p_user_id
    AND (p_is_read IS NULL OR n.is_read = p_is_read)
    AND (p_type IS NULL OR n.type = p_type)
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_user_notifications IS '获取用户的通知';

-- 获取未读通知数量
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM notifications
  WHERE recipient_id = p_user_id AND is_read = false;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_unread_notifications_count IS '获取未读通知数量';

-- 管理员获取所有通知
CREATE OR REPLACE FUNCTION get_all_notifications(
  p_admin_id uuid,
  p_type text DEFAULT NULL,
  p_recipient_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_role text,
  recipient_id uuid,
  recipient_name text,
  type text,
  title text,
  content text,
  action_url text,
  related_id uuid,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION '只有管理员可以查看所有通知';
  END IF;
  
  RETURN QUERY
  SELECT 
    n.id,
    n.sender_id,
    n.sender_name,
    n.sender_role,
    n.recipient_id,
    u.name AS recipient_name,
    n.type,
    n.title,
    n.content,
    n.action_url,
    n.related_id,
    n.is_read,
    n.created_at
  FROM notifications n
  LEFT JOIN users u ON n.recipient_id = u.id
  WHERE (p_type IS NULL OR n.type = p_type)
    AND (p_recipient_id IS NULL OR n.recipient_id = p_recipient_id)
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_all_notifications IS '管理员获取所有通知';

-- 删除通知
CREATE OR REPLACE FUNCTION delete_notification(
  p_notification_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查通知是否存在且属于该用户或用户是管理员
  IF NOT (
    is_admin(p_user_id) OR
    EXISTS (
      SELECT 1 FROM notifications 
      WHERE id = p_notification_id AND recipient_id = p_user_id
    )
  ) THEN
    RAISE EXCEPTION '通知不存在或无权删除';
  END IF;
  
  -- 删除通知
  DELETE FROM notifications
  WHERE id = p_notification_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION delete_notification IS '删除通知';

-- 获取通知统计
CREATE OR REPLACE FUNCTION get_notification_statistics(p_admin_id uuid)
RETURNS TABLE (
  total_notifications integer,
  unread_notifications integer,
  read_notifications integer,
  system_notifications integer,
  approval_notifications integer,
  reminder_notifications integer,
  announcement_notifications integer,
  alert_notifications integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION '只有管理员可以查看通知统计';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::integer AS total_notifications,
    COUNT(*) FILTER (WHERE is_read = false)::integer AS unread_notifications,
    COUNT(*) FILTER (WHERE is_read = true)::integer AS read_notifications,
    COUNT(*) FILTER (WHERE type = 'system')::integer AS system_notifications,
    COUNT(*) FILTER (WHERE type = 'approval')::integer AS approval_notifications,
    COUNT(*) FILTER (WHERE type = 'reminder')::integer AS reminder_notifications,
    COUNT(*) FILTER (WHERE type = 'announcement')::integer AS announcement_notifications,
    COUNT(*) FILTER (WHERE type = 'alert')::integer AS alert_notifications
  FROM notifications;
END;
$$;

COMMENT ON FUNCTION get_notification_statistics IS '获取通知统计';