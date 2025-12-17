/*
 * 修复 vehicle_documents 表结构
 * 
 * 问题背景：
 * 1. 00599 迁移定义了完整的表结构（46个扩展字段），没有 document_type 字段
 * 2. 00610 迁移定义了简化的表结构，包含 document_type NOT NULL 字段
 * 3. 由于 CREATE TABLE IF NOT EXISTS，实际表结构取决于执行顺序
 * 4. 如果 00610 先执行，会导致 document_type NOT NULL 约束违反错误
 * 
 * 修复内容：
 * 1. 移除 document_type 字段的 NOT NULL 约束（如果存在）
 * 2. 添加所有缺失的扩展字段（行驶证信息、车辆照片、租赁信息等）
 * 3. 使用幂等性语法确保可重复执行
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2
 */

-- ============================================
-- 第1步：处理 document_type 字段的 NOT NULL 约束
-- ============================================

DO $$
DECLARE
  column_exists BOOLEAN;
  is_not_null BOOLEAN;
BEGIN
  -- 检查 document_type 字段是否存在
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'document_type'
  ) INTO column_exists;
  
  IF column_exists THEN
    -- 检查是否有 NOT NULL 约束
    SELECT is_nullable = 'NO' INTO is_not_null
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'document_type';
    
    IF is_not_null THEN
      -- 移除 NOT NULL 约束
      ALTER TABLE public.vehicle_documents ALTER COLUMN document_type DROP NOT NULL;
      RAISE NOTICE '✅ 已移除 document_type 字段的 NOT NULL 约束';
    ELSE
      RAISE NOTICE 'ℹ️ document_type 字段已经是可空的，无需修改';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ document_type 字段不存在，无需处理约束';
  END IF;
END $$;

-- ============================================
-- 第2步：添加所有缺失的扩展字段
-- ============================================

-- 行驶证信息字段（20列）
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS use_character text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS register_date date;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS issue_date date;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS engine_number text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS archive_number text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS total_mass numeric;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS approved_passengers integer;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS curb_weight numeric;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS approved_load numeric;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS overall_dimension_length numeric;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS overall_dimension_width numeric;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS overall_dimension_height numeric;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS inspection_valid_until date;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS inspection_date date;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS mandatory_scrap_date date;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS driving_license_main_photo text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS driving_license_sub_photo text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS driving_license_back_photo text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS driving_license_sub_back_photo text;

-- 车辆照片字段（7列）
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS left_front_photo text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS right_front_photo text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS left_rear_photo text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS right_rear_photo text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS dashboard_photo text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS rear_door_photo text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS cargo_box_photo text;

-- 租赁信息字段（8列）
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS lessor_name text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS lessor_contact text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS lessee_name text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS lessee_contact text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS monthly_rent numeric;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS lease_start_date date;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS lease_end_date date;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS rent_payment_day integer;

-- 审核和其他信息字段（9列）
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS locked_photos jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS required_photos text[] DEFAULT ARRAY[]::text[];
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS damage_photos text[];
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS pickup_photos text[];
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS pickup_time timestamptz;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS registration_photos text[];
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS return_photos text[];
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS return_time timestamptz;

-- ============================================
-- 第3步：添加字段注释
-- ============================================

-- 行驶证信息字段注释
COMMENT ON COLUMN public.vehicle_documents.owner_name IS '车主姓名';
COMMENT ON COLUMN public.vehicle_documents.use_character IS '使用性质';
COMMENT ON COLUMN public.vehicle_documents.register_date IS '注册日期';
COMMENT ON COLUMN public.vehicle_documents.issue_date IS '发证日期';
COMMENT ON COLUMN public.vehicle_documents.engine_number IS '发动机号';
COMMENT ON COLUMN public.vehicle_documents.archive_number IS '档案编号';
COMMENT ON COLUMN public.vehicle_documents.total_mass IS '总质量';
COMMENT ON COLUMN public.vehicle_documents.approved_passengers IS '核定载客';
COMMENT ON COLUMN public.vehicle_documents.curb_weight IS '整备质量';
COMMENT ON COLUMN public.vehicle_documents.approved_load IS '核定载质量';
COMMENT ON COLUMN public.vehicle_documents.overall_dimension_length IS '外廓尺寸-长';
COMMENT ON COLUMN public.vehicle_documents.overall_dimension_width IS '外廓尺寸-宽';
COMMENT ON COLUMN public.vehicle_documents.overall_dimension_height IS '外廓尺寸-高';
COMMENT ON COLUMN public.vehicle_documents.inspection_valid_until IS '检验有效期至';
COMMENT ON COLUMN public.vehicle_documents.inspection_date IS '检验日期';
COMMENT ON COLUMN public.vehicle_documents.mandatory_scrap_date IS '强制报废日期';
COMMENT ON COLUMN public.vehicle_documents.driving_license_main_photo IS '行驶证主页照片';
COMMENT ON COLUMN public.vehicle_documents.driving_license_sub_photo IS '行驶证副页照片';
COMMENT ON COLUMN public.vehicle_documents.driving_license_back_photo IS '行驶证背面照片';
COMMENT ON COLUMN public.vehicle_documents.driving_license_sub_back_photo IS '行驶证副页背面照片';

