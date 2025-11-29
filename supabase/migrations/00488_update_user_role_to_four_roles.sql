/*
# 更新用户角色为四个明确角色

## 说明
明确系统中只有4个角色：
1. BOSS - 老板，拥有最高权限
2. PEER_ADMIN - 平级账户，与老板同级的管理员
3. MANAGER - 车队长，管理司机和车辆
4. DRIVER - 司机，基础用户

## 变更内容
1. 将 SUPER_ADMIN 角色更新为 BOSS
2. 添加 PEER_ADMIN 角色
3. 保留 MANAGER 和 DRIVER 角色
4. 删除其他所有角色定义

## 迁移步骤
1. 将所有表中的 role 列临时改为 text 类型
2. 更新所有使用旧角色名称的记录
3. 删除旧的枚举类型
4. 创建新的枚举类型
5. 将列改回枚举类型

## 注意事项
- 此迁移会更新所有现有数据
- SUPER_ADMIN → BOSS
- MANAGER → MANAGER（保持不变）
- DRIVER → DRIVER（保持不变）
*/

-- 1. 首先将所有表中的 role 列临时改为 text 类型
ALTER TABLE users ALTER COLUMN role TYPE text;
ALTER TABLE user_role_assignments ALTER COLUMN role TYPE text;

-- 2. 更新所有使用旧角色名称的记录
UPDATE users SET role = 'BOSS' WHERE role = 'SUPER_ADMIN';
UPDATE user_role_assignments SET role = 'BOSS' WHERE role = 'SUPER_ADMIN';

-- 3. 删除旧的枚举类型
DROP TYPE IF EXISTS user_role CASCADE;

-- 4. 创建新的枚举类型（只包含4个角色）
CREATE TYPE user_role AS ENUM ('BOSS', 'PEER_ADMIN', 'MANAGER', 'DRIVER');

-- 5. 将列改回枚举类型
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE user_role_assignments ALTER COLUMN role TYPE user_role USING role::user_role;

-- 6. 更新 profiles 视图以使用新的角色类型
DROP VIEW IF EXISTS profiles CASCADE;

CREATE OR REPLACE VIEW profiles AS
SELECT 
  u.id,
  u.phone,
  u.email,
  u.name,
  u.avatar_url,
  u.created_at,
  u.updated_at,
  COALESCE(ur.role, 'DRIVER'::user_role) as role
FROM users u
LEFT JOIN user_role_assignments ur ON u.id = ur.user_id;

-- 7. 更新触发器函数，确保第一个用户是 BOSS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
BEGIN
  -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    -- 判断 users 表里有多少用户
    SELECT COUNT(*) INTO user_count FROM users;
    
    -- 插入 users 表
    INSERT INTO users (id, phone, email, name)
    VALUES (
      NEW.id,
      NEW.phone,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', '用户')
    );
    
    -- 插入 user_role_assignments 表，首位用户给 BOSS 角色
    INSERT INTO user_role_assignments (user_id, role)
    VALUES (
      NEW.id,
      CASE WHEN user_count = 0 THEN 'BOSS'::user_role ELSE 'DRIVER'::user_role END
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 8. 确保触发器绑定到 auth.users 表
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
