-- 查询所有用户账号
SELECT 
  p.id,
  p.phone,
  p.name,
  p.role,
  p.login_account,
  p.created_at,
  CASE 
    WHEN a.id IS NULL THEN '❌ 无auth记录'
    ELSE '✅ 有auth记录'
  END as auth_status
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
ORDER BY 
  CASE 
    WHEN p.role = 'super_admin' THEN 1
    WHEN p.role = 'manager' THEN 2
    WHEN p.role = 'driver' THEN 3
    ELSE 4
  END,
  p.created_at ASC;

-- 统计各角色的用户数量
SELECT 
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY 
  CASE 
    WHEN role = 'super_admin' THEN 1
    WHEN role = 'manager' THEN 2
    WHEN role = 'driver' THEN 3
    ELSE 4
  END;
