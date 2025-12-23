/*
# 修复租赁管理员登录问题

## 问题描述
租赁管理员账户无法登录

## 解决方案
1. 重置租赁管理员密码
2. 确保账户状态正确
3. 确保tenant_id为NULL（租赁管理员不受租期限制）
4. 验证RLS策略正确配置

## 账号信息
- 邮箱：admin888@fleet.com
- 密码：hye19911206
- 角色：lease_admin
- 权限：最高权限，可访问所有租户数据
*/

-- 1. 更新租赁管理员密码
DO $$
DECLARE
  lease_admin_id uuid;
  new_encrypted_password text;
BEGIN
  -- 查找租赁管理员ID
  SELECT id INTO lease_admin_id
  FROM profiles
  WHERE role = 'lease_admin'::user_role
  LIMIT 1;

  IF lease_admin_id IS NOT NULL THEN
    -- 生成新的密码哈希
    new_encrypted_password := crypt('hye19911206', gen_salt('bf'));
    
    -- 更新auth.users表中的密码
    UPDATE auth.users
    SET 
      encrypted_password = new_encrypted_password,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = lease_admin_id;
    
    -- 确保profiles表中的信息正确
    UPDATE profiles
    SET
      tenant_id = NULL,  -- 租赁管理员不受租期限制
      status = 'active',
      updated_at = now()
    WHERE id = lease_admin_id;
    
    RAISE NOTICE '租赁管理员密码已重置，账户ID: %', lease_admin_id;
  ELSE
    RAISE NOTICE '未找到租赁管理员账户';
  END IF;
END $$;

-- 2. 确保is_lease_admin函数正确
CREATE OR REPLACE FUNCTION is_lease_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'lease_admin'::user_role
  );
$$;

-- 3. 确保租赁管理员可以查看所有用户（包括自己）
DROP POLICY IF EXISTS "租赁管理员可以查看所有用户" ON profiles;
CREATE POLICY "租赁管理员可以查看所有用户" ON profiles
  FOR SELECT TO authenticated
  USING (
    is_lease_admin()
  );

-- 4. 确保租赁管理员可以更新所有用户（包括自己）
DROP POLICY IF EXISTS "租赁管理员可以更新所有用户" ON profiles;
CREATE POLICY "租赁管理员可以更新所有用户" ON profiles
  FOR UPDATE TO authenticated
  USING (
    is_lease_admin()
  )
  WITH CHECK (
    is_lease_admin()
  );

-- 5. 确保租赁管理员可以插入新用户
DROP POLICY IF EXISTS "租赁管理员可以插入新用户" ON profiles;
CREATE POLICY "租赁管理员可以插入新用户" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_lease_admin()
  );

-- 6. 验证租赁管理员账户
DO $$
DECLARE
  lease_admin_record RECORD;
BEGIN
  SELECT 
    p.id,
    p.name,
    p.email,
    p.role,
    p.tenant_id,
    p.status,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    u.encrypted_password IS NOT NULL as has_password
  INTO lease_admin_record
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'lease_admin'::user_role
  LIMIT 1;

  IF lease_admin_record.id IS NOT NULL THEN
    RAISE NOTICE '=== 租赁管理员账户信息 ===';
    RAISE NOTICE 'ID: %', lease_admin_record.id;
    RAISE NOTICE '姓名: %', lease_admin_record.name;
    RAISE NOTICE '邮箱: %', lease_admin_record.email;
    RAISE NOTICE '角色: %', lease_admin_record.role;
    RAISE NOTICE '租户ID: %', lease_admin_record.tenant_id;
    RAISE NOTICE '状态: %', lease_admin_record.status;
    RAISE NOTICE '邮箱已确认: %', lease_admin_record.email_confirmed;
    RAISE NOTICE '已设置密码: %', lease_admin_record.has_password;
    RAISE NOTICE '登录账号: admin888';
    RAISE NOTICE '登录密码: hye19911206';
    RAISE NOTICE '========================';
  END IF;
END $$;
