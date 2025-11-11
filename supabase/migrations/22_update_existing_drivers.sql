/*
# 更新现有司机的 driver_type

为所有现有的司机（role = 'driver'）设置默认的 driver_type 值。
如果司机有车牌号，则设置为 'driver_with_vehicle'，否则设置为 'driver'。

## 更新内容
1. 为有车牌号的司机设置 driver_type = 'driver_with_vehicle'
2. 为没有车牌号的司机设置 driver_type = 'driver'
*/

-- 为有车牌号的司机设置为带车司机
UPDATE profiles
SET driver_type = 'driver_with_vehicle'::driver_type
WHERE role = 'driver'
  AND vehicle_plate IS NOT NULL
  AND vehicle_plate != ''
  AND driver_type IS NULL;

-- 为没有车牌号的司机设置为纯司机
UPDATE profiles
SET driver_type = 'driver'::driver_type
WHERE role = 'driver'
  AND (vehicle_plate IS NULL OR vehicle_plate = '')
  AND driver_type IS NULL;
