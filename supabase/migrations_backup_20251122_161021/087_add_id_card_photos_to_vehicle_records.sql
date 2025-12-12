/*
# 添加身份证照片字段到vehicle_records表

## 1. 新增字段
- `id_card_photo_front` (text) - 身份证正面照片URL
- `id_card_photo_back` (text) - 身份证背面照片URL

## 2. 说明
这两个字段用于存储司机的身份证照片，与行驶证照片一起构成"个人信息"。
*/

-- 添加身份证照片字段
ALTER TABLE vehicle_records 
ADD COLUMN IF NOT EXISTS id_card_photo_front TEXT,
ADD COLUMN IF NOT EXISTS id_card_photo_back TEXT;

-- 添加注释
COMMENT ON COLUMN vehicle_records.id_card_photo_front IS '身份证正面照片URL';
COMMENT ON COLUMN vehicle_records.id_card_photo_back IS '身份证背面照片URL';
