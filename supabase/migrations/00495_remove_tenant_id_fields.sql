/*
# 移除多租户遗留字段

## 背景
系统已从多租户架构迁移到单用户架构，但部分表仍保留 tenant_id 字段。
本迁移将清理所有遗留的 tenant_id 字段。

## 影响的表
1. attendance - 考勤表
2. leave_applications - 请假申请表
3. piece_work_records - 计件工作记录表
4. vehicles - 车辆表
5. warehouses - 仓库表

## 操作
- 删除所有表的 tenant_id 字段
- 使用 IF EXISTS 确保安全执行

## 注意事项
- 此操作不可逆，请确保已备份数据
- 删除字段前请确认没有代码使用 tenant_id
*/

-- 1. 删除 attendance 表的 tenant_id
ALTER TABLE attendance DROP COLUMN IF EXISTS tenant_id;

-- 2. 删除 leave_applications 表的 tenant_id
ALTER TABLE leave_applications DROP COLUMN IF EXISTS tenant_id;

-- 3. 删除 piece_work_records 表的 tenant_id
ALTER TABLE piece_work_records DROP COLUMN IF EXISTS tenant_id;

-- 4. 删除 vehicles 表的 tenant_id
ALTER TABLE vehicles DROP COLUMN IF EXISTS tenant_id;

-- 5. 删除 warehouses 表的 tenant_id
ALTER TABLE warehouses DROP COLUMN IF EXISTS tenant_id;