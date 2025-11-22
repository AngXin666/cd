-- 计算计件总金额函数
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
  base_amount := quantity_param * unit_price_param;
  
  upstairs_amount := CASE 
    WHEN need_upstairs_param THEN quantity_param * upstairs_price_param
    ELSE 0
  END;
  
  sorting_amount := CASE 
    WHEN need_sorting_param THEN sorting_quantity_param * sorting_unit_price_param
    ELSE 0
  END;
  
  total := base_amount + upstairs_amount + sorting_amount;
  
  RETURN ROUND(total, 2);
END;
$$;

-- 自动计算总金额触发器
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