# 重置密码功能调试指南

## 问题描述
重置密码功能失败，没有显示具体的错误信息。

## 已实施的调试措施

### 1. 详细日志输出
现在代码会在控制台输出非常详细的日志信息，包括：

#### 前端日志（src/db/api.ts）
- ✅ `=== 开始重置密码 ===` - 函数开始执行
- ✅ `目标用户ID: xxx` - 要重置密码的用户ID
- ✅ `会话状态: 已登录/未登录` - 当前登录状态
- ✅ `当前用户ID: xxx` - 当前登录用户的ID
- ✅ `访问令牌前10位: xxx...` - 访问令牌的前10个字符
- ✅ `Edge Function URL: xxx` - 调用的Edge Function完整URL
- ✅ `请求体: {...}` - 发送的请求数据
- ✅ `开始发送请求...` - 开始发送HTTP请求
- ✅ `收到响应，状态码: xxx` - HTTP响应状态码
- ✅ `响应头: {...}` - HTTP响应头信息
- ✅ `响应原始文本: xxx` - 服务器返回的原始文本
- ✅ `解析后的响应: {...}` - 解析后的JSON对象
- ✅ `✅ 密码重置成功` 或 `❌ 重置密码失败` - 最终结果

#### 页面日志（src/pages/super-admin/user-management/index.tsx）
- ✅ `=== 用户管理页面：开始重置密码流程 ===`
- ✅ `目标用户: {...}` - 目标用户的完整信息
- ✅ `调用 resetUserPassword 函数...`
- ✅ `resetUserPassword 返回结果: {...}` - API函数的返回值

### 2. 错误信息显示增强
- ❌ 之前：只显示简单的"重置失败"提示
- ✅ 现在：使用 `Taro.showModal` 显示详细的错误信息弹窗，包含完整的错误描述

### 3. 异常捕获增强
- 捕获所有可能的异常
- 记录异常类型、堆栈信息
- 显示异常的详细信息给用户

## 如何使用调试功能

### 步骤1: 打开开发者工具
1. **H5环境**: 在浏览器中按 `F12` 打开开发者工具
2. **微信小程序**: 在微信开发者工具中打开"调试器"面板

### 步骤2: 切换到Console标签页
确保能看到控制台输出

### 步骤3: 执行重置密码操作
1. 登录超级管理员账号
2. 进入"用户管理"页面
3. 点击某个用户的"重置密码"按钮
4. 确认操作

### 步骤4: 查看控制台日志
按照以下顺序检查日志：

```
=== 用户管理页面：开始重置密码流程 ===
目标用户: {id: "xxx", name: "xxx", ...}
调用 resetUserPassword 函数...
=== 开始重置密码 ===
目标用户ID: xxx
会话状态: 已登录
当前用户ID: xxx
访问令牌前10位: eyJhbGciOi...
Edge Function URL: https://backend.appmiaoda.com/projects/supabase244341780043055104/functions/v1/reset-user-password
请求体: {userId: "xxx", newPassword: "123456"}
开始发送请求...
收到响应，状态码: 200 (或其他状态码)
响应头: {...}
响应原始文本: {...}
解析后的响应: {...}
```

### 步骤5: 分析错误原因

#### 情况A: 看到 "会话状态: 未登录"
**原因**: 用户会话已过期
**解决方案**: 
1. 退出登录
2. 重新登录
3. 再次尝试

#### 情况B: 看到 HTTP 状态码 401
**原因**: 身份验证失败
**可能原因**:
- 访问令牌无效或过期
- Edge Function无法验证令牌

**解决方案**:
1. 检查访问令牌是否正确
2. 重新登录获取新令牌
3. 检查Edge Function日志

#### 情况C: 看到 HTTP 状态码 403
**原因**: 权限不足
**可能原因**:
- 当前用户不是超级管理员
- profiles表中的role字段不是 'super_admin'

