/*
# 创建中央管理系统管理员账号

## 说明
创建一个中央管理系统管理员账号，用于管理所有租户。

## 账号信息
- 手机号：13800000001
- 密码：hye19911206
- 姓名：中央管理员

## 实现方式
1. 在 auth.users 表中创建账号（使用 Supabase Auth 的内部函数）
2. 在 system_admins 表中添加记录

注意：由于 Supabase 的限制，我们无法直接通过 SQL 创建 auth.users 记录。
需要通过应用程序的注册流程或 Supabase Dashboard 手动创建。

## 临时方案
先在 system_admins 表中预留记录，等待账号创建后关联。
*/

-- 清理可能存在的旧记录
DELETE FROM system_admins WHERE phone = '13800000001';

-- 创建 system_admins 记录（使用固定的 UUID）
-- 注意：这个 UUID 需要与后续创建的 auth.users 记录的 ID 匹配
INSERT INTO system_admins (id, name, email, phone, status)
VALUES (
  'aa7ff96f-3594-49e8-a899-680f229896be'::uuid,
  '中央管理员',
  'central-admin@system.local',
  '13800000001',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status;

-- 创建一个辅助函数，用于检查和同步 system_admins
CREATE OR REPLACE FUNCTION sync_system_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 如果新注册的用户手机号是 13800000001，自动添加到 system_admins
  IF NEW.phone = '13800000001' THEN
    INSERT INTO system_admins (id, name, email, phone, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', '中央管理员'),
      COALESCE(NEW.email, 'central-admin@system.local'),
      NEW.phone,
      'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      status = EXCLUDED.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created_sync_system_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_system_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_system_admin_on_signup();
