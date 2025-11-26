/*
# 创建数据隔离测试函数

## 目的
提供一个便捷的函数来测试数据隔离功能是否正常工作

## 使用方法
SELECT * FROM test_data_isolation();

## 注意
此文件已被 00205_fix_test_function_cascade.sql 替代

*/

-- 此迁移已被后续迁移替代，保留此文件仅作为历史记录

CREATE OR REPLACE FUNCTION test_data_isolation_old()
RETURNS TABLE (
  test_case text,
  status text,
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
  
  -- 测试 1：租户 A 超级管理员可以查看同租户所有用户
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
  
  -- 测试 2：租户 B 超级管理员只能查看自己租户的用户
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
  
  -- 测试 3：跨租户隔离
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
  
  -- 测试 4：司机权限隔离
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
  
  -- 测试 5：车队长同租户权限
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
    
    -- 测试 6：车队长跨租户隔离
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
  
  -- 总结
  RETURN QUERY
  SELECT 
    '总体评估'::text,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM test_data_isolation() WHERE status LIKE '❌%'
      ) THEN '✅ 所有测试通过'
      ELSE '❌ 部分测试失败'
    END,
    0,
    0,
    '数据隔离功能测试完成'::text;
END;
$$;

-- 添加注释
COMMENT ON FUNCTION test_data_isolation IS '测试数据隔离功能是否正常工作';

-- 创建一个简化的测试视图
CREATE OR REPLACE VIEW data_isolation_test_summary AS
SELECT 
  test_case,
  status,
  CASE 
    WHEN expected_value = actual_value THEN '✅ 匹配'
    ELSE '❌ 不匹配'
  END as value_match,
  expected_value,
  actual_value,
  description
FROM test_data_isolation();

COMMENT ON VIEW data_isolation_test_summary IS '数据隔离测试摘要视图';
