-- ============================================
-- 迁移脚本：添加 vehicle_documents 和 driver_licenses 表缺失的字段
-- 
-- 功能说明：
-- 1. 为 vehicle_documents 表添加缺失的字段
-- 2. 为 driver_licenses 表添加 driving_license_photo 字段
-- 3. 使用 IF NOT EXISTS 确保幂等性
-- ============================================

-- ============================================
-- 第1部分：vehicle_documents 表字段补充
-- ============================================

-- 1. 添加 approved_load 字段（核定载质量）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'approved_load'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN approved_load NUMERIC;
    COMMENT ON COLUMN vehicle_documents.approved_load IS '核定载质量';
  END IF;
END $$;

-- 2. 添加 total_mass 字段（总质量）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'total_mass'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN total_mass NUMERIC;
    COMMENT ON COLUMN vehicle_documents.total_mass IS '总质量';
  END IF;
END $$;

-- 3. 添加 approved_passengers 字段（核定载客）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'approved_passengers'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN approved_passengers INTEGER;
    COMMENT ON COLUMN vehicle_documents.approved_passengers IS '核定载客人数';
  END IF;
END $$;

-- 4. 添加 curb_weight 字段（整备质量）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'curb_weight'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN curb_weight NUMERIC;
    COMMENT ON COLUMN vehicle_documents.curb_weight IS '整备质量';
  END IF;
END $$;

-- 5. 添加 overall_dimension_length 字段（外廓尺寸-长）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'overall_dimension_length'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN overall_dimension_length NUMERIC;
    COMMENT ON COLUMN vehicle_documents.overall_dimension_length IS '外廓尺寸-长';
  END IF;
END $$;

-- 6. 添加 overall_dimension_width 字段（外廓尺寸-宽）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'overall_dimension_width'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN overall_dimension_width NUMERIC;
    COMMENT ON COLUMN vehicle_documents.overall_dimension_width IS '外廓尺寸-宽';
  END IF;
END $$;

-- 7. 添加 overall_dimension_height 字段（外廓尺寸-高）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'overall_dimension_height'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN overall_dimension_height NUMERIC;
    COMMENT ON COLUMN vehicle_documents.overall_dimension_height IS '外廓尺寸-高';
  END IF;
END $$;

-- 8. 添加 owner_name 字段（车主姓名）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN owner_name TEXT;
    COMMENT ON COLUMN vehicle_documents.owner_name IS '车主姓名';
  END IF;
END $$;

-- 9. 添加 use_character 字段（使用性质）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'use_character'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN use_character TEXT;
    COMMENT ON COLUMN vehicle_documents.use_character IS '使用性质';
  END IF;
END $$;

-- 10. 添加 register_date 字段（注册日期）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'register_date'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN register_date DATE;
    COMMENT ON COLUMN vehicle_documents.register_date IS '注册日期';
  END IF;
END $$;

-- 11. 添加 issue_date 字段（发证日期）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'issue_date'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN issue_date DATE;
    COMMENT ON COLUMN vehicle_documents.issue_date IS '发证日期';
  END IF;
END $$;

-- 12. 添加 engine_number 字段（发动机号）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'engine_number'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN engine_number TEXT;
    COMMENT ON COLUMN vehicle_documents.engine_number IS '发动机号';
  END IF;
END $$;

-- 13. 添加 archive_number 字段（档案编号）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'archive_number'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN archive_number TEXT;
    COMMENT ON COLUMN vehicle_documents.archive_number IS '档案编号';
  END IF;
END $$;

-- 14. 添加 inspection_valid_until 字段（检验有效期至）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'inspection_valid_until'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN inspection_valid_until DATE;
    COMMENT ON COLUMN vehicle_documents.inspection_valid_until IS '检验有效期至';
  END IF;
END $$;

-- 15. 添加 inspection_date 字段（检验日期）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'inspection_date'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN inspection_date DATE;
    COMMENT ON COLUMN vehicle_documents.inspection_date IS '检验日期';
  END IF;
END $$;

-- 16. 添加 mandatory_scrap_date 字段（强制报废日期）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'mandatory_scrap_date'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN mandatory_scrap_date DATE;
    COMMENT ON COLUMN vehicle_documents.mandatory_scrap_date IS '强制报废日期';
  END IF;
END $$;

