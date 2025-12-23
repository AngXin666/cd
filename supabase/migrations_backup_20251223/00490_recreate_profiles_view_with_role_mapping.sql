/*
# 重新创建 profiles 视图以映射角色名

## 问题
旧代码使用小写的角色名（driver, super_admin, manager），
但新系统使用大写的角色名（DRIVER, BOSS, DISPATCHER）。

## 解决方案
1. 删除旧的 profiles 视图
2. 重新创建视图，将新的角色名映射到旧的角色名：
   - BOSS → super_admin
   - DISPATCHER → manager
   - DRIVER → driver

这样旧代码可以继续使用原来的角色名查询。
*/

-- 删除旧视图
DROP VIEW IF EXISTS profiles;

-- 重新创建 profiles 视图，添加角色名映射
CREATE VIEW profiles AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone,
  CASE 
    WHEN ur.role = 'BOSS' THEN 'super_admin'
    WHEN ur.role = 'DISPATCHER' THEN 'manager'
    WHEN ur.role = 'DRIVER' THEN 'driver'
    ELSE ur.role::text
  END AS role,
  'active'::text AS status,
  u.created_at,
  u.updated_at,
  NULL::uuid AS main_account_id
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id;