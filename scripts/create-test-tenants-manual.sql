-- 手动创建测试租户的 SQL 脚本
-- 请在 Supabase SQL Editor 中执行此脚本

-- ============================================================
-- 租户1：测试租户1
-- ============================================================

-- 1. 创建租户记录
INSERT INTO public.tenants (
  company_name,
  tenant_code,
  schema_name,
  status,
  boss_name,
  boss_phone
) VALUES (
  '测试租户1',
  'tenant-test1',
  'tenant_test1',
  'active',
  '老板1',
  '13900000001'
) ON CONFLICT (tenant_code) DO NOTHING;

-- 2. 创建租户 Schema 和表结构
SELECT create_tenant_schema('tenant_test1');

-- 3. 获取租户 ID（用于后续步骤）
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE tenant_code = 'tenant-test1';
  RAISE NOTICE '租户1 ID: %', v_tenant_id;
END $$;

-- ============================================================
-- 租户2：测试租户2
-- ============================================================

-- 1. 创建租户记录
INSERT INTO public.tenants (
  company_name,
  tenant_code,
  schema_name,
  status,
  boss_name,
  boss_phone
) VALUES (
  '测试租户2',
  'tenant-test2',
  'tenant_test2',
  'active',
  '老板2',
  '13900000002'
) ON CONFLICT (tenant_code) DO NOTHING;

-- 2. 创建租户 Schema 和表结构
SELECT create_tenant_schema('tenant_test2');

-- 3. 获取租户 ID（用于后续步骤）
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE tenant_code = 'tenant-test2';
  RAISE NOTICE '租户2 ID: %', v_tenant_id;
END $$;

-- ============================================================
-- 验证创建结果
-- ============================================================

-- 查看创建的租户
SELECT 
  id,
  company_name,
  tenant_code,
  schema_name,
  status,
  boss_name,
  boss_phone,
  created_at
FROM public.tenants
WHERE tenant_code IN ('tenant-test1', 'tenant-test2')
ORDER BY created_at;

-- 验证 Schema 是否创建成功
SELECT 
  schema_name
FROM information_schema.schemata
WHERE schema_name IN ('tenant_test1', 'tenant_test2')
ORDER BY schema_name;

-- ============================================================
-- 重要提示
-- ============================================================

/*
执行完此脚本后，你需要：

1. 记录租户 ID（从上面的查询结果中获取）

2. 使用中央管理系统的界面创建老板账号：
   - 登录中央管理系统（admin / 123456）
   - 进入租户管理
   - 为每个租户创建老板账号

3. 或者使用 Supabase Auth Admin API 创建账号：
   - 租户1 老板：13900000001 / admin1 / 123456
   - 租户2 老板：13900000002 / admin2 / 123456

4. 创建老板账号后，使用老板账号登录，在用户管理页面添加其他用户：
   - 平级管理员
   - 车队长
   - 司机

注意：
- 此脚本只创建租户记录和 Schema 结构
- 不创建用户账号（需要通过界面或 API 创建）
- 确保在开发环境中执行
*/
