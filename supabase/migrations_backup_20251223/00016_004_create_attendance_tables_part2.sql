-- 计算工作时长函数
CREATE OR REPLACE FUNCTION calculate_work_hours(
  clock_in timestamptz,
  clock_out timestamptz
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  IF clock_out IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600, 2);
END;
$$;

-- 自动计算工作时长触发器
CREATE OR REPLACE FUNCTION auto_calculate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL THEN
    NEW.work_hours := calculate_work_hours(NEW.clock_in_time, NEW.clock_out_time);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_work_hours ON attendance;
CREATE TRIGGER trigger_auto_calculate_work_hours
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_work_hours();

-- 判断考勤状态函数
CREATE OR REPLACE FUNCTION determine_attendance_status(
  warehouse_id_param uuid,
  clock_in_time_param timestamptz
)
RETURNS attendance_status
LANGUAGE plpgsql
AS $$
DECLARE
  rule_record RECORD;
  clock_in_time_only time;
  late_minutes integer;
BEGIN
  SELECT * INTO rule_record
  FROM attendance_rules
  WHERE warehouse_id = warehouse_id_param AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN 'normal'::attendance_status;
  END IF;
  
  clock_in_time_only := clock_in_time_param::time;
  late_minutes := EXTRACT(EPOCH FROM (clock_in_time_only - rule_record.work_start_time)) / 60;
  
  IF late_minutes > rule_record.late_threshold THEN
    RETURN 'late'::attendance_status;
  ELSE
    RETURN 'normal'::attendance_status;
  END IF;
END;
$$;