/*
# 添加测试账号

## 说明
为系统添加4个测试账号，方便开发和测试使用。

## 测试账号列表
1. admin - 老板（BOSS）
   - 手机号：13800000000
   - 密码：admin123

2. admin1 - 车队长（DISPATCHER）
   - 手机号：13800000001
   - 密码：admin123

3. admin2 - 司机（DRIVER）
   - 手机号：13800000002
   - 密码：admin123

4. admin3 - 平级账号（DISPATCHER）
   - 手机号：13800000003
   - 密码：admin123

## 注意事项
- 这些账号仅用于开发和测试
- 生产环境应删除这些测试账号
- 密码为简单密码，仅供测试使用
*/

-- 插入测试用户到 users 表
-- 注意：这里使用固定的UUID，实际使用时应该先在 auth.users 中创建用户

-- 1. admin - 老板
INSERT INTO users (id, phone, name, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '13800000000',
  'admin（老板）',
  'admin@test.com'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- 分配 BOSS 角色
INSERT INTO user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'BOSS')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. admin1 - 车队长
INSERT INTO users (id, phone, name, email)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '13800000001',
  'admin1（车队长）',
  'admin1@test.com'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- 分配 DISPATCHER 角色
INSERT INTO user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000002', 'DISPATCHER')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. admin2 - 司机
INSERT INTO users (id, phone, name, email)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '13800000002',
  'admin2（司机）',
  'admin3@test.com'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- 分配 DRIVER 角色
INSERT INTO user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000003', 'DRIVER')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. admin3 - 平级账号（DISPATCHER）
INSERT INTO users (id, phone, name, email)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  '13800000003',
  'admin3（平级账号）',
  'admin3@test.com'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- 分配 DISPATCHER 角色
INSERT INTO user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000004', 'DISPATCHER')
ON CONFLICT (user_id, role) DO NOTHING;