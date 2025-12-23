/*
# 添加租赁管理员查看 profiles 的权限

## 问题
租赁管理员（lease_admin）无法查询 profiles 表，导致无法获取统计数据

## 解决方案
添加一个策略，允许租赁管理员查看所有 super_admin 角色的用户（老板账号）

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
