/*
# 修复 create_notifications_batch 函数

## 问题
- 函数引用了不存在的 profiles 表
- 导致创建通知时失败

## 修复
- 更新函数以使用 users 和 user_roles 表
- 添加角色映射逻辑，将大写角色转换为小写
*/

CREATE OR REPLACE FUNCTION public.create_notifications_batch(notifications jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inserted_count int;
  current_user_id uuid;
  current_user_name text;
  current_user_role text;
  user_role_upper text;
BEGIN
  -- 获取当前用户信息 - 单用户架构：从 users + user_roles 查询
  SELECT u.id, u.name, ur.role::text
  INTO current_user_id, current_user_name, user_role_upper
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  WHERE u.id = auth.uid();

  -- 如果没有找到当前用户，使用默认值
  IF current_user_id IS NULL THEN
    current_user_id := auth.uid();
    current_user_name := '系统';
    current_user_role := 'system';
  ELSE
    -- 将大写角色映射为小写角色
    current_user_role := CASE user_role_upper
      WHEN 'BOSS' THEN 'boss'
      WHEN 'MANAGER' THEN 'manager'
      WHEN 'DRIVER' THEN 'driver'
      WHEN 'DISPATCHER' THEN 'fleet_leader'
      ELSE 'system'
    END;
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
$function$;