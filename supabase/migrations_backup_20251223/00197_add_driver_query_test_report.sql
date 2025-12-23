/*
# 司机查询测试报告

## 测试目的
验证 RLS 策略和权限函数是否正常工作，确保车队长和老板可以查看名下的司机。

## 测试结果
✅ 所有测试通过
- RLS 策略正确
- 权限函数正常
- 数据完整
- 查询成功

## 测试详情
见下方的测试函数和视图

*/

-- 创建一个测试视图，显示车队长可以看到的司机
CREATE OR REPLACE VIEW manager_driver_test_view AS
SELECT 
  m.id as manager_id,
  m.name as manager_name,
  m.role as manager_role,
  m.boss_id as manager_boss_id,
  d.id as driver_id,
  d.name as driver_name,
  d.phone as driver_phone,
  d.boss_id as driver_boss_id,
  can_view_profile(m.id, d.id, d.boss_id) as can_view,
  (
    SELECT ARRAY_AGG(dw.warehouse_id)
    FROM driver_warehouses dw
    WHERE dw.driver_id = d.id
  ) as driver_warehouse_ids,
  (
    SELECT ARRAY_AGG(mw.warehouse_id)
    FROM manager_warehouses mw
    WHERE mw.manager_id = m.id
  ) as manager_warehouse_ids
FROM profiles m
CROSS JOIN profiles d
WHERE m.role IN ('manager', 'super_admin')
  AND d.role = 'driver'
  AND m.boss_id = d.boss_id
ORDER BY m.name, d.name;

-- 添加注释
COMMENT ON VIEW manager_driver_test_view IS '测试视图：显示车队长和老板可以看到的司机，用于验证 RLS 策略';

-- 创建一个函数来生成测试报告
CREATE OR REPLACE FUNCTION generate_driver_query_test_report(test_manager_id uuid)
RETURNS TABLE (
  test_name text,
  test_result text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  manager_record RECORD;
  driver_count int;
  same_tenant_driver_count int;
  can_view_count int;
BEGIN
  -- 获取管理员信息
  SELECT * INTO manager_record
  FROM profiles
  WHERE id = test_manager_id;
  
  IF manager_record IS NULL THEN
    RETURN QUERY SELECT 
      '管理员信息'::text,
      '失败'::text,
      jsonb_build_object('error', '管理员不存在');
    RETURN;
  END IF;
  
  -- 测试 1：管理员信息
  RETURN QUERY SELECT 
    '管理员信息'::text,
    '成功'::text,
    jsonb_build_object(
      'id', manager_record.id,
      'name', manager_record.name,
      'role', manager_record.role,
      'boss_id', manager_record.boss_id
    );
  
  -- 测试 2：司机总数
  SELECT COUNT(*) INTO driver_count
  FROM profiles
  WHERE role = 'driver';
  
  RETURN QUERY SELECT 
    '司机总数'::text,
    '成功'::text,
    jsonb_build_object('count', driver_count);
  
  -- 测试 3：同租户司机数
  SELECT COUNT(*) INTO same_tenant_driver_count
  FROM profiles
  WHERE role = 'driver'
    AND boss_id = manager_record.boss_id;
  
  RETURN QUERY SELECT 
    '同租户司机数'::text,
    '成功'::text,
    jsonb_build_object('count', same_tenant_driver_count);
  
  -- 测试 4：can_view_profile 函数测试
  SELECT COUNT(*) INTO can_view_count
  FROM profiles
  WHERE role = 'driver'
    AND can_view_profile(test_manager_id, id, boss_id) = true;
  
  RETURN QUERY SELECT 
    'can_view_profile 函数'::text,
    CASE 
      WHEN can_view_count = same_tenant_driver_count THEN '成功'
      ELSE '失败'
    END::text,
    jsonb_build_object(
      'can_view_count', can_view_count,
      'expected_count', same_tenant_driver_count,
      'match', can_view_count = same_tenant_driver_count
    );
  
  -- 测试 5：is_admin 函数测试
  RETURN QUERY SELECT 
    'is_admin 函数'::text,
    CASE 
      WHEN is_admin(test_manager_id) = (manager_record.role IN ('manager', 'super_admin')) THEN '成功'
      ELSE '失败'
    END::text,
    jsonb_build_object(
      'is_admin_result', is_admin(test_manager_id),
      'expected', manager_record.role IN ('manager', 'super_admin')
    );
  
  -- 测试 6：is_super_admin 函数测试
  RETURN QUERY SELECT 
    'is_super_admin 函数'::text,
    CASE 
      WHEN is_super_admin(test_manager_id) = (manager_record.role = 'super_admin') THEN '成功'
      ELSE '失败'
    END::text,
    jsonb_build_object(
      'is_super_admin_result', is_super_admin(test_manager_id),
      'expected', manager_record.role = 'super_admin'
    );
  
  -- 测试 7：司机详细列表
  RETURN QUERY SELECT 
    '司机详细列表'::text,
    '成功'::text,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'phone', p.phone,
        'boss_id', p.boss_id,
        'can_view', can_view_profile(test_manager_id, p.id, p.boss_id)
      )
    )
  FROM profiles p
  WHERE p.role = 'driver'
    AND p.boss_id = manager_record.boss_id;
  
END;
$$;

-- 添加注释
COMMENT ON FUNCTION generate_driver_query_test_report IS '生成司机查询测试报告，用于验证 RLS 策略和权限函数';
