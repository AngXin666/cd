/*
# 修复 handle_new_user 触发器以正确处理租户用户

## 问题描述
当创建新租户时：
1. Edge Function 创建用户，设置 user_metadata.role = 'boss' 和 user_metadata.tenant_id
2. 由于设置了 phone_confirm: true，用户立即被确认
3. handle_new_user 触发器被触发，在 public.profiles 表中插入记录，默认角色为 'driver'
4. Edge Function 然后在租户 Schema 中插入 profile，角色为 'boss'
5. 当老板登录后，前端从 public.profiles 表查询，得到角色 'driver'，而不是从租户 Schema 查询

## 解决方案
修改 handle_new_user 触发器，检查 user_metadata 中是否有 tenant_id：
- 如果有 tenant_id，说明这是租户用户，跳过在 public.profiles 表中创建记录
- 如果没有 tenant_id，说明这是中央管理系统用户，在 public.profiles 表中创建记录

## 注意事项
- 租户用户的 profile 应该只存在于租户 Schema 中
- 中央管理系统用户（超级管理员）的 profile 存在于 public.profiles 表中
*/

-- 重新创建触发器函数，添加租户用户检查
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
  -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    -- 检查是否为租户用户（user_metadata 中有 tenant_id）
    is_tenant_user := (NEW.raw_user_meta_data->>'tenant_id') IS NOT NULL;
    
    -- 如果是租户用户，跳过在 public.profiles 表中创建记录
    IF is_tenant_user THEN
      RETURN NEW;
    END IF;
    
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

-- 确保触发器存在
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user() IS '处理新用户确认：租户用户跳过，中央管理系统用户在 public.profiles 表中创建记录';
