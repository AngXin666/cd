/*
# 添加自动确认用户邮箱的函数

## 问题
//*/*/*ER，以数据库所有者权限执行
- 只更新 confirmed_at 和 email_confirmed_at 字段
- 不修改其他敏感信息
*/

-- 创建自动确认用户邮箱的函数
CREATE OR REPLACE FUNCTION confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 更新 auth.users 表，设置邮箱已确认
  UPDATE auth.users
  SET 
    confirmed_at = NOW(),
    email_confirmed_at = NOW()
  WHERE id = user_id
    AND confirmed_at IS NULL;  -- 只更新未确认的用户
END;
$$;

-- 授予执行权限给认证用户
GRANT EXECUTE ON FUNCTION confirm_user_email(uuid) TO authenticated;
