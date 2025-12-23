/*
# 删除旧的多租户相关触发器

## 说明
删除以下不再需要的触发器和函数：
1. sync_system_admin_on_signup - 同步系统管理员（已废弃）
2. 其他多租户相关的触发器
*/

-- 删除触发器
DROP TRIGGER IF EXISTS sync_system_admin_on_signup ON auth.users;

-- 删除函数
DROP FUNCTION IF EXISTS sync_system_admin_on_signup();