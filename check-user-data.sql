-- 检查新创建用户的数据完整性

-- 1. 查询最近创建的司机（profiles 表）
SELECT 
  id,
  phone,
  name,
  role,
  login_account,
  email,
  created_at
FROM profiles 
WHERE role = 'driver' 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. 查询 auth.users 表中对应的记录
SELECT 
  a.id,
  a.email,
  a.phone,
  a.email_confirmed_at,
  a.phone_confirmed_at,
  a.created_at,
  p.name,
  p.role
FROM auth.users a
LEFT JOIN profiles p ON a.id = p.id
WHERE p.role = 'driver'
ORDER BY a.created_at DESC
LIMIT 5;

-- 3. 查找 profiles 中存在但 auth.users 中不存在的司机
SELECT 
  p.id,
  p.phone,
  p.name,
  p.email,
  p.login_account,
  p.created_at
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver'
AND a.id IS NULL
ORDER BY p.created_at DESC;

-- 4. 检查特定用户的完整信息（替换 USER_ID_HERE 为实际的用户ID）
-- SELECT 
--   p.id,
--   p.phone,
--   p.name,
--   p.role,
--   p.login_account,
--   p.email as profile_email,
--   p.created_at as profile_created_at,
--   a.email as auth_email,
--   a.phone as auth_phone,
--   a.email_confirmed_at,
--   a.phone_confirmed_at,
--   a.created_at as auth_created_at
-- FROM profiles p
-- LEFT JOIN auth.users a ON p.id = a.id
-- WHERE p.id = 'USER_ID_HERE';
