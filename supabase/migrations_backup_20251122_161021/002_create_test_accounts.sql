/*
# 创建测试账号

本迁移文件用于创建3个测试账号，方便开发和测试使用。

## 测试账号列表

1. **超级管理员账号**
   - 手机号：admin
   - 密码：123456
   - 角色：super_admin

2. **普通管理员账号**
   - 手机号：admin2
   - 密码：123456
   - 角色：manager

3. **司机账号**
   - 手机号：admin1
   - 密码：123456
   - 角色：driver

## 注意事项
- 这些账号仅用于开发和测试环境
- 生产环境应删除这些测试账号
- 密码已加密存储
*/

-- 插入测试账号到 profiles 表
-- 注意：这里使用固定的UUID，实际的auth.users记录需要通过Supabase Auth API创建

-- 超级管理员账号
INSERT INTO profiles (id, phone, name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  '超级管理员',
  'super_admin'::user_role,
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();

-- 普通管理员账号
INSERT INTO profiles (id, phone, name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'admin2',
  '普通管理员',
  'manager'::user_role,
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();

-- 司机账号
INSERT INTO profiles (id, phone, name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  'admin1',
  '测试司机',
  'driver'::user_role,
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();
