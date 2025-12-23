-- ============================================
-- 为考勤规则表添加 clock_in_time 和 clock_out_time 字段
-- 
-- 问题：代码中使用 clock_in_time 和 clock_out_time 字段，
-- 但数据库表中只有 start_time 和 end_time 字段
-- 
-- 解决方案：添加缺失的字段，并从现有字段复制数据
-- ============================================

-- 1. 添加 clock_in_time 字段
ALTER TABLE public.attendance_rules 
ADD COLUMN IF NOT EXISTS clock_in_time TIME;

-- 2. 添加 clock_out_time 字段
ALTER TABLE public.attendance_rules 
ADD COLUMN IF NOT EXISTS clock_out_time TIME;

-- 3. 添加 work_start_time 字段（代码中也使用了这个字段）
ALTER TABLE public.attendance_rules 
ADD COLUMN IF NOT EXISTS work_start_time TIME;

-- 4. 添加 work_end_time 字段（代码中也使用了这个字段）
ALTER TABLE public.attendance_rules 
ADD COLUMN IF NOT EXISTS work_end_time TIME;

-- 5. 添加 early_threshold 字段（代码中使用的名称）
ALTER TABLE public.attendance_rules 
ADD COLUMN IF NOT EXISTS early_threshold INTEGER DEFAULT 15;

-- 6. 添加 require_clock_out 字段
ALTER TABLE public.attendance_rules 
ADD COLUMN IF NOT EXISTS require_clock_out BOOLEAN DEFAULT true;

-- 7. 从现有字段复制数据到新字段
UPDATE public.attendance_rules 
SET 
  clock_in_time = COALESCE(clock_in_time, start_time),
  clock_out_time = COALESCE(clock_out_time, end_time),
  work_start_time = COALESCE(work_start_time, start_time),
  work_end_time = COALESCE(work_end_time, end_time),
  early_threshold = COALESCE(early_threshold, early_leave_threshold, 15)
WHERE clock_in_time IS NULL OR clock_out_time IS NULL;

-- 8. 添加注释
COMMENT ON COLUMN public.attendance_rules.clock_in_time IS '上班打卡时间';
COMMENT ON COLUMN public.attendance_rules.clock_out_time IS '下班打卡时间';
COMMENT ON COLUMN public.attendance_rules.work_start_time IS '工作开始时间';
COMMENT ON COLUMN public.attendance_rules.work_end_time IS '工作结束时间';
COMMENT ON COLUMN public.attendance_rules.early_threshold IS '早退阈值（分钟）';
COMMENT ON COLUMN public.attendance_rules.require_clock_out IS '是否需要下班打卡';

