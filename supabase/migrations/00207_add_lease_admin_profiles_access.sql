/*
# 添加租赁管理员查看 profiles 的权限

## 问题
租赁管理员（lease_admin）无法查询 profiles 表，导致租赁系统管理页面的统计数据都是 0

## 根本原因
profiles 表的 RLS 策略没有给 lease_admin 角色添加查询权限

## 解决方案
添加一个策略，允许租赁管理员查看所有 super_admin 角色的用户（老板账号）

## 影响
- 租赁管理员可以查看所有老板账号的基本信息
- 租赁系统管理页面的统计数据可以正常显示

*/

-- 添加租赁管理员查看所有老板账号的策略
CREATE POLICY "Lease admins can view all boss accounts" ON profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) = 'lease_admin'
    AND
    role = 'super_admin'
  );

COMMENT ON POLICY "Lease admins can view all boss accounts" ON profiles IS '租赁管理员可以查看所有老板账号';
