/*
# 修改 vehicles 表的 warehouse_id 字段为可空

## 问题
- vehicles 表的 warehouse_id 字段当前是 NOT NULL
- 但司机添加车辆时可能还没有分配仓库
- 导致插入车辆时报错：null value in column "warehouse_id" violates not-null constraint

## 解决方案
- 将 warehouse_id 字段改为可空（NULLABLE）
- 允许司机先添加车辆，后续再由管理员分配仓库

## 修改内容
1. 修改 warehouse_id 字段约束为可空
*/

-- 修改 warehouse_id 字段为可空
ALTER TABLE vehicles ALTER COLUMN warehouse_id DROP NOT NULL;
