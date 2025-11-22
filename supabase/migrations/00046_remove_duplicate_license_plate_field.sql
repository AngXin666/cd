/*
# 删除重复的 license_plate 字段

## 问题
vehicles 表中同时存在两个字段：
1. license_plate (NOT NULL) - 旧字段，来自最初的表结构
2. plate_number (可为空) - 新字段，代码中使用的字段

这导致插入数据时，即使 plate_number 有值，license_plate 为空也会导致插入失败。

## 解决方案
删除旧的 license_plate 字段及其相关索引，统一使用 plate_number 字段。

## 影响
- 删除 license_plate 字段
- 删除 idx_vehicles_license_plate 索引
- 不影响现有数据（表中当前没有数据）
*/

-- 删除索引
DROP INDEX IF EXISTS idx_vehicles_license_plate;

-- 删除字段
ALTER TABLE vehicles DROP COLUMN IF EXISTS license_plate;

-- 为 plate_number 添加索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);

-- 添加注释
COMMENT ON COLUMN vehicles.plate_number IS '车牌号码';
