/*
# 添加车辆提车/还车管理功能

## 1. 新增 enum 值

为 vehicle_status 添加新状态：
- `picked_up`: 已提车（未还车）
- `returned`: 已还车

## 2. 新增字段说明

为 vehicles 表添加以下字段：
- `pickup_time` (timestamptz): 提车时间
- `return_time` (timestamptz): 还车时间  
- `pickup_photos` (text[]): 提车照片URL数组
- `return_photos` (text[]): 还车照片URL数组
- `registration_photos` (text[]): 行驶证照片URL数组

## 3. 数据迁移

将现有 active 状态的车辆改为 picked_up 状态

*/

-- 步骤1：添加新的 enum 值
ALTER TYPE vehicle_status ADD VALUE IF NOT EXISTS 'picked_up';
ALTER TYPE vehicle_status ADD VALUE IF NOT EXISTS 'returned';

-- 步骤2：添加新字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pickup_time timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS return_time timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pickup_photos text[] DEFAULT '{}';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS return_photos text[] DEFAULT '{}';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_photos text[] DEFAULT '{}';

-- 步骤3：添加字段注释
COMMENT ON COLUMN vehicles.pickup_time IS '提车时间';
COMMENT ON COLUMN vehicles.return_time IS '还车时间';
COMMENT ON COLUMN vehicles.pickup_photos IS '提车照片URL数组';
COMMENT ON COLUMN vehicles.return_photos IS '还车照片URL数组';
COMMENT ON COLUMN vehicles.registration_photos IS '行驶证照片URL数组';

-- 步骤4：数据迁移 - 将 active 状态的车辆改为 picked_up（假设已提车）
UPDATE vehicles 
SET status = 'picked_up'::vehicle_status,
    pickup_time = COALESCE(created_at, now())
WHERE status = 'active'::vehicle_status;
