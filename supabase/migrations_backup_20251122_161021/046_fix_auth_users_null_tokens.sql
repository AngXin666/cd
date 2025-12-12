/*
# 修复 auth.users 表中的 NULL token 字段

## 问题描述
在查询用户时出现错误：
"error finding user: sql: Scan error on column index 3, name "confirmation_token": 
converting NULL to string is unsupported"

## 根本原因
auth.users 表中的某些 token 字段（如 confirmation_token、recovery_token 等）的值为 NULL，
而 Supabase 的 Go 客户端在扫描这些字段时期望得到字符串类型，不支持 NULL 值。

## 受影响的字段
1. confirmation_token - 确认令牌
2. recovery_token - 恢复令牌
3. email_change_token_new - 邮箱变更令牌
4. email_change - 邮箱变更

## 解决方案
将所有 NULL 值替换为空字符串 ('')，确保这些字段永远不为 NULL。

## 影响范围
- 所有现有的 auth.users 记录
- 未来创建的记录也应该避免使用 NULL 值

## 注意事项
- 这个修复不会影响用户的正常使用
- 空字符串和 NULL 在业务逻辑上是等价的（都表示没有令牌）
- 但空字符串可以被正确地扫描到 Go 的 string 类型
*/

-- ============================================
-- 修复现有记录中的 NULL 值
-- ============================================

UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  updated_at = NOW()
WHERE 
  confirmation_token IS NULL 
  OR recovery_token IS NULL 
  OR email_change_token_new IS NULL 
  OR email_change IS NULL;

-- ============================================
-- 验证修复结果
-- ============================================

-- 检查是否还有 NULL 值
-- SELECT 
--   COUNT(*) as total_users,
--   COUNT(CASE WHEN confirmation_token IS NULL THEN 1 END) as null_confirmation_token,
--   COUNT(CASE WHEN recovery_token IS NULL THEN 1 END) as null_recovery_token,
--   COUNT(CASE WHEN email_change_token_new IS NULL THEN 1 END) as null_email_change_token,
--   COUNT(CASE WHEN email_change IS NULL THEN 1 END) as null_email_change
-- FROM auth.users;

-- 预期结果：所有 null_* 字段的值都应该为 0
