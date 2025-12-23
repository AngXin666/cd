/*
# 允许所有角色创建通知

## 背景
当前系统只允许 super_admin、peer_admin 和 manager（有限制）创建通知。
为了支持更灵活的通知系统，需要允许司机、车队长和平级账号批量创建通知。

## 新增策略

### 1. 司机创建通知策略
- 司机可以创建通知给：
  - 自己的车队长
  - 老板
  - 平级账号
- 限制：只能在自己的租户内

### 2. 车队长创建通知策略（扩展）
- 移除之前的限制，允许车队长创建通知给：
  - 自己管理的司机
  - 老板
  - 平级账号
  - 其他车队长
- 限制：只能在自己的租户内

### 3. 平级账号创建通知策略（扩展）
- 平级账号可以创建通知给：
  - 任何同租户的用户
- 限制：只能在自己的租户内

## 实现方案
删除旧的限制性策略，创建新的宽松策略，但保持租户隔离。
*/

-- 1. 删除旧的 manager 创建通知策略（有限制）
DROP POLICY IF EXISTS "Managers can create notifications for their drivers" ON notifications;

-- 2. 创建新的司机创建通知策略
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
    
    -- 可以给老板发送通知
    SELECT p.id 
    FROM profiles p
    WHERE p.role = 'super_admin'
    AND p.boss_id = get_current_user_boss_id()
    
    UNION
    
    -- 可以给平级账号发送通知
    SELECT p.id 
    FROM profiles p
    WHERE p.role = 'peer_admin'
    AND p.boss_id = get_current_user_boss_id()
  )
);

-- 3. 创建新的车队长创建通知策略（无限制，只要在同租户内）
CREATE POLICY "Managers can create notifications to same tenant"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_manager(auth.uid())
  AND recipient_id IN (
    -- 可以给同租户的任何用户发送通知
    SELECT p.id 
    FROM profiles p
    WHERE p.boss_id = get_current_user_boss_id()
  )
);

-- 4. 创建新的平级账号创建通知策略（无限制，只要在同租户内）
CREATE POLICY "Peer admins can create notifications to same tenant"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_peer_admin(auth.uid())
  AND recipient_id IN (
    -- 可以给同租户的任何用户发送通知
    SELECT p.id 
    FROM profiles p
    WHERE p.boss_id = get_current_user_boss_id()
  )
);

-- 5. 添加策略注释
COMMENT ON POLICY "Drivers can create notifications" ON notifications IS '允许司机创建通知给自己的车队长、老板和平级账号';
COMMENT ON POLICY "Managers can create notifications to same tenant" ON notifications IS '允许车队长创建通知给同租户的任何用户';
COMMENT ON POLICY "Peer admins can create notifications to same tenant" ON notifications IS '允许平级账号创建通知给同租户的任何用户';
