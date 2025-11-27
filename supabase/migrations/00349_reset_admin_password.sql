/*
# 重置中央管理员密码

## 说明
重新设置管理员密码为：hye19911206
使用正确的 bcrypt 加密方式
*/

-- 更新密码
UPDATE auth.users
SET 
  encrypted_password = crypt('hye19911206', gen_salt('bf')),
  updated_at = NOW()
WHERE phone = '13800000001';

-- 验证更新
SELECT id, phone, email, encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE phone = '13800000001';
