/*
# 修复老板账号在 public.profiles 中的角色

## 问题描述
当使用 Edge Function 创建租户时：
1. Edge Function 调用 `supabase.auth.admin.createUser` 创建老板账号
2. 设置 `phone_confirm: true` 和 `user_metadata.tenant_id`
3. `supabase.auth.admin.createUser` 在内部可能进行多次操作：
   - 首先 INSERT 记录
   - 然后 UPDATE 设置 `confirmed_at`（触发 `handle_new_user` 触发器）
   - 最后 UPDATE 设置 `raw_user_meta_data`
4. 当 `handle_new_user` 触发器执行时，`raw_user_meta_data` 中可能还没有 `tenant_id`
5. 触发器检查失败，在 public.profiles 中创建了记录，角色为 `driver`

## 解决方案
1. 修复现有老板账号在 public.profiles 中的角色
2. 优化 `handle_new_user` 触发器，在 INSERT 时也检查 `user_metadata`

## 修复步骤
1. 查找所有在 auth.users 中有 `user_metadata.tenant_id` 的用户
2. 更新这些用户在 public.profiles 中的角色为 `user_metadata.role`
3. 如果 `user_metadata.role` 不存在，则删除 public.profiles 中的记录
*/

-- 1. 修复老板账号的角色
-- 查找所有在 auth.users 中有 tenant_id 的用户，并更新他们在 public.profiles 中的角色
DO $$
DECLARE
  user_record RECORD;
  metadata_role TEXT;
BEGIN
  -- 遍历所有在 auth.users 中有 tenant_id 的用户
  FOR user_record IN 
    SELECT 
      au.id,
      au.raw_user_meta_data->>'tenant_id' as tenant_id,
      au.raw_user_meta_data->>'role' as role
    FROM auth.users au
    WHERE (au.raw_user_meta_data->>'tenant_id') IS NOT NULL
  LOOP
    -- 检查用户在 public.profiles 中是否有记录
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_record.id) THEN
      -- 如果有记录，删除它（租户用户不应该在 public.profiles 中有记录）
      DELETE FROM public.profiles WHERE id = user_record.id;
      RAISE NOTICE '已删除租户用户在 public.profiles 中的记录: % (tenant_id: %)', 
        user_record.id, user_record.tenant_id;
    END IF;
  END LOOP;
END $$;

-- 2. 优化 handle_new_user 触发器
-- 在 INSERT 时也检查 user_metadata，防止租户用户在 public.profiles 中创建记录
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count int;
  profile_exists boolean;
  is_tenant_user boolean;
BEGIN
  -- 检查是否为租户用户（user_metadata 中有 tenant_id）
  is_tenant_user := (NEW.raw_user_meta_data->>'tenant_id') IS NOT NULL;
  
  -- 如果是租户用户，跳过在 public.profiles 表中创建记录
  IF is_tenant_user THEN
    RETURN NEW;
  END IF;
  
  -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
  IF (TG_OP = 'UPDATE' AND OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL) OR
     (TG_OP = 'INSERT' AND NEW.confirmed_at IS NOT NULL) THEN
    -- 检查 profiles 记录是否已存在
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
    
    -- 如果记录不存在，才插入
    IF NOT profile_exists THEN
      -- 判断 profiles 表里有多少用户
      SELECT COUNT(*) INTO user_count FROM profiles;
      
      -- 插入 profiles，首位用户给 super_admin 角色
      INSERT INTO profiles (id, phone, email, role)
      VALUES (
        NEW.id,
        NEW.phone,
        NEW.email,
        CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. 更新触发器，同时在 INSERT 和 UPDATE 时触发
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user() IS '处理新用户确认：租户用户跳过，中央管理系统用户在 public.profiles 表中创建记录。支持 INSERT 和 UPDATE 事件。';
