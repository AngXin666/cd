/*
# 修复多租户 RLS 策略和 boss_id 查询问题

## 问题分析

### 1. 账号结构
- **老板（super_admin）**: boss_id = NULL，是租户的最高管理者
- **平级账号（peer_admin）**: boss_id = 老板ID，与老板平级
- **车队长（manager）**: boss_id = 老板ID，管理特定仓库
- **司机（driver）**: boss_id = 老板ID，只能查看自己的数据

### 2. 核心问题
1. `get_current_user_boss_id()` 函数对老板返回 NULL，导致查询失败
2. RLS 策略不允许司机查看同租户的其他用户（老板、车队长等）
3. 司机需要能够查看自己租户的管理员信息（用于请假申请等功能）

## 解决方案

### 1. 修复 get_current_user_boss_id() 函数
让它对老板返回自己的 ID，对其他用户返回 boss_id
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS get_current_user_boss_id();

-- 创建新的 get_current_user_boss_id 函数
CREATE OR REPLACE FUNCTION get_current_user_boss_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      -- 如果是老板（boss_id 为 NULL），返回自己的 ID
      WHEN p.boss_id IS NULL AND p.role = 'super_admin' THEN p.id
      -- 否则返回 boss_id
      ELSE p.boss_id
    END
  FROM profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_current_user_boss_id() IS '获取当前用户的租户老板ID（如果是老板则返回自己的ID）';

/*
### 2. 添加司机查看同租户用户的 RLS 策略
允许司机查看同租户的管理员（老板、车队长、平级账号）
*/

-- 添加策略：司机可以查看同租户的管理员
CREATE POLICY "Drivers can view same tenant admins"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- 当前用户是司机
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND (
    -- 可以查看同租户的老板
    (role = 'super_admin' AND id = get_current_user_boss_id())
    OR
    -- 可以查看同租户的车队长和平级账号
    (role IN ('manager', 'peer_admin') AND boss_id = get_current_user_boss_id())
  )
);

COMMENT ON POLICY "Drivers can view same tenant admins" ON profiles IS '司机可以查看同租户的管理员（老板、车队长、平级账号）';

/*
### 3. 添加司机查看同租户司机的策略（用于查看同事信息）
*/

CREATE POLICY "Drivers can view same tenant drivers"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- 当前用户是司机
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND
  -- 可以查看同租户的其他司机
  role = 'driver'
  AND boss_id = get_current_user_boss_id()
);

COMMENT ON POLICY "Drivers can view same tenant drivers" ON profiles IS '司机可以查看同租户的其他司机';
