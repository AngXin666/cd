-- 创建司机-仓库关联
INSERT INTO driver_warehouses (driver_id, warehouse_id)
VALUES 
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002')
ON CONFLICT (driver_id, warehouse_id) DO NOTHING;

-- 创建管理员-仓库关联
INSERT INTO manager_warehouses (manager_id, warehouse_id)
VALUES 
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (manager_id, warehouse_id) DO NOTHING;

-- 创建考勤规则
INSERT INTO attendance_rules (warehouse_id, work_start_time, work_end_time, late_threshold, early_threshold, require_clock_out, is_active)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '08:00:00', '18:00:00', 15, 15, true, true),
  ('10000000-0000-0000-0000-000000000002', '09:00:00', '18:00:00', 15, 15, true, true)
ON CONFLICT DO NOTHING;

-- 创建价格分类
INSERT INTO category_prices (warehouse_id, category_name, unit_price, upstairs_price, sorting_unit_price, is_active)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '标准件', 1.5, 0.5, 0.3, true),
  ('10000000-0000-0000-0000-000000000001', '大件', 2.5, 1.0, 0.5, true),
  ('10000000-0000-0000-0000-000000000001', '小件', 1.0, 0.3, 0.2, true),
  ('10000000-0000-0000-0000-000000000002', '标准件', 1.8, 0.6, 0.4, true),
  ('10000000-0000-0000-0000-000000000002', '大件', 3.0, 1.2, 0.6, true),
  ('10000000-0000-0000-0000-000000000002', '小件', 1.2, 0.4, 0.3, true)
ON CONFLICT (warehouse_id, category_name) DO UPDATE SET
  unit_price = EXCLUDED.unit_price, upstairs_price = EXCLUDED.upstairs_price,
  sorting_unit_price = EXCLUDED.sorting_unit_price, is_active = EXCLUDED.is_active;