-- ============================================
-- 创建考勤规则表 attendance_rules
-- ============================================

-- 1. 创建表结构
CREATE TABLE IF NOT EXISTS public.attendance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- 上班时间配置
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- 弹性时间（分钟）
  flexible_minutes INTEGER DEFAULT 0,
  
  -- 迟到/早退阈值（分钟）
  late_threshold INTEGER DEFAULT 5,
  early_leave_threshold INTEGER DEFAULT 5,
  
  -- 工作日配置（1-7表示周一到周日）
  work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
  
  -- 是否启用
  enabled BOOLEAN DEFAULT true,
  
  -- 创建者
  created_by UUID REFERENCES auth.users(id),
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_attendance_rules_enabled ON public.attendance_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_created_by ON public.attendance_rules(created_by);

-- 3. 启用RLS
ALTER TABLE public.attendance_rules ENABLE ROW LEVEL SECURITY;

-- 4. 创建RLS策略
CREATE POLICY "允许所有认证用户查看考勤规则"
ON public.attendance_rules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "允许管理员创建考勤规则"
ON public.attendance_rules FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('BOSS', 'PEER_ADMIN', 'MANAGER')
  )
);

CREATE POLICY "允许管理员更新考勤规则"
ON public.attendance_rules FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('BOSS', 'PEER_ADMIN', 'MANAGER')
  )
);

CREATE POLICY "允许管理员删除考勤规则"
ON public.attendance_rules FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('BOSS', 'PEER_ADMIN', 'MANAGER')
  )
);

-- 5. 添加service_role访问权限
CREATE POLICY "Service role可以管理考勤规则"
ON public.attendance_rules FOR ALL
TO service_role
USING (true);

-- 6. 插入默认规则
INSERT INTO public.attendance_rules (name, description, start_time, end_time, flexible_minutes, work_days, enabled)
VALUES 
  ('标准工作制', '周一至周五 9:00-18:00', '09:00:00', '18:00:00', 30, ARRAY[1,2,3,4,5], true),
  ('弹性工作制', '周一至周五 8:00-20:00，弹性2小时', '08:00:00', '20:00:00', 120, ARRAY[1,2,3,4,5], true)
ON CONFLICT (id) DO NOTHING;

-- 7. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_attendance_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attendance_rules_updated_at
BEFORE UPDATE ON public.attendance_rules
FOR EACH ROW
EXECUTE FUNCTION update_attendance_rules_updated_at();
