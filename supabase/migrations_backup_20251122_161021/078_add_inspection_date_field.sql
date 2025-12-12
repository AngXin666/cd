/*
# 添加年检时间字段

## 1. 新增字段说明

### 副页背页新增字段
- inspection_date: 年检时间（最近一次年检日期）

## 2. 说明
- 年检时间通常在副页背页的检验记录中
- 用于计算剩余年检时间
- 与inspection_valid_until（检验有效期）配合使用

## 3. 安全策略
- 保持现有RLS策略不变
*/

-- 添加年检时间字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS inspection_date DATE;

-- 添加字段注释
COMMENT ON COLUMN vehicles.inspection_date IS '年检时间（最近一次年检日期）';
