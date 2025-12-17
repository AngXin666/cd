-- ============================================
-- 迁移脚本：修复 driver_licenses 表字段
-- 
-- 功能说明：
-- 1. 确保 id_card_address 字段存在
-- 2. 确保 driving_license_photo 字段存在
-- 3. 确保所有身份证相关字段存在
-- 4. 使用 IF NOT EXISTS 确保幂等性
-- 5. 添加执行结果日志输出
-- 
-- 需求引用：
-- - Requirements 2.1: 保存 id_card_address 字段
-- - Requirements 2.2: 保存 driving_license_photo 字段
-- - Requirements 2.3: 返回包含所有字段的完整数据
-- - Requirements 2.4: 允许可选字段为 NULL
-- - Requirements 4.1: 使用 IF NOT EXISTS 确保幂等性
-- - Requirements 4.2: 字段已存在时跳过添加操作
-- ============================================

-- ============================================
-- 第1部分：身份证相关字段检查和补充
-- ============================================

-- 1.1 添加 id_card_name 字段（身份证姓名）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'id_card_name'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN id_card_name TEXT;
    COMMENT ON COLUMN driver_licenses.id_card_name IS '身份证姓名';
    RAISE NOTICE '已添加字段：id_card_name';
  ELSE
    RAISE NOTICE '字段已存在，跳过：id_card_name';
  END IF;
END $$;

-- 1.2 添加 id_card_number 字段（身份证号码）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'id_card_number'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN id_card_number TEXT;
    COMMENT ON COLUMN driver_licenses.id_card_number IS '身份证号码';
    RAISE NOTICE '已添加字段：id_card_number';
  ELSE
    RAISE NOTICE '字段已存在，跳过：id_card_number';
  END IF;
END $$;

-- 1.3 添加 id_card_photo_front 字段（身份证正面照片）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'id_card_photo_front'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN id_card_photo_front TEXT;
    COMMENT ON COLUMN driver_licenses.id_card_photo_front IS '身份证正面照片URL';
    RAISE NOTICE '已添加字段：id_card_photo_front';
  ELSE
    RAISE NOTICE '字段已存在，跳过：id_card_photo_front';
  END IF;
END $$;

-- 1.4 添加 id_card_photo_back 字段（身份证反面照片）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'id_card_photo_back'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN id_card_photo_back TEXT;
    COMMENT ON COLUMN driver_licenses.id_card_photo_back IS '身份证反面照片URL';
    RAISE NOTICE '已添加字段：id_card_photo_back';
  ELSE
    RAISE NOTICE '字段已存在，跳过：id_card_photo_back';
  END IF;
END $$;

-- 1.5 添加 id_card_address 字段（身份证地址）⚠️ 关键字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'id_card_address'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN id_card_address TEXT;
    COMMENT ON COLUMN driver_licenses.id_card_address IS '身份证地址';
    RAISE NOTICE '已添加字段：id_card_address（关键字段）';
  ELSE
    RAISE NOTICE '字段已存在，跳过：id_card_address';
  END IF;
END $$;

-- 1.6 添加 id_card_birth_date 字段（出生日期）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'id_card_birth_date'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN id_card_birth_date DATE;
    COMMENT ON COLUMN driver_licenses.id_card_birth_date IS '出生日期';
    RAISE NOTICE '已添加字段：id_card_birth_date';
  ELSE
    RAISE NOTICE '字段已存在，跳过：id_card_birth_date';
  END IF;
END $$;

-- ============================================
-- 第2部分：驾驶证相关字段检查和补充
-- ============================================

-- 2.1 添加 driving_license_photo 字段（驾驶证照片）⚠️ 关键字段
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
    RAISE NOTICE '已添加字段：driving_license_photo（关键字段）';
  ELSE
    RAISE NOTICE '字段已存在，跳过：driving_license_photo';
  END IF;
END $$;

-- 2.2 添加 license_number 字段（驾驶证号）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'license_number'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN license_number TEXT;
    COMMENT ON COLUMN driver_licenses.license_number IS '驾驶证号';
    RAISE NOTICE '已添加字段：license_number';
  ELSE
    RAISE NOTICE '字段已存在，跳过：license_number';
  END IF;
END $$;

-- 2.3 添加 license_class 字段（准驾车型）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'license_class'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN license_class TEXT;
    COMMENT ON COLUMN driver_licenses.license_class IS '准驾车型';
    RAISE NOTICE '已添加字段：license_class';
  ELSE
    RAISE NOTICE '字段已存在，跳过：license_class';
  END IF;
END $$;

-- 2.4 添加 first_issue_date 字段（初次领证日期）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'first_issue_date'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN first_issue_date DATE;
    COMMENT ON COLUMN driver_licenses.first_issue_date IS '初次领证日期，用于计算驾龄';
    RAISE NOTICE '已添加字段：first_issue_date';
  ELSE
    RAISE NOTICE '字段已存在，跳过：first_issue_date';
  END IF;
END $$;

-- 2.5 添加 valid_from 字段（驾驶证有效期起）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'valid_from'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN valid_from DATE;
    COMMENT ON COLUMN driver_licenses.valid_from IS '驾驶证有效期起';
    RAISE NOTICE '已添加字段：valid_from';
  ELSE
    RAISE NOTICE '字段已存在，跳过：valid_from';
  END IF;
END $$;

-- 2.6 添加 valid_to 字段（驾驶证有效期至）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'valid_to'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN valid_to DATE;
    COMMENT ON COLUMN driver_licenses.valid_to IS '驾驶证有效期至';
    RAISE NOTICE '已添加字段：valid_to';
  ELSE
    RAISE NOTICE '字段已存在，跳过：valid_to';
  END IF;
END $$;

-- 2.7 添加 issue_authority 字段（签发机关）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'issue_authority'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN issue_authority TEXT;
    COMMENT ON COLUMN driver_licenses.issue_authority IS '签发机关';
    RAISE NOTICE '已添加字段：issue_authority';
  ELSE
    RAISE NOTICE '字段已存在，跳过：issue_authority';
  END IF;
END $$;

-- ============================================
-- 第3部分：输出迁移执行结果
-- ============================================

DO $$
DECLARE
  field_count INTEGER;
  field_list TEXT;
BEGIN
  -- 统计 driver_licenses 表的字段数量
  SELECT COUNT(*) INTO field_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'driver_licenses';
  
  -- 获取所有字段列表
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO field_list
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'driver_licenses';
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '迁移完成：driver_licenses 表字段修复';
  RAISE NOTICE '============================================';
  RAISE NOTICE '当前字段总数：%', field_count;
  RAISE NOTICE '字段列表：%', field_list;
  RAISE NOTICE '============================================';
  
  -- 验证关键字段是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'id_card_address'
  ) THEN
    RAISE NOTICE '✓ 关键字段 id_card_address 已存在';
  ELSE
    RAISE WARNING '✗ 关键字段 id_card_address 不存在！';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_licenses' 
    AND column_name = 'driving_license_photo'
  ) THEN
    RAISE NOTICE '✓ 关键字段 driving_license_photo 已存在';
  ELSE
    RAISE WARNING '✗ 关键字段 driving_license_photo 不存在！';
  END IF;
  
END $$;
