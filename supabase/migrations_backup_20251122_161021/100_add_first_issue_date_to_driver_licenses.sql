/*
# 添加初次领证日期字段到driver_licenses表

## 变更说明
为driver_licenses表添加first_issue_date字段，用于存储驾驶证的初次领证日期，以便计算驾龄。

## 新增字段
- `first_issue_date` (DATE) - 初次领证日期

## 注意事项
- 该字段为可选字段，允许为NULL
- 用于计算驾龄（当前年份 - 初次领证年份）
*/

-- 添加初次领证日期字段
ALTER TABLE driver_licenses 
ADD COLUMN IF NOT EXISTS first_issue_date DATE;

-- 添加注释
COMMENT ON COLUMN driver_licenses.first_issue_date IS '初次领证日期，用于计算驾龄';
