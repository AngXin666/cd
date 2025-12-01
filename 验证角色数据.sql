-- 验证数据库中的角色数据

-- 1. 查看所有用户及其角色
SELECT 
  u.id,
  u.name,
  u.phone,
  ur.role,
  u.created_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at;

-- 2. 统计各角色的用户数量
SELECT 
  COALESCE(ur.role::text, '无角色') as role,
  COUNT(*) as count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY ur.role;

-- 3. 查看 BOSS 角色的用户
SELECT 
  u.id,
  u.name,
  u.phone,
  ur.role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'BOSS';

-- 4. 查看 MANAGER 角色的用户
SELECT 
  u.id,
  u.name,
  u.phone,
  ur.role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'MANAGER';

-- 5. 查看仓库分配情况
SELECT 
  u.name as user_name,
  ur.role,
  w.name as warehouse_name
FROM warehouse_assignments wa
JOIN users u ON wa.user_id = u.id
JOIN warehouses w ON wa.warehouse_id = w.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.name;
