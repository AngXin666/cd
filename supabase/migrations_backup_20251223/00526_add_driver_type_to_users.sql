/*
# 添加司机类型字段到 users 表

## 说明
为 users 表添加 driver_type 字段，用于区分纯司机和带车司机。

## 变更内容
1. 添加 driver_type 字段（类型：driver_type，默认值：'pure'）
2. 为现有司机设置默认类型

## 注意事项
- 默认值为 'pure'（纯司机）
- 该字段仅对司机角色有意义
*/

-- 添加 driver_type 字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS driver_type driver_type DEFAULT 'pure'::driver_type;

-- 为现有司机设置默认类型（如果还没有设置）
UPDATE users 
SET driver_type = 'pure'::driver_type 
WHERE driver_type IS NULL;
