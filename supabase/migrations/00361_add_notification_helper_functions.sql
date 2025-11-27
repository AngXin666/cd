-- 创建辅助函数：在租户 Schema 中插入通知
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_schema_name TEXT,
  p_sender_id UUID,
  p_receiver_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_type TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- 在租户 Schema 中插入通知
  EXECUTE format('
    INSERT INTO %I.notifications (sender_id, receiver_id, title, content, type, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  ', p_schema_name)
  USING p_sender_id, p_receiver_id, p_title, p_content, p_type, 'unread'
  INTO v_notification_id;
  
  RETURN jsonb_build_object('success', true, 'notification_id', v_notification_id);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.insert_notification(TEXT, UUID, UUID, TEXT, TEXT, TEXT) IS '在租户 Schema 中插入通知';

-- 创建辅助函数：查询租户 Schema 中的通知
CREATE OR REPLACE FUNCTION public.get_notifications(
  p_schema_name TEXT,
  p_receiver_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 查询租户 Schema 中的通知
  EXECUTE format('
    SELECT jsonb_agg(row_to_json(n.*))
    FROM (
      SELECT *
      FROM %I.notifications
      WHERE receiver_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    ) n
  ', p_schema_name)
  USING p_receiver_id, p_limit
  INTO v_result;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.get_notifications(TEXT, UUID, INTEGER) IS '查询租户 Schema 中的通知';

-- 创建辅助函数：标记通知为已读
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_schema_name TEXT,
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 标记通知为已读
  EXECUTE format('
    UPDATE %I.notifications
    SET status = $1, read_at = NOW()
    WHERE id = $2 AND receiver_id = $3
  ', p_schema_name)
  USING 'read', p_notification_id, p_user_id;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.mark_notification_read(TEXT, UUID, UUID) IS '标记通知为已读';