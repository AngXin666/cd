/*
# 修复 auth.users 表中的 NULL 字段

## 问题
auth.users 表中的某些字段（如 email_change、email_change_token_new 等）为 NULL
导致 Supabase Auth 的 Go 后端在扫描时出错，影响登录和其他功能

## 解决方案
1. 将所有 NULL 值的字段更新为空字符串
2. 为这些字段设置默认值，防止未来出现 NULL

## 修改内容
- 更新现有用户的 NULL 字段为空字符串
- 设置字段的默认值为空字符串
*/

-- 更新现有用户的 NULL 字段为空字符串
UPDATE auth.users
SET 
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, '')
WHERE 
  email_change IS NULL 
  OR email_change_token_new IS NULL 
  OR email_change_token_current IS NULL
  OR phone_change IS NULL 
  OR phone_change_token IS NULL;

-- 设置字段的默认值（如果可能）
-- 注意：auth.users 表由 Supabase 管理，我们只能更新数据，不能修改表结构
