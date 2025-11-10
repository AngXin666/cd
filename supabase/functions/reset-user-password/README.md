# 重置用户密码 Edge Function

## 功能说明
这个 Edge Function 用于超级管理员重置用户密码。由于客户端无法直接使用 Supabase Admin API，因此需要通过 Edge Function 来实现密码重置功能。

## 权限要求
- 仅超级管理员（role = 'super_admin'）可以调用此函数
- 需要提供有效的访问令牌（Access Token）

## 请求参数
```json
{
  "userId": "用户ID（必填）",
  "newPassword": "新密码（可选，默认为 123456）"
}
```

## 请求示例
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/reset-user-password`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    userId: 'user-id-here',
    newPassword: '123456'
  })
});

const result = await response.json();
```

## 响应格式
### 成功响应
```json
{
  "success": true,
  "message": "密码已重置为 123456"
}
```

### 错误响应
```json
{
  "error": "错误信息",
  "details": "详细错误信息（可选）"
}
```

## 错误代码
- 400: 缺少必需参数
- 401: 未授权或身份验证失败
- 403: 权限不足（非超级管理员）
- 500: 服务器错误

## 部署状态
✅ 已部署到 Supabase Edge Functions

## 使用位置
- `/src/db/api.ts` - `resetUserPassword()` 函数
- `/src/pages/super-admin/user-management/index.tsx` - 用户管理页面
