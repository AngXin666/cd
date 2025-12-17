/*
 * 迁移脚本：为 users 表添加缺失的用户资料字段
 * 
 * 背景说明：
 * 系统从多租户架构（profiles 表）迁移到单用户架构（users 表）后，
 * 部分扩展字段未被迁移到 users 表。本迁移脚本补充这些缺失字段。
 * 
 * 添加的字段分类：
 * 1. 基本扩展信息：nickname, join_date, company_name, vehicle_plate, login_account
 * 2. 状态字段：status, is_active
 * 3. 账号关联：main_account_id, peer_account_permission
 * 4. 地址信息：address_province, address_city, address_district, address_detail
 * 5. 紧急联系人：emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
 * 6. 租赁信息：lease_start_date, lease_end_date, monthly_fee, notes
 * 
 * 需求引用：
 * - Requirements 4.1: 确保 Profile 接口包含所有必要的基本信息字段
 * - Requirements 4.2: 确保 Profile 接口包含所有必要的扩展字段
 * - Requirements 4.3: 确保 Profile 接口包含所有必要的紧急联系人字段
 * - Requirements 6.4: 确保 users 表包含所有用户资料字段
 * - Requirements 6.5: 为发现的缺失字段创建迁移脚本
 * 
 * 使用幂等性语法确保可重复执行
 */

-- ============================================
-- 第1部分：基本扩展信息字段
-- ============================================

-- 1.1 添加 nickname 字段（昵称）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'nickname'
  ) THEN
    ALTER TABLE public.users ADD COLUMN nickname TEXT;
    COMMENT ON COLUMN public.users.nickname IS '用户昵称';
    RAISE NOTICE '✅ 已添加字段：nickname';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：nickname';
  END IF;
END $;

-- 1.2 添加 join_date 字段（入职日期）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'join_date'
  ) THEN
    ALTER TABLE public.users ADD COLUMN join_date DATE;
    COMMENT ON COLUMN public.users.join_date IS '入职日期';
    RAISE NOTICE '✅ 已添加字段：join_date';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：join_date';
  END IF;
END $;

-- 1.3 添加 company_name 字段（公司名称）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN company_name TEXT;
    COMMENT ON COLUMN public.users.company_name IS '公司名称';
    RAISE NOTICE '✅ 已添加字段：company_name';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：company_name';
  END IF;
END $;

-- 1.4 添加 vehicle_plate 字段（车牌号）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'vehicle_plate'
  ) THEN
    ALTER TABLE public.users ADD COLUMN vehicle_plate TEXT;
    COMMENT ON COLUMN public.users.vehicle_plate IS '车牌号（带车司机使用）';
    RAISE NOTICE '✅ 已添加字段：vehicle_plate';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：vehicle_plate';
  END IF;
END $;

-- 1.5 添加 login_account 字段（登录账号）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'login_account'
  ) THEN
    ALTER TABLE public.users ADD COLUMN login_account TEXT;
    COMMENT ON COLUMN public.users.login_account IS '登录账号';
    RAISE NOTICE '✅ 已添加字段：login_account';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：login_account';
  END IF;
END $;

-- ============================================
-- 第2部分：状态字段
-- ============================================

-- 2.1 添加 status 字段（用户状态）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN status TEXT DEFAULT 'active';
    COMMENT ON COLUMN public.users.status IS '用户状态：active（活跃）、inactive（停用）';
    RAISE NOTICE '✅ 已添加字段：status';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：status';
  END IF;
END $;

-- 2.2 添加 is_active 字段（是否激活）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN public.users.is_active IS '是否激活';
    RAISE NOTICE '✅ 已添加字段：is_active';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：is_active';
  END IF;
END $;

-- ============================================
-- 第3部分：账号关联字段
-- ============================================

-- 3.1 添加 main_account_id 字段（主账号ID）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'main_account_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN main_account_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.users.main_account_id IS '主账号ID：NULL表示是主账号，非NULL表示是平级账号（调度）';
    RAISE NOTICE '✅ 已添加字段：main_account_id';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：main_account_id';
  END IF;
END $;

-- 3.2 添加 peer_account_permission 字段（平级账号权限）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'peer_account_permission'
  ) THEN
    ALTER TABLE public.users ADD COLUMN peer_account_permission BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN public.users.peer_account_permission IS '平级账号权限：true=完整权限，false=仅查看权限';
    RAISE NOTICE '✅ 已添加字段：peer_account_permission';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：peer_account_permission';
  END IF;
END $;

-- ============================================
-- 第4部分：地址信息字段
-- ============================================

-- 4.1 添加 address_province 字段（省份）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'address_province'
  ) THEN
    ALTER TABLE public.users ADD COLUMN address_province TEXT;
    COMMENT ON COLUMN public.users.address_province IS '省份';
    RAISE NOTICE '✅ 已添加字段：address_province';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：address_province';
  END IF;
END $;

-- 4.2 添加 address_city 字段（城市）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'address_city'
  ) THEN
    ALTER TABLE public.users ADD COLUMN address_city TEXT;
    COMMENT ON COLUMN public.users.address_city IS '城市';
    RAISE NOTICE '✅ 已添加字段：address_city';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：address_city';
  END IF;
END $;

