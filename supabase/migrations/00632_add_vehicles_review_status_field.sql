-- ============================================
-- 迁移脚本：添加 vehicles 表缺失的审核相关字段
-- 
-- 功能说明：
-- 1. 添加 review_status 字段（审核状态）
-- 2. 添加其他缺失的审核相关字段
-- 3. 使用 IF NOT EXISTS 确保幂等性
-- 
-- Requirements: 1.2, 1.3, 2.1, 2.2
-- ============================================

-- 1. 添加 user_id 字段（车辆录入人ID）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    COMMENT ON COLUMN vehicles.user_id IS '车辆录入人ID';
  END IF;
END $$;

-- 2. 添加 warehouse_id 字段（所属仓库ID）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
    COMMENT ON COLUMN vehicles.warehouse_id IS '所属仓库ID';
  END IF;
END $$;

-- 3. 添加 owner_id 字段（车主ID）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
    COMMENT ON COLUMN vehicles.owner_id IS '车主ID';
  END IF;
END $$;

-- 4. 添加 current_driver_id 字段（当前驾驶员ID）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'current_driver_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN current_driver_id UUID REFERENCES users(id) ON DELETE SET NULL;
    COMMENT ON COLUMN vehicles.current_driver_id IS '当前驾驶员ID';
  END IF;
END $$;

-- 5. 添加 color 字段（车辆颜色）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'color'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN color TEXT;
    COMMENT ON COLUMN vehicles.color IS '车辆颜色';
  END IF;
END $$;

-- 6. 添加 vin 字段（车架号）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'vin'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vin TEXT;
    COMMENT ON COLUMN vehicles.vin IS '车架号/VIN码';
  END IF;
END $$;

-- 7. 添加 purchase_date 字段（购买日期）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN purchase_date DATE;
    COMMENT ON COLUMN vehicles.purchase_date IS '购买日期';
  END IF;
END $$;

-- 8. 添加 ownership_type 字段（所有权类型）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'ownership_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN ownership_type TEXT;
    COMMENT ON COLUMN vehicles.ownership_type IS '所有权类型（自有/租赁/挂靠等）';
  END IF;
END $$;

-- 9. 添加 is_active 字段（是否激活）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN vehicles.is_active IS '是否激活';
  END IF;
END $$;

-- 10. 添加 notes 字段（备注）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN notes TEXT;
    COMMENT ON COLUMN vehicles.notes IS '备注信息';
  END IF;
END $$;

-- 11. 添加 review_status 字段（审核状态）- 核心字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'review_status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN review_status TEXT DEFAULT 'drafting';
    COMMENT ON COLUMN vehicles.review_status IS '审核状态：drafting(草稿), pending_review(待审核), need_supplement(需补充), approved(已通过)';
  END IF;
END $$;

-- 12. 添加 reviewed_at 字段（审核时间）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN reviewed_at TIMESTAMPTZ;
    COMMENT ON COLUMN vehicles.reviewed_at IS '审核时间';
  END IF;
END $$;

-- 13. 添加 reviewed_by 字段（审核人ID）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
    COMMENT ON COLUMN vehicles.reviewed_by IS '审核人ID';
  END IF;
END $$;

-- 14. 为 review_status 字段创建索引（提高查询性能）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'vehicles' 
    AND indexname = 'idx_vehicles_review_status'
  ) THEN
    CREATE INDEX idx_vehicles_review_status ON vehicles(review_status);
  END IF;
END $$;

-- 15. 为 user_id 字段创建索引（提高查询性能）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'vehicles' 
    AND indexname = 'idx_vehicles_user_id'
  ) THEN
    CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
  END IF;
END $$;

-- 16. 为 warehouse_id 字段创建索引（提高查询性能）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'vehicles' 
    AND indexname = 'idx_vehicles_warehouse_id'
  ) THEN
    CREATE INDEX idx_vehicles_warehouse_id ON vehicles(warehouse_id);
  END IF;
END $$;

-- 17. 刷新 Schema Cache 提示
-- 注意：执行此迁移后，需要通过 Supabase Dashboard 或 API 刷新 schema cache
-- 或者等待自动刷新（通常几分钟内）

-- 输出迁移完成信息
DO $$
BEGIN
  RAISE NOTICE '迁移完成：vehicles 表审核相关字段已添加';
  RAISE NOTICE '已添加字段：user_id, warehouse_id, owner_id, current_driver_id, color, vin, purchase_date, ownership_type, is_active, notes, review_status, reviewed_at, reviewed_by';
  RAISE NOTICE '已创建索引：idx_vehicles_review_status, idx_vehicles_user_id, idx_vehicles_warehouse_id';
END $$;
