/*
# 删除旧的多租户相关触发器（使用 CASCADE）

## 说明
删除以下不再需要的触发器和函数：
1. sync_system_admin_on_signup - 同步系统管理员（已废弃）
*/

-- 删除触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created_sync_system_admin ON auth.users;
DROP TRIGGER IF EXISTS sync_system_admin_on_signup ON auth.users;

-- 删除函数（使用 CASCADE）
DROP FUNCTION IF EXISTS sync_system_admin_on_signup() CASCADE;