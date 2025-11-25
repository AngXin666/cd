/*
# 添加租赁管理员角色

## 说明
为系统添加新的租赁管理员角色（lease_admin），专门用于管理车辆租赁业务。

## 变更内容

### 1. 更新角色枚举类型
- 添加 'lease_admin' 到 user_role 枚举类型

### 2. 创建租赁管理员账号
- 手机号：15766121960
- 角色：lease_admin
- 登录方式：仅验证码登录

### 3. 更新 RLS 策略
- 租赁管理员可以查看和管理所有租赁信息
- 租赁管理员可以查看相关的车辆和司机信息

## 权限说明
租赁管理员（lease_admin）权限：
- ✅ 查看所有租赁信息
- ✅ 创建租赁记录
- ✅ 编辑租赁记录
- ✅ 删除租赁记录
- ✅ 查看相关车辆信息
- ✅ 查看相关司机信息
*/

-- ============================================
-- 1. 更新角色枚举类型
-- ============================================

-- 添加新的角色类型
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lease_admin';

COMMENT ON TYPE user_role IS '用户角色：driver(司机), manager(车队长), super_admin(超级管理员), lease_admin(租赁管理员)';

-- ============================================
-- 2. 创建租赁管理员账号
-- ============================================

-- 注意：实际的用户账号需要通过 Supabase Auth 创建
-- 这里只是预留 profile 记录的插入逻辑

-- 如果租赁管理员账号已存在于 auth.users，则创建 profile
-- 否则需要先通过验证码登录创建 auth.users 记录

-- 创建一个函数来初始化租赁管理员账号
CREATE OR REPLACE FUNCTION init_lease_admin_profile(
  user_id uuid,
  phone_number text DEFAULT '15766121960'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 插入或更新 profile
  INSERT INTO profiles (
    id,
    phone,
    name,
    role,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    phone_number,
    '租赁管理员',
    'lease_admin'::user_role,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'lease_admin'::user_role,
    phone = phone_number,
    updated_at = now();
  
  RAISE NOTICE '租赁管理员账号初始化成功: %', phone_number;
END;
$$;

COMMENT ON FUNCTION init_lease_admin_profile(uuid, text) IS '初始化租赁管理员账号';

-- ============================================
-- 3. 创建租赁管理员权限检查函数
-- ============================================

-- 检查用户是否为租赁管理员
CREATE OR REPLACE FUNCTION is_lease_admin_user(user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'lease_admin'
  );
$$;

COMMENT ON FUNCTION is_lease_admin_user(uuid) IS '检查用户是否为租赁管理员';

-- ============================================
-- 4. 更新 vehicle_leases 表的 RLS 策略
-- ============================================

-- 删除旧的 SELECT 策略
DROP POLICY IF EXISTS "司机查看自己的租赁" ON vehicle_leases;
DROP POLICY IF EXISTS "管理员查看所有租赁" ON vehicle_leases;

-- 创建新的 SELECT 策略

-- 司机查看自己的租赁
CREATE POLICY "司机查看自己的租赁_v2" ON vehicle_leases
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'
    )
  );

-- 管理员查看所有租赁
CREATE POLICY "管理员查看所有租赁_v2" ON vehicle_leases
  FOR SELECT TO authenticated
  USING (
    is_manager_user(auth.uid()) 
    OR is_super_admin_user(auth.uid())
    OR is_lease_admin_user(auth.uid())
  );

-- 更新 INSERT 策略

-- 删除旧的 INSERT 策略
DROP POLICY IF EXISTS "管理员创建租赁记录" ON vehicle_leases;

-- 创建新的 INSERT 策略
CREATE POLICY "管理员创建租赁记录_v2" ON vehicle_leases
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_manager_user(auth.uid()) 
     OR is_super_admin_user(auth.uid())
     OR is_lease_admin_user(auth.uid()))
    AND created_by = auth.uid()
  );

-- 更新 UPDATE 策略

-- 删除旧的 UPDATE 策略
DROP POLICY IF EXISTS "管理员更新租赁记录" ON vehicle_leases;

