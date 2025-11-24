-- 添加考勤记录（最近7天）
INSERT INTO attendance (
  user_id,
  warehouse_id,
  work_date,
  clock_in_time,
  clock_out_time,
  status,
  work_hours,
  created_at
)
VALUES
  -- 司机1 - 仓库1 - 今天
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    (CURRENT_DATE + TIME '08:00:00')::timestamptz,
    (CURRENT_DATE + TIME '18:00:00')::timestamptz,
    'normal',
    10.0,
    NOW()
  ),
  -- 司机1 - 仓库1 - 昨天
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '1 day',
    (CURRENT_DATE - INTERVAL '1 day' + TIME '08:05:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '1 day' + TIME '18:00:00')::timestamptz,
    'late',
    9.92,
    NOW()
  ),
  -- 司机1 - 仓库1 - 前天
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '2 days',
    (CURRENT_DATE - INTERVAL '2 days' + TIME '08:00:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '2 days' + TIME '17:50:00')::timestamptz,
    'early_leave',
    9.83,
    NOW()
  ),
  -- 司机1 - 仓库1 - 3天前
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '3 days',
    (CURRENT_DATE - INTERVAL '3 days' + TIME '08:00:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '3 days' + TIME '18:00:00')::timestamptz,
    'normal',
    10.0,
    NOW()
  ),
  -- 司机1 - 仓库1 - 4天前
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '4 days',
    (CURRENT_DATE - INTERVAL '4 days' + TIME '08:00:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '4 days' + TIME '18:00:00')::timestamptz,
    'normal',
    10.0,
    NOW()
  ),
  -- 司机1 - 仓库1 - 5天前
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '5 days',
    (CURRENT_DATE - INTERVAL '5 days' + TIME '08:00:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '5 days' + TIME '18:00:00')::timestamptz,
    'normal',
    10.0,
    NOW()
  ),
  -- 司机1 - 仓库1 - 6天前
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '6 days',
    (CURRENT_DATE - INTERVAL '6 days' + TIME '08:00:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '6 days' + TIME '18:00:00')::timestamptz,
    'normal',
    10.0,
    NOW()
  ),
  -- 司机2 - 仓库1 - 今天
  (
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    (CURRENT_DATE + TIME '08:00:00')::timestamptz,
    (CURRENT_DATE + TIME '18:00:00')::timestamptz,
    'normal',
    10.0,
    NOW()
  ),
  -- 司机2 - 仓库1 - 昨天
  (
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '1 day',
    (CURRENT_DATE - INTERVAL '1 day' + TIME '08:00:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '1 day' + TIME '18:00:00')::timestamptz,
    'normal',
    10.0,
    NOW()
  ),
  -- 司机2 - 仓库2 - 今天
  (
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    CURRENT_DATE,
    (CURRENT_DATE + TIME '09:00:00')::timestamptz,
    (CURRENT_DATE + TIME '18:00:00')::timestamptz,
    'normal',
    9.0,
    NOW()
  )
ON CONFLICT (user_id, work_date) DO NOTHING;