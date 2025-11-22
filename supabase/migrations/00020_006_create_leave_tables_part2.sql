-- 计算请假天数函数
CREATE OR REPLACE FUNCTION calculate_leave_days(
  start_date_param date,
  end_date_param date
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (end_date_param - start_date_param) + 1;
END;
$$;

-- 自动计算请假天数触发器
CREATE OR REPLACE FUNCTION auto_calculate_leave_days()
RETURNS TRIGGER AS $$
BEGIN
  NEW.days := calculate_leave_days(NEW.start_date, NEW.end_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_leave_days ON leave_applications;
CREATE TRIGGER trigger_auto_calculate_leave_days
  BEFORE INSERT OR UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_leave_days();

-- 检查用户是否在请假期间函数
CREATE OR REPLACE FUNCTION is_user_on_leave(
  user_id_param uuid,
  check_date date DEFAULT CURRENT_DATE
)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM leave_applications
    WHERE user_id = user_id_param
      AND status = 'approved'::application_status
      AND start_date <= check_date
      AND end_date >= check_date
  );
$$;