/*
# 创建计件相关表

## 说明
创建计件管理相关的表，包括计件记录表和价格分类表。

## 表结构

### 1. piece_work_records（计件记录表）
记录司机的计件工作。

**字段说明**：
- id (uuid, PK): 记录ID
- user_id (uuid, FK): 用户ID，关联 profiles.id
- warehouse_id (uuid, FK): 仓库ID，关联 warehouses.id
- category_id (uuid, FK): 分类ID，关联 category_prices.id
- work_date (date): 工作日期
- quantity (integer): 数量
- unit_price (numeric): 单价
- total_amount (numeric): 总金额
- need_upstairs (boolean): 是否需要上楼
- upstairs_price (numeric): 上楼费单价
- need_sorting (boolean): 是否需要分拣
- sorting_quantity (integer): 分拣数量
- sorting_unit_price (numeric): 分拣单价
- notes (text): 备注
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

**约束**：
- quantity 必须为正数
- 所有价格字段必须为非负数

### 2. category_prices（价格分类表）
定义每个仓库的计件价格分类。

**字段说明**：
- id (uuid, PK): 分类ID
- warehouse_id (uuid, FK): 仓库ID，关联 warehouses.id
- category_name (text): 分类名称
- unit_price (numeric): 单价
- upstairs_price (numeric): 上楼费单价
- sorting_unit_price (numeric): 分拣单价
- is_active (boolean): 是否启用
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

**约束**：
- 同一仓库的分类名称唯一
- 所有价格必须为非负数

## 安全策略
- 两个表都启用 RLS
- 司机只能查看和创建自己的计件记录
- 管理员可以查看和管理自己负责仓库的计件记录
- 超级管理员可以查看和管理所有计件记录
*/

-- ============================================
-- 创建 category_prices 表
-- ============================================
CREATE TABLE IF NOT EXISTS category_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  upstairs_price numeric(10,2) DEFAULT 0 NOT NULL,
  sorting_unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(warehouse_id, category_name),
  CONSTRAINT unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT upstairs_price_non_negative CHECK (upstairs_price >= 0),
  CONSTRAINT sorting_unit_price_non_negative CHECK (sorting_unit_price >= 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_category_prices_warehouse_id ON category_prices(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_category_prices_is_active ON category_prices(is_active);

-- 为 category_prices 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_category_prices_updated_at ON category_prices;
CREATE TRIGGER update_category_prices_updated_at
  BEFORE UPDATE ON category_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 创建 piece_work_records 表
-- ============================================
CREATE TABLE IF NOT EXISTS piece_work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES category_prices(id) ON DELETE SET NULL,
  work_date date NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  need_upstairs boolean DEFAULT false NOT NULL,
  upstairs_price numeric(10,2) DEFAULT 0 NOT NULL,
  need_sorting boolean DEFAULT false NOT NULL,
  sorting_quantity integer DEFAULT 0 NOT NULL,
  sorting_unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT total_amount_non_negative CHECK (total_amount >= 0),
  CONSTRAINT upstairs_price_non_negative CHECK (upstairs_price >= 0),
  CONSTRAINT sorting_quantity_non_negative CHECK (sorting_quantity >= 0),
  CONSTRAINT sorting_unit_price_non_negative CHECK (sorting_unit_price >= 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_id ON piece_work_records(user_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_warehouse_id ON piece_work_records(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_category_id ON piece_work_records(category_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_work_date ON piece_work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_date ON piece_work_records(user_id, work_date);

-- 为 piece_work_records 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_piece_work_records_updated_at ON piece_work_records;
CREATE TRIGGER update_piece_work_records_updated_at
  BEFORE UPDATE ON piece_work_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE piece_work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_prices ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 辅助函数：计算计件总金额
-- ============================================
CREATE OR REPLACE FUNCTION calculate_piece_work_amount(
  quantity_param integer,
  unit_price_param numeric,
  need_upstairs_param boolean,
  upstairs_price_param numeric,
  need_sorting_param boolean,
  sorting_quantity_param integer,
  sorting_unit_price_param numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  base_amount numeric;
  upstairs_amount numeric;
  sorting_amount numeric;
  total numeric;
BEGIN
  -- 基础金额
  base_amount := quantity_param * unit_price_param;
  
  -- 上楼费
  upstairs_amount := CASE 
    WHEN need_upstairs_param THEN quantity_param * upstairs_price_param
    ELSE 0
  END;
  
  -- 分拣费
  sorting_amount := CASE 
    WHEN need_sorting_param THEN sorting_quantity_param * sorting_unit_price_param
    ELSE 0
  END;
  
  -- 总金额
  total := base_amount + upstairs_amount + sorting_amount;
  
  RETURN ROUND(total, 2);
END;
$$;

-- ============================================
-- 触发器：自动计算总金额
-- ============================================
CREATE OR REPLACE FUNCTION auto_calculate_piece_work_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := calculate_piece_work_amount(
    NEW.quantity,
    NEW.unit_price,
    NEW.need_upstairs,
    NEW.upstairs_price,
    NEW.need_sorting,
    NEW.sorting_quantity,
    NEW.sorting_unit_price
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_piece_work_amount ON piece_work_records;
CREATE TRIGGER trigger_auto_calculate_piece_work_amount
  BEFORE INSERT OR UPDATE ON piece_work_records
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_piece_work_amount();
