/*
# 修复自动确认用户邮箱的函数

## 问题
confirmed_at 是一个生成列（GENERATED ALWAYS），不能直接更新。
只需要更新 email_confirmed_at，confirmed_at 会自动生成。

## 解决方案
只更新 email_confirmed_at 字段。
*/

-- 重新创建自动确认用户邮箱的函数
CREATE OR REPLACE FUNCTION confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 更新 auth.users 表，设置邮箱已确认
  -- confirmed_at 是生成列，会自动根据 email_confirmed_at 生成
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = user_id
    AND email_confirmed_at IS NULL;  -- 只更新未确认的用户
END;
$$;
