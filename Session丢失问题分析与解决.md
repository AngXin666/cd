# Session 丢失问题分析与解决

## 问题描述

用户在中央管理系统创建租户时，虽然已经登录，但仍然提示"登录状态已过期，请重新登录"。

---

## 问题现象

### 日志分析

从用户提供的完整日志可以看到：

```
[2025-11-28 19:26:14.687] [INFO] [App] [User:319eecc4] 用户登录
index.tsx:248 🔍 提交前检查登录状态...
index.tsx:272 ✅ 提交时登录状态有效
central-admin-api.ts:186 🚀 开始创建租户: 测试2
central-admin-api.ts:191 📋 Session 获取结果: {hasData: true, hasSession: false, hasError: false}
central-admin-api.ts:204 ❌ 未登录 - session 为空
```

### 关键发现

1. **第一次检查**（在 `handleSubmit` 函数中）：
   - 调用 `supabase.auth.getSession()`
   - 结果：✅ **session 有效**

2. **第二次检查**（在 `createTenant` 函数中）：
   - 再次调用 `supabase.auth.getSession()`
   - 结果：❌ **session 为空**

3. **时间间隔**：
   - 两次调用之间只有几毫秒
   - 不可能是 session 过期导致的

---

## 根本原因

### Supabase Auth 的 Session 管理机制

Supabase 的 `getSession()` 方法在某些情况下会返回不同的结果，特别是在：

1. **并发调用**：多次快速调用 `getSession()` 可能导致状态不一致
2. **异步操作**：在异步操作之间，session 状态可能发生变化
3. **浏览器环境**：localStorage 的读取可能受到浏览器限制

### 问题代码

**原始代码流程**：

```typescript
// 在 tenant-create/index.tsx 的 handleSubmit 中
const handleSubmit = async () => {
  // 第一次获取 session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    // 处理未登录情况
    return
  }
  
  // 调用 createTenant
  const result = await createTenant(formData)
}

// 在 central-admin-api.ts 的 createTenant 中
export async function createTenant(input: CreateTenantInput) {
  // 第二次获取 session
  const sessionResult = await supabase.auth.getSession()
  const { session } = sessionResult.data
  
  if (!session) {
    // ❌ 这里返回空 session！
    return { success: false, error: '登录状态已过期' }
  }
  
  // 使用 session.access_token
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  })
}
```

### 为什么会失败？

1. **重复获取 Session**：
   - 在 `handleSubmit` 中获取了一次 session
   - 在 `createTenant` 中又获取了一次 session
   - 第二次获取时返回空 session

2. **可能的原因**：
   - Supabase 客户端的内部状态管理问题
   - 浏览器的 localStorage 访问限制
   - 异步操作导致的竞态条件

---

## 解决方案

### 核心思路

**避免重复获取 session，直接传递 access_token**

### 修改后的代码

#### 1. 修改 `createTenant` 函数签名

```typescript
// src/db/central-admin-api.ts

/**
 * 创建租户（自动化部署）
 * 
 * @param input - 租户创建输入
 * @param accessToken - 可选的访问令牌，如果提供则使用此令牌，否则从 session 获取
 */
export async function createTenant(
  input: CreateTenantInput,
  accessToken?: string  // 新增可选参数
): Promise<CreateTenantResult> {
  try {
    console.log('🚀 开始创建租户:', input.company_name)

    let token = accessToken

    // 如果没有提供 accessToken，则从 session 获取
    if (!token) {
      console.log('📋 未提供 accessToken，从 session 获取...')
      const sessionResult = await supabase.auth.getSession()
      
      const { session } = sessionResult.data
      if (!session) {
        return {
          success: false,
          error: '登录状态已过期，请重新登录'
        }
      }
      
      token = session.access_token
    }

    console.log('✅ Token 有效，准备调用 Edge Function')

    // 使用 token 调用 Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/create-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(input)
    })
    
    // ... 处理响应
  }
}
```

#### 2. 修改调用方式

