-- ============================================================================
-- 修复 category_prices 表
-- ============================================================================
-- 说明：由于表被删除，需要重新创建。此脚本会安全地检查表是否存在并创建。
-- ============================================================================

-- 1. 删除旧表（如果存在但结构不对）
DROP TABLE IF EXISTS category_prices CASCADE;

-- 2. 重新创建 category_prices 表
CREATE TABLE category_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL,                    -- 品类名称
  warehouse_id UUID,                              -- 仓库ID（NULL 表示全局配置）
  unit_price NUMERIC(10, 2) DEFAULT 0 NOT NULL,   -- 基础单价
  upstairs_price NUMERIC(10, 2) DEFAULT 0,        -- 上楼价格
  sorting_unit_price NUMERIC(10, 2) DEFAULT 0,    -- 分拣单价
  driver_only_price NUMERIC(10, 2) DEFAULT 0,     -- 司机单价（仅司机）
  driver_with_vehicle_price NUMERIC(10, 2) DEFAULT 0, -- 司机单价（带车）
  is_active BOOLEAN DEFAULT true NOT NULL,        -- 是否启用
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 约束：同一仓库的同一品类只能有一条配置
  CONSTRAINT unique_category_warehouse UNIQUE (category_name, warehouse_id)
);

-- 3. 创建索引
CREATE INDEX idx_category_prices_warehouse_id ON category_prices(warehouse_id);
CREATE INDEX idx_category_prices_category_name ON category_prices(category_name);
CREATE INDEX idx_category_prices_is_active ON category_prices(is_active);

-- 4. 创建更新时间触发器
DROP TRIGGER IF EXISTS update_category_prices_updated_at ON category_prices;
CREATE TRIGGER update_category_prices_updated_at
  BEFORE UPDATE ON category_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. 启用 RLS
ALTER TABLE category_prices ENABLE ROW LEVEL SECURITY;

-- 6. 删除旧的 RLS 策略
DROP POLICY IF EXISTS "管理员可以查看所有品类价格" ON category_prices;
DROP POLICY IF EXISTS "管理员可以创建品类价格" ON category_prices;
DROP POLICY IF EXISTS "管理员可以更新品类价格" ON category_prices;
DROP POLICY IF EXISTS "管理员可以删除品类价格" ON category_prices;
DROP POLICY IF EXISTS "司机可以查看品类价格" ON category_prices;
DROP POLICY IF EXISTS "All authenticated users can view category prices" ON category_prices;
DROP POLICY IF EXISTS "Admins can manage category prices" ON category_prices;

-- 7. 创建 RLS 策略：所有认证用户可以查看品类价格
CREATE POLICY "All authenticated users can view category prices"
  ON category_prices
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 8. 创建 RLS 策略：管理员可以管理品类价格
CREATE POLICY "Admins can manage category prices"
  ON category_prices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- 9. 添加表注释
COMMENT ON TABLE category_prices IS '品类价格配置表：存储不同仓库的品类价格设置';
COMMENT ON COLUMN category_prices.category_name IS '品类名称';
COMMENT ON COLUMN category_prices.warehouse_id IS '仓库ID，NULL 表示全局配置';
COMMENT ON COLUMN category_prices.unit_price IS '基础单价';
COMMENT ON COLUMN category_prices.upstairs_price IS '上楼价格';
COMMENT ON COLUMN category_prices.sorting_unit_price IS '分拣单价';
COMMENT ON COLUMN category_prices.driver_only_price IS '纯司机单价';
COMMENT ON COLUMN category_prices.driver_with_vehicle_price IS '带车司机单价';
COMMENT ON COLUMN category_prices.is_active IS '是否启用';

-- 10. 插入一些测试数据（可选，根据实际情况调整）
-- 注意：这里需要确保 warehouses 表中存在对应的仓库ID
-- INSERT INTO category_prices (category_name, warehouse_id, unit_price, upstairs_price, sorting_unit_price, driver_only_price, driver_with_vehicle_price, is_active)
-- SELECT '家电', id, 50.00, 10.00, 5.00, 45.00, 55.00, true
-- FROM warehouses
-- WHERE is_active = true
-- LIMIT 1
-- ON CONFLICT (category_name, warehouse_id) DO NOTHING;

-- 完成
SELECT 'category_prices 表已成功创建' AS status;
