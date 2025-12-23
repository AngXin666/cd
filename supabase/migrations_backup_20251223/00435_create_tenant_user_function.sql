/*
# 创建租户用户的 RPC 函数

## 功能说明
创建一个 RPC 函数，用于在租户 Schema 中创建用户。

## 函数参数
- p_tenant_id: 租户 ID
- p_user_id: 用户 ID（来自 auth.users）
- p_name: 用户姓名
- p_phone: 手机号
- p_email: 邮箱
- p_role: 角色（boss, peer_admin, manager, driver）
- p_permission_type: 权限类型（可选）
- p_vehicle_plate: 车牌号（可选，司机用）
- p_warehouse_ids: 仓库 ID 数组（可选）

## 函数功能
1. 验证租户 ID 和 Schema 名称
2. 在租户 Schema 的 profiles 表中插入用户记录
3. 返回创建的用户信息

## 安全性
- 使用 SECURITY DEFINER 以管理员权限执行
- 验证 Schema 名称格式（防止 SQL 注入）
*/

CREATE OR REPLACE FUNCTION public.create_tenant_user(
  p_tenant_id uuid,
  p_user_id uuid,
  p_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_role text DEFAULT 'driver',
  p_permission_type text DEFAULT 'full',
  p_vehicle_plate text DEFAULT NULL,
  p_warehouse_ids uuid[] DEFAULT NULL
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

  -- 构建动态 SQL，在租户 Schema 中插入用户
  v_sql := format(
    'INSERT INTO %I.profiles (id, name, phone, email, role, permission_type, vehicle_plate, warehouse_ids, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
     RETURNING row_to_json(%I.profiles.*)',
    v_schema_name,
    v_schema_name
  );

  -- 执行插入
  EXECUTE v_sql
  INTO v_result
  USING p_user_id, p_name, p_phone, p_email, p_role, p_permission_type, p_vehicle_plate, p_warehouse_ids, 'active';

  RETURN v_result;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.create_tenant_user TO authenticated;

COMMENT ON FUNCTION public.create_tenant_user IS '在租户 Schema 中创建用户';