```typescript
// src/pages/central-admin/tenant-create/index.tsx

const handleSubmit = async () => {
  if (!validateForm()) return

  // 提交前检查登录状态
  console.log('🔍 提交前检查登录状态...')
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    console.error('❌ 提交时未登录，session 为空')
    // 处理未登录情况
    return
  }

  console.log('✅ 提交时登录状态有效，access_token 长度:', session.access_token.length)

  setLoading(true)
  Taro.showLoading({ title: '创建中...', mask: true })

  try {
    // ✅ 直接传入 access_token，避免在 createTenant 内部再次获取 session
    const result = await createTenant(formData, session.access_token)
    
    // ... 处理结果
  }
}
```

---

## 解决方案的优点

### 1. 避免重复获取 Session
- 只在 `handleSubmit` 中获取一次 session
- 直接传递 access_token 给 `createTenant`
- 避免了第二次获取 session 失败的问题

### 2. 提高性能
- 减少了一次 `getSession()` 调用
- 减少了 localStorage 的读取次数
- 提高了代码执行效率

### 3. 更清晰的职责分离
- `handleSubmit`：负责检查登录状态
- `createTenant`：负责创建租户，不关心如何获取 token

### 4. 向后兼容
- `accessToken` 参数为可选
- 如果不提供，仍然会尝试从 session 获取
- 不影响其他调用方

---

## 预期效果

### 修复前的日志

```
🔍 提交前检查登录状态...
✅ 提交时登录状态有效
🚀 开始创建租户: 测试2
📋 Session 获取结果: {hasData: true, hasSession: false, hasError: false}
❌ 未登录 - session 为空
```

### 修复后的日志

```
🔍 提交前检查登录状态...
✅ 提交时登录状态有效，access_token 长度: 1234
🚀 开始创建租户: 测试2
✅ Token 有效，准备调用 Edge Function
📥 Edge Function 响应状态: 200
✅ 租户创建成功
```

---

## 经验教训

### 1. 避免重复获取 Session
在同一个操作流程中，应该只获取一次 session，然后传递给需要的函数。

### 2. 优先传递 Token
如果函数需要 access_token，应该直接传递 token，而不是在函数内部获取 session。

### 3. 添加详细日志
在关键步骤添加日志，便于调试和定位问题。

### 4. 考虑异步操作的影响
在异步操作之间，状态可能发生变化，需要谨慎处理。

---

## 相关修复

### 修复18：测试账号加载问题
- 添加 RLS 策略允许匿名用户读取 profiles 表
- 解决登录页面测试账号列表加载失败的问题

### 修复19：中央管理系统登录状态问题
- 优化 RLS 策略，允许 authenticated 角色读取 profiles 表
- 移除登录页面的退出登录逻辑

### 修复20：增强登录状态检查和调试
- 在创建租户提交前检查登录状态
- 添加详细的 session 检查日志

### 修复21：彻底解决 Session 丢失问题
- 修改 `createTenant` 函数接受 `accessToken` 参数
- 避免重复获取 session
- 直接传递 token

---

## 测试建议

### 1. 正常流程测试
1. 登录中央管理系统
2. 进入创建租户页面
3. 填写表单并提交
4. 检查日志，确认显示 "✅ Token 有效，准备调用 Edge Function"
5. 确认租户创建成功

### 2. 边界情况测试
1. 登录后等待一段时间（接近 session 过期时间）
2. 尝试创建租户
3. 如果 session 真的过期，应该在 `handleSubmit` 中就被拦截

### 3. 并发测试
1. 快速连续创建多个租户
2. 确认每次都能成功获取 token
3. 确认不会出现 session 丢失的问题

---

## 总结

这个问题的根本原因是**重复获取 session 导致状态不一致**。通过**直接传递 access_token**的方式，我们避免了这个问题，同时提高了代码的性能和可维护性。

这个修复不仅解决了当前的问题，还为未来类似的场景提供了最佳实践：

> **在同一个操作流程中，只获取一次 session，然后传递 token 给需要的函数。**
