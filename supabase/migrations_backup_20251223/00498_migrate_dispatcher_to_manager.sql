/*
# 将 DISPATCHER 角色迁移到 MANAGER - 步骤 2

## 背景
MANAGER 枚举值已添加，现在将所有 DISPATCHER 角色更新为 MANAGER。

## 操作
- 将所有 DISPATCHER 角色更新为 MANAGER

## 影响
- 所有当前的 DISPATCHER 用户将变为 MANAGER 用户
- 代码中使用的 MANAGER 角色将正常工作
*/

-- 将所有 DISPATCHER 角色更新为 MANAGER
UPDATE user_roles 
SET role = 'MANAGER'::user_role 
WHERE role = 'DISPATCHER'::user_role;