**解决方案**:
```sql
-- 在Supabase SQL Editor中执行
SELECT id, phone, email, role FROM profiles WHERE id = '当前用户ID';

-- 如果role不是super_admin，执行：
UPDATE profiles SET role = 'super_admin' WHERE id = '当前用户ID';
```

#### 情况D: 看到 HTTP 状态码 500
**原因**: 服务器内部错误
**解决方案**:
1. 查看Edge Function日志（Supabase控制台 -> Edge Functions -> reset-user-password -> Logs）
2. 检查目标用户是否存在
3. 检查数据库连接是否正常

#### 情况E: 看到 "解析响应失败"
**原因**: 服务器返回的不是有效的JSON
**解决方案**:
1. 查看"响应原始文本"的内容
2. 可能是Edge Function崩溃或返回了HTML错误页面
3. 检查Edge Function日志

#### 情况F: 看到 "网络错误或服务器异常"
**原因**: 网络请求失败
**可能原因**:
- 网络连接问题
- Edge Function URL错误
- CORS问题

**解决方案**:
1. 检查网络连接
2. 确认Edge Function URL是否正确
3. 检查Edge Function是否已部署

## 常见问题排查清单

### ✅ 检查项1: 用户是否为超级管理员
```sql
SELECT id, phone, email, role FROM profiles WHERE id = '你的用户ID';
```
期望结果: `role = 'super_admin'`

### ✅ 检查项2: Edge Function是否已部署
1. 登录Supabase控制台
2. 进入Edge Functions页面
3. 确认 `reset-user-password` 函数存在且状态为 ACTIVE

### ✅ 检查项3: 目标用户是否存在
```sql
SELECT id, email, phone FROM auth.users WHERE id = '目标用户ID';
SELECT id, name, phone FROM profiles WHERE id = '目标用户ID';
```

### ✅ 检查项4: RLS策略是否正确
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### ✅ 检查项5: Edge Function环境变量
确认Edge Function有以下环境变量：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 获取更多帮助

### 查看Edge Function日志
1. 登录Supabase控制台
2. 进入 Edge Functions
3. 点击 `reset-user-password`
4. 查看 Logs 标签页
5. 查找错误信息

### 手动测试Edge Function
使用curl命令测试：
```bash
# 替换以下变量
SUPABASE_URL="https://backend.appmiaoda.com/projects/supabase244341780043055104"
ACCESS_TOKEN="你的访问令牌"
TARGET_USER_ID="目标用户ID"

curl -X POST \
  "${SUPABASE_URL}/functions/v1/reset-user-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"userId\": \"${TARGET_USER_ID}\", \"newPassword\": \"123456\"}"
```

## 预期的成功日志示例

```
=== 用户管理页面：开始重置密码流程 ===
目标用户: {id: "abc-123", name: "张三", phone: "13800138000"}
调用 resetUserPassword 函数...
=== 开始重置密码 ===
目标用户ID: abc-123
会话状态: 已登录
当前用户ID: xyz-789
访问令牌前10位: eyJhbGciOi...
Edge Function URL: https://backend.appmiaoda.com/projects/supabase244341780043055104/functions/v1/reset-user-password
请求体: {userId: "abc-123", newPassword: "123456"}
开始发送请求...
收到响应，状态码: 200
响应头: {content-type: "application/json", ...}
响应原始文本: {"success":true,"message":"密码已重置为 123456"}
解析后的响应: {success: true, message: "密码已重置为 123456"}
✅ 密码重置成功
resetUserPassword 返回结果: {success: true}
✅ 密码重置成功
```

## 下一步行动

1. **立即操作**: 尝试重置密码，查看控制台日志
2. **记录信息**: 将完整的控制台日志复制保存
3. **提供反馈**: 将日志信息提供给开发人员，以便进一步诊断

---

**重要提示**: 
- 所有敏感信息（如完整的访问令牌）都不会完整显示在日志中
- 日志仅用于调试，不会影响生产环境的安全性
- 调试完成后，可以移除部分详细日志以提高性能
