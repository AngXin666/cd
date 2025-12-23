/*
# 添加车损照片字段

## 背景
代码中使用了 damage_photos 字段来存储车损特写照片，但数据库表中缺少此字段。

## 新增字段
- damage_photos (text[]) - 车损特写照片URL数组
*/

-- 添加车损照片字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS damage_photos text[];

-- 添加注释
COMMENT ON COLUMN vehicles.damage_photos IS '车损特写照片URL数组';
