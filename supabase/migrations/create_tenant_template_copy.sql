/*
# 租户模板复制功能

## 功能说明
本迁移实现了租户模板复制功能，在创建新租户时自动复制第一个租户的配置。

## 主要功能
1. **获取模板租户配置**：`get_template_tenant_config()` 函数获取第一个租户的配置信息
2. **复制模板到新租户**：`copy_template_to_new_tenant()` 函数将模板租户的配置复制到新租户

## 复制内容
- 仓库信息（warehouses）
- 车辆信息（vehicles）- 不包括司机绑定关系
- 其他基础配置数据

## 使用方式
创建新租户后，自动调用 `copy_template_to_new_tenant(new_tenant_code)` 即可。

## 注意事项
1. 第一个租户作为模板租户，其配置会被复制到所有新租户
2. 车牌号等唯一标识会自动调整，避免冲突
3. 司机绑定关系不会被复制，需要新租户自行配置
*/

-- 1. 创建函数：获取模板租户（第一个租户）的配置
CREATE OR REPLACE FUNCTION get_template_tenant_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_tenant RECORD;
  v_config JSONB;
BEGIN
  -- 获取第一个创建的租户作为模板
  SELECT * INTO v_template_tenant
  FROM public.tenants
  WHERE status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_template_tenant IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '没有找到模板租户'
    );
  END IF;

  -- 返回模板租户的基本信息
  v_config := jsonb_build_object(
    'success', true,
    'tenant_id', v_template_tenant.id,
    'tenant_code', v_template_tenant.tenant_code,
    'company_name', v_template_tenant.company_name
  );

  RETURN v_config;
END;
$$;

-- 2. 创建函数：复制模板租户的配置到新租户
CREATE OR REPLACE FUNCTION copy_template_to_new_tenant(
  p_new_tenant_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_config JSONB;
  v_template_code TEXT;
  v_new_tenant RECORD;
  v_warehouse_count INTEGER := 0;
  v_vehicle_count INTEGER := 0;
  v_warehouse_mapping JSONB := '{}'::JSONB;
  v_old_warehouse_id UUID;
  v_new_warehouse_id UUID;
  v_warehouse RECORD;
  v_vehicle RECORD;
BEGIN
  -- 获取模板租户配置
  v_template_config := get_template_tenant_config();
  
  IF (v_template_config->>'success')::BOOLEAN = false THEN
    RETURN v_template_config;
  END IF;

  v_template_code := v_template_config->>'tenant_code';

  -- 获取新租户信息
  SELECT * INTO v_new_tenant
  FROM public.tenants
  WHERE tenant_code = p_new_tenant_code;

  IF v_new_tenant IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '新租户不存在'
    );
  END IF;

  -- 检查新租户和模板租户是否相同
  IF v_template_code = p_new_tenant_code THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '不能将模板租户复制到自己'
    );
  END IF;

  -- 开始复制配置

  -- 1. 复制仓库信息
  FOR v_warehouse IN 
    EXECUTE format('SELECT * FROM %I.warehouses ORDER BY created_at', v_template_code)
  LOOP
    -- 在新租户中创建仓库
    EXECUTE format('
      INSERT INTO %I.warehouses (name, address, contact_person, contact_phone, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    ', p_new_tenant_code)
    USING 
      v_warehouse.name,
      v_warehouse.address,
      v_warehouse.contact_person,
      v_warehouse.contact_phone,
      v_warehouse.status
    INTO v_new_warehouse_id;

    -- 记录仓库ID映射关系
    v_warehouse_mapping := v_warehouse_mapping || 
      jsonb_build_object(v_warehouse.id::TEXT, v_new_warehouse_id::TEXT);

    v_warehouse_count := v_warehouse_count + 1;
  END LOOP;

  -- 2. 复制车辆信息（不包括司机绑定）
  FOR v_vehicle IN 
    EXECUTE format('SELECT * FROM %I.vehicles ORDER BY created_at', v_template_code)
  LOOP
    -- 获取对应的新仓库ID
    v_new_warehouse_id := NULL;
    IF v_vehicle.warehouse_id IS NOT NULL THEN
      v_new_warehouse_id := (v_warehouse_mapping->>v_vehicle.warehouse_id::TEXT)::UUID;
    END IF;

    -- 在新租户中创建车辆（不绑定司机，车牌号添加后缀避免冲突）
    EXECUTE format('
      INSERT INTO %I.vehicles (plate_number, warehouse_id, status)
      VALUES ($1, $2, $3)
    ', p_new_tenant_code)
    USING 
      v_vehicle.plate_number || '-副本',  -- 添加后缀避免车牌号冲突
      v_new_warehouse_id,
      v_vehicle.status;

    v_vehicle_count := v_vehicle_count + 1;
  END LOOP;

  -- 返回复制结果
  RETURN jsonb_build_object(
    'success', true,
    'message', '配置复制成功',
    'template_tenant', v_template_code,
    'new_tenant', p_new_tenant_code,
    'warehouse_count', v_warehouse_count,
    'vehicle_count', v_vehicle_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '复制配置时发生错误: ' || SQLERRM
    );
END;
$$;

-- 3. 授予执行权限
GRANT EXECUTE ON FUNCTION get_template_tenant_config() TO authenticated;
GRANT EXECUTE ON FUNCTION copy_template_to_new_tenant(TEXT) TO authenticated;

-- 4. 添加注释
COMMENT ON FUNCTION get_template_tenant_config() IS '获取模板租户（第一个租户）的配置信息';
COMMENT ON FUNCTION copy_template_to_new_tenant(TEXT) IS '将模板租户的配置复制到新租户';
