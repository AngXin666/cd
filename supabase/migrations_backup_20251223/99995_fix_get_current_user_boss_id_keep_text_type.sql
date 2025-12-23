/*
# 修复 get_current_user_boss_id() 函数以支持老板账号

## 问题
原函数对老板（super_admin）返回 NULL，导致：
1. 老板无法查询自己租户的数据
2. 司机等用户无法通过 boss_id 查询到老板

## 解决方案
修改函数逻辑，保持返回类型为 text：
- 如果是老板（boss_id 为 NULL 且 role 为 super_admin），返回自己的 ID
- 否则返回 boss_id
*/

-- 使用 CREATE OR REPLACE 更新函数，保持返回类型为 text
CREATE OR REPLACE FUNCTION get_current_user_boss_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      -- 如果是老板（boss_id 为 NULL 且 role 为 super_admin），返回自己的 ID
      WHEN p.boss_id IS NULL AND p.role = 'super_admin' THEN p.id::text
      -- 否则返回 boss_id
      ELSE p.boss_id::text
    END
  FROM profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_current_user_boss_id() IS '获取当前用户的租户老板ID（如果是老板则返回自己的ID）';

/*
## 添加司机查看同租户用户的 RLS 策略
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
    (role = 'super_admin' AND id::text = get_current_user_boss_id())
    OR
    -- 可以查看同租户的车队长和平级账号
    (role IN ('manager', 'peer_admin') AND boss_id::text = get_current_user_boss_id())
  )
);

COMMENT ON POLICY "Drivers can view same tenant admins" ON profiles IS '司机可以查看同租户的管理员（老板、车队长、平级账号）';

/*
注意：司机不能查看同租户的其他司机信息
司机只能：
1. 查看自己的信息
2. 查看同租户的管理员（老板、车队长、平级账号）- 用于提交申请
*/
