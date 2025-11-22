/*
# 添加行驶证副页背页照片字段

## 背景
代码中使用了 driving_license_sub_back_photo 字段，但数据库中只有 driving_license_back_photo。
为了保持一致性，添加 driving_license_sub_back_photo 字段。

## 新增字段
- driving_license_sub_back_photo (text) - 行驶证副页背页照片URL
*/

-- 添加行驶证副页背页照片字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driving_license_sub_back_photo text;

-- 添加注释
COMMENT ON COLUMN vehicles.driving_license_sub_back_photo IS '行驶证副页背页照片URL';
