/*
# 创建更新用户邮箱的函数

## 功能说明
当超级管理员修改用户的登录账号时，需要同步更新 auth.users 表的 email 字段，
以确保用户可以使用新的登录账号进行登录。

## 函数说明
- 函数名：update_user_email
- 参数：
  - target_user_id (uuid): 目标用户的 ID
  - new_email (text): 新的邮箱地址
- 返回值：void
- 权限：SECURITY DEFINER（以函数定义者的权限执行）

## 安全性
- 只有超级管理员可以调用此函数
- 使用 is_super_admin 函数验证调用者权限
- 直接更新 auth.users 表的 email 和 email_confirmed_at 字段

## 注意事项
- 此函数会将 email_confirmed_at 设置为当前时间，表示邮箱已确认
- 不会发送邮箱验证邮件
- 更新后用户可以立即使用新邮箱登录
*/

CREATE OR REPLACE FUNCTION update_user_email(
  target_user_id uuid,
  new_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 检查调用者是否为超级管理员
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION '只有超级管理员可以修改用户邮箱';
  END IF;

  -- 检查新邮箱是否已被其他用户使用
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = new_email 
    AND id != target_user_id
  ) THEN
    RAISE EXCEPTION '该邮箱已被其他用户使用';
  END IF;

  -- 更新用户邮箱
  UPDATE auth.users
  SET 
    email = new_email,
    email_confirmed_at = now(),
    updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在';
  END IF;
END;
$$;
