-- ============================================
-- 修复：使用正确的字段名添加缺失字段
-- ============================================
-- 基于实际表结构的字段名映射：
-- notifications: recipient_id (而非 user_id)
-- vehicles: plate_number (而非 license_plate)
-- driver_licenses: driver_id (已存在)

DO $$ 
BEGIN
  -- 1. vehicles 添加缺失的业务字段（已有：id, plate_number, driver_id, status, brand, model）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'color') THEN
    ALTER TABLE public.vehicles ADD COLUMN color TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'purchase_date') THEN
    ALTER TABLE public.vehicles ADD COLUMN purchase_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'vin') THEN
    ALTER TABLE public.vehicles ADD COLUMN vin TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'engine_number') THEN
    ALTER TABLE public.vehicles ADD COLUMN engine_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'registration_date') THEN
    ALTER TABLE public.vehicles ADD COLUMN registration_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'notes') THEN
    ALTER TABLE public.vehicles ADD COLUMN notes TEXT;
  END IF;

  -- 2. driver_licenses 添加缺失的字段（已有：driver_id, license_number等，需添加 license_type）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_licenses' AND column_name = 'license_type') THEN
    ALTER TABLE public.driver_licenses ADD COLUMN license_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_licenses' AND column_name = 'issue_date') THEN
    ALTER TABLE public.driver_licenses ADD COLUMN issue_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_licenses' AND column_name = 'expiry_date') THEN
    ALTER TABLE public.driver_licenses ADD COLUMN expiry_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_licenses' AND column_name = 'issuing_authority') THEN
    ALTER TABLE public.driver_licenses ADD COLUMN issuing_authority TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_licenses' AND column_name = 'photo_front_url') THEN
    ALTER TABLE public.driver_licenses ADD COLUMN photo_front_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_licenses' AND column_name = 'photo_back_url') THEN
    ALTER TABLE public.driver_licenses ADD COLUMN photo_back_url TEXT;
  END IF;

  -- 3. warehouse_assignments 添加 assigned_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warehouse_assignments' AND column_name = 'assigned_at') THEN
    ALTER TABLE public.warehouse_assignments ADD COLUMN assigned_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- 4. piece_work_records 添加业务字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'piece_work_records' AND column_name = 'work_date') THEN
    ALTER TABLE public.piece_work_records ADD COLUMN work_date DATE DEFAULT CURRENT_DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'piece_work_records' AND column_name = 'warehouse_id') THEN
    ALTER TABLE public.piece_work_records ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'piece_work_records' AND column_name = 'unit_price') THEN
    ALTER TABLE public.piece_work_records ADD COLUMN unit_price DECIMAL(10, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'piece_work_records' AND column_name = 'total_amount') THEN
    ALTER TABLE public.piece_work_records ADD COLUMN total_amount DECIMAL(10, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'piece_work_records' AND column_name = 'reviewed_by') THEN
    ALTER TABLE public.piece_work_records ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'piece_work_records' AND column_name = 'reviewed_at') THEN
    ALTER TABLE public.piece_work_records ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;

  -- 5. leave_applications 添加业务字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_applications' AND column_name = 'leave_type') THEN
    ALTER TABLE public.leave_applications ADD COLUMN leave_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_applications' AND column_name = 'reason') THEN
    ALTER TABLE public.leave_applications ADD COLUMN reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_applications' AND column_name = 'days_count') THEN
    ALTER TABLE public.leave_applications ADD COLUMN days_count INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_applications' AND column_name = 'approved_by') THEN
    ALTER TABLE public.leave_applications ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_applications' AND column_name = 'approved_at') THEN
    ALTER TABLE public.leave_applications ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_applications' AND column_name = 'rejected_reason') THEN
    ALTER TABLE public.leave_applications ADD COLUMN rejected_reason TEXT;
  END IF;

  -- 6. resignation_applications 添加业务字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resignation_applications' AND column_name = 'reason') THEN
    ALTER TABLE public.resignation_applications ADD COLUMN reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resignation_applications' AND column_name = 'notice_days') THEN
    ALTER TABLE public.resignation_applications ADD COLUMN notice_days INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resignation_applications' AND column_name = 'approved_by') THEN
    ALTER TABLE public.resignation_applications ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resignation_applications' AND column_name = 'approved_at') THEN
    ALTER TABLE public.resignation_applications ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resignation_applications' AND column_name = 'actual_leave_date') THEN
    ALTER TABLE public.resignation_applications ADD COLUMN actual_leave_date DATE;
  END IF;

  -- 7. notifications 添加业务字段（注意：使用 recipient_id 而非 user_id）
  -- notifications表已经有：recipient_id, sender_id, title, content, type, is_read
  -- 只需添加可选字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_id') THEN
    ALTER TABLE public.notifications ADD COLUMN related_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'batch_id') THEN
    ALTER TABLE public.notifications ADD COLUMN batch_id UUID;
  END IF;
  -- action_url 可能已存在，检查后添加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE public.notifications ADD COLUMN action_url TEXT;
  END IF;
END $$;

-- 8. 创建索引以提升性能
CREATE INDEX IF NOT EXISTS idx_piece_work_records_work_date ON public.piece_work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_warehouse ON public.piece_work_records(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_dates ON public.leave_applications(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_date ON public.resignation_applications(resignation_date);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON public.notifications(related_id);
CREATE INDEX IF NOT EXISTS idx_notifications_batch ON public.notifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON public.vehicles(registration_date);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_issue_date ON public.driver_licenses(issue_date);
