-- 创建测试用户资料（profiles）
INSERT INTO profiles (id, phone, name, role, login_account, join_date)
VALUES (
  '00000000-0000-0000-0000-000000000001', '13800000001', '超级管理员', 'super_admin'::user_role, 'admin', CURRENT_DATE
),
(
  '00000000-0000-0000-0000-000000000002', '13800000002', '张经理', 'manager'::user_role, 'manager01', CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone, name = EXCLUDED.name, role = EXCLUDED.role, login_account = EXCLUDED.login_account;

INSERT INTO profiles (id, phone, name, role, driver_type, login_account, join_date)
VALUES (
  '00000000-0000-0000-0000-000000000003', '13800000003', '李师傅', 'driver'::user_role, 'pure'::driver_type, 'driver01', CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone, name = EXCLUDED.name, role = EXCLUDED.role, driver_type = EXCLUDED.driver_type, login_account = EXCLUDED.login_account;

INSERT INTO profiles (id, phone, name, role, driver_type, vehicle_plate, login_account, join_date)
VALUES (
  '00000000-0000-0000-0000-000000000004', '13800000004', '王师傅', 'driver'::user_role, 'with_vehicle'::driver_type, '京A12345', 'driver02', CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone, name = EXCLUDED.name, role = EXCLUDED.role, driver_type = EXCLUDED.driver_type, vehicle_plate = EXCLUDED.vehicle_plate, login_account = EXCLUDED.login_account;

-- 创建测试仓库
INSERT INTO warehouses (id, name, is_active, max_leave_days, resignation_notice_days, daily_target)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '北京仓库', true, 30, 30, 100),
  ('10000000-0000-0000-0000-000000000002', '上海仓库', true, 30, 30, 150)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, is_active = EXCLUDED.is_active, max_leave_days = EXCLUDED.max_leave_days,
  resignation_notice_days = EXCLUDED.resignation_notice_days, daily_target = EXCLUDED.daily_target;