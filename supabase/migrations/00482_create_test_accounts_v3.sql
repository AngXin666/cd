/*
# 创建测试账号 v3

## 说明
直接在数据库中创建测试账号

## 测试账号列表
- admin (13800000000) - BOSS（老板）
- admin1 (13800000001) - DISPATCHER（车队长）
- admin2 (13800000002) - DRIVER（司机）
- admin3 (13800000003) - DISPATCHER（平级账号）

## 密码
所有测试账号的密码都是：admin123
*/

-- 1. 创建测试用户

-- admin - 老板
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- 检查用户是否已存在
  SELECT id INTO user_id FROM auth.users WHERE phone = '13800000000';
  
  IF user_id IS NULL THEN
    -- 创建新用户
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      phone,
      phone_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmed_at,
      aud,
      role
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin@fleet.local',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      '13800000000',
      NOW(),
      '{"name": "admin（老板）"}'::jsonb,
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO user_id;
    
    -- 创建 users 记录
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (user_id, '13800000000', 'admin@fleet.local', 'admin（老板）', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- 创建 user_roles 记录
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (user_id, 'BOSS'::user_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- 更新现有用户
    UPDATE auth.users
    SET 
      encrypted_password = crypt('admin123', gen_salt('bf')),
      email_confirmed_at = NOW(),
      phone_confirmed_at = NOW(),
      confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = user_id;
    
    -- 确保 users 记录存在
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (user_id, '13800000000', 'admin@fleet.local', 'admin（老板）', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = NOW();
    
    -- 确保角色正确
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (user_id, 'BOSS'::user_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- 删除其他角色
    DELETE FROM user_roles WHERE user_id = user_id AND role != 'BOSS'::user_role;
  END IF;
END $$;

-- admin1 - 车队长
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE phone = '13800000001';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at,
      confirmed_at, aud, role
    )
    VALUES (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'admin1@fleet.local', crypt('admin123', gen_salt('bf')), NOW(),
      '13800000001', NOW(), '{"name": "admin1（车队长）"}'::jsonb, NOW(), NOW(),
      NOW(), 'authenticated', 'authenticated'
    )
    RETURNING id INTO user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (user_id, '13800000001', 'admin1@fleet.local', 'admin1（车队长）', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (user_id, 'DISPATCHER'::user_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(),
        confirmed_at = NOW(), updated_at = NOW()
    WHERE id = user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (user_id, '13800000001', 'admin1@fleet.local', 'admin1（车队长）', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, updated_at = NOW();
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (user_id, 'DISPATCHER'::user_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    DELETE FROM user_roles WHERE user_id = user_id AND role != 'DISPATCHER'::user_role;
  END IF;
END $$;

-- admin2 - 司机
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE phone = '13800000002';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at,
      confirmed_at, aud, role
    )
    VALUES (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'admin2@fleet.local', crypt('admin123', gen_salt('bf')), NOW(),
      '13800000002', NOW(), '{"name": "admin2（司机）"}'::jsonb, NOW(), NOW(),
      NOW(), 'authenticated', 'authenticated'
    )
    RETURNING id INTO user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (user_id, '13800000002', 'admin2@fleet.local', 'admin2（司机）', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (user_id, 'DRIVER'::user_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(),
        confirmed_at = NOW(), updated_at = NOW()
    WHERE id = user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (user_id, '13800000002', 'admin2@fleet.local', 'admin2（司机）', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, updated_at = NOW();
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (user_id, 'DRIVER'::user_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    DELETE FROM user_roles WHERE user_id = user_id AND role != 'DRIVER'::user_role;
  END IF;
END $$;

-- admin3 - 平级账号
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE phone = '13800000003';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at,
      confirmed_at, aud, role
    )
    VALUES (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'admin3@fleet.local', crypt('admin123', gen_salt('bf')), NOW(),
      '13800000003', NOW(), '{"name": "admin3（平级账号）"}'::jsonb, NOW(), NOW(),
      NOW(), 'authenticated', 'authenticated'
    )
    RETURNING id INTO user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (user_id, '13800000003', 'admin3@fleet.local', 'admin3（平级账号）', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (user_id, 'DISPATCHER'::user_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        email_confirmed_at = NOW(), phone_confirmed_at = NOW(),
        confirmed_at = NOW(), updated_at = NOW()
    WHERE id = user_id;
    
    INSERT INTO users (id, phone, email, name, created_at, updated_at)
    VALUES (user_id, '13800000003', 'admin3@fleet.local', 'admin3（平级账号）', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email,
      name = EXCLUDED.name, updated_at = NOW();
    
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (user_id, 'DISPATCHER'::user_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    DELETE FROM user_roles WHERE user_id = user_id AND role != 'DISPATCHER'::user_role;
  END IF;
END $$;