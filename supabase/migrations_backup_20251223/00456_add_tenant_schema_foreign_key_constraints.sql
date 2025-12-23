/*
# 为租户 Schema 添加外键约束

## 目的
在租户 Schema 中创建外键约束，保证数据引用的正确性，确保数据仅在本租户数据范围内生效。

## 背景
之前我们删除了 public Schema 中所有引用 profiles 的外键约束，以支持多租户架构。
但是，在租户 Schema 中，我们应该创建外键约束，引用租户 Schema 中的 profiles 表。

## 优点
1. **数据完整性保证**：数据库层面保证数据引用的正确性
2. **租户数据隔离**：确保数据仅在本租户范围内引用
3. **防止数据错误**：防止引用不存在的用户 ID
4. **性能优化**：数据库可以利用外键索引优化查询

## 实施策略
为每个租户 Schema 中的表添加外键约束，引用同一 Schema 中的 profiles 表：
- attendance.user_id → profiles(id)
- driver_warehouses.driver_id → profiles(id)
- manager_warehouses.manager_id → profiles(id)
- leave_requests.user_id → profiles(id)
- notifications.sender_id → profiles(id)
- piecework_records.user_id → profiles(id)
- vehicles.driver_id → profiles(id)

## 注意事项
1. 外键约束只在租户 Schema 内生效
2. public Schema 中的表不添加外键约束（因为需要支持跨 Schema 引用）
3. 使用 ON DELETE CASCADE 或 ON DELETE SET NULL，根据业务需求选择

*/

-- ============================================================
-- 创建函数：为租户 Schema 添加外键约束
-- ============================================================
CREATE OR REPLACE FUNCTION add_tenant_foreign_keys(tenant_schema text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. attendance.user_id → profiles(id)
  EXECUTE format('
    ALTER TABLE %I.attendance 
    DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
    
    ALTER TABLE %I.attendance 
    ADD CONSTRAINT attendance_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES %I.profiles(id) ON DELETE CASCADE;
  ', tenant_schema, tenant_schema, tenant_schema);
  
  -- 2. driver_warehouses.driver_id → profiles(id)
  EXECUTE format('
    ALTER TABLE %I.driver_warehouses 
    DROP CONSTRAINT IF EXISTS driver_warehouses_driver_id_fkey;
    
    ALTER TABLE %I.driver_warehouses 
    ADD CONSTRAINT driver_warehouses_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES %I.profiles(id) ON DELETE CASCADE;
  ', tenant_schema, tenant_schema, tenant_schema);
  
  -- 3. manager_warehouses.manager_id → profiles(id)
  EXECUTE format('
    ALTER TABLE %I.manager_warehouses 
    DROP CONSTRAINT IF EXISTS manager_warehouses_manager_id_fkey;
    
    ALTER TABLE %I.manager_warehouses 
    ADD CONSTRAINT manager_warehouses_manager_id_fkey 
    FOREIGN KEY (manager_id) REFERENCES %I.profiles(id) ON DELETE CASCADE;
  ', tenant_schema, tenant_schema, tenant_schema);
  
  -- 4. leave_requests.user_id → profiles(id)
  EXECUTE format('
    ALTER TABLE %I.leave_requests 
    DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey;
    
    ALTER TABLE %I.leave_requests 
    ADD CONSTRAINT leave_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES %I.profiles(id) ON DELETE CASCADE;
  ', tenant_schema, tenant_schema, tenant_schema);
  
  -- 5. notifications.sender_id → profiles(id)
  EXECUTE format('
    ALTER TABLE %I.notifications 
    DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
    
    ALTER TABLE %I.notifications 
    ADD CONSTRAINT notifications_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES %I.profiles(id) ON DELETE CASCADE;
  ', tenant_schema, tenant_schema, tenant_schema);
  
  -- 6. piecework_records.user_id → profiles(id)
  EXECUTE format('
    ALTER TABLE %I.piecework_records 
    DROP CONSTRAINT IF EXISTS piecework_records_user_id_fkey;
    
    ALTER TABLE %I.piecework_records 
    ADD CONSTRAINT piecework_records_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES %I.profiles(id) ON DELETE CASCADE;
  ', tenant_schema, tenant_schema, tenant_schema);
  
  -- 7. vehicles.driver_id → profiles(id)
  EXECUTE format('
    ALTER TABLE %I.vehicles 
    DROP CONSTRAINT IF EXISTS vehicles_driver_id_fkey;
    
    ALTER TABLE %I.vehicles 
    ADD CONSTRAINT vehicles_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES %I.profiles(id) ON DELETE SET NULL;
  ', tenant_schema, tenant_schema, tenant_schema);
  
  RAISE NOTICE '✅ 已为租户 Schema % 添加外键约束', tenant_schema;
END;
$$;

-- ============================================================
-- 为所有现有租户 Schema 添加外键约束
-- ============================================================

-- 为 tenant_test1 添加外键约束
SELECT add_tenant_foreign_keys('tenant_test1');

-- 为 tenant_test2 添加外键约束
SELECT add_tenant_foreign_keys('tenant_test2');

-- ============================================================
-- 添加注释
-- ============================================================

-- tenant_test1
COMMENT ON CONSTRAINT attendance_user_id_fkey ON tenant_test1.attendance IS 
  '外键约束：user_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT driver_warehouses_driver_id_fkey ON tenant_test1.driver_warehouses IS 
  '外键约束：driver_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT manager_warehouses_manager_id_fkey ON tenant_test1.manager_warehouses IS 
  '外键约束：manager_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT leave_requests_user_id_fkey ON tenant_test1.leave_requests IS 
  '外键约束：user_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT notifications_sender_id_fkey ON tenant_test1.notifications IS 
  '外键约束：sender_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT piecework_records_user_id_fkey ON tenant_test1.piecework_records IS 
  '外键约束：user_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT vehicles_driver_id_fkey ON tenant_test1.vehicles IS 
  '外键约束：driver_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

-- tenant_test2
COMMENT ON CONSTRAINT attendance_user_id_fkey ON tenant_test2.attendance IS 
  '外键约束：user_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT driver_warehouses_driver_id_fkey ON tenant_test2.driver_warehouses IS 
  '外键约束：driver_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT manager_warehouses_manager_id_fkey ON tenant_test2.manager_warehouses IS 
  '外键约束：manager_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT leave_requests_user_id_fkey ON tenant_test2.leave_requests IS 
  '外键约束：user_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT notifications_sender_id_fkey ON tenant_test2.notifications IS 
  '外键约束：sender_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT piecework_records_user_id_fkey ON tenant_test2.piecework_records IS 
  '外键约束：user_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';

COMMENT ON CONSTRAINT vehicles_driver_id_fkey ON tenant_test2.vehicles IS 
  '外键约束：driver_id 引用本租户 Schema 中的 profiles(id)，确保数据仅在本租户范围内引用。';