-- 17. 添加行驶证照片字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'driving_license_main_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN driving_license_main_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.driving_license_main_photo IS '行驶证主页照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'driving_license_sub_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN driving_license_sub_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.driving_license_sub_photo IS '行驶证副页照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'driving_license_back_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN driving_license_back_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.driving_license_back_photo IS '行驶证背面照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'driving_license_sub_back_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN driving_license_sub_back_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.driving_license_sub_back_photo IS '行驶证副页背面照片';
  END IF;
END $$;

-- 18. 添加车辆照片字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'left_front_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN left_front_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.left_front_photo IS '左前照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'right_front_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN right_front_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.right_front_photo IS '右前照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'left_rear_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN left_rear_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.left_rear_photo IS '左后照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'right_rear_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN right_rear_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.right_rear_photo IS '右后照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'dashboard_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN dashboard_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.dashboard_photo IS '仪表盘照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'rear_door_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN rear_door_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.rear_door_photo IS '后门照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'cargo_box_photo'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN cargo_box_photo TEXT;
    COMMENT ON COLUMN vehicle_documents.cargo_box_photo IS '货箱照片';
  END IF;
END $$;

-- 19. 添加租赁信息字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'lessor_name'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN lessor_name TEXT;
    COMMENT ON COLUMN vehicle_documents.lessor_name IS '出租方名称';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'lessor_contact'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN lessor_contact TEXT;
    COMMENT ON COLUMN vehicle_documents.lessor_contact IS '出租方联系方式';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'lessee_name'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN lessee_name TEXT;
    COMMENT ON COLUMN vehicle_documents.lessee_name IS '承租方名称';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'lessee_contact'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN lessee_contact TEXT;
    COMMENT ON COLUMN vehicle_documents.lessee_contact IS '承租方联系方式';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'monthly_rent'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN monthly_rent NUMERIC;
    COMMENT ON COLUMN vehicle_documents.monthly_rent IS '月租金';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'lease_start_date'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN lease_start_date DATE;
    COMMENT ON COLUMN vehicle_documents.lease_start_date IS '租赁开始日期';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'lease_end_date'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN lease_end_date DATE;
    COMMENT ON COLUMN vehicle_documents.lease_end_date IS '租赁结束日期';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'rent_payment_day'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN rent_payment_day INTEGER;
    COMMENT ON COLUMN vehicle_documents.rent_payment_day IS '租金支付日';
  END IF;
END $$;

-- 20. 添加审核和其他信息字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN review_notes TEXT;
    COMMENT ON COLUMN vehicle_documents.review_notes IS '审核备注';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'locked_photos'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN locked_photos JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN vehicle_documents.locked_photos IS '锁定的照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'required_photos'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN required_photos TEXT[] DEFAULT ARRAY[]::text[];
    COMMENT ON COLUMN vehicle_documents.required_photos IS '必需的照片';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'damage_photos'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN damage_photos TEXT[];
    COMMENT ON COLUMN vehicle_documents.damage_photos IS '损坏照片数组';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'pickup_photos'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN pickup_photos TEXT[];
    COMMENT ON COLUMN vehicle_documents.pickup_photos IS '提车照片数组';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'pickup_time'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN pickup_time TIMESTAMPTZ;
    COMMENT ON COLUMN vehicle_documents.pickup_time IS '提车时间';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'registration_photos'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN registration_photos TEXT[];
    COMMENT ON COLUMN vehicle_documents.registration_photos IS '登记照片数组';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'return_photos'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN return_photos TEXT[];
    COMMENT ON COLUMN vehicle_documents.return_photos IS '还车照片数组';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'return_time'
  ) THEN
    ALTER TABLE vehicle_documents ADD COLUMN return_time TIMESTAMPTZ;
    COMMENT ON COLUMN vehicle_documents.return_time IS '还车时间';
  END IF;
END $$;

-- ============================================
-- 第2部分：driver_licenses 表字段补充
-- ============================================

-- 1. 添加 driving_license_photo 字段（驾驶证照片）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'driving_license_photo'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN driving_license_photo TEXT;
    COMMENT ON COLUMN driver_licenses.driving_license_photo IS '驾驶证照片';
  END IF;
END $$;

-- 输出迁移完成信息
DO $$
BEGIN
  RAISE NOTICE '迁移完成：vehicle_documents 和 driver_licenses 表字段已补充';
END $$;
