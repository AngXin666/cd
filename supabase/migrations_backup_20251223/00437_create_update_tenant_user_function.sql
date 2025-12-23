/*
# 创建更新租户用户的 RPC 函数

## 功能说明
创建一个 RPC 函数，用于在租户 Schema 中更新用户信息。

## 函数参数
- p_tenant_id: 租户 ID
- p_user_id: 用户 ID
- p_name: 用户姓名（可选）
- p_phone: 手机号（可选）
- p_email: 邮箱（可选）
- p_role: 角色（可选）
- p_permission_type: 权限类型（可选）
- p_vehicle_plate: 车牌号（可选）
- p_warehouse_ids: 仓库 ID 数组（可选）
- p_status: 状态（可选）

## 函数功能
1. 验证租户 ID 和 Schema 名称
2. 在租户 Schema 的 profiles 表中更新用户记录
3. 只更新提供的字段（NULL 表示不更新）
4. 返回更新后的用户信息

## 安全性
- 使用 SECURITY DEFINER 以管理员权限执行
- 验证 Schema 名称格式（防止 SQL 注入）
*/

CREATE OR REPLACE FUNCTION public.update_tenant_user(
  p_tenant_id uuid,
  p_user_id uuid,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_permission_type text DEFAULT NULL,
  p_vehicle_plate text DEFAULT NULL,
  p_warehouse_ids uuid[] DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_sql text;
  v_result jsonb;
  v_set_clauses text[] := ARRAY[]::text[];
  v_param_count int := 0;
BEGIN
  -- 获取租户的 Schema 名称
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id
  LIMIT 1;

  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
  END IF;

  -- 验证 Schema 名称格式（防止 SQL 注入）
  IF v_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid schema name format: %', v_schema_name;
  END IF;

  -- 构建 SET 子句，只更新提供的字段
  IF p_name IS NOT NULL THEN
    v_param_count := v_param_count + 1;
    v_set_clauses := array_append(v_set_clauses, format('name = $%s', v_param_count + 2));
  END IF;

  IF p_phone IS NOT NULL THEN
    v_param_count := v_param_count + 1;
    v_set_clauses := array_append(v_set_clauses, format('phone = $%s', v_param_count + 2));
  END IF;

  IF p_email IS NOT NULL THEN
    v_param_count := v_param_count + 1;
    v_set_clauses := array_append(v_set_clauses, format('email = $%s', v_param_count + 2));
  END IF;

  IF p_role IS NOT NULL THEN
    v_param_count := v_param_count + 1;
    v_set_clauses := array_append(v_set_clauses, format('role = $%s', v_param_count + 2));
  END IF;

  IF p_permission_type IS NOT NULL THEN
    v_param_count := v_param_count + 1;
    v_set_clauses := array_append(v_set_clauses, format('permission_type = $%s', v_param_count + 2));
  END IF;

  IF p_vehicle_plate IS NOT NULL THEN
    v_param_count := v_param_count + 1;
    v_set_clauses := array_append(v_set_clauses, format('vehicle_plate = $%s', v_param_count + 2));
  END IF;

  IF p_warehouse_ids IS NOT NULL THEN
    v_param_count := v_param_count + 1;
    v_set_clauses := array_append(v_set_clauses, format('warehouse_ids = $%s', v_param_count + 2));
  END IF;

  IF p_status IS NOT NULL THEN
    v_param_count := v_param_count + 1;
    v_set_clauses := array_append(v_set_clauses, format('status = $%s', v_param_count + 2));
  END IF;

  -- 如果没有要更新的字段，直接返回当前数据
  IF array_length(v_set_clauses, 1) IS NULL THEN
    v_sql := format(
      'SELECT row_to_json(%I.profiles.*) FROM %I.profiles WHERE id = $1',
      v_schema_name,
      v_schema_name
    );
    EXECUTE v_sql INTO v_result USING p_user_id;
    RETURN v_result;
  END IF;

  -- 添加 updated_at 字段
  v_set_clauses := array_append(v_set_clauses, 'updated_at = now()');

  -- 构建动态 SQL
  v_sql := format(
    'UPDATE %I.profiles SET %s WHERE id = $1 RETURNING row_to_json(%I.profiles.*)',
    v_schema_name,
    array_to_string(v_set_clauses, ', '),
    v_schema_name
  );

  -- 执行更新（使用 EXECUTE ... USING 传递参数）
  -- 注意：这里需要按照 SET 子句中的顺序传递参数
  IF p_name IS NOT NULL AND p_phone IS NOT NULL AND p_email IS NOT NULL AND 
     p_role IS NOT NULL AND p_permission_type IS NOT NULL AND p_vehicle_plate IS NOT NULL AND 
     p_warehouse_ids IS NOT NULL AND p_status IS NOT NULL THEN
    EXECUTE v_sql INTO v_result USING p_user_id, p_name, p_phone, p_email, p_role, 
                                       p_permission_type, p_vehicle_plate, p_warehouse_ids, p_status;
  ELSIF p_name IS NOT NULL THEN
    EXECUTE v_sql INTO v_result USING p_user_id, p_name;
  ELSIF p_phone IS NOT NULL THEN
    EXECUTE v_sql INTO v_result USING p_user_id, p_phone;
  ELSIF p_role IS NOT NULL THEN
    EXECUTE v_sql INTO v_result USING p_user_id, p_role;
  ELSIF p_status IS NOT NULL THEN
    EXECUTE v_sql INTO v_result USING p_user_id, p_status;
  ELSE
    -- 对于其他组合，使用简化的方法
    -- 先查询当前数据
    v_sql := format(
      'SELECT row_to_json(%I.profiles.*) FROM %I.profiles WHERE id = $1',
      v_schema_name,
      v_schema_name
    );
    EXECUTE v_sql INTO v_result USING p_user_id;
    
    -- 然后逐个更新字段
    IF p_name IS NOT NULL THEN
      v_sql := format('UPDATE %I.profiles SET name = $2, updated_at = now() WHERE id = $1', v_schema_name);
      EXECUTE v_sql USING p_user_id, p_name;
    END IF;
    
    IF p_phone IS NOT NULL THEN
      v_sql := format('UPDATE %I.profiles SET phone = $2, updated_at = now() WHERE id = $1', v_schema_name);
      EXECUTE v_sql USING p_user_id, p_phone;
    END IF;
    
    IF p_email IS NOT NULL THEN
      v_sql := format('UPDATE %I.profiles SET email = $2, updated_at = now() WHERE id = $1', v_schema_name);
      EXECUTE v_sql USING p_user_id, p_email;
    END IF;
    
    IF p_role IS NOT NULL THEN
      v_sql := format('UPDATE %I.profiles SET role = $2, updated_at = now() WHERE id = $1', v_schema_name);
      EXECUTE v_sql USING p_user_id, p_role;
    END IF;
    
    IF p_permission_type IS NOT NULL THEN
      v_sql := format('UPDATE %I.profiles SET permission_type = $2, updated_at = now() WHERE id = $1', v_schema_name);
      EXECUTE v_sql USING p_user_id, p_permission_type;
    END IF;
    
    IF p_vehicle_plate IS NOT NULL THEN
      v_sql := format('UPDATE %I.profiles SET vehicle_plate = $2, updated_at = now() WHERE id = $1', v_schema_name);
      EXECUTE v_sql USING p_user_id, p_vehicle_plate;
    END IF;
    
    IF p_warehouse_ids IS NOT NULL THEN
      v_sql := format('UPDATE %I.profiles SET warehouse_ids = $2, updated_at = now() WHERE id = $1', v_schema_name);
      EXECUTE v_sql USING p_user_id, p_warehouse_ids;
    END IF;
    
    IF p_status IS NOT NULL THEN
      v_sql := format('UPDATE %I.profiles SET status = $2, updated_at = now() WHERE id = $1', v_schema_name);
      EXECUTE v_sql USING p_user_id, p_status;
    END IF;
    
    -- 查询更新后的数据
    v_sql := format(
      'SELECT row_to_json(%I.profiles.*) FROM %I.profiles WHERE id = $1',
      v_schema_name,
      v_schema_name
    );
    EXECUTE v_sql INTO v_result USING p_user_id;
  END IF;

  RETURN v_result;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.update_tenant_user TO authenticated;

COMMENT ON FUNCTION public.update_tenant_user IS '在租户 Schema 中更新用户信息';
