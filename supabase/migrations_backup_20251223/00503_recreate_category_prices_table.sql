/*
# 重新创建品类价格表

## 问题描述
- 在单用户系统迁移过程中，`category_prices` 表被删除
- 但代码中仍在使用这个表来存储品类价格配置
- 导致所有与品类价格相关的功能失效

## 表结构说明
- `category_prices` 表用于存储不同品类的价格配置
- 支持按仓库配置不同的价格
- 包含多种价格类型：基础单价、上楼价、分拣单价、司机单价等

## 字段说明
1. `id` - 主键，UUID
2. `category_name` - 品类名称
3. `warehouse_id` - 仓库ID（可选，NULL 表示全局配置）
4. `unit_price` - 基础单价
5. `upstairs_price` - 上楼价格
6. `sorting_unit_price` - 分拣单价
7. `driver_only_price` - 司机单价（仅司机）
8. `driver_with_vehicle_price` - 司机单价（带车）
9. `is_active` - 是否启用
10. `created_at` - 创建时间
11. `updated_at` - 更新时间

## RLS 策略
- 管理员（BOSS/MANAGER）可以查看、创建、更新、删除所有品类价格
- 司机可以查看品类价格，不能修改
*/

-- 创建品类价格表
CREATE TABLE IF NOT EXISTS category_prices (
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_category_prices_warehouse_id ON category_prices(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_category_prices_category_name ON category_prices(category_name);
CREATE INDEX IF NOT EXISTS idx_category_prices_is_active ON category_prices(is_active);

-- 创建更新时间触发器
CREATE TRIGGER update_category_prices_updated_at
  BEFORE UPDATE ON category_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 启用 RLS
ALTER TABLE category_prices ENABLE ROW LEVEL SECURITY;

-- RLS 策略：管理员可以查看所有品类价格
CREATE POLICY "管理员可以查看所有品类价格" ON category_prices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- RLS 策略：管理员可以创建品类价格
CREATE POLICY "管理员可以创建品类价格" ON category_prices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- RLS 策略：管理员可以更新品类价格
CREATE POLICY "管理员可以更新品类价格" ON category_prices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- RLS 策略：管理员可以删除品类价格
CREATE POLICY "管理员可以删除品类价格" ON category_prices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- RLS 策略：司机可以查看品类价格
CREATE POLICY "司机可以查看品类价格" ON category_prices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'DRIVER'::user_role
    )
  );