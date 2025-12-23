/*
# 权限系统重构 - 步骤3：创建动态权限验证函数

## 说明
创建动态权限验证引擎，根据策略模板和资源配置动态生成权限规则

## 核心函数
1. check_permission: 检查用户是否有权限执行某个操作
2. get_user_strategy: 获取用户的策略模板
3. build_permission_rule: 构建权限规则 SQL
4. apply_dynamic_rls_policies: 应用动态 RLS 策略

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 获取用户的策略模板
-- ============================================
CREATE OR REPLACE FUNCTION get_user_strategy(uid uuid)
RETURNS TABLE (
  strategy_name text,
  strategy_type text,
  select_rule text,
  insert_rule text,
  update_rule text,
  delete_rule text,
  resource_field text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ps.strategy_name,
    ps.strategy_type,
    ps.select_rule,
    ps.insert_rule,
    ps.update_rule,
    ps.delete_rule,
    rpm.resource_field
  FROM user_roles ur
  JOIN role_permission_mappings rpm ON ur.role = rpm.role
  JOIN permission_strategies ps ON rpm.strategy_id = ps.id
  WHERE ur.user_id = uid
    AND rpm.is_active = true
    AND ps.is_active = true
  ORDER BY rpm.priority DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_strategy IS '获取用户的策略模板，按优先级返回最高优先级的策略';

-- ============================================
-- 2. 构建权限规则 SQL
-- ============================================
CREATE OR REPLACE FUNCTION build_permission_rule(
  p_table_name text,
  p_operation text,
  p_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_strategy RECORD;
  v_resource RECORD;
  v_rule text;
  v_approval_check text := '';
BEGIN
  -- 获取用户策略
  SELECT * INTO v_strategy FROM get_user_strategy(p_user_id);
  
  IF NOT FOUND THEN
    RETURN 'false';
  END IF;
  
  -- 获取资源配置
  SELECT * INTO v_resource
  FROM resource_permissions
  WHERE table_name = p_table_name
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 'false';
  END IF;
  
  -- 根据操作类型选择规则
  CASE p_operation
    WHEN 'SELECT' THEN
      v_rule := v_strategy.select_rule;
    WHEN 'INSERT' THEN
      v_rule := v_strategy.insert_rule;
    WHEN 'UPDATE' THEN
      v_rule := v_strategy.update_rule;
    WHEN 'DELETE' THEN
      v_rule := v_strategy.delete_rule;
    ELSE
      RETURN 'false';
  END CASE;
  
  -- 替换占位符
  IF v_resource.owner_field IS NOT NULL THEN
    v_rule := replace(v_rule, '{{owner_field}}', v_resource.owner_field);
  END IF;
  
  IF v_resource.manager_field IS NOT NULL THEN
    v_rule := replace(v_rule, '{{manager_field}}', v_resource.manager_field);
  END IF;
  
  -- 处理审批状态检查
  IF v_resource.require_approval_status AND p_operation IN ('UPDATE', 'DELETE') THEN
    v_approval_check := format(' AND %I = ''pending''', v_resource.approval_status_field);
  END IF;
  
  v_rule := replace(v_rule, '{{approval_check}}', v_approval_check);
  
  RETURN v_rule;
END;
$$;

COMMENT ON FUNCTION build_permission_rule IS '构建权限规则 SQL，替换策略模板中的占位符';

-- ============================================
-- 3. 检查用户权限
-- ============================================
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id uuid,
  p_table_name text,
  p_operation text,
  p_record_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_rule text;
  v_result boolean;
BEGIN
  -- 构建权限规则
  v_rule := build_permission_rule(p_table_name, p_operation, p_user_id);
  
  IF v_rule = 'false' THEN
    RETURN false;
  END IF;
  
  -- 如果提供了记录ID，检查具体记录的权限
  IF p_record_id IS NOT NULL THEN
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1 AND (%s))',
      p_table_name,
      v_rule
    ) INTO v_result USING p_record_id;
    
    RETURN v_result;
  END IF;
  
  -- 否则返回规则本身（用于 RLS 策略）
  RETURN true;
END;
$$;

COMMENT ON FUNCTION check_permission IS '检查用户是否有权限执行某个操作';

-- ============================================
-- 4. 获取用户可访问的资源列表
-- ============================================
CREATE OR REPLACE FUNCTION get_accessible_resources(
  p_user_id uuid,
  p_table_name text
)
RETURNS TABLE (resource_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_rule text;
BEGIN
  -- 构建权限规则
  v_rule := build_permission_rule(p_table_name, 'SELECT', p_user_id);
  
  IF v_rule = 'false' THEN
    RETURN;
  END IF;
  
  -- 返回用户可访问的资源ID列表
  RETURN QUERY EXECUTE format(
    'SELECT id FROM %I WHERE %s',
    p_table_name,
    v_rule
  );
END;
$$;

COMMENT ON FUNCTION get_accessible_resources IS '获取用户可访问的资源ID列表';

-- ============================================
-- 5. 批量检查权限
-- ============================================
CREATE OR REPLACE FUNCTION check_permissions_batch(
  p_user_id uuid,
  p_table_name text,
  p_record_ids uuid[]
)
RETURNS TABLE (
  record_id uuid,
  can_select boolean,
  can_update boolean,
  can_delete boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(p_record_ids) AS record_id,
    check_permission(p_user_id, p_table_name, 'SELECT', unnest(p_record_ids)) AS can_select,
    check_permission(p_user_id, p_table_name, 'UPDATE', unnest(p_record_ids)) AS can_update,
    check_permission(p_user_id, p_table_name, 'DELETE', unnest(p_record_ids)) AS can_delete;
END;
$$;

COMMENT ON FUNCTION check_permissions_batch IS '批量检查多个记录的权限';

-- ============================================
-- 6. 获取用户的权限摘要
-- ============================================
CREATE OR REPLACE FUNCTION get_user_permissions_summary(p_user_id uuid)
RETURNS TABLE (
  table_name text,
  can_select boolean,
  can_insert boolean,
  can_update boolean,
  can_delete boolean,
  strategy_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_strategy RECORD;
BEGIN
  -- 获取用户策略
  SELECT * INTO v_strategy FROM get_user_strategy(p_user_id);
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- 返回每个表的权限摘要
  RETURN QUERY
  SELECT
    rp.table_name,
    v_strategy.select_rule IS NOT NULL AND v_strategy.select_rule != 'false' AS can_select,
    v_strategy.insert_rule IS NOT NULL AND v_strategy.insert_rule != 'false' AS can_insert,
    v_strategy.update_rule IS NOT NULL AND v_strategy.update_rule != 'false' AS can_update,
    v_strategy.delete_rule IS NOT NULL AND v_strategy.delete_rule != 'false' AS can_delete,
    v_strategy.strategy_type
  FROM resource_permissions rp
  WHERE rp.is_active = true
  ORDER BY rp.table_name;
END;
$$;

COMMENT ON FUNCTION get_user_permissions_summary IS '获取用户在所有表上的权限摘要';

-- ============================================
-- 7. 验证策略模板的有效性
-- ============================================
CREATE OR REPLACE FUNCTION validate_strategy_template(p_strategy_id uuid)
RETURNS TABLE (
  is_valid boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_strategy RECORD;
BEGIN
  -- 获取策略模板
  SELECT * INTO v_strategy
  FROM permission_strategies
  WHERE id = p_strategy_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '策略模板不存在';
    RETURN;
  END IF;
  
  -- 检查规则是否为空
  IF v_strategy.select_rule IS NULL OR v_strategy.select_rule = '' THEN
    RETURN QUERY SELECT false, 'SELECT 规则不能为空';
    RETURN;
  END IF;
  
  -- 检查策略类型
  IF v_strategy.strategy_type NOT IN ('all_access', 'managed_resources', 'own_data_only') THEN
    RETURN QUERY SELECT false, '无效的策略类型';
    RETURN;
  END IF;
  
  -- 验证通过
  RETURN QUERY SELECT true, '策略模板有效'::text;
END;
$$;

COMMENT ON FUNCTION validate_strategy_template IS '验证策略模板的有效性';