-- 车辆照片字段注释
COMMENT ON COLUMN public.vehicle_documents.left_front_photo IS '左前照片';
COMMENT ON COLUMN public.vehicle_documents.right_front_photo IS '右前照片';
COMMENT ON COLUMN public.vehicle_documents.left_rear_photo IS '左后照片';
COMMENT ON COLUMN public.vehicle_documents.right_rear_photo IS '右后照片';
COMMENT ON COLUMN public.vehicle_documents.dashboard_photo IS '仪表盘照片';
COMMENT ON COLUMN public.vehicle_documents.rear_door_photo IS '后门照片';
COMMENT ON COLUMN public.vehicle_documents.cargo_box_photo IS '货箱照片';

-- 租赁信息字段注释
COMMENT ON COLUMN public.vehicle_documents.lessor_name IS '出租方名称';
COMMENT ON COLUMN public.vehicle_documents.lessor_contact IS '出租方联系方式';
COMMENT ON COLUMN public.vehicle_documents.lessee_name IS '承租方名称';
COMMENT ON COLUMN public.vehicle_documents.lessee_contact IS '承租方联系方式';
COMMENT ON COLUMN public.vehicle_documents.monthly_rent IS '月租金';
COMMENT ON COLUMN public.vehicle_documents.lease_start_date IS '租赁开始日期';
COMMENT ON COLUMN public.vehicle_documents.lease_end_date IS '租赁结束日期';
COMMENT ON COLUMN public.vehicle_documents.rent_payment_day IS '租金支付日';

-- 审核和其他信息字段注释
COMMENT ON COLUMN public.vehicle_documents.review_notes IS '审核备注';
COMMENT ON COLUMN public.vehicle_documents.locked_photos IS '锁定的照片（JSON格式）';
COMMENT ON COLUMN public.vehicle_documents.required_photos IS '必需的照片列表';
COMMENT ON COLUMN public.vehicle_documents.damage_photos IS '损坏照片数组';
COMMENT ON COLUMN public.vehicle_documents.pickup_photos IS '提车照片数组';
COMMENT ON COLUMN public.vehicle_documents.pickup_time IS '提车时间';
COMMENT ON COLUMN public.vehicle_documents.registration_photos IS '登记照片数组';
COMMENT ON COLUMN public.vehicle_documents.return_photos IS '还车照片数组';
COMMENT ON COLUMN public.vehicle_documents.return_time IS '还车时间';

-- ============================================
-- 第4步：创建索引（如果不存在）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON public.vehicle_documents(vehicle_id);

-- ============================================
-- 第5步：验证迁移结果
-- ============================================

DO $$
DECLARE
  column_count INTEGER;
  expected_columns TEXT[] := ARRAY[
    'id', 'vehicle_id', 'document_type', 'document_number', 'expiry_date', 'issuing_authority', 'photo_url', 'notes',
    'owner_name', 'use_character', 'register_date', 'issue_date', 'engine_number', 'archive_number',
    'total_mass', 'approved_passengers', 'curb_weight', 'approved_load',
    'overall_dimension_length', 'overall_dimension_width', 'overall_dimension_height',
    'inspection_valid_until', 'inspection_date', 'mandatory_scrap_date',
    'driving_license_main_photo', 'driving_license_sub_photo', 'driving_license_back_photo', 'driving_license_sub_back_photo',
    'left_front_photo', 'right_front_photo', 'left_rear_photo', 'right_rear_photo',
    'dashboard_photo', 'rear_door_photo', 'cargo_box_photo',
    'lessor_name', 'lessor_contact', 'lessee_name', 'lessee_contact',
    'monthly_rent', 'lease_start_date', 'lease_end_date', 'rent_payment_day',
    'review_notes', 'locked_photos', 'required_photos',
    'damage_photos', 'pickup_photos', 'pickup_time',
    'registration_photos', 'return_photos', 'return_time',
    'created_at', 'updated_at'
  ];
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  col TEXT;
  col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== vehicle_documents 表结构修复验证 ===';
  
  -- 统计当前列数
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'vehicle_documents';
  
  RAISE NOTICE '当前表列数: %', column_count;
  
  -- 检查关键字段是否存在
  FOREACH col IN ARRAY expected_columns
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vehicle_documents' 
      AND column_name = col
    ) INTO col_exists;
    
    IF NOT col_exists THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING '⚠️ 以下字段仍然缺失: %', missing_columns;
  ELSE
    RAISE NOTICE '✅ 所有预期字段都已存在';
  END IF;
  
  -- 检查 document_type 是否可空
  PERFORM 1 FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'vehicle_documents' 
  AND column_name = 'document_type'
  AND is_nullable = 'YES';
  
  IF FOUND THEN
    RAISE NOTICE '✅ document_type 字段已设置为可空';
  ELSE
    -- 可能字段不存在，也是可以的
    PERFORM 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'document_type';
    
    IF NOT FOUND THEN
      RAISE NOTICE 'ℹ️ document_type 字段不存在（这是正常的，00599版本不包含此字段）';
    ELSE
      RAISE WARNING '⚠️ document_type 字段仍然是 NOT NULL';
    END IF;
  END IF;
  
  RAISE NOTICE '=== 验证完成 ===';
END $$;
