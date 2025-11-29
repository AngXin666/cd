/*
# 修复 handle_new_user 触发器以适配单用户系统

## 说明
更新触发器以使用新的表结构：
- 使用 users 表替代 profiles 表
- 使用 user_roles 表存储角色
- 第一个用户自动成为 BOSS

## 变更
1. 检查 users 表而不是 profiles 表
2. 在 users 和 user_roles 表中插入记录
3. 第一个用户角色为 BOSS，其他用户为 DRIVER
*/

-- 重新创建触发器函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count int;
  user_exists boolean;
  default_role user_role;
BEGIN
  -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    -- 检查 users 记录是否已存在
    SELECT EXISTS(SELECT 1 FROM users WHERE id = NEW.id) INTO user_exists;
    
    -- 如果记录不存在，才插入
    IF NOT user_exists THEN
      -- 判断 users 表里有多少用户
      SELECT COUNT(*) INTO user_count FROM users;
      
      -- 第一个用户为 BOSS，其他用户为 DRIVER
      IF user_count = 0 THEN
        default_role := 'BOSS'::user_role;
      ELSE
        default_role := 'DRIVER'::user_role;
      END IF;
      
      -- 插入 users 表
      INSERT INTO users (id, phone, email, name, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.phone,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', '用户' || SUBSTRING(NEW.id::text, 1, 8)),
        NOW(),
        NOW()
      );
      
      -- 插入 user_roles 表
      INSERT INTO user_roles (user_id, role, created_at)
      VALUES (
        NEW.id,
        default_role,
        NOW()
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

COMMENT ON FUNCTION handle_new_user() IS '处理新用户确认：在 users 和 user_roles 表中创建记录，第一个用户为 BOSS';