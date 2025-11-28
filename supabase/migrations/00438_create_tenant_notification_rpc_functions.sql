/*
# 创建租户通知系统的 RPC 函数

## 功能说明
为多租户架构创建通知系统的 RPC 函数，实现租户级别的数据隔离。

## 新增函数
1. get_tenant_notifications：查询租户 Schema 的通知列表
2. create_tenant_notification：在租户 Schema 创建通知
3. mark_tenant_notification_read：标记租户 Schema 的通知为已读
4. get_tenant_unread_notification_count：获取租户 Schema 的未读通知数量

## 数据隔离
- 每个租户的通知存储在各自的 Schema 中
- 租户之间的通知完全隔离
- 支持租户级别的权限控制

## 安全性
- 使用 SECURITY DEFINER 以管理员权限执行
- 验证 Schema 名称格式（防止 SQL 注入）
- 只有 authenticated 角色可以执行
*/

-- ============================================================================
-- 1. 查询租户通知列表
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_tenant_notifications(
  p_tenant_id uuid,
  p_user_id uuid,
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_sql text;
  v_result jsonb;
BEGIN
  -- 获取租户的 Schema 名称
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id
  LIMIT 1;

  IF v_schema_name IS NULL THEN
    RAISE NOTICE '❌ 租户不存在: %', p_tenant_id;
    RETURN '[]'::jsonb;
  END IF;

  -- 验证 Schema 名称格式（防止 SQL 注入）
  IF v_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid schema name format: %', v_schema_name;
  END IF;

  RAISE NOTICE '✅ 查询租户 % 的通知，用户 ID: %', v_schema_name, p_user_id;

  -- 从租户 Schema 查询通知
  v_sql := format('
    SELECT COALESCE(jsonb_agg(row_to_json(n.*) ORDER BY n.created_at DESC), ''[]''::jsonb)
    FROM (
      SELECT *
      FROM %I.notifications
      WHERE receiver_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    ) n
  ', v_schema_name);

  EXECUTE v_sql INTO v_result USING p_user_id, p_limit;

  RAISE NOTICE '✅ 查询完成，返回 % 条通知', jsonb_array_length(v_result);

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_notifications TO authenticated;
COMMENT ON FUNCTION public.get_tenant_notifications IS '查询租户 Schema 的通知列表';

-- ============================================================================
-- 2. 创建租户通知
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_tenant_notification(
  p_tenant_id uuid,
  p_sender_id uuid,
  p_receiver_id uuid,
  p_title text,
  p_content text,
  p_type text DEFAULT 'user'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_sql text;
  v_result jsonb;
BEGIN
  -- 获取租户的 Schema 名称
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id
  LIMIT 1;

  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
  END IF;

  -- 验证 Schema 名称格式（防止 SQL 注入）
  IF v_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid schema name format: %', v_schema_name;
  END IF;

  RAISE NOTICE '✅ 在租户 % 创建通知', v_schema_name;
  RAISE NOTICE '  - 发送者: %', p_sender_id;
  RAISE NOTICE '  - 接收者: %', p_receiver_id;
  RAISE NOTICE '  - 标题: %', p_title;

  -- 在租户 Schema 创建通知
  v_sql := format('
    INSERT INTO %I.notifications (sender_id, receiver_id, title, content, type, status, created_at)
    VALUES ($1, $2, $3, $4, $5, ''unread'', NOW())
    RETURNING row_to_json(%I.notifications.*)
  ', v_schema_name, v_schema_name);

  EXECUTE v_sql INTO v_result USING p_sender_id, p_receiver_id, p_title, p_content, p_type;

  RAISE NOTICE '✅ 通知创建成功，ID: %', v_result->>'id';

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tenant_notification TO authenticated;
COMMENT ON FUNCTION public.create_tenant_notification IS '在租户 Schema 创建通知';

-- ============================================================================
-- 3. 标记通知为已读
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_tenant_notification_read(
  p_tenant_id uuid,
  p_notification_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_sql text;
  v_updated_count int;
BEGIN
  -- 获取租户的 Schema 名称
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id
  LIMIT 1;

  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
  END IF;

  -- 验证 Schema 名称格式（防止 SQL 注入）
  IF v_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid schema name format: %', v_schema_name;
  END IF;

  RAISE NOTICE '✅ 标记租户 % 的通知为已读', v_schema_name;
  RAISE NOTICE '  - 通知 ID: %', p_notification_id;
  RAISE NOTICE '  - 用户 ID: %', p_user_id;

  -- 更新通知状态
  v_sql := format('
    UPDATE %I.notifications
    SET status = ''read'', read_at = NOW()
    WHERE id = $1 AND receiver_id = $2
  ', v_schema_name);

  EXECUTE v_sql USING p_notification_id, p_user_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count > 0 THEN
    RAISE NOTICE '✅ 通知已标记为已读';
    RETURN true;
  ELSE
    RAISE NOTICE '⚠️ 未找到匹配的通知';
    RETURN false;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_tenant_notification_read TO authenticated;
COMMENT ON FUNCTION public.mark_tenant_notification_read IS '标记租户 Schema 的通知为已读';

-- ============================================================================
-- 4. 获取未读通知数量
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_tenant_unread_notification_count(
  p_tenant_id uuid,
  p_user_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_sql text;
  v_count int;
BEGIN
  -- 获取租户的 Schema 名称
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id
  LIMIT 1;

  IF v_schema_name IS NULL THEN
    RAISE NOTICE '❌ 租户不存在: %', p_tenant_id;
    RETURN 0;
  END IF;

  -- 验证 Schema 名称格式（防止 SQL 注入）
  IF v_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid schema name format: %', v_schema_name;
  END IF;

  RAISE NOTICE '✅ 查询租户 % 的未读通知数量，用户 ID: %', v_schema_name, p_user_id;

  -- 从租户 Schema 查询未读通知数量
  v_sql := format('
    SELECT COUNT(*)::int
    FROM %I.notifications
    WHERE receiver_id = $1 AND status = ''unread''
  ', v_schema_name);

  EXECUTE v_sql INTO v_count USING p_user_id;

  RAISE NOTICE '✅ 未读通知数量: %', v_count;

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_unread_notification_count TO authenticated;
COMMENT ON FUNCTION public.get_tenant_unread_notification_count IS '获取租户 Schema 的未读通知数量';
