/*
# 为admin888账号创建profile记录

/profile记录
*/

-- 为admin888创建profile记录
INSERT INTO profiles (
  id,
  name,
  email,
  role,
  login_account,
  status,
  created_at,
  updated_at
)
SELECT 
  u.id,
  '租赁管理员',
  u.email,
  'lease_admin'::user_role,
  'admin888',
  'active',
  now(),
  now()
FROM auth.users u
WHERE u.email = 'admin888@fleet.com'
  AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
  );
