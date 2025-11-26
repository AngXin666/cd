/*
# 修复所有函数的字段名错误和数据隔离问题

## 问题
1. 通知系统函数使用错误的字段名（user_id → recipient_id）
2. 通知系统函数缺少 boss_id 数据隔离
3. 仓库访问函数缺少 boss_id 数据隔离
4. 部分函数使用不存在的字段（read_at, is_dismissed, expires_at, related_type）

## 解决方案
1. 修复所有函数的字段名
2. 为所有查询函数添加 boss_id 隔离
3. 删除不存在的字段引用
4. 确保数据完全隔离
5. 使用 CASCADE 删除有依赖的函数

## 变更内容
- 修复通知系统函数（6 个）
- 修复仓库访问函数（5 个）
- 修复清理函数（1 个）
*/

-- ============================================
-- 1. 修复通知系统函数
-- ============================================

-- 1.1 修复 create_notification
DROP FUNCTION IF EXISTS create_notification(uuid, notification_type, text, text, uuid, text, text);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_content text,
  p_related_id uuid DEFAULT NULL,
  p_action_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
  v_sender_id uuid;
  v_sender_name text;
  v_sender_role text;
  v_boss_id text;
BEGIN
  -- 获取当前用户信息
  SELECT id, name, role::text, boss_id
  INTO v_sender_id, v_sender_name, v_sender_role, v_boss_id
  FROM profiles
  WHERE id = auth.uid();
  
  -- 如果没有找到当前用户，使用默认值
  IF v_sender_id IS NULL THEN
    v_sender_id := auth.uid();
    v_sender_name := '系统';
    v_sender_role := 'super_admin';
    v_boss_id := get_current_user_boss_id();
  END IF;
  
  -- 插入通知
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    sender_name,
    sender_role,
    type,
    title,
    content,
    action_url,
    related_id,
    boss_id
  ) VALUES (
    p_user_id,
    v_sender_id,
    v_sender_name,
    v_sender_role,
    p_type::text,
    p_title,
    p_content,
    p_action_url,
    p_related_id,
    v_boss_id
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- 1.2 修复 get_unread_notification_count (无参数版本)
DROP FUNCTION IF EXISTS get_unread_notification_count();

CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM notifications
  WHERE recipient_id = auth.uid()
  AND boss_id = get_current_user_boss_id()
  AND is_read = false;
  
  RETURN v_count;
END;
$$;

-- 1.3 修复 get_unread_notification_count (有参数版本)
DROP FUNCTION IF EXISTS get_unread_notification_count(uuid);

CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO unread_count
  FROM notifications
  WHERE recipient_id = p_user_id
  AND boss_id = get_current_user_boss_id()
  AND is_read = false;
  
  RETURN unread_count;
END;
$$;

-- 1.4 修复 mark_notification_as_read
DROP FUNCTION IF EXISTS mark_notification_as_read(uuid);

CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id 
  AND recipient_id = auth.uid()
  AND boss_id = get_current_user_boss_id();
END;
$$;

-- 1.5 修复 mark_all_notifications_as_read
DROP FUNCTION IF EXISTS mark_all_notifications_as_read();

CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE recipient_id = auth.uid()
  AND boss_id = get_current_user_boss_id()
  AND is_read = false;
END;
$$;

-- 1.6 修复 get_active_scroll_notifications
-- 注意：notifications 表没有 is_dismissed 和 expires_at 字段
-- 修改为返回最新的未读通知
DROP FUNCTION IF EXISTS get_active_scroll_notifications(uuid);

CREATE OR REPLACE FUNCTION get_active_scroll_notifications(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  type text,
  title text,
  content text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.content,
    n.created_at
  FROM notifications n
  WHERE n.recipient_id = p_user_id
  AND n.boss_id = get_current_user_boss_id()
  AND n.is_read = false
  ORDER BY n.created_at DESC
  LIMIT 1;
END;
$$;

-- 1.7 修复 cleanup_expired_notifications
-- 修改为清理 30 天前的已读通知
DROP FUNCTION IF EXISTS cleanup_expired_notifications();

CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
  AND created_at < now() - interval '30 days';
END;
$$;

-- ============================================
-- 2. 修复仓库访问函数
-- ============================================

-- 2.1 修复 can_access_warehouse
DROP FUNCTION IF EXISTS can_access_warehouse(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION can_access_warehouse(uid uuid, wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid 
    AND p.role = 'super_admin'::user_role
    AND p.boss_id = get_current_user_boss_id()
  ) OR EXISTS (
    SELECT 1 FROM manager_warehouses mw
    JOIN warehouses w ON mw.warehouse_id = w.id
    WHERE mw.manager_id = uid 
    AND mw.warehouse_id = wid
    AND w.boss_id = get_current_user_boss_id()
  );
$$;

-- 2.2 修复 get_manager_warehouse_ids
DROP FUNCTION IF EXISTS get_manager_warehouse_ids(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_manager_warehouse_ids(uid uuid)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(mw.warehouse_id)
  FROM manager_warehouses mw
  JOIN warehouses w ON mw.warehouse_id = w.id
  WHERE mw.manager_id = uid
  AND w.boss_id = get_current_user_boss_id();
$$;

-- 2.3 修复 is_driver_of_warehouse
DROP FUNCTION IF EXISTS is_driver_of_warehouse(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_driver_of_warehouse(uid uuid, wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM driver_warehouses dw
    JOIN warehouses w ON dw.warehouse_id = w.id
    WHERE dw.driver_id = uid 
    AND dw.warehouse_id = wid
    AND w.boss_id = get_current_user_boss_id()
  );
$$;

-- 2.4 修复 is_manager_of_warehouse
DROP FUNCTION IF EXISTS is_manager_of_warehouse(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_manager_of_warehouse(uid uuid, wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM manager_warehouses mw
    JOIN warehouses w ON mw.warehouse_id = w.id
    WHERE mw.manager_id = uid 
    AND mw.warehouse_id = wid
    AND w.boss_id = get_current_user_boss_id()
  );
$$;

-- 2.5 修复 is_manager_of_driver
DROP FUNCTION IF EXISTS is_manager_of_driver(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_manager_of_driver(manager_id uuid, driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM driver_warehouses dw
    INNER JOIN manager_warehouses mw ON dw.warehouse_id = mw.warehouse_id
    INNER JOIN warehouses w ON dw.warehouse_id = w.id
    WHERE mw.manager_id = manager_id
      AND dw.driver_id = driver_id
      AND w.boss_id = get_current_user_boss_id()
  );
$$;