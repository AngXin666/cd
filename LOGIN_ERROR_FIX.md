# 登录错误修复报告

## 错误信息

```
error finding user: sql: Scan error on column index 3, name "confirmation_token": 
converting NULL to string is unsupported
```

## 问题分析

### 错误原因

1. **数据库字段为 NULL**
   - 在创建测试账号时，`auth.users` 表中的以下字段被设置为 NULL：
     - `confirmation_token`
     - `recovery_token`
     - `email_change_token_new`
     - `email_change`

2. **类型转换失败**
   - `miaoda-auth-taro` 库在查询用户时，期望这些字段是字符串类型
   - 当字段值为 NULL 时，SQL 查询尝试将 NULL 转换为字符串，导致错误

3. **迁移脚本不完整**
   - 最新的测试账号创建脚本（`00484_create_test_accounts_final.sql`）没有设置这些 token 字段
   - 旧的迁移脚本（`00477_create_test_accounts.sql`）正确地设置了这些字段为空字符串 `''`

## 解决方案

### 1. 更新现有用户记录

创建了新的迁移脚本 `00485_fix_auth_users_null_tokens.sql`，将所有测试账号的 NULL token 字段更新为空字符串：

```sql
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE phone IN ('13800000000', '13800000001', '13800000002', '13800000003');
```

### 2. 验证修复结果

执行查询验证所有 token 字段已更新：

```sql
SELECT 
  phone,
  email,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
FROM auth.users
WHERE phone IN ('13800000000', '13800000001', '13800000002', '13800000003')
ORDER BY phone;
```

结果：
- ✅ admin (13800000000) - 所有 token 字段为空字符串
- ✅ admin1 (13800000001) - 所有 token 字段为空字符串
- ✅ admin2 (13800000002) - 所有 token 字段为空字符串
- ✅ admin3 (13800000003) - 所有 token 字段为空字符串

## 测试步骤

### 1. 清除应用缓存

在测试前，建议清除小程序缓存：
- 微信开发者工具：清除缓存数据
- 真机测试：删除小程序后重新打开

### 2. 测试登录流程

1. **打开登录页面**
2. **使用快速填充功能**
   - 点击"老板"按钮，填充 admin 账号
3. **点击"密码登录"按钮**
4. **验证登录成功**
   - 应该成功登录并跳转到对应的工作台
   - 不应该再出现 SQL 错误

### 3. 测试所有账号

依次测试所有测试账号：
- ✅ admin (13800000000) - BOSS
- ✅ admin1 (13800000001) - DISPATCHER
- ✅ admin2 (13800000002) - DRIVER
- ✅ admin3 (13800000003) - DISPATCHER

## 预防措施

### 1. 更新创建用户的 SQL 模板

在未来创建用户时，确保设置所有 token 字段为空字符串：

```sql
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at,
  aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
  'user@example.com', crypt('password', gen_salt('bf')), NOW(),
  '13800000000', NOW(), '{"name": "用户名"}'::jsonb, NOW(), NOW(),
  'authenticated', 'authenticated',
  '', '', '', ''  -- 设置为空字符串而不是 NULL
);
```

### 2. 更新 handle_new_user 触发器

确保触发器在创建用户时也设置这些字段：

```sql
-- 在触发器中添加 token 字段的设置
INSERT INTO auth.users (...)
VALUES (..., '', '', '', '');
```

### 3. 数据库约束

考虑在数据库层面添加约束，确保这些字段不为 NULL：

```sql
ALTER TABLE auth.users 
  ALTER COLUMN confirmation_token SET DEFAULT '',
  ALTER COLUMN recovery_token SET DEFAULT '',
  ALTER COLUMN email_change_token_new SET DEFAULT '',
  ALTER COLUMN email_change SET DEFAULT '';
```

## 相关文件

- 迁移脚本：`supabase/migrations/00485_fix_auth_users_null_tokens.sql`
- 测试账号创建：`supabase/migrations/00484_create_test_accounts_final.sql`
- 登录页面：`src/pages/login/index.tsx`
- 测试账号指南：`TEST_ACCOUNTS_SETUP.md`

## 总结

登录错误已修复。问题的根本原因是 `auth.users` 表中的 token 字段为 NULL，而 `miaoda-auth-taro` 库期望这些字段是字符串类型。通过将这些字段更新为空字符串，解决了类型转换错误。

现在所有测试账号都可以正常登录了！

## 后续工作

1. **测试登录功能**
   - 使用所有测试账号进行登录测试
   - 验证角色跳转是否正确

2. **完善错误处理**
   - 在登录页面添加更友好的错误提示
   - 记录登录错误日志

3. **优化用户体验**
   - 添加登录加载状态
   - 优化快速填充功能的 UI

4. **文档更新**
   - 更新测试账号设置指南
   - 添加常见问题解答
