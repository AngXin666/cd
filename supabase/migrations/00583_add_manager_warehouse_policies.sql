/*
# 添加车队长查看和管理仓库的权限策略

## 说明
- 车队长（MANAGER）应该能够查看和管理分配给他们的仓库
- 根据权限级别，车队长可能有不同的权限：
  - 仅查看权：只能查看分配的仓库
  - 完整控制权：可以管理分配的仓库

## 变更内容
1. 添加策略：车队长（仅查看权）可以查看分配的仓库
2. 添加策略：车队长（完整控制权）可以查看分配的仓库
3. 添加策略：车队长（完整控制权）可以管理分配的仓库

## 注意事项
- 使用 manager_is_view_only() 和 manager_has_full_control() 函数检查权限
- 车队长只能访问通过 warehouse_assignments 表分配给他们的仓库
*/

-- 添加车队长（仅查看权）查看分配仓库的策略
CREATE POLICY "车队长（仅查看权）可以查看分配的仓库"
ON warehouses
FOR SELECT
TO public
USING (
  manager_is_view_only(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.warehouse_id = warehouses.id
      AND wa.user_id = auth.uid()
  )
);

-- 添加车队长（完整控制权）查看分配仓库的策略
CREATE POLICY "车队长（完整控制权）可以查看分配的仓库"
ON warehouses
FOR SELECT
TO public
USING (
  manager_has_full_control(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.warehouse_id = warehouses.id
      AND wa.user_id = auth.uid()
  )
);

-- 添加车队长（完整控制权）管理分配仓库的策略
CREATE POLICY "车队长（完整控制权）可以管理分配的仓库"
ON warehouses
FOR ALL
TO public
USING (
  manager_has_full_control(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.warehouse_id = warehouses.id
      AND wa.user_id = auth.uid()
  )
)
WITH CHECK (
  manager_has_full_control(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.warehouse_id = warehouses.id
      AND wa.user_id = auth.uid()
  )
);