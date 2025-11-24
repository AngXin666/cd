
/*
# 启用 notifications 表的 Realtime 功能

## 说明
为了支持通知栏的实时更新，需要启用 notifications 表的 Realtime 功能。
这样当有新通知插入或通知状态更新时，客户端可以立即收到更新。

## 技术细节
1. 将 notifications 表添加到 supabase_realtime 发布中
2. 这样 PostgreSQL 的 WAL (Write-Ahead Log) 会记录该表的所有变化
3. Supabase Realtime 服务会监听这些变化并推送给订阅的客户端

## 影响
- 启用后，客户端可以实时订阅 notifications 表的变化
- 不影响现有的查询和插入操作
- 会增加少量的数据库负载（用于 WAL 日志）
*/

-- 将 notifications 表添加到 Realtime 发布中
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
