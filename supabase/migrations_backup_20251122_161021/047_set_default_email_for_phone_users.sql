/*
# 为手机号用户设置默认 email

## 问题
某些用户只有手机号，没有 email，导致 email 字段为 NULL
这可能导致 Supabase Auth 的某些功能出现问题

## 解决方案
为没有 email 的用户生成一个默认 email：{phone}@phone.local

## 修改内容
- 为所有 email 为 NULL 的用户设置默认 email
*/

-- 为没有 email 的用户设置默认 email
UPDATE auth.users
SET email = phone || '@phone.local'
WHERE email IS NULL AND phone IS NOT NULL;
