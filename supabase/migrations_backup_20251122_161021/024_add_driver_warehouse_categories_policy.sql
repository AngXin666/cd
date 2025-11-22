/*
# 添加司机查看仓库品类的权限

## 问题描述
司机端选择仓库后无法看到品类，因为 warehouse_categories 表缺少司机的查询权限策略。

## 解决方案
添加新的 RLS 策略，允许司机查看自己所在仓库的品类配置。

## 策略详情
- 表：warehouse_categories
- 操作：SELECT（只读）
- 条件：司机只能查看自己被分配的仓库的品类配置
- 实现：通过 driver_warehouses 表关联验证
*/

-- 添加司机查看自己仓库品类的策略
CREATE POLICY "Drivers can view own warehouse categories" ON warehouse_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM driver_warehouses dw
      WHERE dw.driver_id = auth.uid()
      AND dw.warehouse_id = warehouse_categories.warehouse_id
    )
  );
