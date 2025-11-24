/*
# 修复通知插入策略 - 彻底解决 RLS 42501 错误

## 问题描述
创建通知时出现错误：new row violates row-level security policy for table "notifications"
错误代码：42501

## 根本原因
虽然之前的策略设置为 `WITH CHECK (true)`，但在某些情况下仍然会被 RLS 阻止。
这是因为 INSERT 策略需要同时满足 USING 和 WITH CHECK 条件。

## 解决方案
1. 删除旧的 INSERT 策略
2. 创建新的 INSERT 策略，明确允许所有认证用户为任何用户创建通知
3. 不设置 USING 子句（INSERT 操作不需要 USING）
4. WITH CHECK 设置为 true，允许插入任何数据

## 安全性说明
- 只有认证用户可以创建通知
- 通知系统需要支持跨用户通知（管理员通知司机，司机通知管理员）
- 用户只能查看、更新、删除自己的通知（由其他策略控制）
*/

-- 删除旧的 INSERT 策略
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- 创建新的 INSERT 策略：允许所有认证用户为任何用户创建通知
CREATE POLICY "Authenticated users can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 添加策略注释
COMMENT ON POLICY "Authenticated users can insert notifications" ON notifications IS '允许所有认证用户创建通知，支持跨用户通知（如司机通知管理员，管理员通知司机）';
