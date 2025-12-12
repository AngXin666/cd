/*
# 启用 manager_warehouses 表的 Realtime 功能

## 目的
为 manager_warehouses 表启用 Supabase Realtime，使得管理员可以实时接收仓库分配的变化通知。

## 功能说明
1. 将 manager_warehouses 表添加到 supabase_realtime 发布中
2. 管理员客户端可以订阅该表的变化
3. 当超级管理员分配/修改/取消仓库时，管理员端会立即收到通知
4. 自动刷新仓库列表，无需手动刷新或重新登录

## 使用场景
- 超级管理员为管理员分配新仓库 → 管理员立即看到新仓库
- 超级管理员修改仓库分配 → 管理员立即看到更新
- 超级管理员取消仓库分配 → 管理员立即看到变化

## 安全性
- Realtime 订阅遵循 RLS 策略（如果启用）
- 客户端只能接收到自己有权限查看的数据变化
- 不会泄露其他管理员的数据

## 注意事项
- 启用 Realtime 会增加数据库负载
- 建议只在需要实时更新的表上启用
- manager_warehouses 表数据量小，适合启用 Realtime
*/

-- 将 manager_warehouses 表添加到 Realtime 发布中
ALTER PUBLICATION supabase_realtime ADD TABLE manager_warehouses;
