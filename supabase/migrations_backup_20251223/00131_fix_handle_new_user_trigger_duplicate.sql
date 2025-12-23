/*
# 修复 handle_new_user 触发器的重复插入问题

## 问题
当手动确认用户邮箱时，触发器会尝试插入 profiles 记录。
但如果 profiles 记录已经存在（通过前端代码直接插入），会导致主键冲突。

## 解决方案
在触发器中检查 profiles 记录是否已存在，如果存在则跳过插入。
*/

-- 重新创建触发器函数，添加重复检查
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count int;
  profile_exists boolean;
BEGIN
  -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
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
