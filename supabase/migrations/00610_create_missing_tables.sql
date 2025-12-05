-- ============================================
-- 创建缺失的表
-- ============================================

-- 1. piece_work_categories - 计件分类表
CREATE TABLE IF NOT EXISTS public.piece_work_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_piece_work_categories_name ON public.piece_work_categories(name);

ALTER TABLE public.piece_work_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有认证用户查看计件分类"
ON public.piece_work_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "允许管理员管理计件分类"
ON public.piece_work_categories FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('BOSS', 'PEER_ADMIN', 'MANAGER')
));

CREATE POLICY "Service role可以管理计件分类"
ON public.piece_work_categories FOR ALL TO service_role USING (true);

-- 2. category_prices - 分类价格表
CREATE TABLE IF NOT EXISTS public.category_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.piece_work_categories(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  driver_type TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, warehouse_id, driver_type, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_category_prices_category ON public.category_prices(category_id);
CREATE INDEX IF NOT EXISTS idx_category_prices_warehouse ON public.category_prices(warehouse_id);

ALTER TABLE public.category_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有认证用户查看价格"
ON public.category_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "允许管理员管理价格"
ON public.category_prices FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('BOSS', 'PEER_ADMIN', 'MANAGER')
));

CREATE POLICY "Service role可以管理价格"
ON public.category_prices FOR ALL TO service_role USING (true);

-- 3. vehicle_documents - 车辆证件表
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  issuing_authority TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_type ON public.vehicle_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry ON public.vehicle_documents(expiry_date);

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有认证用户查看车辆证件"
ON public.vehicle_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "允许管理员管理车辆证件"
ON public.vehicle_documents FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('BOSS', 'PEER_ADMIN', 'MANAGER')
));

CREATE POLICY "Service role可以管理车辆证件"
ON public.vehicle_documents FOR ALL TO service_role USING (true);

-- 4. 插入默认计件分类
INSERT INTO public.piece_work_categories (name, unit, description)
VALUES 
  ('装车', '趟', '装车作业'),
  ('卸车', '趟', '卸车作业'),
  ('搬运', '件', '货物搬运'),
  ('分拣', '件', '货物分拣')
ON CONFLICT DO NOTHING;

-- 5. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_piece_work_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_piece_work_categories_updated_at
BEFORE UPDATE ON public.piece_work_categories
FOR EACH ROW
EXECUTE FUNCTION update_piece_work_categories_updated_at();

CREATE OR REPLACE FUNCTION update_category_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_prices_updated_at
BEFORE UPDATE ON public.category_prices
FOR EACH ROW
EXECUTE FUNCTION update_category_prices_updated_at();

CREATE OR REPLACE FUNCTION update_vehicle_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_documents_updated_at
BEFORE UPDATE ON public.vehicle_documents
FOR EACH ROW
EXECUTE FUNCTION update_vehicle_documents_updated_at();
