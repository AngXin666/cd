/*
# 修复 create_notification 函数 - 移除 boss_id 引用

## 说明
修复 create_notification 函数，移除对 boss_id 字段的引用，以匹配当前的数据库结构。
这样可以确保所有角色（老板、平级账号、车队长、司机）都能正常创建通知。

## 变更内容
1. 从 profiles 表查询时移除 boss_id 字段
2. 向 notifications 表插入时移除 boss_id 字段
3. 移除 get_current_user_boss_id() 函数调用

## 影响范围
- 老板（lease_admin, peer_admin）
- 车队长（manager）
- 司机（driver）
- 超级管理员（super_admin）

*/

-- 重新创建 create_notification 函数
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, 
  p_type notification_type, 
  p_title text, 
  p_content text, 
  p_related_id uuid DEFAULT NULL::uuid, 
  p_action_url text DEFAULT NULL::text
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
BEGIN
  -- 获取当前用户信息
  SELECT id, name, role::text
  INTO v_sender_id, v_sender_name, v_sender_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- 如果没有找到当前用户，使用默认值
  IF v_sender_id IS NULL THEN
    v_sender_id := auth.uid();
    v_sender_name := '系统';
    v_sender_role := 'super_admin';
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
    related_id
  ) VALUES (
    p_user_id,
    v_sender_id,
    v_sender_name,
    v_sender_role,
    p_type::text,
    p_title,
    p_content,
    p_action_url,
    p_related_id
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- 添加注释
COMMENT ON FUNCTION public.create_notification IS '创建单个通知，支持所有角色（老板、平级账号、车队长、司机）';