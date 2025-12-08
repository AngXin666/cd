-- 验证admin4账号登录问题

-- 1. 检查 auth.users 表中的账号
SELECT 
  id,
  email,
  phone,
  email_confirmed_at,
  phone_confirmed_at,
  encrypted_password IS NOT NULL as has_password,
  created_at
FROM auth.users
WHERE phone = '13800000004' OR email = 'admin4@fleet.local';

-- 2. 检查 users 表中的账号
SELECT 
  id,
  phone,
  email,
  name,
  login_account,
  role,
  created_at
FROM users
WHERE phone = '13800000004' OR login_account = 'admin4';

-- 3. 检查密码是否正确加密
SELECT 
  phone,
  email,
  encrypted_password,
  LENGTH(encrypted_password) as password_length
FROM auth.users
WHERE phone = '13800000004';

-- 4. 测试密码验证
SELECT 
  phone,
  encrypted_password = crypt('admin123', encrypted_password) as password_match
FROM auth.users
WHERE phone = '13800000004';
