
/*
# 为 manager_warehouses 表添加 INSERT、UPDATE、DELETE 策略

## 问题
manager_warehouses 表只有 SELECT 策略，导致超级管理员无法插入、更新、删除管理员的仓库分配。

## 解决方案
添加完整的 INSERT、UPDATE、DELETE 策略，允许：
1. 超级管理员可以管理本租户内的所有管理员仓库分配
2. 租赁管理员可以管理所有租户的管理员仓库分配

## 安全考虑
- 所有操作都包含租户隔离条件 `tenant_id = get_user_tenant_id()`
- 只有超级管理员和租赁管理员可以执行写操作
*/

-- 1. 添加 INSERT 策略：超级管理员可以为本租户的管理员分配仓库
CREATE POLICY "Super admins can insert manager warehouse assignments in their tenant"
ON manager_warehouses
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid()) 
  AND tenant_id = get_user_tenant_id()
);

-- 2. 添加 INSERT 策略：租赁管理员可以为所有租户的管理员分配仓库
CREATE POLICY "Lease admins can insert manager warehouse assignments"
ON manager_warehouses
FOR INSERT
TO authenticated
WITH CHECK (is_lease_admin());

-- 3. 添加 UPDATE 策略：超级管理员可以更新本租户的管理员仓库分配
CREATE POLICY "Super admins can update manager warehouse assignments in their tenant"
ON manager_warehouses
FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid()) 
  AND tenant_id = get_user_tenant_id()
)
WITH CHECK (
  is_super_admin(auth.uid()) 
  AND tenant_id = get_user_tenant_id()
);

-- 4. 添加 UPDATE 策略：租赁管理员可以更新所有租户的管理员仓库分配
CREATE POLICY "Lease admins can update manager warehouse assignments"
ON manager_warehouses
FOR UPDATE
TO authenticated
USING (is_lease_admin())
WITH CHECK (is_lease_admin());

-- 5. 添加 DELETE 策略：超级管理员可以删除本租户的管理员仓库分配
CREATE POLICY "Super admins can delete manager warehouse assignments in their tenant"
ON manager_warehouses
FOR DELETE
TO authenticated
USING (
  is_super_admin(auth.uid()) 
  AND tenant_id = get_user_tenant_id()
);

-- 6. 添加 DELETE 策略：租赁管理员可以删除所有租户的管理员仓库分配
CREATE POLICY "Lease admins can delete manager warehouse assignments"
ON manager_warehouses
FOR DELETE
TO authenticated
USING (is_lease_admin());
