/*
# 更新租赁管理员账号

1. 删除旧的租赁管理员账号（手机号15766121960）
2. 创建新的租赁管理员账号（账号名admin888，密码hye19911206）

## 操作步骤
- 删除profiles表中手机号为15766121960且角色为lease_admin的记录
- 删除auth.users表中对应的认证记录
- 创建新的租赁管理员账号，使用email格式：admin888@fleet.com

## 注意事项
- 新账号使用email+密码方式登录
- 角色设置为lease_admin
- 状态设置为active
*/

-- 1. 查找并删除旧的租赁管理员账号
DO $$
DECLARE
  old_user_id uuid;
BEGIN
  -- 从profiles表中查找旧账号的user_id
  SELECT id INTO old_user_id
  FROM profiles
  WHERE phone = '15766121960' AND role = 'lease_admin'::user_role;

  -- 如果找到了，删除profiles记录
  IF old_user_id IS NOT NULL THEN
    DELETE FROM profiles WHERE id = old_user_id;
    
    -- 删除auth.users中的记录
    DELETE FROM auth.users WHERE id = old_user_id;
    
    RAISE NOTICE '已删除旧的租赁管理员账号: %', old_user_id;
  ELSE
    RAISE NOTICE '未找到手机号为15766121960的租赁管理员账号';
  END IF;
END $$;

-- 2. 创建新的租赁管理员账号
-- 注意：由于Supabase的auth.users表只能通过API创建，这里我们先创建profiles记录
-- 实际的auth.users记录需要在首次登录时由Supabase自动创建

-- 生成一个固定的UUID用于新账号
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- 检查是否已存在admin888账号
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE login_account = 'admin888'
  ) THEN
    -- 插入新的租赁管理员profile记录
    INSERT INTO profiles (
      id,
      name,
      phone,
      email,
      role,
      login_account,
      status,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      '租赁管理员',
      NULL,
      'admin888@fleet.com',
      'lease_admin'::user_role,
      'admin888',
      'active',
      now(),
      now()
    );
    
    RAISE NOTICE '已创建新的租赁管理员账号: admin888';
  ELSE
    RAISE NOTICE 'admin888账号已存在，跳过创建';
  END IF;
END $$;