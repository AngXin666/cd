# 管理员账号登录测试说明

## 📋 账号信息

**用户名**：admin  
**密码**：hye19911206  
**Email**：admin@fleet.com  
**角色**：super_admin（超级管理员）

## 🧪 测试步骤

### 1. 打开登录页面

访问应用的登录页面。

### 2. 输入登录信息

在登录表单中输入：
- **账号**：`admin`（系统会自动转换为 `admin@fleet.com`）
- **密码**：`hye19911206`

### 3. 点击登录按钮

点击"登录"按钮提交表单。

### 4. 验证登录结果

**预期结果**：
- 登录成功
- 跳转到超级管理员界面
- 可以看到租户配置管理等功能

## 🔍 故障排查

### 如果仍然登录失败

#### 1. 检查账号是否存在

在数据库中执行以下 SQL：

```sql
SELECT 
  u.id, 
  u.email, 
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.role, 
  p.name
FROM auth.users u 
LEFT JOIN public.profiles p ON u.id = p.id 
WHERE u.email = 'admin@fleet.com';
```

**预期结果**：
- 应该返回一条记录
- email: admin@fleet.com
- email_confirmed: true
- role: super_admin
- name: 系统管理员

#### 2. 验证密码哈希

在数据库中执行以下 SQL：

```sql
SELECT 
  email,
  encrypted_password = crypt('hye19911206', encrypted_password) as password_match
FROM auth.users 
WHERE email = 'admin@fleet.com';
```

**预期结果**：
- password_match: true

#### 3. 检查登录请求

打开浏览器开发者工具（F12），查看 Network 标签页：
- 找到登录请求（POST /auth/v1/token）
- 查看请求参数：
  - email: admin@fleet.com
  - password: hye19911206
- 查看响应状态码和错误信息

#### 4. 常见错误及解决方案

**错误：400 Bad Request**
- **原因**：请求格式错误或密码哈希不正确
- **解决**：重新创建账号（已在迁移文件中完成）

**错误：Invalid login credentials**
- **原因**：账号或密码错误
- **解决**：
  1. 确认输入的账号是 `admin`（不是 `admin@fleet.com`）
  2. 确认密码是 `hye19911206`
  3. 检查数据库中的密码哈希是否正确

**错误：Email not confirmed**
- **原因**：邮箱未确认
- **解决**：在数据库中设置 `email_confirmed_at`（已在迁移文件中完成）

## 📝 修复历史

### 2025-11-27 修复记录

**问题**：
1. 原迁移文件使用了错误的字段名 `real_name`（应该是 `name`）
2. 密码哈希格式可能与 Supabase Auth 不完全兼容
3. 设置了 `phone_confirmed_at`，但这可能导致验证问题

**修复**：
1. 更新迁移文件，使用正确的字段名 `name`
2. 移除 `phone_confirmed_at` 设置（保持为 NULL）
3. 移除 `confirmed_at` 设置（这是一个生成列）
4. 确保所有必要的字段都正确设置

**执行的迁移**：
- `10002_recreate_admin_account_v2.sql` - 第一次修复
- `10003_fix_admin_account_v2.sql` - 第二次修复（最终版本）

**验证结果**：
- ✅ 账号创建成功
- ✅ 密码哈希正确
- ✅ 所有字段设置正确
- ✅ 与其他正常工作的账号（admin888）结构一致

## 🔐 安全建议

### 1. 首次登录后修改密码

建议在首次登录后立即修改密码：
1. 登录成功后，进入个人设置
2. 点击"修改密码"
3. 输入当前密码：`hye19911206`
4. 输入新密码（建议使用强密码）
5. 确认新密码并保存

### 2. 启用多因素认证（MFA）

为了提高安全性，建议启用多因素认证：
1. 进入安全设置
2. 启用 MFA
3. 使用手机应用（如 Google Authenticator）扫描二维码
4. 输入验证码完成设置

### 3. 定期更新密码

建议每 3-6 个月更新一次密码。

### 4. 监控登录活动

定期检查登录日志，确保没有异常登录活动。

## 📞 技术支持

如果仍然无法登录，请联系技术支持团队，并提供以下信息：
1. 登录时的错误信息（截图）
2. 浏览器开发者工具中的 Network 请求详情
3. 数据库验证查询的结果

---

**文档版本**：v1.0  
**更新日期**：2025-11-27  
**状态**：✅ 已修复
