/*
# 修复 auth.users 表中的 NULL token 字段

## 问题
miaoda-auth-taro 库在查询用户时，期望 confirmation_token、recovery_token 等字段是字符串类型，
但这些字段在创建用户时默认为 NULL，导致查询时出现类型转换错误。

## 解决方案
将所有测试账号的 token 字段从 NULL 更新为空字符串 ''
*/

-- 更新所有测试账号的 token 字段
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE phone IN ('13800000000', '13800000001', '13800000002', '13800000003');