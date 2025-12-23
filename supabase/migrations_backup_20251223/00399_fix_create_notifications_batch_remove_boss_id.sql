/*
# 修复 create_notifications_batch 函数，移除 boss_id 字段

## 问题
1. create_notifications_batch 函数要求 boss_id 字段
2. 但是 profiles 表和 notifications 表都没有 boss_id 字段
3. 导致函数执行失败，通知无法创建

## 解决方案
1. 移除 boss_id 相关的代码
2. 简化函数逻辑
3. 确保通知可以正常创建

## 核心原则
- 移除不存在的字段引用
- 保持函数的核心功能
- 确保通知创建成功

*/

-- ============================================================================
-- 更新 create_notifications_batch 函数
-- ============================================================================
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
BEGIN
  -- 获取当前用户信息
  SELECT id, name, role::text
  INTO current_user_id, current_user_name, current_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- 如果没有找到当前用户，使用默认值
  IF current_user_id IS NULL THEN
    current_user_id := auth.uid();
    current_user_name := '系统';
    current_user_role := 'system';
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
      related_id,
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
      -- related_id: 关联的业务对象ID
      (n->>'related_id')::uuid,
      -- is_read
      COALESCE((n->>'is_read')::boolean, false)
    FROM jsonb_array_elements(notifications) AS n
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;

  RETURN inserted_count;
END;
$$;

COMMENT ON FUNCTION create_notifications_batch(jsonb) 
IS '批量创建通知，支持新旧字段名，使用 SECURITY DEFINER 绕过 RLS 限制';

-- 授权给认证用户
GRANT EXECUTE ON FUNCTION create_notifications_batch(jsonb) TO authenticated;
