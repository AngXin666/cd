/*
# 为品类价格表添加司机类型单价字段

## 功能说明
为 category_prices 表添加两个新字段，用于区分纯司机和带车司机的单价：
- driver_only_price: 纯司机单价
- driver_with_vehicle_price: 带车司机单价

## 变更内容
1. 添加 driver_only_price 字段（纯司机单价）
2. 添加 driver_with_vehicle_price 字段（带车司机单价）
3. 添加非负约束检查

## 注意事项
- 默认值为 0
- 允许为 NULL（向后兼容）
- 添加非负约束
*/

-- 添加纯司机单价字段
ALTER TABLE category_prices 
ADD COLUMN IF NOT EXISTS driver_only_price numeric(10,2) DEFAULT 0;

-- 添加带车司机单价字段
ALTER TABLE category_prices 
ADD COLUMN IF NOT EXISTS driver_with_vehicle_price numeric(10,2) DEFAULT 0;

-- 添加非负约束
ALTER TABLE category_prices 
ADD CONSTRAINT driver_only_price_non_negative CHECK (driver_only_price >= 0);

ALTER TABLE category_prices 
ADD CONSTRAINT driver_with_vehicle_price_non_negative CHECK (driver_with_vehicle_price >= 0);

-- 添加注释
COMMENT ON COLUMN category_prices.driver_only_price IS '纯司机单价';
COMMENT ON COLUMN category_prices.driver_with_vehicle_price IS '带车司机单价';