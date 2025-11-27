# 最终测试指南

## 📋 修复内容总结

### 问题1：使用用户名 admin 登录失败 ✅ 已修复
- **原因**：账号映射配置错误
- **修复**：更新 `src/pages/login/index.tsx` 中的账号映射
- **效果**：现在可以使用 `admin` 直接登录

### 问题2：登录后报错 "用户档案不存在" ✅ 已修复
- **原因**：profiles 表缺少 SELECT 策略
- **修复**：添加完整的 RLS 策略
- **效果**：登录后可以正常读取用户角色

## 🧪 测试步骤

### 测试1：使用用户名 admin 登录

1. **打开登录页面**

2. **输入登录信息**：
   - 账号：`admin`（不是 admin@fleet.com）
   - 密码：`hye19911206`

3. **点击"密码登录"按钮**

4. **预期结果**：
   - ✅ 显示 "登录成功" 提示
   - ✅ 跳转到超级管理员界面
   - ✅ 可以看到 "租户配置管理" 等功能
   - ✅ 控制台没有 "用户档案不存在" 错误

### 测试2：验证用户角色获取

1. **登录成功后**，打开浏览器开发者工具（F12）

2. **查看 Console 标签页**

3. **预期日志**：
   ```
   [getCurrentUserRole] 开始获取用户角色
   [getCurrentUserRole] 当前用户ID: d79327e9-69b4-42b7-b1b4-5d13de6e9814
   [getCurrentUserRole] 成功获取用户角色: super_admin
   ```

4. **不应该出现的日志**：
   ```
   ❌ [getCurrentUserRole] 用户档案不存在，用户ID: ...
   ```

### 测试3：验证超级管理员权限

1. **登录后**，检查是否可以访问以下功能：
   - ✅ 租户配置管理
   - ✅ 创建新租户
   - ✅ 编辑租户信息
   - ✅ 查看所有租户列表

2. **尝试创建一个测试租户**：
   - 点击 "创建新租户"
   - 输入租户名称：`测试租户`
   - 点击 "创建"
   - 预期：成功创建租户

### 测试4：验证其他测试账号

测试以下账号是否可以正常登录：

| 账号 | 密码 | 角色 | 预期结果 |
|------|------|------|---------|
| admin | hye19911206 | 超级管理员 | ✅ 应该成功 |
| admin888 | hye19911206 | 租赁管理员 | ✅ 应该成功 |
| admin1 | 123456 | 司机 | ⏳ 待测试 |
| admin2 | 123456 | 车队长 | ⏳ 待测试 |
| admin3 | 123456 | 老板 | ⏳ 待测试 |

## 🔍 故障排查

### 如果仍然无法登录

#### 1. 检查账号输入
- 确认输入的是 `admin`，不是 `admin@fleet.com`
- 确认密码是 `hye19911206`，没有多余的空格

#### 2. 检查浏览器控制台
打开开发者工具（F12），查看 Console 和 Network 标签页：

**Console 标签页**：
- 查找登录相关的日志
- 查找错误信息

**Network 标签页**：
- 找到 `/auth/v1/token` 请求
- 查看请求参数：
  ```json
  {
    "email": "admin@fleet.com",
    "password": "hye19911206"
  }
  ```
- 查看响应状态码：
  - 200：登录成功
  - 400：请求错误
  - 401：账号或密码错误

#### 3. 验证数据库状态

如果有数据库访问权限，执行以下查询：

```sql
-- 检查账号是否存在
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

```sql
-- 检查 RLS 策略
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY cmd, policyname;
```

**预期结果**：
- 应该有 6 条策略
- 包含 SELECT、INSERT、UPDATE、DELETE 策略

### 如果登录成功但仍然报错 "用户档案不存在"

#### 1. 检查 RLS 策略是否生效

```sql
-- 测试 SELECT 策略
SET ROLE authenticated;
SET request.jwt.claim.sub = 'd79327e9-69b4-42b7-b1b4-5d13de6e9814';
SELECT * FROM public.profiles WHERE id = 'd79327e9-69b4-42b7-b1b4-5d13de6e9814';
```

如果返回空结果，说明 RLS 策略有问题。

#### 2. 重新应用 RLS 策略

如果策略有问题，可以重新应用迁移：

```bash
# 在数据库中执行
\i supabase/migrations/10004_add_profiles_select_policy.sql
```

## 📊 测试结果记录

请在测试后填写以下表格：

### 登录测试

| 测试项 | 账号 | 结果 | 备注 |
|--------|------|------|------|
| 使用用户名登录 | admin | ⏳ | |
| 使用 Email 登录 | admin@fleet.com | ⏳ | |
| 角色获取 | admin | ⏳ | |
| 权限验证 | admin | ⏳ | |

### 功能测试

| 功能 | 结果 | 备注 |
|------|------|------|
| 查看租户列表 | ⏳ | |
| 创建新租户 | ⏳ | |
| 编辑租户信息 | ⏳ | |
| 删除租户 | ⏳ | |

### 其他账号测试

| 账号 | 密码 | 登录结果 | 备注 |
|------|------|---------|------|
| admin888 | hye19911206 | ⏳ | |
| admin1 | 123456 | ⏳ | |
| admin2 | 123456 | ⏳ | |
| admin3 | 123456 | ⏳ | |

## 📝 反馈

如果测试过程中遇到任何问题，请提供以下信息：

1. **问题描述**：详细描述遇到的问题
2. **复现步骤**：如何复现这个问题
3. **错误信息**：
   - 浏览器控制台的错误日志
   - Network 请求的详细信息
   - 数据库查询结果（如果有）
4. **环境信息**：
   - 浏览器类型和版本
   - 操作系统
   - 网络环境

## 📚 相关文档

- [LOGIN_FIX_SUMMARY.md](LOGIN_FIX_SUMMARY.md) - 登录问题修复总结
- [ADMIN_ACCOUNT_SUMMARY.md](ADMIN_ACCOUNT_SUMMARY.md) - 管理员账号总结
- [ADMIN_LOGIN_TEST.md](ADMIN_LOGIN_TEST.md) - 登录测试详细指南
- [README.md](README.md) - 项目主文档

---

**测试日期**：2025-11-27  
**修复状态**：✅ 已完成  
**测试状态**：⏳ 等待测试
