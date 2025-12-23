/*
# 创建测试账号（最终版）

## 测试账号列表
- admin (13800000000) - BOSS（老板）
- admin1 (13800000001) - DISPATCHER（车队长）
- admin2 (13800000002) - DRIVER（司机）
- admin3 (13800000003) - DISPATCHER（平级账号）

## 密码
所有测试账号的密码都是：admin123
*/

-- admin - 老板
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
      'admin@fleet.local', crypt('admin123', gen_salt('bf')), NOW(),
      '13800000000', NOW(), '{"name": "admin（老板）"}'::jsonb, NOW(), NOW(),
      'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (v_user_id, '13800000000', 'admin@fleet.local', 'admin（老板）', NOW(), NOW());
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'BOSS'::user_role, NOW());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (v_user_id, '13800000000', 'admin@fleet.local', 'admin（老板）', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, updated_at = NOW();
    
    DELETE FROM user_roles WHERE user_id = v_user_id;
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'BOSS'::user_role, NOW());
  END IF;
END $$;

-- admin1 - 车队长
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
      'admin1@fleet.local', crypt('admin123', gen_salt('bf')), NOW(),
      '13800000001', NOW(), '{"name": "admin1（车队长）"}'::jsonb, NOW(), NOW(),
      'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (v_user_id, '13800000001', 'admin1@fleet.local', 'admin1（车队长）', NOW(), NOW());
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'DISPATCHER'::user_role, NOW());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (v_user_id, '13800000001', 'admin1@fleet.local', 'admin1（车队长）', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, updated_at = NOW();
    
    DELETE FROM user_roles WHERE user_id = v_user_id;
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'DISPATCHER'::user_role, NOW());
  END IF;
END $$;

-- admin2 - 司机
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
      'admin2@fleet.local', crypt('admin123', gen_salt('bf')), NOW(),
      '13800000002', NOW(), '{"name": "admin2（司机）"}'::jsonb, NOW(), NOW(),
      'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (v_user_id, '13800000002', 'admin2@fleet.local', 'admin2（司机）', NOW(), NOW());
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'DRIVER'::user_role, NOW());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (v_user_id, '13800000002', 'admin2@fleet.local', 'admin2（司机）', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, updated_at = NOW();
    
    DELETE FROM user_roles WHERE user_id = v_user_id;
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'DRIVER'::user_role, NOW());
  END IF;
END $$;

-- admin3 - 平级账号
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
      'admin3@fleet.local', crypt('admin123', gen_salt('bf')), NOW(),
      '13800000003', NOW(), '{"name": "admin3（平级账号）"}'::jsonb, NOW(), NOW(),
      'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (v_user_id, '13800000003', 'admin3@fleet.local', 'admin3（平级账号）', NOW(), NOW());
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'DISPATCHER'::user_role, NOW());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (v_user_id, '13800000003', 'admin3@fleet.local', 'admin3（平级账号）', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, updated_at = NOW();
    
    DELETE FROM user_roles WHERE user_id = v_user_id;
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'DISPATCHER'::user_role, NOW());
  END IF;
END $$;