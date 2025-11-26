/*
# 修复 create_notifications_batch 函数以支持 boss_id

## 问题
当前的 create_notifications_batch 函数在插入通知时没有设置 boss_id 字段，
这会导致插入失败（因为 boss_id 是 NOT NULL）。

## 解决方案
1. 从当前用户的 profile 获取 boss_id
2. 在插入通知时自动添加 boss_id
3. 确保所有新创建的通知都有正确的 boss_id

## 变更内容
- 更新 create_notifications_batch 函数
- 添加 boss_id 字段到 INSERT 语句
- 从 profiles 表获取当前用户的 boss_id
*/

CREATE OR REPLACE FUNCTION create_notifications_batch(notifications jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count int;
  current_user_id uuid;
  current_user_name text;
  current_user_role text;
  current_boss_id text;
BEGIN
  -- 获取当前用户信息（包括 boss_id）
  SELECT id, name, role::text, boss_id 
  INTO current_user_id, current_user_name, current_user_role, current_boss_id
  FROM profiles
  WHERE id = auth.uid();

  -- 如果没有找到当前用户，使用默认值
  IF current_user_id IS NULL THEN
    current_user_id := auth.uid();
    current_user_name := '系统';
    current_user_role := 'super_admin';
    -- 如果没有 boss_id，抛出错误
    RAISE EXCEPTION '无法获取当前用户的 boss_id，请确保用户已登录';
  END IF;

  -- 如果没有 boss_id，抛出错误
  IF current_boss_id IS NULL THEN
    RAISE EXCEPTION '当前用户没有 boss_id，请联系管理员';
  END IF;

  -- 插入通知（支持新旧字段名，并自动添加 boss_id）
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
      related_id,
      is_read,
      boss_id
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
      -- related_id: 关联的业务对象ID
      (n->>'related_id')::uuid,
      -- is_read
      COALESCE((n->>'is_read')::boolean, false),
      -- boss_id: 使用当前用户的 boss_id
      current_boss_id
    FROM jsonb_array_elements(notifications) AS n
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;

  RETURN inserted_count;
END;
$$;
