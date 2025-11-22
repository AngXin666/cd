-- 创建测试用户（auth.users）
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data,
  raw_user_meta_data, is_super_admin, created_at, updated_at, last_sign_in_at, confirmed_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  NULL, crypt('123456', gen_salt('bf')), now(), '13800000001', now(), '', '', '', '', '{}', '{}',
  false, now(), now(), now(), now()
),
(
  '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  NULL, crypt('123456', gen_salt('bf')), now(), '13800000002', now(), '', '', '', '', '{}', '{}',
  false, now(), now(), now(), now()
),
(
  '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  NULL, crypt('123456', gen_salt('bf')), now(), '13800000003', now(), '', '', '', '', '{}', '{}',
  false, now(), now(), now(), now()
),
(
  '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  NULL, crypt('123456', gen_salt('bf')), now(), '13800000004', now(), '', '', '', '', '{}', '{}',
  false, now(), now(), now(), now()
)
ON CONFLICT (id) DO NOTHING;