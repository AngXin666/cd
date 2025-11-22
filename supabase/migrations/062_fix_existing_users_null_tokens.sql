/*
# 修复现有用户的 NULL token 问题

## 问题
虽然我们修复了 create_user_auth_account 函数，使新创建的用户不会有 NULL token 问题，
但是在修复之前创建的用户仍然存在 confirmation_token 等列为 NULL 的问题，
导致这些用户无法登录。

## 解决方案
更新所有现有用户的 auth.users 记录，将 NULL 的 token 列设置为空字符串。

## 修改内容
- 将 confirmation_token 从 NULL 更新为空字符串
- 将 recovery_token 从 NULL 更新为空字符串
- 将 email_change_token_new 从 NULL 更新为空字符串
- 将 email_change 从 NULL 更新为空字符串
- 确保 confirmed_at 不为 NULL（如果为 NULL，设置为 email_confirmed_at 或 created_at）
*/

-- 更新所有现有用户的 token 列，将 NULL 替换为空字符串
-- 注意：confirmed_at 是生成列，不能直接更新
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE 
  confirmation_token IS NULL 
  OR recovery_token IS NULL 
  OR email_change_token_new IS NULL 
  OR email_change IS NULL;

-- 添加注释
COMMENT ON TABLE auth.users IS '用户认证表，所有 token 相关的列应该使用空字符串而不是 NULL';
