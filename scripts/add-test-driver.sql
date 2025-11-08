-- 添加测试司机账号 angxin
-- 手机号: 13800000003
-- 姓名: angxin
-- 角色: driver

-- 注意：此脚本需要在 Supabase 数据库中执行
-- 密码将在首次登录时通过手机验证码设置

-- 1. 首先检查手机号是否已存在
DO $$
DECLARE
  existing_profile_id uuid;
  new_profile_id uuid;
BEGIN
  -- 检查 profiles 表中是否已存在该手机号
  SELECT id INTO existing_profile_id
  FROM profiles
  WHERE phone = '13800000003';

  IF existing_profile_id IS NOT NULL THEN
    RAISE NOTICE '手机号 13800000003 已存在，profile_id: %', existing_profile_id;
  ELSE
    -- 创建新的 profile 记录
    INSERT INTO profiles (phone, name, role)
    VALUES ('13800000003', 'angxin', 'driver')
    RETURNING id INTO new_profile_id;
    
    RAISE NOTICE '成功创建司机账号 angxin，profile_id: %', new_profile_id;
    RAISE NOTICE '手机号: 13800000003';
    RAISE NOTICE '姓名: angxin';
    RAISE NOTICE '角色: driver';
    RAISE NOTICE '请使用手机号登录，首次登录时会收到验证码';
  END IF;
END $$;

-- 2. 验证创建结果
SELECT 
  id,
  phone,
  name,
  role,
  created_at
FROM profiles
WHERE phone = '13800000003';
