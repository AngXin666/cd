/*
# 修复重置密码函数 - 明确指定 schema

## 问题
gen_salt 函数找不到，因为 search_path 设置不正确

## 解决方案
1. 在 search_path 中添加 extensions schema
2. 使用完全限定的函数名（extensions.gen_salt, extensions.crypt）
3. 确保 pgcrypto 扩展的函数可以被正确访问

## 修改内容
- 更新 reset_user_password_by_admin 函数
- 修复 search_path 配置：public, auth, extensions
- 使用完全限定名调用 pgcrypto 函数
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS reset_user_password_by_admin(uuid, text);

-- 重新创建函数，使用正确的 search_path
CREATE OR REPLACE FUNCTION reset_user_password_by_admin(
  target_user_id uuid,
  new_password text DEFAULT '123456'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
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
  FROM public.profiles
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
  
  -- 使用 crypt 函数加密密码（使用 extensions schema 的完全限定名）
  encrypted_password := extensions.crypt(new_password, extensions.gen_salt('bf'));
  
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
COMMENT ON FUNCTION reset_user_password_by_admin IS '超级管理员重置用户密码的函数，使用 pgcrypto 扩展加密密码';
