/*
# 修复数据隔离测试函数 - 使用 CASCADE 删除

*/

-- 先删除视图
DROP VIEW IF EXISTS data_isolation_test_summary CASCADE;

-- 删除函数
DROP FUNCTION IF EXISTS test_data_isolation() CASCADE;

-- 重新创建函数
CREATE OR REPLACE FUNCTION test_data_isolation()
RETURNS TABLE (
  test_case text,
  test_status text,
  expected_value int,
  actual_value int,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_a_boss_id text := 'BOSS_1764145957063_29235549';
  tenant_b_boss_id text := 'BOSS_1764145957063_52128391';
  tenant_a_admin_id uuid;
  tenant_b_admin_id uuid;
  tenant_a_manager_id uuid;
  tenant_a_driver_id uuid;
  tenant_a_user_count int;
  tenant_b_user_count int;
BEGIN
  -- 获取测试用户 ID
  SELECT id INTO tenant_a_admin_id FROM profiles WHERE boss_id = tenant_a_boss_id AND role = 'super_admin' LIMIT 1;
  SELECT id INTO tenant_b_admin_id FROM profiles WHERE boss_id = tenant_b_boss_id AND role = 'super_admin' LIMIT 1;
  SELECT id INTO tenant_a_manager_id FROM profiles WHERE boss_id = tenant_a_boss_id AND role = 'manager' LIMIT 1;
  SELECT id INTO tenant_a_driver_id FROM profiles WHERE boss_id = tenant_a_boss_id AND role = 'driver' LIMIT 1;
  
  -- 获取租户用户数量
  SELECT COUNT(*) INTO tenant_a_user_count FROM profiles WHERE boss_id = tenant_a_boss_id;
  SELECT COUNT(*) INTO tenant_b_user_count FROM profiles WHERE boss_id = tenant_b_boss_id;
  
  -- 测试 1
  RETURN QUERY
  SELECT 
    '1. 租户 A 超级管理员权限'::text,
    CASE 
      WHEN (
        SELECT COUNT(*)
        FROM profiles p
        WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_a_admin_id) r) IN ('manager', 'super_admin')
          AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_a_admin_id) b)
      ) = tenant_a_user_count THEN '✅ 通过'
      ELSE '❌ 失败'
    END,
    tenant_a_user_count,
    (
      SELECT COUNT(*)::int
      FROM profiles p
      WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_a_admin_id) r) IN ('manager', 'super_admin')
        AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_a_admin_id) b)
    ),
    '超级管理员应该能查看同租户的所有用户'::text;
  
  -- 测试 2
  RETURN QUERY
  SELECT 
    '2. 租户 B 超级管理员权限'::text,
    CASE 
      WHEN (
        SELECT COUNT(*)
        FROM profiles p
        WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_b_admin_id) r) IN ('manager', 'super_admin')
          AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_b_admin_id) b)
      ) = tenant_b_user_count THEN '✅ 通过'
      ELSE '❌ 失败'
    END,
    tenant_b_user_count,
    (
      SELECT COUNT(*)::int
      FROM profiles p
      WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_b_admin_id) r) IN ('manager', 'super_admin')
        AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_b_admin_id) b)
    ),
    '超级管理员只能查看自己租户的用户'::text;
  
  -- 测试 3
  RETURN QUERY
  SELECT 
    '3. 跨租户隔离'::text,
    CASE 
      WHEN (
        SELECT COUNT(*)
        FROM profiles p
        WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_b_admin_id) r) IN ('manager', 'super_admin')
          AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_b_admin_id) b)
          AND p.boss_id = tenant_a_boss_id
      ) = 0 THEN '✅ 通过'
      ELSE '❌ 失败'
    END,
    0,
    (
      SELECT COUNT(*)::int
      FROM profiles p
      WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_b_admin_id) r) IN ('manager', 'super_admin')
        AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_b_admin_id) b)
        AND p.boss_id = tenant_a_boss_id
    ),
    '租户 B 的管理员不能查看租户 A 的用户'::text;
  
  -- 测试 4
  IF tenant_a_driver_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      '4. 司机权限隔离'::text,
      CASE 
        WHEN (
          SELECT COUNT(*)
          FROM profiles p
          WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_a_driver_id) r) IN ('manager', 'super_admin')
            AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_a_driver_id) b)
        ) = 0 THEN '✅ 通过'
        ELSE '❌ 失败'
      END,
      0,
      (
        SELECT COUNT(*)::int
        FROM profiles p
        WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_a_driver_id) r) IN ('manager', 'super_admin')
          AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_a_driver_id) b)
      ),
      '司机不能通过管理员策略查看其他用户'::text;
  END IF;
  
  -- 测试 5
  IF tenant_a_manager_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      '5. 车队长同租户权限'::text,
      CASE 
        WHEN (
          SELECT COUNT(*)
          FROM profiles p
          WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_a_manager_id) r) IN ('manager', 'super_admin')
            AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_a_manager_id) b)
        ) = tenant_a_user_count THEN '✅ 通过'
        ELSE '❌ 失败'
      END,
      tenant_a_user_count,
      (
        SELECT COUNT(*)::int
        FROM profiles p
        WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_a_manager_id) r) IN ('manager', 'super_admin')
          AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_a_manager_id) b)
      ),
      '车队长可以查看同租户的所有用户'::text;
    
    -- 测试 6
    RETURN QUERY
    SELECT 
      '6. 车队长跨租户隔离'::text,
      CASE 
        WHEN (
          SELECT COUNT(*)
          FROM profiles p
          WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_a_manager_id) r) IN ('manager', 'super_admin')
            AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_a_manager_id) b)
            AND p.boss_id != tenant_a_boss_id
        ) = 0 THEN '✅ 通过'
        ELSE '❌ 失败'
      END,
      0,
      (
        SELECT COUNT(*)::int
        FROM profiles p
        WHERE (SELECT r.role FROM get_user_role_and_boss(tenant_a_manager_id) r) IN ('manager', 'super_admin')
          AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(tenant_a_manager_id) b)
          AND p.boss_id != tenant_a_boss_id
      ),
      '车队长不能查看其他租户的用户'::text;
  END IF;
END;
$$;

COMMENT ON FUNCTION test_data_isolation IS '测试数据隔离功能是否正常工作';
