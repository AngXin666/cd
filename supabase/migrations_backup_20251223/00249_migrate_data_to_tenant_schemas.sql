/*
# 将数据迁移到租户独立 Schema

将 public schema 中的数据迁移到各租户的独立 schema 中
*/

-- 数据迁移函数
CREATE OR REPLACE FUNCTION migrate_tenant_data(tenant_boss_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_name text;
  migrated_count integer;
BEGIN
  schema_name := 'tenant_' || replace(tenant_boss_id, '-', '_');
  
  -- 迁移 warehouses
  EXECUTE format('
    INSERT INTO %I.warehouses (id, name, is_active, created_at)
    SELECT id, name, is_active, created_at
    FROM public.warehouses
    WHERE boss_id = %L
    ON CONFLICT (id) DO NOTHING
  ', schema_name, tenant_boss_id);
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE '  - 迁移了 % 个仓库', migrated_count;
  
  -- 迁移 profiles
  EXECUTE format('
    INSERT INTO %I.profiles (id, phone, email, name, role, created_at)
    SELECT id, phone, email, name, role::text, created_at
    FROM public.profiles
    WHERE boss_id = %L OR id::text = %L
    ON CONFLICT (id) DO NOTHING
  ', schema_name, tenant_boss_id, tenant_boss_id);
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE '  - 迁移了 % 个用户', migrated_count;
  
  -- 迁移 attendance
  EXECUTE format('
    INSERT INTO %I.attendance (id, user_id, warehouse_id, work_date, created_at)
    SELECT id, user_id, warehouse_id, work_date, created_at
    FROM public.attendance
    WHERE boss_id = %L
    ON CONFLICT DO NOTHING
  ', schema_name, tenant_boss_id);
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE '  - 迁移了 % 条考勤记录', migrated_count;
  
  -- 迁移 piece_work_records
  EXECUTE format('
    INSERT INTO %I.piece_work_records (id, user_id, warehouse_id, work_date, quantity, created_at)
    SELECT id, user_id, warehouse_id, work_date, quantity, created_at
    FROM public.piece_work_records
    WHERE boss_id = %L
    ON CONFLICT DO NOTHING
  ', schema_name, tenant_boss_id);
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE '  - 迁移了 % 条计件记录', migrated_count;
  
  RAISE NOTICE '✅ 租户 % 数据迁移完成', tenant_boss_id;
END;
$$;

-- 执行所有租户的数据迁移
DO $$
DECLARE
  boss_record RECORD;
  total_tenants integer := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '开始迁移所有租户数据...';
  RAISE NOTICE '========================================';
  
  FOR boss_record IN 
    SELECT id::text as id, name FROM profiles WHERE role = 'super_admin'::user_role
  LOOP
    total_tenants := total_tenants + 1;
    RAISE NOTICE '正在迁移租户 %: %', total_tenants, COALESCE(boss_record.name, '未命名');
    PERFORM migrate_tenant_data(boss_record.id);
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 所有 % 个租户的数据迁移完成！', total_tenants;
  RAISE NOTICE '========================================';
END $$;