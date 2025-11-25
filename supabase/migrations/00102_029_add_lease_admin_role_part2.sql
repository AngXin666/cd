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

-- 租赁管理员可以查看所有用户信息（只读）
CREATE POLICY "租赁管理员查看所有用户" ON profiles
  FOR SELECT TO authenticated
  USING (
    is_lease_admin_user(auth.uid())
  );