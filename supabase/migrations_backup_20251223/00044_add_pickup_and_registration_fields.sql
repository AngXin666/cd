/*
# 添加提车和登记照片相关字段

## 背景
代码中使用了提车和登记照片相关字段，但数据库中缺少这些字段。

## 新增字段
- pickup_photos (text[]) - 提车照片URL数组
- pickup_time (timestamptz) - 提车时间
- registration_photos (text[]) - 行驶证照片URL数组
- return_photos (text[]) - 还车照片URL数组
- return_time (timestamptz) - 还车时间
*/

-- 添加提车相关字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pickup_photos text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pickup_time timestamptz;

-- 添加登记照片字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_photos text[];

-- 添加还车相关字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS return_photos text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS return_time timestamptz;

-- 添加注释
COMMENT ON COLUMN vehicles.pickup_photos IS '提车照片URL数组';
COMMENT ON COLUMN vehicles.pickup_time IS '提车时间';
COMMENT ON COLUMN vehicles.registration_photos IS '行驶证照片URL数组';
COMMENT ON COLUMN vehicles.return_photos IS '还车照片URL数组';
COMMENT ON COLUMN vehicles.return_time IS '还车时间';
