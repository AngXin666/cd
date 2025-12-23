/*
# 添加示例考勤和计件数据

## 说明
为测试用户添加示例考勤和计件数据，以便管理员端首页能够显示统计信息。

## 数据内容
1. 考勤记录（attendance）
   - 为测试司机添加最近7天的考勤记录
   - 包括正常出勤、迟到、早退等情况

2. 计件记录（piece_work_records）
   - 为测试司机添加最近7天的计件记录
   - 包括不同类别的计件数据

## 测试用户
- 司机1: 00000000-0000-0000-0000-000000000003
- 司机2: 00000000-0000-0000-0000-000000000004

## 仓库
- 仓库1: 10000000-0000-0000-0000-000000000001
- 仓库2: 10000000-0000-0000-0000-000000000002
*/

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

-- 添加计件记录（最近7天）
INSERT INTO piece_work_records (
  user_id,
  warehouse_id,
  work_date,
  category_name,
  quantity,
  unit_price,
  upstairs_quantity,
  upstairs_price,
  sorting_quantity,
  sorting_unit_price,
  total_amount,
  created_at,
  updated_at
)
VALUES
  -- 司机1 - 仓库1 - 今天 - 标准件
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    '标准件',
    150,
    1.5,
    50,
    0.5,
    30,
    0.3,
    259.0,
    NOW(),
    NOW()
  ),
  -- 司机1 - 仓库1 - 今天 - 大件
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    '大件',
    80,
    2.5,
    30,
    1.0,
    20,
    0.5,
    240.0,
    NOW(),
    NOW()
  ),
  -- 司机1 - 仓库1 - 昨天 - 标准件
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '1 day',
    '标准件',
    200,
    1.5,
    60,
    0.5,
    40,
    0.3,
    342.0,
    NOW(),
    NOW()
  ),
  -- 司机1 - 仓库1 - 昨天 - 小件
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '1 day',
    '小件',
    300,
    1.0,
    100,
    0.3,
    50,
    0.2,
    340.0,
    NOW(),
    NOW()
  ),
  -- 司机1 - 仓库1 - 前天 - 标准件
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '2 days',
    '标准件',
    180,
    1.5,
    55,
    0.5,
    35,
    0.3,
    308.0,
    NOW(),
    NOW()
  ),
  -- 司机1 - 仓库1 - 3天前 - 标准件
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '3 days',
    '标准件',
    160,
    1.5,
    50,
    0.5,
    30,
    0.3,
    274.0,
    NOW(),
    NOW()
  ),
  -- 司机1 - 仓库1 - 4天前 - 标准件
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '4 days',
    '标准件',
    170,
    1.5,
    52,
    0.5,
    32,
    0.3,
    290.6,
    NOW(),
    NOW()
  ),
  -- 司机1 - 仓库1 - 5天前 - 标准件
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '5 days',
    '标准件',
    190,
    1.5,
    58,
    0.5,
    38,
    0.3,
    325.4,
    NOW(),
    NOW()
  ),
  -- 司机1 - 仓库1 - 6天前 - 标准件
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '6 days',
    '标准件',
    175,
    1.5,
    53,
    0.5,
    33,
    0.3,
    299.4,
    NOW(),
    NOW()
  ),
  -- 司机2 - 仓库1 - 今天 - 标准件
  (
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    '标准件',
    140,
    1.5,
    45,
    0.5,
    28,
    0.3,
    241.9,
    NOW(),
    NOW()
  ),
  -- 司机2 - 仓库1 - 今天 - 大件
  (
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    '大件',
    70,
    2.5,
    25,
    1.0,
    18,
    0.5,
    209.0,
    NOW(),
    NOW()
  ),
  -- 司机2 - 仓库1 - 昨天 - 标准件
  (
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '1 day',
    '标准件',
    160,
    1.5,
    50,
    0.5,
    32,
    0.3,
    274.6,
    NOW(),
    NOW()
  ),
  -- 司机2 - 仓库2 - 今天 - 标准件
  (
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    CURRENT_DATE,
    '标准件',
    120,
    1.8,
    40,
    0.6,
    25,
    0.4,
    250.0,
    NOW(),
    NOW()
  )
ON CONFLICT (user_id, warehouse_id, work_date, category_name) DO NOTHING;
