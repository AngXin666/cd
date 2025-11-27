/*
# 创建5个测试租户和用户

## 测试数据说明

### 租户列表
1. 租户001 - 顺丰物流
2. 租户002 - 京东物流
3. 租户003 - 德邦快递
4. 租户004 - 中通快递
5. 租户005 - 圆通速递

### 用户账号
每个租户创建1个老板账号：
- 手机号：1380000000X（X为租户编号）
- 密码：password123（使用 bcrypt 加密）
- 角色：boss

### 模块配置
每个租户默认启用以下模块：
- vehicles（车辆管理）
- attendance（考勤管理）
- warehouses（仓库管理）

## 注意
密码哈希使用 bcrypt，轮数为 10
实际密码为：password123
*/

-- 使用 pgcrypto 扩展来生成密码哈希
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 创建一个函数来生成 bcrypt 哈希
-- 注意：这里使用 PostgreSQL 的 crypt 函数模拟 bcrypt
-- 实际密码：password123
-- bcrypt 哈希（轮数10）：$2a$10$rKvVPZqGvqVvVvVvVvVvVeK8K8K8K8K8K8K8K8K8K8K8K8K8K8

-- 1. 插入5个测试租户
INSERT INTO public.tenants (
  company_name,
  tenant_code,
  contact_name,
  contact_phone,
  contact_email,
  status,
  max_users,
  max_vehicles,
  activated_at,
  expired_at,
  notes
) VALUES
  (
    '顺丰物流',
    'tenant-001',
    '张三',
    '13800000001',
    'zhangsan@sf-express.com',
    'active',
    50,
    100,
    NOW(),
    NOW() + INTERVAL '1 year',
    '测试租户1 - 顺丰物流'
  ),
  (
    '京东物流',
    'tenant-002',
    '李四',
    '13800000002',
    'lisi@jd.com',
    'active',
    50,
    100,
    NOW(),
    NOW() + INTERVAL '1 year',
    '测试租户2 - 京东物流'
  ),
  (
    '德邦快递',
    'tenant-003',
    '王五',
    '13800000003',
    'wangwu@deppon.com',
    'active',
    50,
    100,
    NOW(),
    NOW() + INTERVAL '1 year',
    '测试租户3 - 德邦快递'
  ),
  (
    '中通快递',
    'tenant-004',
    '赵六',
    '13800000004',
    'zhaoliu@zto.com',
    'active',
    50,
    100,
    NOW(),
    NOW() + INTERVAL '1 year',
    '测试租户4 - 中通快递'
  ),
  (
    '圆通速递',
    'tenant-005',
    '孙七',
    '13800000005',
    'sunqi@yto.com',
    'active',
    50,
    100,
    NOW(),
    NOW() + INTERVAL '1 year',
    '测试租户5 - 圆通速递'
  );

-- 2. 为每个租户创建老板账号
-- 密码：password123
-- 使用 crypt 函数生成密码哈希
INSERT INTO public.user_credentials (
  tenant_id,
  phone,
  email,
  password_hash,
  name,
  role,
  status
)
SELECT
  t.id,
  t.contact_phone,
  t.contact_email,
  crypt('password123', gen_salt('bf', 10)),  -- bcrypt 哈希
  t.contact_name,
  'boss',
  'active'
FROM public.tenants t
WHERE t.tenant_code IN ('tenant-001', 'tenant-002', 'tenant-003', 'tenant-004', 'tenant-005');

-- 3. 为每个租户配置默认模块
INSERT INTO public.tenant_modules (
  tenant_id,
  module_name,
  module_display_name,
  is_enabled,
  config
)
SELECT
  t.id,
  module.name,
  module.display_name,
  true,
  '{}'::jsonb
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('vehicles', '车辆管理'),
    ('attendance', '考勤管理'),
    ('warehouses', '仓库管理')
) AS module(name, display_name)
WHERE t.tenant_code IN ('tenant-001', 'tenant-002', 'tenant-003', 'tenant-004', 'tenant-005');

-- 4. 创建一个系统管理员账号
-- 邮箱：admin@fleet.com
-- 密码：admin123
INSERT INTO public.system_admins (
  name,
  email,
  phone,
  password_hash,
  role,
  status
) VALUES (
  '系统管理员',
  'admin@fleet.com',
  '13900000000',
  crypt('admin123', gen_salt('bf', 10)),
  'super_admin',
  'active'
);

-- 5. 记录审计日志
INSERT INTO public.audit_logs (
  action,
  action_category,
  details,
  status
) VALUES (
  'create_test_data',
  'system',
  jsonb_build_object(
    'description', '创建5个测试租户和用户',
    'tenants_count', 5,
    'users_count', 5,
    'admin_count', 1
  ),
  'success'
);