-- 4.3 添加 address_district 字段（区县）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'address_district'
  ) THEN
    ALTER TABLE public.users ADD COLUMN address_district TEXT;
    COMMENT ON COLUMN public.users.address_district IS '区县';
    RAISE NOTICE '✅ 已添加字段：address_district';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：address_district';
  END IF;
END $;

-- 4.4 添加 address_detail 字段（详细地址）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'address_detail'
  ) THEN
    ALTER TABLE public.users ADD COLUMN address_detail TEXT;
    COMMENT ON COLUMN public.users.address_detail IS '详细地址';
    RAISE NOTICE '✅ 已添加字段：address_detail';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：address_detail';
  END IF;
END $;

-- ============================================
-- 第5部分：紧急联系人字段
-- ============================================

-- 5.1 添加 emergency_contact_name 字段（紧急联系人姓名）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'emergency_contact_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN emergency_contact_name TEXT;
    COMMENT ON COLUMN public.users.emergency_contact_name IS '紧急联系人姓名';
    RAISE NOTICE '✅ 已添加字段：emergency_contact_name';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：emergency_contact_name';
  END IF;
END $;

-- 5.2 添加 emergency_contact_phone 字段（紧急联系人电话）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'emergency_contact_phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN emergency_contact_phone TEXT;
    COMMENT ON COLUMN public.users.emergency_contact_phone IS '紧急联系人电话';
    RAISE NOTICE '✅ 已添加字段：emergency_contact_phone';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：emergency_contact_phone';
  END IF;
END $;

-- 5.3 添加 emergency_contact_relationship 字段（紧急联系人关系）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'emergency_contact_relationship'
  ) THEN
    ALTER TABLE public.users ADD COLUMN emergency_contact_relationship TEXT;
    COMMENT ON COLUMN public.users.emergency_contact_relationship IS '紧急联系人关系';
    RAISE NOTICE '✅ 已添加字段：emergency_contact_relationship';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：emergency_contact_relationship';
  END IF;
END $;

-- ============================================
-- 第6部分：租赁信息字段（兼容旧代码）
-- ============================================

-- 6.1 添加 lease_start_date 字段（租赁开始日期）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'lease_start_date'
  ) THEN
    ALTER TABLE public.users ADD COLUMN lease_start_date DATE;
    COMMENT ON COLUMN public.users.lease_start_date IS '租赁开始日期';
    RAISE NOTICE '✅ 已添加字段：lease_start_date';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：lease_start_date';
  END IF;
END $;

-- 6.2 添加 lease_end_date 字段（租赁结束日期）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'lease_end_date'
  ) THEN
    ALTER TABLE public.users ADD COLUMN lease_end_date DATE;
    COMMENT ON COLUMN public.users.lease_end_date IS '租赁结束日期';
    RAISE NOTICE '✅ 已添加字段：lease_end_date';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：lease_end_date';
  END IF;
END $;

-- 6.3 添加 monthly_fee 字段（月租金）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'monthly_fee'
  ) THEN
    ALTER TABLE public.users ADD COLUMN monthly_fee NUMERIC(10, 2);
    COMMENT ON COLUMN public.users.monthly_fee IS '月租金';
    RAISE NOTICE '✅ 已添加字段：monthly_fee';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：monthly_fee';
  END IF;
END $;

-- 6.4 添加 notes 字段（备注）
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.users ADD COLUMN notes TEXT;
    COMMENT ON COLUMN public.users.notes IS '备注信息';
    RAISE NOTICE '✅ 已添加字段：notes';
  ELSE
    RAISE NOTICE 'ℹ️ 字段已存在，跳过：notes';
  END IF;
END $;

-- ============================================
-- 第7部分：创建索引
-- ============================================

-- 为常用查询字段创建索引
CREATE INDEX IF NOT EXISTS idx_users_login_account ON public.users(login_account);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_main_account_id ON public.users(main_account_id);

-- ============================================
-- 第8部分：验证迁移结果
-- ============================================

DO $
DECLARE
  field_count INTEGER;
  expected_fields TEXT[] := ARRAY[
    'id', 'phone', 'email', 'name', 'avatar_url', 'role', 'driver_type',
    'session_token', 'session_created_at', 'manager_permissions_enabled',
    'nickname', 'join_date', 'company_name', 'vehicle_plate', 'login_account',
    'status', 'is_active', 'main_account_id', 'peer_account_permission',
    'address_province', 'address_city', 'address_district', 'address_detail',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
    'lease_start_date', 'lease_end_date', 'monthly_fee', 'notes',
    'created_at', 'updated_at'
  ];
  missing_fields TEXT[] := ARRAY[]::TEXT[];
  field TEXT;
  field_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== users 表字段完整性验证 ===';
  
  -- 统计当前字段数
  SELECT COUNT(*) INTO field_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'users';
  
  RAISE NOTICE '当前表字段数: %', field_count;
  
  -- 检查预期字段是否存在
  FOREACH field IN ARRAY expected_fields
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = field
    ) INTO field_exists;
    
    IF NOT field_exists THEN
      missing_fields := array_append(missing_fields, field);
    END IF;
  END LOOP;
  
  IF array_length(missing_fields, 1) > 0 THEN
    RAISE WARNING '⚠️ 以下字段仍然缺失: %', missing_fields;
  ELSE
    RAISE NOTICE '✅ 所有预期字段都已存在';
  END IF;
  
  RAISE NOTICE '=== 验证完成 ===';
END $;
