/*
# 创建测试账号（新角色结构版本）

## 测试账号列表
- admin1 (13800000000) - BOSS（老板）
- admin11 (13800000001) - PEER_ADMIN（平级账号）
- admin111 (13800000002) - MANAGER（车队长）
- admin1111 (13800000003) - DRIVER（司机）
- admin1112 (13800000004) - SCHEDULER（调度账号）

## 密码
所有测试账号的密码都是：123456
*/

-- admin1 - 老板 (BOSS)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE phone = '13800000000';
  
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at,
      aud, role
    )
    VALUES (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'admin1@fleet.local', crypt('123456', gen_salt('bf')), NOW(),
      '13800000000', NOW(), '{"name": "admin1（老板）"}'::jsonb, NOW(), NOW(),
      'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000000', 'admin1@fleet.local', 'admin1（老板）', 'BOSS', NOW(), NOW());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('123456', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000000', 'admin1@fleet.local', 'admin1（老板）', 'BOSS', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();
  END IF;
END $$;

-- admin11 - 平级账号 (PEER_ADMIN)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE phone = '13800000001';
  
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at,
      aud, role
    )
    VALUES (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'admin11@fleet.local', crypt('123456', gen_salt('bf')), NOW(),
      '13800000001', NOW(), '{"name": "admin11（平级账号）"}'::jsonb, NOW(), NOW(),
      'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000001', 'admin11@fleet.local', 'admin11（平级账号）', 'PEER_ADMIN', NOW(), NOW());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('123456', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000001', 'admin11@fleet.local', 'admin11（平级账号）', 'PEER_ADMIN', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();
  END IF;
END $$;

-- admin111 - 车队长 (MANAGER)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE phone = '13800000002';
  
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at,
      aud, role
    )
    VALUES (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'admin111@fleet.local', crypt('123456', gen_salt('bf')), NOW(),
      '13800000002', NOW(), '{"name": "admin111（车队长）"}'::jsonb, NOW(), NOW(),
      'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000002', 'admin111@fleet.local', 'admin111（车队长）', 'MANAGER', NOW(), NOW());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('123456', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000002', 'admin111@fleet.local', 'admin111（车队长）', 'MANAGER', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();
  END IF;
END $$;

-- admin1111 - 司机 (DRIVER)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE phone = '13800000003';
  
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at,
      aud, role
    )
    VALUES (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'admin1111@fleet.local', crypt('123456', gen_salt('bf')), NOW(),
      '13800000003', NOW(), '{"name": "admin1111（司机）"}'::jsonb, NOW(), NOW(),
      'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000003', 'admin1111@fleet.local', 'admin1111（司机）', 'DRIVER', NOW(), NOW());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('123456', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000003', 'admin1111@fleet.local', 'admin1111（司机）', 'DRIVER', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();
  END IF;
END $$;

-- admin1112 - 调度账号 (SCHEDULER)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE phone = '13800000004';
  
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at,
      aud, role
    )
    VALUES (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'admin1112@fleet.local', crypt('123456', gen_salt('bf')), NOW(),
      '13800000004', NOW(), '{"name": "admin1112（调度账号）"}'::jsonb, NOW(), NOW(),
      'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000004', 'admin1112@fleet.local', 'admin1112（调度账号）', 'SCHEDULER', NOW(), NOW());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('123456', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO users (id, phone, email, name, role, created_at, updated_at)
    VALUES (v_user_id, '13800000004', 'admin1112@fleet.local', 'admin1112（调度账号）', 'SCHEDULER', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();
  END IF;
END $$;