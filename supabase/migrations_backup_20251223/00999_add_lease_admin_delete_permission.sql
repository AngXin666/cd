/*
# 添加租赁管理员删除权限

## 说明
租赁管理员需要能够删除租户（老板账号）及其所有关联数据。

## 变更内容
1. 添加租赁管理员删除 profiles 表中 super_admin 角色用户的权限
2. 确保级联删除功能正常工作

## 安全性
- 只允许删除 role = 'super_admin' 的用户
- 只有租赁管理员（role = 'lease_admin'）可以执行删除操作
- 删除会自动级联到所有关联表（通过 ON DELETE CASCADE）

## 影响范围
- profiles 表的 RLS 策略
*/

-- 添加租赁管理员删除老板账号的权限
CREATE POLICY "租赁管理员可以删除老板账号" ON profiles
  FOR DELETE TO authenticated
  USING (
    -- 当前用户必须是租赁管理员
    is_lease_admin_user(auth.uid())
    AND
    -- 只能删除老板账号（super_admin）
    role = 'super_admin'::user_role
  );

COMMENT ON POLICY "租赁管理员可以删除老板账号" ON profiles IS 
'租赁管理员可以删除老板账号（super_admin），删除时会自动级联删除所有关联数据';
