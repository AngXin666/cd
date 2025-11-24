-- 添加考勤记录
INSERT INTO attendance (user_id, warehouse_id, work_date, clock_in_time, clock_out_time, status, work_hours, created_at)
VALUES
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, (CURRENT_DATE + TIME '08:00:00')::timestamptz, (CURRENT_DATE + TIME '18:00:00')::timestamptz, 'normal', 10.0, NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', CURRENT_DATE - 1, (CURRENT_DATE - 1 + TIME '08:05:00')::timestamptz, (CURRENT_DATE - 1 + TIME '18:00:00')::timestamptz, 'late', 9.92, NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', CURRENT_DATE - 2, (CURRENT_DATE - 2 + TIME '08:00:00')::timestamptz, (CURRENT_DATE - 2 + TIME '17:50:00')::timestamptz, 'early', 9.83, NOW())
ON CONFLICT (user_id, work_date) DO NOTHING;

-- 添加计件记录
INSERT INTO piece_work_records (user_id, warehouse_id, category_id, work_date, quantity, unit_price, total_amount, need_upstairs, upstairs_price, need_sorting, sorting_quantity, sorting_unit_price, created_at, updated_at)
VALUES
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', CURRENT_DATE, 10, 50.00, 500.00, false, 0, false, 0, 0, NOW(), NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', CURRENT_DATE, 5, 80.00, 400.00, false, 0, false, 0, 0, NOW(), NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', CURRENT_DATE, 20, 30.00, 600.00, false, 0, false, 0, 0, NOW(), NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', CURRENT_DATE - 1, 12, 50.00, 600.00, false, 0, false, 0, 0, NOW(), NOW()),
  ('1576b795-0ac3-4c00-826f-3273d3abe767', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', CURRENT_DATE - 1, 6, 80.00, 480.00, false, 0, false, 0, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;