/*
# 添加租赁管理员创建通知的权限

## 问题描述
租赁管理员在分配仓库等操作时需要创建通知，但现有的 RLS 策略要求 `boss_id = get_current_user_boss_id()`。
租赁管理员没有 boss_id，导致无法创建通知。

## 解决方案
添加新的 RLS 策略，允许租赁管理员创建和查看所有租户的通知。

## 变更内容
1. 添加租赁管理员创建通知的策略
2. 添加租赁管理员查看通知的策略
3. 添加租赁管理员更新通知的策略
4. 添加租赁管理员删除通知的策略

## 影响范围
- 租赁管理员可以创建、查看、更新、删除所有租户的通知
- 其他用户的权限不受影响
*/

-- 1. 租赁管理员可以创建所有租户的通知
CREATE POLICY "租赁管理员可以创建通知" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_lease_admin_user(auth.uid()));

-- 2. 租赁管理员可以查看所有租户的通知
CREATE POLICY "租赁管理员可以查看通知" ON notifications
  FOR SELECT TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- 3. 租赁管理员可以更新所有租户的通知
CREATE POLICY "租赁管理员可以更新通知" ON notifications
  FOR UPDATE TO authenticated
  USING (is_lease_admin_user(auth.uid()))
  WITH CHECK (is_lease_admin_user(auth.uid()));

-- 4. 租赁管理员可以删除所有租户的通知
CREATE POLICY "租赁管理员可以删除通知" ON notifications
  FOR DELETE TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- 添加策略注释
COMMENT ON POLICY "租赁管理员可以创建通知" ON notifications IS 
'允许租赁管理员创建所有租户的通知';

COMMENT ON POLICY "租赁管理员可以查看通知" ON notifications IS 
'允许租赁管理员查看所有租户的通知';

COMMENT ON POLICY "租赁管理员可以更新通知" ON notifications IS 
'允许租赁管理员更新所有租户的通知';

COMMENT ON POLICY "租赁管理员可以删除通知" ON notifications IS 
'允许租赁管理员删除所有租户的通知';