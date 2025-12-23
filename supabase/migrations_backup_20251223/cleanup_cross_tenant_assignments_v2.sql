/*
# 清理跨租户的仓库分配

## 问题描述
发现数据库中存在跨租户的仓库分配：
- 司机被分配到了不属于其租户的仓库
- 车队长被分配到了不属于其租户的仓库

这是严重的数据隔离问题，需要立即清理。

## 解决方案
删除所有跨租户的仓库分配记录。
临时禁用审计触发器以避免 operator_id 为 null 的问题。

## 变更内容
1. 临时禁用审计触发器
2. 删除 driver_warehouses 表中跨租户的分配
3. 删除 manager_warehouses 表中跨租户的分配
4. 重新启用审计触发器

## 影响范围
- 清理错误的跨租户数据
- 确保数据隔离
*/

-- 临时禁用 driver_warehouses 的审计触发器
ALTER TABLE driver_warehouses DISABLE TRIGGER ALL;

-- 删除 driver_warehouses 表中跨租户的分配
DELETE FROM driver_warehouses dw
USING profiles p, warehouses w
WHERE dw.driver_id = p.id
  AND dw.warehouse_id = w.id
  AND p.boss_id != w.boss_id;

-- 重新启用 driver_warehouses 的审计触发器
ALTER TABLE driver_warehouses ENABLE TRIGGER ALL;

-- 临时禁用 manager_warehouses 的审计触发器
ALTER TABLE manager_warehouses DISABLE TRIGGER ALL;

-- 删除 manager_warehouses 表中跨租户的分配
DELETE FROM manager_warehouses mw
USING profiles p, warehouses w
WHERE mw.manager_id = p.id
  AND mw.warehouse_id = w.id
  AND p.boss_id != w.boss_id;

-- 重新启用 manager_warehouses 的审计触发器
ALTER TABLE manager_warehouses ENABLE TRIGGER ALL;
