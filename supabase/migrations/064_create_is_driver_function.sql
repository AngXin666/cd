/*
# 创建 is_driver 辅助函数

## 目的
创建 is_driver 函数用于检查用户是否为司机角色。

## 函数说明
- 输入: user_id (uuid)
- 输出: boolean
- 功能: 检查指定用户是否为司机角色
*/

CREATE OR REPLACE FUNCTION is_driver(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_id
    AND role = 'driver'
  );
$$;

COMMENT ON FUNCTION is_driver(uuid) IS '检查用户是否为司机角色';
