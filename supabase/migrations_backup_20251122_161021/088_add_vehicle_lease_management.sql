/*
# 车辆租赁管理功能

## 1. 功能说明
为vehicles_base表添加租赁管理相关字段，支持：
- 车辆归属管理（公司车/个人车）
- 租赁方信息管理
- 承租方信息管理
- 租金和租期管理
- 自动计算租金缴纳时间

## 2. 新增字段

### vehicles_base 表扩展字段
- `ownership_type` (text) - 车辆归属类型：company(公司车) / personal(个人车)
- `lessor_name` (text) - 租赁方名称（出租车辆的公司或个人）
- `lessor_contact` (text) - 租赁方联系方式
- `lessee_name` (text) - 承租方名称（租用车辆的公司或个人）
- `lessee_contact` (text) - 承租方联系方式
- `monthly_rent` (numeric) - 月租金（元）
- `lease_start_date` (date) - 租赁开始日期
- `lease_end_date` (date) - 租赁结束日期
- `rent_payment_day` (integer) - 每月租金缴纳日（1-31）

## 3. 租金缴纳时间计算规则
- 根据lease_start_date自动确定rent_payment_day
- 例如：租赁开始日期为2025-01-15，则rent_payment_day为15
- 每月的15号为租金缴纳截止日期

## 4. 安全策略
- 禁用RLS（根据项目现有策略）
*/

-- ============================================
-- 1. 添加租赁管理相关字段到 vehicles_base 表
-- ============================================

-- 车辆归属类型
ALTER TABLE vehicles_base 
ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'company' CHECK (ownership_type IN ('company', 'personal'));

-- 租赁方信息
ALTER TABLE vehicles_base 
ADD COLUMN IF NOT EXISTS lessor_name TEXT;

ALTER TABLE vehicles_base 
ADD COLUMN IF NOT EXISTS lessor_contact TEXT;

-- 承租方信息
ALTER TABLE vehicles_base 
ADD COLUMN IF NOT EXISTS lessee_name TEXT;

ALTER TABLE vehicles_base 
ADD COLUMN IF NOT EXISTS lessee_contact TEXT;

-- 租金信息
ALTER TABLE vehicles_base 
ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(10, 2) DEFAULT 0;

-- 租期信息
ALTER TABLE vehicles_base 
ADD COLUMN IF NOT EXISTS lease_start_date DATE;

ALTER TABLE vehicles_base 
ADD COLUMN IF NOT EXISTS lease_end_date DATE;

-- 每月租金缴纳日（1-31）
ALTER TABLE vehicles_base 
ADD COLUMN IF NOT EXISTS rent_payment_day INTEGER CHECK (rent_payment_day >= 1 AND rent_payment_day <= 31);

-- ============================================
-- 2. 创建辅助函数：计算下一个租金缴纳日期
-- ============================================

CREATE OR REPLACE FUNCTION calculate_next_rent_payment_date(
  p_lease_start_date DATE,
  p_rent_payment_day INTEGER
) RETURNS DATE AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_current_month_payment_date DATE;
  v_next_month_payment_date DATE;
BEGIN
  -- 如果租赁开始日期为空或租金缴纳日为空，返回NULL
  IF p_lease_start_date IS NULL OR p_rent_payment_day IS NULL THEN
    RETURN NULL;
  END IF;

  -- 计算当月的缴纳日期
  v_current_month_payment_date := DATE_TRUNC('month', v_today) + (p_rent_payment_day - 1) * INTERVAL '1 day';
  
  -- 如果当月的缴纳日期还未到，返回当月的缴纳日期
  IF v_current_month_payment_date >= v_today THEN
    RETURN v_current_month_payment_date;
  END IF;
  
  -- 否则返回下个月的缴纳日期
  v_next_month_payment_date := DATE_TRUNC('month', v_today) + INTERVAL '1 month' + (p_rent_payment_day - 1) * INTERVAL '1 day';
  RETURN v_next_month_payment_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 3. 创建视图：车辆租赁信息视图（包含下次缴纳日期）
-- ============================================

CREATE OR REPLACE VIEW vehicle_lease_info AS
SELECT 
  vb.id,
  vb.plate_number,
  vb.brand,
  vb.model,
  vb.vehicle_type,
  vb.ownership_type,
  vb.lessor_name,
  vb.lessor_contact,
  vb.lessee_name,
  vb.lessee_contact,
  vb.monthly_rent,
  vb.lease_start_date,
  vb.lease_end_date,
  vb.rent_payment_day,
  -- 计算下一个租金缴纳日期
  calculate_next_rent_payment_date(vb.lease_start_date, vb.rent_payment_day) AS next_payment_date,
  -- 判断租赁是否有效（在租期内）
  CASE 
    WHEN vb.lease_start_date IS NOT NULL 
      AND vb.lease_end_date IS NOT NULL 
      AND CURRENT_DATE BETWEEN vb.lease_start_date AND vb.lease_end_date 
    THEN true
    ELSE false
  END AS is_lease_active,
  vb.created_at,
  vb.updated_at
FROM vehicles_base vb;

-- ============================================
-- 4. 创建触发器：自动设置租金缴纳日
-- ============================================

CREATE OR REPLACE FUNCTION set_rent_payment_day()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果租赁开始日期有值，且租金缴纳日为空，自动设置为开始日期的日
  IF NEW.lease_start_date IS NOT NULL AND NEW.rent_payment_day IS NULL THEN
    NEW.rent_payment_day := EXTRACT(DAY FROM NEW.lease_start_date)::INTEGER;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_rent_payment_day ON vehicles_base;
CREATE TRIGGER trigger_set_rent_payment_day
  BEFORE INSERT OR UPDATE ON vehicles_base
  FOR EACH ROW
  EXECUTE FUNCTION set_rent_payment_day();

-- ============================================
-- 5. 添加注释
-- ============================================

COMMENT ON COLUMN vehicles_base.ownership_type IS '车辆归属类型：company(公司车) / personal(个人车)';
COMMENT ON COLUMN vehicles_base.lessor_name IS '租赁方名称（出租车辆的公司或个人）';
COMMENT ON COLUMN vehicles_base.lessor_contact IS '租赁方联系方式';
COMMENT ON COLUMN vehicles_base.lessee_name IS '承租方名称（租用车辆的公司或个人）';
COMMENT ON COLUMN vehicles_base.lessee_contact IS '承租方联系方式';
COMMENT ON COLUMN vehicles_base.monthly_rent IS '月租金（元）';
COMMENT ON COLUMN vehicles_base.lease_start_date IS '租赁开始日期';
COMMENT ON COLUMN vehicles_base.lease_end_date IS '租赁结束日期';
COMMENT ON COLUMN vehicles_base.rent_payment_day IS '每月租金缴纳日（1-31）';
