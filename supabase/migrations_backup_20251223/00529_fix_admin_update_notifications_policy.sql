/*
# 修复管理员更新通知的权限策略

## 问题描述
之前的策略只有 USING 子句，没有 WITH CHECK 子句。
对于 UPDATE 操作，WITH CHECK 子句用于检查更新后的值是否允许。
如果没有 WITH CHECK，PostgreSQL 会默认使用 USING 的条件，这可能导致更新失败。

## 解决方案
1. 删除旧的策略
2. 重新创建策略，同时添加 USING 和 WITH CHECK 子句

## 变更内容
- 删除策略：Admins can update all notifications
- 重新创建策略：Admins can update all notifications（带 WITH CHECK）
*/

-- 删除旧的策略
DROP POLICY IF EXISTS "Admins can update all notifications" ON notifications;

-- 重新创建策略，同时添加 USING 和 WITH CHECK 子句
CREATE POLICY "Admins can update all notifications" ON notifications
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
