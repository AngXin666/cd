/*
# 添加 driving_license_photo 字段到 driver_licenses 表

## 问题描述
代码中使用了 `driving_license_photo` 字段来保存驾驶证照片，但数据库表 `driver_licenses` 中没有这个字段，导致保存驾驶员证件信息时报错：
```
Column 'driving_license_photo' of relation 'driver_licenses' does not exist
```

## 字段说明
- `front_photo_url` - 驾驶证正面照片（主页）
- `back_photo_url` - 驾驶证背面照片（副页）
- `driving_license_photo` - 驾驶证正本照片（添加车辆时拍摄的单张照片）

## 业务场景
1. 司机个人资料页面：上传驾驶证正面和背面两张照片（`front_photo_url`, `back_photo_url`）
2. 添加车辆页面：只拍摄一张驾驶证正本照片（`driving_license_photo`）

## 解决方案
添加 `driving_license_photo` 字段到 `driver_licenses` 表，用于存储添加车辆时拍摄的驾驶证正本照片。

## 影响
- 不影响现有的 `front_photo_url` 和 `back_photo_url` 字段
- 使代码和数据库表结构保持一致
- 修复添加车辆时保存驾驶员证件信息失败的问题
*/

-- 添加 driving_license_photo 字段
ALTER TABLE driver_licenses 
ADD COLUMN IF NOT EXISTS driving_license_photo text;

-- 添加注释
COMMENT ON COLUMN driver_licenses.driving_license_photo IS '驾驶证正本照片（添加车辆时拍摄）';
COMMENT ON COLUMN driver_licenses.front_photo_url IS '驾驶证正面照片（主页）';
COMMENT ON COLUMN driver_licenses.back_photo_url IS '驾驶证背面照片（副页）';
