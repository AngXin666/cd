/*
# 为仓库表添加每日指标字段

## 1. 表结构变更

### warehouses 表
- 添加 `daily_target` (integer, 可选) - 每日指标数，表示该仓库的司机每天需要完成的件数目标

## 2. 说明
- 该字段为可选字段，允许为 NULL
- 用于设置该仓库司机的每日工作量目标
- 如果不设置，则不进行目标考核

*/

-- 为仓库表添加每日指标字段
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS daily_target integer;

-- 添加注释
COMMENT ON COLUMN warehouses.daily_target IS '每日指标数（件），司机每天需要完成的件数目标';
