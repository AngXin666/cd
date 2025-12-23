/*
# 修复 notifications 表的 RLS 策略 - 允许 manager 创建通知

## 问题描述
在 18_add_peer_admin_role_step2.sql 迁移中，notifications 表的 RLS 策略被更新为只允许 super_admin 和 peer_admin 创建通知。
这导致 manager（车队长）无法创建通知，出现 "new row violates row-level security policy" 错误。

## 解决方案
添加一个新的策略，允许 manager 创建通知给自己管理的仓库中的司机。

## 策略说明
1. Super admin 和 peer admin 可以管理所有租户通知（已存在）
2. Manager 可以创建通知给自己管理的仓库中的司机（新增）
3. 用户可以查看自己的通知（新增）
4. 用户可以更新自己的通知（标记已读）（新增）
5. 用户可以删除自己的通知（新增）
*/

-- 1. 添加 manager 创建通知的策略
CREATE POLICY "Managers can create notifications for their drivers"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_manager(auth.uid())
  AND recipient_id IN (
    -- 只能给自己管理的仓库中的司机发送通知
    SELECT dw.driver_id 
    FROM driver_warehouses dw
    WHERE dw.warehouse_id IN (
      SELECT mw.warehouse_id 
      FROM manager_warehouses mw
      WHERE mw.manager_id = auth.uid()
    )
  )
);

-- 2. 添加用户查看自己通知的策略
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
);

-- 3. 添加用户更新自己通知的策略（标记已读）
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
);

-- 4. 添加用户删除自己通知的策略
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
);

-- 5. 添加策略注释
COMMENT ON POLICY "Managers can create notifications for their drivers" ON notifications IS '允许车队长创建通知给自己管理的仓库中的司机';
COMMENT ON POLICY "Users can view their own notifications" ON notifications IS '允许用户查看自己的通知';
COMMENT ON POLICY "Users can update their own notifications" ON notifications IS '允许用户更新自己的通知（标记已读）';
COMMENT ON POLICY "Users can delete their own notifications" ON notifications IS '允许用户删除自己的通知';
