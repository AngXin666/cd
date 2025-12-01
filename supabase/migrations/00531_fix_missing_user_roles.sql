/*
# 修复缺失的用户角色

## 问题描述
部分用户在 users 表中存在，但在 user_roles 表中没有对应的角色记录，
导致通知系统无法找到主账号（老板）和车队长。

## 解决方案
为所有没有角色的用户添加默认角色：
- 第一个用户（按创建时间排序）：BOSS
- 其他用户：DRIVER

注意：user_role 枚举值为 ('BOSS', 'PEER_ADMIN', 'MANAGER', 'DRIVER')

## 变更内容
1. 查找没有角色的用户
2. 为第一个用户添加 BOSS 角色
3. 为其他用户添加 DRIVER 角色
*/

-- 1. 为第一个用户添加 BOSS 角色（如果还没有）
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
  u.id,
  'BOSS'::user_role,
  NOW()
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role IS NULL
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- 2. 为其他没有角色的用户添加 DRIVER 角色
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
  u.id,
  'DRIVER'::user_role,
  NOW()
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. 验证结果：显示所有用户及其角色
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
  COALESCE(ur.role::text, '无角色') as role,
  COUNT(*) as count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY ur.role
ORDER BY 
  CASE ur.role
    WHEN 'BOSS' THEN 1
    WHEN 'PEER_ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'DRIVER' THEN 4
    ELSE 5
  END;
