/*
# 修复通知创建策略 - 允许司机正确创建通知

## 问题
司机创建通知的策略中，查询老板账号时使用了错误的条件：
- 错误：`p.boss_id = get_current_user_boss_id()`
- 正确：`p.id = get_current_user_boss_id()` （因为老板的 boss_id 是 NULL）

## 解决方案
修复司机创建通知策略，使其能够正确查询到老板账号。
*/

-- 删除旧的司机创建通知策略
DROP POLICY IF EXISTS "Drivers can create notifications" ON notifications;

-- 创建新的司机创建通知策略（修复老板查询条件）
CREATE POLICY "Drivers can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_driver(auth.uid())
  AND recipient_id IN (
    -- 可以给自己的车队长发送通知
    SELECT DISTINCT mw.manager_id 
    FROM driver_warehouses dw
    JOIN manager_warehouses mw ON dw.warehouse_id = mw.warehouse_id
    WHERE dw.driver_id = auth.uid()
    AND dw.boss_id = get_current_user_boss_id()
    
    UNION
    
    -- 可以给老板发送通知（修复：直接用 boss_id 查询）
    SELECT get_current_user_boss_id()
    
    UNION
    
    -- 可以给平级账号发送通知
    SELECT p.id 
    FROM profiles p
    WHERE p.role = 'peer_admin'
    AND p.boss_id = get_current_user_boss_id()
  )
);

COMMENT ON POLICY "Drivers can create notifications" ON notifications IS '允许司机创建通知给自己的车队长、老板和平级账号';