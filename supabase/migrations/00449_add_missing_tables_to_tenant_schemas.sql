/*
# 为租户 Schema 添加缺失的表

## 问题描述
租户 Schema 中缺少 `driver_warehouses` 和 `manager_warehouses` 表，导致添加司机时插入仓库分配失败。

## 解决方案
为所有现有租户 Schema 添加缺失的表：
1. `driver_warehouses` 表：司机和仓库的关联表
2. `manager_warehouses` 表：管理员/车队长和仓库的关联表

## 表结构

### driver_warehouses
- `id` (uuid, primary key)
- `driver_id` (uuid, references profiles.id)
- `warehouse_id` (uuid, references warehouses.id)
- `created_at` (timestamptz)
- UNIQUE(driver_id, warehouse_id)

### manager_warehouses
- `id` (uuid, primary key)
- `manager_id` (uuid, references profiles.id)
- `warehouse_id` (uuid, references warehouses.id)
- `created_at` (timestamptz)
- UNIQUE(manager_id, warehouse_id)

## 安全策略
- 不启用 RLS，因为租户内的用户应该可以自由访问这些表
- 租户隔离通过 Schema 级别实现，不需要行级安全

*/

-- 为所有现有租户 Schema 添加缺失的表
DO $$
DECLARE
  tenant_record RECORD;
  table_exists boolean;
BEGIN
  -- 遍历所有租户
  FOR tenant_record IN 
    SELECT id, schema_name 
    FROM tenants 
    WHERE schema_name IS NOT NULL
  LOOP
    RAISE NOTICE '处理租户 Schema: %', tenant_record.schema_name;
    
    -- 检查 driver_warehouses 表是否存在
    EXECUTE format(
      'SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = %L AND table_name = %L
      )',
      tenant_record.schema_name,
      'driver_warehouses'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
      -- 创建 driver_warehouses 表
      EXECUTE format('
        CREATE TABLE %I.driver_warehouses (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
          warehouse_id uuid NOT NULL REFERENCES %I.warehouses(id) ON DELETE CASCADE,
          created_at timestamptz DEFAULT now(),
          UNIQUE(driver_id, warehouse_id)
        )',
        tenant_record.schema_name,
        tenant_record.schema_name,
        tenant_record.schema_name
      );
      RAISE NOTICE '✅ 已创建 %.driver_warehouses 表', tenant_record.schema_name;
    ELSE
      RAISE NOTICE '⏭️  %.driver_warehouses 表已存在，跳过', tenant_record.schema_name;
    END IF;
    
    -- 检查 manager_warehouses 表是否存在
    EXECUTE format(
      'SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = %L AND table_name = %L
      )',
      tenant_record.schema_name,
      'manager_warehouses'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
      -- 创建 manager_warehouses 表
      EXECUTE format('
        CREATE TABLE %I.manager_warehouses (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          manager_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
          warehouse_id uuid NOT NULL REFERENCES %I.warehouses(id) ON DELETE CASCADE,
          created_at timestamptz DEFAULT now(),
          UNIQUE(manager_id, warehouse_id)
        )',
        tenant_record.schema_name,
        tenant_record.schema_name,
        tenant_record.schema_name
      );
      RAISE NOTICE '✅ 已创建 %.manager_warehouses 表', tenant_record.schema_name;
    ELSE
      RAISE NOTICE '⏭️  %.manager_warehouses 表已存在，跳过', tenant_record.schema_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ 所有租户 Schema 的缺失表已添加完成';
END $$;
