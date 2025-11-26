/*
# 更新批量创建通知函数

## 变更说明
更新 `create_notifications_batch` 函数以匹配新的通知表结构：
- `user_id` → `recipient_id`
- `message` → `content`
- 添加 `sender_id`, `sender_name`, `sender_role` 字段
- 移除 `notification_type` 枚举，改为 `text` 类型

## 影响范围
- 更新 `create_notifications_batch` 函数
- 保持向后兼容性，支持旧的字段名（自动转换）
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS create_notifications_batch(jsonb);

-- 创建新的批量创建通知函数
CREATE OR REPLACE FUNCTION create_notifications_batch(
  notifications jsonb
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count int;
  current_user_id uuid;
  current_user_name text;
  current_user_role text;
BEGIN
  -- 获取当前用户信息
  SELECT id, name, role::text INTO current_user_id, current_user_name, current_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- 如果没有找到当前用户，使用默认值
  IF current_user_id IS NULL THEN
    current_user_id := auth.uid();
    current_user_name := '系统';
    current_user_role := 'super_admin';
  END IF;

  -- 插入通知（支持新旧字段名）
  WITH inserted AS (
    INSERT INTO notifications (
      recipient_id, 
      sender_id, 
      sender_name, 
      sender_role, 
      type, 
      title, 
      content, 
      action_url, 
      is_read
    )
    SELECT 
      -- 支持 user_id 或 recipient_id
      COALESCE((n->>'recipient_id')::uuid, (n->>'user_id')::uuid),
      -- sender_id: 使用提供的值或当前用户ID
      COALESCE((n->>'sender_id')::uuid, current_user_id),
      -- sender_name: 使用提供的值或当前用户名
      COALESCE(n->>'sender_name', current_user_name),
      -- sender_role: 使用提供的值或当前用户角色
      COALESCE(n->>'sender_role', current_user_role),
      -- type: 直接使用文本类型
      COALESCE(n->>'type', 'system'),
      -- title
      n->>'title',
      -- 支持 message 或 content
      COALESCE(n->>'content', n->>'message'),
      -- action_url
      n->>'action_url',
      -- is_read
      COALESCE((n->>'is_read')::boolean, false)
    FROM jsonb_array_elements(notifications) AS n
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;

  RETURN inserted_count;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION create_notifications_batch(jsonb) TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION create_notifications_batch(jsonb) IS '批量创建通知，绕过 RLS 限制，支持跨用户通知。支持新旧字段名（user_id/recipient_id, message/content）';
