/*
# 修复租赁管理员更新新创建租户的权限问题

## 问题
租赁管理员创建新租户后，无法更新新租户的 profiles 记录，因为新记录的 tenant_id 还是 NULL

## 解决方案
修改"租赁管理员更新老板账号"策略，允许更新 tenant_id 为 NULL 的 super_admin 记录
*/

-- 删除旧策略
DROP POLICY IF EXISTS "租赁管理员更新老板账号" ON profiles;

-- 创建新策略：允许租赁管理员更新所有 super_admin 记录（包括 tenant_id 为 NULL 的）
CREATE POLICY "租赁管理员更新老板账号" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_lease_admin_user(auth.uid()) AND role = 'super_admin'::user_role
  )
  WITH CHECK (
    role = 'super_admin'::user_role
  );
