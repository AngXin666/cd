/*
# 删除与 lease_admin 相关的函数和策略

## 问题描述
虽然 lease_admin 角色已从 user_role 枚举中移除，但仍有一些函数和策略引用了这个角色，
导致在某些情况下出现 "invalid input value for enum user_role: 'lease_admin'" 错误。

## 解决方案
删除所有与 lease_admin 相关的函数和策略：
1. init_lease_admin_profile 函数
2. is_lease_admin_user 函数
3. 相关的 RLS 策略

## 影响
- 移除已废弃的 lease_admin 相关功能
- 防止因引用已删除的枚举值而导致的错误
*/

-- 1. 删除策略
DROP POLICY IF EXISTS "租赁管理员查看所有用户" ON profiles;
DROP POLICY IF EXISTS "Lease admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Lease admins can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Lease admins can update notifications" ON notifications;
DROP POLICY IF EXISTS "Lease admins can delete notifications" ON notifications;

-- 2. 删除函数
DROP FUNCTION IF EXISTS public.init_lease_admin_profile(uuid, text);
DROP FUNCTION IF EXISTS public.is_lease_admin_user(uuid);
DROP FUNCTION IF EXISTS public.is_lease_admin();

-- 3. 记录日志
DO $$
BEGIN
  RAISE NOTICE '✅ 已删除所有与 lease_admin 相关的函数和策略';
  RAISE NOTICE '  - 删除函数: init_lease_admin_profile';
  RAISE NOTICE '  - 删除函数: is_lease_admin_user';
  RAISE NOTICE '  - 删除函数: is_lease_admin';
  RAISE NOTICE '  - 删除相关 RLS 策略';
END $$;
