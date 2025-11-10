-- 检查用户数据一致性

-- 1. 查询所有司机的 profiles 和 auth.users 记录
SELECT 
  p.id,
  p.phone,
  p.name,
  p.role,
  p.login_account,
  p.email as profile_email,
  p.created_at as profile_created_at,
  a.email as auth_email,
  a.phone as auth_phone,
  a.email_confirmed_at,
  a.phone_confirmed_at,
  a.confirmation_token,
  a.recovery_token,
  a.email_change_token_new,
  a.email_change,
  a.created_at as auth_created_at,
  CASE 
    WHEN a.id IS NULL THEN '❌ auth.users 不存在'
    WHEN a.confirmation_token IS NULL THEN '⚠️ confirmation_token 为 NULL'
    WHEN a.recovery_token IS NULL THEN '⚠️ recovery_token 为 NULL'
    WHEN a.email_change_token_new IS NULL THEN '⚠️ email_change_token_new 为 NULL'
    WHEN a.email_change IS NULL THEN '⚠️ email_change 为 NULL'
    ELSE '✅ auth.users 完整'
  END as status
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver'
ORDER BY p.created_at DESC;

-- 2. 统计数据一致性
SELECT 
  COUNT(*) as total_drivers,
  COUNT(a.id) as drivers_with_auth,
  COUNT(*) - COUNT(a.id) as drivers_without_auth,
  COUNT(CASE WHEN a.confirmation_token IS NULL THEN 1 END) as null_confirmation_token,
  COUNT(CASE WHEN a.recovery_token IS NULL THEN 1 END) as null_recovery_token,
  COUNT(CASE WHEN a.email_change_token_new IS NULL THEN 1 END) as null_email_change_token,
  COUNT(CASE WHEN a.email_change IS NULL THEN 1 END) as null_email_change
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver';

-- 3. 查找缺少 auth.users 记录的司机
SELECT 
  p.id,
  p.phone,
  p.name,
  p.login_account,
  p.created_at
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver'
AND a.id IS NULL
ORDER BY p.created_at DESC;

-- 4. 查找 token 列为 NULL 的用户
SELECT 
  p.id,
  p.phone,
  p.name,
  a.confirmation_token IS NULL as ct_null,
  a.recovery_token IS NULL as rt_null,
  a.email_change_token_new IS NULL as ect_null,
  a.email_change IS NULL as ec_null
FROM profiles p
INNER JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver'
AND (
  a.confirmation_token IS NULL 
  OR a.recovery_token IS NULL 
  OR a.email_change_token_new IS NULL 
  OR a.email_change IS NULL
)
ORDER BY p.created_at DESC;
