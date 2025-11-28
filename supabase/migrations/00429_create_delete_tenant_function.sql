/*
# 创建删除租户的 RPC 函数

## 问题
- 当前的 `deleteTenant` 函数只删除 `public.profiles` 中的记录
- 没有删除租户 Schema 中的数据
- 没有删除租户 Schema 本身
- 没有删除 `auth.users` 中的用户记录
- 没有删除 `tenants` 表中的租户记录
- 导致数据残留，无法真正删除租户

## 解决方案
创建 RPC 函数 `delete_tenant_completely`，完整删除租户的所有数据：
1. 查询租户信息（从 `tenants` 表）
2. 删除租户 Schema 中的所有用户的 auth.users 记录
3. 删除租户 Schema 本身（包括所有表和数据）
4. 删除 `tenants` 表中的租户记录

## 函数参数
- p_tenant_id: 租户ID（tenants 表的 id）

## 返回值
JSONB 对象：
- success: 是否成功
- message: 操作消息
- deleted_users: 删除的用户数量
- deleted_schema: 删除的 Schema 名称
- error: 错误信息（如果失败）
*/

CREATE OR REPLACE FUNCTION public.delete_tenant_completely(
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_record RECORD;
  v_schema_name TEXT;
  v_deleted_users INTEGER := 0;
  v_user_record RECORD;
BEGIN
  -- 1. 查询租户信息
  SELECT * INTO v_tenant_record
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '租户不存在',
      'error', '未找到指定的租户'
    );
  END IF;
  
  v_schema_name := v_tenant_record.schema_name;
  
  -- 2. 删除租户 Schema 中所有用户的 auth.users 记录
  -- 首先获取租户 Schema 中的所有用户 ID
  FOR v_user_record IN
    EXECUTE format('SELECT id FROM %I.profiles', v_schema_name)
  LOOP
    -- 删除 auth.users 记录
    DELETE FROM auth.users WHERE id = v_user_record.id;
    v_deleted_users := v_deleted_users + 1;
  END LOOP;
  
  -- 3. 删除租户 Schema（包括所有表和数据）
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema_name);
  
  -- 4. 删除 tenants 表中的租户记录
  DELETE FROM public.tenants WHERE id = p_tenant_id;
  
  -- 5. 返回成功结果
  RETURN jsonb_build_object(
    'success', true,
    'message', '租户删除成功',
    'deleted_users', v_deleted_users,
    'deleted_schema', v_schema_name,
    'tenant_code', v_tenant_record.tenant_code,
    'company_name', v_tenant_record.company_name
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', '删除租户失败',
    'error', SQLERRM
  );
END;
$$;

-- 授予执行权限（只有 super_admin 可以执行）
GRANT EXECUTE ON FUNCTION public.delete_tenant_completely(UUID) TO authenticated;

-- 添加注释
COMMENT ON FUNCTION public.delete_tenant_completely IS '完整删除租户及其所有数据（包括 Schema、用户、auth.users 记录）';
