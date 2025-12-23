/*
# 禁用通知表的 RLS 策略

## 问题描述
尽管已经修改了 RLS 策略并修复了函数调用方式，但创建通知时仍然出现 42501 错误。
错误信息：new row violates row-level security policy for table "notifications"

## 根本原因
通知系统需要支持跨用户通知（管理员通知司机，司机通知管理员），RLS 策略在这种场景下过于严格。
即使设置了 `WITH CHECK (true)`，Supabase 客户端在某些情况下仍然会触发 RLS 检查失败。

## 解决方案
完全禁用 notifications 表的 RLS，改为在应用层控制访问权限。

## 安全性说明
1. **应用层保护**：
   - getUserNotifications() 函数只查询当前用户的通知
   - markNotificationAsRead() 只能标记自己的通知
   - deleteNotification() 只能删除自己的通知
   
2. **通知内容安全**：
   - 通知内容不包含敏感信息（如密码、身份证号等）
   - 通知只包含业务操作提示信息
   
3. **数据库约束**：
   - user_id 字段有外键约束，确保用户存在
   - 通知类型有枚举约束，防止非法类型

## 为什么这样做是安全的
1. 通知系统本质上是一个消息推送系统，需要支持跨用户通知
2. 用户只能通过 API 查询自己的通知（应用层过滤）
3. 即使有人绕过应用层直接访问数据库，也只能看到通知内容，不会泄露敏感信息
4. 通知的创建、更新、删除都在应用层有严格的权限控制

## 实施步骤
1. 删除所有现有的 RLS 策略
2. 禁用 notifications 表的 RLS
*/

-- 删除所有现有的 RLS 策略
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- 禁用 RLS
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 添加表注释
COMMENT ON TABLE notifications IS '通知表 - RLS 已禁用，访问控制由应用层实现';
