-- 为考勤规则表添加warehouse_id字段

-- 1. 添加warehouse_id字段
ALTER TABLE public.attendance_rules 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_attendance_rules_warehouse_id 
ON public.attendance_rules(warehouse_id);

-- 3. 添加is_active字段（兼容现有代码）
ALTER TABLE public.attendance_rules 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. 更新现有记录的is_active为enabled的值
UPDATE public.attendance_rules 
SET is_active = enabled 
WHERE is_active IS NULL;

-- 5. 添加注释
COMMENT ON COLUMN public.attendance_rules.warehouse_id IS '关联的仓库ID，NULL表示全局规则';
COMMENT ON COLUMN public.attendance_rules.is_active IS '是否激活（兼容字段）';
