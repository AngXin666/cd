-- 修复用户角色数据
-- 为现有用户添加角色

-- 步骤1：检查当前状态
SELECT 
  '用户总数' as metric,
  COUNT(*) as count
FROM users
UNION ALL
SELECT 
  '有角色的用户数' as metric,
  COUNT(DISTINCT user_id) as count
FROM user_roles
UNION ALL
SELECT 
  '无角色的用户数' as metric,
  COUNT(*) as count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role IS NULL;

-- 步骤2：为第一个用户添加 SUPER_ADMIN 角色（如果还没有）
-- 注意：请将 '<第一个用户的ID>' 替换为实际的用户ID
-- 可以通过以下查询获取第一个用户的ID：
-- SELECT id FROM users ORDER BY created_at LIMIT 1;

-- 示例（请替换实际的用户ID）：
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'SUPER_ADMIN'
-- FROM users
-- WHERE id NOT IN (SELECT user_id FROM user_roles)
-- ORDER BY created_at
-- LIMIT 1
-- ON CONFLICT (user_id) DO NOTHING;

-- 步骤3：为其他用户添加默认角色（DRIVER）
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'DRIVER'
-- FROM users
-- WHERE id NOT IN (SELECT user_id FROM user_roles)
-- ON CONFLICT (user_id) DO NOTHING;

-- 步骤4：验证结果
SELECT 
  u.id,
  u.name,
  u.phone,
  COALESCE(ur.role, '无角色') as role,
  u.created_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at;

-- 步骤5：统计各角色的用户数量
SELECT 
  COALESCE(ur.role, '无角色') as role,
  COUNT(*) as count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY ur.role;
