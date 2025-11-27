/*
# 修复通知创建策略 - 允许司机正确创建通知 (v2)

## 问题
1. 司机创建通知的策略中，查询老板账号时使用了错误的条件
2. get_current_user_boss_id() 返回 TEXT 类型，需要转换为 UUID

## 解决方案
修复司机创建通知策略，正确处理类型转换。
*/

-- 删除旧的司机创建通知策略
DROP POLICY IF EXISTS "Drivers can create notifications" ON notifications;

-- 创建新的司机创建通知策略（修复老板查询条件和类型转换）
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
    
    -- 可以给老板发送通知（修复：将 TEXT 转换为 UUID）
    SELECT get_current_user_boss_id()::uuid
    
    UNION
    
    -- 可以给平级账号发送通知
    SELECT p.id 
    FROM profiles p
    WHERE p.role = 'peer_admin'
    AND p.boss_id = get_current_user_boss_id()
  )
);

COMMENT ON POLICY "Drivers can create notifications" ON notifications IS '允许司机创建通知给自己的车队长、老板和平级账号';
