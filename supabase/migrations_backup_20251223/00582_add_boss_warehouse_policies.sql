/*
# 添加老板查看和管理仓库的权限策略

## 说明
- 老板（BOSS）应该能够查看和管理所有仓库
- 添加 SELECT 和 ALL 权限策略

## 变更内容
1. 添加策略：老板可以查看所有仓库
2. 添加策略：老板可以管理所有仓库（增删改）

## 注意事项
- 使用 is_boss() 函数检查用户是否为老板角色
*/

-- 添加老板查看所有仓库的策略
CREATE POLICY "老板可以查看所有仓库"
ON warehouses
FOR SELECT
TO public
USING (is_boss(auth.uid()));

-- 添加老板管理所有仓库的策略
CREATE POLICY "老板可以管理所有仓库"
ON warehouses
FOR ALL
TO public
USING (is_boss(auth.uid()))
WITH CHECK (is_boss(auth.uid()));