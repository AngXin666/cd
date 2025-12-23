/*
# 合并 warehouses 和 new_warehouses 表

## 问题
系统中存在两个仓库表：
- warehouses：包含业务配置字段（is_active, max_leave_days, resignation_notice_days, daily_target）
- new_warehouses：包含基础信息字段（address, contact_person, contact_phone）
- warehouse_assignments 表引用 new_warehouses
- 但代码中很多地方使用 warehouses 表
- 两个表数据不同步，导致司机端读取不到正确的仓库信息

## 解决方案
1. 将 warehouses 表的业务字段添加到 new_warehouses 表
2. 将 warehouses 表的数据迁移到 new_warehouses 表
3. 删除 warehouses 表
4. 将 new_warehouses 表重命名为 warehouses

## 影响
- 所有引用 warehouses 表的代码将正常工作
- warehouse_assignments 表的外键将指向正确的 warehouses 表
*/

-- 1. 为 new_warehouses 表添加业务字段
ALTER TABLE new_warehouses 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_leave_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS resignation_notice_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS daily_target INTEGER DEFAULT 100;

-- 2. 将 warehouses 表的数据迁移到 new_warehouses 表
UPDATE new_warehouses nw
SET 
  is_active = w.is_active,
  max_leave_days = w.max_leave_days,
  resignation_notice_days = w.resignation_notice_days,
  daily_target = w.daily_target,
  name = w.name,
  updated_at = NOW()
FROM warehouses w
WHERE nw.id = w.id;

-- 3. 删除旧的 warehouses 表
DROP TABLE IF EXISTS warehouses CASCADE;

-- 4. 将 new_warehouses 表重命名为 warehouses
ALTER TABLE new_warehouses RENAME TO warehouses;

-- 5. 更新 warehouse_assignments 表的外键约束名称
ALTER TABLE warehouse_assignments 
DROP CONSTRAINT IF EXISTS warehouse_assignments_warehouse_id_fkey;

ALTER TABLE warehouse_assignments 
ADD CONSTRAINT warehouse_assignments_warehouse_id_fkey 
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;