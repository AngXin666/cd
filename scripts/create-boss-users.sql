-- 为测试租户创建老板账号的 SQL 脚本
-- 请在 Supabase SQL Editor 中执行此脚本

-- ============================================================
-- 重要提示
-- ============================================================
/*
由于无法直接在 SQL 中创建带密码的用户（需要密码哈希），
此脚本提供两种方法：

方法1：使用 Supabase Dashboard（推荐）
方法2：使用中央管理系统界面

请选择其中一种方法执行。
*/

-- ============================================================
-- 方法1：使用 Supabase Dashboard 创建用户（推荐）
-- ============================================================

/*
步骤：
1. 打开 Supabase Dashboard
2. 进入 Authentication > Users
3. 点击 "Add user" 按钮
4. 创建以下两个用户：

用户1（租户1老板）：
- Phone: 13900000001
- Password: 123456
- Email: admin1@fleet.local (可选)
- Auto Confirm User: ✅ 勾选

用户2（租户2老板）：
- Phone: 13900000002
- Password: 123456
- Email: admin2@fleet.local (可选)
- Auto Confirm User: ✅ 勾选

5. 创建完成后，记录每个用户的 ID
6. 执行下面的 SQL 语句，将 USER_ID_1 和 USER_ID_2 替换为实际的用户 ID
*/

-- ============================================================
-- 创建完用户后，执行以下 SQL
-- ============================================================

-- 为租户1老板创建 profile（在租户 Schema 中）
-- 替换 'USER_ID_1' 为实际的用户 ID
INSERT INTO tenant_test1.profiles (id, name, phone, role, status)
VALUES (
  'USER_ID_1',  -- ⚠️ 替换为实际的用户 ID
  '老板1',
  '13900000001',
  'boss',
  'active'
);

-- 更新租户1记录
UPDATE public.tenants
SET 
  boss_user_id = 'USER_ID_1',  -- ⚠️ 替换为实际的用户 ID
  boss_name = '老板1',
  boss_phone = '13900000001'
WHERE id = '26d10bc2-d13b-44b0-ac9f-dec469cfadc9';

-- 为租户2老板创建 profile（在租户 Schema 中）
-- 替换 'USER_ID_2' 为实际的用户 ID
INSERT INTO tenant_test2.profiles (id, name, phone, role, status)
VALUES (
  'USER_ID_2',  -- ⚠️ 替换为实际的用户 ID
  '老板2',
  '13900000002',
  'boss',
  'active'
);

-- 更新租户2记录
UPDATE public.tenants
SET 
  boss_user_id = 'USER_ID_2',  -- ⚠️ 替换为实际的用户 ID
  boss_name = '老板2',
  boss_phone = '13900000002'
WHERE id = '52ff28a4-5edc-46eb-bc94-69252cadaf97';

-- ============================================================
-- 验证创建结果
-- ============================================================

-- 查看租户信息
SELECT 
  id,
  company_name,
  boss_name,
  boss_phone,
  boss_user_id,
  status
FROM public.tenants
WHERE id IN ('26d10bc2-d13b-44b0-ac9f-dec469cfadc9', '52ff28a4-5edc-46eb-bc94-69252cadaf97');

-- 查看租户1的 profiles
SELECT id, name, phone, role, status
FROM tenant_test1.profiles;

-- 查看租户2的 profiles
SELECT id, name, phone, role, status
FROM tenant_test2.profiles;

-- 查看 auth.users 中的用户
SELECT 
  id,
  phone,
  email,
  confirmed_at,
  created_at
FROM auth.users
WHERE phone IN ('13900000001', '13900000002')
ORDER BY created_at;

-- ============================================================
-- 方法2：使用中央管理系统界面
-- ============================================================

/*
如果你更喜欢使用界面操作：

1. 登录中央管理系统
   - 账号：admin 或 13800000001
   - 密码：123456

2. 进入"租户管理"页面

3. 找到"测试租户1"，点击"编辑"或"管理"按钮

4. 在租户详情页面，应该有"创建老板账号"的选项

5. 填写老板信息：
   - 姓名：老板1
   - 手机号：13900000001
   - 密码：123456

6. 对"测试租户2"重复相同操作

注意：如果界面没有"创建老板账号"的功能，请使用方法1。
*/
