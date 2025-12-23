-- 添加考勤记录
INSERT INTO attendance (user_id, warehouse_id, work_date, clock_in_time, clock_out_time, status, work_hours, created_at)
VALUES
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, (CURRENT_DATE + TIME '08:00:00')::timestamptz, (CURRENT_DATE + TIME '18:00:00')::timestamptz, 'normal', 10.0, NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', CURRENT_DATE - 1, (CURRENT_DATE - 1 + TIME '08:05:00')::timestamptz, (CURRENT_DATE - 1 + TIME '18:00:00')::timestamptz, 'late', 9.92, NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', CURRENT_DATE - 2, (CURRENT_DATE - 2 + TIME '08:00:00')::timestamptz, (CURRENT_DATE - 2 + TIME '17:50:00')::timestamptz, 'early', 9.83, NOW())
ON CONFLICT (user_id, work_date) DO NOTHING;

-- 添加计件记录
INSERT INTO piece_work_records (user_id, warehouse_id, work_date, category_name, quantity, unit_price, upstairs_quantity, upstairs_price, sorting_quantity, sorting_unit_price, total_amount, created_at, updated_at)
VALUES
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, '标准件', 150, 1.5, 50, 0.5, 30, 0.3, 259.0, NOW(), NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, '大件', 80, 2.5, 30, 1.0, 20, 0.5, 240.0, NOW(), NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', CURRENT_DATE - 1, '标准件', 200, 1.5, 60, 0.5, 40, 0.3, 342.0, NOW(), NOW())
ON CONFLICT (user_id, warehouse_id, work_date, category_name) DO NOTHING;