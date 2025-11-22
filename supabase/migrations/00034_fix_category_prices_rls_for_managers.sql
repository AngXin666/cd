/*
# 修复品类价格表的 RLS 策略 - 允许管理员管理

## 问题
当前 category_prices 表只允许超级管理员（super_admin）进行插入、更新、删除操作。
普通管理员（manager）无法创建或修改品类价格配置。

## 解决方案
添加新的 RLS 策略，允许管理员管理其负责仓库的品类价格。

## 新增策略
1. 管理员可以为其负责的仓库创建品类价格
2. 管理员可以更新其负责仓库的品类价格
3. 管理员可以删除其负责仓库的品类价格

## 权限说明
- 超级管理员：可以管理所有仓库的品类价格（已有策略）
- 普通管理员：只能管理其负责仓库的品类价格（新增策略）
- 司机：只能查看品类价格（已有策略）
*/

-- 管理员可以为其负责的仓库插入品类价格
DROP POLICY IF EXISTS "Managers can insert category prices for their warehouses" ON category_prices;
CREATE POLICY "Managers can insert category prices for their warehouses"
ON category_prices FOR INSERT
TO authenticated
WITH CHECK (
  is_manager(auth.uid()) 
  AND warehouse_id IN (
    SELECT warehouse_id 
    FROM manager_warehouses 
    WHERE user_id = auth.uid()
  )
);

-- 管理员可以更新其负责仓库的品类价格
DROP POLICY IF EXISTS "Managers can update category prices for their warehouses" ON category_prices;
CREATE POLICY "Managers can update category prices for their warehouses"
ON category_prices FOR UPDATE
TO authenticated
USING (
  is_manager(auth.uid()) 
  AND warehouse_id IN (
    SELECT warehouse_id 
    FROM manager_warehouses 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  is_manager(auth.uid()) 
  AND warehouse_id IN (
    SELECT warehouse_id 
    FROM manager_warehouses 
    WHERE user_id = auth.uid()
  )
);

-- 管理员可以删除其负责仓库的品类价格
DROP POLICY IF EXISTS "Managers can delete category prices for their warehouses" ON category_prices;
CREATE POLICY "Managers can delete category prices for their warehouses"
ON category_prices FOR DELETE
TO authenticated
USING (
  is_manager(auth.uid()) 
  AND warehouse_id IN (
    SELECT warehouse_id 
    FROM manager_warehouses 
    WHERE user_id = auth.uid()
  )
);