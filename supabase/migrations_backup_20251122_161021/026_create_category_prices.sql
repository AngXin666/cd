/*
# 创建品类价格配置表

## 功能说明
为不同仓库的不同品类设置不同的价格，支持区分纯司机和带车司机的价格。

## 1. 新增表
- `category_prices` - 品类价格配置表
  - `id` (uuid, 主键)
  - `warehouse_id` (uuid, 外键 → warehouses)
  - `category_id` (uuid, 外键 → piece_work_categories)
  - `driver_price` (numeric, 纯司机单价)
  - `driver_with_vehicle_price` (numeric, 带车司机单价)
  - `created_at` (timestamptz, 创建时间)
  - `updated_at` (timestamptz, 更新时间)
  - 唯一约束：(warehouse_id, category_id)

## 2. 安全策略
- 超级管理员：完全访问权限
- 普通管理员：只能访问其管辖仓库的价格配置

## 3. 注意事项
- 每个仓库的每个品类只能有一条价格配置记录
- 价格可以为 0，表示该品类在该仓库不计费
- 纯司机和带车司机的价格可以不同
*/

-- 创建品类价格配置表
CREATE TABLE IF NOT EXISTS category_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES piece_work_categories(id) ON DELETE CASCADE,
  driver_price numeric(10, 2) NOT NULL DEFAULT 0,
  driver_with_vehicle_price numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, category_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_category_prices_warehouse_id ON category_prices(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_category_prices_category_id ON category_prices(category_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_category_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_prices_updated_at
  BEFORE UPDATE ON category_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_category_prices_updated_at();

-- 启用行级安全
ALTER TABLE category_prices ENABLE ROW LEVEL SECURITY;

-- 超级管理员可以管理所有价格配置
CREATE POLICY "超级管理员可以管理所有价格配置" ON category_prices
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

-- 普通管理员可以查看其管辖仓库的价格配置
CREATE POLICY "管理员可以查看管辖仓库的价格配置" ON category_prices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM manager_warehouses mw
      WHERE mw.manager_id = auth.uid()
      AND mw.warehouse_id = category_prices.warehouse_id
    )
  );

-- 有权限的管理员可以修改其管辖仓库的价格配置
CREATE POLICY "有权限的管理员可以修改管辖仓库的价格配置" ON category_prices
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM manager_warehouses mw
      INNER JOIN manager_permissions mp ON mp.manager_id = mw.manager_id
      WHERE mw.manager_id = auth.uid()
      AND mw.warehouse_id = category_prices.warehouse_id
      AND mp.can_manage_categories = true
    )
  );

-- 司机可以查看其所属仓库的价格配置（用于计件录入时显示价格）
CREATE POLICY "司机可以查看所属仓库的价格配置" ON category_prices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_warehouses dw
      WHERE dw.driver_id = auth.uid()
      AND dw.warehouse_id = category_prices.warehouse_id
    )
  );
