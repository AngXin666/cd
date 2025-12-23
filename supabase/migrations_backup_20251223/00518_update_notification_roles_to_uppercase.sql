/*
# 更新通知表角色为大写格式

## 问题
- notifications 表的 sender_role 字段使用小写格式（'manager', 'super_admin', 'driver', 'boss'）
- 系统中的角色都是大写格式（MANAGER, BOSS, DRIVER）
- 导致角色映射混乱

## 修复
1. 先删除旧的 CHECK 约束
2. 更新现有数据：将小写角色转换为大写
3. 添加新的 CHECK 约束：使用大写角色
4. 更新 create_notifications_batch 函数：使用大写角色

## 角色映射
- 'manager' -> 'MANAGER'
- 'super_admin' -> 'BOSS'
- 'boss' -> 'BOSS'
- 'driver' -> 'DRIVER'
- 'fleet_leader' -> 'DISPATCHER'
*/

-- 1. 先删除旧的 CHECK 约束
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_sender_role_check;

-- 2. 更新现有数据
UPDATE notifications
SET sender_role = CASE
  WHEN sender_role = 'manager' THEN 'MANAGER'
  WHEN sender_role = 'super_admin' THEN 'BOSS'
  WHEN sender_role = 'boss' THEN 'BOSS'
  WHEN sender_role = 'driver' THEN 'DRIVER'
  WHEN sender_role = 'fleet_leader' THEN 'DISPATCHER'
  ELSE UPPER(sender_role)
END;

-- 3. 添加新的 CHECK 约束（使用大写角色）
ALTER TABLE notifications ADD CONSTRAINT notifications_sender_role_check 
  CHECK (sender_role IN ('MANAGER', 'BOSS', 'DRIVER', 'DISPATCHER'));

-- 4. 更新 create_notifications_batch 函数
CREATE OR REPLACE FUNCTION create_notifications_batch(
  p_recipient_ids uuid[],
  p_sender_id uuid,
  p_type text,
  p_title text,
  p_content text,
  p_action_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name text;
  v_sender_role text;
  v_recipient_id uuid;
BEGIN
  -- 获取发送者信息（从 users 和 user_roles 表）
  SELECT u.name, ur.role::text
  INTO v_sender_name, v_sender_role
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  WHERE u.id = p_sender_id;

  -- 如果找不到发送者，使用默认值
  IF v_sender_name IS NULL THEN
    v_sender_name := '系统';
    v_sender_role := 'BOSS';
  END IF;

  -- 角色已经是大写格式，无需映射

  -- 批量插入通知
  FOREACH v_recipient_id IN ARRAY p_recipient_ids
  LOOP
    INSERT INTO notifications (
      recipient_id,
      sender_id,
      sender_name,
      sender_role,
      type,
      title,
      content,
      action_url
    ) VALUES (
      v_recipient_id,
      p_sender_id,
      v_sender_name,
      v_sender_role,
      p_type,
      p_title,
      p_content,
      p_action_url
    );
  END LOOP;
END;
$$;
