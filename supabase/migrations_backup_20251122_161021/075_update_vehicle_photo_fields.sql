/*
# 更新车辆照片字段

## 1. 变更说明
将车辆照片字段从原来的前后左右改为更详细的7个角度：
- 左前照片
- 右前照片
- 左后照片
- 右后照片
- 仪表盘照片
- 后门照片
- 货箱照片

## 2. 迁移策略
- 删除旧的照片字段（front_photo, back_photo, left_photo, right_photo, tire_photo）
- 添加新的照片字段
- 保留 driving_license_photo（行驶证照片）
*/

-- 删除旧的照片字段
ALTER TABLE vehicles DROP COLUMN IF EXISTS front_photo;
ALTER TABLE vehicles DROP COLUMN IF EXISTS back_photo;
ALTER TABLE vehicles DROP COLUMN IF EXISTS left_photo;
ALTER TABLE vehicles DROP COLUMN IF EXISTS right_photo;
ALTER TABLE vehicles DROP COLUMN IF EXISTS tire_photo;

-- 添加新的照片字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS left_front_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS right_front_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS left_rear_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS right_rear_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS dashboard_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rear_door_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS cargo_box_photo TEXT;

-- 添加注释
COMMENT ON COLUMN vehicles.left_front_photo IS '左前照片';
COMMENT ON COLUMN vehicles.right_front_photo IS '右前照片';
COMMENT ON COLUMN vehicles.left_rear_photo IS '左后照片';
COMMENT ON COLUMN vehicles.right_rear_photo IS '右后照片';
COMMENT ON COLUMN vehicles.dashboard_photo IS '仪表盘照片';
COMMENT ON COLUMN vehicles.rear_door_photo IS '后门照片';
COMMENT ON COLUMN vehicles.cargo_box_photo IS '货箱照片';
COMMENT ON COLUMN vehicles.driving_license_photo IS '行驶证照片';