-- 创建新的 UPDATE 策略
CREATE POLICY "管理员更新租赁记录_v2" ON vehicle_leases
  FOR UPDATE TO authenticated
  USING (
    is_manager_user(auth.uid()) 
    OR is_super_admin_user(auth.uid())
    OR is_lease_admin_user(auth.uid())
  )
  WITH CHECK (
    is_manager_user(auth.uid()) 
    OR is_super_admin_user(auth.uid())
    OR is_lease_admin_user(auth.uid())
  );

-- 更新 DELETE 策略

-- 删除旧的 DELETE 策略
DROP POLICY IF EXISTS "超级管理员删除租赁记录" ON vehicle_leases;

-- 创建新的 DELETE 策略
CREATE POLICY "管理员删除租赁记录" ON vehicle_leases
  FOR DELETE TO authenticated
  USING (
    is_super_admin_user(auth.uid())
    OR is_lease_admin_user(auth.uid())
  );

-- ============================================
-- 5. 更新 vehicles 表的 RLS 策略（租赁管理员需要查看车辆）
-- ============================================

-- 删除旧的 SELECT 策略
DROP POLICY IF EXISTS "管理员查看所有车辆" ON vehicles;

-- 创建新的 SELECT 策略
CREATE POLICY "管理员查看所有车辆_v2" ON vehicles
  FOR SELECT TO authenticated
  USING (
    is_manager_user(auth.uid()) 
    OR is_super_admin_user(auth.uid())
    OR is_lease_admin_user(auth.uid())
  );

-- ============================================
-- 6. 更新 profiles 表的 RLS 策略（租赁管理员需要查看司机信息）
-- ============================================

-- 租赁管理员可以查看所有用户信息（只读）
CREATE POLICY "租赁管理员查看所有用户" ON profiles
  FOR SELECT TO authenticated
  USING (
    is_lease_admin_user(auth.uid())
  );

-- ============================================
-- 7. 验证配置
-- ============================================

-- 检查角色枚举是否包含 lease_admin
DO $$
DECLARE
  has_lease_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role'
    AND e.enumlabel = 'lease_admin'
  ) INTO has_lease_admin;
  
  IF has_lease_admin THEN
    RAISE NOTICE '✓ 角色枚举已包含 lease_admin';
  ELSE
    RAISE WARNING '✗ 角色枚举不包含 lease_admin';
  END IF;
END $$;

-- 检查 RLS 策略是否创建成功
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'vehicle_leases'
  AND policyname LIKE '%v2';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✓ vehicle_leases 表的 RLS 策略已更新';
  ELSE
    RAISE WARNING '✗ vehicle_leases 表的 RLS 策略更新不完整';
  END IF;
END $$;

-- ============================================
-- 8. 使用说明
-- ============================================

/*
## 创建租赁管理员账号步骤

1. 使用手机号 15766121960 通过验证码登录小程序
2. 登录成功后，系统会自动创建 auth.users 记录
3. 执行以下 SQL 初始化 profile：

```sql
-- 获取用户 ID（登录后执行）
SELECT id FROM auth.users WHERE phone = '15766121960';

-- 初始化租赁管理员 profile（替换 'user-id' 为实际的用户 ID）
SELECT init_lease_admin_profile('user-id'::uuid, '15766121960');
```

4. 验证账号创建成功：

```sql
SELECT id, phone, name, role 
FROM profiles 
WHERE phone = '15766121960';
```

## 权限验证

```sql
-- 检查租赁管理员是否可以查看所有租赁
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'lease-admin-user-id';

SELECT * FROM vehicle_leases;
-- 应该返回所有租赁记录

-- 检查租赁管理员是否可以创建租赁
INSERT INTO vehicle_leases (
  vehicle_id,
  driver_id,
  start_date,
  monthly_rent,
  deposit
) VALUES (
  'vehicle-id',
  'driver-id',
  '2025-01-01',
  3000,
  10000
);
-- 应该成功创建
```
*/
