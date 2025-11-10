# 重置密码功能测试指南

## 测试前准备

### 1. 确认当前用户是超级管理员
在浏览器控制台或小程序调试工具中执行：
```javascript
// 检查当前用户角色
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .maybeSingle()
console.log('当前用户角色:', profile?.role)
```

如果角色不是 `super_admin`，需要先在数据库中修改：
```sql
UPDATE profiles SET role = 'super_admin' WHERE id = '你的用户ID';
```

### 2. 查看详细日志
在重置密码时，打开浏览器控制台（F12），查看以下日志：
- `调用重置密码 Edge Function:` - 显示调用的URL
- `Edge Function 响应:` - 显示服务器返回的状态和结果

## 常见错误及解决方案

### 错误1: "权限不足，仅超级管理员可以重置密码"
**原因**: 当前登录用户的角色不是 `super_admin`

**解决方案**:
1. 在 Supabase 控制台中打开 SQL Editor
2. 执行以下SQL：
```sql
-- 查看当前用户的角色
SELECT id, phone, email, role FROM profiles;

-- 将第一个用户设置为超级管理员
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1);
```

### 错误2: "未登录，无法重置密码"
**原因**: 用户会话已过期或未登录

**解决方案**:
1. 退出登录
2. 重新登录
3. 再次尝试重置密码

### 错误3: "网络错误或服务器异常"
**原因**: Edge Function 调用失败或网络问题

**解决方案**:
1. 检查网络连接
2. 查看控制台日志中的详细错误信息
3. 确认 Edge Function 已正确部署：
   - 访问 Supabase 控制台
   - 进入 Edge Functions 页面
   - 确认 `reset-user-password` 函数状态为 ACTIVE

### 错误4: "重置密码失败" (无详细信息)
**原因**: Edge Function 内部错误

**解决方案**:
1. 在 Supabase 控制台查看 Edge Function 日志
2. 检查目标用户是否存在于 auth.users 表中
3. 确认 RLS 策略没有阻止操作

## 测试步骤

### 步骤1: 创建测试用户
1. 注册一个新用户（使用手机号或邮箱）
2. 记录该用户的ID

### 步骤2: 使用超级管理员账号登录
1. 使用超级管理员账号登录系统
2. 进入"超级管理员工作台" -> "用户管理"

### 步骤3: 重置测试用户密码
1. 找到刚创建的测试用户
2. 点击"重置密码"按钮
3. 确认弹窗
4. 观察提示信息：
   - 成功：显示"密码已重置为 123456"
   - 失败：显示具体错误信息

### 步骤4: 验证密码重置成功
1. 退出当前账号
2. 使用测试用户的手机号/邮箱和密码 `123456` 登录
3. 如果能成功登录，说明密码重置成功

## 调试技巧

### 1. 查看 Edge Function 日志
在 Supabase 控制台：
1. 进入 Edge Functions
2. 点击 `reset-user-password`
3. 查看 Logs 标签页

### 2. 手动测试 Edge Function
使用 curl 或 Postman 测试：
```bash
curl -X POST \
  'https://backend.appmiaoda.com/projects/supabase244341780043055104/functions/v1/reset-user-password' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d '{
    "userId": "TARGET_USER_ID",
    "newPassword": "123456"
  }'
```

### 3. 检查数据库状态
```sql
-- 查看所有用户及其角色
SELECT 
  p.id,
  p.phone,
  p.email,
  p.role,
  p.created_at,
  au.email as auth_email,
  au.phone as auth_phone
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at;

-- 检查 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

## 预期行为

### 成功场景
1. 超级管理员点击"重置密码"
2. 显示确认弹窗
3. 确认后显示"重置中..."
4. 2-3秒后显示"密码已重置为 123456"
5. 目标用户可以使用新密码 `123456` 登录

### 失败场景
1. 非超级管理员尝试重置密码 → 显示"权限不足"
2. 未登录用户尝试重置密码 → 显示"未登录"
3. 网络异常 → 显示"网络错误或服务器异常"
4. 目标用户不存在 → 显示"重置密码失败"

## 注意事项
1. 重置密码操作不可撤销
2. 重置后的默认密码是 `123456`
3. 建议用户首次登录后立即修改密码
4. 只有超级管理员可以执行此操作
