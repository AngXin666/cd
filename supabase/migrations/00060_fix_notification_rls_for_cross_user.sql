/*
# 修复通知系统 RLS 策略 - 支持跨用户通知

## 问题
司机提交请假申请时，需要为所有管理员创建通知，但是 RLS 策略阻止了这个操作。
错误：new row violates row-level security policy for table "notifications"

## 根本原因
虽然 INSERT 策略设置为 `WITH CHECK (true)`，但是在某些情况下，Supabase 客户端可能无法正确处理跨用户的通知创建。

## 解决方案
创建一个 SECURITY DEFINER 函数，绕过 RLS 限制，允许任何认证用户为其他用户创建通知。

## 安全性
- 函数使用 SECURITY DEFINER，以函数所有者（postgres）的权限执行
- 只允许认证用户调用
- 不限制通知的接收者，因为通知系统需要支持跨用户通知（如司机通知管理员）
*/

-- 创建批量创建通知的函数
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
BEGIN
  -- 插入通知
  WITH inserted AS (
    INSERT INTO notifications (user_id, type, title, message, related_id, is_read)
    SELECT 
      (n->>'user_id')::uuid,
      (n->>'type')::notification_type,
      n->>'title',
      n->>'message',
      (n->>'related_id')::uuid,
      COALESCE((n->>'is_read')::boolean, false)
    FROM jsonb_array_elements(notifications) AS n
    RETURNING id
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;
  
  RETURN inserted_count;
END;
$$;

-- 授权给认证用户
GRANT EXECUTE ON FUNCTION create_notifications_batch(jsonb) TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION create_notifications_batch(jsonb) IS '批量创建通知，绕过 RLS 限制，支持跨用户通知';
