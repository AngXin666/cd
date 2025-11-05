/*
# 修复测试账号密码

使用 PostgreSQL 的 crypt() 函数为测试账号设置正确的密码。
这是设置密码的正确方式，确保密码可以被 Supabase Auth 正确验证。

## 密码信息
- 明文密码：123456
- 使用 crypt() 函数自动生成 bcrypt 哈希

## 更新的账号
- admin (超级管理员)
- admin1 (司机)
- admin2 (普通管理员)
*/

-- 使用 crypt() 函数生成正确的密码哈希
UPDATE auth.users 
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE phone IN ('admin', 'admin1', 'admin2');
