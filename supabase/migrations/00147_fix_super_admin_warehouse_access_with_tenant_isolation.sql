
/*
# 修复超级管理员仓库访问权限（保持租户隔离）

## 问题
之前的修复方案（00146）破坏了租户隔离，导致不同租户的超级管理员可以看到其他租户的数据。

## 原因
之前的策略只检查了 is_super_admin(auth.uid())，没有加上租户隔离条件。

## 解决方案
1. 删除之前的错误策略
2. 创建新的策略，同时检查超级管理员权限和租户隔离

## 租户隔离逻辑
- 主账号（老板）：tenant_id = 自己的 id
- 平级账号和其他角色：tenant_id = 主账号的 id
- 超级管理员只能查看自己租户内的数据

## 影响范围
- driver_warehouses 表：修复超级管理员查看权限，保持租户隔离
- manager_warehouses 表：修复超级管理员查看权限，保持租户隔离
*/

-- 删除之前的错误策略
DROP POLICY IF EXISTS "Super admins can view all driver warehouse assignments" ON driver_warehouses;
DROP POLICY IF EXISTS "Super admins can view all manager warehouse assignments" ON manager_warehouses;

-- 为 driver_warehouses 表添加正确的超级管理员查看权限（包含租户隔离）
CREATE POLICY "Super admins can view driver warehouses in their tenant"
ON driver_warehouses
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) 
  AND tenant_id = get_user_tenant_id()
);

-- 为 manager_warehouses 表添加正确的超级管理员查看权限（包含租户隔离）
CREATE POLICY "Super admins can view manager warehouses in their tenant"
ON manager_warehouses
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) 
  AND tenant_id = get_user_tenant_id()
);
