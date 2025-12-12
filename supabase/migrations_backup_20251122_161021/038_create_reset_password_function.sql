/*
# 创建重置密码函数

## 说明
创建一个 PostgreSQL 函数来重置用户密码，绕过 Supabase Auth 的 Go 后端扫描问题。

## 新增函数
- `reset_user_password_by_admin(target_user_id uuid, new_password text)` - 超级管理员重置用户密码

## 安全性
- 只有超级管理员可以调用此函数
- 使用 SECURITY DEFINER 以管理员权限执行
- 直接更新 auth.users 表的加密密码

## 注意事项
- 此函数使用 PostgreSQL 的 crypt 函数来加密密码
- 需要 pgcrypto 扩展
*/

-- 确保 pgcrypto 扩展已启用
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 创建重置密码函数
CREATE OR REPLACE FUNCTION reset_user_password_by_admin(
  target_user_id uuid,
  new_password text DEFAULT '123456'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_id uuid;
  calling_user_role user_role;
  target_user_exists boolean;
  encrypted_password text;
BEGIN
  -- 获取调用者的用户ID
  calling_user_id := auth.uid();
  
  -- 检查调用者是否已登录
  IF calling_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', '未授权',
      'details', '用户未登录'
    );
  END IF;
  
  -- 检查调用者的角色
  SELECT role INTO calling_user_role
  FROM profiles
  WHERE id = calling_user_id;
  
  -- 只有超级管理员可以重置密码
  IF calling_user_role != 'super_admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', '权限不足',
      'details', '只有超级管理员可以重置密码'
    );
  END IF;
  
  -- 检查目标用户是否存在
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) INTO target_user_exists;
  
  IF NOT target_user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', '用户不存在',
      'details', '未找到指定的用户ID'
    );
  END IF;
  
  -- 使用 crypt 函数加密密码（使用 bcrypt 算法）
  encrypted_password := crypt(new_password, gen_salt('bf'));
  
  -- 更新用户密码
  UPDATE auth.users
  SET 
    encrypted_password = encrypted_password,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- 返回成功结果
  RETURN json_build_object(
    'success', true,
    'message', '密码已重置为 ' || new_password
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', '重置密码失败',
      'details', SQLERRM
    );
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION reset_user_password_by_admin IS '超级管理员重置用户密码的函数，绕过 Supabase Auth 的扫描问题';
