/*
# 替换 is_admin 函数使用正确的表

## 问题描述
- `is_admin` 函数引用了不存在的 `profiles` 表
- 导致更新 warehouses 表时报错：relation "profiles" does not exist
- 当前系统使用的是 `user_roles` 表，而不是 `profiles` 表

## 影响范围
- 无法更新仓库信息
- 所有使用 `is_admin` 函数的 RLS 策略都会失败

## 修复方案
使用 CREATE OR REPLACE 替换 `is_admin` 函数，使用 `user_roles` 表而不是 `profiles` 表

## 表结构
- user_roles 表包含：user_id, role
- role 的可能值：BOSS, MANAGER, DRIVER
*/

-- 替换 is_admin 函数，使用 user_roles 表
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role IN ('BOSS', 'MANAGER')
  FROM user_roles
  WHERE user_id = p_user_id;
$$;

COMMENT ON FUNCTION is_admin(uuid) IS '检查用户是否是管理员（BOSS 或 MANAGER）';