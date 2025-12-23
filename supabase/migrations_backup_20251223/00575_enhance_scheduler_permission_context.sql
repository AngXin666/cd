/*
# 完善调度权限上下文

## 功能描述
完善调度权限上下文，使其根据权限级别获得不同的访问权限：
1. 完整权限（full_control）：和老板一样拥有全系统访问权限（all_access）
2. 仅查看权限（view_only）：只能查看数据，无任何修改权限

## 变更内容
1. 重写 get_scheduler_permission_context 函数
2. 根据权限级别返回不同的权限上下文
3. full_control 返回 all_access 模式
4. view_only 返回 scheduled_resources 模式

## 安全性
- 基于 permission_strategies 表判断权限级别
- 使用 SECURITY DEFINER 确保安全执行
- 只返回用户有权访问的数据
*/

-- ============================================
-- 重写调度权限上下文函数
-- ============================================

CREATE OR REPLACE FUNCTION get_scheduler_permission_context(p_scheduler_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_context jsonb;
  v_boss jsonb;
  v_permission_level text;
  v_total_warehouses int;
  v_total_drivers int;
  v_total_managers int;
  v_total_vehicles int;
BEGIN
  -- 验证用户是否为调度
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p_scheduler_id AND role = 'SCHEDULER'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '用户不是调度角色'
    );
  END IF;

  -- 获取权限级别
  SELECT 
    CASE 
      WHEN ps.strategy_name = 'scheduler_full_control' THEN 'full_control'
      WHEN ps.strategy_name = 'scheduler_view_only' THEN 'view_only'
      ELSE 'view_only'
    END INTO v_permission_level
  FROM user_permission_assignments upa
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE upa.user_id = p_scheduler_id
  LIMIT 1;

  -- 如果没有找到权限级别，默认为 view_only
  IF v_permission_level IS NULL THEN
    v_permission_level := 'view_only';
  END IF;

  -- 获取老板信息
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'phone', phone,
    'email', email
  ) INTO v_boss
  FROM get_boss_user()
  LIMIT 1;

  -- 如果是完整权限，返回 all_access 模式（和老板一样）
  IF v_permission_level = 'full_control' THEN
    -- 获取系统资源统计
    SELECT COUNT(*) INTO v_total_warehouses FROM warehouses WHERE is_active = true;
    SELECT COUNT(*) INTO v_total_drivers FROM user_roles WHERE role = 'DRIVER';
    SELECT COUNT(*) INTO v_total_managers FROM user_roles WHERE role = 'MANAGER';
    SELECT COUNT(*) INTO v_total_vehicles FROM vehicles WHERE status != 'deleted';

    -- 构建 all_access 权限上下文
    v_context := jsonb_build_object(
      'success', true,
      'context', jsonb_build_object(
        'mode', 'all_access',
        'level', 'full_control',
        'systemResources', jsonb_build_object(
          'totalWarehouses', v_total_warehouses,
          'totalDrivers', v_total_drivers,
          'totalManagers', v_total_managers,
          'totalVehicles', v_total_vehicles
        )
      )
    );
  ELSE
    -- 如果是仅查看权限，返回 scheduled_resources 模式
    v_context := jsonb_build_object(
      'success', true,
      'context', jsonb_build_object(
        'mode', 'scheduled_resources',
        'level', 'view_only',
        'managedWarehouses', '[]'::jsonb,
        'relatedDrivers', '[]'::jsonb,
        'relatedVehicles', '[]'::jsonb,
        'boss', COALESCE(v_boss, 'null'::jsonb)
      )
    );
  END IF;

  RETURN v_context;
END;
$$;