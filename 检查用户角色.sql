-- 检查用户角色表数据

-- 1. 查看所有用户
SELECT id, name, phone, email, created_at
FROM users
ORDER BY created_at;

-- 2. 查看所有用户角色
SELECT user_id, role, created_at
FROM user_roles
ORDER BY created_at;

-- 3. 查看用户和角色的关联
SELECT 
  u.id,
  u.name,
  u.phone,
  ur.role,
  u.created_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at;

-- 4. 统计各角色的用户数量
SELECT 
  COALESCE(ur.role, '无角色') as role,
  COUNT(*) as count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY ur.role;

-- 5. 查找没有角色的用户
SELECT u.id, u.name, u.phone, u.email
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role IS NULL;
