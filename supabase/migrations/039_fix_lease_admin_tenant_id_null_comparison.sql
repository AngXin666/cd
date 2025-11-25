/*
# 修复租赁管理员更新新租户时的 NULL 比较问题

## 问题
1. get_user_tenant_id() 对于 lease_admin 返回 NULL
2. "租户数据隔离 - profiles" 策略中的条件 `tenant_id = get_user_tenant_id()` 
   对于新创建的记录（tenant_id 为 NULL）会变成 `NULL = NULL`
3. 在 SQL 中，NULL = NULL 返回 UNKNOWN，不是 TRUE，导致策略拒绝访问

## 解决方案
git config --global user.name miaoda lease_admin 的情况
*/

-- 删除旧的租户数据隔离策略
DROP POLICY IF EXISTS "租户数据隔离 - profiles" ON profiles;

-- 创建新策略：明确处理 lease_admin 和 NULL 的情况
CREATE POLICY "租户数据隔离 - profiles" ON profiles
  FOR ALL
  USING (
    -- lease_admin 可以访问所有数据
    is_lease_admin() 
    OR 
    -- 用户可以访问自己的记录
    (id = auth.uid())
    OR
    -- 用户可以访问同租户的数据（需要处理 NULL 的情况）
    (
      tenant_id IS NOT NULL 
      AND get_user_tenant_id() IS NOT NULL 
      AND tenant_id = get_user_tenant_id()
    )
  );
