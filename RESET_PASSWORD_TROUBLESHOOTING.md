# 重置密码功能完整故障排查指南

## 📋 问题概述
重置密码功能失败，没有显示具体的错误信息。

## 🔍 已实施的改进

### 1. ✅ 详细日志系统
现在代码会输出非常详细的调试日志，包括：
- 请求的每个步骤
- 服务器响应的完整内容
- 错误的详细信息

### 2. ✅ 增强的错误显示
- 使用弹窗显示详细的错误信息
- 不再只显示简单的"重置失败"
- 显示具体的错误原因和建议

### 3. ✅ WebSocket 错误说明
- WebSocket 连接错误不影响重置密码功能
- 已添加注释说明可以忽略该错误

## 🚀 立即开始调试

### 第一步：打开开发者工具
**H5 环境（浏览器）**:
1. 按 `F12` 键打开开发者工具
2. 点击 `Console` 标签页

**微信小程序**:
1. 在微信开发者工具中
2. 点击底部的"调试器"
3. 切换到"Console"标签页

### 第二步：执行重置密码操作
1. 使用超级管理员账号登录
2. 进入"超级管理员工作台"
3. 点击"用户管理"
4. 选择一个用户，点击"重置密码"
5. 确认操作

### 第三步：查看控制台日志
你应该看到类似以下的日志输出：

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
收到响应，状态码: 200
响应头: {...}
响应原始文本: {...}
解析后的响应: {...}
```

### 第四步：根据日志诊断问题

## 🔧 常见问题及解决方案

### 问题 1: 会话状态显示"未登录"
**日志特征**:
```
会话状态: 未登录
❌ 重置密码失败: 未登录，无法重置密码
```

**原因**: 用户会话已过期

**解决方案**:
1. 退出当前账号
2. 重新登录
3. 再次尝试重置密码

---

### 问题 2: HTTP 状态码 401
**日志特征**:
```
收到响应，状态码: 401
响应原始文本: {"error": "身份验证失败"}
```

**原因**: 访问令牌无效或过期

**解决方案**:
1. 重新登录获取新的访问令牌
2. 如果问题持续，检查 Edge Function 日志

**检查步骤**:
1. 登录 Supabase 控制台
2. 进入 Edge Functions
3. 点击 `reset-user-password`
4. 查看 Logs 标签页

---

### 问题 3: HTTP 状态码 403
**日志特征**:
```
收到响应，状态码: 403
响应原始文本: {"error": "权限不足，仅超级管理员可以重置密码"}
```

**原因**: 当前用户不是超级管理员

**解决方案**:
在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 1. 查看当前用户的角色
SELECT id, phone, email, role FROM profiles WHERE phone = '你的手机号';

-- 2. 如果 role 不是 'super_admin'，执行以下命令
UPDATE profiles SET role = 'super_admin' WHERE phone = '你的手机号';

-- 3. 验证修改结果
SELECT id, phone, email, role FROM profiles WHERE phone = '你的手机号';
```

**快速诊断脚本**:
使用项目根目录下的 `check-reset-password.sql` 文件：
1. 打开 Supabase SQL Editor
2. 复制 `check-reset-password.sql` 的内容
3. 执行脚本
4. 查看诊断结果

---

### 问题 4: HTTP 状态码 500 - SQL 扫描错误
**日志特征**:
```
收到响应，状态码: 500
响应原始文本: {
  "error": "重置密码失败",
  "details": "error finding user: sql: Scan error on column index 8, name \"email_change\": converting NULL to string is unsupported"
}
```

**原因**: Supabase Auth 内部查询用户时，遇到 NULL 值的字段（如 `email_change`）

**状态**: ✅ 已修复（Edge Function 版本 3）

**如果仍然出现**:
1. 刷新浏览器页面（硬刷新：Ctrl+F5）
2. 重新尝试重置密码
3. 如果问题持续，Edge Function 可能需要重新部署

---

### 问题 5: HTTP 状态码 500 - 其他错误
**日志特征**:
```
收到响应，状态码: 500
响应原始文本: {"error": "重置密码失败", "details": "..."}
```

**原因**: Edge Function 内部错误

**可能的原因**:
1. 目标用户不存在于 `auth.users` 表中
2. 数据库连接问题
3. Edge Function 代码错误

**解决方案**:

**步骤 1**: 检查目标用户是否存在
```sql
-- 检查用户是否存在
SELECT id, email, phone FROM auth.users WHERE id = '目标用户ID';
```

**步骤 2**: 查看 Edge Function 日志
1. 登录 Supabase 控制台
2. 进入 Edge Functions
3. 点击 `reset-user-password`
4. 查看 Logs 标签页
5. 查找错误信息

**步骤 3**: 验证 Edge Function 环境变量
确认以下环境变量已设置：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 问题 6: 解析响应失败
**日志特征**:
```
❌ 解析响应失败: SyntaxError: Unexpected token < in JSON at position 0
响应原始文本: <!DOCTYPE html>...
```

**原因**: 服务器返回了 HTML 而不是 JSON（通常是错误页面）

