/*
# 修复 RLS 策略 - 允许车队长管理仓库分配和创建通知

## 问题描述
1. driver_warehouses 表：只有 super_admin 可以插入数据，manager 没有权限
2. notifications 表：只有 super_admin 和 admin 可以创建通知，manager 没有权限

## 解决方案
1. 为 driver_warehouses 表添加 manager 的管理权限
2. 为 notifications 表添加 manager 的创建权限

## 安全说明
- manager（车队长）只能管理自己租户内的数据
- 所有策略都检查 boss_id 以确保数据隔离

## 新增策略列表

### driver_warehouses 表
- "Managers can manage tenant driver warehouses" - 允许车队长管理租户内的司机仓库分配

### notifications 表
- "Managers can create tenant notifications" - 允许车队长创建租户内的通知
- "Managers can view tenant notifications" - 允许车队长查看租户内的通知
*/

-- 1. 为 driver_warehouses 表添加 manager 的管理权限
CREATE POLICY "Managers can manage tenant driver warehouses"
ON driver_warehouses
FOR ALL
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND is_manager(auth.uid())
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_manager(auth.uid())
);

-- 2. 为 notifications 表添加 manager 的创建权限
CREATE POLICY "Managers can create tenant notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_manager(auth.uid())
);

-- 3. 为 notifications 表添加 manager 的查看权限
CREATE POLICY "Managers can view tenant notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND is_manager(auth.uid())
);
