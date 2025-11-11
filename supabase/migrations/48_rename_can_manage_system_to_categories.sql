/*
# 重命名权限字段：can_manage_system -> can_manage_categories

## 变更说明
将 manager_permissions 表中的 can_manage_system 字段重命名为 can_manage_categories，
使权限名称更加明确，表示管理员是否可以管理计件品类。

## 变更内容
1. 重命名字段：can_manage_system -> can_manage_categories
2. 更新注释说明

## 影响范围
- manager_permissions 表结构
- 所有依赖该字段的查询和应用代码
*/

-- 重命名字段
ALTER TABLE manager_permissions 
RENAME COLUMN can_manage_system TO can_manage_categories;

-- 更新字段注释
COMMENT ON COLUMN manager_permissions.can_manage_categories IS '品类管理权限：控制管理员是否可以管理计件品类';
