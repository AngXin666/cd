/*
# 添加车损特写照片字段

## 1. 目的
为vehicles表添加damage_photos字段，用于存储车损特写照片URL数组

## 2. 新增字段
- `damage_photos` (text[]): 车损特写照片URL数组，默认为空数组

## 3. 说明
车损特写照片用于记录车辆的损伤情况，可以上传多张照片
*/

-- 添加车损特写照片字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS damage_photos text[] DEFAULT '{}';

-- 添加字段注释
COMMENT ON COLUMN vehicles.damage_photos IS '车损特写照片URL数组';