**可能的原因**:
1. Edge Function URL 错误
2. Edge Function 未部署或已删除
3. 服务器内部错误

**解决方案**:

**步骤 1**: 验证 Edge Function URL
```javascript
// 在控制台执行
console.log(process.env.TARO_APP_SUPABASE_URL)
// 应该输出: https://backend.appmiaoda.com/projects/supabase244341780043055104
```

**步骤 2**: 检查 Edge Function 是否已部署
1. 登录 Supabase 控制台
2. 进入 Edge Functions
3. 确认 `reset-user-password` 存在且状态为 ACTIVE

**步骤 3**: 手动测试 Edge Function
使用 curl 命令测试：
```bash
curl -X POST \
  'https://backend.appmiaoda.com/projects/supabase244341780043055104/functions/v1/reset-user-password' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d '{"userId": "TARGET_USER_ID", "newPassword": "123456"}'
```

---

### 问题 7: 网络错误
**日志特征**:
```
❌ 重置密码异常: TypeError: Failed to fetch
异常类型: TypeError
```

**原因**: 网络请求失败

**可能的原因**:
1. 网络连接问题
2. 防火墙阻止请求
3. CORS 问题

**解决方案**:
1. 检查网络连接是否正常
2. 尝试访问其他网站确认网络可用
3. 检查浏览器控制台的 Network 标签页
4. 查看是否有 CORS 错误

---

## 📊 使用诊断脚本

### SQL 诊断脚本
项目根目录下的 `check-reset-password.sql` 文件包含完整的诊断查询：

```bash
# 在 Supabase SQL Editor 中执行
1. 打开 Supabase 控制台
2. 进入 SQL Editor
3. 复制 check-reset-password.sql 的内容
4. 点击 Run
5. 查看诊断结果
```

**诊断脚本会检查**:
- ✅ 所有用户及其角色
- ✅ auth.users 表中的用户
- ✅ RLS 策略配置
- ✅ 是否存在超级管理员
- ✅ 第一个注册的用户是否为超级管理员
- ✅ 用户角色枚举类型

---

## 🎯 成功案例示例

### 完整的成功日志
```
=== 用户管理页面：开始重置密码流程 ===
目标用户: {
  id: "abc-123-def-456",
  name: "张三",
  phone: "13800138000",
  role: "driver"
}
调用 resetUserPassword 函数...
=== 开始重置密码 ===
目标用户ID: abc-123-def-456
会话状态: 已登录
当前用户ID: xyz-789-uvw-012
访问令牌前10位: eyJhbGciOi...
Edge Function URL: https://backend.appmiaoda.com/projects/supabase244341780043055104/functions/v1/reset-user-password
请求体: {userId: "abc-123-def-456", newPassword: "123456"}
开始发送请求...
收到响应，状态码: 200
响应头: {
  content-type: "application/json",
  access-control-allow-origin: "*"
}
响应原始文本: {"success":true,"message":"密码已重置为 123456"}
解析后的响应: {success: true, message: "密码已重置为 123456"}
✅ 密码重置成功
resetUserPassword 返回结果: {success: true}
✅ 密码重置成功
```

### 验证重置成功
1. 退出当前账号
2. 使用目标用户的手机号/邮箱登录
3. 输入密码 `123456`
4. 如果能成功登录，说明密码重置成功

---

## 📝 报告问题

如果以上所有方案都无法解决问题，请提供以下信息：

### 必需信息
1. **完整的控制台日志**（从"开始重置密码"到最后的错误信息）
2. **HTTP 状态码**（如果有）
3. **响应原始文本**（如果有）
4. **当前用户角色**（执行 SQL 查询获取）
5. **目标用户信息**（ID、手机号、角色）

### 可选信息
1. Edge Function 日志（从 Supabase 控制台获取）
2. 浏览器 Network 标签页的请求详情
3. 数据库诊断脚本的执行结果

---

## 🔗 相关文档

- [DEBUG_RESET_PASSWORD.md](./DEBUG_RESET_PASSWORD.md) - 详细调试指南
- [WEBSOCKET_ERROR_FIX.md](./WEBSOCKET_ERROR_FIX.md) - WebSocket 错误说明
- [check-reset-password.sql](./check-reset-password.sql) - SQL 诊断脚本
- [supabase/functions/reset-user-password/TESTING.md](./supabase/functions/reset-user-password/TESTING.md) - Edge Function 测试指南

---

## ⚡ 快速检查清单

在报告问题之前，请确认已完成以下检查：

- [ ] 已打开浏览器开发者工具的 Console 标签页
- [ ] 已执行重置密码操作
- [ ] 已查看完整的控制台日志
- [ ] 已确认当前用户是超级管理员（role = 'super_admin'）
- [ ] 已确认用户会话未过期（会话状态: 已登录）
- [ ] 已记录 HTTP 状态码
- [ ] 已记录响应原始文本
- [ ] 已尝试重新登录
- [ ] 已检查 Edge Function 是否已部署
- [ ] 已执行 SQL 诊断脚本

---

**最后更新**: 2025-11-05
